
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';

const MAX_PASSENGERS = 4;

function createPassenger() {
  return { name: '', age: '', gender: '' };
}

export default function Booking() {
  const { trainId } = useParams();
  const [searchParams] = useSearchParams();

  const classType = searchParams.get('class') || '';
  const travelDate = searchParams.get('date') || '';

  const [passengers, setPassengers] = useState([createPassenger()]);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function updatePassenger(index, field, value) {
    setPassengers((current) =>
      current.map((passenger, passengerIndex) =>
        passengerIndex === index
          ? { ...passenger, [field]: value }
          : passenger
      )
    );
  }

  function addPassenger() {
    if (passengers.length < MAX_PASSENGERS) {
      setPassengers((current) => [...current, createPassenger()]);
    }
  }

  function removePassenger(index) {
    if (passengers.length > 1) {
      setPassengers((current) =>
        current.filter((_, passengerIndex) => passengerIndex !== index)
      );
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!classType || !travelDate) {
      setError('Train class and travel date are missing. Return to search and select a train again.');
      return;
    }

    if (!paymentMethod) {
      setError('Please select a payment method.');
      return;
    }

    const requestPassengers = passengers.map((passenger) => ({
      name: passenger.name.trim(),
      age: Number(passenger.age),
      gender: passenger.gender,
    }));

    setLoading(true);

    try {
      await api('/bookings', {
        method: 'POST',
        body: {
          trainId,
          classType,
          travelDate,
          passengers: requestPassengers,
          paymentMethod,
        },
      });

      setMessage('Booking request submitted.');
    } catch (err) {
      setError(
        err.message === 'Booking not implemented yet'
          ? 'The booking service is not available yet. Your booking has not been created.'
          : err.message || 'Unable to submit booking. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="booking-page">
      <section className="booking-intro">
        <h1>Book Train</h1>
        <p>Review your journey and enter passenger details.</p>
      </section>

      <section className="booking-summary" aria-label="Journey details">
        <h2>Journey details</h2>
        <p>Train ID: {trainId}</p>
        <p>Class: {classType || 'Not selected'}</p>
        <p>Travel date: {travelDate || 'Not selected'}</p>
      </section>

      <form className="booking-form" onSubmit={handleSubmit}>
        <section aria-labelledby="passengers-heading">
          <h2 id="passengers-heading">Passenger details</h2>

          {passengers.map((passenger, index) => (
            <fieldset className="passenger-form" key={index}>
              <legend>Passenger {index + 1}</legend>

              <div className="booking-form__field">
                <label htmlFor={`passenger-name-${index}`}>Full name</label>
                <input
                  id={`passenger-name-${index}`}
                  name={`passenger-name-${index}`}
                  type="text"
                  value={passenger.name}
                  onChange={(event) =>
                    updatePassenger(index, 'name', event.target.value)
                  }
                  required
                />
              </div>

              <div className="booking-form__field">
                <label htmlFor={`passenger-age-${index}`}>Age</label>
                <input
                  id={`passenger-age-${index}`}
                  name={`passenger-age-${index}`}
                  type="number"
                  min="0"
                  step="1"
                  value={passenger.age}
                  onChange={(event) =>
                    updatePassenger(index, 'age', event.target.value)
                  }
                  required
                />
              </div>

              <div className="booking-form__field">
                <label htmlFor={`passenger-gender-${index}`}>Gender</label>
                <select
                  id={`passenger-gender-${index}`}
                  name={`passenger-gender-${index}`}
                  value={passenger.gender}
                  onChange={(event) =>
                    updatePassenger(index, 'gender', event.target.value)
                  }
                  required
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {passengers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePassenger(index)}
                >
                  Remove passenger
                </button>
              )}
            </fieldset>
          ))}

          <button
            type="button"
            onClick={addPassenger}
            disabled={passengers.length >= MAX_PASSENGERS}
          >
            Add passenger
          </button>

          <p>{passengers.length} of {MAX_PASSENGERS} passengers</p>
        </section>

        <section aria-labelledby="payment-heading">
          <h2 id="payment-heading">Payment method</h2>

          <div className="booking-form__field">
            <label htmlFor="payment-method">Select payment method</label>
            <select
              id="payment-method"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              required
            >
              <option value="">Choose a method</option>
              <option value="UPI">UPI</option>
              <option value="Card">Credit/debit card</option>
              <option value="NetBanking">Net banking</option>
            </select>
          </div>

          <p>Payment is not processed by this form yet.</p>
        </section>

        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit booking'}
        </button>
      </form>
    </main>
  );
}
