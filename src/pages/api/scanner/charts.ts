import { proxyTradingGet } from "@/lib/tradingApiProxy";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const symbols =
    typeof req.query.symbols === "string" ? req.query.symbols.trim() : "";
  if (!symbols) {
    res.status(400).json({ detail: "symbols query parameter is required." });
    return;
  }

  await proxyTradingGet(req, res, "/scanner/charts", { upstreamTimeoutMs: 90_000 });
}
