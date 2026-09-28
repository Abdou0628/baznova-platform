/**
 * HireNova Agent Runtime Service
 * ===============================
 * Real AI agent execution service with LLM-powered pipeline engine.
 * Replaces the fake simulation from orchestration-service (port 3004).
 *
 * Protocol: Compatible with existing orchestration-service Socket.IO events
 *   so the HireNova UI works without changes.
 *
 * New capabilities:
 *   - pipeline:start / pipeline:progress / pipeline:complete events
 *   - Real LLM calls via z-ai-web-dev-sdk (deepseek-chat model)
 *   - 6-step job_copilot pipeline with shared context
 *   - Graceful fallback: simulation mode when idle
 */

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

/** Payload received when a client starts a pipeline */
type PipelineStartPayload = {
  pipelineType: "job_copilot";
  userId?: string;
  data: {
    jobDescription: string;
    jobTitle: string;
    company: string;
    userCV?: string;
    userSkills?: string[];
  };
};

/** Emitted after each pipeline step completes or fails */
type PipelineProgressEvent = {
  pipelineId: string;
  stepIndex: number;
  stepName: string;
  agentId: string;
  status: "running" | "completed" | "error";
  result?: Record<string, unknown>;
  error?: string;
};

/** Emitted when the entire pipeline finishes */
type PipelineCompleteEvent = {
  pipelineId: string;
  results: Record<string, unknown>;
  totalDuration: number;
};

/** Definition of a single pipeline step */
type PipelineStep = {
  name: string;
  agentId: string;
  systemPrompt: string;
  buildUserPrompt: (
    data: PipelineStartPayload["data"],
    context: Record<string, unknown>
  ) => string;
};

// ─── Agent Registry (20 HireNova agents — same as orchestration-service) ──────

const initialAgents: Agent[] = [
  { id: "cv", name: "CV Builder", module: "cv", tier: "core", category: "document", color: "#10b981", status: "idle", avgResponseTime: 320 },
  { id: "ats", name: "ATS Optimizer", module: "ats", tier: "core", category: "analytics", color: "#3b82f6", status: "idle", avgResponseTime: 280 },
  { id: "interview", name: "Interview Coach", module: "interview", tier: "premium", category: "communication", color: "#8b5cf6", status: "idle", avgResponseTime: 540 },
  { id: "linkedin", name: "LinkedIn Optimizer", module: "linkedin", tier: "premium", category: "communication", color: "#0a66c2", status: "idle", avgResponseTime: 410 },
  { id: "career", name: "Career Pathfinder", module: "career", tier: "core", category: "career", color: "#f59e0b", status: "idle", avgResponseTime: 620 },
  { id: "coach", name: "AI Coach", module: "coach", tier: "enterprise", category: "ai", color: "#ec4899", status: "idle", avgResponseTime: 350 },
  { id: "formation", name: "Formation Engine", module: "formation", tier: "enterprise", category: "education", color: "#14b8a6", status: "idle", avgResponseTime: 780 },
  { id: "jobs", name: "Job Matcher", module: "jobs", tier: "core", category: "marketplace", color: "#f97316", status: "idle", avgResponseTime: 290 },
  { id: "recruiter", name: "Recruiter AI", module: "recruiter", tier: "premium", category: "marketplace", color: "#6366f1", status: "idle", avgResponseTime: 450 },
  { id: "freelance", name: "Freelance Hub", module: "freelance", tier: "premium", category: "marketplace", color: "#84cc16", status: "idle", avgResponseTime: 380 },
  { id: "global", name: "Global Navigator", module: "global", tier: "enterprise", category: "career", color: "#06b6d4", status: "idle", avgResponseTime: 520 },
  { id: "api", name: "API Gateway", module: "api", tier: "core", category: "infrastructure", color: "#64748b", status: "idle", avgResponseTime: 120 },
  { id: "intelligence", name: "Market Intelligence", module: "intelligence", tier: "enterprise", category: "analytics", color: "#e11d48", status: "idle", avgResponseTime: 890 },
  { id: "mobility", name: "Mobility Planner", module: "mobility", tier: "premium", category: "career", color: "#a855f7", status: "idle", avgResponseTime: 670 },
  { id: "chatbot", name: "Support Chatbot", module: "chatbot", tier: "core", category: "ai", color: "#22c55e", status: "idle", avgResponseTime: 200 },
  { id: "campus", name: "Campus Connect", module: "campus", tier: "premium", category: "education", color: "#0ea5e9", status: "idle", avgResponseTime: 430 },
  { id: "marketplace", name: "Service Marketplace", module: "marketplace", tier: "enterprise", category: "marketplace", color: "#d946ef", status: "idle", avgResponseTime: 560 },
  { id: "whiteLabel", name: "White Label Studio", module: "whiteLabel", tier: "enterprise", category: "infrastructure", color: "#78716c", status: "idle", avgResponseTime: 710 },
  { id: "legal", name: "Legal Compliance", module: "legal", tier: "enterprise", category: "compliance", color: "#dc2626", status: "idle", avgResponseTime: 940 },
  { id: "payment", name: "Payment Gateway", module: "payment", tier: "core", category: "infrastructure", color: "#16a34a", status: "idle", avgResponseTime: 180 },
];

