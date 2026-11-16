import React, { useState, useRef, useCallback } from 'react';
import { ChannelStripData, MeterLevel } from '../types/xr18';
import { useXR18 } from '../context/XR18Context';
import { formatFader, formatPan, formatGain, meterDbToPercent } from '../utils/audioMath';
import {
  Mic,
  Mic2,
  Drum,
  Guitar,
  Sliders,
  Volume2,
  VolumeX,
  Zap,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface ChannelStripProps {
  channel: ChannelStripData;
  meter: MeterLevel;
  onOpenInspector: (chId: number) => void;
}

const colorBadgeStyles: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  gray: { bg: 'bg-neutral-800', text: 'text-neutral-300', border: 'border-neutral-700', glow: 'shadow-neutral-500/20' },
  red: { bg: 'bg-red-950/80', text: 'text-red-400', border: 'border-red-700/60', glow: 'shadow-red-500/30' },
  amber: { bg: 'bg-amber-950/80', text: 'text-amber-400', border: 'border-amber-700/60', glow: 'shadow-amber-500/30' },
  yellow: { bg: 'bg-yellow-950/80', text: 'text-yellow-400', border: 'border-yellow-700/60', glow: 'shadow-yellow-500/30' },
  green: { bg: 'bg-emerald-950/80', text: 'text-emerald-400', border: 'border-emerald-700/60', glow: 'shadow-emerald-500/30' },
  teal: { bg: 'bg-teal-950/80', text: 'text-teal-400', border: 'border-teal-700/60', glow: 'shadow-teal-500/30' },
  blue: { bg: 'bg-sky-950/80', text: 'text-sky-400', border: 'border-sky-700/60', glow: 'shadow-sky-500/30' },
  purple: { bg: 'bg-purple-950/80', text: 'text-purple-400', border: 'border-purple-700/60', glow: 'shadow-purple-500/30' },
  magenta: { bg: 'bg-pink-950/80', text: 'text-pink-400', border: 'border-pink-700/60', glow: 'shadow-pink-500/30' },
};

