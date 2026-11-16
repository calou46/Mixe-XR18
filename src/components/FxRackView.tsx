import React, { useState } from 'react';
import { useXR18 } from '../context/XR18Context';
import { formatFader, meterDbToPercent } from '../utils/audioMath';
import {
  Sparkles,
  Clock,
  Power,
  VolumeX,
} from 'lucide-react';

export const FxRackView: React.FC = () => {
  const {
    fxRacks,
    fxMeters,
    setFXSendMasterFader,
    toggleFXSendMasterMute,
    setFXReturnFader,
    toggleFXReturnMute,
    toggleFXActive,
    updateFXParam,
    tapTempo,
    isFitScreen,
  } = useXR18();
  const [selectedFxId, setSelectedFxId] = useState<number>(1);

  const currentFx = fxRacks.find((f) => f.id === selectedFxId) || fxRacks[0];
  const currentMeters = fxMeters[currentFx.id];

  return (
    <div className="flex-1 flex flex-col ui-chassis overflow-hidden select-none h-full">
      {/* FX Rack Selector Tabs (Rack 1 to 4) */}
      <div className="ui-subbar flex items-center gap-2 p-2.5 shrink-0 overflow-x-auto">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono mr-1 whitespace-nowrap">
          FX Engines :
        </div>
        <div className="flex items-center gap-1.5">
          {fxRacks.map((fx) => (
            <button
              key={fx.id}
              onClick={() => setSelectedFxId(fx.id)}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-[4px] flex items-center gap-2 whitespace-nowrap ${
                selectedFxId === fx.id ? 'ui-btn-purple' : 'ui-btn'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: fx.active ? '#22c55e' : '#ef4444',
                  boxShadow: fx.active ? '0 0 6px #22c55e' : '0 0 4px #ef4444',
                }}
              />
              <span>FX {fx.id}</span>
              <span className="opacity-80 font-normal truncate max-w-[120px]">{fx.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main FX Hardware Faceplate Display */}
      <div className={`flex-1 ${isFitScreen ? 'p-3 overflow-hidden flex flex-col justify-center' : 'p-5 overflow-y-auto'}`}>
        <div className={`max-w-4xl w-full mx-auto rounded-lg bg-[#1d2026] border border-[#2c313a] shadow-2xl ${isFitScreen ? 'p-4' : 'p-6'}`}>
          {/* Rack Faceplate Header */}
          <div className={`flex flex-wrap items-center justify-between gap-4 ${isFitScreen ? 'pb-3' : 'pb-5'} border-b border-[#2b3038]`}>
            <div className="flex items-center gap-3">
              <div className="ui-lcd w-10 h-10 rounded-[4px] flex items-center justify-center text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-purple-400">SLOT FX {currentFx.id}</span>
                  <span className="text-[11px] text-slate-500 font-mono">· STEREO ENGINE</span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-100 tracking-tight">{currentFx.name}</h2>
              </div>
            </div>

            {/* FX Send Master + FX Return Master + Bypass Toggle */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              {/* Départ Master FX */}
              <div className="flex items-center gap-2.5 bg-[#14171b] border border-[#2a2f37] rounded px-3 py-2">
                <div className="relative w-2 h-8 bg-[#0b0d0f] rounded-[2px] border border-[#252a32] flex flex-col justify-end overflow-hidden p-[1px]">
                  <div
                    className="w-full transition-all duration-75"
                    style={{
                      height: `${meterDbToPercent(currentFx.sendMute ? -60 : currentMeters?.send.peak ?? -60)}%`,
                      background: 'linear-gradient(to top, #16a34a 0%, #22c55e 60%, #eab308 82%, #ef4444 100%)',
                    }}
                  />
                  <div className="absolute inset-0 ui-meter-led-mask pointer-events-none" />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-purple-400 font-bold">DÉPART FX{currentFx.id}</span>
                    <span className="ui-lcd px-1.5 py-0.2 rounded-[2px] text-[10px] font-mono font-bold text-slate-200 tabular-nums">
                      {formatFader(currentFx.sendFader ?? 0.75)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={currentFx.sendFader ?? 0.75}
                    onChange={(e) => setFXSendMasterFader(currentFx.id, parseFloat(e.target.value))}
                    onDoubleClick={() => setFXSendMasterFader(currentFx.id, 0.75)}
                    className="w-24 sm:w-28 cursor-pointer mt-1.5"
                  />
                </div>
                <button
                  onClick={() => toggleFXSendMasterMute(currentFx.id)}
                  className={`px-2 py-1.5 text-[10px] font-mono font-bold rounded-[3px] ${
                    currentFx.sendMute ? 'ui-btn-red' : 'ui-btn'
                  }`}
                  title="Couper le départ général vers cet effet"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Retour Master FX */}
              <div className="flex items-center gap-2.5 bg-[#14171b] border border-[#2a2f37] rounded px-3 py-2">
                <div className="flex gap-0.5 h-8">
                  <div className="relative w-1.5 h-full bg-[#0b0d0f] rounded-[2px] border border-[#252a32] flex flex-col justify-end overflow-hidden">
                    <div
                      className="w-full transition-all duration-75"
                      style={{
                        height: `${meterDbToPercent(currentFx.returnMute || !currentFx.active ? -60 : currentMeters?.returnLeft.peak ?? -60)}%`,
                        background: 'linear-gradient(to top, #16a34a 0%, #22c55e 60%, #eab308 82%, #ef4444 100%)',
                      }}
                    />
                    <div className="absolute inset-0 ui-meter-led-mask pointer-events-none" />
                  </div>
                  <div className="relative w-1.5 h-full bg-[#0b0d0f] rounded-[2px] border border-[#252a32] flex flex-col justify-end overflow-hidden">
                    <div
                      className="w-full transition-all duration-75"
                      style={{
                        height: `${meterDbToPercent(currentFx.returnMute || !currentFx.active ? -60 : currentMeters?.returnRight.peak ?? -60)}%`,
                        background: 'linear-gradient(to top, #16a34a 0%, #22c55e 60%, #eab308 82%, #ef4444 100%)',
                      }}
                    />
                    <div className="absolute inset-0 ui-meter-led-mask pointer-events-none" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-sky-400 font-bold">RETOUR FX{currentFx.id}</span>
                    <span className="ui-lcd px-1.5 py-0.2 rounded-[2px] text-[10px] font-mono font-bold text-slate-200 tabular-nums">
                      {formatFader(currentFx.returnFader)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={currentFx.returnFader}
                    onChange={(e) => setFXReturnFader(currentFx.id, parseFloat(e.target.value))}
                    onDoubleClick={() => setFXReturnFader(currentFx.id, 0.75)}
                    className="w-24 sm:w-28 cursor-pointer mt-1.5"
                  />
                </div>
                <button
                  onClick={() => toggleFXReturnMute(currentFx.id)}
                  className={`px-2 py-1.5 text-[10px] font-mono font-bold rounded-[3px] ${
                    currentFx.returnMute ? 'ui-btn-red' : 'ui-btn'
                  }`}
                  title="Couper le retour de cet effet"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => toggleFXActive(currentFx.id)}
                className={`px-3.5 py-2 text-xs font-mono font-bold rounded-[4px] flex items-center gap-2 ${
                  currentFx.active ? 'ui-btn-green' : 'ui-btn-red'
                }`}
              >
                <Power className="w-4 h-4" />
                <span>{currentFx.active ? 'ACTIF (ON)' : 'BYPASS'}</span>
              </button>
            </div>
          </div>

          {/* Effect-Specific Interactive Parameter Modules */}
          <div className="py-5">
            {/* 1. Vintage Room / Hall Reverb */}
            {currentFx.type === 'vintage_room' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded bg-[#14171b] border border-[#2a2f37] space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">Temps de réverb (Decay)</span>
                      <span className="ui-lcd px-1.5 py-0.5 rounded-[3px] font-mono text-purple-300 font-bold tabular-nums">
                        {(currentFx.params.decayTime || 2.4).toFixed(1)} s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.4}
                      max={8.0}
                      step={0.1}
                      value={currentFx.params.decayTime || 2.4}
                      onChange={(e) => updateFXParam(currentFx.id, 'decayTime', parseFloat(e.target.value))}
                      className="w-full cursor-pointer"
                    />
                    <div className="text-[10px] text-slate-500">Durée de la traîne acoustique</div>
                  </div>

                  <div className="p-4 rounded bg-[#14171b] border border-[#2a2f37] space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">Pré-Délai (Pre-Delay)</span>
                      <span className="ui-lcd px-1.5 py-0.5 rounded-[3px] font-mono text-purple-300 font-bold tabular-nums">
                        {currentFx.params.preDelay || 25} ms
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={150}
                      step={1}
                      value={currentFx.params.preDelay || 25}
                      onChange={(e) => updateFXParam(currentFx.id, 'preDelay', parseInt(e.target.value, 10))}
                      className="w-full cursor-pointer"
                    />
                    <div className="text-[10px] text-slate-500">Détachement entre voix et réverb</div>
                  </div>

                  <div className="p-4 rounded bg-[#14171b] border border-[#2a2f37] space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">Atténuation Aigus (High Cut)</span>
                      <span className="ui-lcd px-1.5 py-0.5 rounded-[3px] font-mono text-purple-300 font-bold tabular-nums">
                        {currentFx.params.highCut || 8500} Hz
                      </span>
                    </div>
                    <input
                      type="range"
                      min={2000}
                      max={16000}
                      step={100}
                      value={currentFx.params.highCut || 8500}
                      onChange={(e) => updateFXParam(currentFx.id, 'highCut', parseInt(e.target.value, 10))}
                      className="w-full cursor-pointer"
                    />
                    <div className="text-[10px] text-slate-500">Coupe les sibilances agressives</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded bg-[#14171b] border border-[#2a2f37] space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">Taille de Pièce (Size)</span>
                      <span className="ui-lcd px-1.5 py-0.5 rounded-[3px] font-mono text-purple-300 font-bold tabular-nums">
                        {currentFx.params.roomSize || 70} %
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={1}
                      value={currentFx.params.roomSize || 70}
                      onChange={(e) => updateFXParam(currentFx.id, 'roomSize', parseInt(e.target.value, 10))}
                      className="w-full cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded bg-[#14171b] border border-[#2a2f37] space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">Diffusion / Densité</span>
                      <span className="ui-lcd px-1.5 py-0.5 rounded-[3px] font-mono text-purple-300 font-bold tabular-nums">
                        {currentFx.params.diffusion || 65} %
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={currentFx.params.diffusion || 65}
                      onChange={(e) => updateFXParam(currentFx.id, 'diffusion', parseInt(e.target.value, 10))}
                      className="w-full cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. Stereo Tape Delay with TAP TEMPO */}
            {currentFx.type === 'stereo_delay' && (
              <div className="space-y-4">
                <div className="p-4 rounded bg-[#14171b] border border-[#2a2f37] flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="ui-lcd w-14 h-14 rounded-[4px] flex flex-col items-center justify-center">
                      <span className="text-[10px] font-mono text-amber-400 font-bold">BPM</span>
                      <span className="text-lg font-mono font-extrabold text-amber-300 tabular-nums">
                        {currentFx.params.tapTempoBpm || 120}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Synchronisation au Tempo</div>
                      <div className="text-sm font-bold text-slate-200 tabular-nums">
                        Délai actuel : {currentFx.params.delayTimeMs || 420} ms ({currentFx.params.syncSubdivision || '1/4'})
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => tapTempo(currentFx.id)}
                    className="ui-btn-amber w-full md:w-auto px-6 py-3 font-black text-sm font-mono rounded-[4px] flex items-center justify-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    <span>TAP TEMPO (TAP ICI)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded bg-[#14171b] border border-[#2a2f37] space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">Réinjection (Feedback)</span>
                      <span className="ui-lcd px-1.5 py-0.5 rounded-[3px] font-mono text-amber-300 font-bold tabular-nums">
                        {currentFx.params.feedback || 35} %
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={95}
                      step={1}
                      value={currentFx.params.feedback || 35}
                      onChange={(e) => updateFXParam(currentFx.id, 'feedback', parseInt(e.target.value, 10))}
                      className="w-full cursor-pointer"
                    />
                    <div className="text-[10px] text-slate-500">Nombre d'échos répétés</div>
                  </div>

                  <div className="p-4 rounded bg-[#14171b] border border-[#2a2f37] space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">Temps de retard</span>
                      <span className="ui-lcd px-1.5 py-0.5 rounded-[3px] font-mono text-amber-300 font-bold tabular-nums">
                        {currentFx.params.delayTimeMs || 420} ms
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={1200}
                      step={5}
                      value={currentFx.params.delayTimeMs || 420}
                      onChange={(e) => updateFXParam(currentFx.id, 'delayTimeMs', parseInt(e.target.value, 10))}
                      className="w-full cursor-pointer"
                    />
                  </div>

                  <div className="p-4 rounded bg-[#14171b] border border-[#2a2f37] flex flex-col justify-between gap-2">
                    <div>
                      <div className="text-xs text-slate-300 font-medium">Mode Ping-Pong Stéréo</div>
                      <div className="text-[10px] text-slate-500 mt-1">Rebonds alternés gauche/droite</div>
                    </div>
                    <button
                      onClick={() => updateFXParam(currentFx.id, 'pingPong', !currentFx.params.pingPong)}
                      className={`w-full py-2 text-xs font-mono font-bold rounded-[4px] ${
                        currentFx.params.pingPong ? 'ui-btn-amber' : 'ui-btn'
                      }`}
                    >
                      {currentFx.params.pingPong ? 'PING-PONG ACTIF' : 'DOUBLE MONO'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Dimension Chorus */}
            {currentFx.type === 'chorus_dimension' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded bg-[#14171b] border border-[#2a2f37] space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Vitesse (Rate)</span>
                    <span className="ui-lcd px-1.5 py-0.5 rounded-[3px] font-mono text-sky-300 font-bold tabular-nums">
                      {(currentFx.params.speed || 1.4).toFixed(1)} Hz
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={6.0}
                    step={0.1}
                    value={currentFx.params.speed || 1.4}
                    onChange={(e) => updateFXParam(currentFx.id, 'speed', parseFloat(e.target.value))}
                    className="w-full cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded bg-[#14171b] border border-[#2a2f37] space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Profondeur (Depth)</span>
                    <span className="ui-lcd px-1.5 py-0.5 rounded-[3px] font-mono text-sky-300 font-bold tabular-nums">
                      {currentFx.params.depth || 50} %
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={currentFx.params.depth || 50}
                    onChange={(e) => updateFXParam(currentFx.id, 'depth', parseInt(e.target.value, 10))}
                    className="w-full cursor-pointer"
                  />
                </div>

                <div className="p-4 rounded bg-[#14171b] border border-[#2a2f37] space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Nombre de Voix</span>
                    <span className="ui-lcd px-1.5 py-0.5 rounded-[3px] font-mono text-sky-300 font-bold tabular-nums">
                      {currentFx.params.voices || 4} Voix
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={8}
                    step={2}
                    value={currentFx.params.voices || 4}
                    onChange={(e) => updateFXParam(currentFx.id, 'voices', parseInt(e.target.value, 10))}
                    className="w-full cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* 4. Precision De-Esser */}
            {currentFx.type === 'de_esser' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded bg-[#14171b] border border-[#2a2f37] space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Seuil de détection (Threshold)</span>
                    <span className="ui-lcd px-1.5 py-0.5 rounded-[3px] font-mono text-red-400 font-bold tabular-nums">
                      {currentFx.params.threshold || -24} dB
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-60}
                    max={0}
                    step={1}
                    value={currentFx.params.threshold || -24}
                    onChange={(e) => updateFXParam(currentFx.id, 'threshold', parseInt(e.target.value, 10))}
                    className="w-full cursor-pointer"
                  />
                  <div className="text-[10px] text-slate-500">Atténue les 'S' et 'T' sifflants au-delà du seuil</div>
                </div>

                <div className="p-4 rounded bg-[#14171b] border border-[#2a2f37] space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Fréquence cible (Target Freq)</span>
                    <span className="ui-lcd px-1.5 py-0.5 rounded-[3px] font-mono text-red-400 font-bold tabular-nums">
                      {currentFx.params.frequency || 6200} Hz
                    </span>
                  </div>
                  <input
                    type="range"
                    min={3000}
                    max={10000}
                    step={100}
                    value={currentFx.params.frequency || 6200}
                    onChange={(e) => updateFXParam(currentFx.id, 'frequency', parseInt(e.target.value, 10))}
                    className="w-full cursor-pointer"
                  />
                  <div className="text-[10px] text-slate-500">Zone de sibilance vocale</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
