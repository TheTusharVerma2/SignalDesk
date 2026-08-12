import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";

// The incoming customer-support request. This is the source record.
export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source").notNull(),
    rawText: text("raw_text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: text("status").notNull().default("pending")
  },
  (table) => [index("tickets_status_idx").on(table.status)]
);

// Immutable audit record of one AI processing attempt for a ticket.
export const agentDecisions = pgTable(
  "agent_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id),
    category: text("category").notNull(),
    urgency: text("urgency").notNull(),
    draftResponse: text("draft_response").notNull(),
    confidence: numeric("confidence", { precision: 4, scale: 3 }).notNull(),
    actionTaken: text("action_taken").notNull(),
    modelVersion: text("model_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [
    index("agent_decisions_ticket_id_idx").on(table.ticketId),
    index("agent_decisions_created_at_idx").on(table.createdAt)
  ]
);

// Human review creates the ground truth used for evaluation and calibration.
export const humanCorrections = pgTable(
  "human_corrections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => agentDecisions.id),
    wasCategoryCorrect: boolean("was_category_correct").notNull(),
    wasResponseCorrect: boolean("was_response_correct").notNull(),
    correctedCategory: text("corrected_category"),
    correctedResponse: text("corrected_response"),
    correctedBy: text("corrected_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [index("human_corrections_decision_id_idx").on(table.decisionId)]
);

// Nightly historical snapshots used to plot confidence calibration over time.
export const calibrationSnapshots = pgTable(
  "calibration_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    confidenceBucket: text("confidence_bucket").notNull(),
    predictedAccuracy: numeric("predicted_accuracy", {
      precision: 4,
      scale: 3
    }).notNull(),
    actualAccuracy: numeric("actual_accuracy", {
      precision: 4,
      scale: 3
    }).notNull(),
    sampleSize: integer("sample_size").notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [index("calibration_snapshots_computed_at_idx").on(table.computedAt)]
);
