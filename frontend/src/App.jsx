
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import Search from './pages/Search';
import Register from './pages/Register';
import Login from './pages/Login';

function Placeholder({ title }) {
  return (
    <main>
      <h1>{title}</h1>
      <p>This page will be implemented in its assigned UI task.</p>
    </main>
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
        <Route path="/booking/:trainId" element={<Placeholder title="Book Train" />} />
        <Route path="/bookings" element={<Placeholder title="My Bookings" />} />
        <Route path="/pnr" element={<Placeholder title="PNR Lookup" />} />
        <Route path="/admin/trains" element={<Placeholder title="Admin Trains" />} />
      </Routes>
    </BrowserRouter>
  );
}
