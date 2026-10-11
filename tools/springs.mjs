// Prints CSS `linear()` easings that sample SwiftUI's spring presets, plus the
// time each needs to settle. Paste the output into src/styles/tokens.css.
//
// SwiftUI's Spring(duration:bounce:) is a damped harmonic oscillator with
//   angular frequency ω = 2π / duration,  damping ratio ζ = 1 − bounce  (bounce ≥ 0).
// Presets (Apple developer documentation): .smooth = bounce 0, .snappy = 0.15,
// .bouncy = 0.3, each with a perceptual duration of 0.5 s. `push` is a quicker .smooth
// (0.35 s) for page transitions, close to UINavigationController's push timing.
//
// Usage: node tools/springs.mjs
const presets = {
  smooth: { bounce: 0, duration: 0.5 },
  snappy: { bounce: 0.15, duration: 0.5 },
  bouncy: { bounce: 0.3, duration: 0.5 },
  push: { bounce: 0, duration: 0.35 },
};
const SETTLE = 0.001; // stop once within 0.1% of the target
const STEPS = 40;

/** Normalised displacement toward the target (0 → 1) at time t. */
function spring(t, bounce, duration) {
  const omega = (2 * Math.PI) / duration;
  const zeta = 1 - bounce;
  if (zeta >= 1) return 1 - Math.exp(-omega * t) * (1 + omega * t);
  const damped = omega * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * omega * t) * (Math.cos(damped * t) + ((zeta * omega) / damped) * Math.sin(damped * t));
}

for (const [name, { bounce, duration }] of Object.entries(presets)) {
  // Settle time: the envelope e^(−ζωt)·(1+ωt) for the critical case, e^(−ζωt)/√(1−ζ²) otherwise.
  let settle = 0;
  for (let t = 0; t < 5; t += 0.001) {
    const omega = (2 * Math.PI) / duration;
    const zeta = 1 - bounce;
    const envelope = zeta >= 1 ? Math.exp(-omega * t) * (1 + omega * t) : Math.exp(-zeta * omega * t) / Math.sqrt(1 - zeta * zeta);
    if (envelope < SETTLE) { settle = t; break; }
  }
  const points = [];
  for (let i = 0; i <= STEPS; i++) points.push(Number(spring((settle * i) / STEPS, bounce, duration).toFixed(4)));
  points[points.length - 1] = 1;
  console.log(`  /* .${name}: bounce ${bounce}, duration ${duration}s, settles in ${Math.round(settle * 1000)}ms */`);
  console.log(`  --spring-${name}: linear(${points.join(', ')});`);
  console.log(`  --spring-${name}-duration: ${Math.round(settle * 1000)}ms;`);
}
