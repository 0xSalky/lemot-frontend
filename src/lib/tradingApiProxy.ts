import { DEFAULT_TRADING_API_URL } from "@/services/config";
import type { NextApiRequest, NextApiResponse } from "next";

export const CLIENT_TRADING_API_KEY_HEADER = "x-client-trading-api-key";
export const CLIENT_TRADING_API_URL_HEADER = "x-client-trading-api-url";

export type TradingCredentials = {
  apiKey: string;
  baseUrl: string;
  source: "env" | "client";
};

export function isServerTradingConfigured(): boolean {
  return Boolean(process.env.TRADING_API_KEY?.trim());
}

export function normalizeTradingApiUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    const host = parsed.hostname.toLowerCase();
    if (
      host === "metadata.google.internal" ||
      host === "169.254.169.254" ||
      host.endsWith(".internal")
    ) {
      return null;
    }

    return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "") || parsed.origin;
  } catch {
    return null;
  }
}

function readHeader(req: NextApiRequest, name: string): string | null {
  const value = req.headers[name];
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value) && value[0]?.trim()) return value[0].trim();
  return null;
}

export function resolveTradingCredentials(req: NextApiRequest): TradingCredentials | null {
  const envKey = process.env.TRADING_API_KEY?.trim();
  if (envKey) {
    const envUrl = normalizeTradingApiUrl(
      process.env.TRADING_API_URL ?? DEFAULT_TRADING_API_URL,
    );
    if (!envUrl) return null;
    return { apiKey: envKey, baseUrl: envUrl, source: "env" };
  }

  const clientKey = readHeader(req, CLIENT_TRADING_API_KEY_HEADER);
  if (!clientKey) return null;

  const clientUrlRaw =
    readHeader(req, CLIENT_TRADING_API_URL_HEADER) ?? DEFAULT_TRADING_API_URL;
  const clientUrl = normalizeTradingApiUrl(clientUrlRaw);
  if (!clientUrl) return null;

  return { apiKey: clientKey, baseUrl: clientUrl, source: "client" };
}

export function resolveTradingCredentialsFromBody(
  body: unknown,
): TradingCredentials | null {
  if (!body || typeof body !== "object") return null;

  const record = body as Record<string, unknown>;
  const apiKey =
    typeof record.apiKey === "string" ? record.apiKey.trim() : "";
  const apiUrl =
    typeof record.apiUrl === "string" ? record.apiUrl.trim() : "";

  if (!apiKey || !apiUrl) return null;

  const baseUrl = normalizeTradingApiUrl(apiUrl);
  if (!baseUrl) return null;

  return { apiKey, baseUrl, source: "client" };
}

export function credentialsRequiredResponse(res: NextApiResponse) {
  return res.status(401).json({
    detail: "Trading API credentials required. Connect with your API URL and key.",
  });
}

export async function forwardUpstreamResponse(
  res: NextApiResponse,
  upstream: Response,
): Promise<void> {
  const contentType = upstream.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = await upstream.json();
    res.status(upstream.status).json(data);
    return;
  }

  const text = await upstream.text();
  res.status(upstream.status).send(text);
}

function upstreamQuery(req: NextApiRequest): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item != null) params.append(key, item);
      }
    } else {
      params.append(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function proxyTradingGet(
  req: NextApiRequest,
  res: NextApiResponse,
  path: string,
  options?: { upstreamTimeoutMs?: number },
): Promise<void> {
  const creds = resolveTradingCredentials(req);
  if (!creds) {
    credentialsRequiredResponse(res);
    return;
  }

  const controller = options?.upstreamTimeoutMs
    ? new AbortController()
    : null;
  const timer =
    controller && options?.upstreamTimeoutMs
      ? setTimeout(() => controller.abort(), options.upstreamTimeoutMs)
      : null;

  try {
    const url = `${creds.baseUrl}${path}${upstreamQuery(req)}`;
    const upstream = await fetch(url, {
      method: "GET",
      headers: { "X-API-Key": creds.apiKey },
      signal: controller?.signal,
    });
    if (!upstream.ok) {
      console.warn("[trading proxy] upstream GET not ok", {
        path,
        status: upstream.status,
        source: creds.source,
      });
    }
    await forwardUpstreamResponse(res, upstream);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      res.status(504).json({
        detail: `Upstream ${path} timed out. Try again — chart data may still be warming in cache.`,
      });
      return;
    }
    console.error("[trading proxy] upstream GET failed", {
      path,
      source: creds.source,
      error,
    });
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function proxyTradingPost(
  req: NextApiRequest,
  res: NextApiResponse,
  path: string,
  body?: unknown,
  options?: { upstreamTimeoutMs?: number },
): Promise<void> {
  const creds = resolveTradingCredentials(req);
  if (!creds) {
    credentialsRequiredResponse(res);
    return;
  }

  const controller = options?.upstreamTimeoutMs
    ? new AbortController()
    : null;
  const timer =
    controller && options?.upstreamTimeoutMs
      ? setTimeout(() => controller.abort(), options.upstreamTimeoutMs)
      : null;

  try {
    const upstream = await fetch(`${creds.baseUrl}${path}${upstreamQuery(req)}`, {
      method: "POST",
      headers: {
        "X-API-Key": creds.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body ?? req.body ?? {}),
      signal: controller?.signal,
    });

    await forwardUpstreamResponse(res, upstream);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function proxyTradingPatch(
  req: NextApiRequest,
  res: NextApiResponse,
  path: string,
  body?: unknown,
): Promise<void> {
  const creds = resolveTradingCredentials(req);
  if (!creds) {
    credentialsRequiredResponse(res);
    return;
  }

  try {
    const upstream = await fetch(`${creds.baseUrl}${path}${upstreamQuery(req)}`, {
      method: "PATCH",
      headers: {
        "X-API-Key": creds.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body ?? req.body ?? {}),
    });

    await forwardUpstreamResponse(res, upstream);
  } catch (error) {
    console.error("[trading proxy] upstream PATCH failed", {
      path,
      source: creds.source,
      baseUrl: creds.baseUrl,
      error,
    });
    res.status(502).json({
      detail:
        error instanceof Error
          ? `Trading API unreachable (${creds.baseUrl}): ${error.message}`
          : `Trading API unreachable (${creds.baseUrl})`,
    });
  }
}

export async function proxyTradingDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  path: string,
): Promise<void> {
  const creds = resolveTradingCredentials(req);
  if (!creds) {
    credentialsRequiredResponse(res);
    return;
  }

  const upstream = await fetch(`${creds.baseUrl}${path}${upstreamQuery(req)}`, {
    method: "DELETE",
    headers: { "X-API-Key": creds.apiKey },
  });

  await forwardUpstreamResponse(res, upstream);
}
