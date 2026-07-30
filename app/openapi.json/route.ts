import { getPublicOrigin } from "../../lib/public-url";

export const runtime = "edge";

export async function GET(request: Request) {
  const origin = getPublicOrigin(request);
  const specification = {
    openapi: "3.1.0",
    info: {
      title: "ProofDesk Launch Audit API",
      version: "1.0.0",
      description:
        "Deterministic website launch checks and declared metadata extraction for public HTTPS pages. The full audit costs $0.04 USDC; metadata extraction costs $0.01 USDC through x402 on Base or Solana.",
      "x-guidance":
        "Use POST /api/audit for an evidence-backed launch report or POST /api/metadata for raw declared metadata values. Both accept a JSON body containing one public HTTPS URL and return an x402 challenge before payment. Metadata extraction reads server-returned HTML without JavaScript rendering or link probes. Use GET /api/example to inspect the audit response shape for free.",
      contact: {
        url: "https://github.com/SpaleRuby/proofdesk-audit-api",
      },
    },
    servers: [{ url: origin }],
    paths: {
      "/api/health": {
        get: {
          operationId: "getHealth",
          summary: "Check service health and payment networks",
          security: [],
          responses: {
            "200": {
              description: "Service status",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
      "/api/example": {
        get: {
          operationId: "getExampleAudit",
          summary: "Get a free example audit response",
          security: [],
          responses: {
            "200": {
              description: "Example launch report",
              content: { "application/json": { schema: { $ref: "#/components/schemas/AuditReport" } } },
            },
          },
        },
      },
      "/api/audit": {
        post: {
          operationId: "auditLaunchPage",
          summary:
            "Website launch audit: SEO metadata, page structure, and links",
          description:
            "Check one public HTTPS website or landing page before launch for title and description metadata, canonical and social tags, meta robots directives, page structure, and a bounded same-host link sample. Returns evidence-backed JSON issues and fixes after $0.04 USDC is settled on Base or Solana. Source-level launch QA only; not security testing.",
          tags: ["website audit", "landing page", "technical SEO", "launch readiness"],
          "x-payment-info": {
            price: {
              mode: "fixed",
              currency: "USD",
              amount: "0.040000",
            },
            protocols: [{ x402: {} }],
          },
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  additionalProperties: false,
                  required: ["url"],
                  properties: {
                    url: {
                      type: "string",
                      format: "uri",
                      pattern: "^https://",
                      description: "Public HTTPS page to inspect.",
                    },
                  },
                },
                examples: {
                  launchPage: { value: { url: "https://example.com" } },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Paid audit completed",
              content: { "application/json": { schema: { $ref: "#/components/schemas/AuditReport" } } },
            },
            "400": {
              description: "Invalid request or unsupported URL",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
            "402": {
              description: "Payment Required",
              headers: {
                "PAYMENT-REQUIRED": {
                  description: "Base64-encoded x402 payment requirements",
                  schema: { type: "string" },
                },
              },
            },
            "422": {
              description: "The page could not be audited",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
          },
        },
      },
      "/api/metadata": {
        post: {
          operationId: "extractPageMetadata",
          summary: "Extract declared SEO and social-preview metadata",
          description:
            "Extract title, description, canonical, language, viewport, meta robots, favicon, Open Graph, and Twitter Card declarations from the fetched HTML source of one public HTTPS page. No JavaScript rendering, asset fetching, link probing, or social-platform preview emulation is performed. Costs $0.01 USDC on Base or Solana.",
          tags: ["metadata", "technical SEO", "social preview", "Open Graph"],
          "x-payment-info": {
            price: {
              mode: "fixed",
              currency: "USD",
              amount: "0.010000",
            },
            protocols: [{ x402: {} }],
          },
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  additionalProperties: false,
                  required: ["url"],
                  properties: {
                    url: {
                      type: "string",
                      format: "uri",
                      pattern: "^https://",
                      description: "Public HTTPS page whose declared metadata should be extracted.",
                    },
                  },
                },
                examples: {
                  publicPage: { value: { url: "https://example.com" } },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Paid metadata extraction completed",
              content: { "application/json": { schema: { $ref: "#/components/schemas/MetadataReport" } } },
            },
            "400": {
              description: "Invalid request or unsupported URL",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
            "402": {
              description: "Payment Required",
              headers: {
                "PAYMENT-REQUIRED": {
                  description: "Base64-encoded x402 payment requirements",
                  schema: { type: "string" },
                },
              },
            },
            "422": {
              description: "The page metadata could not be extracted",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Check: {
          type: "object",
          required: ["check", "label", "status", "evidence"],
          properties: {
            check: { type: "string" },
            label: { type: "string" },
            status: { type: "string", enum: ["pass", "warn", "fail"] },
            evidence: { type: "string" },
            fix: { type: "string" },
          },
        },
        AuditReport: {
          type: "object",
          required: [
            "auditId",
            "requestedUrl",
            "finalUrl",
            "scannedAt",
            "elapsedMs",
            "score",
            "summary",
            "issues",
            "checks",
            "links",
            "disclaimer",
          ],
          properties: {
            auditId: { type: "string" },
            requestedUrl: { type: "string", format: "uri" },
            finalUrl: { type: "string", format: "uri" },
            scannedAt: { type: "string", format: "date-time" },
            elapsedMs: { type: "integer", minimum: 0 },
            score: { type: "integer", minimum: 0, maximum: 100 },
            summary: {
              type: "object",
              required: ["pass", "warn", "fail"],
              properties: {
                pass: { type: "integer" },
                warn: { type: "integer" },
                fail: { type: "integer" },
              },
            },
            issues: { type: "array", items: { type: "object" } },
            checks: { type: "array", items: { $ref: "#/components/schemas/Check" } },
            links: { type: "object" },
            disclaimer: { type: "string" },
          },
        },
        DeclaredPageMetadata: {
          type: "object",
          required: [
            "title",
            "description",
            "canonical",
            "language",
            "viewport",
            "robots",
            "favicon",
            "openGraph",
            "twitter",
          ],
          properties: {
            title: { type: ["string", "null"] },
            description: { type: ["string", "null"] },
            canonical: { type: ["string", "null"] },
            language: { type: ["string", "null"] },
            viewport: { type: ["string", "null"] },
            robots: { type: ["string", "null"] },
            favicon: { type: ["string", "null"] },
            openGraph: {
              type: "object",
              required: ["title", "description", "image", "url", "type", "siteName"],
              properties: {
                title: { type: ["string", "null"] },
                description: { type: ["string", "null"] },
                image: { type: ["string", "null"] },
                url: { type: ["string", "null"] },
                type: { type: ["string", "null"] },
                siteName: { type: ["string", "null"] },
              },
            },
            twitter: {
              type: "object",
              required: ["card", "title", "description", "image"],
              properties: {
                card: { type: ["string", "null"] },
                title: { type: ["string", "null"] },
                description: { type: ["string", "null"] },
                image: { type: ["string", "null"] },
              },
            },
          },
        },
        MetadataReport: {
          type: "object",
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
          properties: {
            metadataId: { type: "string" },
            requestedUrl: { type: "string", format: "uri" },
            finalUrl: { type: "string", format: "uri" },
            fetchedAt: { type: "string", format: "date-time" },
            elapsedMs: { type: "integer", minimum: 0 },
            httpStatus: { type: "integer" },
            redirects: { type: "array", items: { type: "string", format: "uri" } },
            metadata: { $ref: "#/components/schemas/DeclaredPageMetadata" },
            missingFields: { type: "array", items: { type: "string" } },
            source: { type: "string", enum: ["server-rendered-html"] },
            disclaimer: { type: "string" },
          },
        },
        Error: {
          type: "object",
          required: ["error"],
          properties: { error: { type: "string" } },
        },
      },
    },
  };

  return Response.json(specification, {
    headers: {
      "cache-control": "public, max-age=300",
      "access-control-allow-origin": "*",
    },
  });
}
