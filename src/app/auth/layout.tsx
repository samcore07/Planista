import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background relative selection:bg-accent selection:text-accent-foreground">
      {/* Top Floating Navigation Header */}
      <header className="absolute top-0 left-0 right-0 z-20 w-full p-4 sm:p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-all duration-200 group px-3.5 py-1.5 rounded-full bg-card/80 backdrop-blur-md border border-border/80 shadow-xs hover:border-primary/40 hover:bg-card"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-1 text-primary" />
            <span>Back to Main Page</span>
          </Link>
          <div className="rounded-full bg-card/80 backdrop-blur-md border border-border/80 shadow-xs px-1 py-0.5">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Auth Content */}
      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col outline-none">
        {children}
      </main>
    </div>
  );
}
