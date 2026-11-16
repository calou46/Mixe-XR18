import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChannelEQ, MeterLevel } from '../types/xr18';
import { HardwareKnob } from './HardwareKnob';
import { Power, Activity, Sliders, Eye, EyeOff, Sparkles } from 'lucide-react';

interface RTAEqualizerViewProps {
  eq: ChannelEQ;
  meter: MeterLevel;
  channelId: number;
  channelName: string;
  isMicActive?: boolean;
  onUpdateEQ: (updated: Partial<ChannelEQ>) => void;
}

// 48 Logarithmic RTA Bands from 20 Hz to 20,000 Hz
const RTA_BAND_COUNT = 48;
const MIN_FREQ = 20;
const MAX_FREQ = 20000;

// Log frequency mapping helper
function freqToX(freq: number, width: number): number {
  const minLog = Math.log10(MIN_FREQ);
  const maxLog = Math.log10(MAX_FREQ);
  const fLog = Math.log10(Math.max(MIN_FREQ, Math.min(MAX_FREQ, freq)));
  return ((fLog - minLog) / (maxLog - minLog)) * width;
}

function xToFreq(x: number, width: number): number {
  const minLog = Math.log10(MIN_FREQ);
  const maxLog = Math.log10(MAX_FREQ);
  const ratio = Math.max(0, Math.min(1, x / width));
  const fLog = minLog + ratio * (maxLog - minLog);
  return Math.round(Math.pow(10, fLog));
}

// Convert dB to Y coordinate (-18dB to +18dB)
function dbToY(db: number, height: number): number {
  const minDb = -18;
  const maxDb = 18;
  const norm = (db - minDb) / (maxDb - minDb);
  return height - norm * height;
}

function yToDb(y: number, height: number): number {
  const minDb = -18;
  const maxDb = 18;
  const norm = 1 - Math.max(0, Math.min(1, y / height));
  return Math.round((minDb + norm * (maxDb - minDb)) * 10) / 10;
}

/**
 * Maps amplitude level in dBFS (-60 to +6) to a vibrant heat-map color
 */
export function getRtaColor(db: number): { fill: string; stroke: string; glow: string } {
  if (db < -48) {
    // Deep Violet / Indigo
    return { fill: 'rgba(99, 102, 241, 0.45)', stroke: '#6366f1', glow: 'rgba(99, 102, 241, 0.6)' };
  } else if (db < -36) {
    // Cyan
    return { fill: 'rgba(6, 182, 212, 0.55)', stroke: '#06b6d4', glow: 'rgba(6, 182, 212, 0.7)' };
  } else if (db < -24) {
    // Emerald Green
    return { fill: 'rgba(16, 185, 129, 0.65)', stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.75)' };
  } else if (db < -12) {
    // Lime / Yellow
    return { fill: 'rgba(234, 179, 8, 0.75)', stroke: '#eab308', glow: 'rgba(234, 179, 8, 0.85)' };
  } else if (db < -3) {
    // Warm Amber to Orange
    return { fill: 'rgba(249, 115, 22, 0.85)', stroke: '#f97316', glow: 'rgba(249, 115, 22, 0.9)' };
  } else {
    // Crimson Peak / Clip (> -3 dB)
    return { fill: 'rgba(239, 68, 68, 0.95)', stroke: '#ef4444', glow: 'rgba(239, 68, 68, 1.0)' };
  }
}

