export default function FruitBall({ size = 160, opacity = 1, style = {} }) {
  return (
    <div className="fruit-placeholder" style={{ width:size, height:size, opacity, flexShrink:0, ...style }}>
      <div className="fruit-shine"/>
      <svg width={size*.3} height={size*.36} viewBox="0 0 28 36"
        style={{ position:"absolute", top:"-12%", left:"50%", transform:"translateX(-50%)" }} fill="none">
        <path d="M14 12 C14 4 22 0 26 2 C24 6 18 8 14 12Z" fill="#4caf50"/>
        <path d="M14 12 C14 4 6 0 2 2 C4 6 10 8 14 12Z" fill="#388e3c"/>
      </svg>
    </div>
  );
}
