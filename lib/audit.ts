export type CheckStatus = "pass" | "warn" | "fail";

export type AuditCheck = {
  check: string;
  label: string;
  status: CheckStatus;
  evidence: string;
  fix?: string;
};

export type LinkResult = {
  url: string;
  status: number | null;
  ok: boolean;
};

export type AuditReport = {
  auditId: string;
  requestedUrl: string;
  finalUrl: string;
  scannedAt: string;
  elapsedMs: number;
  score: number;
  summary: Record<CheckStatus, number>;
  issues: Array<{
    severity: Exclude<CheckStatus, "pass">;
    check: string;
    evidence: string;
    fix: string;
  }>;
  checks: AuditCheck[];
  links: {
    sampled: number;
    broken: number;
    results: LinkResult[];
  };
  disclaimer: string;
};

class AuditInputError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AuditInputError";
    this.status = status;
  }
}

const MAX_HTML_BYTES = 1_250_000;
const MAX_REDIRECTS = 3;
const MAX_LINKS = 6;
const FETCH_TIMEOUT_MS = 9_000;
const LINK_TIMEOUT_MS = 4_000;

const blockedHostSuffixes = [
  ".localhost",
  ".local",
  ".internal",
  ".lan",
  ".home",
  ".test",
  ".invalid",
  ".example",
  ".onion",
];

function validatePublicHttpsUrl(raw: string): URL {
  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw new AuditInputError("url must be a valid absolute URL");
  }

  if (url.protocol !== "https:") {
    throw new AuditInputError("Only public HTTPS pages are supported");
  }

  if (url.username || url.password) {
    throw new AuditInputError("URLs containing credentials are not supported");
  }

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    !host ||
    host === "localhost" ||
    host.includes(":") ||
    /^[\d.]+$/.test(host) ||
    blockedHostSuffixes.some((suffix) => host.endsWith(suffix))
  ) {
    throw new AuditInputError("Only public hostnames are supported");
  }

  return url;
}

async function fetchPage(startUrl: URL) {
  let current = startUrl;
  const redirects: string[] = [];

  for (let index = 0; index <= MAX_REDIRECTS; index += 1) {
    const response = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "ProofDesk-Launch-Audit/1.0 (+https://proofdesk-audit-api.konstanta-work-x.chatgpt.site)",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new AuditInputError(`Page returned ${response.status} without a redirect location`, 422);
      }
      if (index === MAX_REDIRECTS) {
        throw new AuditInputError(`Page exceeded ${MAX_REDIRECTS} redirects`, 422);
      }

      current = validatePublicHttpsUrl(new URL(location, current).toString());
      redirects.push(current.toString());
      continue;
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new AuditInputError(`Expected an HTML page, received ${contentType}`, 422);
    }

    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_HTML_BYTES) {
      throw new AuditInputError(`Page is larger than the ${MAX_HTML_BYTES} byte audit limit`, 422);
    }

    const html = await readBodyWithLimit(response, MAX_HTML_BYTES);
    return { response, html, finalUrl: current, redirects };
  }

  throw new AuditInputError("Unable to resolve page", 422);
}

async function readBodyWithLimit(response: Response, limit: number): Promise<string> {
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new AuditInputError(`Page is larger than the ${limit} byte audit limit`, 422);
    }
    chunks.push(value);
  }

  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(joined);
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, " "));
}

function parseAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(tag))) {
    attributes[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  }

  return attributes;
}

function allTags(html: string, tagName: string): string[] {
  return html.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) ?? [];
}

function findMeta(html: string, key: string): string | undefined {
  const wanted = key.toLowerCase();
  for (const tag of allTags(html, "meta")) {
    const attrs = parseAttributes(tag);
    if ((attrs.name ?? attrs.property)?.toLowerCase() === wanted) {
      return attrs.content;
    }
  }
}

function findLink(html: string, rel: string): string | undefined {
  const wanted = rel.toLowerCase();
  for (const tag of allTags(html, "link")) {
    const attrs = parseAttributes(tag);
    const relTokens = (attrs.rel ?? "").toLowerCase().split(/\s+/);
    if (relTokens.includes(wanted)) return attrs.href;
  }
}