export const RTAEqualizerView: React.FC<RTAEqualizerViewProps> = ({
  eq,
  meter,
  channelId,
  channelName,
  isMicActive,
  onUpdateEQ,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [rtaMode, setRtaMode] = useState<'bars' | 'gradient' | 'line'>('gradient');
  const [rtaEnabled, setRtaEnabled] = useState<boolean>(true);

  // Persistent simulated RTA frequency bins state
  const rtaLevelsRef = useRef<number[]>(new Array(RTA_BAND_COUNT).fill(-60));
  const rtaPeakHoldRef = useRef<number[]>(new Array(RTA_BAND_COUNT).fill(-60));
  const peakHoldTimeRef = useRef<number[]>(new Array(RTA_BAND_COUNT).fill(0));

  // Compute composite EQ gain at frequency f
  const computeEqGainAtFreq = useCallback(
    (f: number): number => {
      if (!eq.enabled) return 0;
      let totalGain = 0;

      // Low Cut (HPF 18dB/oct)
      if (eq.lowCutOn && f < eq.lowCutFreq) {
        const ratio = f / eq.lowCutFreq;
        totalGain += Math.log2(Math.max(0.01, ratio)) * 18;
      }

      // Band 1: Low (Low-shelf or PEQ)
      if (eq.low.type === 'lowshelf') {
        if (f < eq.low.freq) {
          totalGain += eq.low.gain;
        } else if (f < eq.low.freq * 2) {
          const t = (f - eq.low.freq) / eq.low.freq;
          totalGain += eq.low.gain * (1 - t * t);
        }
      } else {
        // Bell PEQ
        const w = Math.log2(f / eq.low.freq) * (eq.low.q || 1.2);
        totalGain += eq.low.gain / (1 + w * w * 4);
      }

      // Band 2: Low-Mid (Bell PEQ)
      const w2 = Math.log2(f / eq.lowMid.freq) * (eq.lowMid.q || 1.5);
      totalGain += eq.lowMid.gain / (1 + w2 * w2 * 4);

      // Band 3: High-Mid (Bell PEQ)
      const w3 = Math.log2(f / eq.highMid.freq) * (eq.highMid.q || 1.5);
      totalGain += eq.highMid.gain / (1 + w3 * w3 * 4);

      // Band 4: High (High-shelf or PEQ)
      if (eq.high.type === 'highshelf') {
        if (f > eq.high.freq) {
          totalGain += eq.high.gain;
        } else if (f > eq.high.freq / 2) {
          const t = (eq.high.freq - f) / (eq.high.freq / 2);
          totalGain += eq.high.gain * (1 - t * t);
        }
      } else {
        const w4 = Math.log2(f / eq.high.freq) * (eq.high.q || 1.2);
        totalGain += eq.high.gain / (1 + w4 * w4 * 4);
      }

      return Math.max(-24, Math.min(24, totalGain));
    },
    [eq]
  );

  // RTA Animation & Rendering Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const draw = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Clear with dark studio obsidian backdrop
      ctx.fillStyle = '#0c0d10';
      ctx.fillRect(0, 0, width, height);

      // 1. Draw Grid Lines
      // Frequency vertical lines: 50, 100, 200, 500, 1k, 2k, 5k, 10k
      const gridFreqs = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
      ctx.lineWidth = 1;
      gridFreqs.forEach((freq) => {
        const x = freqToX(freq, width);
        ctx.strokeStyle = freq === 1000 || freq === 100 ? '#262830' : '#1a1b22';
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        // Frequency Label
        ctx.fillStyle = '#525565';
        ctx.font = '9px JetBrains Mono, monospace';
        const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
        ctx.fillText(label, x + 3, height - 6);
      });

      // Amplitude horizontal lines: -15, -10, -5, 0, +5, +10, +15 dB
      const gridDbs = [-15, -10, -5, 0, 5, 10, 15];
      gridDbs.forEach((db) => {
        const y = dbToY(db, height);
        ctx.strokeStyle = db === 0 ? '#383a48' : '#1a1b22';
        ctx.setLineDash(db === 0 ? [] : [3, 4]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // dB label
        ctx.fillStyle = db === 0 ? '#8e92a8' : '#454859';
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.fillText(`${db > 0 ? '+' : ''}${db}dB`, 4, y - 3);
      });

      // 2. Real-Time Analyzer (RTA) Background Bars / Gradient
      if (rtaEnabled) {
        const overallEnergy = meter.peak; // -60 to +6 dB
        const barWidth = width / RTA_BAND_COUNT;

        for (let i = 0; i < RTA_BAND_COUNT; i++) {
          const ratio = (i + 0.5) / RTA_BAND_COUNT;
          const bandFreq = MIN_FREQ * Math.pow(MAX_FREQ / MIN_FREQ, ratio);

          // Realistic instrument frequency profile simulation
          let targetEnergy = -60;
          if (overallEnergy > -55) {
            let formant = -50;
            // Channel-specific acoustic profile
            if (channelId === 1) {
              // Kick: heavy 60Hz energy, click at 3.5kHz
              formant = Math.exp(-Math.pow(Math.log2(bandFreq / 65) / 0.8, 2)) * 42 +
                        Math.exp(-Math.pow(Math.log2(bandFreq / 3500) / 0.9, 2)) * 26;
            } else if (channelId === 2) {
              // Snare: body at 200Hz, crack at 4kHz, rattle at 8kHz
              formant = Math.exp(-Math.pow(Math.log2(bandFreq / 220) / 0.9, 2)) * 38 +
                        Math.exp(-Math.pow(Math.log2(bandFreq / 4200) / 1.1, 2)) * 34 +
                        Math.exp(-Math.pow(Math.log2(bandFreq / 8000) / 1.2, 2)) * 24;
            } else if (channelId === 8) {
              // Bass DI: fat sub 80Hz, growl 800Hz
              formant = Math.exp(-Math.pow(Math.log2(bandFreq / 90) / 0.8, 2)) * 44 +
                        Math.exp(-Math.pow(Math.log2(bandFreq / 750) / 1.2, 2)) * 28;
            } else if (channelId === 14) {
              // Vocal: warmth 250Hz, clarity 2.5kHz-4kHz, air 12kHz
              formant = Math.exp(-Math.pow(Math.log2(bandFreq / 280) / 1.0, 2)) * 34 +
                        Math.exp(-Math.pow(Math.log2(bandFreq / 3200) / 1.1, 2)) * 42 +
                        Math.exp(-Math.pow(Math.log2(bandFreq / 12000) / 1.3, 2)) * 20;
            } else {
              // General musical band shape
              formant = Math.exp(-Math.pow(Math.log2(bandFreq / 600) / 2.2, 2)) * 36;
            }

            // Fluctuation
            const noise = (Math.sin(now * 0.01 + i * 0.4) + Math.cos(now * 0.02 + i * 0.8)) * 3;
            targetEnergy = overallEnergy - (40 - formant) + noise;
            targetEnergy = Math.max(-60, Math.min(6, targetEnergy));
          }

          // Apply current EQ curve boost/cut to RTA display
          const eqDelta = computeEqGainAtFreq(bandFreq);
          targetEnergy += eqDelta;

          // Smooth decay
          const prev = rtaLevelsRef.current[i];
          const smoothed = prev * 0.72 + targetEnergy * 0.28;
          rtaLevelsRef.current[i] = smoothed;

          // Peak hold logic
          let hold = rtaPeakHoldRef.current[i];
          if (smoothed > hold) {
            hold = smoothed;
            peakHoldTimeRef.current[i] = now + 900;
          } else if (now > peakHoldTimeRef.current[i]) {
            hold = Math.max(-60, hold - 28 * dt);
          }
          rtaPeakHoldRef.current[i] = hold;

          // Compute Bar Coordinates
          const x = i * barWidth;
          // Map -60dB to bottom, 0dB to 75% height, +6dB to top
          const normAmp = Math.max(0, Math.min(1, (smoothed + 60) / 66));
          const barHeight = normAmp * (height - 20);
          const y = height - barHeight;

          // Color coded heat-map depending on frequency level!
          const colorObj = getRtaColor(smoothed);

          if (rtaMode === 'bars') {
            // Distinct spectrum analyzer columns with vertical gradient
            const grad = ctx.createLinearGradient(0, height, 0, y);
            grad.addColorStop(0, 'rgba(15, 23, 42, 0.4)');
            grad.addColorStop(0.5, colorObj.fill);
            grad.addColorStop(1, colorObj.stroke);

            ctx.fillStyle = grad;
            ctx.fillRect(x + 1, y, barWidth - 2, barHeight);

            // Peak hold cap
            const holdNorm = Math.max(0, Math.min(1, (hold + 60) / 66));
            const holdY = height - holdNorm * (height - 20);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + 1, holdY, barWidth - 2, 2);
          } else if (rtaMode === 'gradient') {
            // Fluid continuous spectrum heatmap with neon glow
            const grad = ctx.createLinearGradient(0, height, 0, y);
            grad.addColorStop(0, 'rgba(12, 14, 20, 0.2)');
            grad.addColorStop(0.4, colorObj.fill);
            grad.addColorStop(1, colorObj.stroke);

            ctx.fillStyle = grad;
            ctx.fillRect(x, y, barWidth + 0.5, barHeight);

            // Subtle neon highlight line at the top of the spectrum
            ctx.strokeStyle = colorObj.stroke;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + barWidth, y);
            ctx.stroke();
          }
        }
      }

      // 3. Draw 4-Band Parametric EQ Composite Transfer Curve
      ctx.lineWidth = 3;
      ctx.strokeStyle = eq.enabled ? '#10b981' : '#525565';
      ctx.shadowColor = eq.enabled ? 'rgba(16, 185, 129, 0.5)' : 'transparent';
      ctx.shadowBlur = 8;
      ctx.beginPath();

      const stepPx = 3;
      for (let px = 0; px <= width; px += stepPx) {
        const freq = xToFreq(px, width);
        const gain = computeEqGainAtFreq(freq);
        const py = dbToY(gain, height);
        if (px === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // reset shadow

      // 4. Draw Interactive EQ Handles / Nodes
      // Low Cut Node
      if (eq.lowCutOn) {
        const lcx = freqToX(eq.lowCutFreq, width);
        const lcy = dbToY(-3, height);
        drawNode(ctx, lcx, lcy, '#f59e0b', 'HPF', activeNode === 'lowcut');
      }

      // Band 1 (Low) Node
      const b1x = freqToX(eq.low.freq, width);
      const b1y = dbToY(eq.low.gain, height);
      drawNode(ctx, b1x, b1y, '#eab308', '1', activeNode === 'low');

      // Band 2 (Low Mid) Node
      const b2x = freqToX(eq.lowMid.freq, width);
      const b2y = dbToY(eq.lowMid.gain, height);
      drawNode(ctx, b2x, b2y, '#14b8a6', '2', activeNode === 'lowMid');

      // Band 3 (High Mid) Node
      const b3x = freqToX(eq.highMid.freq, width);
      const b3y = dbToY(eq.highMid.gain, height);
      drawNode(ctx, b3x, b3y, '#0ea5e9', '3', activeNode === 'highMid');

      // Band 4 (High) Node
      const b4x = freqToX(eq.high.freq, width);
      const b4y = dbToY(eq.high.gain, height);
      drawNode(ctx, b4x, b4y, '#a855f7', '4', activeNode === 'high');

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [eq, meter, rtaEnabled, rtaMode, activeNode, channelId, computeEqGainAtFreq]);

  // Node drawing helper
  const drawNode = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    label: string,
    isActive: boolean
  ) => {
    ctx.save();
    // Outer glow ring
    ctx.beginPath();
    ctx.arc(x, y, isActive ? 12 : 9, 0, Math.PI * 2);
    ctx.fillStyle = isActive ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.6)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();

    // Center dot with label
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, isActive ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();

    // Label tag
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y - 14);
    ctx.restore();
  };

  // Canvas Mouse Dragging interaction on EQ Nodes
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = canvas.width;
    const height = canvas.height;

    // Hit-testing nodes
    const dist = (nx: number, ny: number) => Math.hypot(x - nx, y - ny);

    if (eq.lowCutOn && dist(freqToX(eq.lowCutFreq, width), dbToY(-3, height)) < 18) {
      setActiveNode('lowcut');
    } else if (dist(freqToX(eq.low.freq, width), dbToY(eq.low.gain, height)) < 18) {
      setActiveNode('low');
    } else if (dist(freqToX(eq.lowMid.freq, width), dbToY(eq.lowMid.gain, height)) < 18) {
      setActiveNode('lowMid');
    } else if (dist(freqToX(eq.highMid.freq, width), dbToY(eq.highMid.gain, height)) < 18) {
      setActiveNode('highMid');
    } else if (dist(freqToX(eq.high.freq, width), dbToY(eq.high.gain, height)) < 18) {
      setActiveNode('high');
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeNode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(canvas.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(canvas.height, e.clientY - rect.top));

    const freq = xToFreq(x, canvas.width);
    const gain = yToDb(y, canvas.height);

    if (activeNode === 'lowcut') {
      onUpdateEQ({ lowCutFreq: Math.max(20, Math.min(400, freq)) });
    } else if (activeNode === 'low') {
      onUpdateEQ({
        low: {
          ...eq.low,
          freq: Math.max(20, Math.min(1000, freq)),
          gain: Math.max(-15, Math.min(15, gain)),
        },
      });
    } else if (activeNode === 'lowMid') {
      onUpdateEQ({
        lowMid: {
          ...eq.lowMid,
          freq: Math.max(100, Math.min(4000, freq)),
          gain: Math.max(-15, Math.min(15, gain)),
        },
      });
    } else if (activeNode === 'highMid') {
      onUpdateEQ({
        highMid: {
          ...eq.highMid,
          freq: Math.max(500, Math.min(10000, freq)),
          gain: Math.max(-15, Math.min(15, gain)),
        },
      });
    } else if (activeNode === 'high') {
      onUpdateEQ({
        high: {
          ...eq.high,
          freq: Math.max(2000, Math.min(20000, freq)),
          gain: Math.max(-15, Math.min(15, gain)),
        },
      });
    }
  };

  const handlePointerUp = () => {
    setActiveNode(null);
  };

  return (
    <div className="space-y-4 select-none">
      {/* Top Controls Bar: RTA Mode and EQ Master In/Out */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#14171b] rounded border border-[#2b3038]">
        <div className="flex flex-wrap items-center gap-2">
          {/* EQ Bypass toggle */}
          <button
            onClick={() => onUpdateEQ({ enabled: !eq.enabled })}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-mono font-bold flex items-center gap-1.5 ${
              eq.enabled ? 'ui-btn-green' : 'ui-btn-red'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{eq.enabled ? 'EQ ACTIF (IN)' : 'EQ BYPASS (OUT)'}</span>
          </button>

          {/* RTA Active Toggle */}
          <button
            onClick={() => setRtaEnabled(!rtaEnabled)}
            className={`px-3 py-1.5 rounded-[4px] text-xs font-mono font-bold flex items-center gap-1.5 ${
              rtaEnabled ? 'ui-btn-cyan' : 'ui-btn'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>RTA {rtaEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* RTA Style Selector */}
          {rtaEnabled && (
            <div className="flex items-center gap-1 p-0.5 bg-[#0e1013] rounded-[4px] border border-[#2b3038] text-[10px] font-mono">
              <button
                onClick={() => setRtaMode('gradient')}
                className={`px-2 py-1 rounded-[3px] font-bold ${
                  rtaMode === 'gradient' ? 'ui-btn-amber' : 'ui-btn'
                }`}
              >
                Spectre Dégradé
              </button>
              <button
                onClick={() => setRtaMode('bars')}
                className={`px-2 py-1 rounded-[3px] font-bold ${
                  rtaMode === 'bars' ? 'ui-btn-amber' : 'ui-btn'
                }`}
              >
                Colonnes / Barres
              </button>
            </div>
          )}
        </div>

        {/* Heat-map Color Scale Legend */}
        <div className="hidden sm:flex items-center gap-2 text-[9px] font-mono text-slate-400">
          <span>Échelle RTA :</span>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#4338ca]" title="<-48 dB" />
            <span className="w-2.5 h-2.5 rounded-xs bg-[#06b6d4]" title="-36 dB" />
            <span className="w-2.5 h-2.5 rounded-xs bg-[#10b981]" title="-24 dB" />
            <span className="w-2.5 h-2.5 rounded-xs bg-[#eab308]" title="-12 dB" />
            <span className="w-2.5 h-2.5 rounded-xs bg-[#f97316]" title="-3 dB" />
            <span className="w-2.5 h-2.5 rounded-xs bg-[#ef4444]" title="0 dB+ Peak" />
          </div>
          <span className="text-slate-500">-60 à +6 dBFS</span>
        </div>
      </div>

      {/* RTA & EQ Interactive Curve Canvas */}
      <div className="relative rounded-lg overflow-hidden border border-[#2b3038] shadow-2xl bg-[#0c0d10]">
        <canvas
          ref={canvasRef}
          width={800}
          height={260}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-64 cursor-crosshair block"
        />

        {/* Help Tip Overlay */}
        <div className="ui-lcd absolute top-2 right-3 pointer-events-none text-[9px] font-mono text-slate-400 px-2 py-0.5 rounded">
          Glisser les nœuds 1, 2, 3, 4 ou HPF pour ajuster Fréq / Gain
        </div>
      </div>

      {/* Hardware Rotary Faceplate (4 Bands + Low Cut) */}
      <div className="p-4 rounded-lg bg-[#181b20] border border-[#2c313a] shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#2b3038]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-600 border border-slate-500 shadow-inner" />
            <span className="text-[11px] font-mono font-extrabold text-slate-300 tracking-wider">
              XR-PEQ 4-BAND MASTER PARAMETRIC EQUALIZER
            </span>
          </div>
          <div className="w-2 h-2 rounded-full bg-slate-600 border border-slate-500 shadow-inner" />
        </div>

        {/* 5 Hardware Sections (Low-Cut, Low, Low-Mid, High-Mid, High) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Low Cut (Coupe-Bas) */}
          <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col items-center justify-between space-y-2">
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-mono font-bold text-amber-400">LOW CUT</span>
              <button
                onClick={() => onUpdateEQ({ lowCutOn: !eq.lowCutOn })}
                className={`w-3.5 h-3.5 rounded-full border transition-colors ${
                  eq.lowCutOn ? 'bg-amber-500 border-amber-300 shadow-xs shadow-amber-500' : 'bg-neutral-800 border-neutral-700'
                }`}
                title="Activer le filtre coupe-bas"
              />
            </div>
            <HardwareKnob
              label="Fréquence"
              value={eq.lowCutFreq}
              min={20}
              max={400}
              step={5}
              unit="Hz"
              color="amber"
              defaultValue={80}
              onChange={(val) => onUpdateEQ({ lowCutFreq: val })}
            />
            <span className="text-[9px] font-mono text-neutral-500">Pente 18dB/oct</span>
          </div>

          {/* Band 1: Low */}
          <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col items-center justify-between space-y-2">
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-mono font-bold text-yellow-400">BAND 1 · LOW</span>
              <button
                onClick={() =>
                  onUpdateEQ({
                    low: {
                      ...eq.low,
                      type: eq.low.type === 'lowshelf' ? 'peq' : 'lowshelf',
                    },
                  })
                }
                className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-yellow-300 hover:bg-neutral-700"
              >
                {eq.low.type === 'lowshelf' ? 'SHELF' : 'BELL'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <HardwareKnob
                label="Gain"
                value={eq.low.gain}
                min={-15}
                max={15}
                step={0.5}
                unit="dB"
                color="yellow"
                defaultValue={0}
                formatValue={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}dB`}
                onChange={(val) => onUpdateEQ({ low: { ...eq.low, gain: val } })}
              />
              <HardwareKnob
                label="Fréq"
                value={eq.low.freq}
                min={20}
                max={1000}
                step={10}
                unit="Hz"
                color="yellow"
                defaultValue={100}
                onChange={(val) => onUpdateEQ({ low: { ...eq.low, freq: val } })}
              />
            </div>
            <HardwareKnob
              label="Largeur Q"
              value={eq.low.q || 1.2}
              min={0.3}
              max={8}
              step={0.1}
              color="yellow"
              size="sm"
              defaultValue={1.2}
              onChange={(val) => onUpdateEQ({ low: { ...eq.low, q: val } })}
            />
          </div>

          {/* Band 2: Low-Mid */}
          <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col items-center justify-between space-y-2">
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-mono font-bold text-teal-400">BAND 2 · LOW-MID</span>
              <span className="text-[8px] font-mono text-neutral-500">BELL PEQ</span>
            </div>
            <div className="flex items-center gap-2">
              <HardwareKnob
                label="Gain"
                value={eq.lowMid.gain}
                min={-15}
                max={15}
                step={0.5}
                unit="dB"
                color="emerald"
                defaultValue={0}
                formatValue={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}dB`}
                onChange={(val) => onUpdateEQ({ lowMid: { ...eq.lowMid, gain: val } })}
              />
              <HardwareKnob
                label="Fréq"
                value={eq.lowMid.freq}
                min={100}
                max={4000}
                step={20}
                unit="Hz"
                color="emerald"
                defaultValue={800}
                onChange={(val) => onUpdateEQ({ lowMid: { ...eq.lowMid, freq: val } })}
              />
            </div>
            <HardwareKnob
              label="Largeur Q"
              value={eq.lowMid.q || 1.5}
              min={0.3}
              max={8}
              step={0.1}
              color="emerald"
              size="sm"
              defaultValue={1.5}
              onChange={(val) => onUpdateEQ({ lowMid: { ...eq.lowMid, q: val } })}
            />
          </div>

          {/* Band 3: High-Mid */}
          <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col items-center justify-between space-y-2">
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-mono font-bold text-sky-400">BAND 3 · HIGH-MID</span>
              <span className="text-[8px] font-mono text-neutral-500">BELL PEQ</span>
            </div>
            <div className="flex items-center gap-2">
              <HardwareKnob
                label="Gain"
                value={eq.highMid.gain}
                min={-15}
                max={15}
                step={0.5}
                unit="dB"
                color="sky"
                defaultValue={0}
                formatValue={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}dB`}
                onChange={(val) => onUpdateEQ({ highMid: { ...eq.highMid, gain: val } })}
              />
              <HardwareKnob
                label="Fréq"
                value={eq.highMid.freq}
                min={500}
                max={10000}
                step={50}
                unit="Hz"
                color="sky"
                defaultValue={3000}
                onChange={(val) => onUpdateEQ({ highMid: { ...eq.highMid, freq: val } })}
              />
            </div>
            <HardwareKnob
              label="Largeur Q"
              value={eq.highMid.q || 1.5}
              min={0.3}
              max={8}
              step={0.1}
              color="sky"
              size="sm"
              defaultValue={1.5}
              onChange={(val) => onUpdateEQ({ highMid: { ...eq.highMid, q: val } })}
            />
          </div>

          {/* Band 4: High */}
          <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col items-center justify-between space-y-2">
            <div className="flex items-center justify-between w-full">
              <span className="text-[10px] font-mono font-bold text-purple-400">BAND 4 · HIGH</span>
              <button
                onClick={() =>
                  onUpdateEQ({
                    high: {
                      ...eq.high,
                      type: eq.high.type === 'highshelf' ? 'peq' : 'highshelf',
                    },
                  })
                }
                className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-purple-300 hover:bg-neutral-700"
              >
                {eq.high.type === 'highshelf' ? 'SHELF' : 'BELL'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <HardwareKnob
                label="Gain"
                value={eq.high.gain}
                min={-15}
                max={15}
                step={0.5}
                unit="dB"
                color="purple"
                defaultValue={0}
                formatValue={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}dB`}
                onChange={(val) => onUpdateEQ({ high: { ...eq.high, gain: val } })}
              />
              <HardwareKnob
                label="Fréq"
                value={eq.high.freq}
                min={2000}
                max={20000}
                step={100}
                unit="Hz"
                color="purple"
                defaultValue={10000}
                onChange={(val) => onUpdateEQ({ high: { ...eq.high, freq: val } })}
              />
            </div>
            <HardwareKnob
              label="Largeur Q"
              value={eq.high.q || 1.2}
              min={0.3}
              max={8}
              step={0.1}
              color="purple"
              size="sm"
              defaultValue={1.2}
              onChange={(val) => onUpdateEQ({ high: { ...eq.high, q: val } })}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
