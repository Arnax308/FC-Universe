import React, { useState, useEffect } from 'react';

export default function Careers() {
  const [careers, setCareers] = useState([]);
  const [localSaves, setLocalSaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState({ success: null, message: "" });
  const [manualPath, setManualPath] = useState("");
  const [teamOffset, setTeamOffset] = useState(1);

  const fetchCareersAndSaves = () => {
    setLoading(true);
    // Fetch imported careers
    const p1 = fetch('/api/careers')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setCareers(json.data);
        }
      })
      .catch(err => console.error("Failed to fetch careers:", err));

    // Fetch local saves
    const p2 = fetch('/api/careers/local-saves')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setLocalSaves(json.data);
        }
      })
      .catch(err => console.error("Failed to fetch local saves:", err));

    Promise.all([p1, p2]).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCareersAndSaves();
  }, []);

  const handleImport = (path) => {
    setImporting(true);
    setImportStatus({ success: null, message: "Parsing and importing save data..." });
    
    fetch(`/api/import?file_path=${encodeURIComponent(path)}&team_offset=${teamOffset}`, {
      method: 'POST',
    })
      .then(res => res.json())
      .then(json => {
        setImporting(false);
        if (json.success) {
          setImportStatus({ success: true, message: `Successfully imported "${json.data.name}"!` });
          fetchCareersAndSaves();
          // Reload page after a delay to updateLayout context
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          setImportStatus({ success: false, message: `Import failed: ${json.detail || 'Unknown error'}` });
        }
      })
      .catch(err => {
        setImporting(false);
        setImportStatus({ success: false, message: `Request failed: ${err.message}` });
      });
  };

  const getLogoUrl = (gameId) => {
    if (!gameId) return null;
    return `/api/images/club/${gameId}?v=2`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-headline-lg font-headline-md text-on-surface mb-2 tracking-tight">Careers Manager</h1>
        <p className="text-body-lg text-on-surface-variant">Import, update, and manage your EA SPORTS FC 26 Career Mode universes.</p>
      </div>

      {importStatus.message && (
        <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 backdrop-blur-xl ${
          importStatus.success === true 
            ? 'bg-primary/10 border-primary/20 text-primary shadow-[0_0_15px_rgba(78,222,163,0.1)]' 
            : importStatus.success === false
            ? 'bg-error/10 border-error/20 text-error shadow-[0_0_15px_rgba(255,180,171,0.1)]'
            : 'bg-tertiary-fixed-dim/10 border-tertiary-fixed-dim/20 text-tertiary-fixed-dim'
        }`}>
          {importing ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <span className="material-symbols-outlined">
              {importStatus.success === true ? 'check_circle' : importStatus.success === false ? 'error' : 'info'}
            </span>
          )}
          <span className="text-body-md font-bold">{importStatus.message}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-on-surface-variant text-label-caps font-label-caps">Scanning directories...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          {/* Left Column: Imported Careers list */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-headline-md font-headline-md text-on-surface tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">work_history</span>
              Imported Universes
            </h2>
            
            {careers.length === 0 ? (
              <div className="glass-panel rounded-2xl p-8 text-center border border-white/5">
                <span className="material-symbols-outlined text-on-surface-variant text-5xl mb-3">folder_open</span>
                <p className="text-body-lg text-on-surface-variant font-medium">No careers imported yet.</p>
                <p className="text-body-md text-on-surface-variant/70 mt-1">Select an auto-detected save file on the right to start tracking history.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                {careers.map(car => (
                  <div key={car.id} className="glass-panel border border-white/5 rounded-2xl p-6 flex flex-col justify-between hover:border-primary/20 hover:shadow-[0_15px_30px_rgba(0,0,0,0.3)] transition-all duration-300 relative group overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                    <div>
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="min-w-0">
                          <h3 className="text-body-lg font-headline-md font-bold text-on-surface truncate group-hover:text-primary transition-colors">{car.name || "Road to Glory"}</h3>
                          <p className="text-label-caps font-label-caps text-on-surface-variant/80 text-xs mt-0.5">ID: {car.save_identifier.substring(0, 8)}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 shadow-md bg-surface-container/80 flex items-center justify-center p-0.5 flex-shrink-0">
                          {car.team_id ? (
                            <img alt="Team Crest" className="w-full h-full object-contain" src={getLogoUrl(car.team_id)} onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                          ) : null}
                          <span className="material-symbols-outlined text-on-surface-variant text-xl" style={{ display: car.team_id ? 'none' : 'block' }}>shield</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-6">
                        <div className="flex justify-between text-body-md">
                          <span className="text-on-surface-variant">Manager</span>
                          <span className="font-semibold text-on-surface">{car.manager_name || "Unknown"}</span>
                        </div>
                        <div className="flex justify-between text-body-md">
                          <span className="text-on-surface-variant">Active Team</span>
                          <span className="font-semibold text-on-surface">{car.team_name || "Unknown"}</span>
                        </div>
                        <div className="flex justify-between text-body-md">
                          <span className="text-on-surface-variant">Game Version</span>
                          <span className="font-semibold text-primary">{car.game_version}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t border-white/5 pt-4 mt-auto flex items-center justify-between text-xs text-on-surface-variant/70">
                      <span>Imported {formatDate(car.created_at)}</span>
                      <button 
                        onClick={() => handleImport(car.save_file_path)}
                        disabled={importing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-primary/20 hover:text-primary transition-all duration-300 font-semibold"
                      >
                        <span className="material-symbols-outlined text-xs">sync</span>
                        Update
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Manual import section */}
            <div className="glass-panel border border-white/5 rounded-2xl p-6 relative overflow-hidden">
              <h3 className="text-body-lg font-headline-md font-bold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary">folder_open</span>
                Manual Save File Import
              </h3>
              <div className="space-y-4">
                <p className="text-body-md text-on-surface-variant">If your save file is in a non-default location, enter the absolute file path below to import it manually.</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="C:\Absolute\Path\To\CmMgrC20260716..."
                    value={manualPath}
                    onChange={(e) => setManualPath(e.target.value)}
                    className="flex-1 bg-surface-container/50 border border-white/10 rounded-full px-5 py-3 text-body-md font-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/50"
                  />
                  <button
                    onClick={() => handleImport(manualPath)}
                    disabled={importing || !manualPath}
                    className="px-6 py-3 rounded-full bg-primary text-on-primary shadow-[0_4px_12px_rgba(78,222,163,0.25)] hover:shadow-[0_4px_20px_rgba(78,222,163,0.4)] disabled:opacity-50 disabled:pointer-events-none transition-all duration-300 font-bold"
                  >
                    Import File
                  </button>
                </div>
                
                <div className="flex items-center gap-4 border-t border-white/5 pt-4 mt-2">
                  <label className="text-body-md text-on-surface-variant">Team ID Offset Index:</label>
                  <select 
                    value={teamOffset} 
                    onChange={(e) => setTeamOffset(parseInt(e.target.value))}
                    className="bg-surface-container/50 border border-white/10 rounded-lg px-3 py-1.5 text-body-md text-on-surface focus:outline-none"
                  >
                    <option value={1}>1 (Recommended/Default)</option>
                    <option value={0}>0 (Legacy)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Local Save Files scanning */}
          <div className="space-y-6">
            <h2 className="text-headline-md font-headline-md text-on-surface tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">explore</span>
              Detected Local Saves
            </h2>
            
            <div className="glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
              <p className="text-body-md text-on-surface-variant">Scanned folder: <span className="font-mono text-xs text-primary bg-black/30 px-1.5 py-0.5 rounded">EA Sports FC 26 Settings</span></p>
              
              {localSaves.length === 0 ? (
                <div className="py-8 text-center text-on-surface-variant/75 text-body-md">
                  No local Career Mode save files detected. Make sure the game is installed and has active career mode saves.
                </div>
              ) : (
                <div className="space-y-3">
                  {localSaves.map(save => (
                    <div key={save.save_identifier} className="bg-surface-container/40 border border-white/5 rounded-xl p-4 flex flex-col justify-between gap-3 hover:bg-white/5 transition-colors group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-body-md font-bold text-on-surface truncate group-hover:text-primary transition-colors">{save.filename}</h4>
                          <p className="text-[11px] text-on-surface-variant mt-0.5">Modified: {formatDate(save.modified_at)}</p>
                          <p className="text-[11px] text-on-surface-variant/60">Size: {save.size_kb} KB</p>
                        </div>
                        {save.imported && (
                          <span className="bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5 rounded-full border border-primary/20 whitespace-nowrap">
                            Imported
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleImport(save.path)}
                        disabled={importing}
                        className={`w-full py-2.5 rounded-xl text-center text-label-caps font-label-caps font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                          save.imported 
                            ? 'bg-white/5 hover:bg-primary/20 text-on-surface hover:text-primary border border-white/5' 
                            : 'bg-primary text-on-primary shadow-[0_4px_12px_rgba(78,222,163,0.15)] hover:shadow-[0_4px_20px_rgba(78,222,163,0.3)]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {save.imported ? 'cached' : 'arrow_right_alt'}
                        </span>
                        {save.imported ? 'Re-import / Update' : 'Import Save'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
