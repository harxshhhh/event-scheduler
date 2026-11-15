import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import './Dashboard.css';

function Dashboard({ refreshKey, onChanged }) {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState({});
  const [justScheduled, setJustScheduled] = useState(null);
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkRunning, setBulkRunning] = useState(false);
  const { t, lang } = useLanguage();

  async function loadEvents() {
    setLoading(true);
    try {
      const data = await apiRequest('/events');
      setEvents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, [refreshKey]);

  function formatDateTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString(lang, {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });
  }

  async function handleDelete(eventId) {
    if (!confirm(t('dashboard.deleteConfirm'))) return;
    try {
      await apiRequest(`/events/${eventId}`, { method: 'DELETE' });
      loadEvents();
      if (onChanged) onChanged();
    } catch (err) {
      setActionMessage((prev) => ({ ...prev, [eventId]: err.message }));
    }
  }

  async function handleSchedule(eventId) {
    setActionMessage((prev) => ({ ...prev, [eventId]: t('dashboard.running') }));
    try {
      const result = await apiRequest(`/events/${eventId}/schedule`, { method: 'POST' });
      if (result.scheduled) {
        setActionMessage((prev) => ({ ...prev, [eventId]: null }));
        await loadEvents();

        // Trigger the pulse/glow animation on this row, then clear it after it plays once
        setJustScheduled(eventId);
        setTimeout(() => setJustScheduled(null), 1500);
      } else {
        const reasons = (result.rejectionReasons || [])
          .slice(0, 3)
          .map((r) => r.reason)
          .join('; ');
        setActionMessage((prev) => ({
          ...prev,
          [eventId]: `${t('dashboard.noFeasible')} ${reasons}`,
        }));
      }
    } catch (err) {
      setActionMessage((prev) => ({ ...prev, [eventId]: err.message }));
    }
  }

  // Schedules every pending event, highest priority first.
  async function handleScheduleAll() {
    setBulkRunning(true);
    setBulkMessage(t('dashboard.schedulingAll'));
    try {
      const result = await apiRequest('/schedule-pending', { method: 'POST' });
      setBulkMessage(
        t('dashboard.bulkSummary')
          .replace('{done}', result.scheduledCount)
          .replace('{total}', result.total)
      );
      await loadEvents();
      if (onChanged) onChanged();
    } catch (err) {
      setBulkMessage(err.message);
    } finally {
      setBulkRunning(false);
    }
  }

  function priorityLabel(p) {
    if (p === 1) return t('dashboard.priorityLow');
    if (p === 3) return t('dashboard.priorityHigh');
    return t('dashboard.priorityNormal');
  }

  const pendingCount = events.filter((event) => event.status === 'pending').length;

  return (
    <div>
      <h1 className="dash-header">{t('dashboard.title')}</h1>

      {loading && <p className="dash-empty">{t('dashboard.loading')}</p>}
      {error && <p className="dash-empty" style={{ color: 'var(--danger)' }}>{error}</p>}
      {!loading && events.length === 0 && (
        <p className="dash-empty">{t('dashboard.empty')}</p>
      )}

      {!loading && pendingCount > 1 && (
        <div className="dash-bulk">
          <button
            className="dash-btn primary"
            onClick={handleScheduleAll}
            disabled={bulkRunning}
          >
            {t('dashboard.scheduleAll')} ({pendingCount})
          </button>
          {bulkMessage && <span className="dash-bulk-message">{bulkMessage}</span>}
        </div>
      )}

      {!loading && events.length > 0 && (
        <table className="dash-table">
          <thead>
            <tr>
              <th>{t('dashboard.colTitle')}</th>
              <th>{t('dashboard.colPriority')}</th>
              <th>{t('dashboard.colStatus')}</th>
              <th>{t('dashboard.colTime')}</th>
              <th>{t('dashboard.colCapacity')}</th>
              <th>{t('dashboard.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className={justScheduled === event.id ? 'dash-row-pulse' : ''}>
                <td>{event.title}</td>
                <td>
                  <span className={`dash-priority p${event.priority || 2}`}>
                    {priorityLabel(event.priority || 2)}
                  </span>
                </td>
                <td>
                  <span className={`dash-badge ${event.status}`}>{event.status}</span>
                </td>
                <td>{formatDateTime(event.scheduled_start)}</td>
                <td>{event.required_capacity}</td>
                <td>
                  <div className="dash-actions">
                    {event.status === 'pending' && (
                      <button className="dash-btn primary" onClick={() => handleSchedule(event.id)}>
                        {t('dashboard.runScheduler')}
                      </button>
                    )}
                    <button className="dash-btn danger" onClick={() => handleDelete(event.id)}>
                      {t('dashboard.delete')}
                    </button>
                  </div>
                  {actionMessage[event.id] && (
                    <div className="dash-rejections">{actionMessage[event.id]}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Dashboard;