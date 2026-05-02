// Topographic background — concentric "elevation" curves + rivers + place labels
// Drawn as a single SVG layer behind the wells

function TopoMap() {
  // Generate elevation contours as wobbly closed paths
  const contours = React.useMemo(() => {
    const out = [];
    // Two "highlands" centers
    const peaks = [
      { cx: 250, cy: 220, r0: 40, rings: 6 },
      { cx: 600, cy: 160, r0: 50, rings: 7 },
      { cx: 770, cy: 470, r0: 45, rings: 6 },
      { cx: 380, cy: 480, r0: 35, rings: 5 },
    ];
    peaks.forEach((p, pi) => {
      for (let i = 0; i < p.rings; i++) {
        const r = p.r0 + i * 28;
        // Wobbly polygon
        const pts = [];
        const n = 36;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2;
          const wob = Math.sin(a * 3 + pi + i * 0.7) * 6 + Math.sin(a * 7 + pi * 2) * 3;
          const rr = r + wob;
          pts.push([p.cx + Math.cos(a) * rr, p.cy + Math.sin(a) * rr * 0.78]);
        }
        out.push({ pts, key: `${pi}-${i}`, depth: i });
      }
    });
    return out;
  }, []);

  const pathFromPts = (pts) => {
    return "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L") + " Z";
  };

  return (
    <svg className="topo" viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice"
         xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="paper" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#f4efe4" />
          <circle cx="1" cy="1" r="0.4" fill="#e8e0cf" />
        </pattern>
        <filter id="rough">
          <feTurbulence baseFrequency="0.9" numOctaves="2" seed="3" />
          <feDisplacementMap in="SourceGraphic" scale="1.4" />
        </filter>
      </defs>

      <rect width="1000" height="700" fill="url(#paper)" />

      {/* Section grid */}
      <g stroke="#d8cfb8" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.7">
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={`v${i}`} x1={(i + 1) * 100} y1="0" x2={(i + 1) * 100} y2="700" />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={(i + 1) * 100} x2="1000" y2={(i + 1) * 100} />
        ))}
      </g>

      {/* Contour lines */}
      <g fill="none" stroke="#b8a888" strokeWidth="0.8" filter="url(#rough)">
        {contours.map(c => (
          <path key={c.key} d={pathFromPts(c.pts)}
                opacity={0.45 + c.depth * 0.06}
                strokeWidth={c.depth === 0 ? 1.4 : 0.7} />
        ))}
      </g>

      {/* Rivers */}
      <g fill="none" stroke="#88a4b8" strokeWidth="2" strokeLinecap="round" filter="url(#rough)">
        <path d="M 0 380 Q 120 360 200 400 T 400 420 T 600 460 T 820 480 T 1000 510" opacity="0.7" />
        <path d="M 480 0 Q 470 80 500 160 T 540 320 T 510 460" opacity="0.55" />
      </g>
      <g fill="none" stroke="#b8d0dc" strokeWidth="0.6" strokeDasharray="3 2">
        <path d="M 0 380 Q 120 360 200 400 T 400 420 T 600 460 T 820 480 T 1000 510" />
      </g>

      {/* Roads — dashed */}
      <g fill="none" stroke="#7a6f5c" strokeWidth="1.2" strokeDasharray="6 4" opacity="0.6">
        <path d="M 0 280 L 1000 240" />
        <path d="M 600 0 L 580 700" />
      </g>

      {/* Boundary */}
      <rect x="40" y="40" width="920" height="620"
            fill="none" stroke="#3a3a3a" strokeWidth="1.5"
            strokeDasharray="10 4 2 4" filter="url(#rough)" opacity="0.6" />

      {/* Place names — handwritten */}
      <g className="place-labels" fill="#7a6f5c" fontFamily="'Architects Daughter', cursive">
        <text x="120" y="100" fontSize="18" opacity="0.7">MESA VERDE</text>
        <text x="540" y="80"  fontSize="18" opacity="0.7">SANDSTONE FIELD</text>
        <text x="660" y="300" fontSize="14" opacity="0.6">Black Mesa</text>
        <text x="800" y="180" fontSize="14" opacity="0.6">Dry Creek Basin</text>
        <text x="160" y="600" fontSize="14" opacity="0.6">Painted Hills</text>
        <text x="430" y="640" fontSize="18" opacity="0.7">BITTERROOT BASIN</text>
        <text x="40"  y="375" fontSize="11" opacity="0.7" fontStyle="italic">Coyote Wash →</text>
        <text x="510" y="14"  fontSize="11" opacity="0.7" fontStyle="italic">↓ County Rd 14</text>
      </g>

      {/* Compass + scale */}
      <g transform="translate(910, 90)">
        <circle r="22" fill="#f4efe4" stroke="#3a3a3a" strokeWidth="1" />
        <path d="M 0 -18 L 4 0 L 0 18 L -4 0 Z" fill="#3a3a3a" opacity="0.85" />
        <text y="-26" textAnchor="middle" fontSize="10" fontFamily="'JetBrains Mono', monospace">N</text>
      </g>
      <g transform="translate(60, 640)" fontFamily="'JetBrains Mono', monospace" fontSize="9" fill="#3a3a3a">
        <line x1="0" y1="0" x2="100" y2="0" stroke="#3a3a3a" strokeWidth="1.5" />
        <line x1="0" y1="-3" x2="0" y2="3" stroke="#3a3a3a" strokeWidth="1.5" />
        <line x1="50" y1="-2" x2="50" y2="2" stroke="#3a3a3a" strokeWidth="1" />
        <line x1="100" y1="-3" x2="100" y2="3" stroke="#3a3a3a" strokeWidth="1.5" />
        <text x="0"   y="14">0</text>
        <text x="100" y="14" textAnchor="end">2 mi</text>
      </g>
    </svg>
  );
}

window.TopoMap = TopoMap;
