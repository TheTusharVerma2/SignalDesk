import type { Classification } from "./classifier.js";

type ConfidenceInput = {
  ticketText: string;
  draftResponse: string;
  classification: Classification;
};

export type ConfidenceResult = {
  confidence: number;
  signals: {
    agreement: number;
    similarity: number;
    critique: number;
  };
};

// Checks whether the draft appears suitable for the ticket.
// A later version can replace these rules with an independent LLM critique prompt.
function critiqueDraft(input: ConfidenceInput): number {
  const text = input.ticketText.toLowerCase();
  const draft = input.draftResponse.toLowerCase();

  // Sensitive cases should not receive high confidence automatically.
  if (/\b(security|breach|legal|lawsuit|data loss)\b/.test(text)) {
    return 0.35;
  }

  // The draft should mention language relevant to the classified category.
  const categoryKeywords = {
    billing: ["billing", "payment", "account"],
    account: ["account", "login", "access"],
    technical: ["technical", "issue", "investigate"],
    bug: ["bug", "behavior", "investigate"],
    feature_request: ["feature", "product"],
    other: ["support", "review"]
  };

  const mentionsCategory = categoryKeywords[input.classification.category].some(
    (keyword) => draft.includes(keyword)
  );

  return mentionsCategory ? 0.8 : 0.45;
}

// Scores one decision using transparent signals that can later be calibrated.
export async function scoreConfidence(
  input: ConfidenceInput
): Promise<ConfidenceResult> {
  // Step 6 uses one deterministic classifier. Later, compare 2–3 model samples.
  const agreement = 1;

  // Human-corrected ticket similarity is not available until we collect labels.
  const similarity = 0.5;

  // Independent quality and safety check of the ticket and response draft.
  const critique = critiqueDraft(input);

  // These initial weights are hypotheses to validate through the calibration loop.
  const confidence = 0.4 * agreement + 0.3 * similarity + 0.3 * critique;

  return {
    confidence: Math.round(confidence * 1000) / 1000,
    signals: { agreement, similarity, critique }
  };
}
