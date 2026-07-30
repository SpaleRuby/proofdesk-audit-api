import { NextRequest } from "next/server";
import { withX402FromHTTPServer } from "@x402/next";
import {
  HTTPFacilitatorClient,
  x402HTTPResourceServer,
  x402ResourceServer,
  type RouteConfig,
} from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { ExactSvmScheme } from "@x402/svm/exact/server";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { facilitator } from "@payai/facilitator";
import { auditHandler } from "./handler";

export const runtime = "edge";

const BASE_MAINNET = "eip155:8453";
const SOLANA_MAINNET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";

const auditRoute: RouteConfig = {
  resource: "https://idea-thickness-vpn-criteria.trycloudflare.com/api/audit",
  accepts: [
    {
      scheme: "exact",
      price: "$0.10",
      network: BASE_MAINNET,
      payTo: "0x36D130BEed8E68Bbd74225F1f56a381BB5B3C23F",
    },
    {
      scheme: "exact",
      price: "$0.10",
      network: SOLANA_MAINNET,
      payTo: "BeNzbeMCKUkgAysej51HpjPDPg57wJYQmUvxC2EQsnXc",
    },
  ],
  description:
    "Deterministic source-level launch report for a public HTTPS page, with metadata, indexability, structure, social preview, and bounded link checks.",
  mimeType: "application/json",
  serviceName: "ProofDesk",
  tags: ["website", "launch", "quality", "seo", "metadata"],
  extensions: declareDiscoveryExtension({
    bodyType: "json",
    input: {
      url: "https://example.com",
    },
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          pattern: "^https://",
          description: "Public HTTPS page to audit",
        },
      },
      required: ["url"],
      additionalProperties: false,
    },
    output: {
      example: {
        auditId: "pd_example",
        requestedUrl: "https://example.com/",
        finalUrl: "https://example.com/",
        score: 82,
        summary: { pass: 13, warn: 3, fail: 1 },
        issues: [
          {
            severity: "warn",
            check: "social-image",
            evidence: "og:image is missing",
            fix: "Add an absolute HTTPS og:image URL, ideally 1200×630.",
          },
        ],
        checks: [
          {
            check: "http-status",
            label: "HTTP status",
            status: "pass",
            evidence: "Final response returned HTTP 200",
          },
        ],
      },
      schema: {
        type: "object",
        properties: {
          auditId: { type: "string" },
          requestedUrl: { type: "string" },
          finalUrl: { type: "string" },
          score: { type: "integer" },
          summary: {
            type: "object",
            properties: {
              pass: { type: "integer" },
              warn: { type: "integer" },
              fail: { type: "integer" },
            },
          },
          issues: {
            type: "array",
            items: { type: "object" },
          },
          checks: {
            type: "array",
            items: { type: "object" },
          },
        },
        required: [
          "auditId",
          "requestedUrl",
          "finalUrl",
          "score",
          "summary",
          "issues",
          "checks",
        ],
      },
    },
  }),
};

const resourceServer = new x402ResourceServer(
  new HTTPFacilitatorClient(facilitator),
)
  .register(BASE_MAINNET, new ExactEvmScheme())
  .register(SOLANA_MAINNET, new ExactSvmScheme());

const httpServer = new x402HTTPResourceServer(resourceServer, {
  "POST /api/audit": auditRoute,
});

const protectedPost = withX402FromHTTPServer(
  (request: NextRequest) => auditHandler(request),
  httpServer,
  undefined,
  undefined,
  false,
);

let initialization: Promise<void> | null = null;

async function ensureInitialized() {
  if (!initialization) {
    initialization = httpServer.initialize().catch((error) => {
      initialization = null;
      throw error;
    });
  }

  await initialization;
}

export async function POST(request: NextRequest) {
  await ensureInitialized();
  return protectedPost(request);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type, payment-signature, x-payment",
      "access-control-max-age": "86400",
    },
  });
}
