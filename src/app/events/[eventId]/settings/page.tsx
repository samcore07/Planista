import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Archive, Trash2, ArrowLeft, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { EventsDAL } from "@/lib/dal/events.dal";
import {
  updateEventAction,
  archiveEventAction,
  restoreEventAction,
  deleteEventAction,
} from "@/app/events/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const instant = false;

interface SettingsPageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function SettingsContent({ params, searchParams }: SettingsPageProps) {
  const { eventId } = await params;
  const resolvedSearchParams = await searchParams;
  const event = await EventsDAL.getEventById(eventId);
  if (!event) notFound();

  const formattedDate = event.event_date
    ? new Date(event.event_date).toISOString().split("T")[0]
    : "";

  const errorMessage = typeof resolvedSearchParams.error === "string" ? resolvedSearchParams.error : null;
  const isSaved = resolvedSearchParams.saved === "true";
  const isRestored = resolvedSearchParams.restored === "true";

  const updateActionWithId = updateEventAction.bind(null, eventId);
  const archiveActionWithId = archiveEventAction.bind(null, eventId);
  const restoreActionWithId = restoreEventAction.bind(null, eventId);
  const deleteActionWithId = deleteEventAction.bind(null, eventId);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <Link
          href={`/events/${eventId}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Event Overview
        </Link>
        <h1 className="font-serif text-2xl font-semibold text-foreground">
          Event Settings & Configuration
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Update event parameters, manage status, or archive this workspace
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isSaved && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>Event settings successfully updated.</span>
        </div>
      )}

      {isRestored && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>Event successfully restored to active status.</span>
        </div>
      )}

      {/* Main Settings Form */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">General Parameters</CardTitle>
            <Badge variant={event.status === "cancelled" ? "destructive" : "secondary"} className="capitalize">
              {event.status === "cancelled" ? "Archived" : event.status}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Modifying budget or guest count will automatically propagate across financial and risk computations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateActionWithId} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                name="title"
                defaultValue={event.title}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="eventType">Event Type</Label>
                <Input
                  id="eventType"
                  name="eventType"
                  defaultValue={event.event_type}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="eventDate">Target Date</Label>
                <Input
                  id="eventDate"
                  name="eventDate"
                  type="date"
                  defaultValue={formattedDate}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Location / Venue</Label>
              <Input
                id="location"
                name="location"
                defaultValue={event.location || ""}
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
                  defaultValue={event.guest_count}
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
                  defaultValue={Number(event.total_budget)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  name="currency"
                  defaultValue={event.currency}
                  maxLength={3}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Event Vision & Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={event.description || ""}
                rows={3}
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button size="sm" type="submit">
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone: Archive & Delete */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-destructive">
            Danger Zone
          </CardTitle>
          <CardDescription className="text-xs">
            Archive this celebration to hide it from active workspace queries, or permanently delete all associated tasks, budget, and documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div>
              <h4 className="text-xs font-semibold text-foreground">
                {event.status === "cancelled" ? "Restore Event" : "Archive Event"}
              </h4>
              <p className="text-[11px] text-muted-foreground">
                {event.status === "cancelled"
                  ? "Re-activate this event in your primary workspace dashboard."
                  : "Remove from active radars without deleting historical records."}
              </p>
            </div>
            {event.status === "cancelled" ? (
              <form action={restoreActionWithId}>
                <Button variant="outline" size="sm" type="submit" className="gap-1.5 text-xs w-full sm:w-auto">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Restore to Active
                </Button>
              </form>
            ) : (
              <form action={archiveActionWithId}>
                <Button variant="outline" size="sm" type="submit" className="gap-1.5 text-xs w-full sm:w-auto">
                  <Archive className="h-3.5 w-3.5" />
                  Archive Event
                </Button>
              </form>
            )}
          </div>

          <div className="border-t border-border pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-destructive">
                Permanently Delete Event
              </h4>
              <p className="text-[11px] text-muted-foreground">
                Irreversible. Deletes all linked budget items, tasks, risks, and uploaded assets.
              </p>
            </div>
            <form action={deleteActionWithId}>
              <Button
                variant="destructive"
                size="sm"
                type="submit"
                className="gap-1.5 text-xs w-full sm:w-auto"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Permanently
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EventSettingsPage(props: SettingsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-secondary rounded" />
          <div className="h-64 bg-card rounded border border-border" />
        </div>
      }
    >
      <SettingsContent {...props} />
    </Suspense>
  );
}
