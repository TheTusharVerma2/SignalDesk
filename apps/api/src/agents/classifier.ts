// Categories used by the first classifier version.
export type Category =
  | "billing"
  | "technical"
  | "account"
  | "feature_request"
  | "bug"
  | "other";

export type Urgency = "low" | "medium" | "high" | "critical";

export type Classification = {
  category: Category;
  urgency: Urgency;
};

// Each category has simple keywords for this initial non-AI classifier.
const categoryRules: Array<[Category, RegExp]> = [
  ["billing", /\b(invoice|charge|charged|refund|payment|pricing|subscription)\b/i],
  ["account", /\b(login|log in|password|account|sign in|access|verification)\b/i],
  ["technical", /\b(error|broken|not working|issue|failed|unable)\b/i],
  ["bug", /\bbug|crash|unexpected|defect\b/i],
  ["feature_request", /\bfeature|wish|would love|request|add support\b/i]
];

// Classifies one ticket without changing the database.
// A future LLM classifier can replace the rule logic while keeping this return shape.
export function classifyTicket(text: string): Classification {
  const category =
    categoryRules.find(([, pattern]) => pattern.test(text))?.[0] ?? "other";

  const urgency: Urgency =
    /\b(outage|down|security|breach|data loss|critical)\b/i.test(text)
      ? "critical"
      : /\b(urgent|asap|blocked|cannot work|whole team)\b/i.test(text)
        ? "high"
        : /\b(problem|issue|help|error|unable)\b/i.test(text)
          ? "medium"
          : "low";

  return { category, urgency };
}
