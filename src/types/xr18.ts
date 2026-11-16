/**
 * Behringer XR18 / X-Air 18 Data Types and Structures
 */

export type ChannelColor = 'gray' | 'red' | 'amber' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'magenta';

export type ChannelIcon = 'mic' | 'mic_vocal' | 'drum' | 'snare' | 'hihat' | 'guitar' | 'bass' | 'keys' | 'acoustic' | 'synth' | 'dj' | 'laptop' | 'fx';

export interface ChannelEQ {
  lowCutFreq: number; // Hz (20 - 400)
  lowCutOn: boolean;
  highCutFreq?: number; // Hz (2000 - 20000)
  highCutOn?: boolean;
  low: { freq: number; gain: number; q: number; type: 'lowshelf' | 'peq' };
  lowMid: { freq: number; gain: number; q: number };
  highMid: { freq: number; gain: number; q: number };
  high: { freq: number; gain: number; q: number; type: 'highshelf' | 'peq' };
  enabled: boolean;
  rtaEnabled?: boolean;
  rtaSpeed?: 'fast' | 'medium' | 'slow';
  rtaMode?: 'bars' | 'gradient' | 'line';
}

export interface ChannelGate {
  enabled: boolean;
  threshold: number; // -80 to 0 dB
  range?: number; // -80 to 0 dB
  attack: number; // ms (0.1 to 100)
  hold?: number; // ms (0 to 1000)
  release: number; // ms (10 to 2000)
  filterFreq?: number; // Hz (20 to 20000)
  filterOn?: boolean;
}

export interface ChannelComp {
  enabled: boolean;
  threshold: number; // -60 to 0 dB
  ratio: number; // 1.1 to 20
  knee: number; // 0 (Hard) to 5 (Soft)
  attack: number; // ms (0.1 to 150)
  hold?: number; // ms (0 to 500)
  release: number; // ms (10 to 3000)
  makeupGain?: number; // 0 to 24 dB
  mix?: number; // 0 to 100% (Dry/Wet)
  model?: 'vintage_opto' | 'classic_vca' | 'fet_punch';
}

export interface ChannelStripData {
  id: number; // 1 to 18 (1-16 mic, 17-18 aux in)
  name: string;
  icon: ChannelIcon;
  color: ChannelColor;
  fader: number; // 0.0 to 1.0 linear (0.75 is 0dB unity gain)
  pan: number; // -100 to +100
  gain: number; // -12dB to +60dB (preamp)
  phantom48V: boolean;
  invertPhase: boolean;
  mute: boolean;
  solo: boolean;
  sends: Record<number, number>; // Aux Bus 1-6 send levels (0.0 - 1.0)
  fxSends: Record<number, number>; // FX 1-4 send levels (0.0 - 1.0)
  eq: ChannelEQ;
  gate: ChannelGate;
  comp: ChannelComp;
  dcaGroup?: number; // 1-4
  muteGroup?: number[]; // 1-4
}

export interface AuxBusData {
  id: number; // 1 to 6
  name: string;
  fader: number; // 0.0 to 1.0
  pan: number;
  mute: boolean;
  solo: boolean;
  color: ChannelColor;
}

export type FXType = 'vintage_room' | 'hall_reverb' | 'stereo_delay' | 'chorus_dimension' | 'graphic_eq' | 'de_esser';

export interface FXRackData {
  id: number; // 1 to 4
  type: FXType;
  name: string;
  active: boolean; // bypass vs active
  sendFader?: number; // 0.0 to 1.0 master FX send
  sendMute?: boolean;
  sendSolo?: boolean;
  returnFader: number; // 0.0 to 1.0
  returnPan?: number; // -100 to +100
  returnMute: boolean;
  returnSolo?: boolean;
  params: {
    // Reverb params
    decayTime?: number; // 0.1 to 20 s
    preDelay?: number; // 0 to 200 ms
    highCut?: number; // 1k to 20k Hz
    roomSize?: number; // 1 to 100
    diffusion?: number; // 0 to 100%
    mix?: number; // 0 to 100%
    // Delay params
    delayTimeMs?: number; // 1 to 3000 ms
    feedback?: number; // 0 to 100%
    tapTempoBpm?: number; // 40 to 240 bpm
    syncSubdivision?: '1/4' | '1/8' | '1/8d' | '1/16' | '1/4t';
    highDamp?: number; // Hz
    pingPong?: boolean;
    // Chorus params
    speed?: number; // 0.1 to 10 Hz
    depth?: number; // 0 to 100%
    voices?: number; // 2 to 8
    // Graphic EQ / De-Esser params
    bands?: number[]; // 31 bands -12dB to +12dB
    threshold?: number; // -60 to 0 dB
    frequency?: number; // Hz
  };
}

export interface MasterLRData {
  fader: number; // 0.0 to 1.0 (0.75 is 0dB)
  mute: boolean;
  balance: number; // -100 to +100
  limiter: boolean;
  eqEnabled: boolean;
}

export interface DCAData {
  id: number; // 1 to 4
  name: string;
  fader: number;
  mute: boolean;
  assignedChannels: number[];
}

export interface MuteGroupData {
  id: number; // 1 to 4
  name: string;
  active: boolean;
  assignedChannels: number[];
}

export interface MacroAction {
  type: 'fader_set' | 'fader_boost' | 'mute_set' | 'mute_toggle' | 'fx_bypass_toggle' | 'fx_send_set' | 'bus_send_set' | 'fx_param_set' | 'scene_recall';
  channelId?: number;
  busId?: number;
  fxId?: number;
  paramKey?: string;
  value?: any;
  deltaDb?: number;
  sceneId?: string;
}

export interface MacroData {
  id: string;
  name: string;
  description: string;
  color: ChannelColor;
  icon: string;
  hotkey?: string;
  type: 'instant' | 'timed_pulse' | 'toggle';
  pulseDurationMs?: number; // e.g. 3500ms for temporary vocal reverb swell
  requiresConfirmation: boolean; // Confirmation modal prompt before executing
  confirmationPrompt?: string;
  actions: MacroAction[];
  isActive?: boolean; // For toggle / pulse states
}

export interface MeterLevel {
  rms: number; // -60 to +6 dBFS
  peak: number; // -60 to +6 dBFS
  peakHold: number;
  clip: boolean;
}

export interface SceneData {
  id: string;
  name: string;
  description: string;
  category: 'Live Concert' | 'Acoustique' | 'Conférence' | 'Studio' | 'Custom';
  createdAt: string;
  channels: ChannelStripData[];
  auxBuses: AuxBusData[];
  fxRacks: FXRackData[];
  master: MasterLRData;
  dcas: DCAData[];
  muteGroups: MuteGroupData[];
}

export interface OSCLogItem {
  timestamp: number;
  direction: 'tx' | 'rx';
  address: string;
  value?: any;
}