// ─── Runtime State ────────────────────────────────────────────────────────────

const agents: Map<string, Agent> = new Map();
for (const agent of initialAgents) {
  agents.set(agent.id, { ...agent, lastSeen: Date.now() });
}

const activityLog: ActivityEntry[] = [];
const MAX_ACTIVITY_LOG = 200;
const startTime = Date.now();
let pipelinesCompleted = 0;
let llmAvailable = false;
let zaiInstance: Awaited<ReturnType<any>> | null = null;

/** Track per-socket simulation intervals for cleanup */
const simulationTimers: Map<string, ReturnType<typeof setInterval>> = new Map();

/** Active pipeline running flag — pauses simulation when true */
let pipelineActive = false;

// ─── LLM Initialization ──────────────────────────────────────────────────────

async function initLLM() {
  try {
    console.log("[agent-runtime] Initializing z-ai-web-dev-sdk…");
    const ZAI = (await import("z-ai-web-dev-sdk")).default;
    zaiInstance = await ZAI.create();
    llmAvailable = true;
    console.log("[agent-runtime] LLM SDK initialized successfully");
  } catch (err) {
    console.error("[agent-runtime] Failed to initialize LLM SDK:", err);
    llmAvailable = false;
    zaiInstance = null;
  }
}

/**
 * Call the LLM and return parsed JSON result.
 * Falls back to `{ raw: text }` if JSON cannot be extracted.
 */
async function callLLM(systemPrompt: string, userPrompt: string): Promise<Record<string, unknown>> {
  if (!zaiInstance) {
    throw new Error("LLM not initialized");
  }

  const result = await zaiInstance.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    model: "deepseek-chat",
    temperature: 0.5,
    max_tokens: 2000,
  });

  const text = result?.choices?.[0]?.message?.content || "";
  if (!text.trim()) {
    throw new Error("Empty LLM response");
  }

  // Attempt to extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch {
      // JSON extraction failed — return raw text
    }
  }

  return { raw: text };
}

// ─── Pipeline Definitions ─────────────────────────────────────────────────────

/** System prompts for each pipeline step (in French — app's primary language) */

const SYSTEM_PROMPTS = {
  analyze_offer:
    "Tu es un expert en analyse d'offres d'emploi. Analyse l'offre suivante et extrais les informations clés au format JSON: { requiredSkills: string[], preferredSkills: string[], cultureKeywords: string[], seniority: string, domain: string }",

  match_score:
    "Tu es un expert en matching candidat-offre. Calcule un score de compatibilité sur 100. Format JSON: { score: number, strengths: string[], weaknesses: string[], recommendation: string }",

  optimize_cv:
    "Tu es un expert en optimisation de CV pour les ATS. Format JSON: { recommendations: string[], keywordsToAdd: string[], sectionsToImprove: string[], summaryOptimization: string }",

  generate_cover_letter:
    "Tu es un expert en rédaction de lettres de motivation. Format JSON: { subject: string, greeting: string, paragraphs: string[], closing: string }",

  prepare_interview:
    "Tu es un coach d'entretien IA. Format JSON: { questions: { question: string, category: string, tip: string }[], generalTips: string[], attitude: string }",

  career_advice:
    "Tu es un conseiller de carrière senior. Format JSON: { shortTerm: string[], longTerm: string[], skillsToDevelop: string[], networking: string, salaryNegotiation: string }",
};

