import { Link, useNavigate } from 'react-router-dom';

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

export default function NavBar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const isAdmin = Boolean(token) && getUser()?.role === 'admin';

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  }

  return (
    <nav>
      <Link to="/">Railway Reservation</Link>
      {token ? (
        <>
          <Link to="/search">Search Trains</Link>
          <Link to="/bookings">My Bookings</Link>
          <button type="button" onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </>
      )}

      <Link to="/pnr">PNR Lookup</Link>
      {isAdmin && (
        <>
          <Link to="/admin/trains">Admin Trains</Link>
          <Link to="/admin/bookings">Admin Bookings</Link>
        </>
      )}
    </nav>
  );
}