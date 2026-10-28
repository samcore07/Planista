import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  Palette,
  Sparkles,
  Check,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import { EventsDAL } from "@/lib/dal/events.dal";
import { ThemeDAL, ThemeRow, ThemeConceptInput } from "@/lib/dal/theme.dal";
import { GroqClient } from "@/lib/ai/groq";
import {
  selectThemeAction,
  createOrRefineThemeAction,
  deleteThemeAction,
} from "./actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const instant = false;

interface ThemePageProps {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function ThemeStudioContent({ params, searchParams }: ThemePageProps) {
  const { eventId } = await params;
  const resolvedSearchParams = await searchParams;

  const event = await EventsDAL.getEventById(eventId);
  if (!event) notFound();

  let themes = await ThemeDAL.getThemes(eventId);

  // If no themes exist yet, bootstrap one concept for the user
  if (themes.length === 0) {
    let initial: ThemeConceptInput | null = null;
    if (GroqClient.isConfigured()) {
      try {
        initial = await GroqClient.generateTheme(
          `${event.title || "Atmospheric"} aesthetic design concept`,
          event.event_type
        );
      } catch {
        // Fall back to curated concept
      }
    }
    if (!initial) {
      initial = ThemeDAL.generateCuratedConcept("Warm Editorial Botanical", event.event_type);
    }
    initial.isSelected = true;
    const created = await ThemeDAL.createTheme(eventId, initial);
    themes = [created];
  }

  const errorMessage = typeof resolvedSearchParams.error === "string" ? resolvedSearchParams.error : null;
  const isSaved = resolvedSearchParams.saved === "true";
  const isSelected = resolvedSearchParams.selected === "true";
  const isDeleted = resolvedSearchParams.deleted === "true";

  const createWithId = createOrRefineThemeAction.bind(null, eventId);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" />
            AI Theme Studio
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Compare aesthetic directions, harmonize color palettes, and refine production concepts
          </p>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div role="alert" aria-live="assertive" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isSaved && (
        <div role="status" aria-live="polite" className="rounded-lg border border-emerald-300 bg-emerald-50/90 dark:border-emerald-800 dark:bg-emerald-950/50 p-3 text-xs text-emerald-950 dark:text-emerald-100 font-medium flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span>New theme concept generated and added to studio comparison.</span>
        </div>
      )}

      {isSelected && (
        <div role="status" aria-live="polite" className="rounded-lg border border-emerald-300 bg-emerald-50/90 dark:border-emerald-800 dark:bg-emerald-950/50 p-3 text-xs text-emerald-950 dark:text-emerald-100 font-medium flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span>Theme set as primary visual anchor for this celebration.</span>
        </div>
      )}

      {isDeleted && (
        <div role="status" aria-live="polite" className="rounded-lg border border-emerald-300 bg-emerald-50/90 dark:border-emerald-800 dark:bg-emerald-950/50 p-3 text-xs text-emerald-950 dark:text-emerald-100 font-medium flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span>Theme concept removed.</span>
        </div>
      )}

