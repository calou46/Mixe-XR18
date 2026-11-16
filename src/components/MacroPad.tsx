import React, { useState } from 'react';
import { useXR18 } from '../context/XR18Context';
import { MacroData, ChannelColor } from '../types/xr18';
import {
  Zap,
  Sparkles,
  VolumeX,
  Flame,
  ShieldAlert,
  Mic,
  Activity,
  Plus,
  Trash2,
  AlertTriangle,
  Play,
  RotateCcw,
  Check,
  Radio,
} from 'lucide-react';

const macroColorMeta: Record<ChannelColor, { bar: string; text: string; activeBtn: string }> = {
  purple: { bar: 'bg-purple-500', text: 'text-purple-400', activeBtn: 'ui-btn-purple' },
  amber: { bar: 'bg-amber-500', text: 'text-amber-400', activeBtn: 'ui-btn-amber' },
  blue: { bar: 'bg-sky-500', text: 'text-sky-400', activeBtn: 'ui-btn-cyan' },
  red: { bar: 'bg-red-500', text: 'text-red-400', activeBtn: 'ui-btn-red' },
  teal: { bar: 'bg-teal-500', text: 'text-teal-400', activeBtn: 'ui-btn-cyan' },
  magenta: { bar: 'bg-pink-500', text: 'text-pink-400', activeBtn: 'ui-btn-purple' },
  green: { bar: 'bg-emerald-500', text: 'text-emerald-400', activeBtn: 'ui-btn-green' },
  yellow: { bar: 'bg-yellow-500', text: 'text-yellow-400', activeBtn: 'ui-btn-amber' },
  gray: { bar: 'bg-slate-400', text: 'text-slate-300', activeBtn: 'ui-btn-cyan' },
};