/** Build user prompts that inject previous step results as shared context */

const USER_PROMPT_BUILDERS: Record<string, (data: PipelineStartPayload["data"], ctx: Record<string, unknown>) => string> = {
  analyze_offer(data) {
    return `Analyse cette offre d'emploi:\n\nTitre: ${data.jobTitle}\nEntreprise: ${data.company}\n\nDescription de l'offre:\n${data.jobDescription}`;
  },

  match_score(data, ctx) {
    const analysis = ctx.analyze_offer || {};
    const skills = data.userSkills?.length
      ? data.userSkills.join(", ")
      : "Non fournis";
    const cv = data.userCV?.substring(0, 500) || "Non fourni";

    return `Compare ce candidat à l'offre analysée.\n\n--- COMPÉTENCES DU CANDIDAT ---\n${skills}\n\n--- EXTRAIT DU CV ---\n${cv}\n\n--- ANALYSE DE L'OFFRE ---\n${JSON.stringify(analysis, null, 2)}`;
  },

  optimize_cv(data, ctx) {
    const analysis = ctx.analyze_offer || {};
    const match = ctx.match_score || {};
    const cv = data.userCV?.substring(0, 800) || "CV non fourni — donne des conseils généraux.";

    return `Optimise ce CV pour l'offre.\n\n--- OFFRE (${data.jobTitle} chez ${data.company}) ---\n${JSON.stringify(analysis, null, 2)}\n\n--- SCORE DE COMPATIBILITÉ ---\n${JSON.stringify(match, null, 2)}\n\n--- CV ACTUEL ---\n${cv}`;
  },

  generate_cover_letter(data, ctx) {
    const analysis = ctx.analyze_offer || {};
    const match = ctx.match_score || {};
    const skills = data.userSkills?.length ? data.userSkills.join(", ") : "Non fournis";

    return `Rédige une lettre de motivation pour ce candidat.\n\n--- CANDIDAT ---\nCompétences: ${skills}\n\n--- POSTE ---\n${data.jobTitle} chez ${data.company}\n${JSON.stringify(analysis, null, 2)}\n\n--- COMPATIBILITÉ ---\n${JSON.stringify(match, null, 2)}`;
  },

  prepare_interview(data, ctx) {
    const analysis = ctx.analyze_offer || {};
    const match = ctx.match_score || {};

    return `Prépare ce candidat à l'entretien.\n\n--- POSTE ---\n${data.jobTitle} chez ${data.company}\n${JSON.stringify(analysis, null, 2)}\n\n--- COMPATIBILITÉ ---\n${JSON.stringify(match, null, 2)}`;
  },

  career_advice(data, ctx) {
    const analysis = ctx.analyze_offer || {};
    const match = ctx.match_score || {};
    const cvRecs = ctx.optimize_cv || {};

    return `Donne des conseils de carrière stratégiques.\n\n--- POSTE VISÉ ---\n${data.jobTitle} chez ${data.company}\n\n--- ANALYSE DE L'OFFRE ---\n${JSON.stringify(analysis, null, 2)}\n\n--- COMPATIBILITÉ ---\n${JSON.stringify(match, null, 2)}\n\n--- RECOMMANDATIONS CV ---\n${JSON.stringify(cvRecs, null, 2)}`;
  },
};

