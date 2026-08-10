/**
 * Signature element for the public catalog page — a small hand-drawn-style
 * verification seal, since trust (deposits, safety, real reviews) is the
 * actual thing this page has to sell. Used near the rating in the hero,
 * built from real props rather than decoration for its own sake.
 */
export default function TrustSeal({ rating = '5.0', size = 64 }) {
  return (
    <div className="trust-seal">
      <svg
        className="trust-seal-ring"
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="32" cy="32" r="29" stroke="var(--brand-primary)" strokeWidth="1.4" strokeDasharray="2.2 3.4" />
        <circle cx="32" cy="32" r="23" stroke="var(--brand-primary)" strokeWidth="1.2" opacity="0.5" />
        <path
          d="M22 32.5L28.5 39L42 24"
          stroke="var(--brand-primary)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div>
        <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--sharp-ink)', lineHeight: 1.3 }}>
          Verified &amp; Trusted
        </div>
        <div style={{ fontSize: '12px', color: 'var(--sharp-muted)', lineHeight: 1.3 }}>
          {rating} rating &middot; real Google reviews
        </div>
      </div>
    </div>
  );
}
