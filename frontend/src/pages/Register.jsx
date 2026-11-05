import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import './Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const body = Object.fromEntries(fields.entries());
    setError('');
    setEmailError('');
    setLoading(true);
    try {
      await api('/auth/register', { method: 'POST', body });
      navigate('/login', { replace: true, state: { message: 'Registered - please log in' } });
    } catch (err) {
      if (err.status === 409) setEmailError(err.message);
      else setError(err.message || 'Unable to register. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <h1>Create an account</h1>
      <form className="auth-form" onSubmit={handleSubmit} aria-busy={loading}>
        <label htmlFor="register-name">Name</label>
        <input id="register-name" name="name" autoComplete="name" required disabled={loading} />
        <label htmlFor="register-email">Email</label>
        <input id="register-email" name="email" type="email" autoComplete="email" required disabled={loading}
          aria-invalid={Boolean(emailError)} aria-describedby={emailError ? 'register-email-error' : undefined} />
        {emailError && <p id="register-email-error" className="auth-error" role="alert">{emailError}</p>}
        <label htmlFor="register-password">Password</label>
        <input id="register-password" name="password" type="password" autoComplete="new-password" minLength={6} required disabled={loading} aria-describedby="password-help" />
        <p id="password-help" className="auth-help">At least 6 characters and at most 72 UTF-8 bytes.</p>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Register'}</button>
      </form>
      <p>Already registered? <Link to="/login">Log in</Link></p>
    </main>
  );
}
