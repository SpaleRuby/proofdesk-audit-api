import { sampleReport } from "@/lib/sample-report";

export const runtime = "edge";

export async function GET() {
  return Response.json(sampleReport, {
    headers: {
      "cache-control": "public, max-age=3600",
      "access-control-allow-origin": "*",
    },
  });
}
