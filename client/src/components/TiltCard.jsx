import { useRef, useState } from "react";

export default function TiltCard({ children, className = "" }) {
  const ref = useRef(null);
  const [style, setStyle] = useState({});

  function handleMove(event) {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = ((x / rect.width) - 0.5) * 10;
    const rotateX = ((y / rect.height) - 0.5) * -10;
    setStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`
    });
  }

  return (
    <div
      ref={ref}
      className={`tilt-card ${className}`}
      style={style}
      onMouseMove={handleMove}
      onMouseLeave={() => setStyle({ transform: "perspective(1000px) rotateX(0deg) rotateY(0deg)" })}
    >
      {children}
    </div>
  );
}
