import type { NextApiRequest, NextApiResponse } from "next";
import { proxyTradingGet } from "@/lib/tradingApiProxy";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") {
    await proxyTradingGet(req, res, "/alerts/health");
    return;
  }
  res.setHeader("Allow", "GET");
  return res.status(405).json({ error: "Method not allowed" });
}
