import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  ChannelStripData,
  AuxBusData,
  FXRackData,
  MasterLRData,
  DCAData,
  MuteGroupData,
  MacroData,
  SceneData,
  MeterLevel,
  OSCLogItem,
} from '../types/xr18';
import {
  initialChannels,
  initialAuxBuses,
  initialFXRacks,
  initialMasterLR,
  initialDCAs,
  initialMuteGroups,
  initialMacros,
  factoryScenes,
} from '../data/initialData';
import { faderToDb, dbToFader } from '../utils/audioMath';
import { xr18Osc } from '../utils/xr18Osc';

interface SendsOnFadersMode {
  active: boolean;
  type: 'bus' | 'fx';
  targetId: number; // busId 1-6 or fxId 1-4
  targetName: string;
}

interface XR18ContextType {
  // State
  channels: ChannelStripData[];
  auxBuses: AuxBusData[];
  fxRacks: FXRackData[];
  master: MasterLRData;
  dcas: DCAData[];
  muteGroups: MuteGroupData[];
  macros: MacroData[];
  scenes: SceneData[];
  currentSceneId: string;
  selectedChannelId: number | null;
  meterLevels: Record<number, MeterLevel>;
  busMeters: Record<number, MeterLevel>;
  fxMeters: Record<number, { send: MeterLevel; returnLeft: MeterLevel; returnRight: MeterLevel }>;
  masterMeters: { left: MeterLevel; right: MeterLevel };
  sendsOnFaders: SendsOnFadersMode;
  audioSimMode: 'live_band' | 'sine_test' | 'pink_noise' | 'mic_live' | 'idle';
  isMicActive: boolean;
  oscLogs: OSCLogItem[];
  pendingMacroConfirmation: MacroData | null;
  isFullscreen: boolean;
  isFitScreen: boolean;
  fullscreenHelpOpen: boolean;
  isInIframe: boolean;

  // Actions
  toggleFullscreen: () => void;
  toggleFitScreen: () => void;
  setFullscreenHelpOpen: (open: boolean) => void;
  selectChannel: (id: number | null) => void;
  setChannelFader: (id: number, val: number) => void;
  setChannelPan: (id: number, pan: number) => void;
  setChannelGain: (id: number, gain: number) => void;
  toggleChannelMute: (id: number) => void;
  toggleChannelSolo: (id: number) => void;
  toggleChannel48V: (id: number) => void;
  toggleChannelPhase: (id: number) => void;
  setChannelSend: (chId: number, targetType: 'bus' | 'fx', targetId: number, val: number) => void;
  updateChannelDetails: (id: number, updates: Partial<ChannelStripData>) => void;

  setBusFader: (id: number, val: number) => void;
  setBusPan: (id: number, pan: number) => void;
  toggleBusMute: (id: number) => void;
  toggleBusSolo: (id: number) => void;

  setFXSendMasterFader: (id: number, val: number) => void;
  toggleFXSendMasterMute: (id: number) => void;
  toggleFXSendMasterSolo: (id: number) => void;
  setFXReturnFader: (id: number, val: number) => void;
  setFXReturnPan: (id: number, pan: number) => void;
  toggleFXReturnMute: (id: number) => void;
  toggleFXReturnSolo: (id: number) => void;
  toggleFXActive: (id: number) => void;
  updateFXParam: (fxId: number, paramKey: string, val: any) => void;
  tapTempo: (fxId: number) => void;

  setMasterFader: (val: number) => void;
  toggleMasterMute: (mute?: boolean) => void;
  clearAllSolos: () => void;

  setDCAFader: (id: number, val: number) => void;
  toggleDCAMute: (id: number) => void;
  toggleMuteGroup: (id: number) => void;

  // Sends on Faders
  activateSendsOnFaders: (type: 'bus' | 'fx', targetId: number, name: string) => void;
  exitSendsOnFaders: () => void;

  // Macros
  triggerMacro: (macro: MacroData) => void;
  confirmPendingMacro: () => void;
  cancelPendingMacro: () => void;
  addMacro: (macro: MacroData) => void;
  updateMacro: (id: string, macro: Partial<MacroData>) => void;
  deleteMacro: (id: string) => void;

  // Scenes
  recallScene: (sceneId: string) => void;
  saveNewScene: (name: string, description: string, category: SceneData['category']) => void;
  updateCurrentScene: () => void;
  deleteScene: (sceneId: string) => void;
  exportScenesJson: () => string;
  importScenesJson: (json: string) => boolean;

  // Audio Sim & Real Mic
  setAudioSimMode: (mode: 'live_band' | 'sine_test' | 'pink_noise' | 'mic_live' | 'idle') => void;
  toggleMicLive: () => Promise<void>;
}

const XR18Context = createContext<XR18ContextType | null>(null);

