import assert from "node:assert/strict";
import test from "node:test";

async function request(path, init) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`https://proofdesk-audit-api.konstanta-work-x.chatgpt.site${path}`, init),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the ProofDesk landing page", async () => {
  const response = await request("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>ProofDesk — Launch QA API for agents<\/title>/i);
  assert.match(html, /Catch the embarrassing stuff/);
  assert.match(html, /Run an audit — \$0\.10/);
  assert.match(html, /Request an assisted audit/);
  assert.match(html, /openly AI-assisted/);
  assert.match(html, /Honest scope/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|nightmoth/i);
});

test("serves health, example and OpenAPI responses", async () => {
  const [healthResponse, exampleResponse, openapiResponse] = await Promise.all([
    request("/api/health"),
    request("/api/example"),
    request("/openapi.json"),
  ]);

  assert.equal(healthResponse.status, 200);
  assert.equal(exampleResponse.status, 200);
  assert.equal(openapiResponse.status, 200);

  const [health, example, openapi] = await Promise.all([
    healthResponse.json(),
    exampleResponse.json(),
    openapiResponse.json(),
  ]);

  assert.equal(health.ok, true);
  assert.deepEqual(health.payment.networks, ["Base", "Solana"]);
  assert.equal(example.score, 82);
  assert.ok(Array.isArray(example.checks));
  assert.equal(openapi.openapi, "3.1.0");
  assert.ok(openapi.paths["/api/audit"].post);
});

test("returns valid x402 requirements for both payment networks", async () => {
  const response = await request("/api/audit", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ url: "https://example.com" }),
  });

  assert.equal(response.status, 402);
  const encoded = response.headers.get("payment-required");
  assert.ok(encoded, "PAYMENT-REQUIRED header must be present");

  const payment = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  assert.deepEqual(
    payment.accepts.map((option) => option.network),
    ["eip155:8453", "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"],
  );
  assert.deepEqual(payment.accepts.map((option) => option.amount), ["100000", "100000"]);
  assert.equal(payment.extensions.bazaar.info.input.method, "POST");
});
