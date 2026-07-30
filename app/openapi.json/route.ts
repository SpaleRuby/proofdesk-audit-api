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
        "Deterministic website and landing-page launch checks for technical SEO, metadata, indexability, page structure, social previews, and a bounded internal-link sample. The audit endpoint costs $0.04 USDC through x402 on Base or Solana.",
      "x-guidance":
        "Use POST /api/audit with a JSON body containing one public HTTPS URL. An unpaid request returns an x402 challenge; after payment, the operation returns a structured source-level launch report. Use GET /api/example to inspect the response shape for free. Do not treat the result as penetration testing or a complete accessibility certification.",
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
