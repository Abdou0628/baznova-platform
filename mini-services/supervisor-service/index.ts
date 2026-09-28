import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { existsSync } from "fs";
import { resolve } from "path";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Issue {
  id: string;
  type: "health_check_failed" | "api_error" | "websocket_down" | "db_error" | "user_complaint";
  severity: "critical" | "high" | "medium" | "low";
  service: string;
  message: string;
  timestamp: string;
  status: "open" | "investigating" | "resolved";
  assignedAgent: string | null;
  resolution: string | null;
}

interface AgentStatus {
  id: string;
  name: string;
  role: string;
  status: "online" | "offline" | "busy";
  currentLoad: number;
  lastHeartbeat: string;
  specialties: string[];
}

interface HealthCheckResult {
  service: string;
  healthy: boolean;
  responseTimeMs: number;
  message: string;
  timestamp: string;
}

interface SupervisorStatus {
  uptime: number;
  totalIssues: number;
  openIssues: number;
  criticalIssues: number;
  healthChecks: HealthCheckResult[];
  agents: AgentStatus[];
  timestamp: string;
}

// ─── Configuration ───────────────────────────────────────────────────────────

const PORT = 3006;
const NEXTJS_PORT = 3000;
const WEBSOCKET_PORT = 3005;
const DB_PATH = resolve(import.meta.dir, "../../prisma/custom.db");
const HEALTH_CHECK_INTERVAL_MS = 30_000; // 30 seconds
const STATUS_BROADCAST_INTERVAL_MS = 15_000; // 15 seconds

// ─── In-Memory Stores ────────────────────────────────────────────────────────

const issues: Issue[] = [];
const healthCheckResults: HealthCheckResult[] = [];
let issueCounter = 0;
const startTime = Date.now();

// ─── Mock Agent Data ─────────────────────────────────────────────────────────

const agents: AgentStatus[] = [
  {
    id: "agent-cv",
    name: "Agent CV",
    role: "candidate",
    status: "online",
    currentLoad: 0.15,
    lastHeartbeat: new Date().toISOString(),
    specialties: ["cv_generation", "ats_optimization", "formatting", "multilingual_cv"],
  },
  {
    id: "agent-ats",
    name: "Agent ATS",
    role: "candidate",
    status: "online",
    currentLoad: 0.1,
    lastHeartbeat: new Date().toISOString(),
    specialties: ["ats_scoring", "keyword_analysis", "compatibility_check"],
  },
  {
    id: "agent-interview",
    name: "Agent Interview",
    role: "candidate",
    status: "online",
    currentLoad: 0.2,
    lastHeartbeat: new Date().toISOString(),
    specialties: ["interview_simulation", "question_generation", "feedback_analysis"],
  },
  {
    id: "agent-linkedin",
    name: "Agent LinkedIn",
    role: "candidate",
    status: "online",
    currentLoad: 0.05,
    lastHeartbeat: new Date().toISOString(),
    specialties: ["profile_optimization", "network_strategy", "content_generation"],
  },
  {
    id: "agent-recruiter",
    name: "Agent Recruiter",
    role: "employment",
    status: "online",
    currentLoad: 0.3,
    lastHeartbeat: new Date().toISOString(),
    specialties: ["candidate_matching", "pipeline_management", "offer_tracking"],
  },
  {
    id: "agent-career",
    name: "Agent Career",
    role: "candidate",
    status: "online",
    currentLoad: 0.1,
    lastHeartbeat: new Date().toISOString(),
    specialties: ["career_roadmap", "skill_assessment", "goal_planning"],
  },
  {
    id: "agent-coach",
    name: "Agent Coach",
    role: "candidate",
    status: "busy",
    currentLoad: 0.75,
    lastHeartbeat: new Date().toISOString(),
    specialties: ["career_coaching", "session_management", "goal_tracking"],
  },
  {
    id: "agent-formation",
    name: "Agent Formation",
    role: "candidate",
    status: "online",
    currentLoad: 0.15,
    lastHeartbeat: new Date().toISOString(),
    specialties: ["course_recommendation", "certification_tracking", "learning_path"],
  },
  {
    id: "agent-legal",
    name: "Agent Legal",
    role: "platform",
    status: "online",
    currentLoad: 0.1,
    lastHeartbeat: new Date().toISOString(),
    specialties: ["contract_generation", "compliance_check", "rgpd_audit", "legal_templates"],
  },
  {
    id: "agent-payment",
    name: "Agent Payment",
    role: "platform",
    status: "online",
    currentLoad: 0.05,
    lastHeartbeat: new Date().toISOString(),
    specialties: ["payment_processing", "invoice_generation", "subscription_management", "refund_handling"],
  },
  {
    id: "agent-mobility",
    name: "Agent Mobility",
    role: "candidate",
    status: "online",
    currentLoad: 0.2,
    lastHeartbeat: new Date().toISOString(),
    specialties: ["document_ocr", "visa_guidance", "country_adaptation"],
  },
  {
    id: "agent-global",
    name: "Agent Global",
    role: "employment",
    status: "online",
    currentLoad: 0.25,
    lastHeartbeat: new Date().toISOString(),
    specialties: ["international_jobs", "visa_sponsorship", "relocation_support"],
  },
];

