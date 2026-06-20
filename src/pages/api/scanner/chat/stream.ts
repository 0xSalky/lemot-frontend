import {
  credentialsRequiredResponse,
  resolveTradingCredentials,
} from "@/lib/tradingApiProxy";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const creds = resolveTradingCredentials(req);
  if (!creds) {
    credentialsRequiredResponse(res);
    return;
  }

  const upstream = await fetch(`${creds.baseUrl}/scanner/chat/stream`, {
    method: "POST",
    headers: {
      "X-API-Key": creds.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req.body ?? {}),
  });

  res.status(upstream.status);
  res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "text/event-stream");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (!upstream.body) {
    res.end();
    return;
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
  } finally {
    res.end();
  }
}
