export const runtime = "edge";

export async function GET() {
  return Response.json(
    {
      ok: true,
      service: "ProofDesk Launch Audit API",
      version: "1.0.0",
      payment: {
        protocol: "x402",
        price: "$0.04",
        asset: "USDC",
        networks: ["Base", "Solana"],
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
