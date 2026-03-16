import { NextResponse } from "next/server";
import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { openclawProfileCommand, runRemote, shellEscape } from "@/lib/remote";

export const dynamic = "force-dynamic";

const execAsync = promisify(exec);
const LOCAL_SKILLS_REPO = path.resolve(process.cwd(), "..", "awesome-openclaw-skills-ref");
const FALLBACK_SKILLS_REPO = path.join(process.cwd(), ".data", "recommended-skills-repo");
const RECOMMENDED_SKILLS_REPO_URL = "https://github.com/VoltAgent/awesome-openclaw-skills.git";

async function runLocalCommand(command, timeout = 120000) {
  const { stdout } = await execAsync(command, {
    cwd: process.cwd(),
    windowsHide: true,
    shell: process.platform === "win32" ? "powershell.exe" : true,
    timeout,
    maxBuffer: 1024 * 1024 * 8,
  });
  return stdout;
}

function parseClawHubSearch(stdout) {
  return String(stdout || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("- "))
    .map((line) => {
      const match = line.match(/^([a-z0-9._/-]+)\s{2,}(.+?)\s+\(([\d.]+)\)$/i);
      if (!match) return null;
      return {
        slug: match[1],
        title: match[2],
        score: Number(match[3]),
        source: "clawhub",
      };
    })
    .filter(Boolean);
}

async function runLocalClawhub(args) {
  const command = `npx --yes clawhub ${args.map((arg) => `"${String(arg).replace(/"/g, '\\"')}"`).join(" ")}`;
  return runLocalCommand(command, 120000);
}

async function getAgentsFromRemote() {
  const result = await runRemote(`${openclawProfileCommand("agents list --json")} 2>/dev/null`);
  const agents = JSON.parse(result.stdout.trim() || "[]");
  return agents.map((agent) => ({
    id: agent.id,
    name: agent.identityName || agent.id,
    model: agent.model || "",
    workspace: agent.workspace || "",
    isDefault: Boolean(agent.isDefault),
  }));
}

async function getInstalledSkills(agents) {
  const payload = Buffer.from(JSON.stringify(agents), "utf8").toString("base64");
  const script = `
python3 - <<'PY'
import base64, json, os
agents = json.loads(base64.b64decode(${shellEscape(payload)}).decode("utf-8"))
items = []
for agent in agents:
    workspace = agent.get("workspace") or ""
    agent_id = agent.get("id") or ""
    if not workspace:
        continue
    skills_dir = os.path.join(workspace, "skills")
    if not os.path.isdir(skills_dir):
        continue
    for name in sorted(os.listdir(skills_dir)):
        skill_dir = os.path.join(skills_dir, name)
        if os.path.isfile(os.path.join(skill_dir, "SKILL.md")):
            items.append({
                "agentId": agent_id,
                "workspace": workspace,
                "slug": name,
                "path": skill_dir,
            })
print(json.dumps(items))
PY
`.trim();

  const result = await runRemote(script);
  return JSON.parse(result.stdout.trim() || "[]");
}

function parseFrontmatter(raw) {
  const match = String(raw || "").match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const meta = {};
  for (const line of match[1].split("\n")) {
    const item = line.trim();
    if (!item || !item.includes(":")) continue;
    const [key, ...rest] = item.split(":");
    meta[key.trim()] = rest.join(":").trim().replace(/^"|"$/g, "");
  }
  return meta;
}

async function resolveRecommendedSkillsRepo() {
  if (fs.existsSync(LOCAL_SKILLS_REPO)) return LOCAL_SKILLS_REPO;

  if (!fs.existsSync(FALLBACK_SKILLS_REPO)) {
    fs.mkdirSync(path.dirname(FALLBACK_SKILLS_REPO), { recursive: true });
    await runLocalCommand(`git clone --depth=1 ${shellEscape(RECOMMENDED_SKILLS_REPO_URL)} ${shellEscape(FALLBACK_SKILLS_REPO)}`, 180000);
  }
  return FALLBACK_SKILLS_REPO;
}

async function listRecommendedSkills(query = "") {
  const repoDir = await resolveRecommendedSkillsRepo();
  const categoriesDir = path.join(repoDir, "categories");
  if (!fs.existsSync(categoriesDir)) return [];
  const normalizedQuery = String(query || "").trim().toLowerCase();
  return fs
    .readdirSync(categoriesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .flatMap((entry) => {
      const category = entry.name.replace(/\.md$/i, "");
      const raw = fs.readFileSync(path.join(categoriesDir, entry.name), "utf8");
      return raw
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("- ["))
        .map((line) => {
          const match = line.match(/^- \[([^\]]+)\]\((https?:\/\/[^\s)]+)\)\s+-\s+(.+)$/);
          if (!match) return null;
          const title = match[1].trim();
          const url = match[2].trim();
          const description = match[3].trim();
          const slugMatch = url.match(/\/skills\/([^/?#]+)/i);
          const slug = slugMatch?.[1] || title.toLowerCase().replace(/\s+/g, "-");
          return {
            slug,
            title,
            description,
            source: "recommended",
            category,
            sourceUrl: url,
          };
        })
        .filter(Boolean);
    })
    .filter(Boolean)
    .filter((item) => {
      if (!normalizedQuery) return true;
      return (
        item.slug.toLowerCase().includes(normalizedQuery) ||
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.description.toLowerCase().includes(normalizedQuery) ||
        String(item.category || "").toLowerCase().includes(normalizedQuery)
      );
    })
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .slice(0, 80);
}

function collectSkillFiles(rootDir) {
  const files = [];
  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        files.push({
          path: path.relative(rootDir, fullPath).replace(/\\/g, "/"),
          content: fs.readFileSync(fullPath).toString("base64"),
        });
      }
    }
  }
  walk(rootDir);
  return files;
}

