import type { Classification } from "./classifier.js";

// Creates a support-response draft from the ticket's category and urgency.
// Later, this function can call an LLM and retrieve relevant KB articles.
export function draftResponse(
  ticketText: string,
  classification: Classification
): string {
  const urgencyMessage =
    classification.urgency === "critical"
      ? "We have marked this as critical and are investigating immediately."
      : classification.urgency === "high"
        ? "We have marked this as high priority and will investigate promptly."
        : "Our support team will review it and follow up soon.";

  const categoryMessage = {
    billing:
      "We’re sorry for the billing issue. We’ll review the account and payment details.",
    account:
      "We’re sorry you’re unable to access your account. We’ll investigate the login issue.",
    technical:
      "We’re sorry you’re experiencing a technical issue. We’ll investigate what went wrong.",
    bug:
      "Thanks for reporting this possible bug. We’ll investigate the behavior.",
    feature_request:
      "Thanks for sharing your feature request. We’ll pass it to the product team.",
    other:
      "Thanks for contacting support. We’ll review your request."
  }[classification.category];

  // Keep the original text available for a future LLM/RAG responder.
  void ticketText;

  return [
    "Hi,",
    "",
    categoryMessage,
    urgencyMessage,
    "",
    "Best,",
    "SignalDesk Support"
  ].join("\n");
}
