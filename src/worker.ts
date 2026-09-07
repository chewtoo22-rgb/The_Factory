export interface Env {
  FACTORY_DB?: D1Database;
  FACTORY_TASKS?: Queue;
  FACTORY_TASKS_KV?: KVNamespace;
  FACTORY_STATE_KV?: KVNamespace;
  FACTORY_MEMORY?: VectorizeIndex;
  FACTORY_BUCKET?: R2Bucket;
  GITHUB_TOKEN?: string;
  GITHUB_REPO?: string;
}

type TaskStatus = 'QUEUED' | 'CLAIMED' | 'IN_PROGRESS' | 'REVIEW' | 'VERIFIED' | 'COMPLETED' | 'BLOCKED' | 'OOMPA_REJECTED';

interface Task {
  task_id: string;
  mission_id: string;
  agent: string;
  assigned_by: string;
  status: TaskStatus;
  objective: string;
  acceptance_criteria: string[];
  dependencies: string[];
  inputs: unknown[];
  outputs: unknown[];
  evidence: unknown[];
  handoff_to?: string | null;
  created_at: string;
  updated_at: string;
}

interface Event {
  event_id: string;
  type: string;
  task_id: string;
  mission_id: string;
  agent: string;
  timestamp: string;
  summary: string;
  evidence: unknown[];
  next_action?: string | null;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

async function recordEvent(env: Env, event: Event) {
  const serialized = JSON.stringify(event);
  if (env.FACTORY_DB) {
    await env.FACTORY_DB.prepare(
      `INSERT INTO events(event_id, type, task_id, mission_id, agent, timestamp, summary, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(event.event_id, event.type, event.task_id, event.mission_id, event.agent, event.timestamp, event.summary, serialized).run();
  }
  if (env.FACTORY_STATE_KV) {
    await env.FACTORY_STATE_KV.put(`event:${event.event_id}`, serialized, { expirationTtl: 60 * 60 * 24 * 30 });
  }
}

async function githubLog(env: Env, task: Task, event: Event) {
  // GitHub is the durable human-readable ledger. Runtime work is never considered
  // fully complete until this succeeds (or the task is explicitly BLOCKED).
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) return { logged: false, reason: 'GITHUB_TOKEN/GITHUB_REPO not configured' };
  const [owner, repo] = env.GITHUB_REPO.split('/');
  if (!owner || !repo) return { logged: false, reason: 'invalid GITHUB_REPO' };

  const path = `factory-log/${new Date().toISOString().slice(0, 7).replace('-', '/')}/${task.task_id}.md`;
  const body = `# ${task.task_id}\n\n- Mission: ${task.mission_id}\n- Agent: ${task.agent}\n- Status: ${task.status}\n- Updated: ${task.updated_at}\n\n## Objective\n${task.objective}\n\n## Completion event\n${event.summary}\n\n## Evidence\n${JSON.stringify(event.evidence, null, 2)}\n\n## Next action\n${event.next_action || 'None'}\n\n## Audit state\nOompa audit is mandatory before final completion.\n`;

  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json'
  };
  const existing = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, { headers });
  let sha: string | undefined;
  if (existing.ok) sha = (await existing.json() as { sha?: string }).sha;
  const result = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `factory: log ${task.task_id} (${task.agent})`,
      content: btoa(unescape(encodeURIComponent(body))),
      ...(sha ? { sha } : {})
    })
  });
  return { logged: result.ok, status: result.status };
}

async function createTask(env: Env, input: Partial<Task>) {
  const task: Task = {
    task_id: input.task_id || id('task'),
    mission_id: input.mission_id || id('mission'),
    agent: input.agent || 'Sirius',
    assigned_by: input.assigned_by || 'Sirius',
    status: 'QUEUED',
    objective: input.objective || '',
    acceptance_criteria: input.acceptance_criteria || [],
    dependencies: input.dependencies || [],
    inputs: input.inputs || [],
    outputs: [],
    evidence: [],
    handoff_to: input.handoff_to || null,
    created_at: now(),
    updated_at: now()
  };
  if (env.FACTORY_DB) {
    await env.FACTORY_DB.prepare(
      `INSERT INTO tasks(task_id, mission_id, agent, assigned_by, status, objective, payload, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(task.task_id, task.mission_id, task.agent, task.assigned_by, task.status, task.objective, JSON.stringify(task), task.created_at, task.updated_at).run();
  }
  if (env.FACTORY_TASKS_KV) await env.FACTORY_TASKS_KV.put(`task:${task.task_id}`, JSON.stringify(task));
  if (env.FACTORY_TASKS) await env.FACTORY_TASKS.send(task);
  await recordEvent(env, { event_id: id('event'), type: 'TASK_CLAIMED', task_id: task.task_id, mission_id: task.mission_id, agent: task.agent, timestamp: now(), summary: `Task queued for ${task.agent}`, evidence: [] });
  return task;
}

async function completeTask(env: Env, task: Task, event: Event) {
  task.status = 'COMPLETED';
  task.updated_at = now();
  task.evidence = event.evidence;
  if (env.FACTORY_DB) {
    await env.FACTORY_DB.prepare(`UPDATE tasks SET status=?, payload=?, updated_at=? WHERE task_id=?`).bind(task.status, JSON.stringify(task), task.updated_at, task.task_id).run();
  }
  if (env.FACTORY_TASKS_KV) await env.FACTORY_TASKS_KV.put(`task:${task.task_id}`, JSON.stringify(task));
  await recordEvent(env, event);
  const log = await githubLog(env, task, event);
  if (!log.logged) {
    task.status = 'BLOCKED';
    if (env.FACTORY_DB) await env.FACTORY_DB.prepare(`UPDATE tasks SET status=?, payload=?, updated_at=? WHERE task_id=?`).bind(task.status, JSON.stringify(task), now(), task.task_id).run();
    throw new Error(`Completion log failed: ${log.reason || log.status}`);
  }
  return task;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ service: 'The_Factory', worker: 'factory', status: 'online', audit_authority: 'Oompa', github_logging: Boolean(env.GITHUB_TOKEN && env.GITHUB_REPO), time: now() });
    }
    if (request.method === 'POST' && url.pathname === '/tasks') {
      const task = await createTask(env, await request.json() as Partial<Task>);
      return json(task, 201);
    }
    if (request.method === 'POST' && url.pathname === '/events') {
      const event = await request.json() as Event;
      await recordEvent(env, event);
      return json({ recorded: true, event_id: event.event_id });
    }
    if (request.method === 'POST' && url.pathname === '/audit') {
      const event = await request.json() as Event;
      event.type = 'AUDIT_STARTED';
      await recordEvent(env, event);
      return json({ recorded: true, auditor: 'Oompa', verdict: 'PENDING' });
    }
    if (request.method === 'POST' && url.pathname === '/complete') {
      const payload = await request.json() as { task: Task; event: Event };
      const task = await completeTask(env, payload.task, payload.event);
      return json({ completed: true, task });
    }
    return json({ service: 'The_Factory', message: 'Use /health, /tasks, /events, /audit, or /complete' }, 404);
  },

  async queue(batch: MessageBatch<Task>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const task = message.body;
      await recordEvent(env, {
        event_id: id('event'), type: 'PROGRESS', task_id: task.task_id, mission_id: task.mission_id,
        agent: task.agent, timestamp: now(), summary: `Task dispatched to ${task.agent}`, evidence: []
      });
      message.ack();
    }
  }
};
