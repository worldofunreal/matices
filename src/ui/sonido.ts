// Procedural sound effects using Web Audio API. Respects estado().opciones.efectos (0 to 5).
import { estado } from "../datos/guardado";

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) ctx = new AudioCtx();
  }
  if (ctx && ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

function volumenEfectos(): number {
  const nivel = estado().opciones?.efectos ?? 3;
  // 0 is mute, 1..5 scales from 0.08 to 0.45
  if (nivel <= 0) return 0;
  return 0.08 + (nivel - 1) * 0.09;
}

// Level 1: Warm 2-note chime (marimba style, e.g. C5 -> G5) on new active story mission or major step
export function sonarMision() {
  const c = getContext();
  const vol = volumenEfectos();
  if (!c || vol <= 0) return;

  const t0 = c.currentTime;
  const notas = [523.25, 783.99]; // C5, G5

  notas.forEach((freq, idx) => {
    const t = t0 + idx * 0.11;
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(vol * 0.9, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(gain);
    gain.connect(c.destination);

    osc.start(t);
    osc.stop(t + 0.3);
  });
}

// Level 2: Discrete soft bubble pop when approaching an optional nearby interaction (pet, mirror, bed)
export function sonarProximidad() {
  const c = getContext();
  const vol = volumenEfectos();
  if (!c || vol <= 0) return;

  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(380, t0);
  osc.frequency.exponentialRampToValueAtTime(620, t0 + 0.08);

  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.exponentialRampToValueAtTime(vol * 0.55, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);

  osc.connect(gain);
  gain.connect(c.destination);

  osc.start(t0);
  osc.stop(t0 + 0.1);
}

// Level 3: Soft subtle wooden click when inspecting an environmental object or advancing dialogue
export function sonarToque() {
  const c = getContext();
  const vol = volumenEfectos();
  if (!c || vol <= 0) return;

  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(240, t0);
  osc.frequency.exponentialRampToValueAtTime(120, t0 + 0.04);

  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.exponentialRampToValueAtTime(vol * 0.45, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.045);

  osc.connect(gain);
  gain.connect(c.destination);

  osc.start(t0);
  osc.stop(t0 + 0.05);
}

// Physical character action: Jump (springy rising pitch)
export function sonarSalto() {
  const c = getContext();
  const vol = volumenEfectos();
  if (!c || vol <= 0) return;

  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(180, t0);
  osc.frequency.exponentialRampToValueAtTime(360, t0 + 0.14);

  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.exponentialRampToValueAtTime(vol * 0.6, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);

  osc.connect(gain);
  gain.connect(c.destination);

  osc.start(t0);
  osc.stop(t0 + 0.18);
}

// Physical character action: Combo Step 1 - Quick Jab
export function sonarGolpe1() {
  const c = getContext();
  const vol = volumenEfectos();
  if (!c || vol <= 0) return;

  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(320, t0);
  osc.frequency.exponentialRampToValueAtTime(110, t0 + 0.08);

  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.exponentialRampToValueAtTime(vol * 0.7, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1);

  osc.connect(gain);
  gain.connect(c.destination);

  osc.start(t0);
  osc.stop(t0 + 0.11);
}

// Physical character action: Combo Step 2 - Heavy Cross
export function sonarGolpe2() {
  const c = getContext();
  const vol = volumenEfectos();
  if (!c || vol <= 0) return;

  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(260, t0);
  osc.frequency.exponentialRampToValueAtTime(70, t0 + 0.1);

  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.exponentialRampToValueAtTime(vol * 0.85, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.13);

  osc.connect(gain);
  gain.connect(c.destination);

  osc.start(t0);
  osc.stop(t0 + 0.14);
}

// Physical character action: Combo Step 3 - Finisher Kick with wind whoosh
export function sonarPatadaRemate() {
  const c = getContext();
  const vol = volumenEfectos();
  if (!c || vol <= 0) return;

  const t0 = c.currentTime;
  const osc1 = c.createOscillator();
  const osc2 = c.createOscillator();
  const gain = c.createGain();

  osc1.type = "sine";
  osc1.frequency.setValueAtTime(220, t0);
  osc1.frequency.exponentialRampToValueAtTime(45, t0 + 0.15);

  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(140, t0);
  osc2.frequency.exponentialRampToValueAtTime(35, t0 + 0.16);

  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.exponentialRampToValueAtTime(vol * 0.95, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(c.destination);

  osc1.start(t0);
  osc2.start(t0);
  osc1.stop(t0 + 0.19);
  osc2.stop(t0 + 0.19);
}

// Physical character action: Ground Pound / Jump Landing Impact
export function sonarImpactoCaida() {
  const c = getContext();
  const vol = volumenEfectos();
  if (!c || vol <= 0) return;

  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(150, t0);
  osc.frequency.exponentialRampToValueAtTime(38, t0 + 0.16);

  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.exponentialRampToValueAtTime(vol * 0.9, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);

  osc.connect(gain);
  gain.connect(c.destination);

  osc.start(t0);
  osc.stop(t0 + 0.22);
}

// Compatibility aliases
export const sonarGolpe = sonarGolpe1;
export const sonarPatada = sonarPatadaRemate;