function absoluteUrl(value: string | undefined, base: URL): URL | undefined {
  if (!value) return undefined;
  try {
    return new URL(value, base);
  } catch {
    return undefined;
  }
}

function addCheck(
  checks: AuditCheck[],
  check: string,
  label: string,
  status: CheckStatus,
  evidence: string,
  fix?: string,
) {
  checks.push({ check, label, status, evidence, ...(fix ? { fix } : {}) });
}

function inspectMarkup(html: string, finalUrl: URL, status: number, redirects: string[]): AuditCheck[] {
  const checks: AuditCheck[] = [];

  addCheck(
    checks,
    "http-status",
    "HTTP status",
    status >= 400 ? "fail" : "pass",
    `Final response returned HTTP ${status}`,
    status >= 400 ? "Serve the launch page with a successful 2xx response." : undefined,
  );

  addCheck(
    checks,
    "redirects",
    "Redirect chain",
    redirects.length > 2 ? "warn" : "pass",
    redirects.length ? `${redirects.length} redirect${redirects.length === 1 ? "" : "s"} before the final page` : "No redirects",
    redirects.length > 2 ? "Link directly to the final canonical HTTPS URL." : undefined,
  );

  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? stripTags(titleMatch[1]) : "";
  const titleStatus: CheckStatus = !title ? "fail" : title.length < 10 || title.length > 70 ? "warn" : "pass";
  addCheck(
    checks,
    "title",
    "Page title",
    titleStatus,
    title ? `${title.length} characters: “${title.slice(0, 90)}”` : "No title element found",
    titleStatus === "fail"
      ? "Add a unique, descriptive title element."
      : titleStatus === "warn"
        ? "Keep the title concise and descriptive—roughly 10–70 characters."
        : undefined,
  );

  const description = findMeta(html, "description") ?? "";
  const descriptionStatus: CheckStatus = !description
    ? "fail"
    : description.length < 70 || description.length > 180
      ? "warn"
      : "pass";
  addCheck(
    checks,
    "meta-description",
    "Meta description",
    descriptionStatus,
    description ? `${description.length} characters` : "No meta description found",
    descriptionStatus === "fail"
      ? "Add a concise meta description that explains the page value."
      : descriptionStatus === "warn"
        ? "Aim for a useful description around 70–180 characters."
        : undefined,
  );

  const canonical = findLink(html, "canonical");
  const canonicalUrl = absoluteUrl(canonical, finalUrl);
  const canonicalStatus: CheckStatus = !canonical ? "warn" : canonicalUrl?.protocol === "https:" ? "pass" : "warn";
  addCheck(
    checks,
    "canonical",
    "Canonical URL",
    canonicalStatus,
    canonical ? canonicalUrl?.toString() ?? `Invalid value: ${canonical}` : "No canonical link found",
    canonicalStatus === "warn" ? "Add an absolute HTTPS canonical link for this page." : undefined,
  );

  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] ?? "";
  const language = parseAttributes(htmlTag).lang;
  addCheck(
    checks,
    "document-language",
    "Document language",
    language ? "pass" : "warn",
    language ? `html lang="${language}"` : "The html element has no lang attribute",
    language ? undefined : "Set the html lang attribute to the page’s primary language.",
  );

  const viewport = findMeta(html, "viewport");
  addCheck(
    checks,
    "mobile-viewport",
    "Mobile viewport",
    viewport ? "pass" : "fail",
    viewport ? `Viewport: ${viewport}` : "No viewport meta tag found",
    viewport ? undefined : 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
  );

  const h1Matches = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) ?? [];
  addCheck(
    checks,
    "primary-heading",
    "Primary heading",
    h1Matches.length === 1 ? "pass" : h1Matches.length === 0 ? "fail" : "warn",
    `${h1Matches.length} h1 element${h1Matches.length === 1 ? "" : "s"} found`,
    h1Matches.length === 0
      ? "Add one clear h1 that describes the page."
      : h1Matches.length > 1
        ? "Prefer one primary h1 and use lower heading levels for sections."
        : undefined,
  );

  const ogTitle = findMeta(html, "og:title");
  addCheck(
    checks,
    "og-title",
    "Open Graph title",
    ogTitle ? "pass" : "warn",
    ogTitle ? `og:title is set` : "og:title is missing",
    ogTitle ? undefined : "Add og:title for consistent link previews.",
  );

  const ogDescription = findMeta(html, "og:description");
  addCheck(
    checks,
    "og-description",
    "Open Graph description",
    ogDescription ? "pass" : "warn",
    ogDescription ? "og:description is set" : "og:description is missing",
    ogDescription ? undefined : "Add og:description for useful link previews.",
  );

  const ogImage = findMeta(html, "og:image");
  const ogImageUrl = absoluteUrl(ogImage, finalUrl);
  const imageStatus: CheckStatus = !ogImage ? "warn" : ogImageUrl?.protocol === "https:" ? "pass" : "warn";
  addCheck(
    checks,
    "social-image",
    "Social preview image",
    imageStatus,
    ogImage ? ogImageUrl?.toString() ?? `Invalid og:image: ${ogImage}` : "og:image is missing",
    imageStatus === "warn" ? "Add an absolute HTTPS og:image URL, ideally 1200×630." : undefined,
  );

  const twitterCard = findMeta(html, "twitter:card");
  addCheck(
    checks,
    "twitter-card",
    "Twitter card",
    twitterCard ? "pass" : "warn",
    twitterCard ? `twitter:card=${twitterCard}` : "twitter:card is missing",
    twitterCard ? undefined : "Add twitter:card so previews render consistently.",
  );

  const favicon = findLink(html, "icon") ?? findLink(html, "shortcut");
  addCheck(
    checks,
    "favicon",
    "Favicon",
    favicon ? "pass" : "warn",
    favicon ? `Icon declared: ${favicon}` : "No favicon link found",
    favicon ? undefined : "Declare a favicon with a link rel=icon element.",
  );

  const robots = (findMeta(html, "robots") ?? "").toLowerCase();
  const noindex = robots.split(/[\s,]+/).includes("noindex");
  addCheck(
    checks,
    "indexability",
    "Indexability",
    noindex ? "fail" : "pass",
    noindex ? `Robots directive includes noindex: ${robots}` : robots ? `Robots directive: ${robots}` : "No page-level noindex directive",
    noindex ? "Remove noindex before a public production launch, if indexing is intended." : undefined,
  );

  const jsonLdBlocks = Array.from(
    html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  );
  let malformedJsonLd = 0;
  for (const block of jsonLdBlocks) {
    try {
      JSON.parse(block[1].trim());
    } catch {
      malformedJsonLd += 1;
    }
  }
  const jsonLdStatus: CheckStatus = malformedJsonLd ? "fail" : jsonLdBlocks.length ? "pass" : "warn";
  addCheck(
    checks,
    "structured-data",
    "Structured data",
    jsonLdStatus,
    malformedJsonLd
      ? `${malformedJsonLd} malformed JSON-LD block${malformedJsonLd === 1 ? "" : "s"}`
      : jsonLdBlocks.length
        ? `${jsonLdBlocks.length} valid JSON-LD block${jsonLdBlocks.length === 1 ? "" : "s"}`
        : "No JSON-LD blocks found",
    malformedJsonLd
      ? "Fix malformed JSON in application/ld+json script blocks."
      : jsonLdBlocks.length
        ? undefined
        : "Consider relevant JSON-LD when the page represents an organization, product, article, or event.",
  );

  const controls = allTags(html, "input")
    .map(parseAttributes)
    .filter((attrs) => !["hidden", "submit", "button", "reset", "image"].includes((attrs.type ?? "text").toLowerCase()));
  const labels = allTags(html, "label").map(parseAttributes);
  const labeledIds = new Set(labels.map((attrs) => attrs.for).filter(Boolean));
  const unlabeled = controls.filter((attrs) => {
    return !(attrs["aria-label"] || attrs["aria-labelledby"] || attrs.title || (attrs.id && labeledIds.has(attrs.id)));
  });
  const formStatus: CheckStatus = controls.length === 0 || unlabeled.length === 0 ? "pass" : "warn";
  addCheck(
    checks,
    "form-labels",
    "Form label heuristic",
    formStatus,
    controls.length === 0
      ? "No text-entry controls found"
      : `${unlabeled.length} of ${controls.length} text-entry controls lack an explicit label signal`,
    formStatus === "warn" ? "Associate each form control with a label or an accessible name." : undefined,
  );

  return checks;
}

