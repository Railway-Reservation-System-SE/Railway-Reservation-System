import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const EMPTY_TRAIN = {
  number: '',
  name: '',
  source: '',
  destination: '',
  travelDate: '',
  className: 'SL',
  fare: '',
  totalSeats: '',
};

export default function AdminTrains() {
  const [train, setTrain] = useState(EMPTY_TRAIN);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function updateField(event) {
    const { name, value } = event.target;
    setTrain((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    try {
      const result = await api('/admin/trains', {
        method: 'POST',
        body: {
          number: train.number,
          name: train.name,
          source: train.source,
          destination: train.destination,
          travelDate: train.travelDate,
          classes: [{
            class_name: train.className,
            fare: Number(train.fare),
            totalSeats: Number(train.totalSeats),
          }],
        },
      });
      setNotice(`Train created (ID ${result.id}).`);
      setTrain(EMPTY_TRAIN);
    } catch (err) {
      setError(err.message || 'Unable to add train.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <h1>Admin Trains</h1>
      <p>This page is for managing train information.</p>
      <p><Link to="/admin/bookings">View bookings by train ID</Link></p>

      <h2>Add Train</h2>
      <form onSubmit={handleSubmit}>
        <p>
          <label htmlFor="train-number">Train number</label>
          <input id="train-number" name="number" value={train.number} onChange={updateField} required />
        </p>
        <p>
          <label htmlFor="train-name">Train name</label>
          <input id="train-name" name="name" value={train.name} onChange={updateField} required />
        </p>
        <p>
          <label htmlFor="train-source">Source</label>
          <input id="train-source" name="source" value={train.source} onChange={updateField} required />
        </p>
        <p>
          <label htmlFor="train-destination">Destination</label>
          <input id="train-destination" name="destination" value={train.destination} onChange={updateField} required />
        </p>
        <p>
          <label htmlFor="train-travel-date">Travel date</label>
          <input id="train-travel-date" name="travelDate" type="date" value={train.travelDate} onChange={updateField} required />
        </p>
        <p>
          <label htmlFor="train-class">Class</label>
          <select id="train-class" name="className" value={train.className} onChange={updateField}>
            <option value="SL">SL</option>
            <option value="3A">3A</option>
            <option value="2A">2A</option>
          </select>
        </p>
        <p>
          <label htmlFor="train-fare">Fare</label>
          <input id="train-fare" name="fare" type="number" min="0.01" step="0.01" value={train.fare} onChange={updateField} required />
        </p>
        <p>
          <label htmlFor="train-total-seats">Total seats</label>
          <input id="train-total-seats" name="totalSeats" type="number" min="1" step="1" value={train.totalSeats} onChange={updateField} required />
        </p>
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Adding train...' : 'Add Train'}
        </button>
      </form>

      <section aria-labelledby="train-list-heading">
        <h2 id="train-list-heading">Train list unavailable</h2>
        <p>
          The admin train-list endpoint has not been agreed. A train table with edit and delete
          actions depends on that team decision.
        </p>
      </section>
    </main>
  );
}
