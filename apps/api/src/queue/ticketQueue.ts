import "dotenv/config";

import { Queue } from "bullmq";
import { Redis } from "ioredis";

// This connection is used by the API to place jobs into Redis.
// BullMQ handles its own retry behavior, so it requires this option.
const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null
});

// A Queue stores jobs only; a separate Worker executes them.
export const ticketQueue = new Queue("ticket-processing", { connection });
