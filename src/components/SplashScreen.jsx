import logo from '../logo.png';

export default function SplashScreen({ onStart, onDashboard }) {
  return (
    <div className="screen splash">
      <div className="sp-bg" />
      <div className="sp-center">
        <img src={logo} alt="logo" width="400" height="400"
          style={{ objectFit:"contain" }} />
        
        {/* The wrapper that groups them */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
          
          <button className="splash-btn" onClick={onStart}>
            Magsimula
          </button>
          
          <button 
            onClick={onDashboard} 
            style={{ 
              padding: '10px 24px', 
              fontSize: '10px', 
              background: 'transparent', 
              color: '#4ade80', 
              border: '1px solid #4ade80', 
              borderRadius: '40px', 
              cursor: 'pointer', 
              marginBottom: '70px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px'
              
            }}>
            Admin Dashboard
          </button>
          
        </div>
      </div>
    </div>
  );
}