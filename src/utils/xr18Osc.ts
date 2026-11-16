import { Capacitor, registerPlugin } from '@capacitor/core';
import { padChannel } from './audioMath';
import { OSCLogItem } from '../types/xr18';

interface XR18OscNativePlugin {
  getStatus(): Promise<{ connectedToIp: string; port: number; udpSocketActive: boolean }>;
  setConfig(options: { ip: string; port: number }): Promise<{ success: boolean; ip: string; port: number; udpSocketActive: boolean }>;
  sendOsc(options: { address: string; floatVal?: number; intVal?: number; strVal?: string }): Promise<{ success: boolean; address: string }>;
  addListener(
    eventName: 'oscRx',
    listenerFunc: (data: { timestamp: number; direction: 'rx'; address: string }) => void
  ): Promise<{ remove: () => void }>;
}

const XR18OscNative = registerPlugin<XR18OscNativePlugin>('XR18Osc');
const STORAGE_IP_KEY = 'xr18_target_ip';
const STORAGE_PORT_KEY = 'xr18_target_port';

class XR18OscClient {
  private targetIp: string = '192.168.1.100';
  private targetPort: number = 10024;
  private isConnected: boolean = false;
  private isNative: boolean = Capacitor.isNativePlatform();
  private logCallbacks: Set<(log: OSCLogItem) => void> = new Set();
  private sendQueue: Array<{ address: string; floatVal?: number; intVal?: number; strVal?: string }> = [];
  private isProcessingQueue: boolean = false;

  constructor() {
    try {
      const savedIp = localStorage.getItem(STORAGE_IP_KEY);
      const savedPort = localStorage.getItem(STORAGE_PORT_KEY);
      if (savedIp) this.targetIp = savedIp;
      if (savedPort) this.targetPort = parseInt(savedPort, 10) || 10024;
    } catch {
      // ignore storage errors
    }

    if (this.isNative) {
      this.initNativeBridge();
    } else {
      this.checkStatus();
    }
  }

  private async initNativeBridge() {
    try {
      await XR18OscNative.addListener('oscRx', (event) => {
        this.notifyLog({
          timestamp: event.timestamp || Date.now(),
          direction: 'rx',
          address: event.address || '/raw',
        });
      });
      await XR18OscNative.setConfig({ ip: this.targetIp, port: this.targetPort });
      await this.checkStatus();
    } catch {
      this.isConnected = false;
    }
  }

  public isNativeAndroid(): boolean {
    return this.isNative;
  }

  public isUdpReady(): boolean {
    return this.isConnected;
  }

  public getTargetIp(): string {
    return this.targetIp;
  }

  public getTargetPort(): number {
    return this.targetPort;
  }

