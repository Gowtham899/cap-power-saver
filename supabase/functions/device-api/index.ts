import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-device-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// Validation schemas
const VALID_METRIC_TYPES = ["battery", "storage", "temperature", "data"];
const VALID_ALERT_TYPES = ["battery", "storage", "temperature", "data"];
const VALID_ALERT_LEVELS = ["info", "warning", "critical"];
const VALID_NOTIFICATION_TYPES = [
  "battery",
  "storage",
  "temperature",
  "data",
  "battery_low",
  "battery_high",
  "storage_warning",
];

interface DeviceRegistration {
  device_id: string;
  platform?: string;
  model?: string;
  os_version?: string;
  device_name?: string;
  app_version?: string;
}

interface MetricData {
  device_id: string;
  metric_type: string;
  current_value: number;
  max_value?: number;
  is_charging?: boolean;
}

interface AlertData {
  device_id: string;
  alert_type: string;
  alert_level: string;
  threshold_value: number;
  current_value: number;
  message: string;
  is_charging?: boolean;
  attachment_url?: string;
}

interface NotificationSettings {
  device_id: string;
  alert_type: string;
  is_enabled?: boolean;
  threshold_value: number;
  sound_enabled?: boolean;
  vibration_enabled?: boolean;
  recurring_interval_seconds?: number;
}

// Validation functions
function validateDeviceId(deviceId: string): boolean {
  return (
    typeof deviceId === "string" && deviceId.length >= 1 && deviceId.length <= 100
  );
}

function validateMetricType(type: string): boolean {
  return VALID_METRIC_TYPES.includes(type);
}

function validateAlertType(type: string): boolean {
  return VALID_ALERT_TYPES.includes(type);
}

function validateAlertLevel(level: string): boolean {
  return VALID_ALERT_LEVELS.includes(level);
}

function validateNotificationType(type: string): boolean {
  return VALID_NOTIFICATION_TYPES.includes(type);
}

function validatePercentage(value: number): boolean {
  return typeof value === "number" && value >= 0 && value <= 100;
}

function validateInterval(seconds: number): boolean {
  return typeof seconds === "number" && seconds > 0 && seconds <= 86400;
}

