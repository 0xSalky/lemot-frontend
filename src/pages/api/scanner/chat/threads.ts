import { DEFAULT_TRADING_API_URL } from "@/services/config";
import type { NextApiRequest, NextApiResponse } from "next";

function apiKeyHeaders(): Record<string, string> | null {
  const apiKey = process.env.TRADING_API_KEY;
  if (!apiKey) return null;
  return { "X-API-Key": apiKey };
}

function baseUrl(): string {
  return (process.env.TRADING_API_URL ?? DEFAULT_TRADING_API_URL).replace(/\/$/, "");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const headers = apiKeyHeaders();
  if (!headers) {
    return res.status(503).json({
      detail: "TRADING_API_KEY is not configured on the Next.js server",
    });
  }

  const upstream = await fetch(`${baseUrl()}/scanner/chat/threads`, {
    method: "GET",
    headers,
  });

  const contentType = upstream.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  }

  const text = await upstream.text();
  return res.status(upstream.status).send(text);
}
