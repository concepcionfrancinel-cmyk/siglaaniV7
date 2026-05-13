import Topbar from './shared/Topbar';

const ALL_STEPS = [
  { num:1, title:"Ihanda ang prutas",     desc:"Ilagay ang prutas sa harap ng camera. Siguraduhing nakaposisyon nang maayos para sa pinakamainam na resulta." },
  { num:2, title:"Mag-adjust ng ilaw",    desc:"Tiyaking may sapat na ilaw sa paligid. Iwasan ang sobrangang liwanag o anino." },
  { num:3, title:'Pindutin ang "I-scan"', desc:"Pagkatapos, pindutin ang malaking berdeng pindutan para simulan ang pagsusuri ng camera." },
  { num:4, title:"Basahin ang resulta",   desc:"Lalabas ang detalyadong ulat at rekomendasyon pagkatapos ng pagsusuri." },
];

export default function InstructionsScreen({ page, onNext, onBack }) {
  const steps = page === 1 ? ALL_STEPS.slice(0, 2) : ALL_STEPS.slice(2, 4);

  return (
    <div className="screen instructions-screen">
      <Topbar right={`Hakbang ${page} ng 2`}/>
      <div className="instr-wrap">
        <div className="instr-left">
          <div className="instr-title">Paraan ng <span>Paggamit</span></div>
          <div className="instr-sub">
            {page === 1
              ? "Sundin ang mga hakbang na ito para makakuha ng pinaka-tumpak na resulta mula sa scanner."
              : "Dalawang hakbang pa at handa ka nang gumamit ng SiglaAni."}
          </div>
        </div>
        <div className="instr-right">
          <div className="steps-grid">
            {steps.map(s => (
              <div className="step-card" key={s.num}>
                <div className="step-num">{s.num}</div>
                <div className="step-text"><h4>{s.title}</h4><p>{s.desc}</p></div>
              </div>
            ))}
          </div>
          <div className="instr-btns">
            <button className="btn-secondary" onClick={onBack}>← Bumalik</button>
            <button className="btn-primary"   onClick={onNext}>
              {page === 2 ? "Simulan ang Pag-scan" : "Susunod →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
