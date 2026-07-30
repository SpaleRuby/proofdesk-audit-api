import { isAuditInputError, runAudit } from "@/lib/audit";
import { readUrlRequest } from "@/lib/url-request";
import { NextRequest, NextResponse } from "next/server";

const responseHeaders = {
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
};

export async function auditHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const input = await readUrlRequest(request);
    if (!input.ok) {
      return NextResponse.json(
        { error: input.error },
        { status: 400, headers: responseHeaders },
      );
    }

    const report = await runAudit(input.url);
    return NextResponse.json(report, {
      headers: responseHeaders,
    });
  } catch (error) {
    if (isAuditInputError(error)) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers: responseHeaders },
      );
    }

    const message = error instanceof Error && error.name === "TimeoutError"
      ? "The page did not respond before the audit timeout"
      : "The page could not be audited";

    return NextResponse.json(
      { error: message },
      { status: 502, headers: responseHeaders },
    );
  }
}
