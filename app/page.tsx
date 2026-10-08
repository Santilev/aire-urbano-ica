"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

type Model = "mixto" | "normal" | "exponencial";
type ZoneName = "Centro" | "Norte" | "Sur" | "Este";
type Simulation = Record<ZoneName, number[]>;

const HOURS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`);
const ZONES: Array<{
  name: ZoneName;
  color: string;
  soft: string;
  base: number;
  amplitude: number;
  phase: number;
  model: Exclude<Model, "mixto">;
}> = [
  { name: "Centro", color: "#f36f56", soft: "#fff0eb", base: 72, amplitude: 28, phase: 0.2, model: "exponencial" },
  { name: "Norte", color: "#2a9d78", soft: "#e8f7f1", base: 46, amplitude: 14, phase: 1.1, model: "normal" },
  { name: "Sur", color: "#8067d9", soft: "#f0edff", base: 59, amplitude: 21, phase: 2.3, model: "exponencial" },
  { name: "Este", color: "#e2a72e", soft: "#fff7df", base: 52, amplitude: 17, phase: 3.2, model: "normal" },
];

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function normalSample(random: () => number) {
  const u = Math.max(random(), Number.EPSILON);
  const v = Math.max(random(), Number.EPSILON);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function exponentialShock(random: () => number) {
  const magnitude = -Math.log(Math.max(1 - random(), Number.EPSILON));
  return (random() > 0.32 ? 1 : -1) * magnitude;
}

function gaussianPeak(hour: number, center: number, width: number) {
  return Math.exp(-((hour - center) ** 2) / (2 * width ** 2));
}

function simulate(seed: number, selectedModel: Model): Simulation {
  const random = seededRandom(seed);
  return Object.fromEntries(
    ZONES.map((zone) => {
      const model = selectedModel === "mixto" ? zone.model : selectedModel;
      let previous = zone.base;
      const values = HOURS.map((_, hour) => {
        const morningRush = gaussianPeak(hour, 8, 1.9);
        const eveningRush = gaussianPeak(hour, 18, 2.2);
        const nightRelief = gaussianPeak(hour, 3, 2.8);
        const urbanCycle = zone.amplitude * (0.75 * morningRush + eveningRush - 0.35 * nightRelief);
        const breeze = 4 * Math.sin((hour / 24) * Math.PI * 2 + zone.phase);
        const noise = model === "normal" ? normalSample(random) * 5.2 : exponentialShock(random) * 7.2;
        const target = zone.base + urbanCycle + breeze + noise;
        const persistence = model === "normal" ? 0.28 : 0.16;
        const value = target * (1 - persistence) + previous * persistence;
        previous = Math.max(12, Math.min(220, value));
        return Math.round(previous);
      });
      return [zone.name, values];
    }),
  ) as Simulation;
}

function quality(value: number) {
  if (value <= 50) return { label: "Buena", color: "#1f8b69", background: "#e8f7f1" };
  if (value <= 100) return { label: "Moderada", color: "#9a6c00", background: "#fff4cf" };
  if (value <= 150) return { label: "Sensible", color: "#c34f38", background: "#ffebe6" };
  return { label: "Dañina", color: "#923b80", background: "#f8e6f4" };
}

function findWorst(data: Simulation) {
  let result = { zone: "Centro" as ZoneName, hour: 0, value: -Infinity };
  ZONES.forEach((zone) => {
    data[zone.name].forEach((value, hour) => {
      if (value > result.value) result = { zone: zone.name, hour, value };
    });
  });
  return result;
}

const mainOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  animation: { duration: 350 },
  plugins: {
    legend: {
      position: "top",
      align: "end",
      labels: {
        usePointStyle: true,
        pointStyle: "circle",
        boxWidth: 7,
        boxHeight: 7,
        padding: 18,
        color: "#536070",
        font: { family: "Arial", size: 12, weight: 600 },
        filter: (item) => item.text !== "Umbral sensible",
      },
    },
    tooltip: {
      backgroundColor: "#17202d",
      titleColor: "#ffffff",
      bodyColor: "#e7edf4",
      padding: 12,
      cornerRadius: 10,
      usePointStyle: true,
      callbacks: { label: (context) => ` ${context.dataset.label}: ${context.parsed.y} ICA` },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: "#8792a1", maxRotation: 0, autoSkip: true, maxTicksLimit: 8, font: { size: 11 } },
      border: { display: false },
    },
    y: {
      suggestedMin: 0,
      suggestedMax: 160,
      grid: { color: "#edf0f3" },
      border: { display: false },
      ticks: { color: "#8792a1", padding: 10, font: { size: 11 } },
      title: { display: true, text: "Índice de Calidad del Aire", color: "#8792a1", font: { size: 11, weight: 500 } },
    },
  },
};

const miniOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 350 },
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  scales: { x: { display: false }, y: { display: false, suggestedMin: 15, suggestedMax: 155 } },
  elements: { point: { radius: 0, hitRadius: 0 }, line: { borderWidth: 2.5, tension: 0.38 } },
};

export default function Home() {
  const [model, setModel] = useState<Model>("mixto");
  const [seed, setSeed] = useState(20261008);
  const [currentHour, setCurrentHour] = useState(8);
  const [playing, setPlaying] = useState(true);
  const simulation = useMemo(() => simulate(seed, model), [seed, model]);
  const worst = useMemo(() => findWorst(simulation), [simulation]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setCurrentHour((hour) => {
        if (hour >= 23) {
          setPlaying(false);
          return 23;
        }
        return hour + 1;
      });
    }, 900);
    return () => window.clearInterval(timer);
  }, [playing]);

  const visibleHours = HOURS.slice(0, currentHour + 1);
  const currentReadings = ZONES.map((zone) => ({ zone, value: simulation[zone.name][currentHour] }));
  const cityAverage = Math.round(currentReadings.reduce((sum, item) => sum + item.value, 0) / ZONES.length);
  const elevatedHours = HOURS.filter((_, hour) => ZONES.some((zone) => simulation[zone.name][hour] > 100)).length;

  const mainData = {
    labels: visibleHours,
    datasets: [
      ...ZONES.map((zone) => ({
        label: zone.name,
        data: simulation[zone.name].slice(0, currentHour + 1),
        borderColor: zone.color,
        backgroundColor: zone.color,
        borderWidth: 2.5,
        pointRadius: visibleHours.map((_, index) => (index === currentHour ? 4 : 0)),
        pointHoverRadius: 5,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: zone.color,
        pointBorderWidth: 2.5,
        tension: 0.35,
      })),
      {
        label: "Umbral sensible",
        data: visibleHours.map(() => 100),
        borderColor: "#cbd2da",
        backgroundColor: "#cbd2da",
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        tension: 0,
      },
    ],
  };

  function resetSimulation() {
    setSeed(Date.now() % 2147483647);
    setCurrentHour(0);
    setPlaying(true);
  }

  function changeModel(nextModel: Model) {
    setModel(nextModel);
    setSeed((value) => value + 97);
    setCurrentHour(0);
    setPlaying(true);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
          <div><p className="eyebrow">MONITOREO AMBIENTAL</p><h1>Aire Urbano</h1></div>
        </div>
        <div className="header-actions">
          <div className="live-pill"><span className="pulse" /> SIMULACIÓN EN VIVO</div>
          <button className="primary-button" onClick={resetSimulation}><span aria-hidden="true">↻</span> Nueva simulación</button>
        </div>
      </header>

      <section className="hero-row">
        <div>
          <p className="section-kicker">SIMULACIÓN ESTOCÁSTICA · 24 HORAS</p>
          <h2>La ciudad, respiración por respiración.</h2>
          <p className="intro">Variaciones horarias del ICA en cuatro zonas críticas. Reproducí el día, compará patrones y detectá eventos de contaminación.</p>
        </div>
        <div className="model-picker" role="group" aria-label="Modelo estocástico">
          <span>Modelo</span>
          {(["mixto", "normal", "exponencial"] as Model[]).map((item) => (
            <button key={item} className={model === item ? "active" : ""} onClick={() => changeModel(item)}>
              {item === "mixto" ? "Mixto" : item === "normal" ? "Normal" : "Exponencial"}
            </button>
          ))}
        </div>
      </section>

      <section className="stat-grid" aria-label="Resumen de la simulación">
        <article className="stat-card critical-stat">
          <div className="stat-icon coral" aria-hidden="true">!</div>
          <div><p>PEOR REGISTRO DEL DÍA</p><strong>{worst.value} <small>ICA</small></strong><span>{worst.zone} · {HOURS[worst.hour]}</span></div>
          <div className="risk-flag">PICO MÁXIMO</div>
        </article>
        <article className="stat-card">
          <div className="stat-icon mint" aria-hidden="true">≈</div>
          <div><p>PROMEDIO ACTUAL</p><strong>{cityAverage} <small>ICA</small></strong><span>Media de las 4 zonas</span></div>
        </article>
        <article className="stat-card">
          <div className="stat-icon violet" aria-hidden="true">◷</div>
          <div><p>HORAS CON ALERTA</p><strong>{elevatedHours} <small>h</small></strong><span>Alguna zona supera 100</span></div>
        </article>
        <article className="stat-card">
          <div className="stat-icon amber" aria-hidden="true">◎</div>
          <div><p>HORA OBSERVADA</p><strong>{HOURS[currentHour]}</strong><span>{Math.round(((currentHour + 1) / 24) * 100)}% del día procesado</span></div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel chart-panel">
          <div className="panel-heading">
            <div><p className="panel-kicker">COMPARATIVA HORARIA</p><h3>Evolución del ICA</h3></div>
            <span className="threshold-note"><i /> Umbral sensible: 100</span>
          </div>
          <div className="main-chart"><Line data={mainData} options={mainOptions} /></div>
          <div className="player">
            <button className="play-button" onClick={() => currentHour === 23 ? (setCurrentHour(0), setPlaying(true)) : setPlaying((value) => !value)} aria-label={playing ? "Pausar simulación" : "Reproducir simulación"}>{playing ? "Ⅱ" : "▶"}</button>
            <span>00:00</span>
            <input type="range" min="0" max="23" value={currentHour} onChange={(event) => { setCurrentHour(Number(event.target.value)); setPlaying(false); }} aria-label="Hora de la simulación" style={{ "--progress": `${(currentHour / 23) * 100}%` } as React.CSSProperties} />
            <span>23:00</span><strong>{HOURS[currentHour]}</strong>
          </div>
        </article>

        <aside className="panel analysis-panel">
          <div className="panel-heading"><div><p className="panel-kicker">LECTURA AUTOMÁTICA</p><h3>Hallazgos del día</h3></div><span className="spark" aria-hidden="true">✦</span></div>
          <div className="finding highlight"><span>01</span><div><strong>{worst.zone} concentra el pico crítico</strong><p>El máximo fue de {worst.value} ICA a las {HOURS[worst.hour]}. Coincide con una franja de alta actividad urbana.</p></div></div>
          <div className="finding"><span>02</span><div><strong>Dos ventanas de mayor presión</strong><p>La movilidad de las 08:00 y 18:00 eleva la línea base; el modelo agrega incertidumbre sobre ese ciclo.</p></div></div>
          <div className="finding"><span>03</span><div><strong>El modelo cambia la forma del riesgo</strong><p>La normal produce oscilaciones suaves; la exponencial introduce picos menos frecuentes y más abruptos.</p></div></div>
          <div className="model-note">
            <span>MODELO ACTIVO</span>
            <strong>{model === "mixto" ? "Normal + Exponencial" : model === "normal" ? "Distribución normal" : "Distribución exponencial"}</strong>
            <p>{model === "mixto" ? "Norte y Este: normal · Centro y Sur: exponencial" : "La misma distribución se aplica a las cuatro zonas."}</p>
          </div>
        </aside>
      </section>

      <section className="zones-section">
        <div className="zones-title"><div><p className="panel-kicker">DETALLE POR ZONA</p><h3>Lecturas a las {HOURS[currentHour]}</h3></div><p>Los minigráficos muestran la historia revelada hasta la hora seleccionada.</p></div>
        <div className="zone-grid">
          {currentReadings.map(({ zone, value }) => {
            const state = quality(value);
            const dayMax = Math.max(...simulation[zone.name]);
            return (
              <article className="zone-card" key={zone.name} style={{ "--zone-color": zone.color, "--zone-soft": zone.soft } as React.CSSProperties}>
                <div className="zone-head"><div><i /><strong>{zone.name}</strong></div><span style={{ color: state.color, background: state.background }}>{state.label}</span></div>
                <div className="zone-reading"><strong>{value}</strong><span>ICA</span></div>
                <div className="mini-chart"><Line data={{ labels: visibleHours, datasets: [{ data: simulation[zone.name].slice(0, currentHour + 1), borderColor: zone.color, backgroundColor: `${zone.color}18`, fill: true }] }} options={miniOptions} /></div>
                <div className="zone-foot"><span>Pico diario</span><strong>{dayMax} ICA</strong></div>
              </article>
            );
          })}
        </div>
      </section>

      <footer>
        <p><strong>Aire Urbano</strong> · Simulación académica del Índice de Calidad del Aire</p>
        <p>24 observaciones por zona · 96 datos totales · Valores simulados, no aptos para decisiones sanitarias</p>
      </footer>
    </main>
  );
}
