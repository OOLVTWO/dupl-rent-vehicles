export default function SectionHeading({ eyebrow, title, icon, subtitle, style }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: '32px', ...style }}>
      <div className="sharp-eyebrow">{eyebrow}</div>
      <h2 className="sharp-section-title">
        <span>{title}</span>
        {icon && <i className={icon} style={{ color: 'var(--sharp-accent)' }}></i>}
      </h2>
      {subtitle && <div className="sharp-section-subtitle">{subtitle}</div>}
    </div>
  );
}
