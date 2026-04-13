import { DEFAULT_TRADING_API_URL } from "@/services/config";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
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

  const upstream = await fetch(`${baseUrl}/trade/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify(req.body),
  });

  const contentType = upstream.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  }

  const text = await upstream.text();
  return res.status(upstream.status).send(text);
}
