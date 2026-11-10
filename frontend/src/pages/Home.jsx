import { Link } from 'react-router-dom';
import './Home.css';

function HeroArt() {
  return (
    <svg viewBox="0 0 420 300" className="hero__art-svg" aria-hidden="true">
      <defs>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#1e40af" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hero-train" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dbe7ff" />
        </linearGradient>
      </defs>

      <circle cx="330" cy="70" r="120" fill="url(#hero-sky)" />

      {/* track */}
      <g stroke="#93b4f5" strokeWidth="4" strokeLinecap="round">
        <line x1="30" y1="248" x2="390" y2="248" />
        <line x1="30" y1="262" x2="390" y2="262" />
      </g>
      <g stroke="#6b96f0" strokeWidth="4" strokeLinecap="round">
        <line x1="60" y1="240" x2="60" y2="270" />
        <line x1="110" y1="240" x2="110" y2="270" />
        <line x1="160" y1="240" x2="160" y2="270" />
        <line x1="210" y1="240" x2="210" y2="270" />
        <line x1="260" y1="240" x2="260" y2="270" />
        <line x1="310" y1="240" x2="310" y2="270" />
        <line x1="360" y1="240" x2="360" y2="270" />
      </g>

      {/* train body */}
      <g>
        <rect x="70" y="120" width="280" height="110" rx="26" fill="url(#hero-train)" />
        <rect x="70" y="120" width="280" height="110" rx="26" fill="none" stroke="#bfd4fb" strokeWidth="2" />
        <path d="M70 176h280" stroke="#f59e0b" strokeWidth="8" />
        {/* windows */}
        <g fill="#1d4ed8" opacity="0.85">
          <rect x="96" y="140" width="40" height="26" rx="8" />
          <rect x="150" y="140" width="40" height="26" rx="8" />
          <rect x="204" y="140" width="40" height="26" rx="8" />
          <rect x="258" y="140" width="40" height="26" rx="8" />
        </g>
        {/* nose light */}
        <circle cx="336" cy="206" r="7" fill="#fbbf24" />
        {/* wheels */}
        <circle cx="130" cy="234" r="14" fill="#0f2f7a" />
        <circle cx="130" cy="234" r="5" fill="#93b4f5" />
        <circle cx="290" cy="234" r="14" fill="#0f2f7a" />
        <circle cx="290" cy="234" r="5" fill="#93b4f5" />
      </g>

      {/* route dots */}
      <g>
        <path d="M60 70 C 130 30, 250 30, 330 62" stroke="#7ea6f8" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" fill="none" />
        <circle cx="60" cy="70" r="7" fill="#f59e0b" />
        <circle cx="330" cy="62" r="7" fill="#ffffff" stroke="#7ea6f8" strokeWidth="3" />
      </g>
    </svg>
  );
}

function FeatureIcon({ children }) {
  return (
    <div className="feature-card__icon" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </div>
  );
}

export default function Home() {
  return (
    <main className="home">
      <section className="hero">
        <div className="hero__content">
          <p className="hero__eyebrow">Railway Reservation System</p>
          <h1>Book your train journey in minutes.</h1>
          <p className="hero__lede">
            Search trains between stations, compare classes and fares, and
            confirm your seat - all in one place.
          </p>
          <div className="hero__actions">
            <Link className="btn btn--primary" to="/search">Search trains</Link>
            <Link className="btn btn--ghost" to="/pnr">Check PNR status</Link>
          </div>
        </div>
        <div className="hero__art">
          <HeroArt />
        </div>
      </section>

      <section className="features" aria-label="What you can do">
        <article className="feature-card">
          <FeatureIcon><circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="21" y2="21" /></FeatureIcon>
          <h2>Search and compare</h2>
          <p>Find trains by route and date, with live seat availability for every class.</p>
        </article>
        <article className="feature-card">
          <FeatureIcon><path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2.5 2.5 0 0 0 0 5v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2.5 2.5 0 0 0 0-5Z" /><path d="M13 5v2m0 4v2m0 4v2" strokeDasharray="1 3" /></FeatureIcon>
          <h2>Book with ease</h2>
          <p>Add up to four passengers, pick a payment method, and get your PNR instantly.</p>
        </article>
        <article className="feature-card">
          <FeatureIcon><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4.5V3.8A1.8 1.8 0 0 1 10.8 2h2.4A1.8 1.8 0 0 1 15 3.8v.7" /><path d="m9 13 2 2 4-4" /></FeatureIcon>
          <h2>Manage bookings</h2>
          <p>Review your trips, check PNR status, or cancel a booking when plans change.</p>
        </article>
      </section>
    </main>
  );
}
