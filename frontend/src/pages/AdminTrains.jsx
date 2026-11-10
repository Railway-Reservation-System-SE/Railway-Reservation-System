import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import './Admin.css';

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
  const [editingId, setEditingId] = useState(null);
  const [trains, setTrains] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    api('/admin/trains')
      .then((data) => {
        if (!cancelled) setTrains(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setTrains([]);
          setError(err.message || 'Unable to load trains.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function updateField(event) {
    const { name, value } = event.target;
    setTrain((current) => ({ ...current, [name]: value }));
  }

  function startEdit(t) {
    const first = t.classes[0];
    setEditingId(t.id);
    setTrain({
      number: t.number,
      name: t.name,
      source: t.source,
      destination: t.destination,
      travelDate: t.travelDate,
      className: first ? first.class_name : 'SL',
      fare: first ? String(first.fare) : '',
      totalSeats: first ? String(first.totalSeats) : '',
    });
    setError('');
    setNotice('');
  }

  function cancelEdit() {
    setEditingId(null);
    setTrain(EMPTY_TRAIN);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    const body = {
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
    };
    try {
      if (editingId) {
        await api(`/admin/trains/${editingId}`, { method: 'PUT', body });
        setNotice(`Train ${editingId} updated.`);
      } else {
        const result = await api('/admin/trains', { method: 'POST', body });
        setNotice(`Train created (ID ${result.id}).`);
      }
      setEditingId(null);
      setTrain(EMPTY_TRAIN);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err.message || 'Unable to save train.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(t) {
    if (!window.confirm(`Delete train ${t.number} (${t.name})?`)) return;
    setError('');
    setNotice('');
    try {
      await api(`/admin/trains/${t.id}`, { method: 'DELETE' });
      setNotice(`Train ${t.number} deleted.`);
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err.message || 'Unable to delete train.');
    }
  }

  return (
    <main className="page admin-page">
      <h1>Admin Trains</h1>
      <p><Link to="/admin/bookings">View bookings by train</Link></p>

      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}

      <h2>All trains</h2>
      {trains === null && <p role="status">Loading trains...</p>}
      {trains !== null && trains.length === 0 && <p>No trains yet.</p>}
      {trains !== null && trains.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Number</th>
              <th>Name</th>
              <th>Route</th>
              <th>Date</th>
              <th>Classes (booked / total)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {trains.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{t.number}</td>
                <td>{t.name}</td>
                <td>{t.source} to {t.destination}</td>
                <td>{t.travelDate}</td>
                <td>
                  {t.classes
                    .map((c) => `${c.class_name}: Rs ${c.fare}, ${c.bookedSeats}/${c.totalSeats}`)
                    .join(' | ')}
                </td>
                <td>
                  <button type="button" onClick={() => startEdit(t)}>Edit</button>{' '}
                  <button type="button" onClick={() => handleDelete(t)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>{editingId ? `Edit train ${editingId}` : 'Add train'}</h2>
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
          <label htmlFor="train-class">Class (added or updated)</label>
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
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : editingId ? 'Save changes' : 'Add Train'}
        </button>{' '}
        {editingId && <button type="button" onClick={cancelEdit}>Cancel edit</button>}
      </form>
    </main>
  );
}