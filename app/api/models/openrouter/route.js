import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const CACHE_TTL_MS = 1000 * 60 * 30;

let modelsCache = {
  at: 0,
  data: null,
};

function providerLabelFromId(id) {
  const provider = String(id || "").split("/")[0] || "other";
  const map = {
    anthropic: "Anthropic",
    bytedance: "ByteDance",
    "bytedance-seed": "ByteDance Seed",
    deepseek: "DeepSeek",
    google: "Google",
    kimi: "Kimi",
    meta: "Meta",
    mistralai: "Mistral",
    nvidia: "NVIDIA",
    openai: "OpenAI",
    openrouter: "OpenRouter",
    qwen: "Qwen",
    xai: "xAI",
    "x-ai": "xAI",
  };
  return map[provider] || provider.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatPrice(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "free";
  return `$${number.toFixed(number < 0.0001 ? 6 : number < 0.001 ? 5 : 4)}/tok`;
}

function normalizeModel(model) {
  const id = String(model?.id || "").trim();
  const provider = providerLabelFromId(id);
  return {
    id,
    name: String(model?.name || id),
    provider,
    contextLength: Number(model?.context_length || 0),
    promptPrice: model?.pricing?.prompt ?? "0",
    completionPrice: model?.pricing?.completion ?? "0",
    promptPriceLabel: formatPrice(model?.pricing?.prompt),
    completionPriceLabel: formatPrice(model?.pricing?.completion),
  };
}

function buildPayload(models) {
  const normalized = models
    .map(normalizeModel)
    .filter((model) => model.id.includes("/"))
    .sort((a, b) => {
      if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
      return a.name.localeCompare(b.name);
    });

  const providers = normalized.reduce((acc, model) => {
    const existing = acc.find((entry) => entry.provider === model.provider);
    if (existing) {
      existing.models.push(model);
    } else {
      acc.push({ provider: model.provider, models: [model] });
    }
    return acc;
  }, []);

  return {
    fetchedAt: Date.now(),
    total: normalized.length,
    providers,
    models: normalized,
  };
}

async function fetchOpenRouterModels() {
  const response = await fetch(OPENROUTER_MODELS_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "openclaw-vps-dashboard/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`OpenRouter devolvió ${response.status}.`);
  }

  const payload = await response.json();
  return buildPayload(Array.isArray(payload?.data) ? payload.data : []);
}

export async function GET() {
  try {
    const now = Date.now();
    if (modelsCache.data && now - modelsCache.at < CACHE_TTL_MS) {
      return NextResponse.json({ ...modelsCache.data, cached: true });
    }

    const data = await fetchOpenRouterModels();
    modelsCache = { at: now, data };
    return NextResponse.json({ ...data, cached: false });
  } catch (error) {
    if (modelsCache.data) {
      return NextResponse.json({ ...modelsCache.data, cached: true, stale: true, warning: error.message });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
