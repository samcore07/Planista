export function LandingFooter() {
  return (
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
  );
}
