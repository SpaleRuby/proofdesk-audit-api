import { SUPPORTED_MANAGED_HOSTS } from "@/lib/managed-hosts";

export const runtime = "edge";

const instructions = `# ProofDesk Launch Audit API

> Deterministic source-level launch QA and declared metadata extraction for HTTPS pages on a temporary managed-host allowlist. No account or API key. Pay per request through x402 v2.

## Canonical resources

- Public demo: https://idea-thickness-vpn-criteria.trycloudflare.com
- Source and assisted orders: https://github.com/SpaleRuby/proofdesk-audit-api
- OpenAPI 3.1: https://idea-thickness-vpn-criteria.trycloudflare.com/openapi.json
- Free example response: https://idea-thickness-vpn-criteria.trycloudflare.com/api/example
- Health: https://idea-thickness-vpn-criteria.trycloudflare.com/api/health

## Paid endpoints

### Full launch audit — $0.04 USDC

POST https://idea-thickness-vpn-criteria.trycloudflare.com/api/audit
Content-Type: application/json
Body: {"url":"https://example.com"}

An unpaid request returns HTTP 402 and a PAYMENT-REQUIRED header. Payment options are $0.04 USDC on Base mainnet or Solana mainnet. The response is JSON with a score, pass/warn/fail counts, evidence, prioritized fixes, and a bounded same-host link sample. The report checks technical SEO and launch-readiness signals including title and description metadata, canonical and social tags, meta robots directives, page structure, and links.

### Declared metadata extraction — $0.01 USDC

POST https://idea-thickness-vpn-criteria.trycloudflare.com/api/metadata
Content-Type: application/json
Body: {"url":"https://example.com"}

The metadata endpoint returns the title, description, canonical, language, viewport, meta robots, favicon, Open Graph, and Twitter Card values declared in the fetched HTML source. Missing declarations are returned as null and listed in missingFields. It does not render JavaScript, fetch linked assets, probe links, or emulate a social platform preview.

## Scope

For temporary network-safety containment, the URL hostname must be one of these provider-owned managed-hosting domains or a subdomain:

${SUPPORTED_MANAGED_HOSTS.join(", ")}

Arbitrary custom domains are rejected before fetching. Every redirect is checked against the same allowlist, and only standard HTTPS port 443 is accepted. ProofDesk performs automated source-level launch heuristics. It is not penetration testing, legal advice, or a complete WCAG accessibility certification.

## Assisted service

A fixed-price $10 assisted audit adds evidence verification, a prioritized top-five action plan, concrete copy or markup suggestions, and one clarification. It is transparently AI-assisted. Open the structured request form in the source repository and wait for scope confirmation before paying.

## Hosting note

The current public demo uses an official Cloudflare Quick Tunnel. It is temporary, has no uptime SLA, and will move to a stable production hostname when one is available.
`;

export async function GET() {
  return new Response(instructions, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
      "access-control-allow-origin": "*",
    },
  });
}
