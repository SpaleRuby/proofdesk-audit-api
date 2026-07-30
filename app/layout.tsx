import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProofDesk — Launch QA API for agents",
  description:
    "A deterministic launch report for supported managed-hosting pages. Pay $0.04 USDC per request with x402 on Base or Solana.",
  metadataBase: new URL(
    "https://proofdesk-audit-api.konstanta-work-x.chatgpt.site",
  ),
  openGraph: {
    title: "ProofDesk — Catch launch mistakes before you ship",
    description:
      "15+ source-level checks for allowlisted managed-hosting pages in one developer-ready JSON report. Pay 4¢ USDC per request.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "ProofDesk launch audit API" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ProofDesk — Launch QA API",
    description:
      "A deterministic launch report for allowlisted managed-hosting pages at $0.04 USDC.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
