import React, { useRef, useState, useCallback } from 'react';
import { MeterLevel } from '../types/xr18';
import { useXR18 } from '../context/XR18Context';
import { formatFader, formatPan } from '../utils/audioMath';
import { meterDbToPercent } from '../utils/audioMath';
import { ArrowRightLeft, Power } from 'lucide-react';

export interface BusFXStripProps {
  kind: 'bus' | 'fx_send' | 'fx_return';
  id: number;
  code: string;
  name: string;
  fader: number;
  pan?: number;
  mute: boolean;
  solo: boolean;
  active?: boolean; // for fx_return bypass badge
  meter: MeterLevel;
  meterRight?: MeterLevel; // stereo dual meter for FX returns
  accentColor: 'amber' | 'teal' | 'purple' | 'cyan';
  onFaderChange: (val: number) => void;
  onPanChange?: (pan: number) => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onActivateSoF?: () => void;
  onToggleBypass?: () => void;
}

const stripThemes = {
  amber: {
    badgeBg: 'bg-amber-950/80 border-amber-700/60',
    badgeText: 'text-amber-300',
    codeText: 'text-amber-400',
    capLine: 'bg-amber-400',
    capBorder: 'border-amber-500/60',
  },
  teal: {
    badgeBg: 'bg-teal-950/80 border-teal-700/60',
    badgeText: 'text-teal-300',
    codeText: 'text-teal-400',
    capLine: 'bg-teal-400',
    capBorder: 'border-teal-500/60',
  },
  purple: {
    badgeBg: 'bg-purple-950/80 border-purple-700/60',
    badgeText: 'text-purple-300',
    codeText: 'text-purple-400',
    capLine: 'bg-purple-400',
    capBorder: 'border-purple-500/60',
  },
  cyan: {
    badgeBg: 'bg-sky-950/80 border-sky-700/60',
    badgeText: 'text-sky-300',
    codeText: 'text-sky-400',
    capLine: 'bg-sky-400',
    capBorder: 'border-sky-500/60',
  },
};