function collectSameHostLinks(html: string, pageUrl: URL): URL[] {
  const links: URL[] = [];
  const seen = new Set<string>();

  for (const tag of allTags(html, "a")) {
    const href = parseAttributes(tag).href;
    if (!href || href.startsWith("#") || /^(mailto:|tel:|javascript:|data:)/i.test(href)) continue;

    try {
      const candidate = new URL(href, pageUrl);
      candidate.hash = "";
      if (candidate.protocol !== "https:" || candidate.hostname !== pageUrl.hostname) continue;
      const key = candidate.toString();
      if (key === pageUrl.toString() || seen.has(key)) continue;
      seen.add(key);
      links.push(candidate);
      if (links.length >= MAX_LINKS) break;
    } catch {
      // Invalid hrefs are ignored here; the other checks remain useful.
    }
  }

  return links;
}

async function inspectLink(url: URL): Promise<LinkResult> {
  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(LINK_TIMEOUT_MS),
      headers: { "user-agent": "ProofDesk-Launch-Audit/1.0" },
    });

    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(LINK_TIMEOUT_MS),
        headers: {
          range: "bytes=0-0",
          "user-agent": "ProofDesk-Launch-Audit/1.0",
        },
      });
    }

    return {
      url: url.toString(),
      status: response.status,
      ok: response.status < 400,
    };
  } catch {
    return { url: url.toString(), status: null, ok: false };
  }
}

