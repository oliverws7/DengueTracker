import './StatsCard.css';

const StatsCard = ({ title, value, color, change, icon }) => {
  return (
    <div className="stats-card" style={{ borderTopColor: color }}>
      <div className="stats-header">
        <div className="stats-icon" style={{ backgroundColor: color + '20', color }}>
          {icon}
        </div>
        <div className={`stats-change ${change.startsWith('+') ? 'positive' : 'negative'}`}>
          {change}
        </div>
      </div>
      <div className="stats-content">
        <h3 className="stats-title">{title}</h3>
        <div className="stats-value">{value}</div>
      </div>
    </div>
  );
};

export default StatsCard;