export const BusFXStrip: React.FC<BusFXStripProps> = ({
  kind,
  id,
  code,
  name,
  fader,
  pan = 0,
  mute,
  solo,
  active = true,
  meter,
  meterRight,
  accentColor,
  onFaderChange,
  onPanChange,
  onToggleMute,
  onToggleSolo,
  onActivateSoF,
  onToggleBypass,
}) => {
  const { isFitScreen, sendsOnFaders } = useXR18();
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const theme = stripThemes[accentColor];

  const isSoFThisTarget =
    sendsOnFaders.active &&
    ((kind === 'bus' && sendsOnFaders.type === 'bus' && sendsOnFaders.targetId === id) ||
      (kind === 'fx_send' && sendsOnFaders.type === 'fx' && sendsOnFaders.targetId === id));

  const updateFromClientY = useCallback(
    (clientY: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      onFaderChange(ratio);
    },
    [onFaderChange]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateFromClientY(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updateFromClientY(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.015 : -0.015;
    onFaderChange(Math.max(0, Math.min(1, fader + delta)));
  };

  const handleDoubleClick = () => {
    onFaderChange(0.75);
  };

  const renderSingleMeter = (m: MeterLevel, label?: string) => {
    const pct = meterDbToPercent(mute || !active ? -60 : m.peak);
    const holdPct = meterDbToPercent(mute || !active ? -60 : m.peakHold);

    return (
      <div className="w-2.5 sm:w-3 h-full flex flex-col justify-end bg-[#0c0e11] rounded-xs p-[1px] border border-[#2a2f38] relative shrink-0">
        {label && (
          <div className="text-[6px] font-mono text-center text-sky-400 leading-none mb-0.5 font-bold">
            {label}
          </div>
        )}
        <div
          className={`w-full h-1 rounded-xs mb-0.5 transition-opacity ${
            m.clip && !mute && active ? 'bg-red-500 opacity-100 shadow-xs shadow-red-500' : 'bg-red-950/30 opacity-50'
          }`}
        />
        <div className="relative w-full flex-1 bg-[#101317] rounded-xs overflow-hidden flex flex-col justify-end">
          <div
            className="w-full transition-all duration-75 ease-out rounded-xs relative"
            style={{
              height: `${pct}%`,
              background:
                'linear-gradient(to top, #22c55e 0%, #22c55e 60%, #eab308 82%, #f97316 92%, #ef4444 100%)',
            }}
          >
            <div className="absolute inset-0 ui-meter-led-mask pointer-events-none" />
          </div>
          {holdPct > 0 && !mute && active && (
            <div
              className="absolute left-0 right-0 h-[2px] bg-white shadow-xs pointer-events-none"
              style={{ bottom: `${holdPct}%` }}
            />
          )}
        </div>
      </div>
    );
  };

  const accentStripeColor =
    accentColor === 'amber' ? '#f59e0b' :
    accentColor === 'teal' ? '#14b8a6' :
    accentColor === 'purple' ? '#a855f7' : '#0ea5e9';

  return (
    <div
      className={`${
        isFitScreen ? 'flex-1 min-w-[48px] sm:min-w-[64px] max-w-[125px]' : 'w-28 shrink-0'
      } ui-strip flex flex-col h-full select-none overflow-hidden ${
        solo ? 'ring-1 ring-inset ring-amber-400/70' : ''
      }`}
    >
      {/* 1. Scribble Strip LCD */}
      <div className="border-b border-[#0e1013] bg-[#14171b] shrink-0">
        <div className="h-1.5 w-full" style={{ backgroundColor: accentStripeColor }} />
        <div className={`${isFitScreen ? 'p-1.5' : 'p-2'}`}>
          <div className="flex items-center justify-between text-[9px] font-mono">
            <span className={`font-bold ${theme.codeText}`}>{code}</span>
            <span className="text-neutral-400">
              {kind === 'bus' ? 'AUX' : kind === 'fx_send' ? 'SEND' : 'RTN'}
            </span>
          </div>
          <div className={`text-xs font-bold truncate mt-0.5 tracking-tight ${theme.badgeText}`}>
            {name}
          </div>
          <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400 mt-0.5">
            {kind === 'fx_return' ? (
              <span className={active ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                {active ? 'FX ACTIF' : 'BYPASS'}
              </span>
            ) : (
              <span className="text-neutral-400">
                {kind === 'bus' ? 'PRE/POST' : 'POST CH'}
              </span>
            )}
            <span className="text-sky-400 font-bold">{meterRight ? 'ST' : 'M'}</span>
          </div>
        </div>
      </div>

      {/* 2. Quick Sends-on-Faders Mix / Bypass Embossed Button */}
      <div className="px-1.5 py-1.5 border-b border-[#121417] bg-[#1e2127] shrink-0 space-y-1">
        {onActivateSoF && (
          <button
            onClick={onActivateSoF}
            className={`w-full py-1 px-1 text-[9px] font-mono font-bold rounded flex items-center justify-center gap-1 ${
              isSoFThisTarget ? 'ui-btn-amber' : 'ui-btn'
            }`}
            title="Basculer les 18 faders en mode envoi direct vers ce bus/FX (Sends on Faders)"
          >
            <ArrowRightLeft className="w-2.5 h-2.5 shrink-0 text-sky-400" />
            <span className="truncate">MIX TRANCHES</span>
          </button>
        )}

        {kind === 'fx_return' && onToggleBypass && (
          <button
            onClick={onToggleBypass}
            className={`w-full py-1 px-1 text-[9px] font-mono font-bold rounded flex items-center justify-center gap-1 ${
              active ? 'ui-btn-green' : 'ui-btn-red'
            }`}
            title="Activer ou contourner (Bypass) ce moteur d'effet"
          >
            <Power className="w-2.5 h-2.5 shrink-0" />
            <span>{active ? 'FX ON' : 'BYPASS'}</span>
          </button>
        )}
      </div>

      {/* 3. Pan / Balance Control */}
      <div className="px-1.5 py-1 border-b border-[#121417] bg-[#21252b] text-[10px] shrink-0">
        {onPanChange ? (
          <>
            <div className="flex items-center justify-between mb-0.5 text-[9px]">
              <span className="text-neutral-400 font-bold">{kind === 'fx_return' ? 'BAL' : 'PAN'}</span>
              <span
                onClick={() => onPanChange(0)}
                className="font-mono text-sky-300 cursor-pointer hover:text-white tabular-nums"
                title="Cliquer pour centrer"
              >
                {formatPan(pan)}
              </span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              step={1}
              value={pan}
              onChange={(e) => onPanChange(parseInt(e.target.value, 10))}
              className="w-full h-1 bg-[#0d0f12] rounded appearance-none cursor-pointer"
            />
          </>
        ) : (
          <div className="text-[9px] font-mono text-sky-400 font-bold text-center py-1">
            MASTER SEND
          </div>
        )}
      </div>

      {/* 4. Embossed Mute & Solo Buttons */}
      <div className="px-1.5 py-1 gap-1 grid grid-cols-2 border-b border-[#121417] bg-[#1c1f24] shrink-0">
        <button
          onClick={onToggleMute}
          className={`py-1.5 px-0.5 text-[10px] font-mono font-extrabold rounded tracking-wide ${
            mute ? 'ui-btn-red' : 'ui-btn'
          }`}
        >
          MUTE
        </button>
        <button
          onClick={onToggleSolo}
          className={`py-1.5 px-0.5 text-[10px] font-mono font-extrabold rounded tracking-wide ${
            solo ? 'ui-btn-amber' : 'ui-btn'
          }`}
        >
          SOLO
        </button>
      </div>

      {/* 5. Metallic Fader, dB Scale Graduations & Segmented LED VU Meter */}
      <div className="relative flex-1 flex px-1.5 py-2 min-h-0 bg-[#191c20] overflow-hidden">
        <div className="w-4 flex flex-col justify-between text-[7px] font-mono text-neutral-500 select-none py-0.5 tabular-nums">
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

        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          className="relative flex-1 flex justify-center items-center cursor-ns-resize touch-none group"
          title="Glisser pour ajuster le niveau, double-cliquer pour 0 dB"
        >
          <div className="ui-fader-slot w-2 h-full rounded-full" />

          <div
            className="absolute left-0.5 right-0.5 h-px bg-sky-400/60 pointer-events-none"
            style={{ bottom: '75%' }}
          />

          <div
            className={`absolute left-1/2 -translate-x-1/2 ${
              isFitScreen ? 'w-7 h-8' : 'w-8 h-9'
            } rounded-xs flex flex-col justify-center items-center pointer-events-none transition-transform duration-75`}
            style={{
              bottom: `calc(${fader * 100}% - ${isFitScreen ? '16px' : '18px'})`,
            }}
          >
            <div className="ui-fader-cap w-full h-full rounded-xs flex flex-col items-center justify-center">
              <div className="w-full h-[2px] bg-black/50 mb-0.5" />
              <div className={`w-full h-[2.5px] ${theme.capLine} shadow-xs`} />
              <div className="w-full h-[2px] bg-black/50 mt-0.5" />
            </div>
          </div>
        </div>

        <div className="flex gap-0.5 h-full ml-1 shrink-0">
          {renderSingleMeter(meter, meterRight ? 'L' : undefined)}
          {meterRight && renderSingleMeter(meterRight, 'R')}
        </div>
      </div>

      {/* 6. LCD dB Numeric Readout */}
      <div className="p-1.5 border-t border-[#101215] bg-[#16191d] text-center shrink-0">
        <div className="ui-lcd rounded py-0.5 font-mono text-[10px] font-bold text-sky-300 tabular-nums">
          {formatFader(fader)}
        </div>
      </div>
    </div>
  );
};
