import { createServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import cors from "cors";

// ─── Types ───────────────────────────────────────────────────────────────────

type AgentStatus = "active" | "idle" | "processing";
type AgentTier = "core" | "premium" | "enterprise";
type AgentCategory =
  | "document"
  | "analytics"
  | "communication"
  | "career"
  | "marketplace"
  | "infrastructure"
  | "ai"
  | "education"
  | "compliance";

type ActivityEntry = {
  timestamp: number;
  type: string;
  agentId: string;
  message: string;
};

type Agent = {
  id: string;
  name: string;
  module: string;
  tier: AgentTier;
  category: AgentCategory;
  color: string;
  status: AgentStatus;
  avgResponseTime: number;
  lastSeen?: number;
};

// ─── Agent Registry (20 HireNova agents) ─────────────────────────────────────

const initialAgents: Agent[] = [
  {
    id: "cv",
    name: "CV Builder",
    module: "cv",
    tier: "core",
    category: "document",
    color: "#10b981",
    status: "idle",
    avgResponseTime: 320,
  },
  {
    id: "ats",
    name: "ATS Optimizer",
    module: "ats",
    tier: "core",
    category: "analytics",
    color: "#3b82f6",
    status: "idle",
    avgResponseTime: 280,
  },
  {
    id: "interview",
    name: "Interview Coach",
    module: "interview",
    tier: "premium",
    category: "communication",
    color: "#8b5cf6",
    status: "idle",
    avgResponseTime: 540,
  },
  {
    id: "linkedin",
    name: "LinkedIn Optimizer",
    module: "linkedin",
    tier: "premium",
    category: "communication",
    color: "#0a66c2",
    status: "idle",
    avgResponseTime: 410,
  },
  {
    id: "career",
    name: "Career Pathfinder",
    module: "career",
    tier: "core",
    category: "career",
    color: "#f59e0b",
    status: "idle",
    avgResponseTime: 620,
  },
  {
    id: "coach",
    name: "AI Coach",
    module: "coach",
    tier: "enterprise",
    category: "ai",
    color: "#ec4899",
    status: "idle",
    avgResponseTime: 350,
  },
  {
    id: "formation",
    name: "Formation Engine",
    module: "formation",
    tier: "enterprise",
    category: "education",
    color: "#14b8a6",
    status: "idle",
    avgResponseTime: 780,
  },
  {
    id: "jobs",
    name: "Job Matcher",
    module: "jobs",
    tier: "core",
    category: "marketplace",
    color: "#f97316",
    status: "idle",
    avgResponseTime: 290,
  },
  {
    id: "recruiter",
    name: "Recruiter AI",
    module: "recruiter",
    tier: "premium",
    category: "marketplace",
    color: "#6366f1",
    status: "idle",
    avgResponseTime: 450,
  },
  {
    id: "freelance",
    name: "Freelance Hub",
    module: "freelance",
    tier: "premium",
    category: "marketplace",
    color: "#84cc16",
    status: "idle",
    avgResponseTime: 380,
  },
  {
    id: "global",
    name: "Global Navigator",
    module: "global",
    tier: "enterprise",
    category: "career",
    color: "#06b6d4",
    status: "idle",
    avgResponseTime: 520,
  },
  {
    id: "api",
    name: "API Gateway",
    module: "api",
    tier: "core",
    category: "infrastructure",
    color: "#64748b",
    status: "idle",
    avgResponseTime: 120,
  },
  {
    id: "intelligence",
    name: "Market Intelligence",
    module: "intelligence",
    tier: "enterprise",
    category: "analytics",
    color: "#e11d48",
    status: "idle",
    avgResponseTime: 890,
  },
  {
    id: "mobility",
    name: "Mobility Planner",
    module: "mobility",
    tier: "premium",
    category: "career",
    color: "#a855f7",
    status: "idle",
    avgResponseTime: 670,
  },
  {
    id: "chatbot",
    name: "Support Chatbot",
    module: "chatbot",
    tier: "core",
    category: "ai",
    color: "#22c55e",
    status: "idle",
    avgResponseTime: 200,
  },
  {
    id: "campus",
    name: "Campus Connect",
    module: "campus",
    tier: "premium",
    category: "education",
    color: "#0ea5e9",
    status: "idle",
    avgResponseTime: 430,
  },
  {
    id: "marketplace",
    name: "Service Marketplace",
    module: "marketplace",
    tier: "enterprise",
    category: "marketplace",
    color: "#d946ef",
    status: "idle",
    avgResponseTime: 560,
  },
  {
    id: "whiteLabel",
    name: "White Label Studio",
    module: "whiteLabel",
    tier: "enterprise",
    category: "infrastructure",
    color: "#78716c",
    status: "idle",
    avgResponseTime: 710,
  },
  {
    id: "legal",
    name: "Legal Compliance",
    module: "legal",
    tier: "enterprise",
    category: "compliance",
    color: "#dc2626",
    status: "idle",
    avgResponseTime: 940,
  },
  {
    id: "payment",
    name: "Payment Gateway",
    module: "payment",
    tier: "core",
    category: "infrastructure",
    color: "#16a34a",
    status: "idle",
    avgResponseTime: 180,
  },
];

// ─── Runtime State ────────────────────────────────────────────────────────────

const agents: Map<string, Agent> = new Map();
for (const agent of initialAgents) {
  agents.set(agent.id, { ...agent, lastSeen: Date.now() });
}

const activityLog: ActivityEntry[] = [];
const MAX_ACTIVITY_LOG = 200;
const startTime = Date.now();

// Track simulation intervals per socket for cleanup
const simulationTimers: Map<string, ReturnType<typeof setInterval>> = new Map();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addActivity(type: string, agentId: string, message: string) {
  const entry: ActivityEntry = {
    timestamp: Date.now(),
    type,
    agentId,
    message,
  };
  activityLog.unshift(entry);
  if (activityLog.length > MAX_ACTIVITY_LOG) {
    activityLog.length = MAX_ACTIVITY_LOG;
  }
  return entry;
}

function getUptimeSeconds(): number {
  return Math.floor((Date.now() - startTime) / 1000);
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Simulation Messages ─────────────────────────────────────────────────────

const simulationActivities: Record<string, string[]> = {
  cv: [
    "Processing CV generation task",
    "Completed ATS-friendly CV for user",
    "Analyzing CV keyword density",
    "Generating tailored CV template",
  ],
  ats: [
    "Scoring resume against job description",
    "Optimizing keyword placement",
    "Running ATS compatibility check",
    "Generating ATS improvement report",
  ],
  interview: [
    "Conducting mock interview session",
    "Analyzing interview response quality",
    "Generating behavioral question set",
    "Evaluating technical answer patterns",
  ],
  linkedin: [
    "Optimizing profile headline",
    "Analyzing connection network",
    "Generating engagement post draft",
    "Reviewing profile SEO keywords",
  ],
  career: [
    "Completed roadmap analysis",
    "Generating career transition plan",
    "Analyzing skill gap report",
    "Building personalized career path",
  ],
  coach: [
    "Delivering coaching session",
    "Analyzing user progress metrics",
    "Generating personalized action items",
    "Evaluating goal completion rate",
  ],
  formation: [
    "Building training curriculum",
    "Analyzing skill assessment results",
    "Generating module content outline",
    "Evaluating learning path progress",
  ],
  jobs: [
    "Matching candidate to job listings",
    "Analyzing job market trends",
    "Ranking job fit scores",
    "Processing job alert subscriptions",
  ],
  recruiter: [
    "Screening candidate profiles",
    "Generating interview schedule",
    "Analyzing talent pipeline metrics",
    "Processing recruitment workflow",
  ],
  freelance: [
    "Matching freelancer to project",
    "Analyzing project requirements",
    "Generating proposal templates",
    "Processing milestone completion",
  ],
  global: [
    "Analyzing international job markets",
    "Processing visa requirement checks",
    "Generating relocation plan",
    "Evaluating cross-border compliance",
  ],
  api: [
    "Processing API request batch",
    "Validating authentication tokens",
    "Rate-limiting traffic analysis",
    "Routing service requests",
  ],
  intelligence: [
    "Scraping market salary data",
    "Analyzing industry trend reports",
    "Generating competitive intelligence brief",
    "Processing demand forecasting model",
  ],
  mobility: [
    "Planning international relocation",
    "Processing mobility assessment",
    "Generating cost-of-living comparison",
    "Evaluating destination rankings",
  ],
  chatbot: [
    "Processing user support query",
    "Generating contextual response",
    "Escalating complex ticket",
    "Analyzing conversation sentiment",
  ],
  campus: [
    "Processing campus recruitment drive",
    "Analyzing student skill profiles",
    "Generating campus event schedule",
    "Matching interns to placements",
  ],
  marketplace: [
    "Processing service listing update",
    "Analyzing marketplace transactions",
    "Generating vendor performance report",
    "Processing service review aggregation",
  ],
  whiteLabel: [
    "Configuring white-label branding",
    "Processing tenant customization",
    "Generating deployment package",
    "Validating brand compliance rules",
  ],
  legal: [
    "Processing GDPR compliance check",
    "Analyzing contract terms",
    "Generating data processing agreement",
    "Reviewing privacy policy updates",
  ],
  payment: [
    "Processing payment transaction",
    "Validating subscription billing",
    "Generating invoice report",
    "Processing refund request",
  ],
};

// ─── HTTP Server + Socket.IO ─────────────────────────────────────────────────

const httpServer = createServer((req, res) => {
  // Health endpoint
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        agents: agents.size,
        uptime: getUptimeSeconds(),
      })
    );
    return;
  }

  // 404 for everything else
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
  },
});

