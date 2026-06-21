/**
 * Generates minimal offline horror audio samples for Media Studio.
 * Run: node scripts/generateHorrorAudio.js
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'media', 'horror', 'audio');
const SR = 22050;

function wavBuffer(samples) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(SR, 24);
  buffer.writeUInt32LE(SR * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.floor(clamped * 32767), 44 + i * 2);
  }
  return buffer;
}

function noise(duration, amp = 0.3) {
  const n = Math.floor(SR * duration);
  return Array.from({ length: n }, () => (Math.random() * 2 - 1) * amp);
}

function mix(...tracks) {
  const len = Math.max(...tracks.map((t) => t.length));
  const out = new Array(len).fill(0);
  tracks.forEach((t) => t.forEach((v, i) => { out[i] += v; }));
  return out.map((v) => Math.max(-1, Math.min(1, v)));
}

function fade(samples, inSec = 0.05, outSec = 0.15) {
  const inN = Math.floor(inSec * SR);
  const outN = Math.floor(outSec * SR);
  return samples.map((v, i) => {
    let g = 1;
    if (i < inN) g = i / inN;
    if (i > samples.length - outN) g = (samples.length - i) / outN;
    return v * g;
  });
}

function tone(freq, duration, amp = 0.25) {
  const n = Math.floor(SR * duration);
  return Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * freq * i) / SR) * amp);
}

function childLaughter() {
  const notes = [880, 988, 1175, 988, 880, 1047];
  let out = [];
  notes.forEach((f, i) => {
    out = out.concat(fade(tone(f, 0.12, 0.18), 0.01, 0.04));
    out = out.concat(new Array(Math.floor(SR * 0.04)).fill(0));
  });
  return fade(out, 0.02, 0.2);
}

function whispering() {
  const n = Math.floor(SR * 2.4);
  const base = noise(2.4, 0.12);
  return fade(
    base.map((v, i) => {
      const wobble = Math.sin(i / 120) * 0.5 + 0.5;
      return v * wobble * (0.4 + Math.sin(i / 400) * 0.3);
    }),
    0.3,
    0.4
  );
}

function windGusts() {
  const n = Math.floor(SR * 2.8);
  return fade(
    Array.from({ length: n }, (_, i) => {
      const gust = (Math.sin(i / 900) + Math.sin(i / 230)) * 0.5 + 0.5;
      return (Math.random() * 2 - 1) * 0.22 * gust;
    }),
    0.4,
    0.5
  );
}

function footsteps() {
  let out = [];
  for (let step = 0; step < 6; step++) {
    const thump = fade(
      Array.from({ length: Math.floor(SR * 0.08) }, (_, i) => {
        const t = i / SR;
        return Math.sin(2 * Math.PI * 80 * t) * Math.exp(-t * 35) * 0.55;
      }),
      0.001,
      0.03
    );
    out = out.concat(thump);
    out = out.concat(new Array(Math.floor(SR * (0.38 + Math.random() * 0.12))).fill(0));
  }
  return out;
}

function musicBox() {
  const melody = [523, 659, 784, 659, 523, 440, 523];
  let out = [];
  melody.forEach((f) => {
    const t = tone(f, 0.35, 0.14);
    const harm = tone(f * 2, 0.35, 0.04);
    out = out.concat(fade(mix(t, harm), 0.01, 0.08));
    out = out.concat(new Array(Math.floor(SR * 0.05)).fill(0));
  });
  return fade(out, 0.02, 0.25);
}

function radioStatic() {
  const n = Math.floor(SR * 2.2);
  return fade(
    Array.from({ length: n }, (_, i) => {
      const crackle = Math.random() > 0.92 ? (Math.random() * 2 - 1) * 0.9 : (Math.random() * 2 - 1) * 0.35;
      const hum = Math.sin((2 * Math.PI * 60 * i) / SR) * 0.08;
      return crackle + hum;
    }),
    0.05,
    0.2
  );
}

function swingCreak() {
  let out = [];
  for (let i = 0; i < 4; i++) {
    const creak = fade(
      Array.from({ length: Math.floor(SR * 0.6) }, (_, j) => {
        const f = 180 + Math.sin(j / 200) * 90;
        return Math.sin((2 * Math.PI * f * j) / SR) * 0.12 * (1 - j / (SR * 0.6));
      }),
      0.05,
      0.15
    );
    out = out.concat(creak);
    out = out.concat(new Array(Math.floor(SR * 0.5)).fill(0));
  }
  return out;
}

const files = {
  'child-laughter.wav': childLaughter(),
  'whispering-voices.wav': whispering(),
  'wind-gusts.wav': windGusts(),
  'footsteps.wav': footsteps(),
  'music-box.wav': musicBox(),
  'radio-static.wav': radioStatic(),
  'swing-creak.wav': swingCreak(),
};

mkdirSync(OUT, { recursive: true });
Object.entries(files).forEach(([name, samples]) => {
  writeFileSync(join(OUT, name), wavBuffer(samples));
  console.log('Wrote', name);
});