  public async setConfig(ip: string, port: number = 10024): Promise<boolean> {
    this.targetIp = ip.trim();
    this.targetPort = port;
    try {
      localStorage.setItem(STORAGE_IP_KEY, this.targetIp);
      localStorage.setItem(STORAGE_PORT_KEY, String(this.targetPort));
    } catch {
      // ignore
    }

    if (this.isNative) {
      try {
        const res = await XR18OscNative.setConfig({ ip: this.targetIp, port: this.targetPort });
        this.isConnected = !!res.udpSocketActive;
        this.notifyLog({
          timestamp: Date.now(),
          direction: 'tx',
          address: `/xinfo -> ${this.targetIp}:${this.targetPort}`,
        });
        return this.isConnected;
      } catch {
        this.isConnected = false;
        return false;
      }
    }

    try {
      const res = await fetch('/api/osc/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: this.targetIp, port: this.targetPort }),
      });
      if (res.ok) {
        this.isConnected = true;
        this.notifyLog({
          timestamp: Date.now(),
          direction: 'tx',
          address: `/xinfo -> ${this.targetIp}:${this.targetPort}`,
        });
        return true;
      }
    } catch {
      // Offline or local simulator mode
      this.isConnected = false;
    }
    return false;
  }

  public async checkStatus() {
    if (this.isNative) {
      try {
        const data = await XR18OscNative.getStatus();
        this.targetIp = data.connectedToIp || this.targetIp;
        this.targetPort = data.port || this.targetPort;
        this.isConnected = !!data.udpSocketActive;
      } catch {
        this.isConnected = false;
      }
      return;
    }

    try {
      const res = await fetch('/api/osc/status');
      if (res.ok) {
        const data = await res.json();
        this.targetIp = data.connectedToIp || this.targetIp;
        this.targetPort = data.port || this.targetPort;
        this.isConnected = data.udpSocketActive || false;
      }
    } catch {
      this.isConnected = false;
    }
  }

  public subscribeLogs(cb: (log: OSCLogItem) => void): () => void {
    this.logCallbacks.add(cb);
    return () => {
      this.logCallbacks.delete(cb);
    };
  }

  private notifyLog(log: OSCLogItem) {
    this.logCallbacks.forEach((cb) => cb(log));
  }

  /**
   * Send an OSC message to Behringer XR18
   */
  public sendOsc(address: string, floatVal?: number, intVal?: number, strVal?: string) {
    const logItem: OSCLogItem = {
      timestamp: Date.now(),
      direction: 'tx',
      address,
      value: floatVal !== undefined ? floatVal : intVal !== undefined ? intVal : strVal,
    };
    this.notifyLog(logItem);

    // Queue for network transmit
    this.sendQueue.push({ address, floatVal, intVal, strVal });
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.sendQueue.length === 0) return;
    this.isProcessingQueue = true;

    while (this.sendQueue.length > 0) {
      const item = this.sendQueue.shift();
      if (!item) break;

      if (this.isNative) {
        try {
          await XR18OscNative.sendOsc(item);
        } catch {
          // Silently continue
        }
        continue;
      }

      try {
        await fetch('/api/osc/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
      } catch {
        // Silently continue (offline/simulator fallback)
      }
    }

    this.isProcessingQueue = false;
  }

  // OSC Helper shortcuts for XR18 commands
  public setChannelFader(chId: number, val: number) {
    const pad = padChannel(chId);
    this.sendOsc(`/ch/${pad}/mix/fader`, Number(val.toFixed(4)));
  }

  public setChannelMute(chId: number, isMuted: boolean) {
    const pad = padChannel(chId);
    // Behringer XR18 mix/on: 1 = ON (unmuted), 0 = MUTED
    this.sendOsc(`/ch/${pad}/mix/on`, undefined, isMuted ? 0 : 1);
  }

  public setChannelPan(chId: number, panPercent: number) {
    const pad = padChannel(chId);
    // XR18 pan is normalized 0.0 (Left) to 1.0 (Right), 0.5 (Center)
    const normalizedPan = (panPercent + 100) / 200;
    this.sendOsc(`/ch/${pad}/mix/pan`, Number(normalizedPan.toFixed(3)));
  }

  public setChannelGain(chId: number, gainDb: number) {
    const pad = padChannel(chId);
    // XR18 preamp gain is normalized 0..1 representing -12dB to +60dB
    const norm = (gainDb + 12) / 72;
    this.sendOsc(`/headamp/${pad}/gain`, Number(norm.toFixed(3)));
  }

  public setChannel48V(chId: number, enabled: boolean) {
    const pad = padChannel(chId);
    this.sendOsc(`/headamp/${pad}/phantom`, undefined, enabled ? 1 : 0);
  }

  public setBusFader(busId: number, val: number) {
    const pad = padChannel(busId);
    this.sendOsc(`/bus/${pad}/mix/fader`, Number(val.toFixed(4)));
  }

  public setBusMute(busId: number, isMuted: boolean) {
    const pad = padChannel(busId);
    this.sendOsc(`/bus/${pad}/mix/on`, undefined, isMuted ? 0 : 1);
  }

  public setBusPan(busId: number, panPercent: number) {
    const pad = padChannel(busId);
    const normalizedPan = (panPercent + 100) / 200;
    this.sendOsc(`/bus/${pad}/mix/pan`, Number(normalizedPan.toFixed(3)));
  }

  public setBusSend(chId: number, busId: number, val: number) {
    const chPad = padChannel(chId);
    const busPad = padChannel(busId); // XR18 Bus sends are 01-06
    this.sendOsc(`/ch/${chPad}/mix/${busPad}/level`, Number(val.toFixed(4)));
  }

  public setMasterFader(val: number) {
    this.sendOsc(`/lr/mix/fader`, Number(val.toFixed(4)));
  }

  public setMasterMute(isMuted: boolean) {
    this.sendOsc(`/lr/mix/on`, undefined, isMuted ? 0 : 1);
  }

  public setFXSend(chId: number, fxId: number, val: number) {
    const chPad = padChannel(chId);
    const fxPad = padChannel(fxId + 6); // XR18 FX sends are buses 07-10
    this.sendOsc(`/ch/${chPad}/mix/${fxPad}/level`, Number(val.toFixed(4)));
  }

  public setFXSendMasterFader(fxId: number, val: number) {
    this.sendOsc(`/fxsend/${fxId}/mix/fader`, Number(val.toFixed(4)));
  }

  public setFXSendMasterMute(fxId: number, isMuted: boolean) {
    this.sendOsc(`/fxsend/${fxId}/mix/on`, undefined, isMuted ? 0 : 1);
  }

  public setFXReturnFader(fxId: number, val: number) {
    this.sendOsc(`/rtn/${fxId}/mix/fader`, Number(val.toFixed(4)));
  }

  public setFXReturnMute(fxId: number, isMuted: boolean) {
    this.sendOsc(`/rtn/${fxId}/mix/on`, undefined, isMuted ? 0 : 1);
  }

  public setFXReturnPan(fxId: number, panPercent: number) {
    const normalizedPan = (panPercent + 100) / 200;
    this.sendOsc(`/rtn/${fxId}/mix/pan`, Number(normalizedPan.toFixed(3)));
  }

  public setFXBypass(fxId: number, bypass: boolean) {
    this.sendOsc(`/fx/${fxId}/bypass`, undefined, bypass ? 1 : 0);
  }
}

export const xr18Osc = new XR18OscClient();
