// Animated drifting plume — radial gradient blob that drifts with wind
// Uses CSS for animation (lightweight, looks organic)

function Plume({ well, severity, windAngle, windSpeed, showRings }) {
  const { STATUS_META } = window.WellsData;
  const meta = STATUS_META[well.status];

  // Plume size scales with severity. Min 0 (no plume), max ~140px radius
  const r = severity * 140 + 8;
  if (severity < 0.05) return null;

  // Wind direction: angle in radians, drift the plume center
  const dx = Math.cos(windAngle) * windSpeed * 18;
  const dy = Math.sin(windAngle) * windSpeed * 18;

  const isLeak = well.status === "leaking";
  const color = isLeak ? "#c8442a" : meta.color;

  return (
    <g className="plume" pointerEvents="none">
      {/* Outer drifted blob */}
      <ellipse
        cx={well.x + dx} cy={well.y + dy}
        rx={r * 1.05} ry={r * 0.78}
        fill={color}
        opacity={0.10 + severity * 0.10}
        style={{ filter: "blur(8px)" }}
        transform={`rotate(${windAngle * 180 / Math.PI} ${well.x + dx} ${well.y + dy})`}
      />
      <ellipse
        cx={well.x + dx * 0.55} cy={well.y + dy * 0.55}
        rx={r * 0.7} ry={r * 0.55}
        fill={color}
        opacity={0.16 + severity * 0.12}
        style={{ filter: "blur(5px)" }}
        transform={`rotate(${windAngle * 180 / Math.PI} ${well.x + dx * 0.55} ${well.y + dy * 0.55})`}
      />
      <circle
        cx={well.x + dx * 0.2} cy={well.y + dy * 0.2}
        r={r * 0.4}
        fill={color}
        opacity={0.22 + severity * 0.18}
        style={{ filter: "blur(3px)" }}
      />

      {/* Distance rings (10ft / 100ft / 500ft labels) */}
      {showRings && (
        <g className="plume-rings" stroke={color} fill="none" opacity="0.55">
          <circle cx={well.x} cy={well.y} r={r * 0.35} strokeWidth="0.8" strokeDasharray="2 3" />
          <circle cx={well.x} cy={well.y} r={r * 0.7}  strokeWidth="0.8" strokeDasharray="3 4" />
          <circle cx={well.x} cy={well.y} r={r}        strokeWidth="0.8" strokeDasharray="4 5" />
          <text x={well.x + r * 0.35 + 2} y={well.y - 1} fontSize="7"
                fontFamily="'JetBrains Mono', monospace" fill={color}>10ft</text>
          <text x={well.x + r * 0.7  + 2} y={well.y - 1} fontSize="7"
                fontFamily="'JetBrains Mono', monospace" fill={color}>100ft</text>
          <text x={well.x + r        + 2} y={well.y - 1} fontSize="7"
                fontFamily="'JetBrains Mono', monospace" fill={color}>500ft</text>
        </g>
      )}
    </g>
  );
}

// The well marker — derrick-ish glyph with status fill + subtle pulse for leaking
function WellMarker({ well, isHovered, isSelected, onHover, onLeave, onClick, pulsePhase }) {
  const { STATUS_META } = window.WellsData;
  const meta = STATUS_META[well.status];

  const isLeak = well.status === "leaking";
  const isPA   = well.status === "abandoned";
  const isCap  = well.status === "capped";

  // Pulse for leaking — subtle, no flash
  const pulseOpacity = isLeak ? 0.25 + Math.sin(pulsePhase * 2) * 0.15 : 0;
  const pulseR       = isLeak ? 14 + Math.sin(pulsePhase * 2) * 4 : 0;

  return (
    <g
      className={`well ${isHovered ? "hovered" : ""} ${isSelected ? "selected" : ""}`}
      transform={`translate(${well.x}, ${well.y})`}
      onMouseEnter={(e) => onHover(well, e)}
      onMouseMove={(e) => onHover(well, e)}
      onMouseLeave={onLeave}
      onClick={() => onClick(well)}
      style={{ cursor: "pointer" }}
    >
      {/* Pulse ring for leaking */}
      {isLeak && (
        <circle r={pulseR} fill="none" stroke={meta.color}
                strokeWidth="1.5" opacity={pulseOpacity} />
      )}

      {/* Selection halo */}
      {isSelected && (
        <circle r="16" fill="none" stroke="#1a1a1a" strokeWidth="1.2" strokeDasharray="3 2" />
      )}

      {/* Hover halo */}
      {isHovered && !isSelected && (
        <circle r="14" fill="none" stroke="#1a1a1a" strokeWidth="0.8" opacity="0.5" />
      )}

      {/* Body — derrick-style triangle on a base, or different glyph per status */}
      <g>
        <circle r="9" fill={meta.fill} stroke={meta.color} strokeWidth="1.4" />
        {/* Inner glyph */}
        {well.status === "active" && (
          // Triangle (derrick)
          <path d="M 0 -5 L 4 3 L -4 3 Z" fill={meta.color} />
        )}
        {well.status === "idle" && (
          // Hollow triangle
          <path d="M 0 -5 L 4 3 L -4 3 Z" fill="none" stroke={meta.color} strokeWidth="1.2" />
        )}
        {isCap && (
          // Cap — short bar
          <rect x="-4" y="-1" width="8" height="2.5" fill={meta.color} />
        )}
        {isPA && (
          // X
          <g stroke={meta.color} strokeWidth="1.5" strokeLinecap="round">
            <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" />
            <line x1="-3.5" y1="3.5"  x2="3.5" y2="-3.5" />
          </g>
        )}
        {well.status === "inspection" && (
          // Magnifier dot
          <g stroke={meta.color} strokeWidth="1.2" fill="none">
            <circle r="3" />
            <line x1="2" y1="2" x2="4" y2="4" strokeWidth="1.4" />
          </g>
        )}
        {isLeak && (
          // Wave / squiggle
          <path d="M -4 0 Q -2 -3 0 0 T 4 0" stroke={meta.color}
                strokeWidth="1.4" fill="none" strokeLinecap="round" />
        )}
      </g>

      {/* ID label below */}
      <text y="22" textAnchor="middle" fontSize="8"
            fontFamily="'JetBrains Mono', monospace"
            fill="#3a3a3a" opacity="0.75">{well.id}</text>
    </g>
  );
}

window.Plume = Plume;
window.WellMarker = WellMarker;
