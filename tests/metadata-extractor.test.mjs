import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  extractDeclaredMetadata,
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
    url: "https://fixture.example.net/shared",
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
    const report = await runMetadata("https://fixture.example.net/page");

    assert.deepEqual(fetchedUrls, [
      { url: "https://fixture.example.net/page", method: "GET" },
    ]);
    assert.equal(report.requestedUrl, "https://fixture.example.net/page");
    assert.equal(report.finalUrl, "https://fixture.example.net/page");
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

test("keeps dynamic and static metadata intents in parity", async () => {
  const staticManifest = JSON.parse(
    await readFile(
      new URL("../public/.well-known/agent.json", import.meta.url),
      "utf8",
    ),
  );
  const dynamicManifest = createAgentManifest(
    "https://proofdesk.example/.well-known/agent.json",
  );
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
