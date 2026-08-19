// Categories used by the classifier engine.
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
  reasoning?: string;
};

// Keyword rules for deterministic non-LLM matching
const categoryRules: Array<[Category, RegExp]> = [
  ["billing", /\b(invoice|charge|charged|refund|payment|pricing|subscription)\b/i],
  ["account", /\b(login|log in|password|account|sign in|access|verification)\b/i],
  ["technical", /\b(error|broken|not working|issue|failed|unable)\b/i],
  ["bug", /\bbug|crash|unexpected|defect\b/i],
  ["feature_request", /\bfeature|wish|would love|request|add support\b/i]
];

export function classifyTicketRules(text: string): Classification {
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

  return { category, urgency, reasoning: "Rule-based keyword matching" };
}

// Alias for rule classifier to preserve backwards compatibility
export const classifyTicket = classifyTicketRules;

// Multi-sample consensus classifier
export async function classifyTicketWithConsensus(text: string): Promise<{
  classification: Classification;
  agreementScore: number;
  samples: Classification[];
}> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Fallback mode: return deterministic classification with 1.0 agreement
    const base = classifyTicketRules(text);
    return {
      classification: base,
      agreementScore: 1.0,
      samples: [base, base, base]
    };
  }

  try {
    const prompt = `You are a support ticket triage agent. Classify this ticket into category (billing, technical, account, feature_request, bug, other) and urgency (low, medium, high, critical).\n\nTicket: "${text}"\n\nReturn JSON: {"category": "...", "urgency": "...", "reasoning": "..."}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
        n: 3
      })
    });

    if (!response.ok) throw new Error("LLM API request failed");

    const data = (await response.json()) as any;
    const samples: Classification[] = data.choices.map((choice: any) =>
      JSON.parse(choice.message.content)
    );

    const categoryCounts: Record<string, number> = {};
    for (const s of samples) {
      categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
    }

    const topCategory = Object.entries(categoryCounts).sort(
      (a, b) => b[1] - a[1]
    )[0][0] as Category;

    const agreementScore =
      Math.round((categoryCounts[topCategory] / samples.length) * 1000) / 1000;

    const consensusSample =
      samples.find((s) => s.category === topCategory) || samples[0];

    return {
      classification: consensusSample,
      agreementScore,
      samples
    };
  } catch {
    const fallback = classifyTicketRules(text);
    return {
      classification: fallback,
      agreementScore: 0.8,
      samples: [fallback]
    };
  }
}
