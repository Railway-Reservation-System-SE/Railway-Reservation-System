
import { Link } from 'react-router-dom';
import { buildBookingUrl } from '../utils/bookingUrl';

export default function TrainCard({ train, date }) {
  return (
    <article className="train-card">
      <header className="train-card__header">
        <div>
          <h2>{train.name}</h2>
          <p className="train-card__number">Train no. {train.number}</p>
        </div>
        <p className="train-card__route">
          {train.source} <span aria-hidden="true">→</span> {train.destination}
        </p>
      </header>

      <div className="train-card__classes">
        {train.classes.map((trainClass) => (
          <section
            className="train-class"
            key={trainClass.class_name}
          >
            <div>
              <h3>{trainClass.class_name}</h3>
              <p>Fare: ₹{Number(trainClass.fare).toLocaleString('en-IN')}</p>
              <p>Seats available: {trainClass.seatsAvailable}</p>
            </div>

            <Link
              className="train-class__book"
              to={buildBookingUrl(train.id, trainClass.class_name, date)}
            >
              Book
            </Link>
          </section>
        ))}
      </div>
    </article>
  );
}
