import "dotenv/config";

import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { processTicket } from "../agents/pipeline.js";

// Connects to the same Redis instance and queue name as ticketQueue.ts.
const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null
});

const worker = new Worker(
  "ticket-processing",
  async (job) => {
    // Runs the classification and immutable decision-writing pipeline.
    const decision = await processTicket(job.data.ticketId);

    console.log(
      `Processed ${job.data.ticketId}: ${decision.category}, ${decision.urgency}`
    );
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`Completed ticket-processing job ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`Ticket-processing job ${job?.id} failed`, error);
});
