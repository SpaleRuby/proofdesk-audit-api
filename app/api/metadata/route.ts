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
import { getPublicUrl } from "../../../lib/public-url";
import {
  MANAGED_HOST_POLICY_SUMMARY,
  SUPPORTED_MANAGED_HOSTS,
} from "../../../lib/managed-hosts";
import { rejectInvalidPageRequest } from "../../../lib/page-request-preflight";
import { metadataHandler } from "./handler";

export const runtime = "edge";

const BASE_MAINNET = "eip155:8453";
const SOLANA_MAINNET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";

const metadataRoute: RouteConfig = {
  accepts: [
    {
      scheme: "exact",
      price: "$0.01",
      network: BASE_MAINNET,
      payTo: "0x36D130BEed8E68Bbd74225F1f56a381BB5B3C23F",
    },
    {
      scheme: "exact",
      price: "$0.01",
      network: SOLANA_MAINNET,
      payTo: "BeNzbeMCKUkgAysej51HpjPDPg57wJYQmUvxC2EQsnXc",
    },
  ],
  description:
    `Extract declared SEO and social-preview metadata from a page on a supported managed-hosting domain. ${MANAGED_HOST_POLICY_SUMMARY}`,
  mimeType: "application/json",
  serviceName: "ProofDesk",
  tags: [
    "website",
    "metadata",
    "technical-seo",
    "social-preview",
    "open-graph",
    "twitter-card",
    "canonical",
  ],
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
          description:
            `HTTPS page on a supported managed-hosting domain. Accepted apex domains and subdomains: ${SUPPORTED_MANAGED_HOSTS.join(", ")}. Arbitrary custom domains are rejected.`,
        },
      },
      required: ["url"],
      additionalProperties: false,
    },
    output: {
      example: {
        metadataId: "pdm_example",
        requestedUrl: "https://example.com/",
        finalUrl: "https://example.com/",
        fetchedAt: "2026-07-30T00:00:00.000Z",
        elapsedMs: 120,
        httpStatus: 200,
        redirects: [],
        metadata: {
          title: "Example Domain",
          description: "A public example page.",
          canonical: "https://example.com/",
          language: "en",
          viewport: "width=device-width, initial-scale=1",
          robots: null,
          favicon: "/favicon.ico",
          openGraph: {
            title: "Example Domain",
            description: "A public example page.",
            image: "/preview.png",
            url: "https://example.com/",
            type: "website",
            siteName: null,
          },
          twitter: {
            card: "summary_large_image",
            title: null,
            description: null,
            image: null,
          },
        },
        missingFields: [
          "robots",
          "openGraph.siteName",
          "twitter.title",
          "twitter.description",
          "twitter.image",
        ],
        source: "server-rendered-html",
        disclaimer:
          "Declared values from the fetched HTML source only; JavaScript rendering and social-platform preview behavior are not evaluated.",
      },
      schema: {
        type: "object",
        properties: {
          metadataId: { type: "string" },
          requestedUrl: { type: "string" },
          finalUrl: { type: "string" },
          fetchedAt: { type: "string" },
          elapsedMs: { type: "integer" },
          httpStatus: { type: "integer" },
          redirects: { type: "array", items: { type: "string" } },
          metadata: { type: "object" },
          missingFields: { type: "array", items: { type: "string" } },
          source: { type: "string", enum: ["server-rendered-html"] },
          disclaimer: { type: "string" },
        },
        required: [
          "metadataId",
          "requestedUrl",
          "finalUrl",
          "fetchedAt",
          "elapsedMs",
          "httpStatus",
          "redirects",
          "metadata",
          "missingFields",
          "source",
          "disclaimer",
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
  "POST /api/metadata": metadataRoute,
});

const protectedPost = withX402FromHTTPServer(
  (request: NextRequest) => metadataHandler(request),
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
  const preflight = await rejectInvalidPageRequest(request);
  if (!preflight.ok) return preflight.response;

  await ensureInitialized();
  const publicRequestInit: RequestInit & { duplex: "half" } = {
    method: request.method,
    headers: request.headers,
    body: preflight.body,
    signal: request.signal,
    duplex: "half",
  };
  const publicRequest = new NextRequest(
    new Request(getPublicUrl(request), publicRequestInit),
  );
  return protectedPost(publicRequest);
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
