import logo2 from '../../logo2.png';

export default function LeafSVG({ size = 22 }) {
  return (
    <img src={logo2} alt="logo" width={size} height={size}
      style={{ objectFit:"contain" }} />
  );
}
