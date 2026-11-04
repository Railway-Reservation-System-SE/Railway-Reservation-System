
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import Search from './pages/Search';
import Register from './pages/Register';
import Login from './pages/Login';
import Booking from './pages/Booking';
import MyBookings from './pages/MyBookings';
import PnrLookup from './pages/PnrLookup';
import AdminTrains from './pages/AdminTrains';
import AdminBookings from './pages/AdminBookings';

function Placeholder({ title }) {
  return (
    <section className="page">
      <h1>{title}</h1>
      <p>This page is part of the Railway Reservation System.</p>
    </section>
  );
}

function AdminRoute({ children }) {
  const token = localStorage.getItem('token');
  let user = null;
  const storedUser = localStorage.getItem('user');

  if (storedUser) {
    try {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser && typeof parsedUser === 'object' && !Array.isArray(parsedUser)) {
        user = parsedUser;
      }
    } catch {
      user = null;
    }
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role !== 'admin') {
    return <Navigate to="/search" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <NavBar />
      <Routes>
        <Route path="/" element={<Placeholder title="Home" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/search" element={<Search />} />
        <Route path="/booking/:trainId" element={<Booking />} />
        <Route path="/bookings" element={<MyBookings />} />
        <Route path="/pnr" element={<PnrLookup />} />
        <Route
          path="/admin/trains"
          element={
            <AdminRoute>
              <AdminTrains />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <AdminRoute>
              <AdminBookings />
            </AdminRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
