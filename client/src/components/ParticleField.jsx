import { useEffect, useRef } from "react";

export default function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", { alpha: true });
    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random(),
      y: Math.random(),
      radius: 0.8 + Math.random() * 1.8,
      speed: 0.08 + Math.random() * 0.24,
      drift: -0.12 + Math.random() * 0.24,
      alpha: 0.25 + Math.random() * 0.55
    }));
    let frameId;
    let width = 0;
    let height = 0;

    function resize() {
      const scale = Math.min(window.devicePixelRatio || 1, 1.6);
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = Math.floor(width * scale);
      canvas.height = Math.floor(height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
    }

    function drawNebula() {
      const gradient = context.createRadialGradient(width * 0.28, height * 0.22, 0, width * 0.28, height * 0.22, width * 0.5);
      gradient.addColorStop(0, "rgba(112, 245, 255, 0.18)");
      gradient.addColorStop(0.48, "rgba(255, 95, 215, 0.08)");
      gradient.addColorStop(1, "rgba(6, 7, 19, 0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    }

    function drawRings(time) {
      context.save();
      context.translate(width * 0.54, height * 0.48 + Math.sin(time * 0.0012) * 8);
      context.rotate(time * 0.00008);
      context.strokeStyle = "rgba(255, 95, 215, 0.34)";
      context.lineWidth = 1.2;
      context.beginPath();
      context.ellipse(0, 0, width * 0.22, height * 0.055, -0.42, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = "rgba(148, 255, 184, 0.26)";
      context.beginPath();
      context.ellipse(0, 0, width * 0.16, height * 0.04, 0.32, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    }

    function render(time) {
      context.clearRect(0, 0, width, height);
      drawNebula();
      drawRings(time);

      for (const particle of particles) {
        particle.y -= particle.speed / Math.max(height, 1);
        particle.x += particle.drift / Math.max(width, 1);
        if (particle.y < -0.05) particle.y = 1.05;
        if (particle.x < -0.05) particle.x = 1.05;
        if (particle.x > 1.05) particle.x = -0.05;

        context.beginPath();
        context.fillStyle = `rgba(226, 252, 255, ${particle.alpha})`;
        context.arc(particle.x * width, particle.y * height, particle.radius, 0, Math.PI * 2);
        context.fill();
      }

      frameId = window.requestAnimationFrame(render);
    }

    resize();
    frameId = window.requestAnimationFrame(render);
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 -z-10 h-full w-full" aria-hidden="true" />;
}
