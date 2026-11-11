import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import './Auth.css';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const newPassword = fields.get('newPassword');
    const confirmPassword = fields.get('confirmPassword');
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, newPassword } });
      navigate('/login', { replace: true, state: { message: 'Password updated - please log in' } });
    } catch (err) {
      setError(err.message || 'Unable to reset the password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="auth-page">
        <h1>Reset password</h1>
        <p className="auth-error" role="alert">
          This reset link is missing its token. Use the full link from the reset email.
        </p>
        <p><Link to="/login">Back to log in</Link></p>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <h1>Reset password</h1>
      <form className="auth-form" onSubmit={handleSubmit} aria-busy={loading}>
        <label htmlFor="reset-password">New password</label>
        <input id="reset-password" name="newPassword" type="password" autoComplete="new-password" minLength={6} required disabled={loading} aria-describedby="reset-password-help" />
        <p id="reset-password-help" className="auth-help">At least 6 characters and at most 72 UTF-8 bytes.</p>
        <label htmlFor="reset-confirm">Confirm new password</label>
        <input id="reset-confirm" name="confirmPassword" type="password" autoComplete="new-password" minLength={6} required disabled={loading} />
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Set new password'}</button>
      </form>
      <p><Link to="/login">Back to log in</Link></p>
    </main>
  );
}
