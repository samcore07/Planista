"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Mail, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { requestPasswordReset } from "@/app/auth/actions";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await requestPasswordReset(formData);

    if (!result.success) {
      setError(result.error || "Failed to request password reset.");
    } else {
      setMessage(result.message || "Password recovery email sent.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold text-xl shadow-sm">
              P
            </div>
            <span className="font-serif text-2xl font-semibold tracking-tight text-foreground">
              Planista
            </span>
          </Link>
          <h1 className="text-xl font-medium tracking-tight text-foreground">
            Password Recovery
          </h1>
          <p className="text-xs text-muted-foreground">
            Enter your email to receive recovery instructions
          </p>
        </div>

        <Card className="border-border/80 shadow-md">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-base font-semibold">Reset Password</CardTitle>
            <CardDescription className="text-xs">
              We will send you a secure link to update your password
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2.5 text-xs text-destructive">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="rounded-md bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 p-3 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-medium text-foreground flex items-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  Email address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@example.com"
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full gap-2 mt-2" disabled={loading}>
                {loading ? "Sending link..." : "Send Recovery Link"}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center border-t border-border pt-4 text-xs text-muted-foreground">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
