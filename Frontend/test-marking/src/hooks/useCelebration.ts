// @ts-expect-error canvas-confetti typings may not be installed in devDependencies
import confetti from "canvas-confetti";

export function useCelebration() {
  const triggerConfetti = (type: "schoolPride" | "successGlow" | "default" = "default") => {
    try {
      if (type === "schoolPride") {
        // Blue and gold / amber (educational brand colors)
        const colors = ["#2563eb", "#fbbf24", "#60a5fa", "#f59e0b", "#3b82f6"];
        const end = Date.now() + 1.2 * 1000;

        (function frame() {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.8 },
            colors: colors,
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.8 },
            colors: colors,
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        })();
      } else if (type === "successGlow") {
        // Emerald green explosion
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#10b981", "#34d399", "#059669", "#6ee7b7"],
        });
      } else {
        // Default confetti
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.65 },
        });
      }
    } catch (error) {
      console.warn("Confetti animation failed:", error);
    }
  };

  return { triggerConfetti };
}
