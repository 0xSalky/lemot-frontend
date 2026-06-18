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

  const threadId = req.query.thread_id;
  if (threadId == null || String(threadId).trim() === "") {
    return res.status(400).json({ detail: "thread_id is required" });
  }

  const creds = resolveTradingCredentials(req);
  if (!creds) {
    credentialsRequiredResponse(res);
    return;
  }

  const upstream = await fetch(
    `${creds.baseUrl}/scanner/chat/threads/${encodeURIComponent(String(threadId))}`,
    {
      method: "GET",
      headers: { "X-API-Key": creds.apiKey },
    },
  );

  await forwardUpstreamResponse(res, upstream);
}
