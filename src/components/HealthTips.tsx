import { Heart, Battery, HardDrive, Wifi, Lightbulb, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const healthTips = [
  {
    category: "Battery Care",
    icon: Battery,
    color: "tech-green",
    tips: [
      "Avoid letting battery drop below 20% regularly",
      "Don't charge to 100% every time - 80% is often sufficient",
      "Use original or certified chargers to prevent damage",
      "Avoid extreme temperatures while charging",
      "Enable battery optimization in settings",
    ]
  },
  {
    category: "Storage Optimization",
    icon: HardDrive,
    color: "tech-blue",
    tips: [
      "Regularly clear app caches and temporary files",
      "Move photos and videos to cloud storage",
      "Uninstall apps you don't use anymore",
      "Use 'Smart Storage' features to auto-cleanup",
      "Keep at least 10-15% storage free for optimal performance",
    ]
  },
  {
    category: "Data Management",
    icon: Wifi,
    color: "tech-purple",
    tips: [
      "Use WiFi whenever possible to save mobile data",
      "Enable data saver mode in system settings",
      "Monitor background app data usage",
      "Download content for offline use when on WiFi",
      "Set data usage warnings and limits",
    ]
  },
  {
    category: "General Device Health",
    icon: Shield,
    color: "warning",
    tips: [
      "Restart your device weekly to clear memory",
      "Keep your operating system updated",
      "Use antivirus software for security",
      "Clean your device screen and ports regularly",
      "Avoid installing apps from unknown sources",
    ]
  }
];

export function HealthTips() {
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
      {healthTips.map((category, index) => {
        const Icon = category.icon;
        
        return (
          <Card key={index} className="bg-gradient-card border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3">
                <Icon className={`h-6 w-6 text-${category.color}`} />
                {category.category}
                <Badge variant="outline" className={`ml-auto text-${category.color} border-${category.color}`}>
                  {category.tips.length} tips
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {category.tips.map((tip, tipIndex) => (
                  <div
                    key={tipIndex}
                    className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <Lightbulb className={`h-4 w-4 mt-0.5 text-${category.color} flex-shrink-0`} />
                    <span className="text-sm text-foreground leading-relaxed">
                      {tip}
                    </span>
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

      {/* Pro Tips */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-warning" />
            Pro Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-warning rounded-full"></div>
              <span>Enable automatic backups to prevent data loss</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-tech-blue rounded-full"></div>
              <span>Use dark mode to save battery on OLED screens</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-tech-green rounded-full"></div>
              <span>Schedule regular maintenance and cleanup routines</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-tech-purple rounded-full"></div>
              <span>Monitor app permissions for better security</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}