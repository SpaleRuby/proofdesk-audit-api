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
  assert.match(html, /Run an audit — \$0\.04/);
  assert.match(
    html,
    /https:\/\/proofdesk-audit-api\.konstanta-work-x\.chatgpt\.site\/api\/audit/,
  );
  assert.match(html, /Public outcomes, not anonymous praise\./);
  assert.match(html, /54\/54 tests passed/);
  assert.match(html, /4\/4 findings shipped/);
  assert.match(html, /32 minutes to fix/);
  assert.match(html, /MyZubsterGateway\/pull\/87/);
  assert.match(html, /BlocksBeyondTheStars\/issues\/574/);
  assert.match(html, /aigclink\/geolook\/commit\/2b2085e/);
  assert.doesNotMatch(
    html,
    /https:\/\/idea-thickness-vpn-criteria\.trycloudflare\.com/i,
  );
  assert.match(html, /Declared metadata extraction/i);
  assert.match(html, /\$0\.01 USDC/);
  assert.match(html, /Temporary safety boundary/i);
  assert.match(html, /arbitrary custom domains are\s+rejected/i);
  assert.match(html, /github\.io.*chatgpt\.site/i);
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
  assert.equal(health.payment.price, "$0.04");
  assert.deepEqual(health.payment.routes, {
    "/api/audit": "$0.04",
    "/api/metadata": "$0.01",
  });
  assert.deepEqual(health.payment.networks, ["Base", "Solana"]);
  assert.equal(health.inputPolicy.mode, "managed-host-allowlist");
  assert.equal(health.inputPolicy.customDomains, false);
  assert.ok(health.inputPolicy.supportedManagedHosts.includes("github.io"));
  assert.ok(health.inputPolicy.supportedManagedHosts.includes("chatgpt.site"));
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
      amount: "0.040000",
    },
    protocols: [{ x402: {} }],
  });
  assert.equal(paidOperation.responses["402"].description, "Payment Required");
  assert.equal(
    paidOperation.requestBody.content["application/json"].schema.properties.url
      .example,
    "https://example.com",
  );
  const metadataOperation = openapi.paths["/api/metadata"].post;
  assert.ok(metadataOperation);
  assert.deepEqual(
    openapi.info["x-input-policy"].supportedManagedHosts,
    health.inputPolicy.supportedManagedHosts,
  );
  assert.equal(openapi.info["x-input-policy"].customDomains, false);
  assert.deepEqual(
    metadataOperation.requestBody.content["application/json"].schema.properties
      .url["x-host-suffix-allowlist"],
    health.inputPolicy.supportedManagedHosts,
  );
  assert.equal(
    metadataOperation["x-payment-info"].price.amount,
    "0.010000",
  );
  assert.equal(
    metadataOperation.requestBody.content["application/json"].schema.properties
      .url.example,
    "https://example.com",
  );
  assert.equal(
    metadataOperation.responses["402"].description,
    "Payment Required",
  );
  const llms = await llmsResponse.text();
  assert.match(llms, /ProofDesk Launch Audit API/);
  assert.match(llms, /Declared metadata extraction — \$0\.01 USDC/);
  assert.match(llms, /does not render JavaScript.*probe links/i);
  assert.match(llms, /Arbitrary custom domains are rejected before fetching/i);
  assert.match(llms, /github\.io.*chatgpt\.site/i);
  assert.match(
    llms,
    /https:\/\/proofdesk-audit-api\.konstanta-work-x\.chatgpt\.site\/openapi\.json/,
  );
  assert.doesNotMatch(
    llms,
    /(?:Public API:|OpenAPI 3\.1:|Free example response:|Health:|POST)\s+https:\/\/[^\s]*trycloudflare\.com/i,
  );
  assert.equal(agent.version, "1.4");
  assert.equal(agent.origin, "proofdesk-audit-api.konstanta-work-x.chatgpt.site");
  assert.equal(agent.intents[0].name, "audit_launch_page");
  assert.equal(agent.intents[0].price.amount, 0.04);
  assert.equal(agent.intents[0].payments.x402.direct_price, 0.04);
  assert.deepEqual(agent.intents[0].price.network, ["base", "solana"]);
  assert.deepEqual(
    agent.payments.x402.networks.map((network) => network.network),
    ["base", "solana"],
  );
  const metadataIntent = agent.intents.find(
    (intent) => intent.name === "extract_page_metadata",
  );
  assert.ok(metadataIntent);
  assert.equal(metadataIntent.endpoint, "/api/metadata");
  assert.equal(metadataIntent.price.amount, 0.01);
  assert.equal(metadataIntent.payments.x402.direct_price, 0.01);
  assert.deepEqual(
    agent.extensions.proofdesk.input_policy.supported_managed_hosts,
    health.inputPolicy.supportedManagedHosts,
  );
  assert.equal(agent.extensions.proofdesk.input_policy.custom_domains, false);
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

test("rejects unsupported targets before issuing a payment challenge", async () => {
  for (const path of ["/api/audit", "/api/metadata"]) {
    const response = await request(path, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ url: "https://customer-owned-domain.net" }),
    });

    assert.equal(response.status, 400);
    assert.equal(response.headers.get("payment-required"), null);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    await assert.doesNotReject(async () => {
      const body = await response.json();
      assert.match(body.error, /managed-hosting domains/i);
    });
  }
});

test("rejects request properties outside the published schema before payment", async () => {
  for (const path of ["/api/audit", "/api/metadata"]) {
    const response = await request(path, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        url: "https://example.com",
        callback: "https://example.com",
      }),
    });

    assert.equal(response.status, 400);
    assert.equal(response.headers.get("payment-required"), null);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.json();
    assert.match(body.error, /properties other than url/i);
  }
});

test("rejects an oversized chunked body before issuing a payment challenge", async () => {
  const encoder = new TextEncoder();
  const oversizedBody = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode('{"url":"https://example.com","padding":"'),
      );
      controller.enqueue(encoder.encode("x".repeat(4_096)));
      controller.enqueue(encoder.encode('"}'));
      controller.close();
    },
  });
  const response = await request("/api/audit", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: oversizedBody,
    duplex: "half",
  });

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("payment-required"), null);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.match(body.error, /4096 bytes/i);
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
  assert.deepEqual(payment.accepts.map((option) => option.amount), ["40000", "40000"]);
  assert.equal(
    payment.resource.url,
    "https://proofdesk-audit-api.konstanta-work-x.chatgpt.site/api/audit",
  );
  assert.equal(payment.extensions.bazaar.info.input.method, "POST");
  assert.match(
    payment.extensions.bazaar.schema.properties.input.properties.body.properties
      .url.description,
    /github\.io.*chatgpt\.site/i,
  );
});

test("returns exact metadata x402 requirements for both payment networks", async () => {
  const response = await request("/api/metadata?source=regression", {
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
  assert.deepEqual(payment.accepts.map((option) => option.amount), ["10000", "10000"]);
  assert.equal(
    payment.resource.url,
    "https://proofdesk-audit-api.konstanta-work-x.chatgpt.site/api/metadata",
  );
  assert.equal(payment.extensions.bazaar.info.input.method, "POST");
  assert.match(
    payment.extensions.bazaar.schema.properties.input.properties.body.properties
      .url.description,
    /github\.io.*chatgpt\.site/i,
  );
});
