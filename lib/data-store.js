import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");

export async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  return DATA_DIR;
}

export async function readJson(fileName, fallback) {
  try {
    const dir = await ensureDataDir();
    const raw = await fs.readFile(path.join(dir, fileName), "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function writeJson(fileName, value) {
  const dir = await ensureDataDir();
  await fs.writeFile(path.join(dir, fileName), JSON.stringify(value, null, 2), "utf8");
}

export async function removeJson(fileName) {
  try {
    const dir = await ensureDataDir();
    await fs.unlink(path.join(dir, fileName));
  } catch {}
}
