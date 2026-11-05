import { useEffect, useState } from 'react';
import { api } from '../api';
import './Bookings.css';

export default function AdminBookings() {
  const [trainId, setTrainId] = useState('');
  const [trains, setTrains] = useState([]);
  const [bookings, setBookings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api('/admin/trains')
      .then((data) => {
        if (!cancelled) setTrains(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load trains.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setBookings(null);

    try {
      const result = await api(`/admin/trains/${encodeURIComponent(trainId)}/bookings`);
      setBookings(result);
    } catch (err) {
      setError(err.message || 'Unable to load bookings.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bookings-page">
      <h1>Admin Bookings</h1>
      <form className="pnr-form" onSubmit={handleSubmit}>
        <label htmlFor="admin-bookings-train-id">Train</label>
        <div className="pnr-form__row">
          <select
            id="admin-bookings-train-id"
            value={trainId}
            onChange={(event) => setTrainId(event.target.value)}
            required
          >
            <option value="">Choose a train</option>
            {trains.map((t) => (
              <option key={t.id} value={t.id}>
                {t.number} - {t.name} ({t.source} to {t.destination}, {t.travelDate})
              </option>
            ))}
          </select>
          <button type="submit" disabled={loading}>
            {loading ? 'Loading...' : 'View bookings'}
          </button>
        </div>
      </form>

      {error && <p className="bookings-message bookings-message--error" role="alert">{error}</p>}
      {loading && <p className="bookings-message" role="status">Loading bookings...</p>}
      {Array.isArray(bookings) && bookings.length === 0 && (
        <p className="bookings-message" role="status">No bookings for this train.</p>
      )}
      {Array.isArray(bookings) && bookings.length > 0 && (
        <table className="booking-passengers">
          <thead>
            <tr>
              <th>PNR</th>
              <th>Passengers</th>
              <th>Class</th>
              <th>Status</th>
              <th>Fare paid</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.pnr}>
                <td>{booking.pnr}</td>
                <td>{booking.passengerNames.join(', ')}</td>
                <td>{booking.classType}</td>
                <td>
                  <span className={`booking-status booking-status--${String(booking.status).toLowerCase()}`}>
                    {booking.status}
                  </span>
                </td>
                <td>Rs {booking.farePaid}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}