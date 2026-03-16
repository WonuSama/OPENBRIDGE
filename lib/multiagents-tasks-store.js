import { readJson, writeJson } from "@/lib/data-store";

const FILE_NAME = "multiagents-tasks.json";

function normalizeTask(task) {
  return {
    id: String(task.id || ""),
    title: String(task.title || "").trim(),
    brief: String(task.brief || "").trim(),
    status: String(task.status || "backlog"),
    assigneeAgentId: task.assigneeAgentId ? String(task.assigneeAgentId) : "",
    priority: String(task.priority || "medium"),
    createdAt: Number(task.createdAt || Date.now()),
    updatedAt: Number(task.updatedAt || Date.now()),
    iterationCount: Number(task.iterationCount || 0),
    lastRunAt: Number(task.lastRunAt || 0),
    lastRunBy: String(task.lastRunBy || ""),
    lastRunSummary: String(task.lastRunSummary || "").trim(),
    lastError: String(task.lastError || "").trim(),
    updates: Array.isArray(task.updates)
      ? task.updates.map((update) => ({
          id: String(update.id || ""),
          text: String(update.text || "").trim(),
          at: Number(update.at || Date.now()),
          author: String(update.author || ""),
          kind: String(update.kind || "note"),
        }))
      : [],
  };
}

export async function listMultiagentTasks() {
  const raw = await readJson(FILE_NAME, []);
  return Array.isArray(raw) ? raw.map(normalizeTask) : [];
}

export async function writeMultiagentTasks(tasks) {
  await writeJson(FILE_NAME, tasks.map(normalizeTask));
}
