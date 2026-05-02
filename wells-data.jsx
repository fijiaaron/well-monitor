// Well data + simulation
// Coordinates are in our local map space (0-1000 x, 0-700 y)
// Status: active, idle, capped, abandoned, inspection, leaking

const STATUS_META = {
  active:     { label: "ACTIVE",         color: "#3a8a4f", fill: "#9fd3a8", desc: "Producing — pumping" },
  idle:       { label: "IDLE",           color: "#c89832", fill: "#f0d68b", desc: "Temporarily not producing" },
  capped:     { label: "CAPPED",         color: "#5b6b78", fill: "#b8c2cb", desc: "Sealed, not abandoned" },
  abandoned:  { label: "P & A",          color: "#3a3a3a", fill: "#9c9c9c", desc: "Plugged & abandoned" },
  inspection: { label: "INSPECTION",     color: "#3068a8", fill: "#9bbedd", desc: "Crew on site" },
  leaking:    { label: "LEAKING",        color: "#c8442a", fill: "#f0a692", desc: "Anomalous emissions detected" },
};

const POLLUTANTS = ["CH4", "H2S", "BTEX", "VOC", "CO2"];

// Hand-placed-ish wells across the topographic field
const WELL_SEED = [
  { id: "W-001", name: "Mesa Verde 1",    x: 180, y: 160, status: "active",     age: 14, pump: 12.4 },
  { id: "W-002", name: "Mesa Verde 2",    x: 240, y: 200, status: "active",     age: 12, pump: 11.8 },
  { id: "W-003", name: "Coyote Wash A",   x: 320, y: 130, status: "idle",       age: 22, pump: 0 },
  { id: "W-004", name: "Coyote Wash B",   x: 360, y: 180, status: "leaking",    age: 28, pump: 0 },
  { id: "W-005", name: "Sandstone 7",     x: 460, y: 110, status: "active",     age: 6,  pump: 18.2 },
  { id: "W-006", name: "Sandstone 8",     x: 510, y: 160, status: "active",     age: 6,  pump: 17.6 },
  { id: "W-007", name: "Sandstone 9",     x: 560, y: 130, status: "inspection", age: 5,  pump: 0 },
  { id: "W-008", name: "Black Mesa 1",    x: 640, y: 200, status: "capped",     age: 41, pump: 0 },
  { id: "W-009", name: "Black Mesa 2",    x: 700, y: 240, status: "abandoned",  age: 56, pump: 0 },
  { id: "W-010", name: "Dry Creek 3",     x: 820, y: 200, status: "active",     age: 9,  pump: 14.1 },
  { id: "W-011", name: "Dry Creek 4",     x: 870, y: 250, status: "leaking",    age: 33, pump: 0 },
  { id: "W-012", name: "Painted Hills 1", x: 200, y: 320, status: "active",     age: 11, pump: 13.0 },
  { id: "W-013", name: "Painted Hills 2", x: 270, y: 380, status: "idle",       age: 18, pump: 0 },
  { id: "W-014", name: "Juniper Flat A",  x: 400, y: 340, status: "active",     age: 8,  pump: 16.4 },
  { id: "W-015", name: "Juniper Flat B",  x: 460, y: 400, status: "capped",     age: 38, pump: 0 },
  { id: "W-016", name: "Saguaro 12",      x: 580, y: 360, status: "active",     age: 7,  pump: 15.1 },
  { id: "W-017", name: "Saguaro 13",      x: 640, y: 420, status: "abandoned",  age: 62, pump: 0 },
  { id: "W-018", name: "Red Rock 1",      x: 760, y: 380, status: "active",     age: 10, pump: 13.7 },
  { id: "W-019", name: "Red Rock 2",      x: 820, y: 440, status: "inspection", age: 13, pump: 0 },
  { id: "W-020", name: "Lonepine",        x: 350, y: 500, status: "leaking",    age: 45, pump: 0 },
  { id: "W-021", name: "Bitterroot 1",    x: 500, y: 540, status: "active",     age: 8,  pump: 14.8 },
  { id: "W-022", name: "Bitterroot 2",    x: 580, y: 580, status: "active",     age: 8,  pump: 14.2 },
  { id: "W-023", name: "Skyline N",       x: 700, y: 540, status: "idle",       age: 19, pump: 0 },
  { id: "W-024", name: "Skyline S",       x: 760, y: 590, status: "capped",     age: 36, pump: 0 },
];

// Convert local coords (0-1000, 0-700) into "real" coordinates for display
function localToCoords(x, y) {
  const lat = 36.4521 - (y / 700) * 0.42;
  const lon = -107.8843 + (x / 1000) * 0.58;
  return { lat, lon };
}

// Per-well baseline emissions profile
function baselineFor(well) {
  switch (well.status) {
    case "leaking":    return { CH4: 480, H2S: 22, BTEX: 14, VOC: 95, CO2: 880 };
    case "active":     return { CH4: 38,  H2S: 1.2, BTEX: 0.6, VOC: 8,  CO2: 410 };
    case "idle":       return { CH4: 14,  H2S: 0.4, BTEX: 0.2, VOC: 3,  CO2: 380 };
    case "inspection": return { CH4: 22,  H2S: 0.7, BTEX: 0.3, VOC: 5,  CO2: 395 };
    case "capped":     return { CH4: 4,   H2S: 0.1, BTEX: 0.0, VOC: 1,  CO2: 365 };
    case "abandoned":  return { CH4: 7,   H2S: 0.2, BTEX: 0.1, VOC: 2,  CO2: 370 };
    default:           return { CH4: 0, H2S: 0, BTEX: 0, VOC: 0, CO2: 360 };
  }
}

// Simulated reading at time t (seconds)
function simulateReading(well, t) {
  const base = baselineFor(well);
  const seed = parseInt(well.id.slice(2), 10);
  const out = {};
  POLLUTANTS.forEach((p, i) => {
    const phase = seed * 0.7 + i * 1.3;
    const wobble = Math.sin(t * 0.6 + phase) * 0.18 + Math.sin(t * 1.7 + phase * 2) * 0.08;
    const spike = well.status === "leaking" ? Math.max(0, Math.sin(t * 0.3 + phase)) * 0.4 : 0;
    out[p] = Math.max(0, base[p] * (1 + wobble + spike));
  });
  // Pumping rate for active wells
  if (well.status === "active") {
    out.pump = well.pump * (1 + Math.sin(t * 0.9 + seed) * 0.04);
  }
  return out;
}

// Severity 0..1 based on combined pollutants — drives plume size + pulse
function severityOf(reading) {
  // Roughly weighted by EPA-ish concern
  const s = (reading.CH4 / 500) * 0.4
          + (reading.H2S / 25)  * 0.3
          + (reading.BTEX / 15) * 0.15
          + (reading.VOC / 100) * 0.15;
  return Math.max(0, Math.min(1, s));
}

window.WellsData = {
  STATUS_META,
  POLLUTANTS,
  WELL_SEED,
  localToCoords,
  baselineFor,
  simulateReading,
  severityOf,
};
