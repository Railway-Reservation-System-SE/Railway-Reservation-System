import { useState } from 'react';
import { api } from '../api';
import './Bookings.css';

export default function PnrLookup() {
  const [pnr, setPnr] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = pnr.trim();
    setError('');
    setBooking(null);

    if (!/^\d{10}$/.test(trimmed)) {
      setError('Enter the 10-digit PNR number.');
      return;
    }

    setLoading(true);
    try {
      const data = await api(`/bookings/pnr/${trimmed}`);
      setBooking(data);
    } catch (err) {
      if (err.status === 404) {
        setError('PNR not found. Check the number and try again.');
      } else {
        setError(err.message || 'Unable to look up the PNR. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bookings-page">
      <h1>PNR Lookup</h1>
      <form className="pnr-form" onSubmit={handleSubmit} aria-busy={loading}>
        <label htmlFor="pnr-input">PNR number</label>
        <div className="pnr-form__row">
          <input
            id="pnr-input"
            name="pnr"
            type="text"
            inputMode="numeric"
            placeholder="10-digit PNR"
            value={pnr}
            onChange={(event) => setPnr(event.target.value)}
            disabled={loading}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Checking...' : 'Check status'}
          </button>
        </div>
      </form>

      {error && <p className="bookings-message bookings-message--error" role="alert">{error}</p>}

      {booking && (
        <section className="booking-card" aria-label="Booking details">
          <div className="booking-card__header">
            <span className="booking-card__pnr">PNR {booking.pnr}</span>
            <span className={`booking-status booking-status--${String(booking.status).toLowerCase()}`}>
              {booking.status}
            </span>
          </div>
          <dl className="booking-card__details">
            <div><dt>Train</dt><dd>{booking.train.number} - {booking.train.name}</dd></div>
            <div><dt>Route</dt><dd>{booking.train.source} to {booking.train.destination}</dd></div>
            <div><dt>Class</dt><dd>{booking.classType}</dd></div>
            <div><dt>Travel date</dt><dd>{booking.travelDate}</dd></div>
            <div><dt>Fare paid</dt><dd>Rs {booking.farePaid}</dd></div>
          </dl>
          {Array.isArray(booking.passengers) && booking.passengers.length > 0 && (
            <table className="booking-passengers">
              <thead>
                <tr><th>Passenger</th><th>Age</th><th>Gender</th></tr>
              </thead>
              <tbody>
                {booking.passengers.map((passenger, index) => (
                  <tr key={index}>
                    <td>{passenger.name}</td>
                    <td>{passenger.age}</td>
                    <td>{passenger.gender}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </main>
  );
}
