import { Link, Route, Routes } from "react-router-dom";
import { TicketDetail } from "./pages/TicketDetail";
import { TicketQueue } from "./pages/TicketQueue";

export default function App() {
  return (
    <>
      <header className="app-header">
        <Link className="brand" to="/">SignalDesk</Link>
        <span>Support triage review</span>
      </header>
      <Routes>
        <Route path="/" element={<TicketQueue />} />
        <Route path="/tickets/:ticketId" element={<TicketDetail />} />
      </Routes>
    </>
  );
}
