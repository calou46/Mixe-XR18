import React, { useState, useEffect, useRef } from 'react';
import { ChannelGate, ChannelComp, MeterLevel } from '../types/xr18';
import { HardwareKnob } from './HardwareKnob';
import { Power, Activity, Disc, Sparkles } from 'lucide-react';

interface HardwareDynamicsViewProps {
  gate: ChannelGate;
  comp: ChannelComp;
  meter: MeterLevel;
  channelId: number;
  channelName: string;
  onUpdateGate: (updated: Partial<ChannelGate>) => void;
  onUpdateComp: (updated: Partial<ChannelComp>) => void;
}

export const HardwareDynamicsView: React.FC<HardwareDynamicsViewProps> = ({
  gate,
  comp,
  meter,
  channelId,
  channelName,
  onUpdateGate,
  onUpdateComp,
}) => {
  // Compute simulated dynamic Gain Reduction (GR) in dB based on incoming signal vs threshold
  const [grDb, setGrDb] = useState<number>(0);
  const [gateStatus, setGateStatus] = useState<'open' | 'hold' | 'closed'>('open');

  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const updateDynamics = () => {
      const inputDb = meter.peak; // -60 to +6 dB

      // 1. Gate Logic
      if (!gate.enabled) {
        setGateStatus('open');
      } else {
        if (inputDb >= gate.threshold) {
          setGateStatus('open');
        } else if (inputDb >= gate.threshold - 6) {
          setGateStatus('hold');
        } else {
          setGateStatus('closed');
        }
      }

      // 2. Compressor Gain Reduction Logic
      if (!comp.enabled) {
        setGrDb(0);
      } else {
        const overThreshold = inputDb - comp.threshold;
        if (overThreshold > 0) {
          const ratio = comp.ratio || 4;
          // Compression formula: GR = overThreshold * (1 - 1/ratio)
          const reduction = overThreshold * (1 - 1 / ratio);
          // Makeup & mix scaling
          const mixFactor = (comp.mix !== undefined ? comp.mix : 100) / 100;
          setGrDb(Math.min(24, Math.max(0, reduction * mixFactor)));
        } else {
          setGrDb((prev) => Math.max(0, prev * 0.85)); // smooth release
        }
      }

      animRef.current = requestAnimationFrame(updateDynamics);
    };

    animRef.current = requestAnimationFrame(updateDynamics);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [meter, gate, comp]);

  return (
    <div className="space-y-5 select-none">
      {/* 1. NOISE GATE HARDWARE UNIT */}
      <div className="rounded-lg bg-[#181b20] border border-[#2c313a] shadow-2xl p-4 sm:p-5 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#2b3038] mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-600 border border-slate-500 shadow-inner" />
            <span className="text-xs font-mono font-extrabold text-amber-400 tracking-wider">
              XR-EXPANDER 18 · NOISE GATE
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Gate State Live LEDs */}
            <div className="ui-lcd flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-[10px] font-mono">
              <span className="text-slate-500 mr-1">GATE :</span>
              <span
                className={`px-1.5 py-0.5 rounded-[2px] font-bold transition-all ${
                  gateStatus === 'open'
                    ? 'bg-emerald-500 text-neutral-950 shadow-sm shadow-emerald-500/50'
                    : 'bg-[#171a1f] text-slate-600'
                }`}
              >
                OPEN
              </span>
              <span
                className={`px-1.5 py-0.5 rounded-[2px] font-bold transition-all ${
                  gateStatus === 'hold'
                    ? 'bg-amber-400 text-neutral-950 shadow-sm shadow-amber-400/50'
                    : 'bg-[#171a1f] text-slate-600'
                }`}
              >
                HOLD
              </span>
              <span
                className={`px-1.5 py-0.5 rounded-[2px] font-bold transition-all ${
                  gateStatus === 'closed'
                    ? 'bg-red-500 text-white shadow-sm shadow-red-500/50'
                    : 'bg-[#171a1f] text-slate-600'
                }`}
              >
                CLOSED
              </span>
            </div>

            {/* In/Out Bypass Switch */}
            <button
              onClick={() => onUpdateGate({ enabled: !gate.enabled })}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-mono font-bold flex items-center gap-1.5 ${
                gate.enabled ? 'ui-btn-amber' : 'ui-btn'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{gate.enabled ? 'GATE IN' : 'GATE OUT'}</span>
            </button>
            <div className="w-2.5 h-2.5 rounded-full bg-slate-600 border border-slate-500 shadow-inner" />
          </div>
        </div>

        {/* Gate Controls Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <HardwareKnob
            label="Seuil (Thresh)"
            value={gate.threshold}
            min={-80}
            max={0}
            step={1}
            unit="dB"
            color="amber"
            size="lg"
            defaultValue={-45}
            formatValue={(v) => `${v} dB`}
            onChange={(val) => onUpdateGate({ threshold: val })}
          />

          <HardwareKnob
            label="Plage (Range)"
            value={gate.range !== undefined ? gate.range : -60}
            min={-80}
            max={0}
            step={1}
            unit="dB"
            color="amber"
            defaultValue={-60}
            formatValue={(v) => `${v} dB`}
            onChange={(val) => onUpdateGate({ range: val })}
          />

          <HardwareKnob
            label="Attaque"
            value={gate.attack}
            min={0.1}
            max={50}
            step={0.5}
            unit="ms"
            color="amber"
            defaultValue={2}
            formatValue={(v) => `${v.toFixed(1)} ms`}
            onChange={(val) => onUpdateGate({ attack: val })}
          />

          <HardwareKnob
            label="Maintien (Hold)"
            value={gate.hold !== undefined ? gate.hold : 80}
            min={0}
            max={500}
            step={5}
            unit="ms"
            color="amber"
            defaultValue={80}
            formatValue={(v) => `${v} ms`}
            onChange={(val) => onUpdateGate({ hold: val })}
          />

          <HardwareKnob
            label="Relâchement"
            value={gate.release}
            min={10}
            max={1500}
            step={10}
            unit="ms"
            color="amber"
            defaultValue={150}
            formatValue={(v) => `${v} ms`}
            onChange={(val) => onUpdateGate({ release: val })}
          />
        </div>
      </div>

      {/* 2. COMPRESSOR / LIMITER HARDWARE UNIT */}
      <div className="rounded-lg bg-[#181b20] border border-[#2c313a] shadow-2xl p-4 sm:p-5 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#2b3038] mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-600 border border-slate-500 shadow-inner" />
            <span className="text-xs font-mono font-extrabold text-sky-400 tracking-wider">
              XR-VINTAGE COMPRESSOR & LIMITER
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Model Type Selector */}
            <div className="flex items-center gap-1 p-0.5 bg-[#0e1013] rounded-[4px] border border-[#2b3038] text-[10px] font-mono">
              {(['vintage_opto', 'classic_vca', 'fet_punch'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => onUpdateComp({ model: m })}
                  className={`px-2 py-1 rounded-[3px] uppercase font-bold ${
                    (comp.model || 'classic_vca') === m ? 'ui-btn-cyan' : 'ui-btn'
                  }`}
                >
                  {m === 'vintage_opto' ? 'Opto LA-2A' : m === 'classic_vca' ? 'VCA Clean' : 'FET 1176'}
                </button>
              ))}
            </div>

            {/* In/Out Bypass Switch */}
            <button
              onClick={() => onUpdateComp({ enabled: !comp.enabled })}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-mono font-bold flex items-center gap-1.5 ${
                comp.enabled ? 'ui-btn-cyan' : 'ui-btn'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{comp.enabled ? 'COMP IN' : 'COMP OUT'}</span>
            </button>
            <div className="w-2.5 h-2.5 rounded-full bg-slate-600 border border-slate-500 shadow-inner" />
          </div>
        </div>

        {/* Vintage Analog Gain Reduction (GR) VU Meter Display */}
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 mb-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Vintage Illuminated Analog GR Dial */}
            <div
              className="w-48 h-20 rounded-xl relative overflow-hidden flex flex-col justify-end p-2 border border-neutral-700/80 shadow-inner"
              style={{
                background: 'radial-gradient(circle at 50% 100%, #2e281e 0%, #171510 70%, #0a0a0a 100%)',
              }}
            >
              {/* Dial markings (-20 to 0 dB Gain Reduction) */}
              <div className="flex justify-between text-[8px] font-mono font-bold text-amber-200/70 px-2 select-none">
                <span>-24</span>
                <span>-18</span>
                <span>-12</span>
                <span>-8</span>
                <span>-4</span>
                <span>-2</span>
                <span className="text-amber-400">0 dB</span>
              </div>

              {/* Curved Scale Line */}
              <div className="w-full h-1 bg-gradient-to-r from-red-500 via-amber-400 to-emerald-400 rounded-full my-1 opacity-75" />

              {/* Needle pivot and arm */}
              <div
                className="absolute left-1/2 bottom-0 w-0.5 bg-red-400 origin-bottom transition-transform duration-75 ease-out shadow-sm shadow-red-400"
                style={{
                  height: '52px',
                  // Map 0dB to +40deg, 24dB to -40deg
                  transform: `translateX(-50%) rotate(${40 - (grDb / 24) * 80}deg)`,
                }}
              />
              <div className="absolute left-1/2 bottom-0 w-3 h-3 -translate-x-1/2 translate-y-1/2 rounded-full bg-neutral-900 border border-neutral-600" />
            </div>

            <div>
              <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-semibold">
                GAIN REDUCTION METER
              </div>
              <div className="text-xl font-mono font-extrabold text-amber-300 tabular-nums">
                {grDb > 0 ? `-${grDb.toFixed(1)} dB` : '0.0 dB'}
              </div>
              <div className="text-[10px] text-neutral-500">
                {comp.enabled
                  ? grDb > 0
                    ? 'Atténuation active'
                    : 'Signal sous le seuil'
                  : 'Compresseur hors service'}
              </div>
            </div>
          </div>

          {/* LED Ladder GR Bar */}
          <div className="w-full md:w-56 space-y-1">
            <div className="flex justify-between text-[9px] font-mono text-neutral-400">
              <span>GR LED BAR</span>
              <span>{grDb.toFixed(1)} dB</span>
            </div>
            <div className="w-full h-3 bg-neutral-900 rounded p-[1px] border border-neutral-800 flex overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-red-500 rounded transition-all duration-75"
                style={{ width: `${Math.min(100, (grDb / 20) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Compressor Rotary Controls Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          <HardwareKnob
            label="Seuil (Thresh)"
            value={comp.threshold}
            min={-60}
            max={0}
            step={1}
            unit="dB"
            color="sky"
            size="lg"
            defaultValue={-20}
            formatValue={(v) => `${v} dB`}
            onChange={(val) => onUpdateComp({ threshold: val })}
          />

          <HardwareKnob
            label="Ratio"
            value={comp.ratio}
            min={1.1}
            max={20}
            step={0.5}
            color="sky"
            defaultValue={4.0}
            formatValue={(v) => `${v >= 20 ? 'LIMIT' : `${v.toFixed(1)}:1`}`}
            onChange={(val) => onUpdateComp({ ratio: val })}
          />

          <HardwareKnob
            label="Attaque"
            value={comp.attack}
            min={0.1}
            max={100}
            step={0.5}
            unit="ms"
            color="sky"
            defaultValue={15}
            formatValue={(v) => `${v.toFixed(1)} ms`}
            onChange={(val) => onUpdateComp({ attack: val })}
          />

          <HardwareKnob
            label="Maintien (Hold)"
            value={comp.hold !== undefined ? comp.hold : 0}
            min={0}
            max={300}
            step={5}
            unit="ms"
            color="sky"
            defaultValue={0}
            formatValue={(v) => `${v} ms`}
            onChange={(val) => onUpdateComp({ hold: val })}
          />

          <HardwareKnob
            label="Relâchement"
            value={comp.release}
            min={10}
            max={2000}
            step={10}
            unit="ms"
            color="sky"
            defaultValue={180}
            formatValue={(v) => `${v} ms`}
            onChange={(val) => onUpdateComp({ release: val })}
          />

          <HardwareKnob
            label="Makeup Gain"
            value={comp.makeupGain !== undefined ? comp.makeupGain : 0}
            min={0}
            max={24}
            step={0.5}
            unit="dB"
            color="emerald"
            defaultValue={0}
            formatValue={(v) => `+${v.toFixed(1)}dB`}
            onChange={(val) => onUpdateComp({ makeupGain: val })}
          />

          <HardwareKnob
            label="Mix Wet/Dry"
            value={comp.mix !== undefined ? comp.mix : 100}
            min={0}
            max={100}
            step={1}
            unit="%"
            color="purple"
            defaultValue={100}
            formatValue={(v) => `${v}%`}
            onChange={(val) => onUpdateComp({ mix: val })}
          />
        </div>
      </div>
    </div>
  );
};
