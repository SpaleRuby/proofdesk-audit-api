# ProofDesk Launch Audit API

ProofDesk turns one public HTTPS page into either a deterministic,
machine-readable launch report for `$0.04 USDC` or a declared metadata
response for `$0.01 USDC`. Both paid endpoints use the open x402 protocol.

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
- `GET /.well-known/agent.json` — agent.json 1.4 capability and payment manifest
- `POST /api/audit` — paid launch audit
- `POST /api/metadata` — paid declared metadata extraction
- `POST /api/marketplace/audit` — private PayanAgent proxy fulfillment route

The paid routes accept:

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

For declared metadata only, use the lighter endpoint:

```bash
curl -X POST \
  "https://idea-thickness-vpn-criteria.trycloudflare.com/api/metadata" \
  -H "content-type: application/json" \
  -d '{"url":"https://example.com"}'
```

It returns the title, description, canonical, language, viewport, meta robots,
favicon, Open Graph, and Twitter Card values declared in the fetched HTML.
Missing declarations are returned as `null` and listed in `missingFields`.
It does not render JavaScript, fetch linked assets, probe links, or emulate a
social-platform preview.

These curl commands only inspect payment challenges; they do not settle them.
For a complete Base purchase, use the checked-in
[`examples/pay-with-base.mjs`](examples/pay-with-base.mjs) client. It reads the
wallet key from the environment, requires an explicit 4-cent confirmation,
and refuses to sign if the price, USDC contract, network, or receiver differs
from the published ProofDesk offer.

```powershell
$walletKey = Read-Host "Funded Base wallet private key" -AsSecureString
$env:EVM_PRIVATE_KEY = [System.Net.NetworkCredential]::new("", $walletKey).Password
try {
  $env:PROOFDESK_CONFIRM_4_CENT_PAYMENT = "YES"
  node examples/pay-with-base.mjs https://example.com
} finally {
  Remove-Item Env:EVM_PRIVATE_KEY, Env:PROOFDESK_CONFIRM_4_CENT_PAYMENT
}
```

The wallet must hold at least `$0.04` of native USDC on Base. Never paste the
key into the script, issue tracker, command line, or repository.

### PayanAgent marketplace proxy

`POST /api/marketplace/audit?token=...` is reserved for server-to-server
fulfillment through a configured PayanAgent native offer. It runs the same
bounded audit as `/api/audit`, but it does not invoke x402 because marketplace
payment is handled outside this route. It is not a public, free alternative to
the paid endpoint.

Set `PAYANAGENT_PROXY_TOKEN` in the deployment environment and configure the
same token only in the private PayanAgent offer endpoint URL. The checked-in
`.env.example` intentionally leaves it blank. Requests with an absent,
incorrect, or unconfigured token all receive the same `404 Not Found`
response. Query-string credentials can appear in proxy access logs, so rotate
the token if the configured endpoint URL is ever exposed.

Each running service instance admits at most 12 authorized marketplace calls
per rolling 60 seconds and runs at most two audits concurrently. Excess calls
receive a non-cacheable `429` response with `Retry-After`.

## Protocol validation

On 2026-07-30, Coinbase's unauthenticated, read-only
[x402 endpoint validator](https://docs.cdp.coinbase.com/x402/validate-endpoint)
returned `valid: true` for the live `POST /api/audit` route: HTTP 402, x402 v2,
the payment-required header, and the Bazaar input/output metadata all passed,
with simulation outcome `accepted`. This proves discovery readiness; it does
not claim that the temporary tunnel URL is indexed in CDP Bazaar.

You can repeat the no-payment check with:

```bash
curl -X POST https://api.cdp.coinbase.com/platform/v2/x402/validate \
  -H "content-type: application/json" \
  -d '{"resource":"https://idea-thickness-vpn-criteria.trycloudflare.com/api/audit","method":"POST"}'
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

- full launch audit: `$0.04 USDC`
- declared metadata extraction: `$0.01 USDC`
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

Both public paid routes accept only public HTTPS hostnames, follow at most
three validated redirects, cap HTML input at 1.25 MB, and use bounded request
timeouts. The full audit samples at most six same-host links; metadata
extraction performs no link or asset probes.