export const XR18Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [channels, setChannels] = useState<ChannelStripData[]>(initialChannels);
  const [auxBuses, setAuxBuses] = useState<AuxBusData[]>(initialAuxBuses);
  const [fxRacks, setFxRacks] = useState<FXRackData[]>(initialFXRacks);
  const [master, setMaster] = useState<MasterLRData>(initialMasterLR);
  const [dcas, setDcas] = useState<DCAData[]>(initialDCAs);
  const [muteGroups, setMuteGroups] = useState<MuteGroupData[]>(initialMuteGroups);
  const [macros, setMacros] = useState<MacroData[]>(initialMacros);
  const [scenes, setScenes] = useState<SceneData[]>(factoryScenes);
  const [currentSceneId, setCurrentSceneId] = useState<string>('scene-rock-band');
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);

  const [sendsOnFaders, setSendsOnFaders] = useState<SendsOnFadersMode>({
    active: false,
    type: 'bus',
    targetId: 1,
    targetName: 'Wedge Face L',
  });

  const [audioSimMode, setAudioSimMode] = useState<'live_band' | 'sine_test' | 'pink_noise' | 'mic_live' | 'idle'>('live_band');
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [oscLogs, setOscLogs] = useState<OSCLogItem[]>([]);
  const [pendingMacroConfirmation, setPendingMacroConfirmation] = useState<MacroData | null>(null);

  // Fullscreen and Zero-Scrollbar (Fit Screen) States
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isFitScreen, setIsFitScreen] = useState<boolean>(true); // default true for clean no-scrollbar experience!
  const [fullscreenHelpOpen, setFullscreenHelpOpen] = useState<boolean>(false);
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    const checkStandalone = () => {
      return (
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: standalone)').matches
      );
    };

    const handleFsChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      const active = !!(doc.fullscreenElement || doc.webkitFullscreenElement) || checkStandalone();
      setIsFullscreen(active);
      if (active) {
        setIsFitScreen(true);
      }
    };

    handleFsChange();
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };
    const docEl = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };

    const activeFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement);

    if (!activeFs) {
      setIsFitScreen(true);
      try {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen({ navigationUI: 'hide' });
          setIsFullscreen(true);
          return;
        }
        if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
          setIsFullscreen(true);
          return;
        }
        setFullscreenHelpOpen(true);
      } catch {
        setFullscreenHelpOpen(true);
      }
    } else {
      try {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      } catch {
        // ignore exit error
      }
      setIsFullscreen(false);
    }
  }, []);

  const toggleFitScreen = useCallback(() => {
    setIsFitScreen((prev) => !prev);
  }, []);

  // Meter Levels map
  const [meterLevels, setMeterLevels] = useState<Record<number, MeterLevel>>(() => {
    const init: Record<number, MeterLevel> = {};
    for (let i = 1; i <= 18; i++) {
      init[i] = { rms: -60, peak: -60, peakHold: -60, clip: false };
    }
    return init;
  });

  const [busMeters, setBusMeters] = useState<Record<number, MeterLevel>>(() => {
    const init: Record<number, MeterLevel> = {};
    for (let i = 1; i <= 6; i++) {
      init[i] = { rms: -60, peak: -60, peakHold: -60, clip: false };
    }
    return init;
  });

  const [fxMeters, setFxMeters] = useState<
    Record<number, { send: MeterLevel; returnLeft: MeterLevel; returnRight: MeterLevel }>
  >(() => {
    const init: Record<number, { send: MeterLevel; returnLeft: MeterLevel; returnRight: MeterLevel }> = {};
    for (let i = 1; i <= 4; i++) {
      init[i] = {
        send: { rms: -60, peak: -60, peakHold: -60, clip: false },
        returnLeft: { rms: -60, peak: -60, peakHold: -60, clip: false },
        returnRight: { rms: -60, peak: -60, peakHold: -60, clip: false },
      };
    }
    return init;
  });

  const [masterMeters, setMasterMeters] = useState<{ left: MeterLevel; right: MeterLevel }>({
    left: { rms: -60, peak: -60, peakHold: -60, clip: false },
    right: { rms: -60, peak: -60, peakHold: -60, clip: false },
  });

  // Tap tempo state
  const tapTimesRef = useRef<number[]>([]);

  // Web Audio Context for Real Microphone or Synthesis
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micLevelRef = useRef<number>(-60);

  // Subscribe to OSC logs
  useEffect(() => {
    const unsub = xr18Osc.subscribeLogs((log) => {
      setOscLogs((prev) => [log, ...prev.slice(0, 39)]);
    });
    return unsub;
  }, []);

  // Real-time Meter Animation Loop
  const peakHoldCountersRef = useRef<Record<string, number>>({});
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let lastTime = performance.now();

    const updateMeters = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const tSec = time / 1000;
      const bpm = 120;
      const beatPeriod = 60 / bpm;
      const currentBeat = (tSec % beatPeriod) / beatPeriod;
      const beatIndex = Math.floor(tSec / beatPeriod) % 4; // 0, 1, 2, 3

      // Check mic input if active
      if (micAnalyserRef.current) {
        const dataArr = new Uint8Array(micAnalyserRef.current.frequencyBinCount);
        micAnalyserRef.current.getByteTimeDomainData(dataArr);
        let sum = 0;
        for (let i = 0; i < dataArr.length; i++) {
          const v = (dataArr[i] - 128) / 128;
          sum += v * v;
        }
        const rmsVal = Math.sqrt(sum / dataArr.length);
        const db = rmsVal > 0.0001 ? 20 * Math.log10(rmsVal) + 12 : -60;
        micLevelRef.current = Math.max(-60, Math.min(3, db));
      }

      setMeterLevels((prev) => {
        const next: Record<number, MeterLevel> = {};
        let masterSumL = 0;
        let masterSumR = 0;
        const busSums: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        const fxSendSums: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

        channels.forEach((ch) => {
          const prevMeter = prev[ch.id] || { rms: -60, peak: -60, peakHold: -60, clip: false };
          let baseEnergy = -60;

          if (audioSimMode === 'live_band' && !ch.mute) {
            // Channel rhythmic pattern
            switch (ch.id) {
              case 1: // Kick (beats 1, 3 + extra syncopation)
                if ((beatIndex === 0 || beatIndex === 2) && currentBeat < 0.25) {
                  baseEnergy = -6 + (1 - currentBeat / 0.25) * 8;
                } else if (beatIndex === 1 && currentBeat > 0.6 && currentBeat < 0.85) {
                  baseEnergy = -9 + Math.random() * 3;
                } else {
                  baseEnergy = -35 + Math.random() * 5;
                }
                break;
              case 2: // Snare (beats 2 and 4)
                if ((beatIndex === 1 || beatIndex === 3) && currentBeat < 0.3) {
                  baseEnergy = -4 + (1 - currentBeat / 0.3) * 7;
                } else {
                  baseEnergy = -42 + Math.random() * 4;
                }
                break;
              case 3: // Hi-Hat (continuous 8th/16th notes)
                const hatStep = (currentBeat * 4) % 1;
                baseEnergy = -18 + (1 - hatStep) * 9 + (Math.sin(time * 0.03) * 3);
                break;
              case 4: // Tom 1 (fills on bar 4)
              case 5: // Tom 2
                if (beatIndex === 3 && currentBeat > 0.5) {
                  baseEnergy = -8 + Math.random() * 6;
                } else {
                  baseEnergy = -55;
                }
                break;
              case 8: // Bass DI (steady groove)
                baseEnergy = -12 + Math.sin(time * 0.008) * 6 + (Math.cos(time * 0.02) * 3);
                break;
              case 9: // Guitar L
              case 10: // Guitar R
                baseEnergy = -14 + Math.sin(time * 0.005 + ch.id) * 7 + (Math.sin(time * 0.015) * 4);
                break;
              case 11: // Acoustic Guitar
                baseEnergy = -16 + Math.sin(time * 0.006) * 6;
                break;
              case 12: // Keys
              case 13:
                baseEnergy = -18 + Math.sin(time * 0.004) * 8;
                break;
              case 14: // Lead Vocal
                if (isMicActive) {
                  baseEnergy = micLevelRef.current;
                } else {
                  // expressive vocal phrase curve
                  const phraseCycle = (tSec % 16);
                  if (phraseCycle < 11) {
                    baseEnergy = -10 + Math.sin(time * 0.007) * 7 + Math.sin(time * 0.019) * 4;
                  } else {
                    baseEnergy = -45; // singer resting between phrases
                  }
                }
                break;
              case 15: // Backing Vocals
              case 16:
                const chCycle = (tSec % 8);
                if (chCycle > 3 && chCycle < 7) {
                  baseEnergy = -15 + Math.sin(time * 0.009) * 6;
                } else {
                  baseEnergy = -50;
                }
                break;
              default:
                baseEnergy = -48 + Math.sin(time * 0.003) * 5;
            }
          } else if (audioSimMode === 'sine_test' && !ch.mute) {
            baseEnergy = -18;
          } else if (audioSimMode === 'pink_noise' && !ch.mute) {
            baseEnergy = -20 + (Math.random() - 0.5) * 4;
          } else if (audioSimMode === 'mic_live' && isMicActive && ch.id === 14) {
            baseEnergy = micLevelRef.current;
          }

          // Factor in channel fader & preamp gain
          const faderDb = faderToDb(ch.fader);
          let targetPeak = baseEnergy + (faderDb - 0); // calibrated around 0dB
          if (ch.mute) targetPeak = -60;

          // Smooth RMS and Peak
          const smoothing = 0.28;
          const currentPeak = Math.max(-60, Math.min(6, prevMeter.peak * (1 - smoothing) + targetPeak * smoothing));
          const currentRms = currentPeak - 4.5;

          // Peak Hold logic
          let hold = prevMeter.peakHold;
          if (currentPeak > hold) {
            hold = currentPeak;
            peakHoldCountersRef.current[`ch_${ch.id}`] = time + 1200; // hold 1.2s
          } else if (time > (peakHoldCountersRef.current[`ch_${ch.id}`] || 0)) {
            hold = Math.max(-60, hold - 35 * dt); // decay 35 dB/s
          }

          const clip = currentPeak >= 0.0;

          next[ch.id] = {
            rms: currentRms,
            peak: currentPeak,
            peakHold: hold,
            clip,
          };

          // Accumulate into Master L/R, Aux Buses 1-6, and FX Sends 1-4
          if (!ch.mute) {
            const linearCh = Math.pow(10, currentPeak / 20);
            if (!master.mute) {
              const panNorm = (ch.pan + 100) / 200; // 0 to 1
              masterSumL += linearCh * (1 - panNorm);
              masterSumR += linearCh * panNorm;
            }

            // Pre-fader / post-fader channel contribution to Aux Buses 1-6
            const linearBase = Math.pow(10, Math.max(-60, baseEnergy) / 20);
            for (let b = 1; b <= 6; b++) {
              const sendAmt = ch.sends[b] ?? 0;
              if (sendAmt > 0.001) {
                const sendLinear = Math.pow(10, faderToDb(sendAmt) / 20);
                busSums[b] += linearBase * sendLinear * 0.75;
              }
            }

            // Post-fader channel contribution to FX Sends 1-4
            for (let fxId = 1; fxId <= 4; fxId++) {
              const fxAmt = ch.fxSends[fxId] ?? 0;
              if (fxAmt > 0.001) {
                const fxLinear = Math.pow(10, faderToDb(fxAmt) / 20);
                fxSendSums[fxId] += linearCh * fxLinear * 0.85;
              }
            }
          }
        });

        // Update Aux Bus 1-6 Meters
        setBusMeters((prevBus) => {
          const nextBus: Record<number, MeterLevel> = {};
          auxBuses.forEach((bus) => {
            const prevM = prevBus[bus.id] || { rms: -60, peak: -60, peakHold: -60, clip: false };
            const busDb =
              bus.mute || busSums[bus.id] <= 0.0008
                ? -60
                : 20 * Math.log10(busSums[bus.id]) + faderToDb(bus.fader);
            const peak = Math.max(-60, Math.min(6, prevM.peak * 0.68 + busDb * 0.32));
            let hold = prevM.peakHold;
            if (peak > hold) {
              hold = peak;
              peakHoldCountersRef.current[`bus_${bus.id}`] = time + 1200;
            } else if (time > (peakHoldCountersRef.current[`bus_${bus.id}`] || 0)) {
              hold = Math.max(-60, hold - 32 * dt);
            }
            nextBus[bus.id] = { rms: peak - 4, peak, peakHold: hold, clip: peak >= 0 };
          });
          return nextBus;
        });

        // Update FX Send & Return 1-4 Meters and add active returns into Master
        const fxReturnLinearL: number[] = [];
        const fxReturnLinearR: number[] = [];
        setFxMeters((prevFx) => {
          const nextFx: Record<number, { send: MeterLevel; returnLeft: MeterLevel; returnRight: MeterLevel }> = {};
          fxRacks.forEach((fx) => {
            const prevItem = prevFx[fx.id] || {
              send: { rms: -60, peak: -60, peakHold: -60, clip: false },
              returnLeft: { rms: -60, peak: -60, peakHold: -60, clip: false },
              returnRight: { rms: -60, peak: -60, peakHold: -60, clip: false },
            };
            const sendFader = fx.sendFader ?? 0.75;
            const sendMuted = !!fx.sendMute;
            const sendRawDb =
              sendMuted || fxSendSums[fx.id] <= 0.0008
                ? -60
                : 20 * Math.log10(fxSendSums[fx.id]) + faderToDb(sendFader);
            const sendPeak = Math.max(-60, Math.min(6, prevItem.send.peak * 0.68 + sendRawDb * 0.32));
            let sendHold = prevItem.send.peakHold;
            if (sendPeak > sendHold) {
              sendHold = sendPeak;
              peakHoldCountersRef.current[`fx_s_${fx.id}`] = time + 1200;
            } else if (time > (peakHoldCountersRef.current[`fx_s_${fx.id}`] || 0)) {
              sendHold = Math.max(-60, sendHold - 32 * dt);
            }

            // Return tail & stereo modulation
            const retPanNorm = ((fx.returnPan ?? 0) + 100) / 200;
            const retEnabled = fx.active && !fx.returnMute;
            const retFaderDb = faderToDb(fx.returnFader);
            const stereoLMod = Math.sin(time * 0.003 + fx.id) * 1.4;
            const stereoRMod = Math.cos(time * 0.003 + fx.id) * 1.4;

            const retRawL =
              !retEnabled || sendPeak <= -58
                ? -60
                : sendPeak + retFaderDb + stereoLMod + (retPanNorm > 0.5 ? -((retPanNorm - 0.5) * 12) : 0);
            const retRawR =
              !retEnabled || sendPeak <= -58
                ? -60
                : sendPeak + retFaderDb + stereoRMod + (retPanNorm < 0.5 ? -((0.5 - retPanNorm) * 12) : 0);

            // Slower release tail for reverb/delay feel
            const retSmoothL = retRawL > prevItem.returnLeft.peak ? 0.38 : 0.12;
            const retSmoothR = retRawR > prevItem.returnRight.peak ? 0.38 : 0.12;
            const retPeakL = Math.max(-60, Math.min(6, prevItem.returnLeft.peak * (1 - retSmoothL) + retRawL * retSmoothL));
            const retPeakR = Math.max(-60, Math.min(6, prevItem.returnRight.peak * (1 - retSmoothR) + retRawR * retSmoothR));

            let holdL = prevItem.returnLeft.peakHold;
            if (retPeakL > holdL) {
              holdL = retPeakL;
              peakHoldCountersRef.current[`fx_rl_${fx.id}`] = time + 1200;
            } else if (time > (peakHoldCountersRef.current[`fx_rl_${fx.id}`] || 0)) {
              holdL = Math.max(-60, holdL - 28 * dt);
            }

            let holdR = prevItem.returnRight.peakHold;
            if (retPeakR > holdR) {
              holdR = retPeakR;
              peakHoldCountersRef.current[`fx_rr_${fx.id}`] = time + 1200;
            } else if (time > (peakHoldCountersRef.current[`fx_rr_${fx.id}`] || 0)) {
              holdR = Math.max(-60, holdR - 28 * dt);
            }

            if (retEnabled && !master.mute) {
              fxReturnLinearL.push(Math.pow(10, retPeakL / 20) * 0.4);
              fxReturnLinearR.push(Math.pow(10, retPeakR / 20) * 0.4);
            }

            nextFx[fx.id] = {
              send: { rms: sendPeak - 4, peak: sendPeak, peakHold: sendHold, clip: sendPeak >= 0 },
              returnLeft: { rms: retPeakL - 4, peak: retPeakL, peakHold: holdL, clip: retPeakL >= 0 },
              returnRight: { rms: retPeakR - 4, peak: retPeakR, peakHold: holdR, clip: retPeakR >= 0 },
            };
          });
          return nextFx;
        });

        masterSumL += fxReturnLinearL.reduce((a, b) => a + b, 0);
        masterSumR += fxReturnLinearR.reduce((a, b) => a + b, 0);

        // Master Meters update
        const masterFaderDb = faderToDb(master.fader);
        const lDb = masterSumL > 0.001 ? 20 * Math.log10(masterSumL) + masterFaderDb : -60;
        const rDb = masterSumR > 0.001 ? 20 * Math.log10(masterSumR) + masterFaderDb : -60;

        setMasterMeters((prevMaster) => {
          const lPeak = Math.max(-60, Math.min(6, prevMaster.left.peak * 0.7 + lDb * 0.3));
          const rPeak = Math.max(-60, Math.min(6, prevMaster.right.peak * 0.7 + rDb * 0.3));

          let lHold = prevMaster.left.peakHold;
          if (lPeak > lHold) {
            lHold = lPeak;
            peakHoldCountersRef.current['master_l'] = time + 1400;
          } else if (time > (peakHoldCountersRef.current['master_l'] || 0)) {
            lHold = Math.max(-60, lHold - 30 * dt);
          }

          let rHold = prevMaster.right.peakHold;
          if (rPeak > rHold) {
            rHold = rPeak;
            peakHoldCountersRef.current['master_r'] = time + 1400;
          } else if (time > (peakHoldCountersRef.current['master_r'] || 0)) {
            rHold = Math.max(-60, rHold - 30 * dt);
          }

          return {
            left: { rms: lPeak - 4, peak: lPeak, peakHold: lHold, clip: lPeak >= 0 },
            right: { rms: rPeak - 4, peak: rPeak, peakHold: rHold, clip: rPeak >= 0 },
          };
        });

        return next;
      });

      animationFrameRef.current = requestAnimationFrame(updateMeters);
    };

    animationFrameRef.current = requestAnimationFrame(updateMeters);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [channels, auxBuses, fxRacks, master, audioSimMode, isMicActive]);

  // Channel Actions
  const selectChannel = useCallback((id: number | null) => {
    setSelectedChannelId(id);
  }, []);

  const setChannelFader = useCallback((id: number, val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setChannels((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, fader: clamped } : ch))
    );
    xr18Osc.setChannelFader(id, clamped);
  }, []);

  const setChannelPan = useCallback((id: number, pan: number) => {
    const clamped = Math.max(-100, Math.min(100, pan));
    setChannels((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, pan: clamped } : ch))
    );
    xr18Osc.setChannelPan(id, clamped);
  }, []);

  const setChannelGain = useCallback((id: number, gain: number) => {
    const clamped = Math.max(-12, Math.min(60, gain));
    setChannels((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, gain: clamped } : ch))
    );
    xr18Osc.setChannelGain(id, clamped);
  }, []);

  const toggleChannelMute = useCallback((id: number) => {
    setChannels((prev) =>
      prev.map((ch) => {
        if (ch.id === id) {
          const nextMute = !ch.mute;
          xr18Osc.setChannelMute(id, nextMute);
          return { ...ch, mute: nextMute };
        }
        return ch;
      })
    );
  }, []);

  const toggleChannelSolo = useCallback((id: number) => {
    setChannels((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, solo: !ch.solo } : ch))
    );
  }, []);

  const toggleChannel48V = useCallback((id: number) => {
    setChannels((prev) =>
      prev.map((ch) => {
        if (ch.id === id) {
          const next48 = !ch.phantom48V;
          xr18Osc.setChannel48V(id, next48);
          return { ...ch, phantom48V: next48 };
        }
        return ch;
      })
    );
  }, []);

  const toggleChannelPhase = useCallback((id: number) => {
    setChannels((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, invertPhase: !ch.invertPhase } : ch))
    );
  }, []);

  const setChannelSend = useCallback((chId: number, targetType: 'bus' | 'fx', targetId: number, val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setChannels((prev) =>
      prev.map((ch) => {
        if (ch.id === chId) {
          if (targetType === 'bus') {
            return { ...ch, sends: { ...ch.sends, [targetId]: clamped } };
          } else {
            return { ...ch, fxSends: { ...ch.fxSends, [targetId]: clamped } };
          }
        }
        return ch;
      })
    );

    if (targetType === 'bus') {
      xr18Osc.setBusSend(chId, targetId, clamped);
    } else {
      xr18Osc.setFXSend(chId, targetId, clamped);
    }
  }, []);

  const updateChannelDetails = useCallback((id: number, updates: Partial<ChannelStripData>) => {
    setChannels((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, ...updates } : ch))
    );
  }, []);

  // Aux Bus Actions
  const setBusFader = useCallback((id: number, val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setAuxBuses((prev) =>
      prev.map((b) => (b.id === id ? { ...b, fader: clamped } : b))
    );
    xr18Osc.setBusFader(id, clamped);
  }, []);

  const setBusPan = useCallback((id: number, pan: number) => {
    const clamped = Math.max(-100, Math.min(100, pan));
    setAuxBuses((prev) =>
      prev.map((b) => (b.id === id ? { ...b, pan: clamped } : b))
    );
    xr18Osc.setBusPan(id, clamped);
  }, []);

  const toggleBusMute = useCallback((id: number) => {
    setAuxBuses((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const nextMute = !b.mute;
          xr18Osc.setBusMute(id, nextMute);
          return { ...b, mute: nextMute };
        }
        return b;
      })
    );
  }, []);

  const toggleBusSolo = useCallback((id: number) => {
    setAuxBuses((prev) =>
      prev.map((b) => (b.id === id ? { ...b, solo: !b.solo } : b))
    );
  }, []);

  // FX Actions
  const setFXSendMasterFader = useCallback((id: number, val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setFxRacks((prev) =>
      prev.map((fx) => (fx.id === id ? { ...fx, sendFader: clamped } : fx))
    );
    xr18Osc.setFXSendMasterFader(id, clamped);
  }, []);

  const toggleFXSendMasterMute = useCallback((id: number) => {
    setFxRacks((prev) =>
      prev.map((fx) => {
        if (fx.id === id) {
          const nextMute = !fx.sendMute;
          xr18Osc.setFXSendMasterMute(id, nextMute);
          return { ...fx, sendMute: nextMute };
        }
        return fx;
      })
    );
  }, []);

  const toggleFXSendMasterSolo = useCallback((id: number) => {
    setFxRacks((prev) =>
      prev.map((fx) => (fx.id === id ? { ...fx, sendSolo: !fx.sendSolo } : fx))
    );
  }, []);

  const setFXReturnFader = useCallback((id: number, val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setFxRacks((prev) =>
      prev.map((fx) => (fx.id === id ? { ...fx, returnFader: clamped } : fx))
    );
    xr18Osc.setFXReturnFader(id, clamped);
  }, []);

  const setFXReturnPan = useCallback((id: number, pan: number) => {
    const clamped = Math.max(-100, Math.min(100, pan));
    setFxRacks((prev) =>
      prev.map((fx) => (fx.id === id ? { ...fx, returnPan: clamped } : fx))
    );
    xr18Osc.setFXReturnPan(id, clamped);
  }, []);

  const toggleFXReturnMute = useCallback((id: number) => {
    setFxRacks((prev) =>
      prev.map((fx) => {
        if (fx.id === id) {
          const nextMute = !fx.returnMute;
          xr18Osc.setFXReturnMute(id, nextMute);
          return { ...fx, returnMute: nextMute };
        }
        return fx;
      })
    );
  }, []);

  const toggleFXReturnSolo = useCallback((id: number) => {
    setFxRacks((prev) =>
      prev.map((fx) => (fx.id === id ? { ...fx, returnSolo: !fx.returnSolo } : fx))
    );
  }, []);

  const toggleFXActive = useCallback((id: number) => {
    setFxRacks((prev) =>
      prev.map((fx) => {
        if (fx.id === id) {
          const nextActive = !fx.active;
          xr18Osc.setFXBypass(id, !nextActive);
          return { ...fx, active: nextActive };
        }
        return fx;
      })
    );
  }, []);

  const updateFXParam = useCallback((fxId: number, paramKey: string, val: any) => {
    setFxRacks((prev) =>
      prev.map((fx) => {
        if (fx.id === fxId) {
          return {
            ...fx,
            params: {
              ...fx.params,
              [paramKey]: val,
            },
          };
        }
        return fx;
      })
    );
  }, []);

  const tapTempo = useCallback((fxId: number) => {
    const now = Date.now();
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length > 4) {
      tapTimesRef.current.shift();
    }

    if (tapTimesRef.current.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (avgInterval > 200 && avgInterval < 2000) {
        const bpm = Math.round(60000 / avgInterval);
        const delayMs = Math.round(avgInterval);
        updateFXParam(fxId, 'tapTempoBpm', bpm);
        updateFXParam(fxId, 'delayTimeMs', delayMs);
        xr18Osc.sendOsc(`/fx/${fxId}/par/01`, delayMs);
      }
    }
  }, [updateFXParam]);

  // Master Actions
  const setMasterFader = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setMaster((prev) => ({ ...prev, fader: clamped }));
    xr18Osc.setMasterFader(clamped);
  }, []);

  const toggleMasterMute = useCallback((explicitMute?: boolean) => {
    setMaster((prev) => {
      const nextMute = explicitMute !== undefined ? explicitMute : !prev.mute;
      xr18Osc.setMasterMute(nextMute);
      return { ...prev, mute: nextMute };
    });
  }, []);

  const clearAllSolos = useCallback(() => {
    setChannels((prev) => prev.map((ch) => ({ ...ch, solo: false })));
    setAuxBuses((prev) => prev.map((b) => ({ ...b, solo: false })));
    setFxRacks((prev) => prev.map((fx) => ({ ...fx, sendSolo: false, returnSolo: false })));
  }, []);

  // DCA & Mute Groups
  const setDCAFader = useCallback((id: number, val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setDcas((prev) =>
      prev.map((d) => (d.id === id ? { ...d, fader: clamped } : d))
    );
    xr18Osc.sendOsc(`/dca/${id}/fader`, clamped);
  }, []);

  const toggleDCAMute = useCallback((id: number) => {
    setDcas((prev) =>
      prev.map((d) => (d.id === id ? { ...d, mute: !d.mute } : d))
    );
  }, []);

  const toggleMuteGroup = useCallback((id: number) => {
    setMuteGroups((prev) =>
      prev.map((mg) => {
        if (mg.id === id) {
          const nextActive = !mg.active;
          // Apply mute to assigned channels
          if (mg.assignedChannels.length > 0) {
            setChannels((chList) =>
              chList.map((ch) =>
                mg.assignedChannels.includes(ch.id) ? { ...ch, mute: nextActive } : ch
              )
            );
          }
          return { ...mg, active: nextActive };
        }
        return mg;
      })
    );
  }, []);

  // Sends on Faders
  const activateSendsOnFaders = useCallback((type: 'bus' | 'fx', targetId: number, name: string) => {
    setSendsOnFaders({
      active: true,
      type,
      targetId,
      targetName: name,
    });
  }, []);

  const exitSendsOnFaders = useCallback(() => {
    setSendsOnFaders((prev) => ({ ...prev, active: false }));
  }, []);

  // Macro Execution Engine
  const executeMacroActions = useCallback((macro: MacroData) => {
    macro.actions.forEach((act) => {
      switch (act.type) {
        case 'fader_set':
          if (act.channelId && act.value !== undefined) {
            setChannelFader(act.channelId, act.value);
          }
          break;
        case 'fader_boost':
          if (act.channelId && act.deltaDb !== undefined) {
            setChannels((prev) =>
              prev.map((ch) => {
                if (ch.id === act.channelId) {
                  const currentDb = faderToDb(ch.fader);
                  const nextDb = isFinite(currentDb) ? currentDb + act.deltaDb! : act.deltaDb!;
                  const nextFader = dbToFader(nextDb);
                  xr18Osc.setChannelFader(ch.id, nextFader);
                  return { ...ch, fader: nextFader };
                }
                return ch;
              })
            );
          }
          break;
        case 'mute_set':
          if (act.value !== undefined) {
            // Mute all channels and master
            setChannels((prev) =>
              prev.map((ch) => {
                xr18Osc.setChannelMute(ch.id, act.value);
                return { ...ch, mute: act.value };
              })
            );
            toggleMasterMute(act.value);
          }
          break;
        case 'mute_toggle':
          if (act.channelId) {
            toggleChannelMute(act.channelId);
          }
          break;
        case 'fx_bypass_toggle':
          if (act.fxId) {
            toggleFXActive(act.fxId);
          }
          break;
        case 'fx_send_set':
          if (act.channelId && act.fxId && act.value !== undefined) {
            setChannelSend(act.channelId, 'fx', act.fxId, act.value);
          }
          break;
        case 'bus_send_set':
          if (act.channelId && act.busId && act.value !== undefined) {
            setChannelSend(act.channelId, 'bus', act.busId, act.value);
          }
          break;
        case 'fx_param_set':
          if (act.fxId && act.paramKey && act.value !== undefined) {
            updateFXParam(act.fxId, act.paramKey, act.value);
          }
          break;
        case 'scene_recall':
          if (act.sceneId) {
            recallScene(act.sceneId);
          }
          break;
      }
    });

    // Handle timed pulse (e.g. 3.5s vocal splash)
    if (macro.type === 'timed_pulse' && macro.pulseDurationMs) {
      // Mark macro active
      setMacros((prev) =>
        prev.map((m) => (m.id === macro.id ? { ...m, isActive: true } : m))
      );

      // Save initial state to restore
      const restoreChannels = [...channels];
      setTimeout(() => {
        // Restore values
        macro.actions.forEach((act) => {
          if (act.type === 'fx_send_set' && act.channelId && act.fxId) {
            const originalCh = restoreChannels.find((c) => c.id === act.channelId);
            if (originalCh) {
              setChannelSend(act.channelId, 'fx', act.fxId, originalCh.fxSends[act.fxId] || 0.2);
            }
          }
          if (act.type === 'bus_send_set' && act.channelId && act.busId) {
            const originalCh = restoreChannels.find((c) => c.id === act.channelId);
            if (originalCh) {
              setChannelSend(act.channelId, 'bus', act.busId, originalCh.sends[act.busId] || 0.6);
            }
          }
        });
        setMacros((prev) =>
          prev.map((m) => (m.id === macro.id ? { ...m, isActive: false } : m))
        );
      }, macro.pulseDurationMs);
    } else if (macro.type === 'toggle') {
      setMacros((prev) =>
        prev.map((m) => (m.id === macro.id ? { ...m, isActive: !m.isActive } : m))
      );
    }
  }, [channels, setChannelFader, toggleChannelMute, toggleMasterMute, toggleFXActive, setChannelSend, updateFXParam]);

  const triggerMacro = useCallback((macro: MacroData) => {
    if (macro.requiresConfirmation) {
      setPendingMacroConfirmation(macro);
    } else {
      executeMacroActions(macro);
    }
  }, [executeMacroActions]);

  const confirmPendingMacro = useCallback(() => {
    if (pendingMacroConfirmation) {
      executeMacroActions(pendingMacroConfirmation);
      setPendingMacroConfirmation(null);
    }
  }, [pendingMacroConfirmation, executeMacroActions]);

  const cancelPendingMacro = useCallback(() => {
    setPendingMacroConfirmation(null);
  }, []);

  const addMacro = useCallback((macro: MacroData) => {
    setMacros((prev) => [...prev, macro]);
  }, []);

  const updateMacro = useCallback((id: string, updates: Partial<MacroData>) => {
    setMacros((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  }, []);

  const deleteMacro = useCallback((id: string) => {
    setMacros((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // Scenes
  const recallScene = useCallback((sceneId: string) => {
    const found = scenes.find((s) => s.id === sceneId);
    if (!found) return;

    setChannels(JSON.parse(JSON.stringify(found.channels)));
    setAuxBuses(JSON.parse(JSON.stringify(found.auxBuses)));
    setFxRacks(JSON.parse(JSON.stringify(found.fxRacks)));
    setMaster(JSON.parse(JSON.stringify(found.master)));
    setDcas(JSON.parse(JSON.stringify(found.dcas)));
    setMuteGroups(JSON.parse(JSON.stringify(found.muteGroups)));
    setCurrentSceneId(sceneId);

    // Sync over OSC
    found.channels.forEach((ch) => {
      xr18Osc.setChannelFader(ch.id, ch.fader);
      xr18Osc.setChannelMute(ch.id, ch.mute);
    });
    xr18Osc.setMasterFader(found.master.fader);
    xr18Osc.setMasterMute(found.master.mute);
  }, [scenes]);

  const saveNewScene = useCallback((name: string, description: string, category: SceneData['category']) => {
    const newScene: SceneData = {
      id: `scene-${Date.now()}`,
      name,
      description,
      category,
      createdAt: new Date().toISOString(),
      channels: JSON.parse(JSON.stringify(channels)),
      auxBuses: JSON.parse(JSON.stringify(auxBuses)),
      fxRacks: JSON.parse(JSON.stringify(fxRacks)),
      master: JSON.parse(JSON.stringify(master)),
      dcas: JSON.parse(JSON.stringify(dcas)),
      muteGroups: JSON.parse(JSON.stringify(muteGroups)),
    };
    setScenes((prev) => [...prev, newScene]);
    setCurrentSceneId(newScene.id);
  }, [channels, auxBuses, fxRacks, master, dcas, muteGroups]);

  const updateCurrentScene = useCallback(() => {
    setScenes((prev) =>
      prev.map((s) => {
        if (s.id === currentSceneId) {
          return {
            ...s,
            channels: JSON.parse(JSON.stringify(channels)),
            auxBuses: JSON.parse(JSON.stringify(auxBuses)),
            fxRacks: JSON.parse(JSON.stringify(fxRacks)),
            master: JSON.parse(JSON.stringify(master)),
            dcas: JSON.parse(JSON.stringify(dcas)),
            muteGroups: JSON.parse(JSON.stringify(muteGroups)),
          };
        }
        return s;
      })
    );
  }, [currentSceneId, channels, auxBuses, fxRacks, master, dcas, muteGroups]);

  const deleteScene = useCallback((sceneId: string) => {
    setScenes((prev) => prev.filter((s) => s.id !== sceneId));
  }, []);

  const exportScenesJson = useCallback(() => {
    return JSON.stringify(scenes, null, 2);
  }, [scenes]);

  const importScenesJson = useCallback((jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].channels) {
        setScenes(parsed);
        recallScene(parsed[0].id);
        return true;
      }
    } catch {
      // Invalid JSON
    }
    return false;
  }, [recallScene]);

  // Live microphone connection
  const toggleMicLive = useCallback(async () => {
    if (isMicActive) {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      setIsMicActive(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      micAnalyserRef.current = analyser;

      setIsMicActive(true);
      setAudioSimMode('mic_live');
    } catch (err) {
      console.warn('Microphone permission denied or not available:', err);
      setIsMicActive(false);
    }
  }, [isMicActive]);

  // Global hotkeys for macros
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger hotkeys if user is typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      const key = e.key.toUpperCase();
      const matched = macros.find((m) => m.hotkey && m.hotkey.toUpperCase() === key);
      if (matched) {
        e.preventDefault();
        triggerMacro(matched);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [macros, triggerMacro]);

  return (
    <XR18Context.Provider
      value={{
        channels,
        auxBuses,
        fxRacks,
        master,
        dcas,
        muteGroups,
        macros,
        scenes,
        currentSceneId,
        selectedChannelId,
        meterLevels,
        busMeters,
        fxMeters,
        masterMeters,
        sendsOnFaders,
        audioSimMode,
        isMicActive,
        oscLogs,
        pendingMacroConfirmation,
        isFullscreen,
        isFitScreen,
        fullscreenHelpOpen,
        isInIframe,

        toggleFullscreen,
        toggleFitScreen,
        setFullscreenHelpOpen,
        selectChannel,
        setChannelFader,
        setChannelPan,
        setChannelGain,
        toggleChannelMute,
        toggleChannelSolo,
        toggleChannel48V,
        toggleChannelPhase,
        setChannelSend,
        updateChannelDetails,

        setBusFader,
        setBusPan,
        toggleBusMute,
        toggleBusSolo,

        setFXSendMasterFader,
        toggleFXSendMasterMute,
        toggleFXSendMasterSolo,
        setFXReturnFader,
        setFXReturnPan,
        toggleFXReturnMute,
        toggleFXReturnSolo,
        toggleFXActive,
        updateFXParam,
        tapTempo,

        setMasterFader,
        toggleMasterMute,
        clearAllSolos,

        setDCAFader,
        toggleDCAMute,
        toggleMuteGroup,

        activateSendsOnFaders,
        exitSendsOnFaders,

        triggerMacro,
        confirmPendingMacro,
        cancelPendingMacro,
        addMacro,
        updateMacro,
        deleteMacro,

        recallScene,
        saveNewScene,
        updateCurrentScene,
        deleteScene,
        exportScenesJson,
        importScenesJson,

        setAudioSimMode,
        toggleMicLive,
      }}
    >
      {children}
    </XR18Context.Provider>
  );
};

export const useXR18 = () => {
  const ctx = useContext(XR18Context);
  if (!ctx) throw new Error('useXR18 must be used within XR18Provider');
  return ctx;
};
