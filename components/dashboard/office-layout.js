export const OFFICE_LAYOUT_STORAGE_KEY = "openclaw-dashboard-office-layout-v6";

export const OFFICE_ITEM_LIBRARY = {
  desk: {
    label: "Desk",
    width: 3,
    height: 2,
    rotatable: true,
  },
  table: {
    label: "Meeting table",
    width: 3,
    height: 2,
    rotatable: true,
  },
  sofa: {
    label: "Sofa",
    width: 2,
    height: 1,
    rotatable: true,
  },
  plant: {
    label: "Plant",
    width: 1,
    height: 1,
    rotatable: false,
  },
  board: {
    label: "Board",
    width: 2,
    height: 1,
    rotatable: true,
  },
  storage: {
    label: "Cabinet",
    width: 2,
    height: 2,
    rotatable: true,
  },
  printer: {
    label: "Printer",
    width: 2,
    height: 2,
    rotatable: true,
  },
  water: {
    label: "Water dispenser",
    width: 1,
    height: 2,
    rotatable: true,
  },
  bookshelf: {
    label: "Bookshelf",
    width: 2,
    height: 2,
    rotatable: true,
  },
  bin: {
    label: "Bin",
    width: 1,
    height: 1,
    rotatable: false,
  },
  coffee: {
    label: "Coffee",
    width: 1,
    height: 1,
    rotatable: false,
  },
  sideTable: {
    label: "Side table",
    width: 1,
    height: 1,
    rotatable: true,
  },
  partition: {
    label: "Partition",
    width: 1,
    height: 3,
    rotatable: true,
  },
  rug: {
    label: "Floor accent",
    width: 2,
    height: 2,
    rotatable: true,
  },
};

const DEFAULT_FLOOR_PATCHES = [
  { id: "patch-ops", x: 1, y: 1, w: 5, h: 3, tone: "warm" },
  { id: "patch-research", x: 7, y: 1, w: 5, h: 3, tone: "soft" },
  { id: "patch-product", x: 12, y: 1, w: 5, h: 3, tone: "cool" },
  { id: "patch-eng", x: 1, y: 6, w: 7, h: 4, tone: "soft" },
  { id: "patch-qa", x: 9, y: 6, w: 3, h: 3, tone: "warm" },
  { id: "patch-lounge", x: 12, y: 6, w: 5, h: 5, tone: "warm" },
];

const DEFAULT_ITEMS = [
  { id: "desk-ops-1", type: "desk", x: 1, y: 1, rotation: 0, cluster: "operations" },
  { id: "desk-ops-2", type: "desk", x: 1, y: 3, rotation: 0, cluster: "operations" },
  { id: "desk-research-1", type: "desk", x: 7, y: 1, rotation: 0, cluster: "research" },
  { id: "desk-research-2", type: "desk", x: 7, y: 3, rotation: 0, cluster: "research" },
  { id: "desk-product-1", type: "desk", x: 12, y: 1, rotation: 0, cluster: "product" },
  { id: "desk-product-2", type: "desk", x: 12, y: 3, rotation: 0, cluster: "product" },
  { id: "desk-engineering-1", type: "desk", x: 1, y: 6, rotation: 0, cluster: "engineering" },
  { id: "desk-engineering-2", type: "desk", x: 4, y: 6, rotation: 0, cluster: "engineering" },
  { id: "desk-engineering-3", type: "desk", x: 1, y: 8, rotation: 0, cluster: "engineering" },
  { id: "desk-engineering-4", type: "desk", x: 4, y: 8, rotation: 0, cluster: "engineering" },
  { id: "desk-quality-1", type: "desk", x: 9, y: 6, rotation: 0, cluster: "quality" },
  { id: "desk-general-1", type: "desk", x: 13, y: 6, rotation: 0, cluster: "general" },
  { id: "desk-general-2", type: "desk", x: 13, y: 8, rotation: 0, cluster: "general" },
  { id: "meeting-table", type: "table", x: 8, y: 9, rotation: 0 },
  { id: "sofa-a", type: "sofa", x: 13, y: 10, rotation: 0 },
  { id: "sofa-b", type: "sofa", x: 15, y: 10, rotation: 180 },
  { id: "bookshelf-west", type: "bookshelf", x: 4, y: 1, rotation: 0 },
  { id: "storage-west", type: "storage", x: 10, y: 1, rotation: 0 },
  { id: "storage-east", type: "storage", x: 15, y: 3, rotation: 0 },
  { id: "water-station", type: "water", x: 17, y: 7, rotation: 0 },
  { id: "printer-bay", type: "printer", x: 11, y: 8, rotation: 0 },
  { id: "coffee-1", type: "coffee", x: 12, y: 10, rotation: 0 },
  { id: "bin-1", type: "bin", x: 7, y: 10, rotation: 0 },
  { id: "plant-1", type: "plant", x: 17, y: 1, rotation: 0 },
  { id: "plant-2", type: "plant", x: 0, y: 10, rotation: 0 },
  { id: "plant-3", type: "plant", x: 17, y: 10, rotation: 0 },
];

export function createDefaultOfficeLayout() {
  return {
    version: 2,
    cols: 18,
    rows: 12,
    floorPatches: DEFAULT_FLOOR_PATCHES.map((patch) => ({ ...patch })),
    items: DEFAULT_ITEMS.map((item) => ({ ...item })),
  };
}

