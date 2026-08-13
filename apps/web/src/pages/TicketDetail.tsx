import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, Decision, Ticket } from "../api";

export function TicketDetail() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState<Ticket>();
  const [decision, setDecision] = useState<Decision>();
  const [categoryCorrect, setCategoryCorrect] = useState(true);
  const [responseCorrect, setResponseCorrect] = useState(true);
  const [correctedCategory, setCorrectedCategory] = useState("");
  const [correctedResponse, setCorrectedResponse] = useState("");
  const [reviewer, setReviewer] = useState("support-agent");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadTicket() {
    if (!ticketId) return;
    try {
      setError("");
      const data = await api.getTicket(ticketId);
      setTicket(data.ticket);
      setDecision(data.decisions[0]);
    } catch { setError("Could not load this ticket."); }
  }

  useEffect(() => { void loadTicket(); }, [ticketId]);

  async function submitCorrection(event: FormEvent) {
    event.preventDefault();
    if (!ticket || !decision) return;
    try {
      setError("");
      await api.submitCorrection(ticket.id, {
        decisionId: decision.id,
        wasCategoryCorrect: categoryCorrect,
        wasResponseCorrect: responseCorrect,
        correctedCategory: correctedCategory || undefined,
        correctedResponse: correctedResponse || undefined,
        correctedBy: reviewer
      });
      setMessage("Correction saved. The ticket is now resolved.");
      await loadTicket();
    } catch { setError("Could not save the correction."); }
  }

  if (error && !ticket) return <main className="page"><Link to="/">← Back to queue</Link><p className="error-message">{error}</p></main>;
  if (!ticket) return <main className="page">Loading ticket…</main>;

  return (
    <main className="page">
      <Link className="back-link" to="/">← Back to queue</Link>
      <div className="page-heading"><div><p className="eyebrow">Ticket review</p><h1>Support ticket</h1></div>
        <span className={`status status-${ticket.status}`}>{ticket.status.replace("_", " ")}</span></div>
      <section className="card"><h2>Customer message</h2><p className="ticket-text">{ticket.rawText}</p>
        <p className="muted">Source: {ticket.source} · Created: {new Date(ticket.createdAt).toLocaleString()}</p></section>
      {!decision ? <section className="card"><p>The ticket is waiting for the background worker.</p></section> : <>
        <section className="card"><h2>AI decision</h2><div className="decision-grid">
          <div><span className="label">Category</span><strong>{decision.category.replace("_", " ")}</strong></div>
          <div><span className="label">Urgency</span><strong>{decision.urgency}</strong></div>
          <div><span className="label">Confidence</span><strong>{(Number(decision.confidence) * 100).toFixed(1)}%</strong></div>
          <div><span className="label">Decision</span><strong>{decision.actionTaken.replace("_", " ")}</strong></div>
        </div><h3>Draft response</h3><pre className="draft-response">{decision.draftResponse}</pre></section>
        <form className="card correction-form" onSubmit={submitCorrection}><h2>Human correction</h2>
          <p className="muted">Your feedback becomes ground truth for SignalDesk evaluation.</p>
          <label className="checkbox-label"><input type="checkbox" checked={categoryCorrect} onChange={(event) => setCategoryCorrect(event.target.checked)} />AI category is correct</label>
          {!categoryCorrect && <label>Correct category<input value={correctedCategory} onChange={(event) => setCorrectedCategory(event.target.value)} placeholder="Example: billing" /></label>}
          <label className="checkbox-label"><input type="checkbox" checked={responseCorrect} onChange={(event) => setResponseCorrect(event.target.checked)} />AI response is correct</label>
          {!responseCorrect && <label>Corrected response<textarea value={correctedResponse} onChange={(event) => setCorrectedResponse(event.target.value)} placeholder="Write the response the customer should receive." /></label>}
          <label>Reviewer name<input value={reviewer} onChange={(event) => setReviewer(event.target.value)} required /></label>
          <button type="submit">Save correction</button>{message && <p className="success-message">{message}</p>}{error && <p className="error-message">{error}</p>}
        </form>
      </>}
    </main>
  );
}
