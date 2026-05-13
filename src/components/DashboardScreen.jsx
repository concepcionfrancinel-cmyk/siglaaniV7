import { useState, useEffect, useCallback } from 'react';
import LeafSVG from './shared/LeafSVG';

export default function DashboardScreen({ onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      // Fetching from the new Python endpoint we just made!
      // The ?t= prevents caching so it's always real-time
      const res = await fetch(`http://127.0.0.1:5000/api/analytics?t=${Date.now()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setData({ total_scans: 0, top_fruit: "N/A", fresh_rate: 0, breakdown: {} });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  if (loading || !data) {
    return (
      <div className="screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f1ea' }}>
        <div style={{ color: '#0b1f0d', fontSize: '20px', fontWeight: 'bold' }}>Kinakalkula ang Data...</div>
      </div>
    );
  }

  // Calculate percentages for our visual bars
  const total = data.total_scans || 1; // Prevent divide by zero
  const getPct = (key) => Math.round(((data.breakdown[key] || 0) / total) * 100);

  return (
    <div className="screen" style={{ backgroundColor: '#f4f1ea', display: 'flex', flexDirection: 'column' }}>
      
      {/* TOPBAR */}
      <div className="topbar" style={{ background: "#0b1f0d", padding: "15px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: '#4ade80', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>
            ← Bumalik
          </button>
          
        </div>
      </div>

      <div style={{ padding: '30px', flex: 1, overflowY: 'auto' }}>
        <h1 style={{ color: '#0b1f0d', marginBottom: '20px', fontSize: '28px' }}>Sigla ANI Analytics</h1>

        {/* SUMMARY CARDS (GRID) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          
          <div style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderLeft: '6px solid #4ade80' }}>
            <p style={{ margin: '0 0 10px 0', color: '#888', textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold' }}>Kabuuan ng Na-scan</p>
            <h2 style={{ margin: 0, fontSize: '42px', color: '#0b1f0d' }}>{data.total_scans}</h2>
          </div>

          <div style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderLeft: '6px solid #facc15' }}>
            <p style={{ margin: '0 0 10px 0', color: '#888', textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold' }}>Nangungunang Prutas</p>
            <h2 style={{ margin: 0, fontSize: '36px', color: '#0b1f0d' }}>{data.top_fruit}</h2>
          </div>

          <div style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderLeft: '6px solid #3b82f6' }}>
            <p style={{ margin: '0 0 10px 0', color: '#888', textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold' }}>Freshness Rate (Hinog)</p>
            <h2 style={{ margin: 0, fontSize: '42px', color: '#0b1f0d' }}>{data.fresh_rate}%</h2>
          </div>

        </div>

        {/* TRENDS: CONDITION BREAKDOWN */}
        <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h2 style={{ margin: '0 0 25px 0', color: '#0b1f0d', fontSize: '22px' }}>Kalagayan ng mga Prutas (Condition Trends)</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <TrendBar label="Hinog (Ripe)"       count={data.breakdown.ripe || 0}     pct={getPct('ripe')}     color="#4ade80" />
            <TrendBar label="Hindi Pa Hinog"     count={data.breakdown.unripe || 0}   pct={getPct('unripe')}   color="#60a5fa" />
            <TrendBar label="Sobrang Hinog"      count={data.breakdown.overripe || 0} pct={getPct('overripe')} color="#facc15" />
            <TrendBar label="Bulok (Rotten)"     count={data.breakdown.rotten || 0}   pct={getPct('rotten')}   color="#ef4444" />
          </div>
        </div>

      </div>
    </div>
  );
}

// Custom reusable component for the trend bars
function TrendBar({ label, count, pct, color }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
        <span>{label}</span>
        <span>{count} scans ({pct}%)</span>
      </div>
      <div style={{ height: '12px', width: '100%', backgroundColor: '#e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '6px', transition: 'width 1s ease-in-out' }} />
      </div>
    </div>
  );
}