
import { useState } from 'react';
import { api } from '../api';
import TrainCard from '../components/TrainCard';

export default function Search() {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [trains, setTrains] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(event) {
    event.preventDefault();

    setLoading(true);
    setError('');
    setTrains([]);
    setHasSearched(false);

    const params = new URLSearchParams({
      source: source.trim(),
      destination: destination.trim(),
      date,
    });

    try {
      const results = await api(`/trains/search?${params.toString()}`);
      setTrains(results);
      setHasSearched(true);
    } catch (err) {
      setError(err.message || 'Unable to search trains. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="search-page">
      <section className="search-intro">
        <h1>Search Trains</h1>
        <p>Find trains for your journey and compare available classes.</p>
      </section>

      <form className="search-form" onSubmit={handleSearch}>
        <div className="search-form__field">
          <label htmlFor="source">From</label>
          <input
            id="source"
            name="source"
            type="text"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="e.g. Bengaluru"
            required
          />
        </div>

        <div className="search-form__field">
          <label htmlFor="destination">To</label>
          <input
            id="destination"
            name="destination"
            type="text"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            placeholder="e.g. Chennai"
            required
          />
        </div>

        <div className="search-form__field">
          <label htmlFor="date">Travel date</label>
          <input
            id="date"
            name="date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Searching...' : 'Search Trains'}
        </button>
      </form>

      {loading && <p role="status">Searching for trains...</p>}

      {error && (
        <p className="search-message search-message--error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && hasSearched && trains.length === 0 && (
        <p className="search-message" role="status">
          No trains found. Try different stations or another travel date.
        </p>
      )}

      {!loading && !error && trains.length > 0 && (
        <section className="search-results" aria-label="Train search results">
          <h2>Available trains ({trains.length})</h2>
          {trains.map((train) => (
            <TrainCard key={train.id} train={train} date={date} />
          ))}
        </section>
      )}
    </main>
  );
}
