import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
  const [careers, setCareers] = useState([]);
  const [career, setCareer] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchCareers = (selectId = null) => {
    fetch('/api/careers')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setCareers(json.data);
          
          // Determine which career to make active
          const savedId = selectId || localStorage.getItem("active_career_id");
          let active = null;
          
          if (savedId) {
            active = json.data.find(c => String(c.id) === String(savedId));
          }
          
          if (!active && json.data.length > 0) {
            active = json.data[0];
          }
          
          if (active) {
            setCareer(active);
            localStorage.setItem("active_career_id", active.id);
          } else {
            setCareer(null);
          }
        }
        setInitialLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch careers:", err);
        setInitialLoading(false);
      });
  };

  useEffect(() => {
    fetchCareers();
  }, []);

  const handleSelectCareer = (selected) => {
    setCareer(selected);
    localStorage.setItem("active_career_id", selected.id);
    setDropdownOpen(false);
  };

  // Helper to trigger career refresh from children (like when importing)
  const refreshCareers = (selectId = null) => {
    fetchCareers(selectId);
  };

  if (initialLoading) {
    return (
      <div className="fixed inset-0 z-[200] bg-surface flex flex-col items-center justify-center p-6 select-none overflow-hidden">
        <div className="ambient-blur-emerald"></div>
        <div className="ambient-blur-blue"></div>
        
        <div className="relative flex flex-col items-center text-center space-y-6 max-w-sm">
          {/* Animated Glow Logo Icon */}
          <div className="relative w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
            <div className="w-20 h-20 rounded-full bg-surface-container border border-primary/30 shadow-[0_0_40px_rgba(78,222,163,0.3)] flex items-center justify-center backdrop-blur-xl">
              <span className="material-symbols-outlined text-primary text-4xl animate-pulse">sports_soccer</span>
            </div>
          </div>

          <div>
            <h1 className="text-headline-lg font-headline-lg font-black tracking-tighter text-primary drop-shadow-[0_0_20px_rgba(78,222,163,0.4)]">
              FC UNIVERSE
            </h1>
            <p className="text-body-md text-on-surface-variant mt-1.5 font-medium">Initializing Career Mode Engine...</p>
          </div>

          {/* Sleek Loading Bar */}
          <div className="w-64 h-1.5 bg-surface-container rounded-full overflow-hidden border border-white/10 relative">
            <div className="h-full bg-gradient-to-r from-primary via-tertiary to-primary w-full animate-pulse shadow-[0_0_15px_rgba(78,222,163,0.8)]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="ambient-blur-emerald"></div>
      <div className="ambient-blur-blue"></div>

      {/* Global Top Loading Bar during Save Sync / Import operations */}
      {isImporting && (
        <div className="fixed top-0 left-0 right-0 z-[100] h-1.5 bg-surface-container overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary via-tertiary to-primary w-full animate-pulse shadow-[0_0_12px_rgba(78,222,163,0.8)]"></div>
        </div>
      )}

      <nav className="hidden md:flex bg-surface-container/40 dark:bg-surface-container/40 backdrop-blur-2xl border-r border-white/10 shadow-xl fixed left-0 top-0 h-screen flex-col pt-24 pb-8 z-40 w-72 transition-all duration-300 ease-in-out">
        <div className="px-6 mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 shadow-lg bg-surface-container flex items-center justify-center p-0.5">
               {career && career.team_id ? (
                 <img alt="Team Logo" className="w-full h-full object-contain drop-shadow-md" src={`/api/images/club/${career.team_id}?v=2`} onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
               ) : null}
               <span className="material-symbols-outlined text-on-surface-variant text-2xl" style={{ display: (career && career.team_id) ? 'none' : 'block' }}>shield</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-headline-md font-headline-md text-primary tracking-tight truncate">{career ? career.team_name : 'No Active Club'}</h2>
              <p className="text-label-caps font-label-caps text-on-surface-variant truncate">{career ? career.manager_name : 'Select a Career'}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-1">
          <NavLink to="/" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg group transition-all duration-200 ${isActive ? 'text-on-primary-container bg-primary-container/20 border-r-2 border-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50 hover:bg-white/5'}`}>
            <span className={`material-symbols-outlined transition-transform ${'group-hover:scale-110'} `}>dashboard</span>
            <span className="text-label-caps font-label-caps tracking-wider">Dashboard</span>
          </NavLink>
          
          <NavLink to="/careers" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg group transition-all duration-200 ${isActive ? 'text-on-primary-container bg-primary-container/20 border-r-2 border-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50 hover:bg-white/5'}`}>
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">public</span>
            <span className="text-label-caps font-label-caps tracking-wider">Universes</span>
          </NavLink>

          <NavLink to="/players" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg group transition-all duration-200 ${isActive ? 'text-on-primary-container bg-primary-container/20 border-r-2 border-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50 hover:bg-white/5'}`}>
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">groups</span>
            <span className="text-label-caps font-label-caps tracking-wider">Players</span>
          </NavLink>
          <NavLink to="/clubs" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg group transition-all duration-200 ${isActive ? 'text-on-primary-container bg-primary-container/20 border-r-2 border-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50 hover:bg-white/5'}`}>
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">shield</span>
            <span className="text-label-caps font-label-caps tracking-wider">Clubs</span>
          </NavLink>
          <NavLink to="/transfers" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg group transition-all duration-200 ${isActive ? 'text-on-primary-container bg-primary-container/20 border-r-2 border-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50 hover:bg-white/5'}`}>
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">swap_horiz</span>
            <span className="text-label-caps font-label-caps tracking-wider">Transfers</span>
          </NavLink>
          <NavLink to="/timeline" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg group transition-all duration-200 ${isActive ? 'text-on-primary-container bg-primary-container/20 border-r-2 border-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50 hover:bg-white/5'}`}>
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">auto_stories</span>
            <span className="text-label-caps font-label-caps tracking-wider">Timeline</span>
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg group transition-all duration-200 ${isActive ? 'text-on-primary-container bg-primary-container/20 border-r-2 border-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/50 hover:bg-white/5'}`}>
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">analytics</span>
            <span className="text-label-caps font-label-caps tracking-wider">Analytics</span>
          </NavLink>
        </div>
      </nav>

      <header className="bg-surface/60 dark:bg-surface/60 backdrop-blur-xl border-b border-white/10 dark:border-white/5 shadow-2xl fixed top-0 w-full z-50 flex justify-between items-center px-container-padding h-20 transition-colors">
        <div className="flex items-center gap-4 md:ml-72">
          <a className="text-headline-md font-headline-md font-black tracking-tighter text-primary dark:text-primary hover:text-white/5 dark:hover:text-white/10 transition-colors" href="#">
              FC UNIVERSE
          </a>
          {isImporting && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
              {importMessage || "Syncing save data in background..."}
            </div>
          )}
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex relative group mr-4">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input 
              className="bg-surface-container/50 border border-white/10 rounded-full py-2 pl-10 pr-4 text-body-md font-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 focus:bg-surface-container w-64 transition-all focus:w-80" 
              placeholder="Search the universe..." 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Active Career Selector Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 px-4 py-2 rounded-xl bg-surface-container-high/60 border border-white/10 hover:border-primary/30 transition-all backdrop-blur-md"
            >
              <span className="material-symbols-outlined text-primary text-lg">work_history</span>
              <div className="text-left hidden sm:block">
                <p className="text-xs text-on-surface-variant leading-none">Active Universe</p>
                <p className="text-sm font-bold text-on-surface mt-0.5">{career ? career.name : "Select Career"}</p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant text-sm transition-transform duration-200" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none' }}>
                keyboard_arrow_down
              </span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-surface-container-highest border border-white/10 shadow-2xl p-2 z-50 animate-fade-in backdrop-blur-3xl">
                <p className="text-[10px] font-bold text-on-surface-variant/60 tracking-wider uppercase px-3 py-1">Select active universe</p>
                <div className="space-y-1 max-h-80 overflow-y-auto mt-1">
                  {careers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectCareer(c)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 flex items-center justify-between ${
                        career && career.id === c.id 
                          ? 'bg-primary text-on-primary font-bold shadow-lg' 
                          : 'hover:bg-white/5 text-on-surface'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-body-md font-bold truncate leading-snug">{c.name}</p>
                        <p className={`text-[10px] truncate ${career && career.id === c.id ? 'text-on-primary/80' : 'text-on-surface-variant'}`}>{c.manager_name} • {c.team_name}</p>
                      </div>
                      {career && career.id === c.id && (
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                      )}
                    </button>
                  ))}
                  {careers.length === 0 && (
                    <p className="text-xs text-on-surface-variant px-3 py-4 text-center">No universes imported.</p>
                  )}
                </div>
                <div className="border-t border-white/10 pt-1.5 mt-1 px-1">
                  <NavLink 
                    to="/careers" 
                    onClick={() => setDropdownOpen(false)}
                    className="w-full text-center py-2 rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary text-xs font-bold text-on-surface transition-all flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">public</span>
                    Manage Universes
                  </NavLink>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="pt-28 pb-12 px-container-padding md:ml-72 relative z-10 max-w-max-width-desktop mx-auto">
        <Outlet context={{ career, searchQuery, refreshCareers, setIsImporting, setImportMessage, isImporting }} />
      </div>
    </>
  );
}
