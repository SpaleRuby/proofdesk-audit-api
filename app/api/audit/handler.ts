import { isAuditInputError, runAudit } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";

export async function auditHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400, headers: { "access-control-allow-origin": "*" } },
      );
    }

    const body = (await request.json()) as { url?: unknown };
    if (typeof body.url !== "string" || !body.url.trim()) {
      return NextResponse.json(
        { error: "Request body must include a non-empty url string" },
        { status: 400, headers: { "access-control-allow-origin": "*" } },
      );
    }

    const report = await runAudit(body.url.trim());
    return NextResponse.json(report, {
      headers: {
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      },
    });
  } catch (error) {
    if (isAuditInputError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: { "access-control-allow-origin": "*" } },
      );
    }

    const message = error instanceof Error && error.name === "TimeoutError"
      ? "The page did not respond before the audit timeout"
      : "The page could not be audited";

    return NextResponse.json(
      { error: message },
      { status: 502, headers: { "access-control-allow-origin": "*" } },
    );
  }
}
