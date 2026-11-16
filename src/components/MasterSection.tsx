import React, { useRef, useState, useCallback } from 'react';
import { useXR18 } from '../context/XR18Context';
import { formatFader, meterDbToPercent } from '../utils/audioMath';
import {
  Volume2,
  VolumeX,
  Radio,
  Sliders,
  CheckCircle2,
  Sparkles,
  ArrowRightLeft,
  X,
} from 'lucide-react';

export const MasterSection: React.FC = () => {
  const {
    master,
    masterMeters,
    setMasterFader,
    toggleMasterMute,
    clearAllSolos,
    channels,
    auxBuses,
    fxRacks,
    dcas,
    setDCAFader,
    toggleDCAMute,
    muteGroups,
    toggleMuteGroup,
    sendsOnFaders,
    activateSendsOnFaders,
    exitSendsOnFaders,
    isFitScreen,
  } = useXR18();

  const [activeTab, setActiveTab] = useState<'main' | 'dca' | 'sof'>('main');
  const [isDraggingMaster, setIsDraggingMaster] = useState(false);
  const masterTrackRef = useRef<HTMLDivElement>(null);

  // Check if any solo is active
  const hasActiveSolos =
    channels.some((c) => c.solo) ||
    auxBuses.some((b) => b.solo) ||
    fxRacks.some((f) => f.sendSolo || f.returnSolo);

  const handleMasterChange = useCallback(
    (clientY: number) => {
      if (!masterTrackRef.current) return;
      const rect = masterTrackRef.current.getBoundingClientRect();
      const height = rect.height;
      const offsetY = clientY - rect.top;
      const ratio = 1 - Math.max(0, Math.min(1, offsetY / height));
      setMasterFader(ratio);
    },
    [setMasterFader]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDraggingMaster(true);
    handleMasterChange(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingMaster) return;
    handleMasterChange(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDraggingMaster(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const lPercent = meterDbToPercent(master.mute ? -60 : masterMeters.left.peak);
  const rPercent = meterDbToPercent(master.mute ? -60 : masterMeters.right.peak);
  const lHold = meterDbToPercent(master.mute ? -60 : masterMeters.left.peakHold);
  const rHold = meterDbToPercent(master.mute ? -60 : masterMeters.right.peakHold);

  return (
    <aside className={`${isFitScreen ? 'w-44 sm:w-52 lg:w-64' : 'w-72 lg:w-80'} ui-master-panel shrink-0 flex flex-col select-none h-full overflow-hidden`}>
      {/* 1. Header with View Tabs */}
      <div className="p-1.5 border-b border-[#0e1013] bg-[#181b20] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 w-full">
          <button
            onClick={() => setActiveTab('main')}
            className={`flex-1 px-2 py-1 text-[11px] font-bold rounded ${
              activeTab === 'main' ? 'ui-btn-cyan' : 'ui-btn'
            }`}
          >
            Master
          </button>
          <button
            onClick={() => setActiveTab('dca')}
            className={`flex-1 px-2 py-1 text-[11px] font-bold rounded ${
              activeTab === 'dca' ? 'ui-btn-cyan' : 'ui-btn'
            }`}
          >
            DCA
          </button>
          <button
            onClick={() => setActiveTab('sof')}
            className={`flex-1 px-2 py-1 text-[11px] font-bold rounded flex items-center justify-center gap-1 ${
              activeTab === 'sof' || sendsOnFaders.active ? 'ui-btn-amber' : 'ui-btn'
            }`}
          >
            <ArrowRightLeft className="w-3 h-3" />
            <span>SoF</span>
          </button>
        </div>
      </div>

      {/* Sends on Faders Banner if active */}
      {sendsOnFaders.active && (
        <div className="px-2.5 py-1.5 bg-amber-500/15 border-b border-amber-500/40 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono font-bold truncate">SOF : {sendsOnFaders.targetName}</span>
          </div>
          <button
            onClick={exitSendsOnFaders}
            className="ui-btn-amber p-1 rounded shrink-0"
            title="Quitter Sends on Faders"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Tab View */}
      {activeTab === 'main' && (
        <div className="flex-1 flex flex-col p-2.5 space-y-2.5 min-h-0">
          {/* Solos Status & Global Clear */}
          <div className="flex items-center justify-between p-1.5 rounded bg-[#14171b] border border-[#2b3038]">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="font-bold text-neutral-300">SOLO</span>
              <span className={`text-[10px] font-mono font-bold ${hasActiveSolos ? 'text-amber-400' : 'text-neutral-500'}`}>
                {hasActiveSolos ? 'ACTIF' : 'LIBRE'}
              </span>
            </div>
            <button
              onClick={clearAllSolos}
              disabled={!hasActiveSolos}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded ${
                hasActiveSolos ? 'ui-btn-amber' : 'ui-btn opacity-50 cursor-not-allowed'
              }`}
            >
              CLEAR SOLO
            </button>
          </div>

          {/* Master Fader and Dual Stereo Segmented Meters */}
          <div className="flex-1 flex gap-2 min-h-0 bg-[#181b20] rounded p-2 border border-[#2b3038] overflow-hidden shadow-inner">
            <div className="w-5 flex flex-col justify-between text-[8px] font-mono text-neutral-500 py-1 tabular-nums">
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
              ref={masterTrackRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onDoubleClick={() => setMasterFader(0.75)}
              className="relative flex-1 flex justify-center items-center cursor-ns-resize touch-none group"
              title="Master Fader: Double-clic pour 0 dB"
            >
              <div className="ui-fader-slot w-2.5 h-full rounded-full" />

              <div className="absolute left-0.5 right-0.5 h-px bg-sky-400/60 pointer-events-none" style={{ bottom: '75%' }} />

              {/* Red Soundcraft Master Fader Cap */}
              <div
                className="absolute left-1/2 -translate-x-1/2 w-11 h-11 rounded-xs flex flex-col justify-center items-center pointer-events-none transition-transform duration-75"
                style={{ bottom: `calc(${master.fader * 100}% - 22px)` }}
              >
                <div className="ui-fader-cap-master w-full h-full rounded-xs flex flex-col items-center justify-center">
                  <div className="w-full h-[2px] bg-black/50 mb-1" />
                  <div className="w-full h-[2.5px] bg-white shadow-xs" />
                  <div className="w-full h-[2px] bg-black/50 mt-1" />
                </div>
              </div>
            </div>

            {/* Stereo Dual Segmented Meters */}
            <div className="flex gap-1.5 h-full">
              <div className="w-3.5 h-full flex flex-col justify-end bg-[#0c0e11] rounded-xs p-[1px] border border-[#2a2f38] relative">
                <div className="text-[7px] font-mono text-center text-sky-400 font-bold mb-0.5">L</div>
                <div className={`w-full h-1.5 rounded-xs mb-0.5 ${masterMeters.left.clip ? 'bg-red-500 shadow-xs shadow-red-500' : 'bg-red-950/30'}`} />
                <div className="relative w-full flex-1 bg-[#101317] rounded-xs overflow-hidden flex flex-col justify-end">
                  <div
                    className="w-full transition-all duration-75 ease-out rounded-xs relative"
                    style={{
                      height: `${lPercent}%`,
                      background: 'linear-gradient(to top, #22c55e 0%, #22c55e 60%, #eab308 82%, #f97316 92%, #ef4444 100%)',
                    }}
                  >
                    <div className="absolute inset-0 ui-meter-led-mask pointer-events-none" />
                  </div>
                  {lHold > 0 && !master.mute && (
                    <div className="absolute left-0 right-0 h-[2px] bg-white shadow-xs" style={{ bottom: `${lHold}%` }} />
                  )}
                </div>
              </div>

              <div className="w-3.5 h-full flex flex-col justify-end bg-[#0c0e11] rounded-xs p-[1px] border border-[#2a2f38] relative">
                <div className="text-[7px] font-mono text-center text-sky-400 font-bold mb-0.5">R</div>
                <div className={`w-full h-1.5 rounded-xs mb-0.5 ${masterMeters.right.clip ? 'bg-red-500 shadow-xs shadow-red-500' : 'bg-red-950/30'}`} />
                <div className="relative w-full flex-1 bg-[#101317] rounded-xs overflow-hidden flex flex-col justify-end">
                  <div
                    className="w-full transition-all duration-75 ease-out rounded-xs relative"
                    style={{
                      height: `${rPercent}%`,
                      background: 'linear-gradient(to top, #22c55e 0%, #22c55e 60%, #eab308 82%, #f97316 92%, #ef4444 100%)',
                    }}
                  >
                    <div className="absolute inset-0 ui-meter-led-mask pointer-events-none" />
                  </div>
                  {rHold > 0 && !master.mute && (
                    <div className="absolute left-0 right-0 h-[2px] bg-white shadow-xs" style={{ bottom: `${rHold}%` }} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Master LCD Readout & Embossed MUTE Button */}
          <div className="space-y-2 shrink-0">
            <div className="ui-lcd rounded px-2.5 py-1 flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-400 font-bold">MAIN LR</span>
              <span className="font-bold text-sky-300 text-sm tabular-nums">
                {formatFader(master.fader)}
              </span>
            </div>

            <button
              onClick={() => toggleMasterMute()}
              className={`w-full py-2.5 text-xs sm:text-sm font-mono font-extrabold rounded tracking-wider flex items-center justify-center gap-2 ${
                master.mute ? 'ui-btn-red' : 'ui-btn'
              }`}
            >
              {master.mute ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              <span>{master.mute ? 'MASTER MUTED' : 'MASTER ON'}</span>
            </button>
          </div>
        </div>
      )}

      {/* DCA & Mute Groups Tab View */}
      {activeTab === 'dca' && (
        <div className="flex-1 p-3 overflow-y-auto space-y-4">
          {/* Mute Groups 1-4 */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Mute Groups
            </div>
            <div className="grid grid-cols-2 gap-2">
              {muteGroups.map((mg) => (
                <button
                  key={mg.id}
                  onClick={() => toggleMuteGroup(mg.id)}
                  className={`p-2 rounded text-left transition-all ${
                    mg.active ? 'ui-btn-red' : 'ui-btn'
                  }`}
                >
                  <div className="text-[9px] font-mono opacity-80">MUTE GP {mg.id}</div>
                  <div className="text-xs font-bold truncate mt-0.5">{mg.name}</div>
                  <div className="text-[9px] font-mono mt-1 opacity-70 tabular-nums">
                    {mg.assignedChannels.length} tranches
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* DCA Faders 1-4 */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              DCA Groups
            </div>
            <div className="space-y-2.5">
              {dcas.map((dca) => (
                <div
                  key={dca.id}
                  className="p-2.5 rounded bg-[#181b20] border border-[#2b3038] space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200 truncate">{dca.name}</span>
                    <span className="ui-lcd px-1.5 py-0.5 rounded-[3px] text-[10px] font-mono text-sky-300 tabular-nums">
                      {formatFader(dca.fader)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={dca.fader}
                      onChange={(e) => setDCAFader(dca.id, parseFloat(e.target.value))}
                      className="flex-1 cursor-pointer"
                    />
                    <button
                      onClick={() => toggleDCAMute(dca.id)}
                      className={`px-2 py-1 text-[10px] font-mono font-bold rounded-[3px] ${
                        dca.mute ? 'ui-btn-red' : 'ui-btn'
                      }`}
                    >
                      MUTE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sends on Faders (SoF) Quick Bus Select */}
      {activeTab === 'sof' && (
        <div className="flex-1 p-3 overflow-y-auto space-y-3">
          <div className="text-[11px] font-medium text-slate-400 leading-relaxed">
            Sélectionnez une destination pour basculer les faders en mode envoi direct :
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Retours Scène (Aux Buses 1-6)
            </div>
            {auxBuses.map((bus) => {
              const isSelected =
                sendsOnFaders.active &&
                sendsOnFaders.type === 'bus' &&
                sendsOnFaders.targetId === bus.id;
              return (
                <button
                  key={bus.id}
                  onClick={() => activateSendsOnFaders('bus', bus.id, `Bus ${bus.id} - ${bus.name}`)}
                  className={`w-full p-2 rounded text-left flex items-center justify-between transition-colors ${
                    isSelected ? 'ui-btn-amber font-bold' : 'ui-btn'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold truncate">{bus.name}</div>
                    <div className={`text-[10px] font-mono tabular-nums ${isSelected ? 'text-neutral-900/80' : 'text-slate-400'}`}>
                      Master : {formatFader(bus.fader)}
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] shrink-0 ${
                    isSelected ? 'bg-black/20 text-neutral-950 font-bold' : 'ui-lcd text-sky-300'
                  }`}>
                    BUS {bus.id}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Envois d'Effets (FX Sends 1-4)
            </div>
            {fxRacks.map((fx) => {
              const isSelected =
                sendsOnFaders.active &&
                sendsOnFaders.type === 'fx' &&
                sendsOnFaders.targetId === fx.id;
              return (
                <button
                  key={fx.id}
                  onClick={() => activateSendsOnFaders('fx', fx.id, `FX ${fx.id} - ${fx.name}`)}
                  className={`w-full p-2 rounded text-left flex items-center justify-between transition-colors ${
                    isSelected ? 'ui-btn-purple font-bold' : 'ui-btn'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold truncate">{fx.name}</div>
                    <div className={`text-[10px] font-mono tabular-nums ${isSelected ? 'text-white/85' : 'text-slate-400'}`}>
                      Retour : {formatFader(fx.returnFader)}
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-[3px] shrink-0 ${
                    isSelected ? 'bg-black/25 text-white font-bold' : 'ui-lcd text-purple-300'
                  }`}>
                    FX {fx.id}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};
