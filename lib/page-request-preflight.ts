import {
  isAuditInputError,
  validatePublicHttpsUrl,
} from "./audit.ts";
import { readUrlRequest } from "./url-request.ts";

const responseHeaders = {
  "access-control-allow-origin": "*",
  "cache-control": "no-store",
};
const MAX_REQUEST_BYTES = 4_096;

export type PageRequestPreflight =
  | { ok: true; body: string }
  | { ok: false; response: Response };

function badRequest(error: string, status = 400) {
  return Response.json(
    { error },
    {
      status,
      headers: responseHeaders,
    },
  );
}

export async function rejectInvalidPageRequest(
  request: Request,
): Promise<PageRequestPreflight> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_REQUEST_BYTES) {
    return {
      ok: false,
      response: badRequest(
        `Request body must not exceed ${MAX_REQUEST_BYTES} bytes`,
      ),
    };
  }

  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      total += value.byteLength;
      if (total > MAX_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined);
        return {
          ok: false,
          response: badRequest(
            `Request body must not exceed ${MAX_REQUEST_BYTES} bytes`,
          ),
        };
      }
      chunks.push(value);
    }
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const body = new TextDecoder().decode(bytes);
  const validationRequest = new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body,
  });
  const input = await readUrlRequest(validationRequest);
  if (!input.ok) {
    return { ok: false, response: badRequest(input.error) };
  }

  try {
    validatePublicHttpsUrl(input.url);
    return { ok: true, body };
  } catch (error) {
    if (isAuditInputError(error)) {
      return {
        ok: false,
        response: badRequest(error.message, error.status),
      };
    }
    throw error;
  }
}
