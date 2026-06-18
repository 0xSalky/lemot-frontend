import { proxyTradingGet } from "@/lib/tradingApiProxy";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const symbol = typeof req.query.symbol === "string" ? req.query.symbol.trim() : "";
  if (!symbol) {
    res.status(400).json({ detail: "symbol query parameter is required." });
    return;
  }

  const params = new URLSearchParams({ symbol });
  const timeframe =
    typeof req.query.timeframe === "string" ? req.query.timeframe.trim() : "";
  if (timeframe) {
    params.set("timeframe", timeframe);
  }

  await proxyTradingGet(req, res, `/scanner/chart?${params.toString()}`);
}
