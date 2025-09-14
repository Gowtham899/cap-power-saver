import { useState, useEffect } from "react";
import { Battery, BatteryLow, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { deviceService, BatteryInfo } from "@/services/deviceService";
import { cn } from "@/lib/utils";

export function BatteryMonitor() {
  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo>({ level: 0, isCharging: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBatteryInfo = async () => {
      try {
        const info = await deviceService.getBatteryInfo();
        setBatteryInfo(info);
      } catch (error) {
        console.error("Failed to get battery info:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBatteryInfo();
    
    // Update every 30 seconds
    const interval = setInterval(fetchBatteryInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  const getBatteryColor = (level: number) => {
    if (level <= 20) return "danger";
    if (level <= 50) return "warning";
    return "tech-green";
  };

  const getBatteryIcon = (level: number, isCharging: boolean) => {
    if (isCharging) return Zap;
    if (level <= 20) return BatteryLow;
    return Battery;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-32"></div>
          </CardHeader>
          <CardContent>
            <div className="h-20 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const BatteryIcon = getBatteryIcon(batteryInfo.level, batteryInfo.isCharging);
  const batteryColor = getBatteryColor(batteryInfo.level);

  return (
    <div className="space-y-6">
      {/* Main Battery Status */}
      <Card className="bg-gradient-card border-border/50 shadow-elevated">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <BatteryIcon className={cn("h-6 w-6", 
              batteryColor === "danger" && "text-danger",
              batteryColor === "warning" && "text-warning",
              batteryColor === "tech-green" && "text-tech-green"
            )} />
            Battery Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Battery Level Circle */}
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke={`hsl(var(--${batteryColor}))`}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${(batteryInfo.level / 100) * 314} 314`}
                  className="transition-all duration-500"
                  style={{
                    filter: batteryColor === "tech-green" ? "drop-shadow(0 0 8px hsl(var(--tech-green) / 0.5))" : undefined
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold">{batteryInfo.level}%</div>
                  {batteryInfo.isCharging && (
                    <div className="text-xs text-tech-blue flex items-center gap-1 justify-center">
                      <Zap className="h-3 w-3" />
                      Charging
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Battery Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Level</span>
              <span className={cn("font-medium",
                batteryColor === "danger" && "text-danger",
                batteryColor === "warning" && "text-warning", 
                batteryColor === "tech-green" && "text-tech-green"
              )}>
                {batteryInfo.level}%
              </span>
            </div>
            <Progress 
              value={batteryInfo.level} 
              className="h-2"
            />
          </div>

          {/* Status Info */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {batteryInfo.isCharging ? "Charging" : "Discharging"}
              </div>
              <div className="text-sm text-muted-foreground">Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-tech-blue">
                {batteryInfo.level >= 80 ? "Healthy" : batteryInfo.level >= 20 ? "Normal" : "Low"}
              </div>
              <div className="text-sm text-muted-foreground">Health</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Battery Alerts Setup */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Alert Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Low Battery Alerts</span>
              <span className="text-danger">5%, 10%, 15%, 20%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">High Battery Alerts</span>
              <span className="text-tech-green">80%, 85%, 90%, 95%, 100%</span>
            </div>
            <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
              Notifications are automatically sent when battery reaches these levels
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}