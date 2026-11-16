import React, { useState } from 'react';
import { useXR18 } from '../context/XR18Context';
import { xr18Osc } from '../utils/xr18Osc';
import {
  Wifi,
  WifiOff,
  Server,
  Activity,
  Terminal,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
} from 'lucide-react';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({ isOpen, onClose }) => {
  const { oscLogs } = useXR18();
  const [ipAddress, setIpAddress] = useState<string>(xr18Osc.getTargetIp());
  const [port, setPort] = useState<number>(xr18Osc.getTargetPort());
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setStatusMsg('Connexion en cours vers le Behringer XR18...');
    const ok = await xr18Osc.setConfig(ipAddress, port);
    setIsTesting(false);
    if (ok) {
      setStatusMsg(`Connecté au XR18 sur ${ipAddress}:${port} via UDP`);
    } else {
      setStatusMsg(`Mode Simulateur Virtuel actif (aucun mixeur physique détecté à ${ipAddress})`);
    }
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleTestPing = () => {
    xr18Osc.sendOsc('/xinfo');
    setStatusMsg('Paquet OSC /xinfo envoyé sur le réseau UDP');
    setTimeout(() => setStatusMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-[#1c2026] border border-[#303640] rounded-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="ui-topbar p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="ui-lcd w-10 h-10 rounded-[4px] flex items-center justify-center text-sky-400">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-100">
                Liaison Réseau Behringer XR18 (OSC / UDP)
              </h2>
              <p className="text-xs text-slate-400">
                Protocole Open Sound Control (Port par défaut 10024)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="ui-btn p-2 rounded-[4px]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 ui-chassis">
          <div className="p-3 rounded bg-[#14171b] border border-[#2b3038] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4 text-sky-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-slate-200">
                  {xr18Osc.isNativeAndroid()
                    ? 'APK Autonome Android — Socket UDP Natif'
                    : 'Mode Web — Passerelle Serveur OSC'}
                </span>
                <p className="text-[11px] text-slate-400">
                  {xr18Osc.isNativeAndroid()
                    ? 'Envoi direct des paquets UDP vers le XR18 sans ordinateur.'
                    : 'Utilise le pont UDP du serveur local (ou le plugin natif une fois compilé en APK).'}
                </p>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                xr18Osc.isNativeAndroid()
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-sky-950 text-sky-300 border border-sky-800'
              }`}
            >
              {xr18Osc.isNativeAndroid() ? 'ANDROID NATIF' : 'WEB / SIM'}
            </span>
          </div>

          <form onSubmit={handleApplyConfig} className="p-4 rounded bg-[#14171b] border border-[#2b3038] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Paramètres IP de la console XR18
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIpAddress('192.168.11.1');
                    setPort(10024);
                  }}
                  className="ui-btn px-2 py-0.5 text-[10px] font-mono rounded"
                >
                  AP XR18 (192.168.11.1)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIpAddress('192.168.1.100');
                    setPort(10024);
                  }}
                  className="ui-btn px-2 py-0.5 text-[10px] font-mono rounded"
                >
                  LAN (192.168.1.100)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Adresse IP du XR18 (Réseau Local ou Point d'accès)
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: 192.168.1.100 ou 192.168.11.1"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  className="ui-lcd w-full px-3 py-2 rounded text-sm text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Port OSC</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value, 10))}
                  className="ui-lcd w-full px-3 py-2 rounded text-sm text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {statusMsg && (
              <div className="ui-lcd p-2.5 rounded text-xs font-mono text-sky-300 flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-400" />
                <span>{statusMsg}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="text-[11px] text-slate-500">
                Mode AP XR18 : <span className="font-mono text-slate-300">192.168.11.1:10024</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestPing}
                  className="ui-btn px-3 py-1.5 text-xs font-mono font-bold rounded-[4px] flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Ping /xinfo</span>
                </button>

                <button
                  type="submit"
                  disabled={isTesting}
                  className="ui-btn-cyan px-4 py-1.5 text-xs font-mono font-bold rounded-[4px]"
                >
                  Appliquer
                </button>
              </div>
            </div>
          </form>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>Moniteur OSC en direct</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                {oscLogs.length} messages récents
              </span>
            </div>

            <div className="ui-lcd w-full h-48 rounded p-3 font-mono text-[11px] overflow-y-auto space-y-1">
              {oscLogs.length === 0 ? (
                <div className="text-slate-600 italic">En attente de commandes OSC...</div>
              ) : (
                oscLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-slate-300 hover:bg-white/5 px-1 py-0.5 rounded">
                    <span className="text-slate-600 text-[9px] tabular-nums">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`px-1 rounded-[2px] text-[9px] font-bold ${
                        log.direction === 'tx'
                          ? 'bg-sky-950 text-sky-400 border border-sky-800'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}
                    >
                      {log.direction.toUpperCase()}
                    </span>
                    <span className="text-sky-300 font-semibold">{log.address}</span>
                    {log.value !== undefined && (
                      <span className="text-slate-400 tabular-nums">
                        {typeof log.value === 'number' ? log.value.toFixed(3) : String(log.value)}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-[#2b3038] bg-[#14171b] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Moteur temps réel actif (Latence &lt; 2ms)</span>
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
