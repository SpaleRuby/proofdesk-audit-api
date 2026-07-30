import { auditHandler } from "@/app/api/audit/handler";
import { NextRequest } from "next/server";

export const runtime = "edge";

const encoder = new TextEncoder();
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;
const MAX_CONCURRENT_REQUESTS = 2;

const requestTimestamps: number[] = [];
let activeRequests = 0;

async function matchesProxyToken(
  provided: string | null,
  expected: string | undefined,
): Promise<boolean> {
  const providedBytes = encoder.encode(provided ?? "");
  const expectedBytes = encoder.encode(expected ?? "");
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", providedBytes),
    crypto.subtle.digest("SHA-256", expectedBytes),
  ]);

  const left = new Uint8Array(providedHash);
  const right = new Uint8Array(expectedHash);
  let difference = providedBytes.length ^ expectedBytes.length;

  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }

  return providedBytes.length > 0 && expectedBytes.length > 0 && difference === 0;
}

function notFound(): Response {
  return new Response("Not Found", {
    status: 404,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

function acquireAuditSlot():
  | { acquired: true; release: () => void }
  | { acquired: false; retryAfterSeconds: number } {
  const now = Date.now();
  const windowStart = now - RATE_WINDOW_MS;

  while (
    requestTimestamps.length > 0
    && requestTimestamps[0] <= windowStart
  ) {
    requestTimestamps.shift();
  }

  if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return {
      acquired: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((requestTimestamps[0] + RATE_WINDOW_MS - now) / 1_000),
      ),
    };
  }

  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    return { acquired: false, retryAfterSeconds: 1 };
  }

  requestTimestamps.push(now);
  activeRequests += 1;
  let released = false;

  return {
    acquired: true,
    release() {
      if (released) return;
      released = true;
      activeRequests = Math.max(0, activeRequests - 1);
    },
  };
}

function tooManyRequests(retryAfterSeconds: number): Response {
  return Response.json(
    { error: "Too many marketplace audit requests" },
    {
      status: 429,
      headers: {
        "cache-control": "no-store",
        "retry-after": String(retryAfterSeconds),
      },
    },
  );
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const authorized = await matchesProxyToken(
    token,
    process.env.PAYANAGENT_PROXY_TOKEN,
  );

  if (!authorized) {
    return notFound();
  }

  const slot = acquireAuditSlot();
  if (!slot.acquired) {
    return tooManyRequests(slot.retryAfterSeconds);
  }

  try {
    return await auditHandler(request);
  } finally {
    slot.release();
  }
}