// ─── Utilities ───────────────────────────────────────────────────────────────

function generateId(): string {
  return `issue-${++issueCounter}-${Date.now().toString(36)}`;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 5000
): Promise<{ ok: boolean; status: number; timeMs: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = performance.now();
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return { ok: res.ok, status: res.status, timeMs: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, status: 0, timeMs: Math.round(performance.now() - start) };
  } finally {
    clearTimeout(timer);
  }
}

function addIssue(
  type: Issue["type"],
  severity: Issue["severity"],
  service: string,
  message: string
): Issue {
  const issue: Issue = {
    id: generateId(),
    type,
    severity,
    service,
    message,
    timestamp: new Date().toISOString(),
    status: "open",
    assignedAgent: null,
    resolution: null,
  };
  issues.unshift(issue);
  // Keep in-memory list from growing unbounded
  if (issues.length > 500) {
    issues.length = 500;
  }
  return issue;
}

// ─── Health Checks ───────────────────────────────────────────────────────────

async function checkAuthHealth(): Promise<HealthCheckResult> {
  const { ok, status, timeMs } = await fetchWithTimeout(
    `http://localhost:${NEXTJS_PORT}/api/auth/session`
  );
  return {
    service: "auth",
    healthy: ok,
    responseTimeMs: timeMs,
    message: ok ? "Auth session endpoint responding" : `Auth session returned status ${status}`,
    timestamp: new Date().toISOString(),
  };
}

async function checkApiHealth(): Promise<HealthCheckResult> {
  const { ok, status, timeMs } = await fetchWithTimeout(
    `http://localhost:${NEXTJS_PORT}/api/public-stats`
  );
  return {
    service: "api",
    healthy: ok,
    responseTimeMs: timeMs,
    message: ok ? "Public stats API responding" : `Public stats returned status ${status}`,
    timestamp: new Date().toISOString(),
  };
}

async function checkAdminHealth(): Promise<HealthCheckResult> {
  const { ok, status, timeMs } = await fetchWithTimeout(
    `http://localhost:${NEXTJS_PORT}/api/admin/config`
  );
  return {
    service: "admin",
    healthy: ok,
    responseTimeMs: timeMs,
    message: ok ? "Admin config endpoint responding" : `Admin config returned status ${status}`,
    timestamp: new Date().toISOString(),
  };
}

