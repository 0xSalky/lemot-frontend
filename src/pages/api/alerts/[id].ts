import type { NextApiRequest, NextApiResponse } from "next";
import { proxyTradingDelete, proxyTradingPatch } from "@/lib/tradingApiProxy";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  const id = req.query.id;
  if (typeof id !== "string" || !id.trim()) {
    return res.status(400).json({ error: "missing id" });
  }
  const path = `/alerts/${encodeURIComponent(id)}`;
  if (req.method === "PATCH") {
    await proxyTradingPatch(req, res, path, req.body);
    return;
  }
  if (req.method === "DELETE") {
    await proxyTradingDelete(req, res, path);
    return;
  }
  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