// ─── Event Handlers ──────────────────────────────────────────────────────────

io.on("connection", (socket: Socket) => {
  const socketId = socket.id;

  console.log(`[orchestration] Client connected: ${socketId}`);

  // Join the global orchestration room
  socket.join("orchestration");

  // Also have the socket join every agent room so it can receive dispatched tasks
  for (const agentId of agents.keys()) {
    socket.join(`agent:${agentId}`);
  }

  // Log the connection
  const connEntry = addActivity(
    "connection",
    "system",
    `Client ${socketId} connected to orchestration`
  );
  io.to("orchestration").emit("activity:new", connEntry);

  // ── agent:status ──
  socket.on("agent:status", (payload: { agentId: string; status: AgentStatus }) => {
    const { agentId, status } = payload;
    const agent = agents.get(agentId);
    if (!agent) {
      socket.emit("error", { message: `Unknown agent: ${agentId}` });
      return;
    }
    agent.status = status;
    agent.lastSeen = Date.now();

    const entry = addActivity("status_change", agentId, `Agent ${agent.name} status changed to ${status}`);
    io.to("orchestration").emit("agent:status:updated", { agentId, status, lastSeen: agent.lastSeen });
    io.to("orchestration").emit("activity:new", entry);
  });

  // ── agent:heartbeat ──
  socket.on("agent:heartbeat", (payload: { agentId: string }) => {
    const { agentId } = payload;
    const agent = agents.get(agentId);
    if (!agent) return;
    agent.lastSeen = Date.now();
    io.to("orchestration").emit("agent:heartbeat:ack", {
      agentId,
      lastSeen: agent.lastSeen,
    });
  });

  // ── agent:dispatch ──
  socket.on(
    "agent:dispatch",
    (payload: { fromAgent: string; toAgent: string; task: string; data?: unknown }) => {
      const { fromAgent, toAgent, task, data } = payload;
      const from = agents.get(fromAgent);
      const to = agents.get(toAgent);
      if (!from || !to) {
        socket.emit("error", {
          message: `Unknown agent in dispatch: ${!from ? fromAgent : toAgent}`,
        });
        return;
      }

      const taskId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Update source agent to processing
      from.status = "processing";
      from.lastSeen = Date.now();

      const entry = addActivity(
        "dispatch",
        fromAgent,
        `Dispatched task '${task}' to ${to.name}`
      );

      io.to("orchestration").emit("agent:status:updated", {
        agentId: fromAgent,
        status: "processing",
        lastSeen: from.lastSeen,
      });

      io.to(`agent:${toAgent}`).emit("task:received", {
        taskId,
        fromAgent,
        fromAgentName: from.name,
        task,
        data,
        timestamp: Date.now(),
      });

      io.to("orchestration").emit("activity:new", entry);
    }
  );

  // ── agent:result ──
  socket.on(
    "agent:result",
    (payload: { fromAgent: string; taskId: string; result: unknown }) => {
      const { fromAgent, taskId, result } = payload;
      const agent = agents.get(fromAgent);
      if (!agent) return;

      agent.status = "active";
      agent.lastSeen = Date.now();

      const entry = addActivity(
        "result",
        fromAgent,
        `Completed task ${taskId.substring(0, 12)}…`
      );

      io.to("orchestration").emit("agent:result:broadcast", {
        fromAgent,
        fromAgentName: agent.name,
        taskId,
        result,
        timestamp: Date.now(),
      });

      io.to("orchestration").emit("agent:status:updated", {
        agentId: fromAgent,
        status: "active",
        lastSeen: agent.lastSeen,
      });

      io.to("orchestration").emit("activity:new", entry);
    }
  );

  // ── get:agents ──
  socket.on("get:agents", () => {
    const agentList = Array.from(agents.values());
    socket.emit("agents:list", { agents: agentList, timestamp: Date.now() });
  });

  // ── get:activity ──
  socket.on("get:activity", () => {
    socket.emit("activity:log", {
      events: activityLog.slice(0, 50),
      total: activityLog.length,
      timestamp: Date.now(),
    });
  });

  // ── disconnect ──
  socket.on("disconnect", (reason) => {
    console.log(`[orchestration] Client disconnected: ${socketId} (${reason})`);

    // Clear simulation timer for this socket
    const timer = simulationTimers.get(socketId);
    if (timer) {
      clearInterval(timer);
      simulationTimers.delete(socketId);
    }

    const entry = addActivity(
      "disconnection",
      "system",
      `Client ${socketId} disconnected (${reason})`
    );
    io.to("orchestration").emit("activity:new", entry);
  });

  // ─── Simulation Loop ───────────────────────────────────────────────────────
  // Starts when a client connects; generates realistic agent activity

  function runSimulationTick() {
    const agentIds = Array.from(agents.keys());
    // Pick 1-3 random agents to update
    const count = randomBetween(1, 3);

    for (let i = 0; i < count; i++) {
      const agentId = agentIds[randomBetween(0, agentIds.length - 1)];
      const agent = agents.get(agentId);
      if (!agent) continue;

      const prevStatus = agent.status;

      // State machine: idle → processing → active → idle
      if (agent.status === "idle") {
        agent.status = "processing";
      } else if (agent.status === "processing") {
        agent.status = "active";
      } else {
        agent.status = "idle";
      }

      agent.lastSeen = Date.now();

      // Only emit if status changed
      if (prevStatus !== agent.status) {
        io.to("orchestration").emit("agent:status:updated", {
          agentId,
          status: agent.status,
          lastSeen: agent.lastSeen,
        });
      }

      // Generate activity message for processing or active transitions
      if (agent.status === "processing" || agent.status === "active") {
        const messages = simulationActivities[agentId];
        if (messages && messages.length > 0) {
          const msg = messages[randomBetween(0, messages.length - 1)];
          const entry = addActivity(
            agent.status === "processing" ? "task_start" : "task_complete",
            agentId,
            `Agent ${agent.name} ${msg}`
          );
          io.to("orchestration").emit("activity:new", entry);
        }
      }
    }
  }

  // Run first tick immediately, then every 3-8 seconds
  runSimulationTick();
  const interval = setInterval(() => {
    runSimulationTick();
  }, randomBetween(3000, 8000));

  simulationTimers.set(socketId, interval);

  // Send initial state to the connecting client
  socket.emit("agents:list", {
    agents: Array.from(agents.values()),
    timestamp: Date.now(),
  });

  socket.emit("activity:log", {
    events: activityLog.slice(0, 50),
    total: activityLog.length,
    timestamp: Date.now(),
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────

const PORT = 3004;

httpServer.listen(PORT, () => {
  console.log(`[orchestration] HireNova Orchestration Service running on port ${PORT}`);
  console.log(`[orchestration] ${agents.size} agents registered`);
  console.log(`[orchestration] Health: http://localhost:${PORT}/health`);
});
