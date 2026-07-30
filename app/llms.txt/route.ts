import { SUPPORTED_MANAGED_HOSTS } from "@/lib/managed-hosts";
import { getPublicOrigin } from "@/lib/public-url";

export const runtime = "edge";

function createInstructions(origin: string) {
  return `# ProofDesk Launch Audit API

> Deterministic source-level launch QA and declared metadata extraction for HTTPS pages on a temporary managed-host allowlist. No account or API key. Pay per request through x402 v2.

## Canonical resources

- Public API: ${origin}
- Source and assisted orders: https://github.com/SpaleRuby/proofdesk-audit-api
- OpenAPI 3.1: ${origin}/openapi.json
- Free example response: ${origin}/api/example
- Health: ${origin}/api/health

## Paid endpoints

### Full launch audit — $0.04 USDC

POST ${origin}/api/audit
Content-Type: application/json
Body: {"url":"https://example.com"}

An unpaid request returns HTTP 402 and a PAYMENT-REQUIRED header. Payment options are $0.04 USDC on Base mainnet or Solana mainnet. The response is JSON with a score, pass/warn/fail counts, evidence, prioritized fixes, and a bounded same-host link sample. The report checks technical SEO and launch-readiness signals including title and description metadata, canonical and social tags, meta robots directives, page structure, and links.

### Declared metadata extraction — $0.01 USDC

POST ${origin}/api/metadata
Content-Type: application/json
Body: {"url":"https://example.com"}

The metadata endpoint returns the title, description, canonical, language, viewport, meta robots, favicon, Open Graph, and Twitter Card values declared in the fetched HTML source. Missing declarations are returned as null and listed in missingFields. It does not render JavaScript, fetch linked assets, probe links, or emulate a social platform preview.

## Scope

For temporary network-safety containment, the URL hostname must be one of these provider-owned managed-hosting domains or a subdomain:

${SUPPORTED_MANAGED_HOSTS.join(", ")}

Arbitrary custom domains are rejected before fetching. Every redirect is checked against the same allowlist, and only standard HTTPS port 443 is accepted. ProofDesk performs automated source-level launch heuristics. It is not penetration testing, legal advice, or a complete WCAG accessibility certification.

## Assisted service

A fixed-price $10 assisted audit adds evidence verification, a prioritized top-five action plan, concrete copy or markup suggestions, and one clarification. It is transparently AI-assisted. Open the structured request form in the source repository and wait for scope confirmation before paying.

## Hosting

The canonical API is published on a stable production hostname. Discover routes and schemas from the OpenAPI document above rather than caching an alternate origin.
`;
}

export async function GET(request: Request) {
  return new Response(createInstructions(getPublicOrigin(request)), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
      "access-control-allow-origin": "*",
    },
  });
}
