/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { XR18Provider, useXR18 } from './context/XR18Context';
import { Header } from './components/Header';
import { MeterBridge } from './components/MeterBridge';
import { ChannelStrip } from './components/ChannelStrip';
import { BusFXStrip } from './components/BusFXStrip';
import { MasterSection } from './components/MasterSection';
import { FxRackView } from './components/FxRackView';
import { MacroPad } from './components/MacroPad';
import { ChannelInspectorModal } from './components/ChannelInspectorModal';
import { ScenesModal } from './components/ScenesModal';
import { ConnectionModal } from './components/ConnectionModal';
import { MacroConfirmModal } from './components/MacroConfirmModal';
import { FullscreenHelpModal } from './components/FullscreenHelpModal';
import {
  ChevronDown,
  ChevronUp,
  Activity,
} from 'lucide-react';

type ChannelFilterCategory = 'all' | 'drums' | 'instruments' | 'vocals' | 'aux_in' | 'aux_buses' | 'fx_mix';

function MixerDesk() {
  const {
    channels,
    auxBuses,
    fxRacks,
    meterLevels,
    busMeters,
    fxMeters,
    sendsOnFaders,
    activateSendsOnFaders,
    selectedChannelId,
    selectChannel,
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
    isFitScreen,
    toggleFitScreen,
    isFullscreen,
    toggleFullscreen,
  } = useXR18();

  const [filterCat, setFilterCat] = useState<ChannelFilterCategory>('all');
  const [showMeterBridge, setShowMeterBridge] = useState<boolean>(true);
  const [inspectorChannelId, setInspectorChannelId] = useState<number | null>(null);

  // Filter channels according to category
  const filteredChannels = channels.filter((ch) => {
    if (filterCat === 'all') return true;
    if (filterCat === 'drums') return ch.id >= 1 && ch.id <= 7;
    if (filterCat === 'instruments') return ch.id >= 8 && ch.id <= 13;
    if (filterCat === 'vocals') return ch.id >= 14 && ch.id <= 16;
    if (filterCat === 'aux_in') return ch.id >= 17 && ch.id <= 18;
    return false;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 ui-chassis overflow-hidden h-full">
      {/* Top Meter Bridge */}
      <MeterBridge isCollapsed={!showMeterBridge} onToggleCollapse={() => setShowMeterBridge(!showMeterBridge)} />

      {/* Sub-toolbar: Soundcraft Ui24R embossed bank selector buttons */}
      <div className="ui-subbar px-2.5 sm:px-3 py-1.5 flex items-center justify-between gap-2 text-xs select-none shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto p-0.5 bg-[#121417] rounded border border-[#2d323b] shadow-inner">
          <button
            onClick={() => setFilterCat('all')}
            className={`px-2.5 py-1 font-bold rounded whitespace-nowrap ${
              filterCat === 'all' ? 'ui-btn-cyan' : 'ui-btn'
            }`}
          >
            Toutes (1-18)
          </button>

          <button
            onClick={() => setFilterCat('drums')}
            className={`px-2.5 py-1 font-bold rounded whitespace-nowrap ${
              filterCat === 'drums' ? 'ui-btn-cyan' : 'ui-btn'
            }`}
          >
            Batterie (1-7)
          </button>

          <button
            onClick={() => setFilterCat('instruments')}
            className={`px-2.5 py-1 font-bold rounded whitespace-nowrap ${
              filterCat === 'instruments' ? 'ui-btn-cyan' : 'ui-btn'
            }`}
          >
            Instru (8-13)
          </button>

          <button
            onClick={() => setFilterCat('vocals')}
            className={`px-2.5 py-1 font-bold rounded whitespace-nowrap ${
              filterCat === 'vocals' ? 'ui-btn-cyan' : 'ui-btn'
            }`}
          >
            Voix (14-16)
          </button>

          <button
            onClick={() => setFilterCat('aux_in')}
            className={`px-2.5 py-1 font-bold rounded whitespace-nowrap ${
              filterCat === 'aux_in' ? 'ui-btn-cyan' : 'ui-btn'
            }`}
          >
            Ligne (17-18)
          </button>

          <button
            onClick={() => setFilterCat('aux_buses')}
            className={`px-2.5 py-1 font-bold rounded whitespace-nowrap ${
              filterCat === 'aux_buses' ? 'ui-btn-amber' : 'ui-btn'
            }`}
          >
            Départs Bus (1-6)
          </button>

          <button
            onClick={() => setFilterCat('fx_mix')}
            className={`px-2.5 py-1 font-bold rounded whitespace-nowrap ${
              filterCat === 'fx_mix' ? 'ui-btn-purple' : 'ui-btn'
            }`}
          >
            FX Départs & Retours
          </button>
        </div>

        {/* View Options: Fit Screen + Meter Bridge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={toggleFitScreen}
            className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold flex items-center gap-1 ${
              isFitScreen ? 'ui-btn-cyan' : 'ui-btn'
            }`}
            title="Bascule entre affichage 100% ajusté sans ascenseur et affichage avec défilement"
          >
            <span>{isFitScreen ? '100% AJUSTÉ' : 'DÉFILEMENT'}</span>
          </button>

          <button
            onClick={() => setShowMeterBridge(!showMeterBridge)}
            className="ui-btn px-2 py-1 rounded flex items-center gap-1 text-[11px] font-bold"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">{showMeterBridge ? 'Vumètres' : 'Afficher VU'}</span>
            {showMeterBridge ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Main Console Surface: Channels Strips + Sticky Master Section */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Side: Channel Strips Horizontal Container */}
        <div
          className={`flex-1 flex ${
            isFitScreen ? 'overflow-hidden' : 'overflow-x-auto'
          } overflow-y-hidden bg-[#15171b] h-full min-h-0`}
        >
          {filterCat === 'aux_buses' ? (
            auxBuses.map((bus) => (
              <BusFXStrip
                key={`bus-${bus.id}`}
                kind="bus"
                id={bus.id}
                code={`BUS 0${bus.id}`}
                name={bus.name}
                fader={bus.fader}
                pan={bus.pan}
                mute={bus.mute}
                solo={bus.solo}
                meter={busMeters[bus.id] || { rms: -60, peak: -60, peakHold: -60, clip: false }}
                accentColor={bus.color === 'teal' ? 'teal' : bus.color === 'purple' ? 'purple' : 'amber'}
                onFaderChange={(val) => setBusFader(bus.id, val)}
                onPanChange={(pan) => setBusPan(bus.id, pan)}
                onToggleMute={() => toggleBusMute(bus.id)}
                onToggleSolo={() => toggleBusSolo(bus.id)}
                onActivateSoF={() => {
                  activateSendsOnFaders('bus', bus.id, `Bus ${bus.id} - ${bus.name}`);
                  setFilterCat('all');
                }}
              />
            ))
          ) : filterCat === 'fx_mix' ? (
            <>
              {/* 4 FX Send Master Strips */}
              {fxRacks.map((fx) => {
                const m = fxMeters[fx.id];
                return (
                  <BusFXStrip
                    key={`fx-send-${fx.id}`}
                    kind="fx_send"
                    id={fx.id}
                    code={`FX${fx.id} SND`}
                    name={`Départ ${fx.name}`}
                    fader={fx.sendFader ?? 0.75}
                    mute={!!fx.sendMute}
                    solo={!!fx.sendSolo}
                    meter={m?.send || { rms: -60, peak: -60, peakHold: -60, clip: false }}
                    accentColor="purple"
                    onFaderChange={(val) => setFXSendMasterFader(fx.id, val)}
                    onToggleMute={() => toggleFXSendMasterMute(fx.id)}
                    onToggleSolo={() => toggleFXSendMasterSolo(fx.id)}
                    onActivateSoF={() => {
                      activateSendsOnFaders('fx', fx.id, `FX ${fx.id} - ${fx.name}`);
                      setFilterCat('all');
                    }}
                  />
                );
              })}

              {/* Visual Divider between FX Sends and FX Returns */}
              <div className="w-1.5 bg-neutral-950 border-r border-neutral-800 shrink-0" />

              {/* 4 FX Return Stereo Strips */}
              {fxRacks.map((fx) => {
                const m = fxMeters[fx.id];
                return (
                  <BusFXStrip
                    key={`fx-rtn-${fx.id}`}
                    kind="fx_return"
                    id={fx.id}
                    code={`FX${fx.id} RTN`}
                    name={`Retour ${fx.name}`}
                    fader={fx.returnFader}
                    pan={fx.returnPan ?? 0}
                    mute={fx.returnMute}
                    solo={!!fx.returnSolo}
                    active={fx.active}
                    meter={m?.returnLeft || { rms: -60, peak: -60, peakHold: -60, clip: false }}
                    meterRight={m?.returnRight || { rms: -60, peak: -60, peakHold: -60, clip: false }}
                    accentColor="cyan"
                    onFaderChange={(val) => setFXReturnFader(fx.id, val)}
                    onPanChange={(pan) => setFXReturnPan(fx.id, pan)}
                    onToggleMute={() => toggleFXReturnMute(fx.id)}
                    onToggleSolo={() => toggleFXReturnSolo(fx.id)}
                    onToggleBypass={() => toggleFXActive(fx.id)}
                  />
                );
              })}
            </>
          ) : (
            filteredChannels.map((ch) => (
              <ChannelStrip
                key={ch.id}
                channel={ch}
                meter={meterLevels[ch.id] || { rms: -60, peak: -60, peakHold: -60, clip: false }}
                onOpenInspector={(id) => setInspectorChannelId(id)}
              />
            ))
          )}
        </div>

        {/* Right Side: Master Section */}
        <MasterSection />
      </div>

      {/* Channel Inspector Modal */}
      <ChannelInspectorModal
        channelId={inspectorChannelId}
        onClose={() => setInspectorChannelId(null)}
      />
    </div>
  );
}

function MainApp() {
  const { toggleFullscreen } = useXR18();
  const [currentView, setCurrentView] = useState<'mixer' | 'fx' | 'macros'>('mixer');
  const [isScenesModalOpen, setIsScenesModalOpen] = useState(false);
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);

  // Keyboard shortcut: F to toggle Fullscreen
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [toggleFullscreen]);

  return (
    <div className="h-[100dvh] w-screen max-h-[100dvh] max-w-screen flex flex-col bg-neutral-950 text-neutral-100 antialiased overflow-hidden">
      {/* Top Navigation */}
      <Header
        currentView={currentView}
        onSelectView={setCurrentView}
        onOpenScenes={() => setIsScenesModalOpen(true)}
        onOpenConnection={() => setIsConnectionModalOpen(true)}
      />

      {/* Main View Container */}
      <main className="flex-1 flex overflow-hidden min-h-0">
        {currentView === 'mixer' && <MixerDesk />}
        {currentView === 'fx' && <FxRackView />}
        {currentView === 'macros' && <MacroPad />}
      </main>

      {/* Modals */}
      <ScenesModal isOpen={isScenesModalOpen} onClose={() => setIsScenesModalOpen(false)} />
      <ConnectionModal isOpen={isConnectionModalOpen} onClose={() => setIsConnectionModalOpen(false)} />
      <MacroConfirmModal />
      <FullscreenHelpModal />
    </div>
  );
}

export default function App() {
  return (
    <XR18Provider>
      <MainApp />
    </XR18Provider>
  );
}
