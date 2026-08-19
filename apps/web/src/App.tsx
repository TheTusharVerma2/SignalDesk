import { Link, Route, Routes } from "react-router-dom";
import { EvaluationDashboard } from "./pages/EvaluationDashboard";
import { TicketDetail } from "./pages/TicketDetail";
import { TicketQueue } from "./pages/TicketQueue";

export default function App() {
  return (
    <>
      <header className="app-header">
        <div className="brand-container">
          <Link className="brand" to="/">
            <svg
              className="brand-logo"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#8ab4ff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>SignalDesk</span>
          </Link>
        </div>
        <nav className="nav-links">
          <Link to="/">Queue</Link>
          <Link to="/eval">Evaluation & Calibration</Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<TicketQueue />} />
        <Route path="/tickets/:ticketId" element={<TicketDetail />} />
        <Route path="/eval" element={<EvaluationDashboard />} />
      </Routes>
    </>
  );
}
