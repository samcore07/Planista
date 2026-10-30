import { ShowcaseNav } from "@/components/home/showcase-nav";
import { HeaderAuthButtons } from "@/components/home/header-auth-buttons";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { HeroSection } from "@/components/home/hero-section";
import { FeaturesSection } from "@/components/home/features-section";
import { ArchitectureSection } from "@/components/home/architecture-section";
import { WorkflowSection } from "@/components/home/workflow-section";
import { TutorialSection } from "@/components/home/tutorial-section";
import { CtaSection } from "@/components/home/cta-section";
import { LandingFooter } from "@/components/home/landing-footer";

export default function Home() {
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

          <ShowcaseNav />

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <HeaderAuthButtons />
          </div>
        </div>
      </header>

      {/* Main Content Sections */}
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <HeroSection />
        <FeaturesSection />
        <ArchitectureSection />
        <WorkflowSection />
        <TutorialSection />
        <CtaSection />
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}
