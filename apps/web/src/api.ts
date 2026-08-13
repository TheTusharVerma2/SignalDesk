// Uses a deployed API URL when configured, otherwise the local API.
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export type Ticket = {
  id: string;
  source: string;
  rawText: string;
  createdAt: string;
  status: string;
};

export type Decision = {
  id: string;
  ticketId: string;
  category: string;
  urgency: string;
  draftResponse: string;
  confidence: string;
  actionTaken: string;
  modelVersion: string;
  createdAt: string;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options
  });

  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export const api = {
  listTickets: (status?: string) =>
    request<{ tickets: Ticket[] }>(
      `/tickets${status ? `?status=${encodeURIComponent(status)}` : ""}`
    ),
  getTicket: (ticketId: string) =>
    request<{ ticket: Ticket; decisions: Decision[] }>(`/tickets/${ticketId}`),
  submitCorrection: (
    ticketId: string,
    payload: {
      decisionId: string;
      wasCategoryCorrect: boolean;
      wasResponseCorrect: boolean;
      correctedCategory?: string;
      correctedResponse?: string;
      correctedBy: string;
    }
  ) =>
    request(`/tickets/${ticketId}/correct`, {
      method: "POST",
      body: JSON.stringify(payload)
    })
};
