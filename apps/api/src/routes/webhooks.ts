import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { tickets } from "../db/schema.js";
import { ticketQueue } from "../queue/ticketQueue.js";

// A router keeps webhook endpoints separate from API startup code.
const router = Router();

// Only these ticket sources and a non-empty message are accepted.
const ticketCreatedPayload = z.object({
  source: z.enum(["email", "zendesk", "intercom"]),
  rawText: z.string().trim().min(1, "rawText cannot be empty")
});

// Stores an incoming ticket in PostgreSQL for later asynchronous processing.
router.post("/ticket-created", async (request, response, next) => {
  try {
    // Validation also gives the payload a safe TypeScript type.
    const payload = ticketCreatedPayload.parse(request.body);

    // Preserve the original ticket text exactly as submitted after trimming.
    const [ticket] = await db
      .insert(tickets)
      .values({
        source: payload.source,
        rawText: payload.rawText,
        status: "pending"
      })
      .returning();

    // Queue only the ticket ID; the original customer text remains in PostgreSQL.
    await ticketQueue.add(
      "process-ticket",
      { ticketId: ticket.id },
      {
        // Keep recent successes for debugging without retaining jobs indefinitely.
        removeOnComplete: 100,

        // Retain failed jobs so their errors can be inspected or retried.
        removeOnFail: false
      }
    );

    // 201 indicates a new ticket was created.
    response.status(201).json({ ticket });
  } catch (error) {
    // The global error handler formats validation and database failures.
    next(error);
  }
});

export default router;
