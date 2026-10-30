import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CtaAuthButton } from "./header-auth-buttons";

export function CtaSection() {
  return (
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
          <CtaAuthButton />
        </div>
      </div>
    </section>
  );
}
