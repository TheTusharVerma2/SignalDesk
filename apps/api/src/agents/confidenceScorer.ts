import { eq } from "drizzle-orm";
import type { Classification } from "./classifier.js";
import { db } from "../db/client.js";
import { agentDecisions, humanCorrections } from "../db/schema.js";

type ConfidenceInput = {
  ticketText: string;
  draftResponse: string;
  classification: Classification;
  agreementScore?: number;
};

export type ConfidenceResult = {
  confidence: number;
  signals: {
    agreement: number;
    similarity: number;
    critique: number;
  };
};

function critiqueDraft(input: ConfidenceInput): number {
  const text = input.ticketText.toLowerCase();
  const draft = input.draftResponse.toLowerCase();

  // 1. Sensitive / Security cases get low critique score
  if (/\b(security|breach|legal|lawsuit|data loss)\b/.test(text)) {
    return 0.35;
  }

  // 2. Short / Vague tickets get penalized
  if (text.split(" ").length < 4) {
    return 0.50;
  }

  // 3. Category keyword alignment
  const categoryKeywords = {
    billing: ["billing", "payment", "account", "invoice"],
    account: ["account", "login", "access", "password"],
    technical: ["technical", "issue", "investigate", "error"],
    bug: ["bug", "behavior", "investigate", "fix"],
    feature_request: ["feature", "product", "team"],
    other: ["support", "review", "help"]
  };

  const keywords = categoryKeywords[input.classification.category] || categoryKeywords.other;
  const mentionsCategory = keywords.some((keyword) => draft.includes(keyword));

  let score = mentionsCategory ? 0.85 : 0.50;

  // 4. Urgency penalty (critical/high urgency requires human oversight)
  if (input.classification.urgency === "critical") score -= 0.20;
  else if (input.classification.urgency === "high") score -= 0.10;

  return Math.max(0.2, Math.min(1.0, score));
}

async function calculateHistoricalSimilarity(category: string): Promise<number> {
  try {
    // Check past human corrections in database for this category
    const pastCorrections = await db
      .select({ wasCategoryCorrect: humanCorrections.wasCategoryCorrect })
      .from(humanCorrections)
      .innerJoin(agentDecisions, eq(humanCorrections.decisionId, agentDecisions.id))
      .where(eq(agentDecisions.category, category));

    if (pastCorrections.length === 0) return 0.60;

    const correctCount = pastCorrections.filter((c) => c.wasCategoryCorrect).length;
    const historicalAccuracy = correctCount / pastCorrections.length;

    return Math.round(historicalAccuracy * 1000) / 1000;
  } catch {
    return 0.60;
  }
}

export async function scoreConfidence(
  input: ConfidenceInput
): Promise<ConfidenceResult> {
  const agreement = input.agreementScore ?? 1.0;
  const critique = critiqueDraft(input);
  const similarity = await calculateHistoricalSimilarity(input.classification.category);

  // Dynamic formula
  const rawConfidence = 0.4 * agreement + 0.3 * similarity + 0.3 * critique;
  const confidence = Math.round(rawConfidence * 1000) / 1000;

  return {
    confidence: Math.max(0.1, Math.min(0.99, confidence)),
    signals: { agreement, similarity, critique }
  };
}
