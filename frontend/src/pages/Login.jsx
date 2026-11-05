import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import './Auth.css';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    setError('');
    setLoading(true);
    try {
      const data = await api('/auth/login', { method: 'POST', body });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/search', { replace: true });
    } catch (err) {
      setError(err.status === 401 ? 'Invalid email or password' : (err.message || 'Unable to log in. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <h1>Log in</h1>
      {location.state?.message && <p className="auth-message" role="status">{location.state.message}</p>}
      <form className="auth-form" onSubmit={handleSubmit} aria-busy={loading}>
        <label htmlFor="login-email">Email</label>
        <input id="login-email" name="email" type="email" autoComplete="email" required disabled={loading} />
        <label htmlFor="login-password">Password</label>
        <input id="login-password" name="password" type="password" autoComplete="current-password" required disabled={loading} />
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Log in'}</button>
      </form>
      <p>New here? <Link to="/register">Create an account</Link></p>
    </main>
  );
}