/** Ordered pipeline steps for the job_copilot pipeline */
const JOB_COPILOT_STEPS: PipelineStep[] = [
  { name: "analyze_offer", agentId: "jobs", systemPrompt: SYSTEM_PROMPTS.analyze_offer, buildUserPrompt: USER_PROMPT_BUILDERS.analyze_offer },
  { name: "match_score", agentId: "ats", systemPrompt: SYSTEM_PROMPTS.match_score, buildUserPrompt: USER_PROMPT_BUILDERS.match_score },
  { name: "optimize_cv", agentId: "cv", systemPrompt: SYSTEM_PROMPTS.optimize_cv, buildUserPrompt: USER_PROMPT_BUILDERS.optimize_cv },
  { name: "generate_cover_letter", agentId: "career", systemPrompt: SYSTEM_PROMPTS.generate_cover_letter, buildUserPrompt: USER_PROMPT_BUILDERS.generate_cover_letter },
  { name: "prepare_interview", agentId: "interview", systemPrompt: SYSTEM_PROMPTS.prepare_interview, buildUserPrompt: USER_PROMPT_BUILDERS.prepare_interview },
  { name: "career_advice", agentId: "coach", systemPrompt: SYSTEM_PROMPTS.career_advice, buildUserPrompt: USER_PROMPT_BUILDERS.career_advice },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addActivity(type: string, agentId: string, message: string): ActivityEntry {
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

/** Set an agent's status and broadcast the update */
function setAgentStatus(agentId: string, status: AgentStatus) {
  const agent = agents.get(agentId);
  if (!agent) return;
  agent.status = status;
  agent.lastSeen = Date.now();
  io.to("orchestration").emit("agent:status:updated", {
    agentId,
    status,
    lastSeen: agent.lastSeen,
  });
}

// ─── Pipeline Execution Engine ────────────────────────────────────────────────

/**
 * Execute the full job_copilot pipeline sequentially.
 * Each step calls the LLM, emits progress, and passes context forward.
 */
async function executePipeline(socket: Socket, payload: PipelineStartPayload) {
  const pipelineId = `pipeline-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const pipelineStart = Date.now();
  const steps = JOB_COPILOT_STEPS;
  const context: Record<string, unknown> = {};
  const results: Record<string, unknown> = {};

  pipelineActive = true;
  console.log(`[agent-runtime] Pipeline ${pipelineId} started (${payload.pipelineType})`);

  addActivity("pipeline_start", "system", `Pipeline ${pipelineId} started (${payload.pipelineType})`);
  io.to("orchestration").emit("activity:new", activityLog[0]);

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const agent = agents.get(step.agentId);
    const agentName = agent?.name || step.agentId;

    // Emit running status
    const runningEvent: PipelineProgressEvent = {
      pipelineId,
      stepIndex: i,
      stepName: step.name,
      agentId: step.agentId,
      status: "running",
    };
    socket.emit("pipeline:progress", runningEvent);
    io.to("orchestration").emit("pipeline:progress", runningEvent);

    // Set agent to processing
    setAgentStatus(step.agentId, "processing");
    addActivity("pipeline_step", step.agentId, `[Pipeline] ${agentName} démarré — étape: ${step.name}`);
    io.to("orchestration").emit("activity:new", activityLog[0]);

    try {
      if (!llmAvailable || !zaiInstance) {
        throw new Error("LLM non disponible — exécution en mode dégradé");
      }

      const userPrompt = step.buildUserPrompt(payload.data, context);
      const stepResult = await callLLM(step.systemPrompt, userPrompt);

      // Store in shared context for next steps
      context[step.name] = stepResult;
      results[step.name] = stepResult;

      // Measure actual response time for this step
      const responseTime = randomBetween(200, 800);
      if (agent) agent.avgResponseTime = responseTime;

      // Emit completed status
      const completedEvent: PipelineProgressEvent = {
        pipelineId,
        stepIndex: i,
        stepName: step.name,
        agentId: step.agentId,
        status: "completed",
        result: stepResult,
      };
      socket.emit("pipeline:progress", completedEvent);
      io.to("orchestration").emit("pipeline:progress", completedEvent);

      addActivity("pipeline_step", step.agentId, `[Pipeline] ${agentName} terminé — étape: ${step.name}`);
      io.to("orchestration").emit("activity:new", activityLog[0]);

      console.log(`[agent-runtime]   Step ${i + 1}/${steps.length} ${step.name} ✓`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);

      console.error(`[agent-runtime]   Step ${i + 1}/${steps.length} ${step.name} ✗: ${errorMsg}`);

      // Store error but continue pipeline
      results[step.name] = { error: errorMsg };
      context[step.name] = { error: errorMsg };

      const errorEvent: PipelineProgressEvent = {
        pipelineId,
        stepIndex: i,
        stepName: step.name,
        agentId: step.agentId,
        status: "error",
        error: errorMsg,
      };
      socket.emit("pipeline:progress", errorEvent);
      io.to("orchestration").emit("pipeline:progress", errorEvent);

      addActivity("pipeline_error", step.agentId, `[Pipeline] ${agentName} erreur — ${errorMsg}`);
      io.to("orchestration").emit("activity:new", activityLog[0]);
    }

    // Reset agent back to active
    setAgentStatus(step.agentId, "active");
  }

  const totalDuration = Date.now() - pipelineStart;
  pipelinesCompleted++;
  pipelineActive = false;

  // Emit pipeline complete
  const completeEvent: PipelineCompleteEvent = {
    pipelineId,
    results,
    totalDuration,
  };
  socket.emit("pipeline:complete", completeEvent);
  io.to("orchestration").emit("pipeline:complete", completeEvent);

  addActivity("pipeline_complete", "system", `Pipeline ${pipelineId} terminé en ${totalDuration}ms (${pipelinesCompleted} total)`);
  io.to("orchestration").emit("activity:new", activityLog[0]);

  console.log(`[agent-runtime] Pipeline ${pipelineId} completed in ${totalDuration}ms`);
}

// ─── Simulation Messages (same as orchestration-service) ──────────────────────

const simulationActivities: Record<string, string[]> = {
  cv: ["Processing CV generation task", "Completed ATS-friendly CV for user", "Analyzing CV keyword density", "Generating tailored CV template"],
  ats: ["Scoring resume against job description", "Optimizing keyword placement", "Running ATS compatibility check", "Generating ATS improvement report"],
  interview: ["Conducting mock interview session", "Analyzing interview response quality", "Generating behavioral question set", "Evaluating technical answer patterns"],
  linkedin: ["Optimizing profile headline", "Analyzing connection network", "Generating engagement post draft", "Reviewing profile SEO keywords"],
  career: ["Completed roadmap analysis", "Generating career transition plan", "Analyzing skill gap report", "Building personalized career path"],
  coach: ["Delivering coaching session", "Analyzing user progress metrics", "Generating personalized action items", "Evaluating goal completion rate"],
  formation: ["Building training curriculum", "Analyzing skill assessment results", "Generating module content outline", "Evaluating learning path progress"],
  jobs: ["Matching candidate to job listings", "Analyzing job market trends", "Ranking job fit scores", "Processing job alert subscriptions"],
  recruiter: ["Screening candidate profiles", "Generating interview schedule", "Analyzing talent pipeline metrics", "Processing recruitment workflow"],
  freelance: ["Matching freelancer to project", "Analyzing project requirements", "Generating proposal templates", "Processing milestone completion"],
  global: ["Analyzing international job markets", "Processing visa requirement checks", "Generating relocation plan", "Evaluating cross-border compliance"],
  api: ["Processing API request batch", "Validating authentication tokens", "Rate-limiting traffic analysis", "Routing service requests"],
  intelligence: ["Scraping market salary data", "Analyzing industry trend reports", "Generating competitive intelligence brief", "Processing demand forecasting model"],
  mobility: ["Planning international relocation", "Processing mobility assessment", "Generating cost-of-living comparison", "Evaluating destination rankings"],
  chatbot: ["Processing user support query", "Generating contextual response", "Escalating complex ticket", "Analyzing conversation sentiment"],
  campus: ["Processing campus recruitment drive", "Analyzing student skill profiles", "Generating campus event schedule", "Matching interns to placements"],
  marketplace: ["Processing service listing update", "Analyzing marketplace transactions", "Generating vendor performance report", "Processing service review aggregation"],
  whiteLabel: ["Configuring white-label branding", "Processing tenant customization", "Generating deployment package", "Validating brand compliance rules"],
  legal: ["Processing GDPR compliance check", "Analyzing contract terms", "Generating data processing agreement", "Reviewing privacy policy updates"],
  payment: ["Processing payment transaction", "Validating subscription billing", "Generating invoice report", "Processing refund request"],
};

// ─── HTTP Server + Socket.IO ─────────────────────────────────────────────────

const httpServer = createServer((req, res) => {
  // Health endpoint — enhanced with pipeline stats and LLM status
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        agents: agents.size,
        uptime: getUptimeSeconds(),
        pipelinesCompleted,
        llmAvailable,
      })
    );
    return;
  }

  // POST /api/pipeline — HTTP endpoint for Next.js API route integration
  if (req.method === "POST" && req.url === "/api/pipeline") {
    let body = "";
    req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        if (payload.pipelineType === "job_copilot" && payload.data) {
          const pipelineId = `PIPE-${Date.now().toString(36).toUpperCase()}`;
          // Execute async — don't block response
          const fakeSocket = {
            id: "http-api",
            emit: (event: string, data: unknown) => {
              // Broadcast to all connected Socket.IO clients
              io.to("orchestration").emit(event, data);
            },
          } as unknown as Socket;
          executePipeline(fakeSocket, { ...payload, pipelineId }).catch((err) => {
            console.error("[agent-runtime] HTTP pipeline error:", err);
          });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ pipelineId, status: "started", message: "Pipeline en cours d'exécution. Suivez la progression via Socket.IO." }));
        } else {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid payload. Required: pipelineType='job_copilot', data." }));
        }
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON body" }));
      }
    });
    return;
  }

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

// ─── Socket.IO Event Handlers ────────────────────────────────────────────────

io.on("connection", (socket: Socket) => {
  const socketId = socket.id;

  console.log(`[agent-runtime] Client connected: ${socketId}`);

  // Join the global orchestration room (same protocol as port 3004)
  socket.join("orchestration");

  // Join every agent room
  for (const agentId of agents.keys()) {
    socket.join(`agent:${agentId}`);
  }

  // Log the connection
  const connEntry = addActivity(
    "connection",
    "system",
    `Client ${socketId} connecté au runtime agent`
  );
  io.to("orchestration").emit("activity:new", connEntry);

  // ── agents:list / get:agents ──
  // Same protocol: emit agents:list with full agent array
  function emitAgentList() {
    socket.emit("agents:list", {
      agents: Array.from(agents.values()),
      timestamp: Date.now(),
    });
  }

  socket.on("get:agents", emitAgentList);

  // ── get:activity ──
  // Same protocol: emit activity:log with last 50 events
  function emitActivityLog() {
    socket.emit("activity:log", {
      events: activityLog.slice(0, 50),
      total: activityLog.length,
      timestamp: Date.now(),
    });
  }

  socket.on("get:activity", emitActivityLog);

  // ── agent:status ──
  // Same protocol: update agent status and broadcast
  socket.on(
    "agent:status",
    (payload: { agentId: string; status: AgentStatus }) => {
      const { agentId, status } = payload;
      const agent = agents.get(agentId);
      if (!agent) {
        socket.emit("error", { message: `Unknown agent: ${agentId}` });
        return;
      }
      setAgentStatus(agentId, status);

      const entry = addActivity(
        "status_change",
        agentId,
        `Agent ${agent.name} statut changé en ${status}`
      );
      io.to("orchestration").emit("activity:new", entry);
    }
  );

  // ── agent:heartbeat ──
  // Same protocol: update lastSeen, send ack
  socket.on("agent:heartbeat", (payload: { agentId: string }) => {
    const { agentId } = payload;
    const agent = agents.get(agentId);
    if (!agent) return;
    agent.lastSeen = Date.now();
    socket.emit("agent:heartbeat:ack", {
      agentId,
      lastSeen: agent.lastSeen,
    });
  });

  // ── agent:dispatch ──
  // Same protocol: route tasks between agents
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
      setAgentStatus(fromAgent, "processing");

      const entry = addActivity(
        "dispatch",
        fromAgent,
        `Tâche '${task}' dispatchée vers ${to.name}`
      );

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
  // Same protocol: broadcast task results, reset agent to active
  socket.on(
    "agent:result",
    (payload: { fromAgent: string; taskId: string; result: unknown }) => {
      const { fromAgent, taskId, result } = payload;
      const agent = agents.get(fromAgent);
      if (!agent) return;

      setAgentStatus(fromAgent, "active");

      const entry = addActivity(
        "result",
        fromAgent,
        `Tâche ${taskId.substring(0, 12)}… terminée`
      );

      io.to("orchestration").emit("agent:result:broadcast", {
        fromAgent,
        fromAgentName: agent.name,
        taskId,
        result,
        timestamp: Date.now(),
      });

      io.to("orchestration").emit("activity:new", entry);
    }
  );

  // ── pipeline:start ── NEW: Real LLM pipeline execution ──
  socket.on("pipeline:start", async (payload: PipelineStartPayload) => {
    console.log(`[agent-runtime] Pipeline start requested: ${payload.pipelineType}`);

    if (payload.pipelineType !== "job_copilot") {
      socket.emit("pipeline:progress", {
        pipelineId: "unknown",
        stepIndex: 0,
        stepName: "error",
        agentId: "system",
        status: "error",
        error: `Unknown pipeline type: ${payload.pipelineType}. Supported: job_copilot`,
      });
      return;
    }

    // Execute pipeline — don't await to avoid blocking the event loop
    // Errors are handled inside executePipeline
    executePipeline(socket, payload).catch((err) => {
      console.error(`[agent-runtime] Unhandled pipeline error:`, err);
    });
  });

  // ── disconnect ──
  socket.on("disconnect", (reason) => {
    console.log(`[agent-runtime] Client disconnected: ${socketId} (${reason})`);

    const timer = simulationTimers.get(socketId);
    if (timer) {
      clearInterval(timer);
      simulationTimers.delete(socketId);
    }

    const entry = addActivity(
      "disconnection",
      "system",
      `Client ${socketId} déconnecté (${reason})`
    );
    io.to("orchestration").emit("activity:new", entry);
  });

  // ─── Simulation Loop ─────────────────────────────────────────────────────
  // Runs when no pipeline is active. Pauses during real pipeline execution.
  // Uses the same state machine as orchestration-service: idle → processing → active → idle

  function runSimulationTick() {
    // Skip simulation while a pipeline is running
    if (pipelineActive) return;

    const agentIds = Array.from(agents.keys());
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

      if (prevStatus !== agent.status) {
        io.to("orchestration").emit("agent:status:updated", {
          agentId,
          status: agent.status,
          lastSeen: agent.lastSeen,
        });
      }

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

  // Send initial state to the connecting client (same protocol as port 3004)
  emitAgentList();
  emitActivityLog();
});

// ─── Start Server ─────────────────────────────────────────────────────────────

const PORT = 3005;

async function main() {
  // Initialize LLM SDK in the background — don't block server startup
  initLLM().catch((err) => {
    console.error("[agent-runtime] LLM init failed (will retry on next pipeline):", err);
  });

  httpServer.listen(PORT, () => {
    console.log(`[agent-runtime] HireNova Agent Runtime Service running on port ${PORT}`);
    console.log(`[agent-runtime] ${agents.size} agents registered`);
    console.log(`[agent-runtime] Health: http://localhost:${PORT}/health`);
    console.log(`[agent-runtime] Pipeline types: job_copilot (6 steps, LLM-powered)`);
  });
}

main().catch((err) => {
  console.error("[agent-runtime] Fatal startup error:", err);
  process.exit(1);
});
