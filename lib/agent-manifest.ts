import { SUPPORTED_MANAGED_HOSTS } from "./managed-hosts.ts";

const BASE_PAYEE = "0x36D130BEed8E68Bbd74225F1f56a381BB5B3C23F";
const SOLANA_PAYEE = "BeNzbeMCKUkgAysej51HpjPDPg57wJYQmUvxC2EQsnXc";
const PAYAI_FACILITATOR = "https://facilitator.payai.network";

export function createAgentManifest(requestUrl: string) {
  const origin = new URL(requestUrl).host;

  return {
    version: "1.4",
    origin,
    payout_address: BASE_PAYEE,
    display_name: "ProofDesk Launch Audit API",
    description:
      "Launch QA and declared metadata extraction for HTTPS pages on a temporary managed-host allowlist, paid per completed JSON report through x402. Arbitrary custom domains are blocked before fetching.",
    payments: {
      x402: {
        networks: [
          {
            network: "base",
            asset: "USDC",
            contract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
            facilitator: PAYAI_FACILITATOR,
            recipient: BASE_PAYEE,
          },
          {
            network: "solana",
            asset: "USDC",
            contract: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            facilitator: PAYAI_FACILITATOR,
            recipient: SOLANA_PAYEE,
          },
        ],
      },
    },
    intents: [
      {
        name: "audit_launch_page",
        description:
          "Audit one HTTPS page on a supported managed-hosting domain for technical SEO, metadata, page structure, and a bounded same-host link sample. Arbitrary custom domains are rejected before fetching, and redirects must remain on the allowlist.",
        endpoint: "/api/audit",
        method: "POST",
        parameters: {
          url: {
            type: "string",
            required: true,
            description:
              "An HTTPS page on a documented managed-hosting apex domain or subdomain.",
          },
        },
        returns: {
          type: "object",
          description:
            "A launch-readiness score, pass/warn/fail counts, evidence-backed checks, prioritized issues, and a bounded link sample.",
        },
        price: {
          amount: 0.04,
          currency: "USDC",
          model: "per_call",
          network: ["base", "solana"],
        },
        payments: {
          x402: {
            direct_price: 0.04,
            description:
              "Pay $0.04 USDC per completed audit through x402 on Base or Solana.",
          },
        },
      },
      {
        name: "extract_page_metadata",
        description:
          "Extract declared metadata from one HTTPS page on a supported managed-hosting domain. Arbitrary custom domains are rejected before fetching, redirects must remain on the allowlist, and missing declarations are explicit. No JavaScript rendering, asset fetching, link probing, or platform-preview emulation.",
        endpoint: "/api/metadata",
        method: "POST",
        parameters: {
          url: {
            type: "string",
            required: true,
            description:
              "An HTTPS page on a documented managed-hosting apex domain or subdomain.",
          },
        },
        returns: {
          type: "object",
          description:
            "Raw declared metadata values, explicit missing fields, HTTP status, redirects, and the final URL.",
        },
        price: {
          amount: 0.01,
          currency: "USDC",
          model: "per_call",
          network: ["base", "solana"],
        },
        payments: {
          x402: {
            direct_price: 0.01,
            description:
              "Pay $0.01 USDC per metadata extraction through x402 on Base or Solana.",
          },
        },
      },
      {
        name: "get_example_audit",
        description:
          "Inspect a representative ProofDesk audit response without payment.",
        endpoint: "/api/example",
        method: "GET",
        returns: {
          type: "object",
          description: "A free representative launch-audit response.",
        },
      },
    ],
    extensions: {
      proofdesk: {
        openapi: "/openapi.json",
        agent_instructions: "/llms.txt",
        scope:
          "Source-level launch preflight for allowlisted managed-hosting pages only; not penetration testing, legal advice, or a complete accessibility certification.",
        input_policy: {
          mode: "managed-host-allowlist",
          custom_domains: false,
          supported_managed_hosts: SUPPORTED_MANAGED_HOSTS,
        },
      },
    },
  };
}
