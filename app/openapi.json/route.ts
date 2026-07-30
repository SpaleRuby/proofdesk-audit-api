export const runtime = "edge";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const specification = {
    openapi: "3.1.0",
    info: {
      title: "ProofDesk Launch Audit API",
      version: "1.0.0",
      description:
        "Deterministic source-level launch checks for a public HTTPS page. The audit endpoint costs $0.10 USDC through x402 on Base or Solana.",
      contact: {
        url: "https://github.com/SpaleRuby/proofdesk-launch-check",
      },
    },
    servers: [{ url: origin }],
    paths: {
      "/api/health": {
        get: {
          operationId: "getHealth",
          summary: "Check service health and payment networks",
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
          summary: "Audit a public HTTPS launch page",
          description:
            "Returns HTTP 402 with x402 payment requirements until $0.10 USDC is settled on Base or Solana.",
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
              description: "x402 payment required",
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
