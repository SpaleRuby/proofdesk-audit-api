# ProofDesk Launch Audit API

ProofDesk turns one public HTTPS page into a deterministic, machine-readable
launch report. The paid endpoint uses the open x402 protocol and costs
`$0.10 USDC` per completed request.

Live public URL for the overnight launch:
`https://idea-thickness-vpn-criteria.trycloudflare.com`

This is an official Cloudflare Quick Tunnel and is intentionally treated as a
temporary launch endpoint. It has no uptime SLA and changes if the tunnel is
restarted.

## Endpoints

- `GET /api/health` — service and payment-network status
- `GET /api/example` — free representative response
- `GET /openapi.json` — OpenAPI 3.1 description
- `GET /llms.txt` — compact agent-facing instructions
- `POST /api/audit` — paid launch audit

The paid route accepts:

```json
{
  "url": "https://example.com"
}
```

A plain request receives HTTP `402` and standard x402 payment requirements.
An x402-aware client can settle and retry automatically.

```bash
curl -X POST \
  "https://idea-thickness-vpn-criteria.trycloudflare.com/api/audit" \
  -H "content-type: application/json" \
  -d '{"url":"https://example.com"}'
```

## Assisted audit — $10

For buyers who want a prioritized action plan instead of raw JSON, the
[assisted audit request](https://github.com/SpaleRuby/proofdesk-audit-api/issues/new?template=assisted-audit.yml)
includes the full report, evidence verification, five prioritized fixes,
concrete copy or markup suggestions, and one clarification. It is transparently
AI-assisted. No payment is requested until the public page, scope, network, and
delivery estimate are confirmed.

## What the report checks

The report contains 15+ source-level launch checks covering:

- status and redirects;
- title, description, canonical URL, language and viewport;
- primary heading and form-label heuristics;
- Open Graph, Twitter card and favicon declarations;
- robots indexability and JSON-LD validity;
- a bounded sample of same-host links.

Every non-passing check includes evidence and a suggested fix. This is a
preflight report, not penetration testing, legal advice, or a complete WCAG
accessibility certification.

## Payment

- price: `$0.10 USDC`
- Base mainnet receiver:
  `0x36D130BEed8E68Bbd74225F1f56a381BB5B3C23F`
- Solana mainnet receiver:
  `BeNzbeMCKUkgAysej51HpjPDPg57wJYQmUvxC2EQsnXc`
- facilitator: PayAI
- discovery metadata: x402 Bazaar extension

## Local development

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev
npm run build
npm test
```

The audit accepts only public HTTPS hostnames, follows at most three validated
redirects, caps HTML input at 1.25 MB, samples at most six same-host links, and
uses bounded request timeouts.
