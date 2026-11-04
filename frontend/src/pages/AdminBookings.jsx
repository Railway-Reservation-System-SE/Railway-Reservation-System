import { useState } from 'react';
import { api } from '../api';
import './Bookings.css';

export default function AdminBookings() {
  const [trainId, setTrainId] = useState('');
  const [bookings, setBookings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      <p>The train picker depends on the team deciding on an admin train-list endpoint.</p>
      <form className="pnr-form" onSubmit={handleSubmit}>
        <label htmlFor="admin-bookings-train-id">Train ID</label>
        <div className="pnr-form__row">
          <input
            id="admin-bookings-train-id"
            type="number"
            min="1"
            step="1"
            value={trainId}
            onChange={(event) => setTrainId(event.target.value)}
            required
          />
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
