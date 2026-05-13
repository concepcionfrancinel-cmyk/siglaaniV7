import { useState, useEffect, useCallback } from 'react';
import LeafSVG from './shared/LeafSVG';
import FruitBall from './shared/FruitBall';
import MetricBar from './shared/MetricBar';
import { badge } from '../constants';
import { apiHistory, apiDelete, apiClearHistory } from '../api';

function HistoryRow({ row, onDelete, isSelected, onClick }) {
  const b  = badge(row.condition);
  const dt = new Date(row.scanned_at);
  const ts = isNaN(dt) ? row.scanned_at : dt.toLocaleString("en-PH", {
    month:"short", day:"numeric", hour:"2-digit", minute:"2-digit"
  });

  return (
    <div className={`hist-row ${isSelected ? "selected" : ""}`} onClick={onClick}>
      <div className="hist-thumb-wrap">
        {row.thumbnail
          ? <img src={`data:image/jpeg;base64,${row.thumbnail}`} className="hist-thumb" alt=""/>
          : <FruitBall size={44}/>
        }
      </div>
      <div className="hist-info">
        <div className="hist-fruit">{row.fruit}</div>
        <div className="hist-sci">{row.condition_label ?? row.conditionLabel}</div>
        <div className="hist-ts">{ts}</div>
      </div>
      <div className="hist-right">
        <div className={`hist-badge ${b.cls}`}>{b.label}</div>
        <div className="hist-conf">{row.confidence}%</div>
      </div>
      <button className="hist-del" onClick={e => { e.stopPropagation(); onDelete(row.id); }} title="Delete">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M3 4h10M6 4V3h4v1M5 4l.5 9h5l.5-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}

function HistoryDetail({ row, onClose }) {
  if (!row) return (
    <div className="hist-detail hist-detail--empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888' }}>
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ opacity:.25, marginBottom: '10px' }}>
        <rect x="5" y="8"  width="26" height="3" rx="1.5" fill="#888"/>
        <rect x="5" y="16" width="26" height="3" rx="1.5" fill="#888"/>
        <rect x="5" y="24" width="16" height="3" rx="1.5" fill="#888"/>
      </svg>
      <span>Pumili ng scan para makita ang detalye</span>
    </div>
  );

  const b = badge(row.condition);
  const dt = new Date(row.scanned_at);
  const timeString = isNaN(dt) ? row.scanned_at : dt.toLocaleTimeString("en-PH", {
    hour: "2-digit", minute: "2-digit"
  });
  
  // Format the ID exactly like the result screen (e.g., #0001)
  const paddedId = `#${String(row.id).padStart(4, '0')}`;

  // Helper to draw the green rating stars
  const renderStars = (rating) => {
    const stars = [];
    for(let i=1; i<=5; i++) {
      stars.push(
        <span key={i} style={{color: i <= rating ? '#4ade80' : '#e5e7eb', fontSize: '32px', marginRight: '4px'}}>
          ★
        </span>
      );
    }
    return stars;
  };

  return (
    <div className="hist-detail" style={{ padding: 0, display: 'flex', backgroundColor: '#0b1f0d', borderRadius: '12px', overflow: 'hidden', height: '100%' }}>
      
      {/* LEFT PANE - Dark Green with Image */}
      <div style={{ flex: '0 0 35%', backgroundColor: '#0b1f0d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', borderRight: '1px solid #1a3a1f' }}>
         {row.thumbnail ? (
            <img src={`data:image/jpeg;base64,${row.thumbnail}`} alt="scan" style={{ width: '100%', maxWidth: '200px', borderRadius: '16px', border: '4px solid #1a3a1f', objectFit: 'cover', aspectRatio: '1/1' }}/>
         ) : (
            <FruitBall size={120}/>
         )}
      </div>

      {/* RIGHT PANE - Light Beige with Details */}
      <div style={{ flex: 1, backgroundColor: '#f4f1ea', padding: '30px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Close Button */}
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>

        {/* Title Area */}
        <h1 style={{ margin: '0 0 5px 0', fontSize: '32px', color: '#0b1f0d', textTransform: 'lowercase' }}>{row.fruit}</h1>
        <p style={{ margin: '0 0 15px 0', color: '#888', fontStyle: 'italic', fontSize: '14px' }}>{row.scientific || 'SIGLA ANI AI'}</p>

        {/* Stars & Condition */}
        <div style={{ marginBottom: '10px' }}>
           {renderStars(row.rating || 3)}
        </div>
        <h3 style={{ margin: '0 0 20px 0', color: '#4ade80', fontSize: '18px' }}>{row.condition_label ?? row.conditionLabel}</h3>

        {/* Recommendation Box */}
        <div style={{ backgroundColor: '#eef8ec', border: '1px solid #d1e8ce', borderRadius: '12px', padding: '15px', marginBottom: '20px' }}>
           <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#6fb365', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Rekomendasyon</p>
           <p style={{ margin: 0, fontSize: '14px', color: '#333', lineHeight: '1.5' }}>{row.recommendation}</p>
        </div>

        {/* 3 Info Cards */}
        <div style={{ display: 'flex', gap: '15px', marginTop: 'auto' }}>
           <div style={{ flex: 1, backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: '#bbb', textTransform: 'uppercase', fontWeight: 'bold' }}>Oras Ng Scan</p>
              <p style={{ margin: 0, fontSize: '16px', color: '#0b1f0d', fontWeight: 'bold' }}>{timeString}</p>
           </div>
           <div style={{ flex: 1, backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: '#bbb', textTransform: 'uppercase', fontWeight: 'bold' }}>Scan ID</p>
              <p style={{ margin: 0, fontSize: '16px', color: '#0b1f0d', fontWeight: 'bold' }}>{paddedId}</p>
           </div>
           <div style={{ flex: 1, backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '11px', color: '#bbb', textTransform: 'uppercase', fontWeight: 'bold' }}>Confidence</p>
              <p style={{ margin: 0, fontSize: '16px', color: '#0b1f0d', fontWeight: 'bold' }}>{row.confidence}%</p>
           </div>
        </div>

      </div>
    </div>
  );
}

export default function HistoryScreen({ onBack, onScanAgain }) {
  const [rows,     setRows]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selRow,   setSelRow]   = useState(null);
  const [filter,   setFilter]   = useState("all");
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await apiHistory()); }
    catch { setRows([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    await apiDelete(id);
    setRows(r => r.filter(x => x.id !== id));
    if (selRow?.id === id) setSelRow(null);
  };

  const handleClear = async () => {
    if (!window.confirm("Burahin ang lahat ng scan history?")) return;
    setClearing(true);
    await apiClearHistory();
    setRows([]);
    setSelRow(null);
    setClearing(false);
  };

  const FILTERS = ["all","ripe","overripe","unripe","rotten"];
  const visible  = filter === "all" ? rows : rows.filter(r => r.condition === filter);

  return (
    <div className="screen hist-screen">
      <div className="topbar" style={{ background:"#0b1f0d" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button className="btn-back" onClick={onBack}>← Bumalik</button>
          <div className="tb-logo"><LeafSVG size={22}/><span className="tb-title">SIGLA ANI</span></div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span className="tb-right">{rows.length} scan{rows.length !== 1 ? "s" : ""}</span>
          {rows.length > 0 && (
            <button className="hist-clear-btn" onClick={handleClear} disabled={clearing}>
              {clearing ? "Binubura..." : "Clear All"}
            </button>
          )}
          <button className="scan-now-btn" onClick={onScanAgain}>+ Mag-scan</button>
        </div>
      </div>

      <div className="hist-body">
        <div className="hist-filters">
          {FILTERS.map(f => (
            <button key={f} className={`hist-filter ${filter===f?"active":""}`} onClick={() => setFilter(f)}>
              {f === "all" ? "Lahat" : badge(f).label}
            </button>
          ))}
        </div>

        <div className="hist-content">
          <div className="hist-list">
            {loading && (
              <div className="hist-empty">
                <div className="hist-spinner"/>
                <span>Naglo-load...</span>
              </div>
            )}
            {!loading && visible.length === 0 && (
              <div className="hist-empty">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ opacity:.2 }}>
                  <circle cx="20" cy="20" r="17" stroke="#888" strokeWidth="2"/>
                  <path d="M20 12v9" stroke="#888" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="20" cy="27" r="1.5" fill="#888"/>
                </svg>
                <span>Walang mga scan pa</span>
              </div>
            )}
            {!loading && visible.map(r => (
              <HistoryRow key={r.id} row={r}
                isSelected={selRow?.id === r.id}
                onClick={() => setSelRow(r)}
                onDelete={handleDelete}/>
            ))}
          </div>
          <HistoryDetail row={selRow} onClose={() => setSelRow(null)}/>
        </div>
      </div>
    </div>
  );
}