import { Heart, Battery, HardDrive, Wifi, Lightbulb, Shield, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHealthTipsByCategory } from "@/hooks/useHealthTips";
import type { HealthTip } from "@/types/database";

const categoryConfig: Record<string, { icon: typeof Battery; color: string; label: string }> = {
  battery: { icon: Battery, color: "tech-green", label: "Battery Care" },
  storage: { icon: HardDrive, color: "tech-blue", label: "Storage Optimization" },
  data: { icon: Wifi, color: "tech-purple", label: "Data Management" },
  general: { icon: Shield, color: "warning", label: "General Device Health" },
};

export function HealthTips() {
  const { data: groupedTips, isLoading, error } = useHealthTipsByCategory();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-destructive/10 border-destructive/50">
        <CardContent className="pt-6 text-center">
          <p className="text-destructive">Failed to load health tips. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  const categories = Object.keys(groupedTips || {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-primary border-border/50 shadow-elevated">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-3 text-xl">
            <Heart className="h-6 w-6 text-foreground" />
            Device Health Tips
          </CardTitle>
          <p className="text-sm text-foreground/80">
            Keep your device running smoothly with these expert recommendations
          </p>
        </CardHeader>
      </Card>

      {/* Health Tips Categories */}
      {categories.map((category) => {
        const config = categoryConfig[category] || categoryConfig.general;
        const Icon = config.icon;
        const tips = groupedTips?.[category] || [];

        return (
          <Card key={category} className="bg-gradient-card border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <Icon className={`h-6 w-6 text-${config.color}`} />
                {config.label}
                <Badge variant="outline" className={`ml-auto text-${config.color} border-${config.color}`}>
                  {tips.length} tips
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tips.map((tip: HealthTip) => (
                  <div
                    key={tip.id}
                    className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <Lightbulb className={`h-4 w-4 mt-0.5 text-${config.color} flex-shrink-0`} />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-foreground">{tip.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{tip.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Quick Health Check */}
      <Card className="bg-gradient-secondary border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-tech-green" />
            Quick Health Check
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-background/20 rounded-lg">
              <div className="text-lg font-bold text-tech-green">Good</div>
              <div className="text-xs text-muted-foreground">Battery Health</div>
            </div>
            <div className="text-center p-4 bg-background/20 rounded-lg">
              <div className="text-lg font-bold text-tech-blue">Normal</div>
              <div className="text-xs text-muted-foreground">Storage Health</div>
            </div>
            <div className="text-center p-4 bg-background/20 rounded-lg">
              <div className="text-lg font-bold text-tech-purple">Optimal</div>
              <div className="text-xs text-muted-foreground">Data Usage</div>
            </div>
            <div className="text-center p-4 bg-background/20 rounded-lg">
              <div className="text-lg font-bold text-tech-green">Healthy</div>
              <div className="text-xs text-muted-foreground">Overall Status</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
