import {
  proxyTradingGet,
  proxyTradingPatch,
} from "@/lib/tradingApiProxy";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  if (req.method === "GET") {
    await proxyTradingGet(req, res, "/signals/runtime");
    return;
  }

  if (req.method === "PATCH") {
    await proxyTradingPatch(req, res, "/signals/runtime", req.body);
    return;
  }

  res.setHeader("Allow", "GET, PATCH");
  return res.status(405).json({ error: "Method not allowed" });
}
