// Loads values from .env into process.env before the server starts.
import "dotenv/config";

import cors from "cors";
import express from "express";
import ticketRoutes from "./routes/tickets.js";
import webhookRoutes from "./routes/webhooks.js";

const app = express();

// Lets the React dashboard call this API from a different local port.
app.use(cors());

// Parses JSON request bodies, such as future webhook payloads.
app.use(express.json());

// A lightweight endpoint for checking that the server is running.
// It does not access the database or perform any side effects.
app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    service: "support-triage-api"
  });
});

// Mounts webhook routes: /ticket-created becomes /webhooks/ticket-created.
app.use("/webhooks", webhookRoutes);

// Mounts ticket-reading routes: GET /tickets and GET /tickets/:id.
app.use("/tickets", ticketRoutes);

// Returns JSON errors for invalid requests instead of Express's HTML error page.
app.use(
  (
    error: Error & { issues?: unknown },
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(error);

    const isValidationError = "issues" in error;

    response.status(isValidationError ? 400 : 500).json({
      error: isValidationError ? "Invalid request payload" : "Internal server error",
      details: isValidationError ? error.issues : undefined
    });
  }
);

// Defaults to 3001 locally, but deployment environments can override it.
const port = Number(process.env.PORT ?? 3001);

app.listen(port, () => {
  console.log(`Support Triage API listening at http://localhost:${port}`);
});
