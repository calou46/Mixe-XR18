import React from 'react';
import { Maximize2, ExternalLink, Download, MoreVertical, Smartphone, X } from 'lucide-react';
import { useXR18 } from '../context/XR18Context';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const FullscreenHelpModal: React.FC = () => {
  const { fullscreenHelpOpen, setFullscreenHelpOpen, isInIframe } = useXR18();
  const { isInstallable, install } = usePWAInstall();

  if (!fullscreenHelpOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-lg bg-[#1c2026] border border-[#303640] shadow-2xl overflow-hidden">
        <div className="ui-topbar flex items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Plein Écran sur Tablette Android / Chrome
            </h3>
          </div>
          <button
            onClick={() => setFullscreenHelpOpen(false)}
            className="ui-btn p-1.5 rounded-[4px]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-slate-300 leading-relaxed">
          {isInIframe && (
            <div className="p-3 rounded bg-[#14171b] border border-amber-500/40 space-y-2">
              <p className="text-amber-200 font-semibold">
                L'application est actuellement ouverte dans un cadre intégré qui bloque le plein écran natif de Chrome.
              </p>
              <a
                href={typeof window !== 'undefined' ? window.location.href : '/'}
                target="_top"
                rel="noopener noreferrer"
                className="ui-btn-amber w-full py-2 px-3 rounded-[4px] font-mono font-bold flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ouvrir directement dans Chrome</span>
              </a>
            </div>
          )}

          {isInstallable && (
            <div className="p-3 rounded bg-[#14171b] border border-emerald-500/40 space-y-2">
              <p className="text-emerald-200 font-semibold">
                Installez l'application sur votre tablette pour un lancement permanent 100% sans barre Chrome :
              </p>
              <button
                onClick={async () => {
                  const ok = await install();
                  if (ok) setFullscreenHelpOpen(false);
                }}
                className="ui-btn-green w-full py-2.5 px-3 rounded-[4px] font-mono font-bold flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Installer l'App Plein Écran</span>
              </button>
            </div>
          )}

          <div className="p-3.5 rounded bg-[#14171b] border border-[#2b3038] space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-slate-100">
              <Smartphone className="w-4 h-4 text-sky-400" />
              <span>Méthode directe dans Google Chrome (Teclast T65 Max)</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
              <li>
                Ouvrez le menu <strong className="ui-lcd inline-flex items-center px-1 py-0.5 rounded text-slate-100"><MoreVertical className="w-3 h-3" /></strong> en haut à droite de Chrome.
              </li>
              <li>
                Touchez <strong>« Ajouter à l'écran d'accueil »</strong> ou <strong>« Installer l'application »</strong>.
              </li>
              <li>
                Ouvrez <strong>XR18 Touch</strong> depuis l'écran d'accueil : la barre d'adresse disparaît totalement.
              </li>
            </ol>
          </div>
        </div>

        <div className="px-5 py-3 bg-[#14171b] border-t border-[#2b3038] flex justify-end">
          <button
            onClick={() => setFullscreenHelpOpen(false)}
            className="ui-btn-cyan px-4 py-1.5 rounded-[4px] text-xs font-mono font-bold"
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  );
};
