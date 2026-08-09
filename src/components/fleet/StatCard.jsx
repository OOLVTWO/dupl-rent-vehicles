export default function StatCard({ value, valueColor, icon, iconColor, label, sublabel }) {
  return (
    <div className="sharp-card sharp-stat-card">
      <div className="sharp-stat-value" style={{ color: valueColor }}>
        <span>{value}</span>
        {icon && <i className={icon} style={{ color: iconColor || valueColor, fontSize: '26px' }}></i>}
      </div>
      <div className="sharp-stat-label">{label}</div>
      {sublabel && <div className="sharp-stat-sublabel">{sublabel}</div>}
    </div>
  );
}
