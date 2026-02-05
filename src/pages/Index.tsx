import { useState, useEffect } from "react";
 import { useAutoSave } from "@/hooks/useAutoSave";
import { BatteryMonitor } from "@/components/BatteryMonitor";
import { StorageMonitor } from "@/components/StorageMonitor";
import { DataMonitor } from "@/components/DataMonitor";
import { HealthTips } from "@/components/HealthTips";
import { MonitoringDashboard } from "@/components/MonitoringDashboard";
import { AlarmMonitor } from "@/components/AlarmMonitor";
import { BottomNavigation } from "@/components/BottomNavigation";
import { deviceService } from "@/services/deviceService";
import { Smartphone, Activity } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState("battery");
 
   // Auto-save device data on mount with debug alerts
   useAutoSave();

  useEffect(() => {
    // Initialize device service and start monitoring
    deviceService.initialize();

    // Cleanup on unmount
    return () => {
      deviceService.destroy();
    };
  }, []);

  const renderActiveTab = () => {
    switch (activeTab) {
      case "battery":
        return <BatteryMonitor />;
      case "storage":
        return <StorageMonitor />;
      case "data":
        return <DataMonitor />;
      case "alarms":
        return <AlarmMonitor />;
      case "monitoring":
        return <MonitoringDashboard />;
      case "health":
        return <HealthTips />;
      default:
        return <BatteryMonitor />;
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case "battery":
        return "Battery Monitor";
      case "storage":
        return "Storage Monitor";
      case "data":
        return "Data Usage";
      case "alarms":
        return "Alert Alarms";
      case "monitoring":
        return "Background Monitor";
      case "health":
        return "Health Tips";
      default:
        return "Device Health";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Smartphone className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{getTabTitle()}</h1>
              <p className="text-sm text-muted-foreground">Device Health Monitor</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-tech-green animate-pulse" />
            <span className="text-xs text-tech-green font-medium">Live</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {renderActiveTab()}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
