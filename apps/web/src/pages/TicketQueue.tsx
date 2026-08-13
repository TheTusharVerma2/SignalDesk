import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Ticket } from "../api";

export function TicketQueue() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    api.listTickets(status || undefined)
      .then(({ tickets }) => setTickets(tickets))
      .catch(() => setError("Could not load tickets. Is the API running?"));
  }, [status]);

  return (
    <main className="page">
      <div className="page-heading">
        <div><p className="eyebrow">Support operations</p><h1>Ticket Queue</h1></div>
        <label className="filter">Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All tickets</option><option value="pending">Pending</option>
            <option value="escalated">Escalated</option><option value="resolved">Resolved</option>
            <option value="auto_sent">Auto-sent</option>
          </select>
        </label>
      </div>
      {error && <p className="error-message">{error}</p>}
      <section className="card">
        {tickets.length === 0 ? <p className="empty-state">No tickets found.</p> : (
          <table><thead><tr><th>Ticket</th><th>Source</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>{tickets.map((ticket) => <tr key={ticket.id}>
              <td><Link className="ticket-link" to={`/tickets/${ticket.id}`}>{ticket.rawText}</Link></td>
              <td>{ticket.source}</td><td><span className={`status status-${ticket.status}`}>{ticket.status.replace("_", " ")}</span></td>
              <td>{new Date(ticket.createdAt).toLocaleString()}</td>
            </tr>)}</tbody>
          </table>
        )}
      </section>
    </main>
  );
}
