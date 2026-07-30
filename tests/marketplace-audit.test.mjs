import assert from "node:assert/strict";
import test from "node:test";

const PROXY_TOKEN = "test-only/proxy+token=";
process.env.PAYANAGENT_PROXY_TOKEN = PROXY_TOKEN;

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const workerPromise = import(workerUrl.href).then(({ default: worker }) => worker);

async function request(path, init) {
  const worker = await workerPromise;

  return worker.fetch(
    new Request(
      `https://proofdesk-audit-api.konstanta-work-x.chatgpt.site${path}`,
      init,
    ),
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

const validAuditRequest = {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ url: "https://example.com" }),
};

const authorizedPath =
  `/api/marketplace/audit?token=${encodeURIComponent(PROXY_TOKEN)}`;

function invalidAuditRequest() {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  };
}

test("marketplace audit proxy controls", async (t) => {
  await t.test("hides absent and incorrect proxy tokens identically", async () => {
    const [absent, incorrect] = await Promise.all([
      request("/api/marketplace/audit", validAuditRequest),
      request("/api/marketplace/audit?token=incorrect", validAuditRequest),
    ]);

    assert.equal(absent.status, 404);
    assert.equal(incorrect.status, 404);
    assert.equal(absent.headers.get("cache-control"), "no-store");
    assert.equal(
      absent.headers.get("content-type"),
      incorrect.headers.get("content-type"),
    );
    assert.equal(await absent.text(), await incorrect.text());
  });

  await t.test("accepts the token and reuses audit validation", async () => {
    const response = await request(authorizedPath, invalidAuditRequest());

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: "Request body must include a non-empty url string",
    });
  });

  await t.test("rejects an empty configured token", async () => {
    const previous = process.env.PAYANAGENT_PROXY_TOKEN;
    process.env.PAYANAGENT_PROXY_TOKEN = "";

    try {
      const response = await request(
        "/api/marketplace/audit?token=",
        validAuditRequest,
      );
      assert.equal(response.status, 404);
      assert.equal(await response.text(), "Not Found");
    } finally {
      process.env.PAYANAGENT_PROXY_TOKEN = previous;
    }
  });

  await t.test("caps concurrency at two and releases slots in finally", async () => {
    const originalFetch = globalThis.fetch;
    const releases = [];
    let signalBothStarted;
    const bothStarted = new Promise((resolve) => {
      signalBothStarted = resolve;
    });

    globalThis.fetch = async (input, init) => {
      const target = new URL(
        typeof input === "string" || input instanceof URL ? input : input.url,
      );

      if (target.hostname !== "hold.example.net") {
        return originalFetch(input, init);
      }

      return new Promise((resolve) => {
        releases.push(() => {
          resolve(
            new Response("<!doctype html><html><title>Held page</title></html>", {
              status: 200,
              headers: { "content-type": "text/html; charset=utf-8" },
            }),
          );
        });
        if (releases.length === 2) signalBothStarted();
      });
    };

    try {
      const heldRequest = {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: "https://hold.example.net/" }),
      };
      const first = request(authorizedPath, heldRequest);
      const second = request(authorizedPath, heldRequest);

      await Promise.race([
        bothStarted,
        new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error("two held audits did not start")),
            2_000,
          );
        }),
      ]);

      const limited = await request(authorizedPath, invalidAuditRequest());
      assert.equal(limited.status, 429);
      assert.equal(limited.headers.get("cache-control"), "no-store");
      assert.equal(limited.headers.get("retry-after"), "1");
      assert.deepEqual(await limited.json(), {
        error: "Too many marketplace audit requests",
      });

      for (const release of releases) release();
      const completed = await Promise.all([first, second]);
      assert.deepEqual(completed.map((response) => response.status), [200, 200]);

      const afterRelease = await request(authorizedPath, invalidAuditRequest());
      assert.equal(afterRelease.status, 400);
    } finally {
      for (const release of releases) release();
      globalThis.fetch = originalFetch;
    }
  });

  await t.test("caps the rolling window at twelve authorized calls", async () => {
    // Four calls were admitted by earlier subtests; fill the remaining eight.
    for (let index = 0; index < 8; index += 1) {
      const response = await request(authorizedPath, invalidAuditRequest());
      assert.equal(response.status, 400);
    }

    const limited = await request(authorizedPath, invalidAuditRequest());
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get("cache-control"), "no-store");
    assert.match(limited.headers.get("retry-after") ?? "", /^[1-9]\d*$/);

    const unauthorized = await request(
      "/api/marketplace/audit?token=incorrect",
      validAuditRequest,
    );
    assert.equal(unauthorized.status, 404);
  });
});
