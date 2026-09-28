// =============================================================================
// HireNova IA — Agent Bus Service (Real Inter-Agent Event Bus)
// Port 30055
//
// Real event bus: agents POST events, the bus persists them, broadcasts via
// Socket.IO, and triggers reactions on collaborating agents.
// =============================================================================

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

// ─── Constants ───────────────────────────────────────────────────────────────

const PORT = 30055;
const HEARTBEAT_TIMEOUT_MS = 30_000; // 30s without heartbeat = agent is down
const EVENTS_HISTORY_LIMIT = 100;

// Known agent collaboration map — mirrors agent-registry.ts collaborations.
// When agent A emits an event, we check if any of its collaborators are
// registered and have an endpoint to forward the event to.
// Format: sourceAgentId → [{ targetAgentId, reason }]
const COLLABORATION_MAP: Record<string, Array<{ agentId: string; reason: string }>> = {
  cv: [
    { agentId: "ats", reason: "Optimisation itérative CV↔ATS" },
    { agentId: "linkedin", reason: "Données CV → LinkedIn" },
    { agentId: "career", reason: "Profil → Orientation" },
    { agentId: "jobs", reason: "CV → Candidature" },
    { agentId: "mobility", reason: "CV → Adaptation" },
  ],
  ats: [
    { agentId: "cv", reason: "Optimisation itérative ATS↔CV" },
  ],
  interview: [
    { agentId: "coach", reason: "Préparation ↔ Coaching" },
    { agentId: "career", reason: "Résultats → Orientation" },
  ],
  linkedin: [
    { agentId: "cv", reason: "CV → LinkedIn" },
    { agentId: "recruiter", reason: "Profil → Sourcing" },
  ],
  career: [
    { agentId: "coach", reason: "Orientation ↔ Coaching" },
    { agentId: "formation", reason: "Compétences ↔ Formation" },
    { agentId: "intelligence", reason: "Données marché → Orientation" },
  ],
  coach: [
    { agentId: "career", reason: "Coaching ↔ Orientation" },
    { agentId: "interview", reason: "Coaching ↔ Préparation entretien" },
    { agentId: "cv", reason: "Coaching → Suggestions CV" },
  ],
  formation: [
    { agentId: "career", reason: "Formation ↔ Compétences" },
    { agentId: "campus", reason: "Formation ↔ Universités" },
    { agentId: "intelligence", reason: "Données → Formation" },
  ],
  jobs: [
    { agentId: "recruiter", reason: "Offres ↔ Pipeline" },
    { agentId: "intelligence", reason: "Données → Offres" },
  ],
  recruiter: [
    { agentId: "jobs", reason: "Pipeline ↔ Offres" },
    { agentId: "linkedin", reason: "Profil LinkedIn → Sourcing" },
    { agentId: "interview", reason: "Candidat → Simulation entretien" },
    { agentId: "intelligence", reason: "Données → Sourcing" },
  ],
  freelance: [
    { agentId: "marketplace", reason: "Missions ↔ Communauté" },
    { agentId: "legal", reason: "Contrats freelance" },
  ],
  global: [
    { agentId: "mobility", reason: "Recrutement ↔ Mobilité" },
    { agentId: "legal", reason: "Conformité intl" },
  ],
  intelligence: [
    { agentId: "career", reason: "Données → Orientation" },
    { agentId: "recruiter", reason: "Données → Sourcing" },
    { agentId: "formation", reason: "Données → Formation" },
    { agentId: "jobs", reason: "Données → Offres" },
  ],
  mobility: [
    { agentId: "global", reason: "Mobilité ↔ Recrutement intl" },
    { agentId: "cv", reason: "CV → Adaptation" },
  ],
  campus: [
    { agentId: "formation", reason: "Campus ↔ Formation" },
  ],
  marketplace: [
    { agentId: "freelance", reason: "Communauté ↔ Missions" },
  ],
  api: [
    { agentId: "whiteLabel", reason: "API → White Label" },
  ],
  legal: [
    { agentId: "freelance", reason: "Contrats → Freelance" },
    { agentId: "global", reason: "Conformité intl" },
    { agentId: "whiteLabel", reason: "Cadre légal → White Label" },
  ],
  whiteLabel: [],
  chatbot: [], // chatbot routes to all — it's a universal interface, not a collaborator
  payment: [
    { agentId: "cv", reason: "Accès CV selon abonnement" },
  ],
};

// ─── Prisma Client (pointed at the main project's schema) ───────────────────

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "file:/home/z/my-project/db/custom.db",
});

