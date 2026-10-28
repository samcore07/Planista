"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowLeft,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { BlueprintGenerationInput } from "@/lib/ai/provider";
import { EventBlueprint } from "@/types/blueprint.types";
import { generateBlueprintAction } from "@/app/events/architect/actions";
import { BlueprintPreview } from "./blueprint-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function ArchitectIntakeForm() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [blueprint, setBlueprint] = React.useState<EventBlueprint | null>(null);
  const [activeInput, setActiveInput] = React.useState<BlueprintGenerationInput | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const input: BlueprintGenerationInput = {
      eventType: (formData.get("eventType") as string) || "Celebration",
      title: (formData.get("title") as string) || undefined,
      eventDate: (formData.get("eventDate") as string) || undefined,
      location: (formData.get("location") as string) || undefined,
      guestCount: Number(formData.get("guestCount") || 100),
      totalBudget: Number(formData.get("totalBudget") || 25000),
      currency: (formData.get("currency") as string) || "INR",
      preferences: (formData.get("preferences") as string) || undefined,
      dietaryOrAccessibility: (formData.get("dietaryOrAccessibility") as string) || undefined,
      constraints: (formData.get("constraints") as string) || undefined,
    };

    setActiveInput(input);

    const res = await generateBlueprintAction(input);
    if (!res.success || !res.blueprint) {
      setError(res.error || "Failed to generate blueprint. Please try again.");
      setIsLoading(false);
      return;
    }

    setBlueprint(res.blueprint);
    setIsLoading(false);
  };

  if (blueprint && activeInput) {
    return (
      <BlueprintPreview
        blueprint={blueprint}
        input={activeInput}
        onReset={() => setBlueprint(null)}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Overview
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Deterministic & LLM Hybrid Provider
          </span>
        </div>
      </div>

      {error && (
        <div role="alert" aria-live="assertive" className="rounded-md border border-destructive/30 bg-destructive/10 p-3.5 flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="font-serif text-2xl font-semibold">
                AI Event Architect
              </CardTitle>
              <CardDescription className="text-xs">
                Describe your vision in natural language. We will synthesize a structured blueprint across budget, timeline, theme, and contingencies.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Core Event Identity */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="eventType">Event Type *</Label>
                <Input
                  id="eventType"
                  name="eventType"
                  required
                  placeholder="e.g. Wedding, 40th Birthday, Corporate Summit, Community Gala"
                  defaultValue="Wedding"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="title">Custom Title (Optional)</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g. Maya & Daniel's Coastal Botanical Celebration"
                />
              </div>
            </div>

            {/* 2. Specs: Date, Location, Headcount & Financials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="eventDate">Target Event Date</Label>
                <Input id="eventDate" name="eventDate" type="date" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location">Location / Venue Type</Label>
                <Input
                  id="location"
                  name="location"
                  placeholder="e.g. Santa Barbara Coastal Lawn, or Urban Loft"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="guestCount">Expected Guests</Label>
                <Input
                  id="guestCount"
                  name="guestCount"
                  type="number"
                  min="1"
                  defaultValue="120"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="totalBudget">Total Target Budget</Label>
                <Input
                  id="totalBudget"
                  name="totalBudget"
                  type="number"
                  step="0.01"
                  min="100"
                  defaultValue="35000"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  name="currency"
                  defaultValue="INR"
                  maxLength={3}
                  required
                />
              </div>
            </div>

            {/* 3. Aesthetic & Cultural Inclusions */}
            <div className="space-y-4 pt-2 border-t border-border">
              <div className="space-y-1.5">
                <Label htmlFor="preferences">Style, Aesthetic & Atmosphere</Label>
                <Input
                  id="preferences"
                  name="preferences"
                  placeholder="e.g. Warm editorial botanical, dark olive tones, candlelight, acoustic indie jazz"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dietaryOrAccessibility">
                  Dietary, Accessibility & Cultural Requirements
                </Label>
                <Input
                  id="dietaryOrAccessibility"
                  name="dietaryOrAccessibility"
                  placeholder="e.g. 15% vegan guests, step-free wheelchair access required, tea ceremony integration"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="constraints">Hard Constraints & Rules</Label>
                <Textarea
                  id="constraints"
                  name="constraints"
                  placeholder="e.g. Strict 10:30 PM acoustic curfew, no sparklers permitted, outdoor covered backup required"
                  rows={2}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <HelpCircle className="h-3.5 w-3.5" />
                Nothing is persisted until you review and selectively approve sections.
              </span>

              <Button type="submit" disabled={isLoading} className="gap-2 shadow-sm">
                {isLoading ? (
                  <>
                    <Sparkles className="h-4 w-4 animate-spin text-primary-foreground" />
                    Synthesizing Blueprint...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Architect Blueprint
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