async function checkWebSocketHealth(): Promise<HealthCheckResult> {
  const start = performance.now();
  try {
    const { ok, status, timeMs } = await fetchWithTimeout(
      `http://localhost:${WEBSOCKET_PORT}/`,
      { method: "GET" },
      3000
    );
    // WebSocket services may not serve HTTP, so we just check the port is reachable
    const elapsed = Math.round(performance.now() - start);
    const reachable = ok || status === 0;
    return {
      service: "websocket",
      healthy: reachable || status > 0,
      responseTimeMs: elapsed,
      message: reachable
        ? "WebSocket service port is reachable"
        : "WebSocket service is unreachable",
      timestamp: new Date().toISOString(),
    };
  } catch {
    return {
      service: "websocket",
      healthy: false,
      responseTimeMs: Math.round(performance.now() - start),
      message: "WebSocket service connection refused",
      timestamp: new Date().toISOString(),
    };
  }
}

function checkDatabaseHealth(): HealthCheckResult {
  const start = performance.now();
  try {
    const exists = existsSync(DB_PATH);
    const elapsed = Math.round(performance.now() - start);
    return {
      service: "database",
      healthy: exists,
      responseTimeMs: elapsed,
      message: exists
        ? `Database file accessible at ${DB_PATH}`
        : `Database file not found at ${DB_PATH}`,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      service: "database",
      healthy: false,
      responseTimeMs: Math.round(performance.now() - start),
      message: `Database check error: ${err instanceof Error ? err.message : String(err)}`,
      timestamp: new Date().toISOString(),
    };
  }
}

async function runAllHealthChecks(): Promise<HealthCheckResult[]> {
  const results = await Promise.all([
    checkAuthHealth(),
    checkApiHealth(),
    checkAdminHealth(),
    checkWebSocketHealth(),
    Promise.resolve(checkDatabaseHealth()),
  ]);

  healthCheckResults.length = 0;
  healthCheckResults.push(...results);

  // Detect and record new issues from failed checks
  for (const result of results) {
    if (!result.healthy) {
      // Avoid spamming: only create issue if no open issue exists for this service in the last 5 minutes
      const recentOpen = issues.find(
        (i) =>
          i.service === result.service &&
          i.status !== "resolved" &&
          Date.now() - new Date(i.timestamp).getTime() < 300_000
      );
      if (!recentOpen) {
        const issue = addIssue(
          result.service === "database"
            ? "db_error"
            : result.service === "websocket"
            ? "websocket_down"
            : "health_check_failed",
          result.service === "auth" || result.service === "admin"
            ? "critical"
            : "high",
          result.service,
          result.message
        );
        io.to("supervisor:alerts").emit("supervisor:alert", issue);
      }
    }
  }

  return results;
}

// ─── Express App & Socket.IO ─────────────────────────────────────────────────

const app = express();
app.use(express.json());

const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingInterval: 10_000,
  pingTimeout: 5_000,
});

// ─── Socket.IO Connection Handling ───────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(`[Supervisor] Client connected: ${socket.id}`);

  // Join the alerts room
  socket.join("supervisor:alerts");

  // Send current status on connect
  socket.emit("supervisor:status", buildStatusPayload());

  socket.on("disconnect", (reason) => {
    console.log(`[Supervisor] Client disconnected: ${socket.id} (${reason})`);
  });
});

// ─── REST API Endpoints ──────────────────────────────────────────────────────

/** GET /health - Returns overall service status */
app.get("/health", (_req, res) => {
  const allHealthy = healthCheckResults.length > 0 && healthCheckResults.every((r) => r.healthy);
  res.json({
    status: allHealthy ? "healthy" : "degraded",
    uptime: Math.round((Date.now() - startTime) / 1000),
    checks: healthCheckResults,
    timestamp: new Date().toISOString(),
  });
});

/** GET /api/issues - Returns all issues */
app.get("/api/issues", (req, res) => {
  const status = req.query.status as string | undefined;
  const severity = req.query.severity as string | undefined;
  const type = req.query.type as string | undefined;
  const limit = parseInt(req.query.limit as string, 10) || 100;

  let filtered = [...issues];

  if (status) {
    filtered = filtered.filter((i) => i.status === status);
  }
  if (severity) {
    filtered = filtered.filter((i) => i.severity === severity);
  }
  if (type) {
    filtered = filtered.filter((i) => i.type === type);
  }

  res.json({
    issues: filtered.slice(0, limit),
    total: issues.length,
  });
});