function scoreChecks(checks: AuditCheck[]): number {
  const deductions = checks.reduce((total, check) => {
    if (check.status === "fail") return total + 9;
    if (check.status === "warn") return total + 3;
    return total;
  }, 0);
  return Math.max(0, Math.round(100 - deductions));
}

export function isAuditInputError(error: unknown): error is AuditInputError {
  return error instanceof AuditInputError;
}

export async function runAudit(rawUrl: string): Promise<AuditReport> {
  const started = Date.now();
  const requested = validatePublicHttpsUrl(rawUrl);
  const { response, html, finalUrl, redirects } = await fetchPage(requested);
  const checks = inspectMarkup(html, finalUrl, response.status, redirects);

  const linkTargets = collectSameHostLinks(html, finalUrl);
  const linkResults = await Promise.all(linkTargets.map(inspectLink));
  const brokenLinks = linkResults.filter((result) => !result.ok);

  addCheck(
    checks,
    "link-sample",
    "Same-host link sample",
    brokenLinks.length ? "fail" : "pass",
    linkResults.length
      ? `${linkResults.length} sampled; ${brokenLinks.length} returned an error`
      : "No eligible same-host links found to sample",
    brokenLinks.length ? "Fix or remove links returning 4xx/5xx responses or network errors." : undefined,
  );

  const summary = checks.reduce<Record<CheckStatus, number>>(
    (counts, check) => {
      counts[check.status] += 1;
      return counts;
    },
    { pass: 0, warn: 0, fail: 0 },
  );

  return {
    auditId: `pd_${crypto.randomUUID()}`,
    requestedUrl: requested.toString(),
    finalUrl: finalUrl.toString(),
    scannedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    score: scoreChecks(checks),
    summary,
    issues: checks
      .filter((check): check is AuditCheck & { status: "warn" | "fail" } => check.status !== "pass")
      .map((check) => ({
        severity: check.status,
        check: check.check,
        evidence: check.evidence,
        fix: check.fix ?? "Review this finding before launch.",
      })),
    checks,
    links: {
      sampled: linkResults.length,
      broken: brokenLinks.length,
      results: linkResults,
    },
    disclaimer:
      "Automated source-level launch heuristics. This is not penetration testing, legal advice, or a complete WCAG accessibility audit.",
  };
}
