# ⚡ SignalDesk: Calibrated AI Support Triage Platform

**SignalDesk** is an enterprise AI support triage platform designed to safely automate customer support. By combining multi-prompt consensus classification, risk-aware confidence scoring, human-in-the-loop feedback loops, and statistical calibration metrics (Reliability Diagrams & Expected Calibration Error), SignalDesk enables companies to automate standard support requests while eliminating the risk of AI hallucinations on sensitive tickets.

---

## 📌 Problem Statement & Solution Architecture

### The Problem
Deploying un-calibrated AI agents directly to customers in customer support is dangerous:
1. **LLM Hallucinations & Errors**: Un-calibrated LLMs can misclassify critical tickets or draft incorrect solutions.
2. **Risky Edge Cases**: Sensitive tickets (e.g. security breaches, data loss, legal threats) must **never** be answered automatically by AI.
3. **Lack of Trust & Visibility**: Support managers lack mathematical proof of how accurate their AI models are across different confidence buckets.

### The SignalDesk Solution
1. **Calibrated Auto-Routing**: Only tickets scoring above an empirical confidence threshold ($\ge 75\%$) are automatically sent (`auto_sent`). Low-confidence or sensitive tickets are routed to human agents (`escalated`).
2. **Continuous Human-in-the-Loop Feedback**: Support agents review escalated tickets and submit ground-truth corrections.
3. **Statistical Confidence Calibration**: Computes Expected Calibration Error (ECE) and plots Reliability Diagrams comparing predicted confidence vs. actual correctness across confidence buckets ($0.0-0.2$ to $0.8-1.0$).

---

## 📁 Repository Directory Structure

```
support-triage/
├── apps/
│   ├── api/                           # Express HTTP API & BullMQ Background Worker
│   │   ├── drizzle/                   # PostgreSQL migration files
│   │   ├── src/
│   │   │   ├── agents/
│   │   │   │   ├── classifier.ts      # Multi-sample LLM consensus classifier & keyword rules
│   │   │   │   ├── confidenceScorer.ts# Dynamic confidence scorer (Agreement, Similarity, Critique)
│   │   │   │   ├── pipeline.ts        # Core processing pipeline & auto-routing threshold
│   │   │   │   └── responder.ts       # Category/urgency-aware response drafter
│   │   │   ├── db/
│   │   │   │   ├── client.ts          # Drizzle PostgreSQL connection client
│   │   │   │   └── schema.ts          # Drizzle ORM PostgreSQL schema definitions
│   │   │   ├── eval/
│   │   │   │   └── calibration.ts     # ECE calculation engine & category drift tracker
│   │   │   ├── queue/
│   │   │   │   ├── ticketQueue.ts     # BullMQ Redis ticket queue producer
│   │   │   │   └── worker.ts          # BullMQ background queue consumer worker
│   │   │   ├── routes/
│   │   │   │   ├── eval.ts            # /eval/calibrate and /eval/metrics endpoints
│   │   │   │   ├── tickets.ts         # GET /tickets, GET /tickets/:id, POST /tickets/:id/correct
│   │   │   │   └── webhooks.ts        # POST /webhooks/ticket-created
│   │   │   └── index.ts               # Express API entrypoint
│   │   ├── drizzle.config.ts          # Drizzle Kit configuration
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                           # Vite + React Frontend Dashboard
│       ├── src/
│       │   ├── pages/
│       │   │   ├── EvaluationDashboard.tsx # Calibration chart, ECE stats & category drift UI
│       │   │   ├── TicketDetail.tsx   # AI decision detail & human correction feedback form
│       │   │   └── TicketQueue.tsx    # Live ticket queue with status filter
│       │   ├── App.tsx                # Routing & header navigation bar
│       │   ├── api.ts                 # Frontend API client
│       │   ├── main.tsx
│       │   └── styles.css             # Glassmorphism dark-mode styles
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
│
├── docker-compose.yml                 # Local PostgreSQL 16 (Port 5433) & Redis 7 (Port 6379)
├── .gitignore
└── README.md
```

---

## 🗄️ Database Schemas (Drizzle ORM & PostgreSQL)

SignalDesk uses 4 primary tables in PostgreSQL:

### 1. `tickets` (Source Customer Requests)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Randomly generated primary key |
| `source` | `text` | Webhook origin (`email`, `zendesk`, `intercom`) |
| `raw_text` | `text` | Original customer message |
| `created_at` | `timestamp` | Ticket arrival timestamp |
| `status` | `text` | Current status (`pending`, `auto_sent`, `escalated`, `resolved`) |