/** POST /api/issues - Create a new issue (e.g., from complaint API) */
app.post("/api/issues", (req, res) => {
  const body = req.body;

  const type = body.type as Issue["type"] | undefined;
  const severity = body.severity as Issue["severity"] | undefined;
  const service = body.service as string | undefined;
  const message = body.message as string | undefined;

  if (!type || !service || !message) {
    res.status(400).json({ error: "Missing required fields: type, service, message" });
    return;
  }

  const validTypes: Issue["type"][] = ["health_check_failed", "api_error", "websocket_down", "db_error", "user_complaint"];
  const validSeverities: Issue["severity"][] = ["critical", "high", "medium", "low"];

  if (!validTypes.includes(type)) {
    res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(", ")}` });
    return;
  }

  const resolvedSeverity = severity && validSeverities.includes(severity) ? severity : "medium";

  const issue = addIssue(type, resolvedSeverity, service, message);
  io.to("supervisor:alerts").emit("supervisor:alert", issue);

  res.status(201).json({ issue });
});

/** POST /api/issues/:id/assign - Assign an issue to an agent */
app.post("/api/issues/:id/assign", (req, res) => {
  const { id } = req.params;
  const { agentId } = req.body as { agentId?: string };

  if (!agentId) {
    res.status(400).json({ error: "Missing required field: agentId" });
    return;
  }

  const agent = agents.find((a) => a.id === agentId);
  if (!agent) {
    res.status(404).json({ error: `Agent not found: ${agentId}` });
    return;
  }

  const issue = issues.find((i) => i.id === id);
  if (!issue) {
    res.status(404).json({ error: `Issue not found: ${id}` });
    return;
  }

  issue.assignedAgent = agentId;
  issue.status = "investigating";

  res.json({ issue });
});

/** POST /api/issues/:id/resolve - Mark an issue as resolved */
app.post("/api/issues/:id/resolve", (req, res) => {
  const { id } = req.params;
  const { resolution } = req.body as { resolution?: string };

  const issue = issues.find((i) => i.id === id);
  if (!issue) {
    res.status(404).json({ error: `Issue not found: ${id}` });
    return;
  }

  issue.status = "resolved";
  issue.resolution = resolution || "Resolved without additional notes.";

  res.json({ issue });
});

/** GET /api/agents/status - Returns specialist agent availability */
app.get("/api/agents/status", (_req, res) => {
  res.json({ agents });
});

// ─── Status Payload Builder ──────────────────────────────────────────────────

function buildStatusPayload(): SupervisorStatus {
  return {
    uptime: Math.round((Date.now() - startTime) / 1000),
    totalIssues: issues.length,
    openIssues: issues.filter((i) => i.status === "open").length,
    criticalIssues: issues.filter((i) => i.severity === "critical" && i.status !== "resolved").length,
    healthChecks: healthCheckResults,
    agents,
    timestamp: new Date().toISOString(),
  };
}

// ─── Periodic Tasks ──────────────────────────────────────────────────────────

// Run health checks periodically
setInterval(async () => {
  try {
    await runAllHealthChecks();
  } catch (err) {
    console.error("[Supervisor] Health check error:", err);
  }
}, HEALTH_CHECK_INTERVAL_MS);

// Broadcast status periodically
setInterval(() => {
  const payload = buildStatusPayload();
  io.to("supervisor:alerts").emit("supervisor:status", payload);
}, STATUS_BROADCAST_INTERVAL_MS);

// ─── Start Server ────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`[Supervisor] AI Platform Supervisor service running on port ${PORT}`);

  // Run initial health checks after a short delay to let dependent services start
  setTimeout(async () => {
    console.log("[Supervisor] Running initial health checks...");
    const results = await runAllHealthChecks();
    for (const r of results) {
      const icon = r.healthy ? "✓" : "✗";
      console.log(`  ${icon} ${r.service}: ${r.message} (${r.responseTimeMs}ms)`);
    }
    console.log("[Supervisor] Initial health checks complete.");
  }, 2000);
});
