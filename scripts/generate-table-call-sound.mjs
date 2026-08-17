import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sampleRate = 22050;
const duration = 0.42;
const freq1 = 784; // G5
const freq2 = 988; // B5

function writeWav(samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i += 1) {
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, samples[i])), 44 + i * 2);
  }

  return buffer;
}

const totalSamples = Math.floor(sampleRate * duration);
const split = Math.floor(totalSamples * 0.42);
const samples = new Array(totalSamples);

for (let i = 0; i < totalSamples; i += 1) {
  const attack = Math.min(1, i / 180);
  const release = Math.max(0, 1 - (i - totalSamples + 900) / 900);
  const env = attack * release;
  const freq = i < split ? freq1 : freq2;
  const t = i / sampleRate;
  samples[i] = Math.sin(2 * Math.PI * freq * t) * env * 26000;
}

const outDir = path.join(__dirname, '..', 'public', 'sounds');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'table-call.wav'), writeWav(samples));
console.log('Created public/sounds/table-call.wav');