export const ChannelStrip: React.FC<ChannelStripProps> = ({
  channel,
  meter,
  onOpenInspector,
}) => {
  const {
    setChannelFader,
    setChannelPan,
    setChannelGain,
    toggleChannelMute,
    toggleChannelSolo,
    toggleChannel48V,
    toggleChannelPhase,
    sendsOnFaders,
    setChannelSend,
    isFitScreen,
  } = useXR18();

  const isSoFActive = sendsOnFaders.active;
  // If Sends-on-Faders is active, the main fader controls the send to that bus/FX!
  const currentFaderVal = isSoFActive
    ? sendsOnFaders.type === 'bus'
      ? channel.sends[sendsOnFaders.targetId] ?? 0
      : channel.fxSends[sendsOnFaders.targetId] ?? 0
    : channel.fader;

  const faderTrackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Compute fader interaction
  const handleFaderChange = useCallback(
    (clientY: number) => {
      if (!faderTrackRef.current) return;
      const rect = faderTrackRef.current.getBoundingClientRect();
      const height = rect.height;
      const offsetY = clientY - rect.top;
      // Invert: top is 1.0 (+10dB), bottom is 0.0 (-inf)
      const ratio = 1 - Math.max(0, Math.min(1, offsetY / height));

      if (isSoFActive) {
        setChannelSend(channel.id, sendsOnFaders.type, sendsOnFaders.targetId, ratio);
      } else {
        setChannelFader(channel.id, ratio);
      }
    },
    [channel.id, isSoFActive, sendsOnFaders, setChannelFader, setChannelSend]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    handleFaderChange(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    handleFaderChange(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Wheel fine-tuning on fader
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.015 : -0.015;
    const nextVal = Math.max(0, Math.min(1, currentFaderVal + delta));
    if (isSoFActive) {
      setChannelSend(channel.id, sendsOnFaders.type, sendsOnFaders.targetId, nextVal);
    } else {
      setChannelFader(channel.id, nextVal);
    }
  };

  // Double click resets fader to Unity 0 dB (0.75)
  const handleDoubleClick = () => {
    if (isSoFActive) {
      setChannelSend(channel.id, sendsOnFaders.type, sendsOnFaders.targetId, 0.75);
    } else {
      setChannelFader(channel.id, 0.75);
    }
  };

  // Meter calculations
  const meterPercent = meterDbToPercent(channel.mute ? -60 : meter.peak);
  const peakHoldPercent = meterDbToPercent(channel.mute ? -60 : meter.peakHold);

  const badgeTheme = colorBadgeStyles[channel.color] || colorBadgeStyles.gray;

  // Channel icon selector
  const renderIcon = () => {
    switch (channel.icon) {
      case 'drum':
      case 'snare':
      case 'hihat':
        return <Drum className="w-3.5 h-3.5" />;
      case 'guitar':
      case 'bass':
      case 'acoustic':
        return <Guitar className="w-3.5 h-3.5" />;
      case 'mic_vocal':
        return <Mic2 className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Mic className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      className={`${
        isFitScreen ? 'flex-1 min-w-[36px] sm:min-w-[42px] max-w-[94px]' : 'w-24 shrink-0'
      } ui-strip flex flex-col h-full select-none transition-colors overflow-hidden ${
        channel.solo ? 'ring-1 ring-inset ring-amber-400/70' : ''
      }`}
    >
      {/* 1. Scribble Strip Header (Soundcraft Ui24R colored top bar + dark LCD window) */}
      <div
        onClick={() => onOpenInspector(channel.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onOpenInspector(channel.id)}
        className="cursor-pointer transition-all hover:brightness-110 border-b border-[#0e1013] shrink-0 bg-[#14171b]"
        title="Cliquer pour ouvrir l'inspecteur d'effets, EQ et routing"
      >
        {/* Top Soundcraft Color Identification Bar */}
        <div
          className="h-1.5 w-full"
          style={{
            backgroundColor:
              channel.color === 'red' ? '#ef4444' :
              channel.color === 'amber' ? '#f59e0b' :
              channel.color === 'yellow' ? '#eab308' :
              channel.color === 'green' ? '#22c55e' :
              channel.color === 'teal' ? '#14b8a6' :
              channel.color === 'blue' ? '#0ea5e9' :
              channel.color === 'purple' ? '#a855f7' :
              channel.color === 'magenta' ? '#ec4899' : '#64748b',
          }}
        />
        <div className={`${isFitScreen ? 'p-1' : 'p-1.5'}`}>
          <div className="flex items-center justify-between text-[9px] font-mono">
            <span className="font-bold text-sky-400">CH {channel.id < 10 ? `0${channel.id}` : channel.id}</span>
            <span className="opacity-80 hidden sm:inline text-neutral-400">{renderIcon()}</span>
          </div>
          <div className={`text-[11px] font-bold truncate mt-0.5 tracking-tight ${badgeTheme.text}`}>
            {channel.name}
          </div>
          <div className="flex items-center justify-between text-[8px] font-mono mt-0.5">
            <span className={channel.eq.enabled ? 'text-sky-400 font-bold' : 'text-neutral-600'}>EQ</span>
            <span className={channel.gate.enabled ? 'text-amber-400 font-bold' : 'text-neutral-600'}>GT</span>
            <span className={channel.comp.enabled ? 'text-emerald-400 font-bold' : 'text-neutral-600'}>CP</span>
          </div>
        </div>
      </div>

      {/* 2. Preamp Gain & 48V / Phase Embossed Hardware Buttons */}
      <div className={`${isFitScreen ? 'px-1 py-1' : 'px-1.5 py-1.5'} border-b border-[#121417] bg-[#1e2127] text-[10px] space-y-1 shrink-0`}>
        <div className="flex items-center justify-between px-0.5">
          <span className="text-neutral-400 font-bold text-[8px]">GAIN</span>
          <span className="font-mono text-sky-300 text-[9px] tabular-nums">
            {formatGain(channel.gain)}
          </span>
        </div>
        <input
          type="range"
          min={-12}
          max={60}
          step={0.5}
          value={channel.gain}
          onChange={(e) => setChannelGain(channel.id, parseFloat(e.target.value))}
          className="w-full h-1 bg-[#0d0f12] rounded appearance-none cursor-pointer"
          title={`Gain: ${formatGain(channel.gain)}`}
        />

        <div className="grid grid-cols-2 gap-1 pt-0.5">
          <button
            onClick={() => toggleChannel48V(channel.id)}
            className={`py-0.5 text-[8px] font-mono font-bold rounded ${
              channel.phantom48V ? 'ui-btn-red' : 'ui-btn'
            }`}
            title="Alimentation Fantôme 48V"
          >
            48V
          </button>
          <button
            onClick={() => toggleChannelPhase(channel.id)}
            className={`py-0.5 text-[8px] font-mono font-bold rounded ${
              channel.invertPhase ? 'ui-btn-cyan' : 'ui-btn'
            }`}
            title="Inversion de Phase (Ø)"
          >
            Ø
          </button>
        </div>
      </div>

      {/* 3. Pan Control */}
      <div className={`${isFitScreen ? 'px-1 py-0.5' : 'px-1.5 py-1'} border-b border-[#121417] bg-[#21252b] text-[10px] shrink-0`}>
        <div className="flex items-center justify-between mb-0.5 text-[8px]">
          <span className="text-neutral-400 font-bold">PAN</span>
          <span
            onClick={() => setChannelPan(channel.id, 0)}
            className="font-mono text-sky-300 cursor-pointer hover:text-white tabular-nums"
            title="Cliquer pour centrer"
          >
            {formatPan(channel.pan)}
          </span>
        </div>
        <input
          type="range"
          min={-100}
          max={100}
          step={1}
          value={channel.pan}
          onChange={(e) => setChannelPan(channel.id, parseInt(e.target.value, 10))}
          className="w-full h-1 bg-[#0d0f12] rounded appearance-none cursor-pointer"
        />
      </div>

      {/* 4. Soundcraft Ui24R Embossed MUTE & SOLO Hardware Buttons */}
      <div className={`${isFitScreen ? 'px-1 py-1 gap-1' : 'px-1.5 py-1.5 gap-1.5'} grid grid-cols-2 border-b border-[#121417] bg-[#1c1f24] shrink-0`}>
        <button
          onClick={() => toggleChannelMute(channel.id)}
          className={`py-1.5 px-0.5 text-[9px] font-mono font-extrabold rounded tracking-wide ${
            channel.mute ? 'ui-btn-red' : 'ui-btn'
          }`}
          title="Couper la tranche (Mute)"
        >
          {isFitScreen ? 'M' : 'MUTE'}
        </button>

        <button
          onClick={() => toggleChannelSolo(channel.id)}
          className={`py-1.5 px-0.5 text-[9px] font-mono font-extrabold rounded tracking-wide ${
            channel.solo ? 'ui-btn-amber' : 'ui-btn'
          }`}
          title="Écoute Solo / PFL"
        >
          {isFitScreen ? 'S' : 'SOLO'}
        </button>
      </div>

      {/* 5. Main Fader & Segmented LED VU Meter Section */}
      <div className={`relative flex-1 flex ${isFitScreen ? 'px-1 py-1.5' : 'px-1.5 py-2'} min-h-0 bg-[#191c20] overflow-hidden`}>
        {/* dB Scale Markings */}
        <div className="w-3.5 sm:w-4 flex flex-col justify-between text-[7px] font-mono text-neutral-500 select-none py-0.5 tabular-nums">
          <span className="text-red-400">+10</span>
          <span className="text-amber-400">+5</span>
          <span className="text-sky-400 font-bold">0</span>
          <span>-5</span>
          <span>-10</span>
          <span>-20</span>
          <span>-30</span>
          <span>-50</span>
          <span>-∞</span>
        </div>

        {/* Recessed Fader Track & Brushed Aluminum Cap */}
        <div
          ref={faderTrackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          className="relative flex-1 flex justify-center items-center cursor-ns-resize touch-none group"
          title="Fader: Glisser pour ajuster, double-cliquer pour 0 dB"
        >
          <div className="ui-fader-slot w-2 h-full rounded-full" />

          {/* Unity 0 dB Marker Tick */}
          <div
            className="absolute left-0.5 right-0.5 h-px bg-sky-400/60 pointer-events-none"
            style={{ bottom: '75%' }}
            title="Unity 0dB"
          />

          {/* Soundcraft Metallic Fader Cap */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 ${
              isFitScreen ? 'w-6 h-8' : 'w-7 h-9'
            } rounded-xs flex flex-col justify-center items-center pointer-events-none transition-transform duration-75`}
            style={{
              bottom: `calc(${currentFaderVal * 100}% - ${isFitScreen ? '16px' : '18px'})`,
            }}
          >
            <div
              className={`w-full h-full rounded-xs flex flex-col items-center justify-center ${
                isSoFActive ? 'ui-fader-cap-sof' : 'ui-fader-cap'
              }`}
            >
              <div className="w-full h-[2px] bg-black/50 mb-0.5" />
              <div className={`w-full h-[2px] ${isSoFActive ? 'bg-white' : 'bg-sky-300'} shadow-xs`} />
              <div className="w-full h-[2px] bg-black/50 mt-0.5" />
            </div>
          </div>
        </div>

        {/* Multi-segment LED VU Meter */}
        <div className="w-2 sm:w-2.5 h-full ml-1 flex flex-col justify-end bg-[#0c0e11] rounded-xs p-[1px] border border-[#2a2f38] relative shrink-0">
          <div
            className={`w-full h-1 rounded-xs mb-0.5 transition-opacity ${
              meter.clip ? 'bg-red-500 opacity-100 shadow-xs shadow-red-500' : 'bg-red-950/30 opacity-50'
            }`}
          />

          <div className="relative w-full flex-1 bg-[#101317] rounded-xs overflow-hidden flex flex-col justify-end">
            <div
              className="w-full transition-all duration-75 ease-out rounded-xs relative"
              style={{
                height: `${meterPercent}%`,
                background: 'linear-gradient(to top, #22c55e 0%, #22c55e 60%, #eab308 82%, #f97316 92%, #ef4444 100%)',
              }}
            >
              <div className="absolute inset-0 ui-meter-led-mask pointer-events-none" />
            </div>

            {peakHoldPercent > 0 && !channel.mute && (
              <div
                className="absolute left-0 right-0 h-[2px] bg-white shadow-xs pointer-events-none"
                style={{ bottom: `${peakHoldPercent}%` }}
              />
            )}
          </div>
        </div>
      </div>

      {/* 6. LCD dB Readout & Edit Trigger */}
      <div className={`${isFitScreen ? 'p-1' : 'p-1.5'} border-t border-[#101215] bg-[#16191d] text-center space-y-1 shrink-0`}>
        <div className="ui-lcd rounded py-0.5 font-mono text-[9px] font-bold text-sky-300 tabular-nums">
          {formatFader(currentFaderVal)}
        </div>
        <button
          onClick={() => onOpenInspector(channel.id)}
          className="ui-btn w-full py-0.5 text-[8px] font-mono font-bold rounded flex items-center justify-center gap-0.5"
        >
          <span>EDIT</span>
          <ChevronRight className="w-2.5 h-2.5 text-sky-400" />
        </button>
      </div>
    </div>
  );
};
