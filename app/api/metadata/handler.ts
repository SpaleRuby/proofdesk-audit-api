import { isAuditInputError, runMetadata } from "@/lib/audit";
import { readUrlRequest } from "@/lib/url-request";
import { NextRequest, NextResponse } from "next/server";

const responseHeaders = {
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
};

export async function metadataHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const input = await readUrlRequest(request);
    if (!input.ok) {
      return NextResponse.json(
        { error: input.error },
        { status: 400, headers: responseHeaders },
      );
    }

    const report = await runMetadata(input.url);
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
      ? "The page did not respond before the metadata timeout"
      : "The page metadata could not be extracted";

    return NextResponse.json(
      { error: message },
      { status: 502, headers: responseHeaders },
    );
  }
}
