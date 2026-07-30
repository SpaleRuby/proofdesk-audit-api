import { SUPPORTED_MANAGED_HOSTS } from "@/lib/managed-hosts";

export const runtime = "edge";

export async function GET() {
  return Response.json(
    {
      ok: true,
      service: "ProofDesk Launch Audit API",
      version: "1.0.0",
      inputPolicy: {
        mode: "managed-host-allowlist",
        customDomains: false,
        supportedManagedHosts: SUPPORTED_MANAGED_HOSTS,
      },
      payment: {
        protocol: "x402",
        price: "$0.04",
        asset: "USDC",
        networks: ["Base", "Solana"],
        routes: {
          "/api/audit": "$0.04",
          "/api/metadata": "$0.01",
        },
      },
    },
    {
      headers: {
        "cache-control": "public, max-age=60",
        "access-control-allow-origin": "*",
      },
    },
  );
}