function buildToolsSection({ slug, source, detail }) {
  return [
    `## Skill: ${slug}`,
    `- Source: ${source}`,
    `- Location: skills/${slug}/SKILL.md`,
    `- Use this skill only when the task clearly matches its description.`,
    `- Read the skill files before first use in a turn.`,
    detail ? `- Notes: ${detail}` : "",
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildRecommendedInstallScript(slug, filesPayload) {
  return `
skill_root="$tmp_dir/local-skill"
mkdir -p "$skill_root"
python3 - <<'PY'
import base64, json, os
files = json.loads(base64.b64decode(${shellEscape(filesPayload)}).decode("utf-8"))
skill_root = os.environ["SKILL_ROOT"]
for item in files:
    target = os.path.join(skill_root, item["path"])
    os.makedirs(os.path.dirname(target), exist_ok=True)
    with open(target, "wb") as fh:
        fh.write(base64.b64decode(item["content"]))
PY
slug_name=${shellEscape(slug)}
`.trim();
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = String(searchParams.get("query") || "").trim();
    const agents = await getAgentsFromRemote();
    const installed = await getInstalledSkills(agents);
    let results = [];
    let recommended = [];
    let searchError = "";

    try {
      recommended = await listRecommendedSkills(query);
    } catch (error) {
      searchError = error.message;
    }

    if (query) {
      try {
        results = parseClawHubSearch(await runLocalClawhub(["search", query, "--limit", "12"]));
      } catch (error) {
        searchError = searchError ? `${searchError} | ${error.message}` : error.message;
      }
    }

    return NextResponse.json({ agents, installed, results, recommended, searchError });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const source = String(body.source || "clawhub").trim();
    const slug = String(body.slug || "").trim();
    const githubUrl = String(body.githubUrl || "").trim();
    const selectedAgentIds = Array.isArray(body.agentIds) ? body.agentIds.map((value) => String(value || "").trim()).filter(Boolean) : [];

    if (!selectedAgentIds.length) {
      return NextResponse.json({ error: "Selecciona al menos un agente." }, { status: 400 });
    }

    if ((source === "clawhub" || source === "recommended") && !slug) {
      return NextResponse.json({ error: "Falta el slug del skill." }, { status: 400 });
    }

    if (source === "github" && !/^https:\/\/github\.com\/[^/]+\/[^/]+/i.test(githubUrl)) {
      return NextResponse.json({ error: "La URL de GitHub no es valida." }, { status: 400 });
    }

    const agents = await getAgentsFromRemote();
    const selectedAgents = agents.filter((agent) => selectedAgentIds.includes(agent.id) && agent.workspace);

    if (!selectedAgents.length) {
      return NextResponse.json({ error: "No encontre workspaces validos para los agentes seleccionados." }, { status: 400 });
    }

    const effectiveSlug = source === "github"
      ? githubUrl.replace(/\/+$/, "").split("/").slice(-1)[0].replace(/\.git$/i, "")
      : slug;

    const toolsSection = buildToolsSection({
      slug: effectiveSlug,
      source,
      detail: source === "github" ? githubUrl : source === "recommended" ? `Installed from local recommended catalog (${effectiveSlug})` : `Installed via ClawHub (${slug})`,
    });
    const toolsSectionB64 = Buffer.from(toolsSection, "utf8").toString("base64");
    const agentsPayload = Buffer.from(JSON.stringify(selectedAgents), "utf8").toString("base64");

    let sourceScript = "";
    if (source === "github") {
      sourceScript = `
repo_dir="$tmp_dir/repo"
git clone --depth=1 ${shellEscape(githubUrl)} "$repo_dir" >/dev/null 2>&1
skill_root="$(dirname "$(find "$repo_dir" -maxdepth 3 -type f -name SKILL.md | head -n 1)")"
if [ -z "$skill_root" ]; then
  echo "No encontre SKILL.md en el repositorio." >&2
  exit 1
fi
slug_name=${shellEscape(effectiveSlug)}
`.trim();
    } else if (source === "recommended") {
      sourceScript = `
work_dir="$tmp_dir/work"
mkdir -p "$work_dir"
(cd "$work_dir" && npx --yes clawhub install ${shellEscape(effectiveSlug)} --workdir "$work_dir" --dir skills --no-input >/dev/null 2>&1)
skill_root="$work_dir/skills/${effectiveSlug}"
if [ ! -f "$skill_root/SKILL.md" ]; then
  echo "No pude instalar el skill recomendado desde ClawHub." >&2
  exit 1
fi
slug_name=${shellEscape(effectiveSlug)}
`.trim();
    } else {
      sourceScript = `
work_dir="$tmp_dir/work"
mkdir -p "$work_dir"
(cd "$work_dir" && npx --yes clawhub install ${shellEscape(slug)} --workdir "$work_dir" --dir skills --no-input >/dev/null 2>&1)
skill_root="$work_dir/skills/${slug}"
if [ ! -f "$skill_root/SKILL.md" ]; then
  echo "No pude instalar el skill desde ClawHub." >&2
  exit 1
fi
slug_name=${shellEscape(slug)}
`.trim();
    }

    const remoteScript = `
set -e
if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 no esta disponible en el VPS." >&2
  exit 1
fi
if [ ${shellEscape(source)} != 'recommended' ] && ! command -v npx >/dev/null 2>&1; then
  echo "npx no esta disponible en el VPS." >&2
  exit 1
fi
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
export SKILL_ROOT="$tmp_dir/local-skill"
${sourceScript}
export skill_root
export slug_name
python3 - <<'PY'
import base64, json, os, shutil
agents = json.loads(base64.b64decode(${shellEscape(agentsPayload)}).decode("utf-8"))
tools_section = base64.b64decode(${shellEscape(toolsSectionB64)}).decode("utf-8")
skill_root = os.environ["skill_root"]
slug_name = os.environ["slug_name"]
installed = []
for agent in agents:
    workspace = agent["workspace"]
    agent_id = agent["id"]
    skills_dir = os.path.join(workspace, "skills")
    os.makedirs(skills_dir, exist_ok=True)
    dest = os.path.join(skills_dir, slug_name)
    if os.path.exists(dest):
        shutil.rmtree(dest)
    shutil.copytree(skill_root, dest)
    tools_path = os.path.join(workspace, "TOOLS.md")
    existing = ""
    if os.path.exists(tools_path):
        existing = open(tools_path, "r", encoding="utf-8").read()
    if f"## Skill: {slug_name}" not in existing:
        with open(tools_path, "a", encoding="utf-8") as fh:
            if existing and not existing.endswith("\n"):
                fh.write("\n")
            if existing:
                fh.write("\n")
            fh.write(tools_section)
    installed.append({"agentId": agent_id, "workspace": workspace, "slug": slug_name, "path": dest})
print(json.dumps(installed))
PY
`.trim();

    const result = await runRemote(remoteScript);
    if (result.code !== 0) {
      const message = result.stderr.trim() || result.stdout.trim() || "No pude instalar el skill.";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const installed = JSON.parse(result.stdout.trim() || "[]");
    return NextResponse.json({ ok: true, installed, slug: effectiveSlug });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const slug = String(body.slug || "").trim();
    const selectedAgentIds = Array.isArray(body.agentIds) ? body.agentIds.map((value) => String(value || "").trim()).filter(Boolean) : [];

    if (!slug) {
      return NextResponse.json({ error: "Falta el slug del skill." }, { status: 400 });
    }

    if (!selectedAgentIds.length) {
      return NextResponse.json({ error: "Selecciona al menos un agente." }, { status: 400 });
    }

    const agents = await getAgentsFromRemote();
    const selectedAgents = agents.filter((agent) => selectedAgentIds.includes(agent.id) && agent.workspace);

    if (!selectedAgents.length) {
      return NextResponse.json({ error: "No encontre workspaces validos para los agentes seleccionados." }, { status: 400 });
    }

    const agentsPayload = Buffer.from(JSON.stringify(selectedAgents), "utf8").toString("base64");
    const remoteScript = `
set -e
python3 - <<'PY'
import base64, json, os, shutil
agents = json.loads(base64.b64decode(${shellEscape(agentsPayload)}).decode("utf-8"))
slug = ${shellEscape(slug)}
removed = []
for agent in agents:
    workspace = agent["workspace"]
    agent_id = agent["id"]
    skill_dir = os.path.join(workspace, "skills", slug)
    if os.path.isdir(skill_dir):
        shutil.rmtree(skill_dir)
    tools_path = os.path.join(workspace, "TOOLS.md")
    if os.path.exists(tools_path):
        text = open(tools_path, "r", encoding="utf-8").read()
        marker = f"## Skill: {slug}"
        if marker in text:
            start = text.find(marker)
            end = text.find("\\n## Skill: ", start + 1)
            if end == -1:
                text = text[:start].rstrip() + "\\n"
            else:
                text = (text[:start].rstrip() + "\\n\\n" + text[end + 1 :].lstrip()).rstrip() + "\\n"
            with open(tools_path, "w", encoding="utf-8") as fh:
                fh.write(text)
    removed.append({"agentId": agent_id, "workspace": workspace, "slug": slug})
print(json.dumps(removed))
PY
`.trim();

    const result = await runRemote(remoteScript, { timeoutMs: 60000 });
    if (result.code !== 0) {
      const message = result.stderr.trim() || result.stdout.trim() || "No pude eliminar el skill.";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const removed = JSON.parse(result.stdout.trim() || "[]");
    return NextResponse.json({ ok: true, removed });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