export const MacroPad: React.FC = () => {
  const { macros, triggerMacro, addMacro, deleteMacro, channels, isFitScreen } = useXR18();
  const [isCreatingMacro, setIsCreatingMacro] = useState(false);

  const [newMacroName, setNewMacroName] = useState('');
  const [newMacroDesc, setNewMacroDesc] = useState('');
  const [newMacroColor, setNewMacroColor] = useState<ChannelColor>('purple');
  const [newMacroHotkey, setNewMacroHotkey] = useState('');
  const [newMacroRequireConfirm, setNewMacroRequireConfirm] = useState(false);
  const [newMacroConfirmPrompt, setNewMacroConfirmPrompt] = useState('Confirmer le déclenchement de cette macro ?');
  const [newMacroType, setNewMacroType] = useState<'instant' | 'timed_pulse' | 'toggle'>('instant');
  const [newMacroPulseDuration] = useState(3000);

  const [actionCategory, setActionCategory] = useState<'vocal_reverb' | 'guitar_boost' | 'mute_channel' | 'delay_kill'>('vocal_reverb');
  const [targetChannelId, setTargetChannelId] = useState<number>(14);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMacroName.trim()) return;

    let actions: any[] = [];
    if (actionCategory === 'vocal_reverb') {
      actions = [{ type: 'fx_send_set', channelId: targetChannelId, fxId: 1, value: 0.95 }];
    } else if (actionCategory === 'guitar_boost') {
      actions = [{ type: 'fader_boost', channelId: targetChannelId, deltaDb: 4.0 }];
    } else if (actionCategory === 'delay_kill') {
      actions = [{ type: 'fx_bypass_toggle', fxId: 2 }];
    } else if (actionCategory === 'mute_channel') {
      actions = [{ type: 'mute_toggle', channelId: targetChannelId }];
    }

    const created: MacroData = {
      id: `macro-${Date.now()}`,
      name: newMacroName.trim(),
      description: newMacroDesc.trim() || 'Macro utilisateur XR18',
      color: newMacroColor,
      icon: 'Sparkles',
      hotkey: newMacroHotkey.trim().toUpperCase() || undefined,
      type: newMacroType,
      pulseDurationMs: newMacroType === 'timed_pulse' ? newMacroPulseDuration : undefined,
      requiresConfirmation: newMacroRequireConfirm,
      confirmationPrompt: newMacroRequireConfirm ? newMacroConfirmPrompt : undefined,
      actions,
    };

    addMacro(created);
    setIsCreatingMacro(false);
    setNewMacroName('');
    setNewMacroDesc('');
  };

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles className="w-4 h-4" />;
      case 'VolumeX':
        return <VolumeX className="w-4 h-4" />;
      case 'Flame':
        return <Flame className="w-4 h-4" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-4 h-4" />;
      case 'Mic':
        return <Mic className="w-4 h-4" />;
      case 'Radio':
        return <Radio className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <div className={`flex-1 flex flex-col ui-chassis ${isFitScreen ? 'p-3 overflow-hidden justify-between' : 'p-5 overflow-y-auto'} select-none h-full`}>
      {/* Subbar Header */}
      <div className={`flex items-center justify-between ${isFitScreen ? 'pb-2.5' : 'pb-4'} border-b border-[#0e1013] shrink-0`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-sky-400 tracking-wider">XR18 USER KEYS</span>
            <span className="text-[11px] text-slate-500 font-mono">· DÉCLENCHEURS INSTANTANÉS</span>
          </div>
          <h2 className={`${isFitScreen ? 'text-base' : 'text-xl'} font-extrabold text-slate-100 tracking-tight mt-0.5`}>
            Boutons Macro & Déclenchements Sécurisés
          </h2>
        </div>

        <button
          onClick={() => setIsCreatingMacro(true)}
          className="ui-btn-cyan px-3.5 py-2 font-mono font-bold text-xs rounded-[4px] flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Créer une Macro</span>
        </button>
      </div>

      {/* Tactile Soundcraft Pad Grid */}
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-2.5 ${isFitScreen ? 'pt-2.5 flex-1 items-stretch' : 'pt-5'}`}>
        {macros.map((m) => {
          const meta = macroColorMeta[m.color] || macroColorMeta.purple;
          return (
            <div
              key={m.id}
              className={`relative rounded bg-[#1d2026] border overflow-hidden flex flex-col justify-between transition-all ${
                m.isActive
                  ? 'border-sky-400 ring-1 ring-sky-400/50 shadow-lg'
                  : 'border-[#2c313a] hover:border-[#3d4450]'
              }`}
            >
              <div className={`h-1 w-full ${meta.bar}`} />

              <div className={`${isFitScreen ? 'p-3' : 'p-4'} flex-1 flex flex-col justify-between`}>
                {/* Top Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className={`ui-lcd p-2 rounded-[4px] ${meta.text}`}>
                    {renderIcon(m.icon)}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {m.requiresConfirmation && (
                      <span
                        className="px-1.5 py-0.5 text-[9px] font-mono font-bold text-amber-300 bg-amber-950/70 border border-amber-600/60 rounded-[3px] flex items-center gap-1"
                        title="Nécessite une confirmation avant exécution"
                      >
                        <AlertTriangle className="w-2.5 h-2.5" />
                        CONFIRM
                      </span>
                    )}
                    {m.hotkey && (
                      <span className="ui-lcd px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-200 rounded-[3px]">
                        {m.hotkey}
                      </span>
                    )}
                  </div>
                </div>

                {/* Label & Description */}
                <div className="my-3">
                  <h3 className="text-sm font-bold text-slate-100 tracking-tight leading-snug">
                    {m.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {m.description}
                  </p>
                </div>

                {m.isActive && m.type === 'timed_pulse' && (
                  <div className="mb-2.5 w-full bg-[#101215] rounded-full h-1.5 overflow-hidden border border-[#2b3038]">
                    <div className="h-full bg-sky-400 transition-all duration-100 ease-linear" style={{ width: '100%' }} />
                  </div>
                )}

                {/* Hardware Key Action */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#292e36]">
                  <button
                    onClick={() => triggerMacro(m)}
                    className={`flex-1 py-2.5 px-3 text-[11px] font-mono font-extrabold rounded-[4px] flex items-center justify-center gap-1.5 ${
                      m.isActive ? meta.activeBtn : m.color === 'red' ? 'ui-btn-red' : 'ui-btn'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>
                      {m.isActive ? 'ACTIF' : m.requiresConfirmation ? 'DÉCLENCHER...' : 'DÉCLENCHER'}
                    </span>
                  </button>

                  {m.id.startsWith('macro-') && !['macro-reverb-throw', 'macro-kill-delays', 'macro-mute-all'].includes(m.id) && (
                    <button
                      onClick={() => deleteMacro(m.id)}
                      className="ui-btn p-2.5 rounded-[4px] text-slate-400 hover:text-red-400"
                      title="Supprimer la macro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create New Macro Modal */}
      {isCreatingMacro && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#1c2026] border border-[#303640] rounded-lg shadow-2xl p-6 overflow-hidden">
            <h3 className="text-lg font-bold text-slate-100">Créer une Nouvelle Macro XR18</h3>
            <p className="text-xs text-slate-400 mt-1">
              Configurez une action en temps réel avec confirmation de sécurité optionnelle.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nom de la Macro</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Boost Solo Clavier +3dB"
                  value={newMacroName}
                  onChange={(e) => setNewMacroName(e.target.value)}
                  className="ui-lcd w-full px-3 py-2 rounded text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description / Objectif</label>
                <input
                  type="text"
                  placeholder="ex: Augmente le fader du clavier et ouvre la réverbe FX1"
                  value={newMacroDesc}
                  onChange={(e) => setNewMacroDesc(e.target.value)}
                  className="ui-lcd w-full px-3 py-2 rounded text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Type de Déclenchement</label>
                  <select
                    value={newMacroType}
                    onChange={(e) => setNewMacroType(e.target.value as any)}
                    className="ui-lcd w-full px-3 py-2 rounded text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="instant">Instantané (One-shot)</option>
                    <option value="timed_pulse">Impulsion Temporisée (Pulse)</option>
                    <option value="toggle">Bascule On/Off (Toggle)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Touche Raccourci</label>
                  <input
                    type="text"
                    maxLength={1}
                    placeholder="ex: K"
                    value={newMacroHotkey}
                    onChange={(e) => setNewMacroHotkey(e.target.value.toUpperCase())}
                    className="ui-lcd w-full px-3 py-2 rounded text-xs text-slate-100 font-mono text-center focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Action Rapide XR18</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={actionCategory}
                    onChange={(e) => setActionCategory(e.target.value as any)}
                    className="ui-lcd w-full px-3 py-2 rounded text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="vocal_reverb">Splash Réverbe FX1</option>
                    <option value="guitar_boost">Boost Fader (+4 dB)</option>
                    <option value="delay_kill">Couper FX2 Delay</option>
                    <option value="mute_channel">Bascule Mute Tranche</option>
                  </select>

                  <select
                    value={targetChannelId}
                    onChange={(e) => setTargetChannelId(parseInt(e.target.value, 10))}
                    className="ui-lcd w-full px-3 py-2 rounded text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    {channels.map((c) => (
                      <option key={c.id} value={c.id}>
                        CH {c.id < 10 ? `0${c.id}` : c.id} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-[#14171b] rounded border border-[#2b3038] space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMacroRequireConfirm}
                    onChange={(e) => setNewMacroRequireConfirm(e.target.checked)}
                    className="w-4 h-4 accent-sky-500"
                  />
                  <span className="text-xs font-semibold text-slate-200">
                    Exiger une confirmation avant exécution
                  </span>
                </label>
                {newMacroRequireConfirm && (
                  <input
                    type="text"
                    placeholder="Message d'avertissement affiché au déclenchement..."
                    value={newMacroConfirmPrompt}
                    onChange={(e) => setNewMacroConfirmPrompt(e.target.value)}
                    className="ui-lcd w-full px-3 py-1.5 rounded text-xs text-slate-100"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Couleur du Bouton</label>
                <div className="flex gap-2">
                  {(['purple', 'amber', 'blue', 'green', 'red', 'teal', 'magenta'] as ChannelColor[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewMacroColor(c)}
                      className={`w-7 h-7 rounded-[4px] border-2 transition-transform ${
                        newMacroColor === c ? 'scale-110 border-white' : 'border-transparent'
                      }`}
                      style={{
                        backgroundColor:
                          c === 'purple' ? '#a855f7' :
                          c === 'amber' ? '#f59e0b' :
                          c === 'blue' ? '#0ea5e9' :
                          c === 'green' ? '#10b981' :
                          c === 'red' ? '#ef4444' :
                          c === 'teal' ? '#14b8a6' : '#ec4899',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#2b3038]">
                <button
                  type="button"
                  onClick={() => setIsCreatingMacro(false)}
                  className="ui-btn px-4 py-2 text-xs font-mono font-bold rounded-[4px]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="ui-btn-cyan px-5 py-2 font-mono font-bold text-xs rounded-[4px]"
                >
                  Enregistrer la Macro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
