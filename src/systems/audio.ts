// Bips WebAudio maison (plan 07, étape 5). L'AudioContext est créé au
// premier clic ou appui de touche (politique des navigateurs).

import { state } from '../core/state';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function initAudio(): void {
  const creer = () => {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.connect(ctx.destination);
    }
    void ctx.resume();
  };
  window.addEventListener('pointerdown', creer);
  window.addEventListener('keydown', creer);
}

function bip(freq: number, duree: number, type: OscillatorType = 'square', delai = 0, vol = 0.2): void {
  if (!ctx || !master) return;
  master.gain.value = state.save.volume;
  const t = ctx.currentTime + delai;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duree);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t);
  osc.stop(t + duree);
}

export const sons = {
  ramassage: () => bip(620 + Math.random() * 160, 0.07),
  achat: () => {
    bip(440, 0.06);
    bip(660, 0.08, 'square', 0.06);
  },
  refus: () => bip(150, 0.12, 'sawtooth'),
  rebirb: () => [392, 494, 587, 784].forEach((f, i) => bip(f, 0.14, 'square', i * 0.09)),
  coup: () => bip(240 + Math.random() * 60, 0.05, 'sawtooth', 0, 0.15),
  degat: () => bip(110, 0.12, 'sawtooth', 0, 0.25),
  mortMonstre: () => {
    bip(330, 0.07, 'square');
    bip(220, 0.1, 'square', 0.06);
  },
  niveau: () => [523, 659, 784, 1047].forEach((f, i) => bip(f, 0.12, 'square', i * 0.07)),
  touche: () => {
    bip(880, 0.08);
    bip(880, 0.08, 'square', 0.12);
  },
  boss: () => [98, 82, 65, 98].forEach((f, i) => bip(f, 0.3, 'sawtooth', i * 0.18, 0.3)),
  // l'archimonstre s'annonce à l'oreille avant l'œil (plan 14 §3)
  archi: () => [880, 1109, 880, 1319].forEach((f, i) => bip(f, 0.09, 'triangle', i * 0.08)),
  // bandeau doré des succès (plan 16 §1)
  succes: () => [659, 784, 988, 1319].forEach((f, i) => bip(f, 0.11, 'triangle', i * 0.06)),
  // sons de pêche v2 (plan 17) : plic (mordille) ≠ plouf grave (plongeon)
  // ≠ vibration aiguë (tremblement de la lutte)
  plic: () => bip(980 + Math.random() * 120, 0.05, 'sine', 0, 0.12),
  plouf: () => {
    bip(160, 0.18, 'sine', 0, 0.3);
    bip(90, 0.22, 'sine', 0.05, 0.25);
  },
  tension: () => bip(1400, 0.07, 'sawtooth', 0, 0.08),
  casse: () => [400, 240, 130].forEach((f, i) => bip(f, 0.12, 'sawtooth', i * 0.06, 0.2)),
};