// ─── In-Memory Agent Registry ───────────────────────────────────────────────

interface RegisteredAgent {
  agentId: string;
  agentName: string;
  category: string;
  endpoint: string | null;
  capabilities: string[];
  metadata: Record<string, unknown>;
  lastHeartbeat: Date;
  registeredAt: Date;
  status: "up" | "down" | "degraded";
}

const liveAgents = new Map<string, RegisteredAgent>();

// ─── Express + Socket.IO Setup ──────────────────────────────────────────────

const app = express();
app.use(express.json({ limit: "2mb" }));

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/socket.io",
});

// ─── Logging Helper ─────────────────────────────────────────────────────────

function log(msg: string) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] [AgentBus] ${msg}`);
}

function logError(msg: string, err?: unknown) {
  const ts = new Date().toISOString().slice(11, 19);
  console.error(`[${ts}] [AgentBus:ERR] ${msg}`, err ?? "");
}

// ─── Socket.IO Connection Handling ───────────────────────────────────────────

io.on("connection", (socket) => {
  log(`Client connected: ${socket.id} (total: ${io.engine.clientsCount})`);
  socket.join("system");

  socket.on("join:user", (userId: string) => {
    socket.join(`user:${userId}`);
    log(`${socket.id} joined room user:${userId}`);
  });

  socket.on("disconnect", (reason) => {
    log(`Client disconnected: ${socket.id} (${reason}, total: ${io.engine.clientsCount})`);
  });
});

// ─── Inter-Agent Trigger: forward event to a target agent's endpoint ────────

async function triggerAgentReaction(
  event: {
    id: string;
    agentId: string;
    eventType: string;
    payload: Record<string, unknown>;
    userId?: string;
  },
  target: RegisteredAgent,
  reason: string
): Promise<{ ok: boolean; error?: string }> {
  if (!target.endpoint) {
    return { ok: false, error: "no endpoint" };
  }

  const body = {
    sourceEventId: event.id,
    sourceAgentId: event.agentId,
    eventType: event.eventType,
    triggerReason: reason,
    payload: event.payload,
    userId: event.userId,
    triggeredAt: new Date().toISOString(),
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(target.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

// ─── Process Collaborations for an Event ─────────────────────────────────────

async function processCollaborations(event: {
  id: string;
  agentId: string;
  eventType: string;
  payload: Record<string, unknown>;
  userId?: string;
}): Promise<Array<{ targetAgentId: string; ok: boolean; error?: string }>> {
  const collaborators = COLLABORATION_MAP[event.agentId];
  if (!collaborators || collaborators.length === 0) return [];

  const reactions: Array<{ targetAgentId: string; ok: boolean; error?: string }> = [];

  for (const collab of collaborators) {
    const target = liveAgents.get(collab.agentId);
    if (!target || target.status !== "up") {
      log(`  ↳ ${collab.agentId} not registered or down — skipping reaction`);
      continue;
    }

    log(`  ↳ Triggering ${target.agentName} (${collab.agentId}) — reason: ${collab.reason}`);

    const result = await triggerAgentReaction(event, target, collab.reason);
    reactions.push({ targetAgentId: collab.agentId, ...result });

    if (result.ok) {
      // Broadcast the inter-agent reaction to Socket.IO clients
      io.to("system").emit("agent:reaction", {
        sourceEventId: event.id,
        sourceAgentId: event.agentId,
        targetAgentId: collab.agentId,
        targetAgentName: target.agentName,
        reason: collab.reason,
        eventType: event.eventType,
        timestamp: new Date().toISOString(),
      });

      if (event.userId) {
        io.to(`user:${event.userId}`).emit("agent:reaction", {
          sourceEventId: event.id,
          sourceAgentId: event.agentId,
          targetAgentId: collab.agentId,
          targetAgentName: target.agentName,
          reason: collab.reason,
          eventType: event.eventType,
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      logError(`  ↳ Failed to trigger ${collab.agentId}: ${result.error}`);
    }
  }

  return reactions;
}

// ─── POST /event — Receive an event from an agent ────────────────────────────

interface EventRequest {
  agentId: string;
  eventType: string;
  payload?: Record<string, unknown>;
  userId?: string;
  targetAgentId?: string; // explicit routing (bypasses collaboration map)
}

app.post("/event", async (req, res) => {
  const { agentId, eventType, payload = {}, userId, targetAgentId } = req.body as EventRequest;

  if (!agentId || !eventType) {
    return res.status(400).json({ error: "Missing 'agentId' and/or 'eventType'" });
  }

  try {
    // 1. Persist event in DB
    const dbEvent = await prisma.agentEvent.create({
      data: {
        agentId,
        eventType,
        payload: JSON.stringify(payload),
        userId,
        targetAgentId: targetAgentId || null,
      },
    });

    log(`POST /event → ${agentId}:${eventType} (id=${dbEvent.id})`);

    // 2. Broadcast via Socket.IO
    const socketEvent = {
      id: dbEvent.id,
      agentId,
      eventType,
      payload,
      userId,
      timestamp: dbEvent.createdAt.toISOString(),
    };

    io.to("system").emit("agent:event", socketEvent);
    if (userId) {
      io.to(`user:${userId}`).emit("agent:event", socketEvent);
    }

    // 3. Process inter-agent collaborations
    let reactions: Array<{ targetAgentId: string; ok: boolean; error?: string }> = [];

    if (targetAgentId) {
      // Explicit routing to a specific agent
      const target = liveAgents.get(targetAgentId);
      if (target && target.status === "up") {
        log(`  ↳ Explicit route → ${targetAgentId}`);
        const result = await triggerAgentReaction(
          { id: dbEvent.id, agentId, eventType, payload, userId },
          target,
          "explicit routing"
        );
        reactions = [{ targetAgentId, ...result }];
      }
    } else {
      // Collaboration-based routing
      reactions = await processCollaborations({
        id: dbEvent.id,
        agentId,
        eventType,
        payload,
        userId,
      });
    }

    // 4. Update DB with reaction results
    const failedReactions = reactions.filter((r) => !r.ok);
    await prisma.agentEvent.update({
      where: { id: dbEvent.id },
      data: {
        status: failedReactions.length > 0 ? "partial" : "triggered",
        reactionLog: JSON.stringify(reactions),
      },
    });

    res.json({
      ok: true,
      eventId: dbEvent.id,
      reactions: reactions.map((r) => ({
        targetAgentId: r.targetAgentId,
        status: r.ok ? "triggered" : "failed",
        error: r.error,
      })),
    });
  } catch (err) {
    logError("Failed to process event", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /register — Agent self-registration ─────────────────────────────────

interface RegisterRequest {
  agentId: string;
  agentName?: string;
  category?: string;
  endpoint?: string;
  capabilities?: string[];
  metadata?: Record<string, unknown>;
}

app.post("/register", async (req, res) => {
  const { agentId, agentName, category, endpoint, capabilities, metadata } =
    req.body as RegisterRequest;

  if (!agentId) {
    return res.status(400).json({ error: "Missing 'agentId'" });
  }

  try {
    const now = new Date();
    const isNew = !liveAgents.has(agentId);

    // Upsert in DB
    await prisma.agentHeartbeat.upsert({
      where: { agentId },
      update: {
        agentName: agentName || "",
        category: category || "platform",
        status: "up",
        endpoint: endpoint || null,
        capabilities: JSON.stringify(capabilities || []),
        metadata: JSON.stringify(metadata || {}),
        lastHeartbeat: now,
      },
      create: {
        agentId,
        agentName: agentName || agentId,
        category: category || "platform",
        status: "up",
        endpoint: endpoint || null,
        capabilities: JSON.stringify(capabilities || []),
        metadata: JSON.stringify(metadata || {}),
        lastHeartbeat: now,
      },
    });

    // Update in-memory registry
    liveAgents.set(agentId, {
      agentId,
      agentName: agentName || agentId,
      category: category || "platform",
      endpoint: endpoint || null,
      capabilities: capabilities || [],
      metadata: metadata || {},
      lastHeartbeat: now,
      registeredAt: liveAgents.get(agentId)?.registeredAt || now,
      status: "up",
    });

    log(`POST /register → ${agentName || agentId} (${agentId}) ${isNew ? "[NEW]" : "[UPDATED]"}`);

    // Broadcast agent status change
    const statusPayload = {
      agentId,
      agentName: agentName || agentId,
      category: category || "platform",
      status: "up" as const,
      endpoint: endpoint || null,
      capabilities: capabilities || [],
      timestamp: now.toISOString(),
    };
    io.to("system").emit("agent:status", statusPayload);

    res.json({ ok: true, agentId, status: "up", isNew });
  } catch (err) {
    logError("Failed to register agent", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /heartbeat — Agent heartbeat ───────────────────────────────────────

interface HeartbeatRequest {
  agentId: string;
  status?: "up" | "degraded";
  metadata?: Record<string, unknown>;
}

app.post("/heartbeat", async (req, res) => {
  const { agentId, status, metadata } = req.body as HeartbeatRequest;

  if (!agentId) {
    return res.status(400).json({ error: "Missing 'agentId'" });
  }

  try {
    const now = new Date();
    const existing = liveAgents.get(agentId);

    if (!existing) {
      // Auto-register on first heartbeat
      log(`POST /heartbeat → ${agentId} auto-registered (first heartbeat)`);

      await prisma.agentHeartbeat.upsert({
        where: { agentId },
        update: {
          status: status || "up",
          lastHeartbeat: now,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        },
        create: {
          agentId,
          agentName: agentId,
          category: "platform",
          status: status || "up",
          capabilities: "[]",
          metadata: metadata ? JSON.stringify(metadata) : "{}",
          lastHeartbeat: now,
        },
      });

      liveAgents.set(agentId, {
        agentId,
        agentName: agentId,
        category: "platform",
        endpoint: null,
        capabilities: [],
        metadata: metadata || {},
        lastHeartbeat: now,
        registeredAt: now,
        status: status || "up",
      });

      io.to("system").emit("agent:status", {
        agentId,
        agentName: agentId,
        category: "platform",
        status: status || "up",
        endpoint: null,
        capabilities: [],
        timestamp: now.toISOString(),
      });

      return res.json({ ok: true, agentId, status: status || "up", autoRegistered: true });
    }

    // Update existing agent
    const newStatus = status || "up";
    const statusChanged = existing.status !== newStatus;

    existing.lastHeartbeat = now;
    existing.status = newStatus;
    if (metadata) existing.metadata = { ...existing.metadata, ...metadata };

    await prisma.agentHeartbeat.update({
      where: { agentId },
      data: {
        status: newStatus,
        lastHeartbeat: now,
        ...(metadata ? { metadata: JSON.stringify(existing.metadata) } : {}),
      },
    });

    if (statusChanged) {
      log(`POST /heartbeat → ${existing.agentName} status: ${existing.status} → ${newStatus}`);

      io.to("system").emit("agent:status", {
        agentId: existing.agentId,
        agentName: existing.agentName,
        category: existing.category,
        status: newStatus,
        endpoint: existing.endpoint,
        capabilities: existing.capabilities,
        timestamp: now.toISOString(),
      });
    }

    res.json({ ok: true, agentId, status: newStatus });
  } catch (err) {
    logError("Failed to process heartbeat", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /status — All registered agents ─────────────────────────────────────

app.get("/status", async (_req, res) => {
  try {
    // Combine live in-memory data (more accurate for heartbeats) with DB persistence
    const agents: Array<{
      agentId: string;
      agentName: string;
      category: string;
      status: string;
      endpoint: string | null;
      capabilities: string[];
      lastHeartbeat: string;
      registeredAt: string;
      collaborations: string[];
    }> = [];

    for (const [id, agent] of Array.from(liveAgents)) {
      const collabs = COLLABORATION_MAP[id]?.map((c) => c.agentId) || [];
      agents.push({
        agentId: id,
        agentName: agent.agentName,
        category: agent.category,
        status: agent.status,
        endpoint: agent.endpoint,
        capabilities: agent.capabilities,
        lastHeartbeat: agent.lastHeartbeat.toISOString(),
        registeredAt: agent.registeredAt.toISOString(),
        collaborations: collabs,
      });
    }

    res.json({
      total: agents.length,
      up: agents.filter((a) => a.status === "up").length,
      down: agents.filter((a) => a.status === "down").length,
      degraded: agents.filter((a) => a.status === "degraded").length,
      agents,
    });
  } catch (err) {
    logError("Failed to get status", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /events — Recent event history ──────────────────────────────────────

app.get("/events", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, EVENTS_HISTORY_LIMIT);
    const agentId = req.query.agentId as string | undefined;
    const userId = req.query.userId as string | undefined;
    const eventType = req.query.eventType as string | undefined;

    const where: Record<string, unknown> = {};
    if (agentId) where.agentId = agentId;
    if (userId) where.userId = userId;
    if (eventType) where.eventType = eventType;

    const events = await prisma.agentEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const formatted = events.map((e) => ({
      id: e.id,
      agentId: e.agentId,
      eventType: e.eventType,
      payload: JSON.parse(e.payload),
      userId: e.userId,
      targetAgentId: e.targetAgentId,
      status: e.status,
      reactions: e.reactionLog ? JSON.parse(e.reactionLog) : [],
      createdAt: e.createdAt.toISOString(),
    }));

    res.json({ total: formatted.length, limit, events: formatted });
  } catch (err) {
    logError("Failed to get events", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /health — Service health check ──────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "agent-bus",
    version: "2.0.0",
    port: PORT,
    connections: io.engine.clientsCount,
    registeredAgents: liveAgents.size,
    uptime: process.uptime(),
  });
});

// ─── POST /emit — Backward-compatible generic emit (kept for existing clients) ─

interface EmitRequest {
  channel?: string;
  event: string;
  data: Record<string, unknown>;
  userId?: string;
}

app.post("/emit", (req, res) => {
  const { channel, event, data, userId } = req.body as EmitRequest;

  if (!event || !data) {
    return res.status(400).json({ error: "Missing 'event' and/or 'data' fields" });
  }

  let targetRoom: string;
  if (channel === "user" && userId) {
    targetRoom = `user:${userId}`;
  } else {
    targetRoom = "system";
  }

  io.to(targetRoom).emit(event, data);
  log(`POST /emit → room:${targetRoom} event:${event}`);
  res.json({ ok: true, room: targetRoom, event });
});

// ─── Heartbeat Monitor — marks agents as down after 30s timeout ─────────────

function startHeartbeatMonitor() {
  setInterval(() => {
    const now = Date.now();
    for (const [agentId, agent] of Array.from(liveAgents)) {
      const elapsed = now - agent.lastHeartbeat.getTime();
      if (elapsed > HEARTBEAT_TIMEOUT_MS && agent.status !== "down") {
        const previousStatus = agent.status;
        agent.status = "down";

        log(`⏰ Heartbeat timeout: ${agent.agentName} (${agentId}) → DOWN (${Math.round(elapsed / 1000)}s since last heartbeat)`);

        // Update DB
        prisma.agentHeartbeat
          .update({ where: { agentId }, data: { status: "down" } })
          .catch(() => {});

        // Broadcast status change
        io.to("system").emit("agent:status", {
          agentId,
          agentName: agent.agentName,
          category: agent.category,
          status: "down",
          endpoint: agent.endpoint,
          capabilities: agent.capabilities,
          previousStatus,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }, 5_000); // Check every 5 seconds
}

// ─── Restore Agents from DB on Startup ───────────────────────────────────────

async function restoreAgentsFromDB() {
  try {
    const stored = await prisma.agentHeartbeat.findMany();
    for (const record of stored) {
      liveAgents.set(record.agentId, {
        agentId: record.agentId,
        agentName: record.agentName,
        category: record.category,
        status: "down", // All agents start as down until they send a heartbeat
        endpoint: record.endpoint,
        capabilities: JSON.parse(record.capabilities),
        metadata: JSON.parse(record.metadata),
        lastHeartbeat: record.lastHeartbeat,
        registeredAt: record.registeredAt,
      });
    }
    if (stored.length > 0) {
      log(`Restored ${stored.length} agent(s) from DB (all marked as down — awaiting heartbeats)`);
    }
  } catch (err) {
    logError("Failed to restore agents from DB", err);
  }
}

// ─── Start Server ────────────────────────────────────────────────────────────

async function main() {
  // Restore previously registered agents from DB
  await restoreAgentsFromDB();

  // Start heartbeat timeout monitor
  startHeartbeatMonitor();

  httpServer.listen(PORT, () => {
    log(`🚀 Agent Bus v2.0 — Real Inter-Agent Event Bus`);
    log(`   Port: ${PORT}`);
    log(`   Socket.IO: ws://localhost:${PORT}`);
    log("");
    log("   HTTP Endpoints:");
    log("     POST /event     — Agent sends an event (persisted + broadcast + routed)");
    log("     POST /register   — Agent registers with metadata + endpoint");
    log("     POST /heartbeat  — Agent heartbeat (30s timeout = DOWN)");
    log("     GET  /status     — All registered agents + their status");
    log("     GET  /events     — Recent event history (from DB)");
    log("     GET  /health     — Service health check");
    log("     POST /emit       — Generic Socket.IO emit (backward compat)");
    log("");
    log(`   Heartbeat timeout: ${HEARTBEAT_TIMEOUT_MS / 1000}s`);
    log(`   Agents restored from DB: ${liveAgents.size}`);
    log(`   Collaboration links: ${Object.keys(COLLABORATION_MAP).length} agents mapped`);
  });
}

main().catch((err) => {
  console.error("[AgentBus] Fatal startup error:", err);
  process.exit(1);
});
