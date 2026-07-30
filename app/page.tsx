const sampleReport = `{
  "score": 82,
  "summary": { "pass": 13, "warn": 3, "fail": 1 },
  "issues": [
    {
      "severity": "fail",
      "check": "meta-description",
      "evidence": "No meta description found",
      "fix": "Add a concise description between 120–160 characters."
    },
    {
      "severity": "warn",
      "check": "social-image",
      "evidence": "og:image is missing",
      "fix": "Add an absolute og:image URL for link previews."
    }
  ],
  "disclaimer": "Source-level launch heuristics, not a full WCAG audit."
}`;

const curlExample = `curl -X POST "https://idea-thickness-vpn-criteria.trycloudflare.com/api/audit" \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://example.com"}'`;

const checks = [
  ["01", "Launch metadata", "Title, description, canonical, viewport and language."],
  ["02", "Share previews", "Open Graph, Twitter card, favicon and absolute image URLs."],
  ["03", "Page structure", "H1 count, semantic signals, JSON-LD and labeled-form heuristics."],
  ["04", "Indexability", "Robots directives, status, redirects and accidental noindex."],
  ["05", "Link sample", "A bounded same-host link sample for obvious launch-day breakage."],
  ["06", "Actionable fixes", "Evidence and a direct fix for every warning or failure."],
];

