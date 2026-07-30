import assert from "node:assert/strict";
import test from "node:test";
import { readUrlRequest } from "../lib/url-request.ts";

function jsonRequest(body) {
  return new Request("https://proofdesk.example/api/audit", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body,
  });
}

test("rejects malformed JSON as a client input error", async () => {
  assert.deepEqual(await readUrlRequest(jsonRequest("{")), {
    ok: false,
    error: "Request body must contain valid JSON",
  });
});

test("rejects null and non-object JSON bodies without throwing", async () => {
  for (const body of ["null", "[]", '"text"', "42", '{"url":null}', '{"url":"   "}']) {
    assert.deepEqual(await readUrlRequest(jsonRequest(body)), {
      ok: false,
      error: "Request body must include a non-empty url string",
    });
  }
});

test("accepts and trims a JSON URL string", async () => {
  assert.deepEqual(
    await readUrlRequest(jsonRequest('{"url":"  https://example.com/page  "}')),
    {
      ok: true,
      url: "https://example.com/page",
    },
  );
});

test("rejects properties outside the published request schema", async () => {
  assert.deepEqual(
    await readUrlRequest(
      jsonRequest('{"url":"https://example.com","callback":"https://example.com"}'),
    ),
    {
      ok: false,
      error: "Request body must not include properties other than url",
    },
  );
});

test("requires an application/json content type", async () => {
  const request = new Request("https://proofdesk.example/api/audit", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: '{"url":"https://example.com"}',
  });

  assert.deepEqual(await readUrlRequest(request), {
    ok: false,
    error: "Content-Type must be application/json",
  });
});
