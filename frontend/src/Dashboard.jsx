import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import Careers from './Careers';

export default function Dashboard() {
  const { career, refreshCareers, setIsImporting, setImportMessage, isImporting: globalImporting } = useOutletContext();
  const [localSaves, setLocalSaves] = useState([]);
  const [loadingSaves, setLoadingSaves] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState({ success: null, message: "" });
  const [manualPath, setManualPath] = useState("");
  const [teamOffset, setTeamOffset] = useState(1);
  
  // Dashboard stats
  const [stats, setStats] = useState({ clubs: 0, players: 0, transfers: 0, timeline: 0 });
  const [statsLoading, setStatsLoading] = useState(false);

  const fetchLocalSaves = () => {
    setLoadingSaves(true);
    fetch('/api/careers/local-saves')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setLocalSaves(json.data);
        }
        setLoadingSaves(false);
      })
      .catch(err => {
        console.error("Failed to fetch local saves:", err);
        setLoadingSaves(false);
      });
  };

  const fetchStats = () => {
    if (!career) return;
    setStatsLoading(true);
    
    Promise.all([
      fetch(`/api/careers/${career.id}/clubs?limit=1000`).then(res => res.json()),
      fetch(`/api/careers/${career.id}/players?limit=1000`).then(res => res.json()),
      fetch(`/api/careers/${career.id}/transfers?limit=200`).then(res => res.json()),
      fetch(`/api/careers/${career.id}/timeline?limit=200`).then(res => res.json())
    ])
      .then(([clubsData, playersData, transfersData, timelineData]) => {
        setStats({
          clubs: clubsData.length,
          players: playersData.length,
          transfers: transfersData.length,
          timeline: timelineData.length
        });
        setStatsLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch dashboard stats:", err);
        setStatsLoading(false);
      });
  };

  useEffect(() => {
    fetchLocalSaves();
  }, [career]);

  useEffect(() => {
    if (career) {
      fetchStats();
    }
  }, [career]);

  const handleImport = (path) => {
    if (importing || globalImporting) return;
    
    setImporting(true);
    if (setIsImporting) setIsImporting(true);
    if (setImportMessage) setImportMessage("Parsing save file...");
    
    setImportStatus({ success: null, message: "Ingesting Frostbite chunks and parsing career save..." });

    // Phase 1 message update after 2s
    const t1 = setTimeout(() => {
      if (setImportMessage) setImportMessage("Parsing player databases & resolving names...");
      setImportStatus({ success: null, message: "Parsing player databases & resolving names..." });
    }, 2000);

    // Phase 2 message update after 5s
    const t2 = setTimeout(() => {
      if (setImportMessage) setImportMessage("Building career timeline & transfers...");
      setImportStatus({ success: null, message: "Building career timeline & transfers..." });
    }, 5000);

    fetch(`/api/import?file_path=${encodeURIComponent(path)}&team_offset=${teamOffset}`, {
      method: 'POST',
    })
      .then(res => res.json())
      .then(json => {
        clearTimeout(t1);
        clearTimeout(t2);
        setImporting(false);
        if (setIsImporting) setIsImporting(false);
        if (setImportMessage) setImportMessage("");

        if (json.success) {
          setImportStatus({ success: true, message: `Successfully imported universe: "${json.data.name}"!` });
          
          // Trigger layout to refresh careers list and select the newly imported career ID
          refreshCareers(json.data.id);
          
          // Clear status after 3 seconds
          setTimeout(() => {
            setImportStatus({ success: null, message: "" });
          }, 3000);
        } else {
          setImportStatus({ success: false, message: `Import failed: ${json.detail || 'Lock conflict or schema error'}` });
        }
      })
      .catch(err => {
        clearTimeout(t1);
        clearTimeout(t2);
        setImporting(false);
        if (setIsImporting) setIsImporting(false);
        if (setImportMessage) setImportMessage("");
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
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // If no career exists, display the import dashboard
  if (!career) {
    return <Careers />;
  }

  // Active Career Dashboard overview
  return (
    <main>
      {/* Import Status Alert overlay */}
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

      {/* Header Banner */}
      <div className="mb-section-gap flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-display-hero-mobile md:text-display-hero font-display-hero-mobile md:font-display-hero text-on-surface tracking-tighter">Overview</h1>
          <p className="text-body-lg font-body-lg text-on-surface-variant mt-2">Welcome back, {career.manager_name || 'Gaffer'}. Here is the state of your universe.</p>
        </div>
        
        {/* Quick Re-import/Sync Button */}
        <button
          onClick={() => handleImport(career.save_file_path)}
          disabled={importing}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-on-primary font-bold shadow-[0_4px_15px_rgba(78,222,163,0.25)] hover:shadow-[0_4px_25px_rgba(78,222,163,0.4)] transition-all duration-300 self-start md:self-auto disabled:opacity-50"
        >
          <span className="material-symbols-outlined animate-spin-hover">sync</span>
          Sync Save File
        </button>
      </div>

      {/* Key Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-8">
        {/* Active Club info */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden shadow-xl lg:col-span-2 flex items-center justify-between border border-white/5">
          <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="min-w-0 pr-4">
            <h3 className="text-label-caps font-label-caps text-on-surface-variant mb-1.5">Active Project</h3>
            <h2 className="text-headline-lg font-headline-lg text-on-surface font-black truncate leading-tight mb-1">{career.team_name || "Unknown Club"}</h2>
            <p className="text-body-md text-on-surface-variant">Manager: <span className="font-semibold text-primary">{career.manager_name || "Unknown"}</span></p>
          </div>
          <div className="w-20 h-20 rounded-full overflow-hidden border border-white/10 shadow-2xl bg-surface-container flex items-center justify-center p-1.5 flex-shrink-0">
            {career.team_id ? (
              <img alt="Team Crest" className="w-full h-full object-contain" src={getLogoUrl(career.team_id)} onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
            ) : null}
            <span className="material-symbols-outlined text-on-surface-variant text-4xl hidden">shield</span>
          </div>
        </div>

        {/* Total Clubs */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden shadow-xl border border-white/5">
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-secondary-container/10 rounded-full blur-xl -mr-5 -mb-5"></div>
          <h3 className="text-label-caps font-label-caps text-on-surface-variant mb-2">Clubs Tracked</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-display-hero-mobile font-display-hero-mobile text-secondary drop-shadow-[0_0_15px_rgba(173,198,255,0.2)]">
              {statsLoading ? "..." : stats.clubs}
            </span>
          </div>
        </div>

        {/* Total Players */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden shadow-xl border border-white/5">
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-tertiary-fixed-dim/10 rounded-full blur-xl -mr-5 -mb-5"></div>
          <h3 className="text-label-caps font-label-caps text-on-surface-variant mb-2">Active Players</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-display-hero-mobile font-display-hero-mobile text-tertiary drop-shadow-[0_0_15px_rgba(255,185,95,0.2)]">
              {statsLoading ? "..." : stats.players}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Save Scanner & Import options */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        {/* Left Span: local save folder detection list */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-headline-md font-headline-md text-on-surface tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">explore</span>
            Import Other Save Slots
          </h2>
          
          <div className="glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
            <p className="text-body-md text-on-surface-variant">We scanned your EA SPORTS FC 26 settings folder. Import additional career slots to switch between them on the top right.</p>
            
            {loadingSaves ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : localSaves.length === 0 ? (
              <div className="py-8 text-center text-on-surface-variant/60 text-body-md">
                No local saves detected.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                {localSaves.map(save => (
                  <div key={save.save_identifier} className="bg-surface-container/30 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/5 transition-colors group">
                    <div className="min-w-0 mb-4">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-body-md font-bold text-on-surface truncate group-hover:text-primary transition-colors">{save.name || "Career Save"}</h4>
                        {save.imported && (
                          <span className="bg-primary/10 text-primary text-[9px] font-bold px-2 py-0.5 rounded-full border border-primary/20 whitespace-nowrap">
                            Imported
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1.5 truncate">Gaffer: <span className="text-on-surface font-semibold">{save.manager_name || "Unknown"}</span></p>
                      <p className="text-xs text-on-surface-variant truncate">Team: <span className="text-primary font-semibold">{save.team_name || "Unknown"}</span></p>
                      <p className="text-[10px] text-on-surface-variant/50 mt-2">Filename: {save.filename} • {formatDate(save.modified_at)}</p>
                    </div>
                    
                    <button
                      onClick={() => handleImport(save.path)}
                      disabled={importing}
                      className={`w-full py-2.5 rounded-xl text-center text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                        save.imported 
                          ? 'bg-white/5 hover:bg-primary/20 text-on-surface hover:text-primary border border-white/5' 
                          : 'bg-primary text-on-primary shadow-lg'
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

        {/* Right side manual overrides panel */}
        <div className="space-y-6">
          <h2 className="text-headline-md font-headline-md text-on-surface tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary">settings</span>
            Manual Settings
          </h2>
          
          <div className="glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-body-md text-on-surface-variant font-bold">Manual File Path Import</label>
              <input
                type="text"
                placeholder="C:\Users\...\CmMgrC202607160104..."
                value={manualPath}
                onChange={(e) => setManualPath(e.target.value)}
                className="w-full bg-surface-container/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:border-primary/50"
              />
            </div>
            
            <div className="flex items-center justify-between border-t border-white/5 pt-4">
              <span className="text-xs text-on-surface-variant">Team ID Offset Index</span>
              <select 
                value={teamOffset} 
                onChange={(e) => setTeamOffset(parseInt(e.target.value))}
                className="bg-surface-container border border-white/10 rounded-lg px-2.5 py-1 text-xs text-on-surface focus:outline-none"
              >
                <option value={1}>1 (Recommended)</option>
                <option value={0}>0 (Legacy)</option>
              </select>
            </div>
            
            <button
              onClick={() => handleImport(manualPath)}
              disabled={importing || !manualPath}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary border border-white/5 text-xs font-bold transition-all disabled:opacity-50"
            >
              Manual Import
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
