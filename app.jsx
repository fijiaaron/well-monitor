// Main app — wires everything together

const { useState, useEffect, useRef, useMemo, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "showRings": true,
  "showPlumes": true,
  "simSpeed": 1.0,
  "windAngle": 45,
  "statusFilter": "all",
  "pollutantFilter": "all"
}/*EDITMODE-END*/;

function App() {
  const { WELL_SEED, STATUS_META, POLLUTANTS, simulateReading, severityOf } = window.WellsData;
  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null); // { well, x, y } in client coords
  const [tick, setTick] = useState(0);
  const [history, setHistory] = useState({}); // wellId -> last 30 readings
  const [readings, setReadings] = useState({}); // wellId -> latest reading
  const [pulsePhase, setPulsePhase] = useState(0);

  // Simulation loop — 1Hz updates (modulated by simSpeed)
  useEffect(() => {
    const speed = tweaks.simSpeed || 1;
    let t = 0;
    const interval = setInterval(() => {
      t += speed;
      setTick(t);
      const newReadings = {};
      const newHistory = {};
      WELL_SEED.forEach(w => {
        const r = simulateReading(w, t);
        newReadings[w.id] = r;
      });
      setReadings(newReadings);
      setHistory(prev => {
        const next = { ...prev };
        WELL_SEED.forEach(w => {
          const arr = (next[w.id] || []).concat([newReadings[w.id]]);
          next[w.id] = arr.slice(-30);
        });
        return next;
      });
    }, 1000 / Math.max(0.25, speed));
    return () => clearInterval(interval);
  }, [tweaks.simSpeed]);

  // Pulse animation — independent rAF loop, smooth
  useEffect(() => {
    let raf;
    let start = performance.now();
    const loop = (now) => {
      setPulsePhase((now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Wind — gentle drift around set angle
  const windAngle = (tweaks.windAngle * Math.PI) / 180 + Math.sin(pulsePhase * 0.3) * 0.15;
  const windSpeed = 1 + Math.sin(pulsePhase * 0.4) * 0.2;

  // Filter wells
  const visibleWells = useMemo(() => {
    return WELL_SEED.filter(w => {
      if (tweaks.statusFilter !== "all" && w.status !== tweaks.statusFilter) return false;
      return true;
    });
  }, [tweaks.statusFilter]);

  // Pollutant focus — when filter is set, dim wells not emitting that strongly
  const pollutantFocus = tweaks.pollutantFilter;

  const hoverHideTimer = useRef(null);
  const handleHover = useCallback((well, e) => {
    if (hoverHideTimer.current) {
      clearTimeout(hoverHideTimer.current);
      hoverHideTimer.current = null;
    }
    setHovered({ well, x: e.clientX, y: e.clientY });
  }, []);
  const handleLeave = useCallback(() => {
    if (hoverHideTimer.current) clearTimeout(hoverHideTimer.current);
    hoverHideTimer.current = setTimeout(() => {
      setHovered(null);
      hoverHideTimer.current = null;
    }, 1000);
  }, []);
  const handleClick = useCallback((well) => {
    setSelected(prev => (prev && prev.id === well.id) ? null : well);
  }, []);
  const closePanel = useCallback(() => setSelected(null), []);

  // Counts for legend
  const counts = useMemo(() => {
    const c = {};
    Object.keys(STATUS_META).forEach(s => c[s] = 0);
    WELL_SEED.forEach(w => c[w.status]++);
    return c;
  }, []);

  // Severity per well — for plume sizing
  const severities = useMemo(() => {
    const s = {};
    WELL_SEED.forEach(w => {
      const r = readings[w.id];
      if (!r) { s[w.id] = 0; return; }
      let sev = severityOf(r);
      // If filtering by pollutant, scale plume to that pollutant's intensity
      if (pollutantFocus !== "all") {
        const limits = { CH4: 500, H2S: 25, BTEX: 15, VOC: 100, CO2: 1100 };
        sev = Math.min(1, r[pollutantFocus] / limits[pollutantFocus]);
      }
      s[w.id] = sev;
    });
    return s;
  }, [readings, pollutantFocus]);

  // Selected well's history for the panel
  const selectedHistory = selected ? (history[selected.id] || []) : [];

  // Stats footer
  const totalLeaking = WELL_SEED.filter(w => w.status === "leaking").length;
  const totalActive  = WELL_SEED.filter(w => w.status === "active").length;
  const fleetCH4 = Object.values(readings).reduce((a, r) => a + (r?.CH4 || 0), 0);

  return (
    <div className="app">
      {/* Top bar */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <svg width="22" height="22" viewBox="0 0 22 22">
              <path d="M 11 2 L 20 19 L 2 19 Z" fill="none" stroke="#1a1a1a" strokeWidth="1.6" />
              <circle cx="11" cy="13" r="2" fill="#1a1a1a" />
            </svg>
          </div>
          <div className="brand-text">
            <div className="brand-name">sigilint</div>
            <div className="brand-sub mono">well monitor // v0.4</div>
          </div>
        </div>

        <nav className="topnav mono">
          <a className="active">MAP</a>
          <a>FLEET</a>
          <a>ALERTS <span className="badge">{totalLeaking}</span></a>
          <a>REPORTS</a>
          <a>SETTINGS</a>
        </nav>

        <div className="region mono">
          <span className="region-label">REGION</span>
          <span className="region-val">San Juan Basin / NM</span>
          <span className="region-sep">//</span>
          <span className="region-val">{new Date().toISOString().slice(0, 10)}</span>
        </div>
      </header>

      {/* Map area */}
      <main className="map-area">
        <window.TopoMap />

        {/* Wells SVG layer */}
        <svg className="wells-layer" viewBox="0 0 1000 700"
             preserveAspectRatio="xMidYMid slice"
             xmlns="http://www.w3.org/2000/svg">
          {/* Plumes first (behind markers) */}
          {tweaks.showPlumes && visibleWells.map(w => (
            <window.Plume
              key={`p-${w.id}`}
              well={w}
              severity={severities[w.id] || 0}
              windAngle={windAngle}
              windSpeed={windSpeed}
              showRings={tweaks.showRings}
            />
          ))}
          {/* Markers */}
          {visibleWells.map(w => (
            <window.WellMarker
              key={w.id}
              well={w}
              isHovered={hovered?.well.id === w.id}
              isSelected={selected?.id === w.id}
              onHover={handleHover}
              onLeave={handleLeave}
              onClick={handleClick}
              pulsePhase={pulsePhase}
            />
          ))}
        </svg>

        {/* Hover tooltip */}
        {hovered && readings[hovered.well.id] && (
          <window.Tooltip
            well={hovered.well}
            reading={readings[hovered.well.id]}
            x={hovered.x}
            y={hovered.y}
          />
        )}

        {/* Legend */}
        <div className="legend">
          <div className="legend-title mono">LEGEND</div>
          {Object.entries(STATUS_META).map(([key, m]) => (
            <button
              key={key}
              className={`legend-row ${tweaks.statusFilter === key ? "active" : ""}`}
              onClick={() => setTweak("statusFilter", tweaks.statusFilter === key ? "all" : key)}
            >
              <span className="legend-dot" style={{ background: m.fill, borderColor: m.color }} />
              <span className="legend-label">{m.label}</span>
              <span className="legend-count mono">{counts[key]}</span>
            </button>
          ))}
          {tweaks.statusFilter !== "all" && (
            <button className="legend-clear mono" onClick={() => setTweak("statusFilter", "all")}>
              clear filter ×
            </button>
          )}
        </div>

        {/* Wind indicator */}
        <div className="wind-card">
          <div className="wind-title mono">WIND</div>
          <svg width="48" height="48" viewBox="-24 -24 48 48">
            <circle r="22" fill="none" stroke="#3a3a3a" strokeWidth="0.8" opacity="0.4" />
            <g transform={`rotate(${tweaks.windAngle})`}>
              <line x1="0" y1="14" x2="0" y2="-14" stroke="#1a1a1a" strokeWidth="1.5" />
              <path d="M 0 -14 L 4 -8 L -4 -8 Z" fill="#1a1a1a" />
            </g>
            <text y="-16" textAnchor="middle" fontSize="7"
                  fontFamily="'JetBrains Mono', monospace" fill="#7a6f5c">N</text>
          </svg>
          <div className="wind-val mono">{windSpeed.toFixed(1)} m/s</div>
        </div>

      </main>

      {/* Info panel */}
      {selected && (
        <window.InfoPanel
          well={selected}
          history={selectedHistory}
          onClose={closePanel}
        />
      )}

      {/* Bottom Sigilint-style status bar */}
      <footer className="status-bar mono">
        <span>MESH STATUS: <b className="ok">ACTIVE</b></span>
        <span>·</span>
        <span>NODES: {WELL_SEED.length}/{WELL_SEED.length}</span>
        <span>·</span>
        <span>UPTIME: 394:06</span>
        <span>·</span>
        <span>FLEET CH₄: {fleetCH4.toFixed(0)} ppm</span>
        <span>·</span>
        <span>ACTIVE PUMPS: {totalActive}</span>
        <span>·</span>
        <span className={totalLeaking ? "warn" : "ok"}>
          ALARMS: {totalLeaking}
        </span>
        <span>·</span>
        <span>TICK: {Math.floor(tick)}s</span>
      </footer>

      {/* Tweaks panel */}
      <window.TweaksPanel title="Tweaks">
        <window.TweakSection label="Display" />
        <window.TweakToggle
          label="Show plumes"
          value={tweaks.showPlumes}
          onChange={v => setTweak("showPlumes", v)}
        />
        <window.TweakToggle
          label="Distance rings"
          value={tweaks.showRings}
          onChange={v => setTweak("showRings", v)}
        />

        <window.TweakSection label="Filters" />
        <window.TweakSelect
          label="Status"
          value={tweaks.statusFilter}
          options={[
            { value: "all",        label: "All statuses" },
            { value: "active",     label: "Active only" },
            { value: "idle",       label: "Idle only" },
            { value: "capped",     label: "Capped only" },
            { value: "abandoned",  label: "P & A only" },
            { value: "inspection", label: "Inspection only" },
            { value: "leaking",    label: "Leaking only" },
          ]}
          onChange={v => setTweak("statusFilter", v)}
        />
        <window.TweakSelect
          label="Pollutant focus"
          value={tweaks.pollutantFilter}
          options={[
            { value: "all",  label: "Combined" },
            { value: "CH4",  label: "Methane (CH4)" },
            { value: "H2S",  label: "Hydrogen Sulfide" },
            { value: "BTEX", label: "Benzene / BTEX" },
            { value: "VOC",  label: "VOCs" },
            { value: "CO2",  label: "CO2" },
          ]}
          onChange={v => setTweak("pollutantFilter", v)}
        />

        <window.TweakSection label="Simulation" />
        <window.TweakSlider
          label="Sim speed"
          value={tweaks.simSpeed}
          min={0.25} max={4} step={0.25}
          unit="×"
          onChange={v => setTweak("simSpeed", v)}
        />
        <window.TweakSlider
          label="Wind direction"
          value={tweaks.windAngle}
          min={0} max={360} step={5}
          unit="°"
          onChange={v => setTweak("windAngle", v)}
        />
      </window.TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
