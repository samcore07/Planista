import { Badge } from "@/components/ui/badge";
import { PlayCircle } from "lucide-react";
import { TutorialVideo } from "./tutorial-video";

export function TutorialSection() {
  return (
    <section id="tutorial" className="py-16 md:py-24 border-t border-border/60 bg-gradient-to-b from-secondary/20 via-background to-secondary/10 relative overflow-hidden">
      {/* Decorative ambient backdrop glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/10 rounded-full blur-3xl opacity-50" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <Badge variant="outline" className="uppercase tracking-widest text-[10px] border-primary/30 text-primary gap-1.5 py-1 px-3">
            <PlayCircle className="h-3.5 w-3.5" />
            Product Walkthrough
          </Badge>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
            See Planista in Action
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Watch a comprehensive tutorial walkthrough covering natural language blueprint synthesis, live receipt OCR scanning, CPM critical path logistics, and one-click production export.
          </p>
        </div>

        {/* Video Frame & Chapter Highlights */}
        <div className="relative mx-auto max-w-4xl">
          <TutorialVideo />
        </div>
      </div>
    </section>
  );
}