function validateMessage(message: string): string {
  return typeof message === "string" ? message.slice(0, 1000) : "";
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role key
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const action = pathParts[pathParts.length - 1] || "device-api";

    // Get device ID from header or body
    let deviceId = req.headers.get("x-device-id");
    let body: Record<string, unknown> = {};

    if (req.method !== "GET") {
      try {
        body = await req.json();
        deviceId = deviceId || (body.device_id as string);
      } catch {
        // No body or invalid JSON
      }
    }

    // Route handlers
    switch (action) {
      case "register": {
        const data = body as unknown as DeviceRegistration;
        
        if (!validateDeviceId(data.device_id)) {
          return new Response(
            JSON.stringify({ error: "Invalid device_id" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: device, error } = await supabase
          .from("devices")
          .upsert(
            {
              device_id: data.device_id,
              platform: data.platform || "unknown",
              model: data.model?.slice(0, 200) || null,
              os_version: data.os_version?.slice(0, 50) || null,
              device_name: data.device_name?.slice(0, 200) || null,
              app_version: data.app_version?.slice(0, 50) || null,
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: "device_id" }
          )
          .select()
          .single();

        if (error) {
          console.error("Register error:", error);
          return new Response(
            JSON.stringify({ error: "Failed to register device" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ success: true, device }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "log-metric": {
        const data = body as unknown as MetricData;
        
        if (!validateDeviceId(data.device_id)) {
          return new Response(
            JSON.stringify({ error: "Invalid device_id" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        if (!validateMetricType(data.metric_type)) {
          return new Response(
            JSON.stringify({ error: "Invalid metric_type" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        if (!validatePercentage(data.current_value)) {
          return new Response(
            JSON.stringify({ error: "Invalid current_value (must be 0-100)" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: metric, error } = await supabase
          .from("device_metrics")
          .insert({
            device_id: data.device_id,
            metric_type: data.metric_type,
            current_value: Math.round(data.current_value),
            max_value: data.max_value || null,
            is_charging: data.is_charging || false,
          })
          .select()
          .single();

        if (error) {
          console.error("Log metric error:", error);
          return new Response(
            JSON.stringify({ error: "Failed to log metric" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ success: true, metric }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "log-alert": {
        const data = body as unknown as AlertData;
        
        if (!validateDeviceId(data.device_id)) {
          return new Response(
            JSON.stringify({ error: "Invalid device_id" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        if (!validateAlertType(data.alert_type)) {
          return new Response(
            JSON.stringify({ error: "Invalid alert_type" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        if (!validateAlertLevel(data.alert_level)) {
          return new Response(
            JSON.stringify({ error: "Invalid alert_level" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check for duplicate alert (within 1 hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data: existingAlert } = await supabase
          .from("alert_logs")
          .select("id")
          .eq("device_id", data.device_id)
          .eq("alert_type", data.alert_type)
          .eq("threshold_value", data.threshold_value)
          .gte("created_at", oneHourAgo)
          .maybeSingle();

        if (existingAlert) {
          return new Response(
            JSON.stringify({ success: false, message: "Alert already sent recently" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: alert, error } = await supabase
          .from("alert_logs")
          .insert({
            device_id: data.device_id,
            alert_type: data.alert_type,
            alert_level: data.alert_level,
            threshold_value: data.threshold_value,
            current_value: data.current_value,
            message: validateMessage(data.message),
            is_charging: data.is_charging || false,
            attachment_url: data.attachment_url || null,
          })
          .select()
          .single();

        if (error) {
          console.error("Log alert error:", error);
          return new Response(
            JSON.stringify({ error: "Failed to log alert" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ success: true, alert }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get-metrics": {
        if (!deviceId || !validateDeviceId(deviceId)) {
          return new Response(
            JSON.stringify({ error: "Invalid device_id" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const metricType = url.searchParams.get("type") || "storage";
        const days = parseInt(url.searchParams.get("days") || "7");
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data: metrics, error } = await supabase
          .from("device_metrics")
          .select("*")
          .eq("device_id", deviceId)
          .eq("metric_type", metricType)
          .gte("recorded_at", startDate.toISOString())
          .order("recorded_at", { ascending: false })
          .limit(limit);

        if (error) {
          console.error("Get metrics error:", error);
          return new Response(
            JSON.stringify({ error: "Failed to get metrics" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ success: true, metrics }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get-alerts": {
        if (!deviceId || !validateDeviceId(deviceId)) {
          return new Response(
            JSON.stringify({ error: "Invalid device_id" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const alertType = url.searchParams.get("type");
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);

        let query = supabase
          .from("alert_logs")
          .select("*")
          .eq("device_id", deviceId)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (alertType && validateAlertType(alertType)) {
          query = query.eq("alert_type", alertType);
        }

        const { data: alerts, error } = await query;

        if (error) {
          console.error("Get alerts error:", error);
          return new Response(
            JSON.stringify({ error: "Failed to get alerts" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ success: true, alerts }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "save-settings": {
        const data = body as unknown as NotificationSettings;
        
        if (!validateDeviceId(data.device_id)) {
          return new Response(
            JSON.stringify({ error: "Invalid device_id" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        if (!validateNotificationType(data.alert_type)) {
          return new Response(
            JSON.stringify({ error: "Invalid alert_type" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        if (!validatePercentage(data.threshold_value)) {
          return new Response(
            JSON.stringify({ error: "Invalid threshold_value" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const intervalSeconds = data.recurring_interval_seconds || 10;
        if (!validateInterval(intervalSeconds)) {
          return new Response(
            JSON.stringify({ error: "Invalid recurring_interval_seconds" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: settings, error } = await supabase
          .from("notification_settings")
          .upsert(
            {
              device_id: data.device_id,
              alert_type: data.alert_type,
              is_enabled: data.is_enabled ?? true,
              threshold_value: data.threshold_value,
              sound_enabled: data.sound_enabled ?? true,
              vibration_enabled: data.vibration_enabled ?? true,
              recurring_interval_seconds: intervalSeconds,
            },
            { onConflict: "device_id,alert_type" }
          )
          .select()
          .single();

        if (error) {
          console.error("Save settings error:", error);
          return new Response(
            JSON.stringify({ error: "Failed to save settings" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ success: true, settings }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get-settings": {
        if (!deviceId || !validateDeviceId(deviceId)) {
          return new Response(
            JSON.stringify({ error: "Invalid device_id" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const alertType = url.searchParams.get("type");

        let query = supabase
          .from("notification_settings")
          .select("*")
          .eq("device_id", deviceId);

        if (alertType && validateNotificationType(alertType)) {
          query = query.eq("alert_type", alertType);
        }

        const { data: settings, error } = await query;

        if (error) {
          console.error("Get settings error:", error);
          return new Response(
            JSON.stringify({ error: "Failed to get settings" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ success: true, settings }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "log-data-usage": {
        const { device_id, usage_type, bytes_used, period_start, period_end } = body as {
          device_id: string;
          usage_type: string;
          bytes_used: number;
          period_start: string;
          period_end?: string;
        };

        if (!validateDeviceId(device_id)) {
          return new Response(
            JSON.stringify({ error: "Invalid device_id" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const validUsageTypes = ["mobile", "wifi", "total"];
        if (!validUsageTypes.includes(usage_type)) {
          return new Response(
            JSON.stringify({ error: "Invalid usage_type" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: usage, error } = await supabase
          .from("data_usage_logs")
          .insert({
            device_id,
            usage_type,
            bytes_used: Math.max(0, bytes_used),
            period_start,
            period_end: period_end || new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          console.error("Log data usage error:", error);
          return new Response(
            JSON.stringify({ error: "Failed to log data usage" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ success: true, usage }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get-data-usage": {
        if (!deviceId || !validateDeviceId(deviceId)) {
          return new Response(
            JSON.stringify({ error: "Invalid device_id" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const days = parseInt(url.searchParams.get("days") || "30");
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data: usage, error } = await supabase
          .from("data_usage_logs")
          .select("*")
          .eq("device_id", deviceId)
          .gte("period_start", startDate.toISOString())
          .order("recorded_at", { ascending: false })
          .limit(100);

        if (error) {
          console.error("Get data usage error:", error);
          return new Response(
            JSON.stringify({ error: "Failed to get data usage" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(JSON.stringify({ success: true, usage }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(
          JSON.stringify({ 
            error: "Unknown action",
            available_actions: [
              "register", "log-metric", "log-alert", "get-metrics", 
              "get-alerts", "save-settings", "get-settings",
              "log-data-usage", "get-data-usage"
            ]
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Device API Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