export default function Home() {
  return (
    <main>
      <nav className="nav shell" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="ProofDesk home">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>ProofDesk</span>
        </a>
        <div className="nav-links">
          <a href="#checks">Checks</a>
          <a href="#response">Example</a>
          <a href="/openapi.json">OpenAPI</a>
          <a className="nav-cta" href="#use-api">Use the API</a>
        </div>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="pulse" /> Live launch QA · x402</p>
          <h1>Catch the embarrassing stuff <em>before</em> you ship.</h1>
          <p className="hero-lede">
            One POST request turns a public page into a deterministic, developer-ready
            launch report. No account. No API key. Pay exactly 10¢ in USDC.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#use-api">Run an audit — $0.10</a>
            <a className="button secondary" href="/api/example">See a free response</a>
          </div>
          <div className="trust-row" aria-label="Service facts">
            <span><b>15+</b> checks</span>
            <span><b>Base + Solana</b> USDC</span>
            <span><b>JSON</b> response</span>
          </div>
        </div>

        <div className="report-card" aria-label="Example audit score">
          <div className="card-top">
            <span className="window-dots" aria-hidden="true"><i /><i /><i /></span>
            <span>launch-report.json</span>
            <span className="status-chip">complete</span>
          </div>
          <div className="score-row">
            <div className="score-ring">
              <span>82</span>
              <small>/100</small>
            </div>
            <div>
              <p className="micro">LAUNCH READINESS</p>
              <h2>Almost ready.</h2>
              <p className="muted">One blocker deserves attention.</p>
            </div>
          </div>
          <div className="mini-checks">
            <div><span className="check-icon pass">✓</span><span>Canonical URL</span><b>pass</b></div>
            <div><span className="check-icon pass">✓</span><span>Mobile viewport</span><b>pass</b></div>
            <div><span className="check-icon warn">!</span><span>Social image</span><b>warn</b></div>
            <div><span className="check-icon fail">×</span><span>Meta description</span><b>fail</b></div>
          </div>
          <p className="report-foot">Completed in 1.4s · 6 links sampled</p>
        </div>
      </section>

      <section className="marquee" aria-label="ProofDesk capabilities">
        <div>
          <span>NO SIGN-UP</span><i>◆</i><span>DETERMINISTIC</span><i>◆</i>
          <span>MACHINE-READABLE</span><i>◆</i><span>PAY PER RESULT</span><i>◆</i>
          <span>NO SIGN-UP</span><i>◆</i><span>DETERMINISTIC</span><i>◆</i>
          <span>MACHINE-READABLE</span>
        </div>
      </section>

      <section className="section shell" id="checks">
        <div className="section-heading">
          <p className="kicker">What gets checked</p>
          <h2>A preflight list that never gets bored.</h2>
          <p>
            ProofDesk focuses on visible, source-level launch mistakes—the kind that
            erode trust, spoil previews, or make a page harder to discover.
          </p>
        </div>
        <div className="check-grid">
          {checks.map(([number, title, body]) => (
            <article className="check-card" key={number}>
              <span className="check-number">{number}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
        <p className="scope-note">
          Honest scope: this is an automated source-level preflight, not penetration
          testing, legal advice, or a complete accessibility certification.
        </p>
      </section>

      <section className="response-section" id="response">
        <div className="shell response-grid">
          <div className="response-copy">
            <p className="kicker light">Built for agents and scripts</p>
            <h2>Evidence in. Opinions out.</h2>
            <p>
              Every issue includes severity, the observed evidence, and a concise fix.
              Stable JSON makes the result easy to gate in an agent workflow, CI job,
              or launch checklist.
            </p>
            <ul>
              <li><span>✓</span> Clear pass, warn and fail counts</li>
              <li><span>✓</span> Final URL and redirect visibility</li>
              <li><span>✓</span> Bounded runtime and response size</li>
            </ul>
            <a className="text-link" href="/api/example">Open the complete free example →</a>
          </div>
          <div className="code-window">
            <div className="code-title"><span>example-response.json</span><span>JSON</span></div>
            <pre><code>{sampleReport}</code></pre>
          </div>
        </div>
      </section>

      <section className="section shell how">
        <div className="section-heading compact">
          <p className="kicker">How payment works</p>
          <h2>HTTP already had a price tag. We use it.</h2>
        </div>
        <div className="steps">
          <article>
            <span>1</span>
            <h3>POST a URL</h3>
            <p>The endpoint replies with an x402 payment requirement.</p>
          </article>
          <article>
            <span>2</span>
            <h3>Pay 10¢ USDC</h3>
            <p>Your client settles on Base or Solana. No subscription.</p>
          </article>
          <article>
            <span>3</span>
            <h3>Receive the report</h3>
            <p>The paid request returns the audit as structured JSON.</p>
          </article>
        </div>
      </section>

      <section className="assisted-section">
        <div className="shell assisted-grid">
          <div className="assisted-copy">
            <p className="kicker light">Need interpretation, not just JSON?</p>
            <h2>Turn the report into a launch plan.</h2>
            <p>
              The assisted review adds a careful second pass and converts the raw
              findings into the five fixes most worth doing before you announce.
              It is openly AI-assisted and checked for evidence before delivery.
            </p>
            <div className="assisted-trust">
              <span>Public pages only</span>
              <span>Scope confirmed first</span>
              <span>Pay after acceptance</span>
            </div>
          </div>
          <div className="offer-card">
            <div className="offer-price">
              <span>Fixed price</span>
              <strong>$10</strong>
              <small>USDC · Base or Solana</small>
            </div>
            <ul>
              <li><span>01</span> Full ProofDesk launch report</li>
              <li><span>02</span> Evidence check on every blocker</li>
              <li><span>03</span> Prioritized top-five action plan</li>
              <li><span>04</span> Concrete copy or markup suggestions</li>
              <li><span>05</span> One follow-up clarification</li>
            </ul>
            <a
              className="button offer-button"
              href="https://github.com/SpaleRuby/proofdesk-audit-api/issues/new?template=assisted-audit.yml"
            >
              Request an assisted audit
            </a>
            <p>No payment is requested until the page and scope are accepted.</p>
          </div>
        </div>
      </section>

      <section className="cta-section" id="use-api">
        <div className="shell cta-grid">
          <div>
            <p className="kicker">One request. Ten cents.</p>
            <h2>Give your next launch a final pair of eyes.</h2>
            <p className="cta-copy">
              Send any public HTTPS page. Payment is requested automatically through
              the open x402 protocol.
            </p>
          </div>
          <div className="curl-box">
            <div><span>POST /api/audit</span><span>$0.10 USDC</span></div>
            <pre><code>{curlExample}</code></pre>
            <p>
              This curl command shows the standard 402 challenge; it does not pay.
              The checked-in Base buyer client requires explicit 10¢ confirmation
              and refuses a changed price or receiver.
            </p>
            <a
              className="client-link"
              href="https://github.com/SpaleRuby/proofdesk-audit-api/blob/main/examples/pay-with-base.mjs"
            >
              Run the Base payment example →
            </a>
          </div>
        </div>
      </section>

      <footer className="footer shell">
        <a className="brand" href="#top"><span className="brand-mark">P</span><span>ProofDesk</span></a>
        <p>Small, honest launch QA for humans and agents.</p>
        <div>
          <a href="/api/health">Status</a>
          <a href="/api/example">Example</a>
          <a href="/openapi.json">OpenAPI</a>
          <a href="/.well-known/agent.json">agent.json</a>
        </div>
      </footer>
    </main>
  );
}
