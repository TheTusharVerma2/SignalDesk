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

export type CalibrationSnapshot = {
  id: string;
  confidenceBucket: string;
  predictedAccuracy: string;
  actualAccuracy: string;
  sampleSize: number;
  computedAt: string;
};

export type CategoryDriftItem = {
  category: string;
  aiCount: number;
  humanCount: number;
};

export type EvaluationMetrics = {
  snapshots: CalibrationSnapshot[];
  totalReviewed: number;
  overallAccuracy: number;
  categoryDrift: CategoryDriftItem[];
};

const API_BASE = "http://localhost:3001";

export const api = {
  async listTickets(status?: string): Promise<{ tickets: Ticket[] }> {
    const url = new URL("/tickets", API_BASE);
    if (status) url.searchParams.set("status", status);
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch tickets");
    return res.json();
  },

  async getTicket(id: string): Promise<{ ticket: Ticket; decisions: Decision[] }> {
    const res = await fetch(`${API_BASE}/tickets/${id}`);
    if (!res.ok) throw new Error("Failed to fetch ticket");
    return res.json();
  },

  async submitCorrection(
    ticketId: string,
    payload: {
      decisionId: string;
      wasCategoryCorrect: boolean;
      wasResponseCorrect: boolean;
      correctedCategory?: string;
      correctedResponse?: string;
      correctedBy: string;
    }
  ) {
    const res = await fetch(`${API_BASE}/tickets/${ticketId}/correct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to save correction");
    return res.json();
  },

  async getEvalMetrics(): Promise<EvaluationMetrics> {
    const res = await fetch(`${API_BASE}/eval/metrics`);
    if (!res.ok) throw new Error("Failed to fetch evaluation metrics");
    return res.json();
  },

  async triggerCalibration(): Promise<{ snapshots: CalibrationSnapshot[]; ece: number; totalReviewed: number; overallAccuracy: number }> {
    const res = await fetch(`${API_BASE}/eval/calibrate`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to run calibration");
    return res.json();
  }
};
