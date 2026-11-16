import React, { useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="ui-btn-green flex items-center gap-1 rounded-[4px] px-2 py-1 text-[11px] font-mono font-bold whitespace-nowrap shrink-0"
        title="Installer en application plein écran sur votre tablette"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">INSTALLER</span>
        <span className="sm:hidden">APP</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="ui-btn flex items-center gap-1 rounded-[4px] px-2 py-1 text-[11px] font-mono font-bold whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">App iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-sm rounded-lg bg-[#1c2026] border border-[#303640] p-5 shadow-2xl">
              <h3 className="text-base font-bold text-slate-100">Installer sur iPad / iPhone</h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                1. Touchez le bouton <strong>Partager</strong> dans la barre Safari.<br />
                2. Faites défiler et touchez <strong>Sur l'écran d'accueil</strong>.<br />
                3. Lancez l'icône pour profiter du mode plein écran sans barre d'adresse.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="ui-btn-cyan mt-4 w-full rounded-[4px] py-2 text-xs font-mono font-bold"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
