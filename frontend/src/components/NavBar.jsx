import { Link, NavLink, useNavigate } from 'react-router-dom';

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

function TrainMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="24" height="24" rx="7" fill="#1d4ed8" />
      <path
        d="M8 6.5h10a1.5 1.5 0 0 1 1.5 1.5v6a2.5 2.5 0 0 1-2.5 2.5H9A2.5 2.5 0 0 1 6.5 14V8A1.5 1.5 0 0 1 8 6.5Z"
        fill="#fff"
      />
      <rect x="8.6" y="8.6" width="3.6" height="3.2" rx="0.8" fill="#1d4ed8" />
      <rect x="13.8" y="8.6" width="3.6" height="3.2" rx="0.8" fill="#1d4ed8" />
      <circle cx="9.6" cy="14.4" r="1" fill="#1d4ed8" />
      <circle cx="16.4" cy="14.4" r="1" fill="#1d4ed8" />
      <path d="m9 18-1.6 2.2M17 18l1.6 2.2M10.6 20.2h4.8" stroke="#1d4ed8" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
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
    <nav className="navbar">
      <Link to="/" className="navbar__brand">
        <TrainMark />
        Railway Reservation
      </Link>
      <div className="navbar__links">
        {token ? (
          <>
            <NavLink className="navbar__link" to="/search">Search Trains</NavLink>
            <NavLink className="navbar__link" to="/bookings">My Bookings</NavLink>
          </>
        ) : (
          <>
            <NavLink className="navbar__link" to="/login">Login</NavLink>
            <NavLink className="navbar__link" to="/register">Register</NavLink>
          </>
        )}

        <NavLink className="navbar__link" to="/pnr">PNR Lookup</NavLink>
        {isAdmin && (
          <>
            <NavLink className="navbar__link" to="/admin/trains">Admin Trains</NavLink>
            <NavLink className="navbar__link" to="/admin/bookings">Admin Bookings</NavLink>
          </>
        )}
        {token && (
          <button type="button" className="navbar__logout" onClick={handleLogout}>Logout</button>
        )}
      </div>
    </nav>
  );
}
