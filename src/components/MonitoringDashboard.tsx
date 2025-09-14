import { useState, useEffect } from "react";
import { Activity, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { deviceService, AlertLog, MonitoringStatus } from "@/services/deviceService";
import { cn } from "@/lib/utils";

export function MonitoringDashboard() {
  const [alertLogs, setAlertLogs] = useState<AlertLog[]>([]);
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatus>({
    isBackgroundMonitoringActive: false,
    lastBatteryCheck: 0,
    lastStorageCheck: 0,
    lastDataCheck: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [logs, status] = await Promise.all([
          deviceService.getAlertLogs(),
          deviceService.getMonitoringStatus(),
        ]);
        setAlertLogs(logs);
        setMonitoringStatus(status);
      } catch (error) {
        console.error("Failed to fetch monitoring data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Update every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getAlertIcon = (type: AlertLog['type']) => {
    switch (type) {
      case 'battery': return '🔋';
      case 'storage': return '💾';
      case 'data': return '📶';
      default: return '📱';
    }
  };

  const getAlertColor = (type: AlertLog['type']) => {
    switch (type) {
      case 'battery': return 'tech-green';
      case 'storage': return 'tech-blue';
      case 'data': return 'tech-purple';
      default: return 'muted';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-40"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Background Monitoring Status */}
      <Card className="bg-gradient-card border-border/50 shadow-elevated">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <Activity className={cn("h-6 w-6", 
              monitoringStatus.isBackgroundMonitoringActive ? "text-tech-green" : "text-danger"
            )} />
            Background Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            {monitoringStatus.isBackgroundMonitoringActive ? (
              <CheckCircle className="h-5 w-5 text-tech-green" />
            ) : (
              <XCircle className="h-5 w-5 text-danger" />
            )}
            <span className={cn("font-medium",
              monitoringStatus.isBackgroundMonitoringActive ? "text-tech-green" : "text-danger"
            )}>
              {monitoringStatus.isBackgroundMonitoringActive ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
            <div className="text-center">
              <div className="text-sm font-medium text-foreground">Battery</div>
              <div className="text-xs text-muted-foreground">
                {formatTimestamp(monitoringStatus.lastBatteryCheck)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-foreground">Storage</div>
              <div className="text-xs text-muted-foreground">
                {formatTimestamp(monitoringStatus.lastStorageCheck)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-foreground">Data</div>
              <div className="text-xs text-muted-foreground">
                {formatTimestamp(monitoringStatus.lastDataCheck)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Alerts
            <Badge variant="secondary" className="ml-auto">
              {alertLogs.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alertLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No alerts yet</p>
              <p className="text-xs">Background monitoring will log alerts here</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {alertLogs.slice().reverse().map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/30"
                >
                  <div className="text-lg">{getAlertIcon(alert.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs capitalize",
                          `border-${getAlertColor(alert.type)} text-${getAlertColor(alert.type)}`
                        )}
                      >
                        {alert.type}
                      </Badge>
                      <span className="text-sm font-medium">{alert.level}%</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {alert.message}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    {formatTimestamp(alert.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monitoring Info */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Background Monitoring Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Battery Checks</span>
              <span className="text-tech-green">Every 30 seconds</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Storage Checks</span>
              <span className="text-tech-blue">Every 5 minutes</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Data Usage Checks</span>
              <span className="text-tech-purple">Every minute</span>
            </div>
            <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
              Background monitoring continues even when the app is minimized
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}