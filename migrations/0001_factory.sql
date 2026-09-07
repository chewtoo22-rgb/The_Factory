CREATE TABLE IF NOT EXISTS tasks (
  task_id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  agent TEXT NOT NULL,
  assigned_by TEXT NOT NULL,
  status TEXT NOT NULL,
  objective TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  task_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  agent TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  summary TEXT NOT NULL,
  payload TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_agent ON tasks(agent);
CREATE INDEX IF NOT EXISTS idx_events_task ON events(task_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
