/**
 * @fileoverview Theme & Aesthetic direction section for the Event Blueprint Preview.
 */

"use client";

import * as React from "react";
import { Palette, Plus, Pencil, X } from "lucide-react";
import { ThemeBlueprint } from "@/types/blueprint.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BlueprintThemeSectionProps {
  theme: ThemeBlueprint;
  isSelected: boolean;
  onToggleSection: () => void;
  onOpenEditThemeModal: () => void;
  onOpenAddColorModal: () => void;
  onOpenEditColorModal: (index: number) => void;
  onDeleteColor: (index: number) => void;
}

export function BlueprintThemeSection({
  theme,
  isSelected,
  onToggleSection,
  onOpenEditThemeModal,
  onOpenAddColorModal,
  onOpenEditColorModal,
  onDeleteColor,
}: BlueprintThemeSectionProps) {
  return (
    <Card
      className={`transition-all ${
        isSelected ? "border-primary/50" : "opacity-60 border-border"
      }`}
    >
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="sec-theme"
            aria-label="Include theme direction"
            checked={isSelected}
            onChange={onToggleSection}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
          />
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              Theme Direction: {theme.themeName}
            </CardTitle>
            <CardDescription className="text-xs">
              Harmonized color palette, lighting guidelines, and styling
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenEditThemeModal}
            className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Pencil className="h-3 w-3" />
            Edit Theme
          </Button>
          <Badge variant="secondary" className="text-xs">
            {isSelected ? "Accepted" : "Excluded"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        {/* Color Palette Row with Add/Edit/Delete */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[11px] font-medium">
              Palette Swatches:
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onOpenAddColorModal}
              className="h-6 px-2 text-[11px] gap-1 text-primary hover:bg-primary/10"
            >
              <Plus className="h-3 w-3" />
              Add Color
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {theme.palette.map((swatch, i) => (
              <div
                key={i}
                className="group relative flex items-center gap-1.5 p-1.5 rounded border border-border bg-card shadow-xs"
              >
                <button
                  type="button"
                  aria-label={`Edit ${swatch.name} swatch`}
                  className="h-5 w-5 rounded-sm border border-black/10 shrink-0 cursor-pointer p-0"
                  style={{ backgroundColor: swatch.hex }}
                  onClick={() => onOpenEditColorModal(i)}
                  title="Click to edit color"
                />
                <span className="text-[10px] text-foreground font-medium pr-1">
                  {swatch.name}
                </span>
                <div className="flex items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => onOpenEditColorModal(i)}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground"
                    title="Edit color"
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteColor(i)}
                    className="p-0.5 rounded text-muted-foreground hover:text-destructive"
                    title="Delete color"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-muted-foreground leading-relaxed">
          {theme.conceptDescription}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
          <div className="p-2.5 rounded bg-secondary/50 border border-border">
            <span className="font-medium text-foreground block mb-0.5">Decor</span>
            <span className="text-muted-foreground">{theme.decorDirection}</span>
          </div>
          <div className="p-2.5 rounded bg-secondary/50 border border-border">
            <span className="font-medium text-foreground block mb-0.5">Lighting</span>
            <span className="text-muted-foreground">{theme.lightingDirection}</span>
          </div>
          <div className="p-2.5 rounded bg-secondary/50 border border-border">
            <span className="font-medium text-foreground block mb-0.5">Stationery</span>
            <span className="text-muted-foreground">{theme.invitationDirection}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
