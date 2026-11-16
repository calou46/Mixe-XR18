import React, { useState } from 'react';
import { useXR18 } from '../context/XR18Context';
import { ChannelColor, ChannelIcon, ChannelEQ, ChannelGate, ChannelComp } from '../types/xr18';
import { RTAEqualizerView } from './RTAEqualizerView';
import { HardwareDynamicsView } from './HardwareDynamicsView';
import { formatFader, meterDbToPercent } from '../utils/audioMath';
import {
  X,
  Sliders,
  SlidersHorizontal,
  Activity,
  Layers,
  Sparkles,
  Check,
  Disc,
} from 'lucide-react';

interface ChannelInspectorModalProps {
  channelId: number | null;
  onClose: () => void;
}

export const ChannelInspectorModal: React.FC<ChannelInspectorModalProps> = ({
  channelId,
  onClose,
}) => {
  const {
    channels,
    updateChannelDetails,
    setChannelSend,
    auxBuses,
    fxRacks,
    meterLevels,
    busMeters,
    fxMeters,
    isMicActive,
  } = useXR18();
  const [activeTab, setActiveTab] = useState<'eq' | 'dynamics' | 'sends' | 'config'>('eq');

  if (channelId === null) return null;
  const channel = channels.find((c) => c.id === channelId);
  if (!channel) return null;

  const meter = meterLevels[channel.id] || { rms: -60, peak: -60, peakHold: -60, clip: false };

  const handleUpdateEQ = (updates: Partial<ChannelEQ>) => {
    updateChannelDetails(channel.id, {
      eq: { ...channel.eq, ...updates },
    });
  };

  const handleUpdateGate = (updates: Partial<ChannelGate>) => {
    updateChannelDetails(channel.id, {
      gate: { ...channel.gate, ...updates },
    });
  };

  const handleUpdateComp = (updates: Partial<ChannelComp>) => {
    updateChannelDetails(channel.id, {
      comp: { ...channel.comp, ...updates },
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 select-none">
      <div className="w-full max-w-5xl bg-[#1c2026] border border-[#303640] rounded-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header with channel badge and hardware rack branding */}
        <div className="ui-topbar p-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="ui-lcd w-10 h-10 rounded-[4px] flex flex-col items-center justify-center text-sky-400 font-mono font-bold">
              <span className="text-[9px] text-slate-500 font-normal">CH</span>
              <span className="text-sm leading-none">{channel.id < 10 ? `0${channel.id}` : channel.id}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-sky-400">XR18 STUDIO PROCESSOR</span>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">· RTA & DYNAMIQUE</span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-100 tracking-tight">
                {channel.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View tabs */}
            <div className="flex flex-wrap bg-[#101215] p-1 rounded-[4px] border border-[#2b3038] gap-1 text-[11px] font-mono font-bold">
              <button
                onClick={() => setActiveTab('eq')}
                className={`px-3 py-1.5 rounded-[3px] flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'eq' ? 'ui-btn-cyan' : 'ui-btn'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>EQ & RTA</span>
              </button>

              <button
                onClick={() => setActiveTab('dynamics')}
                className={`px-3 py-1.5 rounded-[3px] flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'dynamics' ? 'ui-btn-cyan' : 'ui-btn'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>GATE / COMP</span>
              </button>

              <button
                onClick={() => setActiveTab('sends')}
                className={`px-3 py-1.5 rounded-[3px] flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'sends' ? 'ui-btn-amber' : 'ui-btn'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>ENVOIS</span>
              </button>

              <button
                onClick={() => setActiveTab('config')}
                className={`px-3 py-1.5 rounded-[3px] flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'config' ? 'ui-btn-purple' : 'ui-btn'
                }`}
              >
                <Disc className="w-3.5 h-3.5" />
                <span>CONFIG</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="ui-btn p-2 rounded-[4px]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 ui-chassis">
          {/* 1. Parametric EQ with Real-Time RTA Background */}
          {activeTab === 'eq' && (
            <RTAEqualizerView
              eq={channel.eq}
              meter={meter}
              channelId={channel.id}
              channelName={channel.name}
              isMicActive={isMicActive}
              onUpdateEQ={handleUpdateEQ}
            />
          )}

          {/* 2. Hardware Dynamics (Noise Gate & Compressor with live analog GR meter) */}
          {activeTab === 'dynamics' && (
            <HardwareDynamicsView
              gate={channel.gate}
              comp={channel.comp}
              meter={meter}
              channelId={channel.id}
              channelName={channel.name}
              onUpdateGate={handleUpdateGate}
              onUpdateComp={handleUpdateComp}
            />
          )}

          {/* 3. Sends Matrix with dB Graduations & Destination VU Meters */}
          {activeTab === 'sends' && (
            <div className="space-y-6">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 font-mono">
                  Envois Retours Scène (Aux Buses 1-6)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {auxBuses.map((b) => {
                    const bm = busMeters[b.id] || { rms: -60, peak: -60, peakHold: -60, clip: false };
                    const sendVal = channel.sends[b.id] ?? 0;
                    return (
                      <div key={b.id} className="p-3.5 bg-[#181b20] rounded border border-[#2b3038] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200">
                            <span className="font-mono text-amber-400 mr-1.5">BUS 0{b.id}</span>
                            {b.name}
                          </span>
                          <span className="ui-lcd px-1.5 py-0.5 rounded-[2px] font-mono text-amber-300 font-bold tabular-nums">
                            {formatFader(sendVal)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={sendVal}
                          onChange={(e) =>
                            setChannelSend(channel.id, 'bus', b.id, parseFloat(e.target.value))
                          }
                          onDoubleClick={() => setChannelSend(channel.id, 'bus', b.id, 0.75)}
                          className="w-full cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] font-mono text-slate-500 px-0.5">
                          <span>-∞</span>
                          <span>-30</span>
                          <span>-10</span>
                          <span className="text-sky-300 font-bold">0 dB</span>
                          <span className="text-red-400">+10</span>
                        </div>
                        {/* Destination Bus Live LED VU Bar */}
                        <div className="relative h-2 w-full bg-[#0b0d0f] rounded-[2px] overflow-hidden border border-[#252a32]">
                          <div
                            className="h-full transition-all duration-75"
                            style={{
                              width: `${meterDbToPercent(b.mute ? -60 : bm.peak)}%`,
                              background: 'linear-gradient(to right, #16a34a 0%, #22c55e 60%, #eab308 82%, #ef4444 100%)',
                            }}
                          />
                          <div className="absolute inset-0 ui-meter-led-mask-x pointer-events-none" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 font-mono">
                  Envois Racks d'Effets (FX Sends 1-4)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fxRacks.map((fx) => {
                    const fm = fxMeters[fx.id]?.send || { rms: -60, peak: -60, peakHold: -60, clip: false };
                    const sendVal = channel.fxSends[fx.id] ?? 0;
                    return (
                      <div key={fx.id} className="p-3.5 bg-[#181b20] rounded border border-[#2b3038] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-200">
                            <span className="font-mono text-purple-400 mr-1.5">FX {fx.id}</span>
                            {fx.name}
                          </span>
                          <span className="ui-lcd px-1.5 py-0.5 rounded-[2px] font-mono text-purple-300 font-bold tabular-nums">
                            {formatFader(sendVal)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={sendVal}
                          onChange={(e) =>
                            setChannelSend(channel.id, 'fx', fx.id, parseFloat(e.target.value))
                          }
                          onDoubleClick={() => setChannelSend(channel.id, 'fx', fx.id, 0.75)}
                          className="w-full cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] font-mono text-slate-500 px-0.5">
                          <span>-∞</span>
                          <span>-30</span>
                          <span>-10</span>
                          <span className="text-sky-300 font-bold">0 dB</span>
                          <span className="text-red-400">+10</span>
                        </div>
                        {/* Destination FX Send Live LED VU Bar */}
                        <div className="relative h-2 w-full bg-[#0b0d0f] rounded-[2px] overflow-hidden border border-[#252a32]">
                          <div
                            className="h-full transition-all duration-75"
                            style={{
                              width: `${meterDbToPercent(fx.sendMute ? -60 : fm.peak)}%`,
                              background: 'linear-gradient(to right, #16a34a 0%, #22c55e 60%, #eab308 82%, #ef4444 100%)',
                            }}
                          />
                          <div className="absolute inset-0 ui-meter-led-mask-x pointer-events-none" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 4. Configuration */}
          {activeTab === 'config' && (
            <div className="space-y-5 max-w-lg">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nom de la Tranche</label>
                <input
                  type="text"
                  value={channel.name}
                  onChange={(e) => updateChannelDetails(channel.id, { name: e.target.value })}
                  className="ui-lcd w-full px-3 py-2 rounded text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Couleur Scribble Strip</label>
                <div className="flex gap-2">
                  {(['red', 'amber', 'yellow', 'green', 'teal', 'blue', 'purple', 'magenta', 'gray'] as ChannelColor[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateChannelDetails(channel.id, { color: c })}
                      className={`w-8 h-8 rounded-[4px] border-2 transition-transform ${
                        channel.color === c ? 'scale-110 border-white' : 'border-transparent'
                      }`}
                      style={{
                        backgroundColor:
                          c === 'red' ? '#ef4444' :
                          c === 'amber' ? '#f59e0b' :
                          c === 'yellow' ? '#eab308' :
                          c === 'green' ? '#10b981' :
                          c === 'teal' ? '#14b8a6' :
                          c === 'blue' ? '#0ea5e9' :
                          c === 'purple' ? '#a855f7' :
                          c === 'magenta' ? '#ec4899' : '#525252',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-[#2b3038] bg-[#14171b] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Traitement DSP 40-Bit Floating Point XR18</span>
          </div>
          <button
            onClick={onClose}
            className="ui-btn-cyan px-4 py-1.5 text-xs font-mono font-bold rounded-[4px]"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
