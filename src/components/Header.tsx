import React from 'react';
import { useXR18 } from '../context/XR18Context';
import { PWAInstallButton } from './PWAInstallButton';
import {
  SlidersHorizontal,
  Sparkles,
  Zap,
  Bookmark,
  Wifi,
  Mic,
  ArrowRightLeft,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface HeaderProps {
  currentView: 'mixer' | 'fx' | 'macros';
  onSelectView: (view: 'mixer' | 'fx' | 'macros') => void;
  onOpenScenes: () => void;
  onOpenConnection: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSelectView,
  onOpenScenes,
  onOpenConnection,
}) => {
  const {
    sendsOnFaders,
    exitSendsOnFaders,
    isMicActive,
    toggleMicLive,
    isFullscreen,
    toggleFullscreen,
  } = useXR18();

  return (
    <header className="ui-topbar flex items-center justify-between gap-2 sm:gap-4 px-2.5 sm:px-4 xl:px-6 py-1.5 sm:py-2 shrink-0 select-none overflow-hidden">
      {/* Zone 1: Soundcraft Ui style wordmark */}
      <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
        <a href="/" className="text-sm sm:text-base font-extrabold tracking-tight text-neutral-100 flex items-center gap-1.5 sm:gap-2">
          <span className="font-mono text-sky-400 hidden xl:inline">BEHRINGER</span>
          <span className="font-mono text-sky-400">XR18</span>
          <span className="text-neutral-300 font-semibold text-xs hidden 2xl:inline">Ui-STYLE CONSOLE</span>
        </a>

        {sendsOnFaders.active && (
          <button
            onClick={exitSendsOnFaders}
            className="ui-btn-amber hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono font-bold rounded"
            title="Cliquez pour quitter Sends on Faders"
          >
            <ArrowRightLeft className="w-3 h-3" />
            <span>SOF : {sendsOnFaders.targetName}</span>
          </button>
        )}
      </div>

      {/* Zone 2: Embossed Ui24R hardware navigation tabs */}
      <nav className="flex items-center gap-1 bg-[#121417] p-1 rounded border border-[#2d323b] text-[11px] sm:text-xs font-bold whitespace-nowrap min-w-0 overflow-x-auto shadow-inner">
        <button
          onClick={() => onSelectView('mixer')}
          className={`px-2.5 sm:px-3 py-1 rounded flex items-center gap-1.5 shrink-0 ${
            currentView === 'mixer' ? 'ui-btn-cyan' : 'ui-btn'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="xl:hidden">Mixer</span>
          <span className="hidden xl:inline">Console Mix</span>
        </button>

        <button
          onClick={() => onSelectView('fx')}
          className={`px-2.5 sm:px-3 py-1 rounded flex items-center gap-1.5 shrink-0 ${
            currentView === 'fx' ? 'ui-btn-cyan' : 'ui-btn'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="xl:hidden">Effets</span>
          <span className="hidden xl:inline">Racks FX (1-4)</span>
        </button>

        <button
          onClick={() => onSelectView('macros')}
          className={`px-2.5 sm:px-3 py-1 rounded flex items-center gap-1.5 shrink-0 ${
            currentView === 'macros' ? 'ui-btn-cyan' : 'ui-btn'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="xl:hidden">Macros</span>
          <span className="hidden xl:inline">Boutons Macro</span>
        </button>

        <button
          onClick={onOpenScenes}
          className="ui-btn px-2.5 sm:px-3 py-1 rounded flex items-center gap-1.5 shrink-0"
        >
          <Bookmark className="w-3.5 h-3.5 text-sky-400" />
          <span className="xl:hidden">Scènes</span>
          <span className="hidden xl:inline">Scènes & Snapshots</span>
        </button>
      </nav>

      {/* Zone 3: Fullscreen + Install + Connection */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap">
        <button
          onClick={toggleFullscreen}
          className={`px-2.5 sm:px-3 py-1.5 rounded text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5 ${
            isFullscreen ? 'ui-btn-amber' : 'ui-btn-cyan'
          }`}
          title={isFullscreen ? 'Quitter le mode plein écran' : 'Passer en mode plein écran'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">{isFullscreen ? 'RÉDUIRE' : 'PLEIN ÉCRAN'}</span>
        </button>

        <PWAInstallButton />

        <button
          onClick={toggleMicLive}
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-bold rounded ${
            isMicActive ? 'ui-btn-red' : 'ui-btn'
          }`}
          title="Connecter votre microphone physique réel aux vumètres"
        >
          <Mic className={`w-3.5 h-3.5 ${isMicActive ? 'animate-pulse' : 'text-sky-400'}`} />
          <span>{isMicActive ? 'MICRO ON' : 'MICRO'}</span>
        </button>

        <button
          onClick={onOpenConnection}
          className="ui-btn px-2.5 sm:px-3 py-1.5 rounded text-[11px] sm:text-xs font-mono font-bold flex items-center gap-1.5"
          title="Configurer l'adresse IP du XR18 et surveiller le trafic OSC"
        >
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline">XR18 UDP 10024</span>
          <span className="md:hidden">UDP</span>
        </button>
      </div>
    </header>
  );
};
