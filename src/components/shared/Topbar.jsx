import LeafSVG from './LeafSVG';

export default function Topbar({ right, onHistory, showHistoryBtn = false }) {
  return (
    <div className="topbar">
      <div className="tb-logo">
        <LeafSVG size={22}/>
        <span className="tb-title">SIGLA ANI</span>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        {showHistoryBtn && (
          <button className="tb-hist-btn" onClick={onHistory}>
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="4"    width="16" height="2.5" rx="1.2" fill="currentColor"/>
              <rect x="2" y="8.75" width="16" height="2.5" rx="1.2" fill="currentColor"/>
              <rect x="2" y="13.5" width="10" height="2.5" rx="1.2" fill="currentColor"/>
            </svg>
            History
          </button>
        )}
        {right && <span className="tb-right">{right}</span>}
      </div>
    </div>
  );
}
