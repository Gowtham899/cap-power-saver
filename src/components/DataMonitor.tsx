import { useState, useEffect } from "react";
import { Wifi, TrendingUp, Smartphone, RefreshCw, Activity, Globe, Video, Music, Camera, Download, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { deviceService, DataUsage } from "@/services/deviceService";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

export function DataMonitor() {
  const [dataUsage, setDataUsage] = useState<DataUsage>({
    totalUsed: 0,
    dailyUsage: Array(7).fill(0),
    weeklyTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [isRealTimeMode, setIsRealTimeMode] = useState(true);
  const [appUsageData, setAppUsageData] = useState<any[]>([]);

  useEffect(() => {
    const fetchDataUsage = async () => {
      try {
        const usage = await deviceService.getDataUsage();
        setDataUsage(usage);
        setLastUpdate(Date.now());
        
        // Generate realistic app usage data with categories
        const mockApps = [
          { name: 'YouTube', category: 'Video', usage: Math.floor(Math.random() * 800 + 200), color: '#FF0000', icon: Video },
          { name: 'Instagram', category: 'Social', usage: Math.floor(Math.random() * 600 + 150), color: '#E4405F', icon: Camera },
          { name: 'Spotify', category: 'Music', usage: Math.floor(Math.random() * 400 + 100), color: '#1DB954', icon: Music },
          { name: 'WhatsApp', category: 'Messaging', usage: Math.floor(Math.random() * 300 + 80), color: '#25D366', icon: Smartphone },
          { name: 'Chrome', category: 'Browser', usage: Math.floor(Math.random() * 500 + 120), color: '#4285F4', icon: Globe },
          { name: 'Netflix', category: 'Video', usage: Math.floor(Math.random() * 700 + 180), color: '#E50914', icon: Video },
          { name: 'TikTok', category: 'Social', usage: Math.floor(Math.random() * 550 + 140), color: '#000000', icon: Video },
          { name: 'Downloads', category: 'System', usage: Math.floor(Math.random() * 200 + 50), color: '#6B7280', icon: Download },
        ];
        setAppUsageData(mockApps);
        
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
    
    // Update based on real-time mode (10s for real-time, 60s for standard)
    const interval = setInterval(fetchDataUsage, isRealTimeMode ? 10000 : 60000);
    return () => clearInterval(interval);
  }, [isRealTimeMode]);

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDayName = (index: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[index];
  };

  const chartData = dataUsage.dailyUsage.map((usage, index) => ({
    day: getDayName(index),
    usage: Math.round(usage / (1024 * 1024)), // Convert to MB
  }));

  const weeklyChartData = [
    { day: 'Week 1', usage: 850, trend: 800 },
    { day: 'Week 2', usage: 920, trend: 880 },
    { day: 'Week 3', usage: 760, trend: 790 },
    { day: 'Week 4', usage: 1100, trend: 950 },
  ];

  // Category breakdown for pie chart
  const categoryData = appUsageData.reduce((acc: any[], app) => {
    const existing = acc.find(item => item.category === app.category);
    if (existing) {
      existing.usage += app.usage;
    } else {
      acc.push({ category: app.category, usage: app.usage });
    }
    return acc;
  }, []);

  const categoryColors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280'];

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
      {/* Real-Time Data Usage */}
      <Card className="bg-gradient-card border-border/50 shadow-elevated">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <Wifi className="h-6 w-6 text-tech-purple" />
            Real-Time Data Usage
            <div className="ml-auto flex items-center gap-2">
              <Badge variant={isRealTimeMode ? "default" : "secondary"} className="text-xs">
                <Activity className={cn("h-3 w-3 mr-1", isRealTimeMode && "animate-pulse")} />
                {isRealTimeMode ? "Live" : "Standard"}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsRealTimeMode(!isRealTimeMode)}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn("h-4 w-4", isRealTimeMode && "animate-spin")} />
              </Button>
            </div>
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
              <div className="text-xs text-muted-foreground mt-1">
                Updated: {formatTimestamp(lastUpdate)}
              </div>
            </div>
            <div className="text-center p-4 bg-gradient-primary rounded-lg">
              <div className="text-2xl font-bold text-foreground">
                {formatBytes(dataUsage.weeklyTotal)}
              </div>
              <div className="text-sm text-muted-foreground">This Week</div>
              <div className="text-xs text-tech-green mt-1">
                Update: {isRealTimeMode ? "10s" : "60s"}
              </div>
            </div>
          </div>

          {/* Alert Status */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-tech-green border-tech-green">
              <Activity className="h-3 w-3 mr-1" />
              Background Tracking
            </Badge>
            <Badge variant="outline" className="text-tech-purple border-tech-purple">
              200MB Alert Enabled
            </Badge>
            <Badge variant="outline" className={cn("border-tech-blue",
              isRealTimeMode ? "text-tech-blue animate-pulse" : "text-muted-foreground"
            )}>
              {isRealTimeMode ? "Real-Time Mode" : "Standard Mode"}
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


      {/* Data Alerts & 200MB Tracking */}
      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-tech-green" />
            Data Alerts & Tracking
          </CardTitle>
          <CardDescription>200MB increment alerts and monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Alert Frequency</p>
                <p className="text-lg font-semibold">Every 200MB</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Next Alert</p>
                <p className="text-lg font-semibold text-tech-blue">
                  {Math.ceil((Math.floor(dataUsage.totalUsed / (1024 * 1024)) / 200) + 1) * 200}MB
                </p>
              </div>
            </div>
            
            {/* 200MB Progress Tracking */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress to Next Alert</span>
                <span>
                  {Math.floor(dataUsage.totalUsed / (1024 * 1024)) % 200}MB / 200MB
                </span>
              </div>
              <Progress 
                value={((Math.floor(dataUsage.totalUsed / (1024 * 1024)) % 200) / 200) * 100} 
                className="h-3"
              />
            </div>

            {/* Alert History */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Recent 200MB Alerts</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {Array.from({ length: Math.floor(Math.floor(dataUsage.totalUsed / (1024 * 1024)) / 200) }, (_, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded">
                    <span>Alert #{i + 1}</span>
                    <Badge variant="outline" className="text-xs">
                      {(i + 1) * 200}MB reached
                    </Badge>
                  </div>
                )).reverse().slice(0, 5)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}