### 2. `agent_decisions` (Immutable Audit Log)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Unique decision ID |
| `ticket_id` | `uuid` (FK) | Reference to `tickets.id` |
| `category` | `text` | AI predicted category (`billing`, `account`, `technical`, `bug`, `feature_request`, `other`) |
| `urgency` | `text` | AI predicted urgency (`low`, `medium`, `high`, `critical`) |
| `draft_response` | `text` | Generated response text |
| `confidence` | `numeric(4,3)` | Calculated confidence score ($0.000$ to $1.000$) |
| `action_taken` | `text` | Action chosen (`auto_sent` vs. `escalated`) |
| `model_version` | `text` | Identifier label for classifier version |

### 3. `human_corrections` (Ground-Truth Labels)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Unique correction ID |
| `decision_id` | `uuid` (FK) | Reference to `agent_decisions.id` |
| `was_category_correct` | `boolean` | Human flag if category was correct |
| `was_response_correct` | `boolean` | Human flag if draft response was correct |
| `corrected_category` | `text` | Ground truth category if AI was wrong |
| `corrected_response` | `text` | Ground truth response if AI was wrong |
| `corrected_by` | `text` | Name/ID of the support agent reviewer |

### 4. `calibration_snapshots` (Historical Quality Metrics)
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `uuid` (PK) | Snapshot row ID |
| `confidence_bucket` | `text` | Confidence bucket label (`0.0-0.2`, `0.2-0.4`, `0.4-0.6`, `0.6-0.8`, `0.8-1.0`) |
| `predicted_accuracy` | `numeric(4,3)` | Mean predicted confidence in bucket |
| `actual_accuracy` | `numeric(4,3)` | Fraction of correct decisions in bucket |
| `sample_size` | `integer` | Count of human-reviewed decisions in bucket |
| `computed_at` | `timestamp` | Snapshot calculation timestamp |

---

## 🧮 Confidence Scoring Formula

Confidence is calculated dynamically in `confidenceScorer.ts`:

$$\text{Confidence} = (0.4 \times \text{Agreement}) + (0.3 \times \text{Similarity}) + (0.3 \times \text{Critique})$$

1. **Agreement Signal ($40\%$)**: Fraction of multi-sample LLM completions agreeing on the top category.
2. **Similarity Signal ($30\%$)**: Historical human-correction accuracy rate for the ticket's category.
3. **Critique Signal ($30\%$)**:
   - **Security Risk Penalty**: Security breaches/data loss reduce critique to `0.35` (preventing auto-send).
   - **Short Ticket Penalty**: Vague tickets (< 4 words) reduce critique to `0.50`.
   - **Category Alignment**: Response drafts containing category keywords receive `0.85`.
   - **Urgency Penalty**: Critical urgency deducts `0.20`; high urgency deducts `0.10`.

---

## 💻 Local Setup & Execution Guide

### 1. Prerequisites
- **Node.js**: v18 or higher
- **Docker Desktop**: Running locally

### 2. Infrastructure Setup (PostgreSQL & Redis)
In the project root directory:
```bash
docker compose up -d
```
*(Spins up PostgreSQL on port `5433` and Redis on port `6379`)*

### 3. Install Dependencies & Run Database Migrations

**API Server:**
```bash
cd apps/api
npm install
npm run db:migrate
```

**Web Dashboard:**
```bash
cd ../web
npm install
```

### 4. Running the Project (3 Terminal Windows)

* **Terminal 1 — Express API Server (Port 3001):**
  ```bash
  cd apps/api
  npm run dev
  ```

* **Terminal 2 — BullMQ Queue Worker:**
  ```bash
  cd apps/api
  npm run worker
  ```

* **Terminal 3 — React Dashboard (Port 5173):**
  ```bash
  cd apps/web
  npm run dev
  ```

---

## 🧪 Testing API Commands

### 1. Ingest Webhook Ticket
```bash
curl -X POST http://localhost:3001/webhooks/ticket-created \
  -H "Content-Type: application/json" \
  -d '{
    "source": "email",
    "rawText": "Please send me an official invoice and payment receipt for my recent billing subscription."
  }'
```

### 2. Submit Human Review Correction
```bash
curl -X POST http://localhost:3001/tickets/<TICKET_ID>/correct \
  -H "Content-Type: application/json" \
  -d '{
    "decisionId": "<DECISION_ID>",
    "wasCategoryCorrect": true,
    "wasResponseCorrect": true,
    "correctedBy": "Tushar"
  }'
```

### 3. Run Calibration Snapshot Calculation
```bash
curl -X POST http://localhost:3001/eval/calibrate
```

### 4. Fetch Evaluation Metrics & Category Drift
```bash
curl http://localhost:3001/eval/metrics
```

---

## 🖥️ Dashboards

- **Ticket Queue**: `http://localhost:5173/`
- **Evaluation & Calibration**: `http://localhost:5173/eval`
