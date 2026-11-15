import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import './CreateEvent.css';

const WORK_START = '09:00';
const WORK_END = '17:00';

function CreateEvent({ onEventCreated }) {
  const [users, setUsers] = useState([]);
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [windowStart, setWindowStart] = useState('');
  const [windowEnd, setWindowEnd] = useState('');
  const [requiredCapacity, setRequiredCapacity] = useState(5);
  const [priority, setPriority] = useState(2); // 1 = low, 2 = normal, 3 = high
  const [selectedParticipants, setSelectedParticipants] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    apiRequest('/users').then(setUsers).catch((err) => setError(err.message));
  }, []);

  function toggleParticipant(userId) {
    setSelectedParticipants((prev) => {
      const updated = { ...prev };
      if (updated[userId]) {
        delete updated[userId];
      } else {
        updated[userId] = 'optional';
      }
      return updated;
    });
  }

  function setParticipantType(userId, type) {
    setSelectedParticipants((prev) => ({ ...prev, [userId]: type }));
  }

  function extractTime(datetimeLocalValue) {
    return datetimeLocalValue.split('T')[1];
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!windowStart || !windowEnd) {
      setError('Please set both a start and end time.');
      return;
    }

    const startDate = windowStart.split('T')[0];
    const endDate = windowEnd.split('T')[0];
    const startTime = extractTime(windowStart);
    const endTime = extractTime(windowEnd);

    if (startDate !== endDate) {
      setError('Start and end must be on the same day (events cannot span midnight).');
      return;
    }

    if (startTime < WORK_START || startTime > WORK_END) {
      setError(`Start time must be between ${WORK_START} and ${WORK_END} (office hours).`);
      return;
    }

    if (endTime < WORK_START || endTime > WORK_END) {
      setError(`End time must be between ${WORK_START} and ${WORK_END} (office hours).`);
      return;
    }

    if (windowStart >= windowEnd) {
      setError('Start time must be before end time.');
      return;
    }

    const windowMinutes = (new Date(windowEnd) - new Date(windowStart)) / 60000;
    if (Number(durationMinutes) > windowMinutes) {
      setError(`Duration (${durationMinutes} min) is longer than the selected time window (${windowMinutes} min). Choose a shorter duration or a wider window.`);
      return;
    }

    const participants = Object.entries(selectedParticipants).map(([userId, type]) => ({
      user_id: Number(userId),
      is_mandatory: type === 'mandatory',
    }));

    if (participants.length === 0) {
      setError('Select at least one participant.');
      return;
    }

    setLoading(true);
    try {
      const result = await apiRequest('/events', {
        method: 'POST',
        body: JSON.stringify({
          title,
          duration_minutes: Number(durationMinutes),
          requested_window_start: windowStart,
          requested_window_end: windowEnd,
          required_capacity: Number(requiredCapacity),
          priority: Number(priority),
          participants,
        }),
      });

      setSuccess(`Event "${result.event.title}" created successfully.`);
      setTitle('');
      setWindowStart('');
      setWindowEnd('');
      setSelectedParticipants({});
      setPriority(2);

      if (onEventCreated) onEventCreated(result.event);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="ce-header">{t('createEvent.title')}</h1>
      <p className="ce-subnote">{t('createEvent.officeHoursNote')}</p>

      <div className="ce-card">
        <form onSubmit={handleSubmit}>
          <div className="ce-field">
            <label>{t('createEvent.eventTitle')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="ce-field">
            <label>{t('createEvent.duration')}</label>
            <input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              min="15"
              step="15"
              required
            />
          </div>

          <div className="ce-row">
            <div className="ce-field">
              <label>{t('createEvent.earliestStart')}</label>
              <input
                type="datetime-local"
                value={windowStart}
                onChange={(e) => setWindowStart(e.target.value)}
                required
              />
            </div>
            <div className="ce-field">
              <label>{t('createEvent.latestEnd')}</label>
              <input
                type="datetime-local"
                value={windowEnd}
                onChange={(e) => setWindowEnd(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="ce-field">
            <label>{t('createEvent.capacity')}</label>
            <input
              type="number"
              value={requiredCapacity}
              onChange={(e) => setRequiredCapacity(e.target.value)}
              min="1"
              required
            />
          </div>

          <div className="ce-field">
            <label>{t('createEvent.priority')}</label>
            <select
              className="ce-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value={1}>{t('createEvent.priorityLow')}</option>
              <option value={2}>{t('createEvent.priorityNormal')}</option>
              <option value={3}>{t('createEvent.priorityHigh')}</option>
            </select>
            <small className="ce-hint">{t('createEvent.priorityHint')}</small>
          </div>

          <div className="ce-field">
            <label>{t('createEvent.participants')}</label>
            <div className="ce-participants-box">
              {users.length === 0 && <p className="ce-empty">{t('createEvent.noUsers')}</p>}
              {users.map((u) => (
                <div key={u.id} className="ce-participant-row">
                  <input
                    type="checkbox"
                    checked={!!selectedParticipants[u.id]}
                    onChange={() => toggleParticipant(u.id)}
                  />
                  <span className="ce-participant-name">{u.name} ({u.email})</span>
                  {selectedParticipants[u.id] && (
                    <select
                      className="ce-participant-role"
                      value={selectedParticipants[u.id]}
                      onChange={(e) => setParticipantType(u.id, e.target.value)}
                    >
                      <option value="optional">{t('createEvent.optional')}</option>
                      <option value="mandatory">{t('createEvent.mandatory')}</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <p className="ce-error">{error}</p>}
          {success && <p className="ce-success">{success}</p>}

          <button type="submit" className="ce-submit" disabled={loading}>
            {loading ? t('createEvent.creating') : t('createEvent.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateEvent;