import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { ArchitectIntakeForm } from "@/components/architect/architect-intake-form";

export const instant = false;

async function ArchitectPageContent() {
  await connection();
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/auth/login?redirectTo=/events/architect");
  }

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 outline-none">
      <ArchitectIntakeForm />
    </main>
  );
}

export default function ArchitectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="space-y-2 text-center">
            <div className="h-8 w-8 rounded-md bg-primary mx-auto animate-pulse" />
            <p className="text-xs text-muted-foreground">Loading architect...</p>
          </div>
        </div>
      }
    >
      <ArchitectPageContent />
    </Suspense>
  );
}
