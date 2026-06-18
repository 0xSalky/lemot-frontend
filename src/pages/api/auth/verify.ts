import {
  forwardUpstreamResponse,
  resolveTradingCredentialsFromBody,
} from "@/lib/tradingApiProxy";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const creds = resolveTradingCredentialsFromBody(req.body);
  if (!creds) {
    return res.status(400).json({
      detail: "Valid apiUrl and apiKey are required",
    });
  }

  const upstream = await fetch(`${creds.baseUrl}/account/balance`, {
    method: "GET",
    headers: { "X-API-Key": creds.apiKey },
  });

  if (upstream.ok) {
    return res.status(200).json({ ok: true });
  }

  await forwardUpstreamResponse(res, upstream);
}
