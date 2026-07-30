import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  extractDeclaredMetadata,
  isAuditInputError,
  runAudit,
  runMetadata,
} from "../lib/audit.ts";
import { createAgentManifest } from "../lib/agent-manifest.ts";

const fixtureUrl = new URL("./fixtures/metadata-page.html", import.meta.url);
const fixture = await readFile(fixtureUrl, "utf8");

const expectedMetadata = {
  title: "Proof & Preview",
  description: "Declared metadata from server HTML.",
  canonical: "/declared-canonical",
  language: "en",
  viewport: "width=device-width, initial-scale=1",
  robots: null,
  favicon: "/favicon.svg",
  openGraph: {
    title: "Declared Open Graph title",
    description: "Declared Open Graph description",
    image: "/social.png",
    url: "https://fixture.example.com/shared",
    type: "website",
    siteName: null,
  },
  twitter: {
    card: "summary_large_image",
    title: null,
    description: null,
    image: null,
  },
};

test("extracts declared metadata without inventing fallback values", () => {
  assert.deepEqual(extractDeclaredMetadata(fixture), expectedMetadata);
});

test("parses live HTML metadata without reading comments, scripts, or templates", () => {
  const trickyHtml = `<!doctype html>
    <!--
      <title>Commented title</title>
      <meta name="description" content="Commented description">
    -->
    <html lang="en">
      <head>
        <script type="application/json">
          {"markup":"<meta name=\\"description\\" content=\\"Script description\\">"}
        </script>
        <template>
          <meta name="description" content="Template description">
        </template>
        <title>Live &amp; Accurate</title>
        <meta name="description" content="2 > 1 &amp; stable">
        <link rel="canonical" href="/live?one=1&amp;two=2">
      </head>
    </html>`;

  const metadata = extractDeclaredMetadata(trickyHtml);
  assert.equal(metadata.title, "Live & Accurate");
  assert.equal(metadata.description, "2 > 1 & stable");
  assert.equal(metadata.canonical, "/live?one=1&two=2");
});

test("reports truthful missing fields without probing links or assets", async () => {
  const originalFetch = globalThis.fetch;
  const fetchedUrls = [];

  globalThis.fetch = async (input, init) => {
    fetchedUrls.push({
      url: String(input),
      method: init?.method,
    });
    return new Response(fixture, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  };

  try {
    const report = await runMetadata("https://fixture.example.com/page");

    assert.deepEqual(fetchedUrls, [
      { url: "https://fixture.example.com/page", method: "GET" },
    ]);
    assert.equal(report.requestedUrl, "https://fixture.example.com/page");
    assert.equal(report.finalUrl, "https://fixture.example.com/page");
    assert.equal(report.httpStatus, 200);
    assert.deepEqual(report.redirects, []);
    assert.deepEqual(report.metadata, expectedMetadata);
    assert.deepEqual(report.missingFields, [
      "robots",
      "openGraph.siteName",
      "twitter.title",
      "twitter.description",
      "twitter.image",
    ]);
    assert.equal(report.source, "server-rendered-html");
    assert.match(report.disclaimer, /JavaScript rendering.*not evaluated/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("blocks custom domains before any buyer-controlled fetch", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("fetch should not run");
  };

  try {
    await assert.rejects(
      runMetadata("https://customer-owned.example.net/page"),
      (error) => {
        assert.equal(isAuditInputError(error), true);
        assert.equal(error.status, 400);
        assert.match(error.message, /managed-hosting domains/i);
        return true;
      },
    );
    assert.equal(fetchCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("revalidates every redirect through the managed-host allowlist", async () => {
  const originalFetch = globalThis.fetch;
  const fetchedUrls = [];
  globalThis.fetch = async (input) => {
    fetchedUrls.push(String(input));
    return new Response(null, {
      status: 302,
      headers: { location: "https://custom-domain.example.net/final" },
    });
  };

  try {
    await assert.rejects(
      runMetadata("https://preview.github.io/start"),
      (error) => {
        assert.equal(isAuditInputError(error), true);
        assert.equal(error.status, 400);
        assert.match(error.message, /managed-hosting domains/i);
        return true;
      },
    );
    assert.deepEqual(fetchedUrls, ["https://preview.github.io/start"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not probe same-host links on non-standard HTTPS ports", async () => {
  const originalFetch = globalThis.fetch;
  const fetchedUrls = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    fetchedUrls.push({ url, method: init?.method });

    if (url === "https://preview.github.io/") {
      return new Response(
        '<html><title>Preview</title><a href="/safe">Safe</a>'
          + '<a href="https://preview.github.io:8443/private">Blocked</a></html>',
        {
          status: 200,
          headers: { "content-type": "text/html" },
        },
      );
    }

    if (url === "https://preview.github.io/safe") {
      return new Response(null, { status: 200 });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  try {
    const report = await runAudit("https://preview.github.io/");
    assert.deepEqual(fetchedUrls, [
      { url: "https://preview.github.io/", method: "GET" },
      { url: "https://preview.github.io/safe", method: "HEAD" },
    ]);
    assert.deepEqual(report.links, {
      sampled: 1,
      broken: 0,
      results: [
        {
          url: "https://preview.github.io/safe",
          status: 200,
          ok: true,
        },
      ],
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("keeps dynamic and static metadata intents in parity", async () => {
  const staticManifest = JSON.parse(
    await readFile(
      new URL("../public/.well-known/agent.json", import.meta.url),
      "utf8",
    ),
  );
  const dynamicManifest = createAgentManifest(
    `https://${staticManifest.origin}/.well-known/agent.json`,
  );
  assert.deepEqual(staticManifest, dynamicManifest);
  const staticIntent = staticManifest.intents.find(
    (intent) => intent.name === "extract_page_metadata",
  );
  const dynamicIntent = dynamicManifest.intents.find(
    (intent) => intent.name === "extract_page_metadata",
  );

  assert.ok(staticIntent);
  assert.deepEqual(staticIntent, dynamicIntent);
  assert.equal(dynamicIntent.price.amount, 0.01);
  assert.equal(dynamicIntent.payments.x402.direct_price, 0.01);
});
