// Info panel (right slide-in) and hover tooltip

function Sparkline({ data, color, height = 36, width = 220 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return [x, y];
  });
  const d = "M " + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ");
  // Area
  const area = d + ` L ${width} ${height} L 0 ${height} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height + 8} className="sparkline">
      <path d={area} fill={color} opacity="0.15" />
      <path d={d} stroke={color} strokeWidth="1.2" fill="none" />
      <circle cx={last[0]} cy={last[1]} r="2.2" fill={color} />
    </svg>
  );
}

function Tooltip({ well, reading, x, y }) {
  if (!well) return null;
  const { STATUS_META } = window.WellsData;
  const meta = STATUS_META[well.status];
  return (
    <div className="tooltip" style={{ left: x + 14, top: y + 10 }}>
      <div className="tt-row">
        <span className="tt-id">{well.id}</span>
        <span className="tt-name">{well.name}</span>
      </div>
      <div className="tt-row">
        <span className="status-pill" style={{ background: meta.fill, color: meta.color, borderColor: meta.color }}>
          {meta.label}
        </span>
        <span className="tt-meta">age {well.age}y</span>
      </div>
      <div className="tt-readout">
        <span>CH4 {reading.CH4.toFixed(1)}</span>
        <span>H2S {reading.H2S.toFixed(2)}</span>
        <span>VOC {reading.VOC.toFixed(1)}</span>
      </div>
      <div className="tt-hint">click for details →</div>
    </div>
  );
}

function InfoPanel({ well, history, onClose }) {
  const { STATUS_META, POLLUTANTS, localToCoords } = window.WellsData;
  if (!well) return null;
  const meta = STATUS_META[well.status];
  const coords = localToCoords(well.x, well.y);
  const reading = history.length ? history[history.length - 1] : null;

  // Per-pollutant series
  const series = {};
  POLLUTANTS.forEach(p => { series[p] = history.map(h => h[p] || 0); });

  // Limits / "concern" thresholds (illustrative)
  const LIMITS = { CH4: 200, H2S: 10, BTEX: 5, VOC: 50, CO2: 1000 };

  return (
    <aside className="info-panel">
      <button className="close-btn" onClick={onClose} aria-label="close">×</button>

      <header className="ip-header">
        <div className="ip-id">{well.id}</div>
        <h2>{well.name}</h2>
        <div className="ip-status">
          <span className="status-pill big"
                style={{ background: meta.fill, color: meta.color, borderColor: meta.color }}>
            {meta.label}
          </span>
          <span className="ip-desc">{meta.desc}</span>
        </div>
      </header>

      <section className="ip-section">
        <div className="ip-section-title">LOCATION</div>
        <div className="ip-grid">
          <div><label>LAT</label><div className="mono">{coords.lat.toFixed(5)}° N</div></div>
          <div><label>LON</label><div className="mono">{coords.lon.toFixed(5)}° W</div></div>
          <div><label>ELEV</label><div className="mono">{(5400 + (well.y * 0.6) | 0)} ft</div></div>
          <div><label>API #</label><div className="mono">30-045-{(20000 + parseInt(well.id.slice(2), 10) * 137).toString().slice(0, 5)}</div></div>
        </div>
      </section>

      <section className="ip-section">
        <div className="ip-section-title">WELL DATA</div>
        <div className="ip-grid">
          <div><label>AGE</label><div className="mono">{well.age} years</div></div>
          <div><label>SPUDDED</label><div className="mono">{2026 - well.age}</div></div>
          {well.status === "active" && reading && (
            <React.Fragment>
              <div><label>PUMP RATE</label><div className="mono">{reading.pump.toFixed(1)} bbl/hr</div></div>
              <div><label>STROKE</label><div className="mono">{(8 + Math.sin(history.length * 0.3) * 0.3).toFixed(1)}/min</div></div>
            </React.Fragment>
          )}
        </div>
      </section>

      <section className="ip-section sensor">
        <div className="ip-section-title">
          <span>SENSOR — SIGILINT EDGE</span>
          <span className="mesh-status">
            <span className="dot" />MESH ACTIVE
          </span>
        </div>

        {reading && POLLUTANTS.map(p => {
          const val = reading[p];
          const limit = LIMITS[p];
          const pct = Math.min(100, (val / limit) * 100);
          const over = val > limit;
          const color = p === "CH4" ? "#3068a8"
                      : p === "H2S" ? "#c8442a"
                      : p === "BTEX" ? "#7a4ea8"
                      : p === "VOC" ? "#c89832"
                      : "#5b6b78";
          const labels = { CH4: "Methane", H2S: "Hydrogen Sulfide", BTEX: "Benzene/BTEX", VOC: "Volatile Organic Compounds", CO2: "Carbon Dioxide" };
          return (
            <div key={p} className={`pollutant ${over ? "over" : ""}`}>
              <div className="poll-head">
                <span className="poll-name">
                  <span className="poll-code">{p}</span>
                  <span className="poll-label">{labels[p]}</span>
                </span>
                <span className="poll-val mono" style={{ color }}>
                  {val.toFixed(p === "H2S" || p === "BTEX" ? 2 : 1)}
                  <span className="unit">ppm</span>
                </span>
              </div>
              <div className="poll-bar-row">
                <div className="poll-bar">
                  <div className="poll-bar-fill" style={{ width: `${pct}%`, background: color }} />
                  <div className="poll-bar-limit" />
                </div>
                <Sparkline data={series[p]} color={color} width={90} height={20} />
              </div>
            </div>
          );
        })}
      </section>

      <footer className="ip-footer mono">
        sigilint.box.ed-{well.id.toLowerCase()} // last sync 0.0s
      </footer>
    </aside>
  );
}

window.Tooltip = Tooltip;
window.InfoPanel = InfoPanel;
window.Sparkline = Sparkline;
