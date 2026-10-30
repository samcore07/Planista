import {
  Sparkles,
  Calendar,
  IndianRupee,
  Palette,
  ShieldAlert,
  FileDown,
  Receipt,
  Compass,
  Layers,
  Cpu,
  Lock,
  RefreshCw,
  Binary,
} from "lucide-react";

export const CAPABILITIES = [
  {
    icon: Sparkles,
    title: "AI Event Architect",
    desc: "Turn natural language descriptions into fully structured, editable event blueprints with validated timelines, budgets, and vendor needs.",
    badge: "Core Engine",
  },
  {
    icon: IndianRupee,
    title: "Live Budget Intelligence",
    desc: "Deterministic, decimal-safe financial calculations. Real-time planned vs. actual tracking, per-guest math, and variance warnings.",
    badge: "Financial Engine",
  },
  {
    icon: Calendar,
    title: "Adaptive Timeline & Checklist",
    desc: "Dynamic task schedules with dependency awareness. Material delay impact analysis and automated schedule proposals.",
    badge: "Scheduling",
  },
  {
    icon: Palette,
    title: "AI Theme Studio",
    desc: "Cohesive aesthetic concepts, color palettes, decor styling, floral guidance, and curated moodboard asset generation.",
    badge: "Visual Direction",
  },
  {
    icon: Compass,
    title: "Context-Aware Planning Copilot",
    desc: "A conversational copilot embedded in your event workspace. Analyzes event state to propose, preview, and safely apply changes.",
    badge: "Copilot",
  },
  {
    icon: ShieldAlert,
    title: "Event Risk Radar",
    desc: "Continuous explainable risk auditing. Surfaces budget overruns, dependency blockades, missing vendors, and vendor gaps.",
    badge: "Auditing",
  },
  {
    icon: FileDown,
    title: "One-Click Event Pack",
    desc: "Instant export of run sheets, vendor summaries, emergency contacts, budgets, and task checklists in PDF and CSV format.",
    badge: "Production Ready",
  },
  {
    icon: Receipt,
    title: "AI Quote & Receipt Scanner",
    desc: "OCR and document extraction for vendor invoices and receipts with category mapping and duplicate detection.",
    badge: "Automation",
  },
];

export const ARCHITECTURE_PILLARS = [
  {
    icon: Binary,
    title: "Deterministic Domain Services",
    tagline: "Zero LLM Financial Math",
    desc: "All financial sums, currency rounding, category variances, per-guest costs, and timeline graph traversals run in pure TypeScript domain services. The AI never touches raw ledger arithmetic.",
    bullets: [
      "Decimal-safe 2-digit currency precision",
      "Directed Acyclic Graph (DAG) cycle detection",
      "Deterministic explainable risk evaluation rules",
    ],
  },
  {
    icon: Lock,
    title: "PostgreSQL Row-Level Security",
    tagline: "Engine-Level Tenant Isolation",
    desc: "Every database table enforces PostgreSQL Row-Level Security (RLS) policies. Access is strictly verified using authenticated server sessions and foreign key cascades, preventing cross-tenant leakage.",
    bullets: [
      "auth.uid() = user_id enforcement on all writes",
      "Role-based collaborator authorization matrix",
      "Foreign key cascade deletion with referential integrity",
    ],
  },
  {
    icon: Cpu,
    title: "Structured AI Abstraction",
    tagline: "Zod Schema Guardrails & Honest Fallbacks",
    desc: "Unified AI provider architecture supporting Google Gemini and OpenAI. LLM responses are parsed strictly through Zod schemas with automatic retry mechanisms on malformed outputs.",
    bullets: [
      "Strict Zod schema parsing with retry loop",
      "Explicit assumptions & uncertainties disclosures",
      "Honest fallback rendering when API keys are absent",
    ],
  },
  {
    icon: RefreshCw,
    title: "Shared State & Propagation Layer",
    tagline: "Event Orchestrator & Idempotency",
    desc: "State mutations (budget adjustments, task delays, OCR imports) trigger the centralized Event Orchestrator. Risk signals, timeline impacts, and metrics recompute in a single transaction pipeline.",
    bullets: [
      "Deterministic cross-entity recalculation",
      "Idempotency guard on mutations",
      "Single-path Next.js revalidation",
    ],
  },
];

export const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Natural Language Blueprint Synthesis",
    subtitle: "AI Architect transforms event briefs into structured data",
    desc: "Provide event parameters: type, guest count, target budget, date, and vision notes. Planista produces a fully budgeted, phased timeline blueprint with explicit category percentages and contingency items.",
    deliverable: "Structured draft event with budget categories, initial tasks, and risk profile",
    icon: Sparkles,
    color: "text-amber-500",
  },
  {
    step: "02",
    title: "Interactive Preview & Staging Approval",
    subtitle: "Human-in-the-loop validation before database commit",
    desc: "Every AI-synthesized blueprint lands in an interactive staging screen. Review, adjust category allocations, toggle optional phases, and edit line items. Nothing enters your persistent database without explicit user acceptance.",
    deliverable: "Atomic batch commit to PostgreSQL via authenticated DAL services",
    icon: Layers,
    color: "text-blue-500",
  },
  {
    step: "03",
    title: "Live Operations & Real-Time Tracking",
    subtitle: "Connected ledger, dynamic Gantt, and vendor quote OCR",
    desc: "Upload vendor invoices or receipts through the OCR scanner to automatically map line items and flag variance against allocated budgets. Reschedule milestones with automatic downstream dependency shifting.",
    deliverable: "Real-time budget health, variance tracking, and risk radar updates",
    icon: RefreshCw,
    color: "text-emerald-500",
  },
  {
    step: "04",
    title: "Copilot Refinement & Event Pack Export",
    subtitle: "Conversational refinement and instant production export",
    desc: "Ask the embedded planning copilot to simulate budget cuts or reschedule milestones. Changes follow a strict intent → validate → preview → approve pipeline. When ready, export a consolidated, print-friendly PDF/HTML Event Pack plus modular CSV spreadsheets.",
    deliverable: "Consolidated printable event dossier, run sheets, and vendor/budget CSVs",
    icon: FileDown,
    color: "text-rose-500",
  },
];