export function getItemFootprint(item) {
  const base = OFFICE_ITEM_LIBRARY[item.type];
  if (!base) return { width: 1, height: 1 };
  if (item.type === "partition") {
    const isHorizontal = (item.rotation || 0) % 180 === 90;
    return isHorizontal
      ? { width: item.span || 4, height: 1 }
      : { width: 1, height: item.span || 4 };
  }
  const rotated = (item.rotation || 0) % 180 !== 0;
  return rotated ? { width: base.height, height: base.width } : { width: base.width, height: base.height };
}

export function createLayoutItem(type, x, y) {
  const base = OFFICE_ITEM_LIBRARY[type];
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    x,
    y,
    rotation: 0,
    span: type === "partition" ? 3 : undefined,
  };
}

export function normalizeOfficeLayout(layout) {
  const fallback = createDefaultOfficeLayout();
  if (!layout || typeof layout !== "object") return fallback;
  const cols = Number.isFinite(layout.cols) ? layout.cols : fallback.cols;
  const rows = Number.isFinite(layout.rows) ? layout.rows : fallback.rows;
  const items = Array.isArray(layout.items) ? layout.items.filter(Boolean).map((item) => ({ ...item })) : fallback.items;
  const floorPatches = Array.isArray(layout.floorPatches) ? layout.floorPatches.filter(Boolean).map((patch) => ({ ...patch })) : fallback.floorPatches;
  return {
    version: 2,
    cols,
    rows,
    items,
    floorPatches,
  };
}

export function rectanglesOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function canPlaceLayoutItem(layout, candidate, excludeId) {
  const footprint = getItemFootprint(candidate);
  if (candidate.x < 0 || candidate.y < 0 || candidate.x + footprint.width > layout.cols || candidate.y + footprint.height > layout.rows) {
    return false;
  }

  const candidateBox = { x: candidate.x, y: candidate.y, width: footprint.width, height: footprint.height };
  return !layout.items.some((item) => {
    if (!item || item.id === excludeId) return false;
    const itemFootprint = getItemFootprint(item);
    return rectanglesOverlap(candidateBox, { x: item.x, y: item.y, width: itemFootprint.width, height: itemFootprint.height });
  });
}

export function rotateLayoutItem(item) {
  const base = OFFICE_ITEM_LIBRARY[item.type];
  if (!base?.rotatable) return item;
  const nextRotation = ((item.rotation || 0) + 90) % 360;
  return { ...item, rotation: nextRotation };
}

export function upsertFloorPatch(layout, x, y, tone) {
  const nextPatches = [...layout.floorPatches];
  const index = nextPatches.findIndex((patch) => x >= patch.x && x < patch.x + patch.w && y >= patch.y && y < patch.y + patch.h);
  if (index >= 0) {
    if (nextPatches[index].tone === tone) {
      nextPatches.splice(index, 1);
    } else {
      nextPatches[index] = { ...nextPatches[index], tone };
    }
  } else {
    nextPatches.push({
      id: `patch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      x,
      y,
      w: 1,
      h: 1,
      tone,
    });
  }
  return { ...layout, floorPatches: nextPatches };
}

export function findItemAtTile(layout, x, y) {
  return [...layout.items]
    .reverse()
    .find((item) => {
      const footprint = getItemFootprint(item);
      return x >= item.x && x < item.x + footprint.width && y >= item.y && y < item.y + footprint.height;
    }) || null;
}

export function inferAgentCluster(agent) {
  const text = String(agent?.role || agent?.identityRole || agent?.identityName || agent?.name || agent?.id || "").toLowerCase();
  if (/(ops|infra|platform|sre|reliability|telegram|channel)/.test(text)) return "operations";
  if (/(research|memory|analysis|rag|knowledge)/.test(text)) return "research";
  if (/(product|design|ux|ui)/.test(text)) return "product";
  if (/(build|dev|engineer|backend|frontend|code)/.test(text)) return "engineering";
  if (/(quality|qa|test|audit|security)/.test(text)) return "quality";
  return "general";
}

export function assignAgentsToDesks(layout, agents) {
  const desks = layout.items.filter((item) => item.type === "desk");
  const byCluster = new Map();
  const unassigned = [];

  for (const desk of desks) {
    const cluster = desk.cluster || "general";
    if (!byCluster.has(cluster)) byCluster.set(cluster, []);
    byCluster.get(cluster).push(desk);
  }

  const assignments = new Map();
  const usedDeskIds = new Set();

  for (const agent of agents) {
    const cluster = inferAgentCluster(agent);
    const preferredDesk = (byCluster.get(cluster) || []).find((desk) => !usedDeskIds.has(desk.id));
    if (preferredDesk) {
      assignments.set(preferredDesk.id, agent);
      usedDeskIds.add(preferredDesk.id);
    } else {
      unassigned.push(agent);
    }
  }

  for (const agent of unassigned) {
    const fallbackDesk = desks.find((desk) => !usedDeskIds.has(desk.id));
    if (!fallbackDesk) break;
    assignments.set(fallbackDesk.id, agent);
    usedDeskIds.add(fallbackDesk.id);
  }

  return assignments;
}
