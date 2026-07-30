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
      "Deterministic source-level launch QA for public HTTPS pages, paid per completed JSON report through x402.",
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
          "Audit one public HTTPS page for launch metadata, indexability, page structure, social previews, and a bounded same-host link sample. Returns evidence and suggested fixes as JSON.",
        endpoint: "/api/audit",
        method: "POST",
        parameters: {
          url: {
            type: "string",
            required: true,
            description: "The public HTTPS page to audit.",
          },
        },
        returns: {
          type: "object",
          description:
            "A launch-readiness score, pass/warn/fail counts, evidence-backed checks, prioritized issues, and a bounded link sample.",
        },
        price: {
          amount: 0.1,
          currency: "USDC",
          model: "per_call",
          network: ["base", "solana"],
        },
        payments: {
          x402: {
            direct_price: 0.1,
            description:
              "Pay $0.10 USDC per completed audit through x402 on Base or Solana.",
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
          "Source-level launch preflight only; not penetration testing, legal advice, or a complete accessibility certification.",
      },
    },
  };
}
