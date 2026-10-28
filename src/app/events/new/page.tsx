import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createEventAction } from "@/app/events/actions";

export const instant = false;

interface NewEventPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function NewEventContent({ searchParams }: NewEventPageProps) {
  const resolvedSearchParams = await searchParams;
  const errorMessage = typeof resolvedSearchParams.error === "string" ? resolvedSearchParams.error : null;

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>

          <Link href="/events/architect">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Use AI Event Architect
            </Button>
          </Link>
        </div>

        {errorMessage && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-serif text-xl sm:text-2xl">
              Create New Celebration
            </CardTitle>
            <CardDescription className="text-xs">
              Set up your event parameters. You can modify guest counts, dates, and budgets anytime.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createEventAction} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  placeholder="e.g. Sophia & Liam's Autumn Wedding"
                  minLength={2}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="eventType">Event Type *</Label>
                  <Input
                    id="eventType"
                    name="eventType"
                    required
                    placeholder="e.g. Wedding, Birthday, Gala, Conference"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="eventDate">Target Date</Label>
                  <Input
                    id="eventDate"
                    name="eventDate"
                    type="date"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location">Location / Venue</Label>
                <Input
                  id="location"
                  name="location"
                  placeholder="e.g. Napa Valley Vineyard, CA or Downtown Loft"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="guestCount">Guest Count</Label>
                  <Input
                    id="guestCount"
                    name="guestCount"
                    type="number"
                    min="0"
                    defaultValue="100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="totalBudget">Total Budget</Label>
                  <Input
                    id="totalBudget"
                    name="totalBudget"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue="25000"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    name="currency"
                    defaultValue="INR"
                    maxLength={3}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Event Vision & Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Share details regarding aesthetic, expectations, and any special priorities..."
                  rows={3}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-border">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" type="button">
                    Cancel
                  </Button>
                </Link>
                <Button size="sm" type="submit">
                  Create Event
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function NewEventPage(props: NewEventPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="space-y-2 text-center">
            <div className="h-8 w-8 rounded-md bg-primary mx-auto animate-pulse" />
            <p className="text-xs text-muted-foreground">Loading form...</p>
          </div>
        </div>
      }
    >
      <NewEventContent {...props} />
    </Suspense>
  );
}
