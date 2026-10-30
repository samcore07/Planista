import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CAPABILITIES } from "./landing-data";

export function FeaturesSection() {
  return (
    <section id="features" className="py-16 md:py-24 border-t border-border/60 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <Badge variant="outline" className="uppercase tracking-widest text-[10px]">
            Built for Precision
          </Badge>
          <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
            Eight Pillars of Event Orchestration
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Engineered to replace scattered spreadsheets and superficial chatbots with verified data models.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CAPABILITIES.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Card key={idx} className="border-border/80 bg-card hover:border-primary/40 transition-colors shadow-sm">
                <CardHeader className="space-y-2 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-md bg-secondary text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {item.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-semibold">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs leading-relaxed text-muted-foreground">
                    {item.desc}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
