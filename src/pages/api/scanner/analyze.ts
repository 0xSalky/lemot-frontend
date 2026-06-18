import {
  credentialsRequiredResponse,
  forwardUpstreamResponse,
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

  const batchId = req.query.batch_id;
  const qs =
    batchId != null && String(batchId).trim() !== ""
      ? `?batch_id=${encodeURIComponent(String(batchId))}`
      : "";

  const upstream = await fetch(`${creds.baseUrl}/scanner/analyze${qs}`, {
    method: "POST",
    headers: { "X-API-Key": creds.apiKey },
  });

  await forwardUpstreamResponse(res, upstream);
}
