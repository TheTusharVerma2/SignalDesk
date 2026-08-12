import { desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { agentDecisions, tickets } from "../db/schema.js";

// Keeps ticket-reading endpoints separate from webhook ingestion.
const router = Router();

// Returns all tickets, newest first.
// Example: GET /tickets?status=pending
router.get("/", async (request, response, next) => {
  try {
    // The filter is optional. When it is absent, Drizzle omits WHERE entirely.
    const status = z.string().min(1).optional().parse(request.query.status);

    const ticketList = await db
      .select()
      .from(tickets)
      .where(status ? eq(tickets.status, status) : undefined)
      .orderBy(desc(tickets.createdAt));

    response.json({ tickets: ticketList });
  } catch (error) {
    next(error);
  }
});

// Returns one ticket and all immutable AI decisions associated with it.
// Example: GET /tickets/2bd3...
router.get("/:id", async (request, response, next) => {
  try {
    // Rejects malformed IDs before querying PostgreSQL.
    const ticketId = z.string().uuid().parse(request.params.id);

    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId));

    if (!ticket) {
      return response.status(404).json({ error: "Ticket not found" });
    }

    // Tickets can be reprocessed, so return every decision, newest first.
    const decisions = await db
      .select()
      .from(agentDecisions)
      .where(eq(agentDecisions.ticketId, ticket.id))
      .orderBy(desc(agentDecisions.createdAt));

    response.json({ ticket, decisions });
  } catch (error) {
    next(error);
  }
});

export default router;
