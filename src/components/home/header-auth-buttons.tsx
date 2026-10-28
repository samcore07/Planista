"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};

function useHasAuthCookie(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => {
      if (typeof document === "undefined") return false;
      return document.cookie
        .split(";")
        .some((c) => {
          const trimmed = c.trim();
          return trimmed.startsWith("sb-") && trimmed.includes("-auth-token");
        });
    },
    () => false
  );
}

export function HeaderAuthButtons() {
  const isAuthenticated = useHasAuthCookie();

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button
            size="sm"
            className="gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Go to Dashboard
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
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
  );
}

export function CtaAuthButton() {
  const isAuthenticated = useHasAuthCookie();

  if (isAuthenticated) {
    return (
      <Link href="/dashboard">
        <Button
          variant="outline"
          size="lg"
          className="px-6 gap-2 border-primary/40 text-primary hover:bg-primary/5"
        >
          <LayoutDashboard className="h-4 w-4" />
          Go to Dashboard
        </Button>
      </Link>
    );
  }

  return (
    <Link href="/auth/login">
      <Button variant="outline" size="lg" className="px-6">
        Sign In to Workspace
      </Button>
    </Link>
  );
}
