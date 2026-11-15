import { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useLanguage } from '../i18n/LanguageContext';
import './Availability.css';

function Availability() {
  const [slots, setSlots] = useState([]);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const days = t('availability.days');

  async function loadSlots() {
    try {
      const data = await apiRequest('/availability/me');
      setSlots(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadSlots();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiRequest('/availability', {
        method: 'POST',
        body: JSON.stringify({
          day_of_week: Number(dayOfWeek),
          start_time: startTime,
          end_time: endTime,
        }),
      });
      await loadSlots();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="avail-header">{t('availability.title')}</h1>

      <div className="avail-layout">
        <div className="avail-card">
          <h2 className="avail-card-title">{t('availability.add')}</h2>

          <form onSubmit={handleSubmit}>
            <div className="avail-field">
              <label>{t('availability.day')}</label>
              <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
                {days.map((day, index) => (
                  <option key={index} value={index}>{day}</option>
                ))}
              </select>
            </div>

            <div className="avail-row">
              <div className="avail-field">
                <label>{t('availability.startTime')}</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="avail-field">
                <label>{t('availability.endTime')}</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="avail-error">{error}</p>}

            <button type="submit" className="avail-submit" disabled={loading}>
              {loading ? t('availability.adding') : t('availability.add')}
            </button>
          </form>
        </div>

        <div>
          <h2 className="avail-list-title">{t('availability.current')}</h2>

          {slots.length === 0 ? (
            <div className="avail-empty">{t('availability.empty')}</div>
          ) : (
            <div className="avail-slot-list">
              {slots.map((slot) => (
                <div key={slot.id} className="avail-slot">
                  <span className="avail-slot-day">{days[slot.day_of_week]}</span>
                  <span className="avail-slot-time">
                    {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Availability;