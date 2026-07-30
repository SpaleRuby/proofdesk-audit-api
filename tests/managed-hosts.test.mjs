import assert from "node:assert/strict";
import test from "node:test";
import {
  isSupportedManagedHostname,
  SUPPORTED_MANAGED_HOSTS,
} from "../lib/managed-hosts.ts";

test("allows each managed apex and its subdomains", () => {
  for (const managedHost of SUPPORTED_MANAGED_HOSTS) {
    assert.equal(isSupportedManagedHostname(managedHost), true, managedHost);
    assert.equal(
      isSupportedManagedHostname(`customer.preview.${managedHost}`),
      true,
      managedHost,
    );
  }
});

test("blocks custom domains and suffix-confusion lookalikes", () => {
  for (const hostname of [
    "customer.example.net",
    "evilgithub.io",
    "github.io.attacker.example.net",
    "pages.dev.attacker.example.net",
    "localhost",
    "site.github.io.",
  ]) {
    assert.equal(isSupportedManagedHostname(hostname), false, hostname);
  }
});
