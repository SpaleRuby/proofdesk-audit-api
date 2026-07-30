import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import { pathToFileURL } from "node:url";

const API_BASE =
  process.env.PROOFDESK_API_URL ??
  "https://idea-thickness-vpn-criteria.trycloudflare.com";
const NETWORK = "eip155:8453";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const PAYEE = "0x36D130BEed8E68Bbd74225F1f56a381BB5B3C23F";
const AMOUNT = "40000";

export function selectProofDeskBase(_version, options) {
  const exact = options.find(
    (option) =>
      option.scheme === "exact" &&
      option.network === NETWORK &&
      option.asset.toLowerCase() === USDC.toLowerCase() &&
      option.payTo.toLowerCase() === PAYEE.toLowerCase() &&
      option.amount === AMOUNT,
  );

  if (!exact) {
    throw new Error(
      "Payment challenge did not match the expected ProofDesk Base price, asset, and receiver; refusing to sign.",
    );
  }

  return exact;
}

function requireInput() {
  const targetUrl = process.argv[2];
  const privateKey = process.env.EVM_PRIVATE_KEY;

  if (!targetUrl || !/^https:\/\//i.test(targetUrl)) {
    throw new Error(
      "Pass one public HTTPS page: node examples/pay-with-base.mjs https://example.com",
    );
  }
  if (!privateKey || !/^0x[0-9a-f]{64}$/i.test(privateKey)) {
    throw new Error(
      "Set EVM_PRIVATE_KEY to a funded Base wallet key. Never paste or commit it.",
    );
  }
  const paymentConfirmed =
    process.env.PROOFDESK_CONFIRM_4_CENT_PAYMENT === "YES" ||
    process.env.PROOFDESK_CONFIRM_10_CENT_PAYMENT === "YES";
  if (!paymentConfirmed) {
    throw new Error(
      "Set PROOFDESK_CONFIRM_4_CENT_PAYMENT=YES to authorize exactly one $0.04 USDC request.",
    );
  }

  return { targetUrl, privateKey };
}

async function main() {
  const { targetUrl, privateKey } = requireInput();
  const signer = privateKeyToAccount(privateKey);
  const client = new x402Client(selectProofDeskBase).register(
    NETWORK,
    new ExactEvmScheme(signer),
  );
  const paidFetch = wrapFetchWithPayment(fetch, client);

  const response = await paidFetch(`${API_BASE}/api/audit`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ url: targetUrl }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(`ProofDesk returned HTTP ${response.status}: ${JSON.stringify(body)}`);
  }

  const settlement = response.headers.get("payment-response");
  console.log(
    JSON.stringify(
      {
        settlement: settlement ? "confirmed" : "header unavailable",
        report: body,
      },
      null,
      2,
    ),
  );
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
