import React from 'react';
import { useXR18 } from '../context/XR18Context';
import { meterDbToPercent } from '../utils/audioMath';

export const MeterBridge: React.FC<{ isCollapsed?: boolean; onToggleCollapse?: () => void }> = ({
  isCollapsed,
  onToggleCollapse,
}) => {
  const { channels, meterLevels, master, masterMeters, selectChannel, selectedChannelId, isFitScreen } = useXR18();

  if (isCollapsed) return null;

  return (
    <div className={`bg-[#14171a] border-b border-[#0c0e10] ${isFitScreen ? 'px-2 py-1 overflow-hidden' : 'px-4 py-1.5 overflow-x-auto'} select-none shrink-0`}>
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider font-mono">
            Vumètres temps réel · 18 Tranches + Master LR
          </span>
          <span className="text-[9px] text-neutral-500 font-mono hidden sm:inline">
            -60 dBFS à +6 dBFS
          </span>
        </div>
      </div>

      <div className={`flex items-end gap-1 ${isFitScreen ? 'w-full h-11' : 'min-w-[850px] h-16'} pt-0.5 pb-0.5`}>
        {/* 18 Channel meters */}
        {channels.map((ch) => {
          const m = meterLevels[ch.id] || { rms: -60, peak: -60, peakHold: -60, clip: false };
          const p = meterDbToPercent(ch.mute ? -60 : m.peak);
          const hold = meterDbToPercent(ch.mute ? -60 : m.peakHold);
          const isSelected = selectedChannelId === ch.id;

          return (
            <div
              key={ch.id}
              onClick={() => selectChannel(ch.id)}
              className={`flex-1 flex flex-col items-center h-full cursor-pointer group transition-opacity ${
                ch.mute ? 'opacity-40' : 'opacity-100'
              }`}
              title={`CH ${ch.id}: ${ch.name} (${m.peak.toFixed(1)} dB)`}
            >
              {/* LED meter bar */}
              <div
                className={`w-full flex-1 bg-[#0b0d0f] rounded-xs border relative flex flex-col justify-end overflow-hidden p-[1px] ${
                  isSelected ? 'border-sky-400' : 'border-[#252930]'
                }`}
              >
                <div
                  className={`w-full h-1 rounded-xs mb-0.5 ${
                    m.clip ? 'bg-red-500 shadow-xs shadow-red-500' : 'bg-red-950/30'
                  }`}
                />

                <div className="relative w-full flex-1 bg-[#0f1215] rounded-xs overflow-hidden flex flex-col justify-end">
                  <div
                    className="w-full transition-all duration-75 ease-out rounded-xs relative"
                    style={{
                      height: `${p}%`,
                      background:
                        'linear-gradient(to top, #22c55e 0%, #22c55e 60%, #eab308 82%, #f97316 92%, #ef4444 100%)',
                    }}
                  >
                    <div className="absolute inset-0 ui-meter-led-mask pointer-events-none" />
                  </div>
                </div>

                {hold > 0 && !ch.mute && (
                  <div
                    className="absolute left-0 right-0 h-[1.5px] bg-white pointer-events-none"
                    style={{ bottom: `${hold}%` }}
                  />
                )}
              </div>

              <div className="w-full text-center mt-0.5">
                <div className="text-[8px] font-mono text-neutral-400 truncate">
                  {ch.id < 10 ? `0${ch.id}` : ch.id}
                </div>
              </div>
            </div>
          );
        })}

        <div className="w-px h-full bg-[#2b3038] mx-1" />

        {/* Master L and R meters */}
        <div className="flex gap-1 items-end h-full">
          <div className="w-4 flex flex-col items-center h-full">
            <div className="w-full flex-1 bg-[#0b0d0f] rounded-xs border border-[#252930] relative flex flex-col justify-end overflow-hidden p-[1px]">
              <div
                className="w-full transition-all duration-75 ease-out rounded-xs relative"
                style={{
                  height: `${meterDbToPercent(master.mute ? -60 : masterMeters.left.peak)}%`,
                  background:
                    'linear-gradient(to top, #22c55e 0%, #22c55e 60%, #eab308 82%, #f97316 92%, #ef4444 100%)',
                }}
              >
                <div className="absolute inset-0 ui-meter-led-mask pointer-events-none" />
              </div>
            </div>
            <div className="text-[8px] font-mono text-sky-400 font-bold mt-0.5">L</div>
          </div>

          <div className="w-4 flex flex-col items-center h-full">
            <div className="w-full flex-1 bg-[#0b0d0f] rounded-xs border border-[#252930] relative flex flex-col justify-end overflow-hidden p-[1px]">
              <div
                className="w-full transition-all duration-75 ease-out rounded-xs relative"
                style={{
                  height: `${meterDbToPercent(master.mute ? -60 : masterMeters.right.peak)}%`,
                  background:
                    'linear-gradient(to top, #22c55e 0%, #22c55e 60%, #eab308 82%, #f97316 92%, #ef4444 100%)',
                }}
              >
                <div className="absolute inset-0 ui-meter-led-mask pointer-events-none" />
              </div>
            </div>
            <div className="text-[8px] font-mono text-sky-400 font-bold mt-0.5">R</div>
          </div>
        </div>
      </div>
    </div>
  );
};
