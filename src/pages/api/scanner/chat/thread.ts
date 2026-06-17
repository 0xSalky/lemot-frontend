import { DEFAULT_TRADING_API_URL } from "@/services/config";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const threadId = req.query.thread_id;
  if (threadId == null || String(threadId).trim() === "") {
    return res.status(400).json({ detail: "thread_id is required" });
  }

  const apiKey = process.env.TRADING_API_KEY;
  const baseUrl = (
    process.env.TRADING_API_URL ?? DEFAULT_TRADING_API_URL
  ).replace(/\/$/, "");

  if (!apiKey) {
    return res.status(503).json({
      detail: "TRADING_API_KEY is not configured on the Next.js server",
    });
  }

  const upstream = await fetch(
    `${baseUrl}/scanner/chat/threads/${encodeURIComponent(String(threadId))}`,
    {
      method: "GET",
      headers: { "X-API-Key": apiKey },
    },
  );

  const contentType = upstream.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  }

  const text = await upstream.text();
  return res.status(upstream.status).send(text);
}
