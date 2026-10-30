import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Cpu, Workflow, Binary, Database } from "lucide-react";
import { ARCHITECTURE_PILLARS } from "./landing-data";

export function ArchitectureSection() {
  return (
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
          {ARCHITECTURE_PILLARS.map((pillar, idx) => {
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
  );
}
