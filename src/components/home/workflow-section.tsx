import { Badge } from "@/components/ui/badge";
import { WORKFLOW_STEPS } from "./landing-data";

export function WorkflowSection() {
  return (
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
          {WORKFLOW_STEPS.map((wf, idx) => {
            const Icon = wf.icon;
            return (
              <div
                key={idx}
                className="group relative flex flex-col md:flex-row items-start gap-6 p-6 sm:p-7 rounded-2xl border border-border/80 bg-card/90 hover:bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300"
              >
                {/* Visual, professional step indicator badge */}
                <div className="flex flex-col items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-br from-card via-secondary/70 to-secondary/30 shrink-0 border border-border/90 shadow-sm relative overflow-hidden group-hover:border-primary/50 group-hover:shadow-md group-hover:shadow-primary/5 transition-all duration-300">
                  {/* Top subtle glow bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent group-hover:via-primary transition-all duration-300" />
                  
                  {/* Micro phase label */}
                  <span className="text-[9px] font-mono tracking-widest uppercase font-semibold text-muted-foreground/80">
                    PHASE
                  </span>
                  {/* Stylized high-contrast numeral */}
                  <span className="font-mono text-xl sm:text-2xl font-black tracking-tight text-foreground dark:text-emerald-300 group-hover:text-primary transition-colors leading-none my-0.5">
                    {wf.step}
                  </span>
                  {/* Bottom indicator pip */}
                  <div className="flex items-center gap-1 mt-1">
                    <span className="h-1 w-3 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                  </div>
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

                  <div className="pt-2 flex items-center gap-2 text-xs font-medium text-foreground flex-wrap">
                    <span className="text-muted-foreground">Deliverable:</span>
                    <code className="px-2 py-0.5 rounded bg-secondary text-[11px] font-mono text-primary dark:text-emerald-300 font-medium">
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
  );
}
