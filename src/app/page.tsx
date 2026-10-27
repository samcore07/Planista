import Link from "next/link";
import {
  Sparkles,
  Calendar,
  DollarSign,
  CheckCircle2,
  Palette,
  ShieldAlert,
  FileDown,
  Receipt,
  ArrowRight,
  Compass,
  Layers,
  Cpu,
  Database,
  Lock,
  RefreshCw,
  Binary,
  Workflow,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Home() {
  const capabilities = [
    {
      icon: Sparkles,
      title: "AI Event Architect",
      desc: "Turn natural language descriptions into fully structured, editable event blueprints with validated timelines, budgets, and vendor needs.",
      badge: "Core Engine",
    },
    {
      icon: DollarSign,
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

  const architecturePillars = [
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
      desc: "A central event recalculation orchestrator coordinates budget recomputations, task dependency cascades, and risk synchronizations across tables with duplicate-submit protection.",
      bullets: [
        "EventOrchestratorService unified sync pipeline",
        "In-memory & DB duplicate submit TTL guards",
        "Next.js App Router cache revalidation on mutation",
      ],
    },
  ];

  const workflowSteps = [
    {
      step: "01",
      title: "Natural Language Intake & AI Blueprinting",
      subtitle: "From vision to structured architecture",
      desc: "Input your event concept in plain text: event type, guest target, date, location, aesthetic preferences, and cultural or dietary constraints. The AI Architect synthesizes a comprehensive blueprint covering budget allocations, milestone checklists, vendor scopes, aesthetic directions, and risk safeguards.",
      deliverable: "Zod-validated EventBlueprint schema with explicit assumptions & uncertainties",
      icon: Sparkles,
      color: "text-amber-500",
    },
    {
      step: "02",
      title: "Selective Persistence & Workspace Scaffolding",
      subtitle: "The planner retains complete editorial control",
      desc: "Review the generated blueprint section-by-section. Inspect suggested categories, timeline phases, and vendor scopes. Selectively accept only the sections you want persisted into your isolated workspace database.",
      deliverable: "Persisted event entity, budget categories, initial tasks, and theme records in PostgreSQL",
      icon: CheckCircle2,
      color: "text-emerald-500",
    },
    {
      step: "03",
      title: "Live Budget Ledger & Document Scanner",
      subtitle: "Real expenses, discrepancy warnings, and quote OCR",
      desc: "Upload vendor quotes and receipts in PDF or image format. The scanner extracts line items, compares amounts against category budget allocations, and highlights discrepancies or possible duplicates before you confirm.",
      deliverable: "Verified expense ledger, payment schedule tracking, and deposit balance alerts",
      icon: DollarSign,
      color: "text-blue-500",
    },
    {
      step: "04",
      title: "Adaptive Timeline & Event Risk Radar",
      subtitle: "Dependency-aware schedules & continuous auditing",
      desc: "Tasks are modeled as a dependency graph. If a critical prerequisite task slips, the timeline engine calculates downstream impacts and proposes revised schedules. Simultaneously, the Risk Radar scans for budget overruns, missing venue vendors, and tight deadlines.",
      deliverable: "Automated schedule delay shift proposals and factual risk mitigation matrices",
      icon: GitBranch,
      color: "text-purple-500",
    },
    {
      step: "05",
      title: "Planning Copilot & One-Click Event Pack",
      subtitle: "Conversational refinement and instant production export",
      desc: "Ask the embedded planning copilot to simulate budget cuts or reschedule milestones. Changes follow a strict intent → validate → preview → approve pipeline. When ready, export a consolidated, print-friendly PDF/HTML Event Pack plus modular CSV spreadsheets.",
      deliverable: "Consolidated printable event dossier, run sheets, and vendor/budget CSVs",
      icon: FileDown,
      color: "text-rose-500",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-accent selection:text-accent-foreground">
      {/* Header / Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold text-lg shadow-sm">
              P
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl font-semibold tracking-tight text-foreground">
                Planista
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground -mt-1 font-medium">
                Intelligent Event Architecture
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#architecture" className="hover:text-foreground transition-colors">
              Architecture
            </a>
            <a href="#workflow" className="hover:text-foreground transition-colors">
              Workflow
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm" className="gap-1.5 shadow-sm">
                Get Started
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto">
            <Badge variant="outline" className="px-3 py-1 gap-1.5 border-border/80 bg-secondary/40 text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Core Production Architecture Ready
            </Badge>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-foreground text-balance">
              Where event vision meets <span className="italic font-medium text-primary">mathematical rigor</span>.
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl text-balance">
              Planista transforms high-level event concepts into actionable blueprints.
              Every AI recommendation connects to live budget tables, verified tasks, and dependency-aware schedules.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link href="/events/new">
                <Button size="lg" className="gap-2 shadow-md px-7">
                  Architect an Event
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="lg" className="px-6">
                  Explore Workspace
                </Button>
              </Link>
            </div>
          </div>

          {/* Interactive Preview Surface */}
          <div className="mt-14 sm:mt-18 rounded-xl border border-border bg-card p-6 shadow-sm max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-border gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                  Active Blueprint Preview
                </span>
                <h3 className="text-lg font-serif font-semibold text-foreground mt-0.5">
                  Verdant Manor Wedding & Reception
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Budget Healthy
                </Badge>
                <Badge variant="outline">180 Guests</Badge>
                <Badge variant="outline">Oct 2026</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              <div className="rounded-lg bg-secondary/50 p-4 border border-border/60">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Planned Budget</span>
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-semibold tracking-tight text-foreground">
                  $45,000.00
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Allocated across 8 core categories
                </p>
              </div>

              <div className="rounded-lg bg-secondary/50 p-4 border border-border/60">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Cost Per Guest</span>
                  <Compass className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-semibold tracking-tight text-foreground">
                  $250.00
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Dynamic calculation based on guest count
                </p>
              </div>

              <div className="rounded-lg bg-secondary/50 p-4 border border-border/60">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Critical Checklist</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-semibold tracking-tight text-foreground">
                  14 / 22 Tasks
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  All critical dependencies on track
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Capabilities Grid */}
        <section id="features" className="py-16 md:py-24 border-t border-border/60 bg-secondary/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <Badge variant="outline" className="uppercase tracking-widest text-[10px]">
                Built for Precision
              </Badge>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
                Eight Pillars of Event Orchestration
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Engineered to replace scattered spreadsheets and superficial chatbots with verified data models.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {capabilities.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <Card key={idx} className="border-border/80 bg-card hover:border-primary/40 transition-colors shadow-sm">
                    <CardHeader className="space-y-2 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-md bg-secondary text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {item.badge}
                        </Badge>
                      </div>
                      <CardTitle className="text-base font-semibold">{item.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-xs leading-relaxed text-muted-foreground">
                        {item.desc}
                      </CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* System Architecture Section */}
        <section id="architecture" className="py-16 md:py-24 border-t border-border/60 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
              <Badge variant="outline" className="uppercase tracking-widest text-[10px] border-primary/30 text-primary">
                Technical Foundation
              </Badge>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
                Deterministic System Architecture
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Planista pairs state-of-the-art LLMs for intake and visual styling with strictly deterministic TypeScript domain engines and PostgreSQL row-level security.
              </p>
            </div>

            {/* Architecture Pillars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              {architecturePillars.map((pillar, idx) => {
                const Icon = pillar.icon;
                return (
                  <Card key={idx} className="border-border/80 bg-card hover:shadow-sm transition-all">
                    <CardHeader className="space-y-2 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold">{pillar.title}</CardTitle>
                          <p className="text-xs font-medium text-primary mt-0.5">{pillar.tagline}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {pillar.desc}
                      </p>
                      <div className="rounded-lg bg-secondary/40 p-3.5 border border-border/60 space-y-2">
                        {pillar.bullets.map((bullet, bIdx) => (
                          <div key={bIdx} className="flex items-center gap-2 text-xs text-foreground font-medium">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            <span>{bullet}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Architectural Data Pipeline Matrix */}
            <Card className="border-border/80 bg-gradient-to-br from-card via-card to-secondary/30 overflow-hidden shadow-sm">
              <CardHeader className="border-b border-border/60 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers className="h-4 w-4 text-primary" />
                      End-to-End Orchestration Pipeline
                    </CardTitle>
                    <CardDescription className="text-xs">
                      How requests traverse client interfaces, server actions, domain rules, and database isolation.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px] w-fit">
                    Full Stack Isolation
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg border border-border bg-background/80 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
                      <Cpu className="h-3.5 w-3.5 text-primary" />
                      1. Presentation Layer
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Next.js 16 Partial Prerendering (PPR) with React 19 Server Components, Suspense streaming boundaries, and optimistic UI transitions.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border border-border bg-background/80 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
                      <Workflow className="h-3.5 w-3.5 text-blue-500" />
                      2. Server Action & DAL
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Server-only Data Access Layer (DAL) verifying session identity via getAuthenticatedUser, validating all payloads via Zod, and checking rate/idempotency limits.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border border-border bg-background/80 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
                      <Binary className="h-3.5 w-3.5 text-emerald-500" />
                      3. Deterministic Services
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Pure TypeScript domain engines: BudgetService (money math), TimelineService (cycle-free DAGs), and RiskService (factual heuristic audits).
                    </p>
                  </div>

                  <div className="p-4 rounded-lg border border-border bg-background/80 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
                      <Database className="h-3.5 w-3.5 text-purple-500" />
                      4. PostgreSQL & Storage
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      PostgreSQL with RLS policies enforcing tenant boundaries. Foreign keys cascade automatically, and documents are stored with verified checksums.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Event Planning Workflow Section */}
        <section id="workflow" className="py-16 md:py-24 border-t border-border/60 bg-secondary/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
              <Badge variant="outline" className="uppercase tracking-widest text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                Verified Lifecycle
              </Badge>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
                The Event Orchestration Workflow
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                From initial natural language intake to one-click production export, every phase is grounded in verifiable data with human approval gates.
              </p>
            </div>

            {/* Workflow Steps Vertical Chain */}
            <div className="space-y-6 max-w-4xl mx-auto">
              {workflowSteps.map((wf, idx) => {
                const Icon = wf.icon;
                return (
                  <div
                    key={idx}
                    className="relative flex flex-col md:flex-row items-start gap-6 p-6 rounded-xl border border-border/80 bg-card hover:border-primary/40 transition-all shadow-sm"
                  >
                    {/* Step indicator badge */}
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-secondary shrink-0 font-serif font-bold text-lg text-primary border border-border/80">
                      {wf.step}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${wf.color}`} />
                          {wf.title}
                        </h3>
                        <span className="text-xs font-medium text-muted-foreground">
                          {wf.subtitle}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {wf.desc}
                      </p>

                      <div className="pt-2 flex items-center gap-2 text-xs font-medium text-foreground">
                        <span className="text-muted-foreground">Deliverable:</span>
                        <code className="px-2 py-0.5 rounded bg-secondary text-[11px] font-mono text-primary">
                          {wf.deliverable}
                        </code>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="py-16 md:py-20 border-t border-border/60 bg-gradient-to-b from-card to-background text-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
              Ready to orchestrate your next event with mathematical confidence?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Experience the convergence of structured AI blueprints, live budget intelligence, and adaptive timelines.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link href="/events/new">
                <Button size="lg" className="gap-2 shadow-md px-7">
                  Create an Event Now
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" size="lg" className="px-6">
                  Sign In to Workspace
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-serif font-semibold text-foreground text-sm">Planista</span>
            <span>— Precision Event Architecture Platform</span>
          </div>
          <div>
            <span>TypeScript • Next.js App Router • Tailwind CSS • Supabase</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
