import { useState, useEffect } from "react";
import { Wifi, TrendingUp, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { deviceService, DataUsage } from "@/services/deviceService";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from "recharts";

export function DataMonitor() {
  const [dataUsage, setDataUsage] = useState<DataUsage>({
    totalUsed: 0,
    dailyUsage: Array(7).fill(0),
    weeklyTotal: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDataUsage = async () => {
      try {
        const usage = await deviceService.getDataUsage();
        setDataUsage(usage);
        
        // Check for data usage alerts
        const usedMB = Math.floor(usage.totalUsed / (1024 * 1024));
        await deviceService.sendDataUsageNotification(usedMB);
      } catch (error) {
        console.error("Failed to get data usage:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDataUsage();
    
    // Update every 30 seconds
    const interval = setInterval(fetchDataUsage, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const getDayName = (index: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[index];
  };

  const chartData = dataUsage.dailyUsage.map((usage, index) => ({
    day: getDayName(index),
    usage: Math.round(usage / (1024 * 1024)), // Convert to MB
  }));

  const weeklyChartData = Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    usage: Math.floor(Math.random() * 500) + 100, // Mock weekly trend data
  }));

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-32"></div>
          </CardHeader>
          <CardContent>
            <div className="h-40 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Data Usage Stats */}
      <Card className="bg-gradient-card border-border/50 shadow-elevated">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <Wifi className="h-6 w-6 text-tech-blue" />
            Mobile Data Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Usage Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gradient-secondary rounded-lg">
              <div className="text-2xl font-bold text-foreground">
                {formatBytes(dataUsage.totalUsed)}
              </div>
              <div className="text-sm text-muted-foreground">Total Used</div>
            </div>
            <div className="text-center p-4 bg-gradient-primary rounded-lg">
              <div className="text-2xl font-bold text-foreground">
                {formatBytes(dataUsage.weeklyTotal)}
              </div>
              <div className="text-sm text-muted-foreground">This Week</div>
            </div>
          </div>

          {/* Alert Status */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-tech-green border-tech-green">
              Tracking Active
            </Badge>
            <Badge variant="outline" className="text-tech-purple border-tech-purple">
              200MB Alerts Enabled
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Daily Usage Chart */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-tech-purple" />
            Daily Usage (This Week)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis 
                  dataKey="day" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <Bar 
                  dataKey="usage" 
                  fill="hsl(var(--tech-blue))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-muted-foreground text-center mt-2">
            Usage in MB per day
          </div>
        </CardContent>
      </Card>

      {/* Weekly Trend */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-tech-green" />
            Weekly Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyChartData}>
                <XAxis 
                  dataKey="day" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis hide />
                <Line 
                  type="monotone" 
                  dataKey="usage" 
                  stroke="hsl(var(--tech-green))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--tech-green))', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* App Usage Breakdown */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="h-5 w-5 text-tech-purple" />
            Top Data Consumers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: "Video Streaming", usage: dataUsage.totalUsed * 0.4, color: "tech-purple" },
              { name: "Social Media", usage: dataUsage.totalUsed * 0.25, color: "tech-blue" },
              { name: "Web Browsing", usage: dataUsage.totalUsed * 0.15, color: "tech-green" },
              { name: "Music Streaming", usage: dataUsage.totalUsed * 0.1, color: "warning" },
              { name: "Other Apps", usage: dataUsage.totalUsed * 0.1, color: "muted" },
            ].map((app, index) => (
              <div key={app.name} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full bg-${app.color}`}></div>
                  <span className="font-medium">{app.name}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatBytes(app.usage)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alert Settings */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Data Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Alert Frequency</span>
              <span className="text-tech-blue">Every 200MB</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Next Alert At</span>
              <span className="text-tech-green">
                {formatBytes(Math.ceil(dataUsage.totalUsed / (200 * 1024 * 1024)) * 200 * 1024 * 1024)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
              Automatic notifications help you track mobile data consumption
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}