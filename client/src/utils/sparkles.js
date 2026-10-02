export const createSparkles = (x, y) => {
  const colors = ['#f59e0b', '#ef4444', '#3b82f6'];
  for (let i = 0; i < 5; i++) {
    const sparkle = document.createElement('div');
    sparkle.style.cssText = `
      position: fixed; left: ${x}px; top: ${y}px; width: 6px; height: 6px;
      background: ${colors[i % colors.length]}; border-radius: 50%;
      pointer-events: none; z-index: 9999;
      animation: sparkle-fly 0.5s ease-out forwards;
      transform: translate(${(Math.random() - 0.5) * 60}px, ${(Math.random() - 0.5) * 60}px);
    `;
    document.body.appendChild(sparkle);
    setTimeout(() => sparkle.remove(), 500);
  }
};
