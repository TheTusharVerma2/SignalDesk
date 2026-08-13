import { eq } from "drizzle-orm";
import { classifyTicket } from "./classifier.js";
import { scoreConfidence } from "./confidenceScorer.js";
import { draftResponse } from "./responder.js";
import { db } from "../db/client.js";
import { agentDecisions, tickets } from "../db/schema.js";

// This version label identifies exactly which classifier created the decision.
const MODEL_VERSION = "rule-based-v1";

export async function processTicket(ticketId: string) {
  // Retrieve the original ticket using the ID stored in the Redis job.
  const [ticket] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, ticketId));

  if (!ticket) {
    throw new Error(`Ticket ${ticketId} was not found`);
  }

  // Produce category and urgency without changing the original customer message.
  const classification = classifyTicket(ticket.rawText);

  // Builds a category- and urgency-aware reply draft.
  const responseDraft = draftResponse(ticket.rawText, classification);

  // Scores the decision using agreement, similarity, and critique signals.
  const scoring = await scoreConfidence({
    ticketText: ticket.rawText,
    draftResponse: responseDraft,
    classification
  });

  // Every processing attempt creates a new immutable audit record.
  const [decision] = await db
    .insert(agentDecisions)
    .values({
      ticketId: ticket.id,
      category: classification.category,
      urgency: classification.urgency,
      draftResponse: responseDraft,
      // PostgreSQL numeric values are represented as strings by Drizzle.
      confidence: String(scoring.confidence),
      actionTaken: "escalated",
      modelVersion: MODEL_VERSION
    })
    .returning();

  // Update the ticket's current state while retaining the decision history above.
  await db
    .update(tickets)
    .set({ status: "escalated" })
    .where(eq(tickets.id, ticket.id));

  return decision;
}
