import { proxyTradingGet, proxyTradingPost } from "@/lib/tradingApiProxy";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method === "GET") {
    await proxyTradingGet(req, res, "/signals/journal/sync");
    return;
  }

  if (req.method === "POST") {
    // Query `full` / `profile` forwarded via upstreamQuery(req).
    await proxyTradingPost(req, res, "/signals/journal/sync", {}, {
      upstreamTimeoutMs: 180_000,
    });
    return;
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
