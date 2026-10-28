"use client";

import { Sparkles, TrendingDown, ShieldCheck } from "lucide-react";
import { SavingProposal } from "@/lib/dal/budget.dal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SavingsSuggestionsProps {
  proposals: SavingProposal[];
  currency: string;
}

export function SavingsSuggestions({ proposals, currency }: SavingsSuggestionsProps) {
  if (proposals.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                AI Budget Intelligence & Grounded Optimization Proposals
              </CardTitle>
              <CardDescription className="text-xs">
                Contextual savings identified from your current allocations and variance rates
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] text-muted-foreground w-fit">
            Advisory Only • Zero Auto-Mutations
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-md border border-border bg-card p-3 text-[11px] text-muted-foreground flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>
            These proposals are grounded in your real expenses. Planista never automatically modifies approved contracts or line items without your direct approval.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {proposals.map((prop) => (
            <div
              key={prop.id}
              className="p-4 rounded-lg border border-border bg-card space-y-2.5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Badge variant="secondary" className="text-[10px] mb-1">
                    {prop.category}
                  </Badge>
                  <h4 className="font-semibold text-foreground text-xs leading-snug">
                    {prop.title}
                  </h4>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <TrendingDown className="h-3.5 w-3.5" />
                    -₹{prop.potentialSavings.toLocaleString()} {currency === "INR" ? "" : currency}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Est. Savings</span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {prop.recommendation}
              </p>

              <div className="space-y-1 pt-1 border-t border-border">
                <span className="text-[10px] font-medium text-foreground block">
                  Identified Trade-offs:
                </span>
                <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc list-inside">
                  {prop.tradeOffs.map((tradeOff, i) => (
                    <li key={i}>{tradeOff}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
