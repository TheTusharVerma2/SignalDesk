import { and, desc, eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import {
  agentDecisions,
  humanCorrections,
  tickets
} from "../db/schema.js";

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

// Defines the human review record used later as evaluation ground truth.
const correctionPayload = z.object({
  decisionId: z.string().uuid(),
  wasCategoryCorrect: z.boolean(),
  wasResponseCorrect: z.boolean(),
  correctedCategory: z.string().trim().min(1).optional(),
  correctedResponse: z.string().trim().min(1).optional(),
  correctedBy: z.string().trim().min(1)
});

// Stores a support agent's evaluation of one AI decision.
// Example: POST /tickets/:id/correct
router.post("/:id/correct", async (request, response, next) => {
  try {
    const ticketId = z.string().uuid().parse(request.params.id);
    const payload = correctionPayload.parse(request.body);

    // Prevent attaching a decision from a different ticket by mistake.
    const [decision] = await db
      .select({ id: agentDecisions.id })
      .from(agentDecisions)
      .where(
        and(
          eq(agentDecisions.id, payload.decisionId),
          eq(agentDecisions.ticketId, ticketId)
        )
      );

    if (!decision) {
      return response.status(404).json({ error: "Decision not found for ticket" });
    }

    // This row is the ground truth used by future calibration and drift metrics.
    const [correction] = await db
      .insert(humanCorrections)
      .values(payload)
      .returning();

    // The ticket's latest state changes, while the decision remains immutable.
    await db
      .update(tickets)
      .set({ status: "resolved" })
      .where(eq(tickets.id, ticketId));

    response.status(201).json({ correction });
  } catch (error) {
    next(error);
  }
});

export default router;
