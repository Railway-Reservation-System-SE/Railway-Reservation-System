
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import Search from './pages/Search';
import Register from './pages/Register';
import Login from './pages/Login';
import Booking from './pages/Booking';
import MyBookings from './pages/MyBookings';
import PnrLookup from './pages/PnrLookup';

function Placeholder({ title }) {
  return (
    <section className="page">
      <h1>{title}</h1>
      <p>This page is part of the Railway Reservation System.</p>
    </section>
  );
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
        <Route path="/admin/trains" element={<Placeholder title="Admin Trains" />} />
      </Routes>
    </BrowserRouter>
  );
}
