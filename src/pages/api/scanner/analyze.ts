import { proxyTradingPost } from "@/lib/tradingApiProxy";
import type { NextApiRequest, NextApiResponse } from "next";

/** Claude batch analysis can run several minutes; match scanner/run timeout. */
export const config = {
  maxDuration: 300,
};

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

  await proxyTradingPost(req, res, "/scanner/analyze", undefined, {
    upstreamTimeoutMs: 290 * 1000,
  });
}
