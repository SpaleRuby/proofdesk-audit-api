const FORWARDED_VALUE_SEPARATOR = ",";

function firstForwardedValue(value: string | null) {
  return value?.split(FORWARDED_VALUE_SEPARATOR, 1)[0]?.trim();
}

export function getPublicOrigin(request: Request) {
  const configuredOrigin = process.env.PROOFDESK_PUBLIC_ORIGIN?.trim();

  if (configuredOrigin) {
    const parsedOrigin = new URL(configuredOrigin);

    if (parsedOrigin.protocol !== "https:") {
      throw new Error("PROOFDESK_PUBLIC_ORIGIN must use HTTPS");
    }

    return parsedOrigin.origin;
  }

  const requestUrl = new URL(request.url);
  const forwardedProtocol = firstForwardedValue(
    request.headers.get("x-forwarded-proto"),
  );

  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? forwardedProtocol
      : requestUrl.protocol.slice(0, -1);

  return new URL(`${protocol}://${requestUrl.host}`).origin;
}

export function getPublicUrl(request: Request) {
  const requestUrl = new URL(request.url);
  const publicUrl = new URL(getPublicOrigin(request));
  publicUrl.pathname = requestUrl.pathname;
  return publicUrl.href;
}
