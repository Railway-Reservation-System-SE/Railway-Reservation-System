import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import './Bookings.css';

export default function MyBookings() {
  const token = localStorage.getItem('token');
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const loadBookings = useCallback(async () => {
    try {
      const data = await api('/bookings/me');
      setBookings(data);
    } catch (err) {
      if (err.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else {
        setError(err.message || 'Unable to load your bookings. Please try again.');
      }
    }
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await api('/bookings/me');
        if (!cancelled) {
          setBookings(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.status === 401
              ? 'Your session has expired. Please log in again.'
              : err.message || 'Unable to load your bookings. Please try again.'
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleCancel(booking) {
    setError('');
    setNotice('');
    setCancellingId(booking.id);
    try {
      const result = await api(`/bookings/${booking.id}/cancel`, { method: 'POST' });
      setBookings((current) =>
        current.map((item) =>
          item.id === booking.id ? { ...item, status: result.status } : item
        )
      );
      setNotice(result.message || 'Booking cancelled, seats released');
    } catch (err) {
      setError(err.message || 'Unable to cancel the booking. Please try again.');
    } finally {
      setCancellingId(null);
      setConfirmingId(null);
    }
  }

  if (!token) {
    return (
      <main className="bookings-page">
        <h1>My Bookings</h1>
        <p className="bookings-message">
          Please <Link to="/login">log in</Link> to see your bookings.
        </p>
      </main>
    );
  }

  return (
    <main className="bookings-page">
      <h1>My Bookings</h1>

      {notice && <p className="bookings-message bookings-message--success" role="status">{notice}</p>}
      {error && (
        <p className="bookings-message bookings-message--error" role="alert">
          {error}{' '}
          <button
            type="button"
            onClick={() => {
              setError('');
              setBookings(null);
              loadBookings();
            }}
          >
            Retry
          </button>
        </p>
      )}

      {bookings === null && !error && <p className="bookings-message">Loading your bookings...</p>}

      {Array.isArray(bookings) && bookings.length === 0 && (
        <p className="bookings-message">
          You have no bookings yet. <Link to="/search">Search trains</Link> to make one.
        </p>
      )}

      {Array.isArray(bookings) && bookings.map((booking) => (
        <section className="booking-card" key={booking.id} aria-label={`Booking ${booking.pnr}`}>
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

          {booking.status === 'CONFIRMED' && (
            confirmingId === booking.id ? (
              <div className="booking-card__confirm" role="alertdialog" aria-label={`Confirm cancellation of booking ${booking.pnr}`}>
                <span>Cancel this booking? This cannot be undone.</span>
                <button
                  type="button"
                  className="booking-card__cancel"
                  onClick={() => handleCancel(booking)}
                  disabled={cancellingId === booking.id}
                >
                  {cancellingId === booking.id ? 'Cancelling...' : 'Yes, cancel booking'}
                </button>
                <button
                  type="button"
                  className="booking-card__keep"
                  onClick={() => setConfirmingId(null)}
                  disabled={cancellingId === booking.id}
                >
                  Keep booking
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="booking-card__cancel"
                onClick={() => {
                  setError('');
                  setNotice('');
                  setConfirmingId(booking.id);
                }}
              >
                Cancel booking
              </button>
            )
          )}
        </section>
      ))}
    </main>
  );
}
