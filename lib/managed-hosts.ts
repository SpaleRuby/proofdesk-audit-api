/**
 * Temporary fail-closed egress policy for buyer-controlled page fetches.
 *
 * These suffixes are owned by managed hosting providers. User content may be
 * untrusted, but users cannot repoint the provider-owned DNS suffix to a
 * private address. Custom domains stay blocked until page fetching runs in a
 * separately isolated egress environment.
 */
export const SUPPORTED_MANAGED_HOSTS = [
  "github.io",
  "pages.dev",
  "vercel.app",
  "netlify.app",
  "webflow.io",
  "framer.website",
  "onrender.com",
  "railway.app",
  "surge.sh",
  "firebaseapp.com",
  "web.app",
  "readthedocs.io",
  "gitbook.io",
  "wordpress.com",
  "myshopify.com",
  "wixsite.com",
  "carrd.co",
  "typedream.app",
  "trycloudflare.com",
  "chatgpt.site",
  "example.com",
] as const;

export function isSupportedManagedHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  return SUPPORTED_MANAGED_HOSTS.some(
    (managedHost) =>
      normalized === managedHost || normalized.endsWith(`.${managedHost}`),
  );
}

export const MANAGED_HOST_POLICY_SUMMARY =
  "For temporary network-safety containment, only the documented managed-hosting domains and their subdomains are accepted; arbitrary custom domains are blocked.";
