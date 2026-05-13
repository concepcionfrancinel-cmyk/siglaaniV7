export default function MetricBar({ label, value, color, small = false }) {
  return (
    <div className="metric-row" style={ small ? { marginBottom:7 } : {} }>
      <span className="metric-label" style={ small ? { fontSize:11 } : {} }>{label}</span>
      <div className="metric-bar-wrap">
        <div className="metric-bar-fill" style={{ width:`${value}%`, background:color }}/>
      </div>
      <span className="metric-val" style={ small ? { fontSize:11 } : {} }>{value}%</span>
    </div>
  );
}
