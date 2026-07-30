import assert from "node:assert/strict";
import test from "node:test";

async function request(
  path,
  init,
  origin = "https://proofdesk-audit-api.konstanta-work-x.chatgpt.site",
) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`${origin}${path}`, init),
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
  assert.match(html, /Run the Base payment example/);
  assert.match(html, /refuses a changed price or receiver/);
  assert.match(html, /openly AI-assisted/);
  assert.match(html, /Honest scope/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|nightmoth/i);
});

test("serves health, example and discovery responses", async () => {
  const [healthResponse, exampleResponse, openapiResponse, llmsResponse, agentResponse] = await Promise.all([
    request("/api/health"),
    request("/api/example"),
    request("/openapi.json"),
    request("/llms.txt"),
    request("/.well-known/agent.json"),
  ]);

  assert.equal(healthResponse.status, 200);
  assert.equal(exampleResponse.status, 200);
  assert.equal(openapiResponse.status, 200);
  assert.equal(llmsResponse.status, 200);
  assert.equal(agentResponse.status, 200);

  const [health, example, openapi, agent] = await Promise.all([
    healthResponse.json(),
    exampleResponse.json(),
    openapiResponse.json(),
    agentResponse.json(),
  ]);

  assert.equal(health.ok, true);
  assert.deepEqual(health.payment.networks, ["Base", "Solana"]);
  assert.equal(example.score, 82);
  assert.ok(Array.isArray(example.checks));
  assert.equal(openapi.openapi, "3.1.0");
  assert.equal(
    openapi.servers[0].url,
    "https://proofdesk-audit-api.konstanta-work-x.chatgpt.site",
  );
  assert.match(openapi.info["x-guidance"], /POST \/api\/audit/);
  assert.deepEqual(openapi.paths["/api/health"].get.security, []);
  assert.deepEqual(openapi.paths["/api/example"].get.security, []);
  const paidOperation = openapi.paths["/api/audit"].post;
  assert.ok(paidOperation);
  assert.deepEqual(paidOperation["x-payment-info"], {
    price: {
      mode: "fixed",
      currency: "USD",
      amount: "0.100000",
    },
    protocols: [{ x402: {} }],
  });
  assert.equal(paidOperation.responses["402"].description, "Payment Required");
  assert.match(await llmsResponse.text(), /ProofDesk Launch Audit API/);
  assert.equal(agent.version, "1.4");
  assert.equal(agent.origin, "proofdesk-audit-api.konstanta-work-x.chatgpt.site");
  assert.equal(agent.intents[0].name, "audit_launch_page");
  assert.deepEqual(agent.intents[0].price.network, ["base", "solana"]);
  assert.deepEqual(
    agent.payments.x402.networks.map((network) => network.network),
    ["base", "solana"],
  );
});

test("uses the forwarded HTTPS protocol for proxy discovery", async () => {
  const response = await request(
    "/openapi.json",
    { headers: { "x-forwarded-proto": "https" } },
    "http://proofdesk-audit-api.konstanta-work-x.chatgpt.site",
  );

  assert.equal(response.status, 200);
  const openapi = await response.json();
  assert.equal(
    openapi.servers[0].url,
    "https://proofdesk-audit-api.konstanta-work-x.chatgpt.site",
  );
});

test("returns valid x402 requirements for both payment networks", async () => {
  const response = await request("/api/audit?source=regression", {
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
  assert.equal(
    payment.resource.url,
    "https://proofdesk-audit-api.konstanta-work-x.chatgpt.site/api/audit",
  );
  assert.equal(payment.extensions.bazaar.info.input.method, "POST");
});
