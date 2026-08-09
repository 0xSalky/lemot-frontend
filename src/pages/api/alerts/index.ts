import type { NextApiRequest, NextApiResponse } from "next";
import { proxyTradingGet, proxyTradingPost } from "@/lib/tradingApiProxy";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") {
    await proxyTradingGet(req, res, "/alerts");
    return;
  }
  if (req.method === "POST") {
    await proxyTradingPost(req, res, "/alerts", req.body);
    return;
  }
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
