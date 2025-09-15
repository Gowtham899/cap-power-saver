import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import { deviceService } from '@/services/deviceService';
import { cn } from '@/lib/utils';

export const AlarmMonitor = () => {
  const [activeAlarms, setActiveAlarms] = useState<string[]>([]);
  const [isAlarmsEnabled, setIsAlarmsEnabled] = useState(true);

  useEffect(() => {
    // Check for active alarms every second
    const interval = setInterval(() => {
      // Get active alarm keys from deviceService
      const alarmKeys = Array.from((deviceService as any).activeAlarms.keys()) as string[];
      setActiveAlarms(alarmKeys);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleStopAllAlarms = async () => {
    await deviceService.stopAllAlarms();
    setActiveAlarms([]);
  };

  const getAlarmTypeDisplay = (alarmKey: string) => {
    const type = alarmKey.replace('_alarm', '');
    switch (type) {
      case 'battery':
        return { label: 'Battery Critical', color: 'destructive' as const, icon: '🔋' };
      case 'storage':
        return { label: 'Storage Full', color: 'secondary' as const, icon: '💾' };
      case 'data':
        return { label: 'High Data Usage', color: 'default' as const, icon: '📊' };
      default:
        return { label: type, color: 'secondary' as const, icon: '⚠️' };
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeAlarms.length > 0 ? (
              <Volume2 className="h-5 w-5 text-destructive animate-pulse" />
            ) : (
              <VolumeX className="h-5 w-5 text-muted-foreground" />
            )}
            <CardTitle>Alert Alarms</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {activeAlarms.length > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {activeAlarms.length} Active
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          10-second recurring alerts for critical device conditions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeAlarms.length > 0 ? (
          <>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Active Alarms:</h4>
              <div className="flex flex-wrap gap-2">
                {activeAlarms.map((alarmKey) => {
                  const display = getAlarmTypeDisplay(alarmKey);
                  return (
                    <Badge key={alarmKey} variant={display.color} className="flex items-center gap-1">
                      <span>{display.icon}</span>
                      {display.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-destructive animate-bounce" />
                <span className="text-sm font-medium">
                  Critical alerts active - recurring every 10 seconds
                </span>
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleStopAllAlarms}
              >
                <BellOff className="h-4 w-4 mr-1" />
                Stop Alarms
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                <BellOff className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">No active alarms</p>
            <p className="text-xs text-muted-foreground mt-1">
              Alarms will trigger automatically when thresholds are exceeded
            </p>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Alarm Configuration:</h4>
          <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Battery Critical (≤15% or ≥95% charging):</span>
              <Badge variant="outline">10s intervals</Badge>
            </div>
            <div className="flex justify-between">
              <span>Storage Critical (≥90% full):</span>
              <Badge variant="outline">10s intervals</Badge>
            </div>
            <div className="flex justify-between">
              <span>Data Usage High (≥1GB):</span>
              <Badge variant="outline">10s intervals</Badge>
            </div>
            <div className="flex justify-between">
              <span>Alarm Duration:</span>
              <Badge variant="outline">60 seconds</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};