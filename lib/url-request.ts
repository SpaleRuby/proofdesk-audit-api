export type UrlRequestResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export async function readUrlRequest(request: Request): Promise<UrlRequestResult> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return {
      ok: false,
      error: "Content-Type must be application/json",
    };
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      error: "Request body must contain valid JSON",
    };
  }

  if (
    body === null
    || typeof body !== "object"
    || Array.isArray(body)
    || typeof (body as Record<string, unknown>).url !== "string"
    || !(body as Record<string, string>).url.trim()
  ) {
    return {
      ok: false,
      error: "Request body must include a non-empty url string",
    };
  }

  if (Object.keys(body).some((key) => key !== "url")) {
    return {
      ok: false,
      error: "Request body must not include properties other than url",
    };
  }

  return {
    ok: true,
    url: (body as Record<string, string>).url.trim(),
  };
}
