import { Link, useNavigate } from 'react-router-dom';

export default function NavBar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  function handleLogout() {
    localStorage.removeItem('token');
    navigate('/login');
  }

  return (
    <nav>
      <Link to="/">Railway Reservation</Link>{' | '}
      {token ? (
        <>
          <Link to="/search">Search Trains</Link>{' | '}
          <Link to="/bookings">My Bookings</Link>{' | '}
          <button type="button" onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <>
          <Link to="/login">Login</Link>{' | '}
          <Link to="/register">Register</Link>
        </>
      )}
      {' | '}
      <Link to="/pnr">PNR Lookup</Link>{' | '}
      <Link to="/admin/trains">Admin Trains</Link>
    </nav>
  );
}
