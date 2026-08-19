import { eq } from "drizzle-orm";
import { classifyTicketWithConsensus } from "./classifier.js";
import { scoreConfidence } from "./confidenceScorer.js";
import { draftResponse } from "./responder.js";
import { db } from "../db/client.js";
import { agentDecisions, tickets } from "../db/schema.js";

const MODEL_VERSION = "consensus-llm-v1";
const AUTO_SEND_THRESHOLD = 0.75;

export async function processTicket(ticketId: string) {
  const [ticket] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, ticketId));

  if (!ticket) {
    throw new Error(`Ticket ${ticketId} was not found`);
  }

  // Run multi-sample consensus classifier
  const { classification, agreementScore } = await classifyTicketWithConsensus(
    ticket.rawText
  );

  // Draft response aware of category and urgency
  const responseDraft = draftResponse(ticket.rawText, classification);

  // Score confidence using consensus agreement signal
  const scoring = await scoreConfidence({
    ticketText: ticket.rawText,
    draftResponse: responseDraft,
    classification,
    agreementScore
  });

  const isHighConfidence = scoring.confidence >= AUTO_SEND_THRESHOLD;
  const actionTaken = isHighConfidence ? "auto_sent" : "escalated";
  const ticketStatus = isHighConfidence ? "auto_sent" : "escalated";

  const [decision] = await db
    .insert(agentDecisions)
    .values({
      ticketId: ticket.id,
      category: classification.category,
      urgency: classification.urgency,
      draftResponse: responseDraft,
      confidence: String(scoring.confidence),
      actionTaken,
      modelVersion: MODEL_VERSION
    })
    .returning();

  await db
    .update(tickets)
    .set({ status: ticketStatus })
    .where(eq(tickets.id, ticket.id));

  return decision;
}
