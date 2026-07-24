import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';

export default function Careers() {
  const context = useOutletContext() || {};
  const { career: activeCareer, refreshCareers } = context;
  const navigate = useNavigate();

  const [careers, setCareers] = useState([]);
  const [localSaves, setLocalSaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState({ success: null, message: "" });
  
  // Modal state for New Universe / Save Import
  const [showImportModal, setShowImportModal] = useState(false);
  const [manualPath, setManualPath] = useState("");
  const [teamOffset, setTeamOffset] = useState(1);

  const fetchCareersAndSaves = () => {
    setLoading(true);
    const p1 = fetch('/api/careers')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setCareers(json.data || []);
        }
      })
      .catch(err => console.error("Failed to fetch careers:", err));

    const p2 = fetch('/api/careers/local-saves')
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          setLocalSaves(json.data || []);
        }
      })
      .catch(err => console.error("Failed to fetch local saves:", err));

    Promise.all([p1, p2]).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCareersAndSaves();
  }, []);

  const handleImport = (path) => {
    if (importing || !path) return;
    setImporting(true);
    setImportStatus({ success: null, message: "Parsing binary career save and extracting database..." });

    fetch(`/api/import?file_path=${encodeURIComponent(path)}&team_offset=${teamOffset}`, {
      method: 'POST',
    })
      .then(res => res.json())
      .then(json => {
        setImporting(false);
        if (json.success) {
          setImportStatus({ success: true, message: `Successfully imported universe: "${json.data.name}"!` });
          fetchCareersAndSaves();
          if (refreshCareers) refreshCareers(json.data.career_id);
          
          setTimeout(() => {
            setShowImportModal(false);
            setImportStatus({ success: null, message: "" });
            navigate('/dashboard');
          }, 1200);
        } else {
          setImportStatus({ success: false, message: `Import failed: ${json.detail || 'Unknown error'}` });
        }
      })
      .catch(err => {
        setImporting(false);
        setImportStatus({ success: false, message: `Request failed: ${err.message}` });
      });
  };

  const handleSelectCareer = (selectedCareer) => {
    localStorage.setItem("active_career_id", selectedCareer.id);
    if (refreshCareers) {
      refreshCareers(selectedCareer.id);
    }
    navigate('/dashboard');
  };

  const getLogoUrl = (gameId) => {
    if (!gameId) return null;
    return `/api/images/club/${gameId}?v=2`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
    });
  };

  const stadiumImages = [
    '/assets/stadium1.png',
    '/assets/stadium2.png'
  ];

  return (
    <div className="w-full max-w-6xl mx-auto py-4 px-2 sm:px-4">
      {/* Hero Header Section */}
      <div className="text-center mb-12 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          FC UNIVERSE
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight font-headline-lg">
          Select Your Universe
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto font-normal leading-relaxed">
          Return to the touchline. Choose an active career save to continue building your legacy, or forge a new path in football history.
        </p>
      </div>

      {/* Grid of Universes */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_20px_rgba(78,222,163,0.3)]"></div>
          <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">Scanning Career Timelines...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Imported Careers */}
          {careers.map((car, idx) => {
            const isActive = activeCareer && String(activeCareer.id) === String(car.id);
            const isLastPlayed = car.is_last_played || isActive;
            const bgStadium = stadiumImages[idx % stadiumImages.length];

            return (
              <div 
                key={car.id} 
                className="bg-[#12161f]/80 backdrop-blur-xl border border-white/10 hover:border-emerald-500/40 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 group flex flex-col justify-between relative hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)]"
              >
                {/* Stadium Header Image */}
                <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                  <img 
                    src={bgStadium} 
                    alt="Stadium" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#12161f] via-[#12161f]/40 to-transparent"></div>

                  {/* Top Badge (Last Played) */}
                  {isLastPlayed && (
                    <div className="absolute top-3 right-3 bg-emerald-950/90 border border-emerald-500/40 text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] backdrop-blur-md">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Last Played
                    </div>
                  )}

                  {/* Club Logo Crest */}
                  {car.team_id && (
                    <div className="absolute bottom-3 left-4 w-12 h-12 rounded-full bg-black/40 border border-white/20 p-1 flex items-center justify-center backdrop-blur-md shadow-lg">
                      <img 
                        src={getLogoUrl(car.team_id)} 
                        alt="Crest" 
                        className="w-full h-full object-contain"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}
                </div>

                {/* Card Content Body */}
                <div className="p-5 space-y-4 flex-1">
                  <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight group-hover:text-emerald-400 transition-colors line-clamp-1">
                      {car.team_name || car.name || "Real Madrid CF"}
                    </h3>
                    <p className="text-slate-400 text-sm flex items-center gap-1.5 mt-0.5 font-medium">
                      <span className="material-symbols-outlined text-base text-slate-500">person</span>
                      {car.manager_name || "Carlo Ancelotti"}
                    </p>
                  </div>

                  {/* Metric Boxes */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-surface-container/60 border border-white/5 rounded-xl p-3 backdrop-blur-sm">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Season</p>
                      <p className="text-base font-bold text-white">{car.current_season || "2026/27"}</p>
                    </div>
                    <div className="bg-surface-container/60 border border-white/5 rounded-xl p-3 backdrop-blur-sm">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Duration</p>
                      <p className="text-base font-bold text-white">{car.duration_years || "3 Years"}</p>
                    </div>
                  </div>

                  {/* Major Honours */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Major Honours</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {car.trophies_count > 0 ? (
                        car.trophies_summary?.map((h, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                            <span>{h.icon || "🏆"}</span>
                            <span>x{h.count}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">No trophies yet</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-5 py-4 border-t border-white/5 bg-black/20 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Created: {formatDate(car.created_at)}
                  </span>
                  <button
                    onClick={() => handleSelectCareer(car)}
                    className={`px-5 py-2 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-1.5 shadow-lg ${
                      isLastPlayed 
                        ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-[0_0_20px_rgba(78,222,163,0.35)] hover:translate-x-0.5' 
                        : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20'
                    }`}
                  >
                    {isLastPlayed ? 'Resume' : 'Load'}
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* New Universe Card */}
          <div 
            onClick={() => setShowImportModal(true)}
            className="border-2 border-dashed border-white/10 hover:border-emerald-500/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center group cursor-pointer transition-all duration-300 hover:bg-white/[0.02] min-h-[420px] bg-[#12161f]/40 backdrop-blur-sm"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white text-3xl mb-6 group-hover:scale-110 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/40 group-hover:text-emerald-400 transition-all duration-300 shadow-xl">
              <span className="material-symbols-outlined text-3xl">add</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
              New Universe
            </h3>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
              Start a new managerial journey and rewrite football history.
            </p>
          </div>
        </div>
      )}

      {/* Import / New Universe Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#161b22] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <span className="material-symbols-outlined">add_box</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Import Career Universe</h3>
                  <p className="text-xs text-slate-400">Scan local save files or specify binary path</p>
                </div>
              </div>
              <button 
                onClick={() => setShowImportModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Status notification */}
            {importStatus.message && (
              <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-semibold ${
                importStatus.success === true 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : importStatus.success === false
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                {importing ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span className="material-symbols-outlined text-base">
                    {importStatus.success === true ? 'check_circle' : importStatus.success === false ? 'error' : 'info'}
                  </span>
                )}
                <span>{importStatus.message}</span>
              </div>
            )}

            {/* Auto-detected Local Saves */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-sm">travel_explore</span>
                Detected Save Files
              </h4>

              {localSaves.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 italic">No local save files detected in EA SPORTS FC 26 folder.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {localSaves.map((save) => (
                    <div 
                      key={save.save_identifier}
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between hover:bg-white/[0.06] transition-colors"
                    >
                      <div className="min-w-0 pr-3">
                        <p className="text-sm font-bold text-white truncate">{save.name || save.filename}</p>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {save.manager_name ? `Manager: ${save.manager_name} • ` : ''}{save.team_name ? `Team: ${save.team_name}` : save.filename}
                        </p>
                      </div>
                      <button
                        onClick={() => handleImport(save.path)}
                        disabled={importing}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold transition-all shadow-md flex-shrink-0"
                      >
                        Import
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Manual Path Section */}
            <div className="border-t border-white/5 pt-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-sm">folder</span>
                Manual Path Import
              </h4>
              
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="C:\Users\...\CmMgrC20260716..."
                  value={manualPath}
                  onChange={(e) => setManualPath(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
                />

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <label>Team ID Offset Index:</label>
                  <select
                    value={teamOffset}
                    onChange={(e) => setTeamOffset(parseInt(e.target.value))}
                    className="bg-black/40 border border-white/10 rounded-lg px-3 py-1 text-white text-xs focus:outline-none"
                  >
                    <option value={1}>1 (Default / Recommended)</option>
                    <option value={0}>0 (Legacy)</option>
                  </select>
                </div>

                <button
                  onClick={() => handleImport(manualPath)}
                  disabled={importing || !manualPath}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm border border-white/10 transition-all disabled:opacity-40"
                >
                  Import File Path
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
