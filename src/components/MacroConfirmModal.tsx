import React, { useEffect } from 'react';
import { useXR18 } from '../context/XR18Context';
import { AlertTriangle, X, Check, ShieldAlert } from 'lucide-react';

export const MacroConfirmModal: React.FC = () => {
  const { pendingMacroConfirmation, confirmPendingMacro, cancelPendingMacro } = useXR18();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelPendingMacro();
      } else if (e.key === 'Enter') {
        confirmPendingMacro();
      }
    };

    if (pendingMacroConfirmation) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingMacroConfirmation, confirmPendingMacro, cancelPendingMacro]);

  if (!pendingMacroConfirmation) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-md bg-[#1c2026] border border-amber-500/50 rounded-lg shadow-2xl p-6 relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="ui-lcd w-11 h-11 rounded-[4px] flex items-center justify-center text-amber-400 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                CONFIRMATION DE SÉCURITÉ MACRO
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-100 mt-1">
              {pendingMacroConfirmation.name}
            </h3>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              {pendingMacroConfirmation.confirmationPrompt ||
                'Êtes-vous certain de vouloir exécuter cette macro critique sur le mixage en cours ?'}
            </p>

            <div className="ui-lcd mt-3 p-3 rounded text-xs text-slate-300 font-mono">
              Action : {pendingMacroConfirmation.description}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-[#2b3038]">
          <button
            onClick={cancelPendingMacro}
            className="ui-btn px-4 py-2 text-xs font-mono font-bold rounded-[4px]"
          >
            Annuler (Échap)
          </button>

          <button
            onClick={confirmPendingMacro}
            className="ui-btn-red px-5 py-2 font-mono font-extrabold text-xs rounded-[4px] flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>CONFIRMER ET EXÉCUTER</span>
          </button>
        </div>
      </div>
    </div>
  );
};
