import React, { useState, useRef } from 'react';
import { useXR18 } from '../context/XR18Context';
import { SceneData } from '../types/xr18';
import {
  Bookmark,
  Check,
  Plus,
  Trash2,
  Download,
  Upload,
  FolderOpen,
  X,
  Sparkles,
  Save,
} from 'lucide-react';

interface ScenesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScenesModal: React.FC<ScenesModalProps> = ({ isOpen, onClose }) => {
  const {
    scenes,
    currentSceneId,
    recallScene,
    saveNewScene,
    updateCurrentScene,
    deleteScene,
    exportScenesJson,
    importScenesJson,
  } = useXR18();

  const [isCreating, setIsCreating] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');
  const [newSceneDesc, setNewSceneDesc] = useState('');
  const [newSceneCat, setNewSceneCat] = useState<SceneData['category']>('Custom');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSceneName.trim()) return;
    saveNewScene(newSceneName.trim(), newSceneDesc.trim(), newSceneCat);
    setIsCreating(false);
    setNewSceneName('');
    setNewSceneDesc('');
  };

  const handleExport = () => {
    const jsonStr = exportScenesJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xr18-scenes-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const ok = importScenesJson(content);
      if (ok) {
        setImportStatus('Scènes importées avec succès !');
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus('Erreur : Fichier JSON de scènes invalide.');
        setTimeout(() => setImportStatus(null), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-3xl bg-[#1c2026] border border-[#303640] rounded-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Modal Header */}
        <div className="ui-topbar p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="ui-lcd w-10 h-10 rounded-[4px] flex items-center justify-center text-sky-400">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-100">Gestionnaire de Scènes & Snapshots XR18</h2>
              <p className="text-xs text-slate-400">
                Sauvegardez l'état complet du mixage (niveaux, routing, gains, effets et mutes)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreating(true)}
              className="ui-btn-cyan px-3.5 py-2 font-mono font-bold text-xs rounded-[4px] flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Scène</span>
            </button>
            <button
              onClick={onClose}
              className="ui-btn p-2 rounded-[4px]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action feedback alert */}
        {importStatus && (
          <div className="px-5 py-2 bg-[#14171b] text-xs font-mono text-sky-300 border-b border-[#2b3038]">
            {importStatus}
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 ui-chassis">
          <div className="flex items-center justify-between p-3.5 rounded bg-[#14171b] border border-[#2b3038] gap-3">
            <div className="text-xs text-slate-300">
              <span className="font-semibold">Mettre à jour la scène active</span> avec les réglages faders et effets en cours :
            </div>
            <button
              onClick={updateCurrentScene}
              className="ui-btn px-3.5 py-2 text-xs font-mono font-bold rounded-[4px] flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>Écraser / Sauver</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {scenes.map((scene) => {
              const isActive = currentSceneId === scene.id;
              return (
                <div
                  key={scene.id}
                  className={`p-4 rounded bg-[#181b20] border transition-all ${
                    isActive
                      ? 'border-sky-400 ring-1 ring-sky-400/50 shadow-lg'
                      : 'border-[#2c313a] hover:border-[#3d4450]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="ui-lcd text-[10px] font-mono font-semibold px-2 py-0.5 rounded-[3px] text-slate-300">
                        {scene.category}
                      </span>
                      <h3 className="text-sm font-bold text-slate-100 mt-1.5">{scene.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {scene.description || 'Scène sauvegardée'}
                      </p>
                    </div>

                    {isActive && (
                      <span className="px-2 py-0.5 text-[9px] font-mono font-bold text-sky-300 bg-sky-950/70 border border-sky-500/60 rounded-[3px] flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#292e36]">
                    <button
                      onClick={() => recallScene(scene.id)}
                      className={`px-4 py-1.5 text-xs font-mono font-bold rounded-[4px] ${
                        isActive ? 'ui-btn-cyan' : 'ui-btn'
                      }`}
                    >
                      {isActive ? 'SCÈNE RAPPELÉE' : 'CHARGER / RAPPELER'}
                    </button>

                    {!scene.id.startsWith('scene-rock') && !scene.id.startsWith('scene-acoustic') && (
                      <button
                        onClick={() => deleteScene(scene.id)}
                        className="ui-btn p-1.5 text-slate-400 hover:text-red-400 rounded-[4px]"
                        title="Supprimer la scène"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer with Import / Export */}
        <div className="p-3.5 border-t border-[#2b3038] bg-[#14171b] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="ui-btn px-3 py-1.5 text-xs font-mono font-bold rounded-[4px] flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter (JSON)</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="ui-btn px-3 py-1.5 text-xs font-mono font-bold rounded-[4px] flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importer</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>

          <button
            onClick={onClose}
            className="ui-btn-cyan px-4 py-1.5 text-xs font-mono font-bold rounded-[4px]"
          >
            Fermer
          </button>
        </div>

        {/* Create Scene Sub-modal */}
        {isCreating && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#1c2026] border border-[#303640] rounded-lg p-5 shadow-2xl">
              <h3 className="text-base font-bold text-slate-100">Enregistrer une Nouvelle Scène</h3>
              <p className="text-xs text-slate-400 mt-1">
                L'état actuel des 18 tranches, des retours et des effets sera instantanément mémorisé.
              </p>

              <form onSubmit={handleCreateSubmit} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Nom de la Scène</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Concert Festival Main Stage"
                    value={newSceneName}
                    onChange={(e) => setNewSceneName(e.target.value)}
                    className="ui-lcd w-full px-3 py-2 rounded text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Description / Notes</label>
                  <input
                    type="text"
                    placeholder="ex: Égalisation adaptée salle réverbérante"
                    value={newSceneDesc}
                    onChange={(e) => setNewSceneDesc(e.target.value)}
                    className="ui-lcd w-full px-3 py-2 rounded text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Catégorie</label>
                  <select
                    value={newSceneCat}
                    onChange={(e) => setNewSceneCat(e.target.value as any)}
                    className="ui-lcd w-full px-3 py-2 rounded text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="Live Concert">Live Concert</option>
                    <option value="Acoustique">Acoustique</option>
                    <option value="Conférence">Conférence</option>
                    <option value="Studio">Studio</option>
                    <option value="Custom">Personnalisé</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="ui-btn px-4 py-2 text-xs font-mono font-bold rounded-[4px]"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="ui-btn-cyan px-5 py-2 font-mono font-bold text-xs rounded-[4px]"
                  >
                    Sauvegarder
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