      {/* Natural Language Refinement Strip */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              Refine or Generate Concepts via Natural Language
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Describe a color mood, venue aesthetic, or stylistic shift (e.g. &quot;Midnight Celestial with Navy and Gold&quot;, &quot;Coastal Dune with Sea Glass&quot;)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createWithId} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Input
              name="prompt"
              required
              placeholder="e.g. Moody midnight celestial with brushed gold and constellation details..."
              className="flex-1 text-xs"
            />
            <Button size="sm" type="submit" className="gap-1.5 text-xs shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
              Synthesize Theme
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Themes Comparison Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-foreground">
            Aesthetic Concepts ({themes.length})
          </h2>
          <span className="text-xs text-muted-foreground">
            Click to activate the primary design direction
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {themes.map((theme: ThemeRow) => {
            const isSelectedTheme = theme.is_selected;
            const selectTheme = selectThemeAction.bind(null, eventId, theme.id);
            const deleteTheme = deleteThemeAction.bind(null, eventId, theme.id);

            const palette = Array.isArray(theme.color_palette)
              ? (theme.color_palette as { name: string; hex: string }[])
              : [];

            const moodboards = Array.isArray(theme.moodboard_urls)
              ? (theme.moodboard_urls as { url: string; label: string; isAiGenerated: boolean }[])
              : [];

            return (
              <Card
                key={theme.id}
                className={`transition-all overflow-hidden ${
                  isSelectedTheme
                    ? "border-primary ring-2 ring-primary/20 shadow-md"
                    : "border-border hover:border-primary/40"
                }`}
              >
                {/* Visual Palette Preview Header */}
                <div className="h-20 w-full flex">
                  {palette.map((swatch, idx) => (
                    <div
                      key={idx}
                      className="h-full flex-1 flex flex-col justify-end p-2 transition-all hover:flex-[1.5]"
                      style={{ backgroundColor: swatch.hex }}
                    >
                      <span className="text-[10px] font-mono font-bold px-1 py-0.5 rounded bg-black/60 text-white w-fit drop-shadow-sm">
                        {swatch.hex}
                      </span>
                    </div>
                  ))}
                </div>

                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {isSelectedTheme ? (
                        <Badge variant="success" className="text-[10px] gap-1 mb-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Active Primary Theme
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] mb-1">
                          Concept Variant
                        </Badge>
                      )}
                      <CardTitle className="font-serif text-lg font-semibold text-foreground">
                        {theme.name}
                      </CardTitle>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isSelectedTheme && (
                        <form action={selectTheme}>
                          <Button size="sm" variant="outline" type="submit" className="text-xs h-8 gap-1">
                            <Check className="h-3.5 w-3.5" />
                            Select
                          </Button>
                        </form>
                      )}

                      {themes.length > 1 && (
                        <form action={deleteTheme}>
                          <Button
                            size="sm"
                            variant="ghost"
                            type="submit"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </form>
                      )}
                    </div>
                  </div>

                  <CardDescription className="text-xs leading-relaxed pt-1">
                    {theme.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 text-xs">
                  {/* Swatch Names Strip */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {palette.map((swatch, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-black/20"
                          style={{ backgroundColor: swatch.hex }}
                        />
                        {swatch.name}
                        {idx < palette.length - 1 && <span className="text-border ml-1.5">•</span>}
                      </span>
                    ))}
                  </div>

                  {/* Production Disciplines */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                    {theme.decor_direction && (
                      <div className="p-2.5 rounded-md bg-secondary/50 border border-border space-y-0.5">
                        <span className="font-semibold text-foreground block">Decor Direction</span>
                        <p className="text-muted-foreground">{theme.decor_direction}</p>
                      </div>
                    )}

                    {theme.lighting_styling && (
                      <div className="p-2.5 rounded-md bg-secondary/50 border border-border space-y-0.5">
                        <span className="font-semibold text-foreground block">Lighting & Atmosphere</span>
                        <p className="text-muted-foreground">{theme.lighting_styling}</p>
                      </div>
                    )}

                    {theme.floral_ideas && (
                      <div className="p-2.5 rounded-md bg-secondary/50 border border-border space-y-0.5">
                        <span className="font-semibold text-foreground block">Florals & Stems</span>
                        <p className="text-muted-foreground">{theme.floral_ideas}</p>
                      </div>
                    )}

                    {theme.invitation_direction && (
                      <div className="p-2.5 rounded-md bg-secondary/50 border border-border space-y-0.5">
                        <span className="font-semibold text-foreground block">Stationery & Invites</span>
                        <p className="text-muted-foreground">{theme.invitation_direction}</p>
                      </div>
                    )}
                  </div>

                  {/* Honest Fallback Asset Moodboard */}
                  {moodboards.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-border">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-foreground flex items-center gap-1.5">
                          <ImageIcon className="h-3 w-3 text-primary" />
                          Moodboard Visual Study
                        </span>
                        <Badge variant="outline" className="text-[9px] text-muted-foreground">
                          {moodboards[0].isAiGenerated ? "AI Generated" : "Curated Palette Fallback"}
                        </Badge>
                      </div>

                      <div className="rounded-lg overflow-hidden border border-border bg-black/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={moodboards[0].url}
                          alt={moodboards[0].label}
                          className="w-full h-28 object-cover"
                        />
                        <div className="p-2 bg-secondary/40 text-[10px] text-muted-foreground flex items-center justify-between">
                          <span>{moodboards[0].label}</span>
                          <span className="text-[9px] text-muted-foreground/80">SVG Geometric Study</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ThemePage(props: ThemePageProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-10 w-48 bg-secondary rounded" />
          <div className="grid grid-cols-2 gap-6">
            <div className="h-64 bg-card rounded border border-border" />
            <div className="h-64 bg-card rounded border border-border" />
          </div>
        </div>
      }
    >
      <ThemeStudioContent {...props} />
    </Suspense>
  );
}
