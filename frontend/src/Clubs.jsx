import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';

export default function Clubs() {
  const context = useOutletContext() || {};
  const { career } = context;
  const navigate = useNavigate();

  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("ALL");

  useEffect(() => {
    if (career && career.id) {
      setLoading(true);
      fetch(`/api/careers/${career.id}/clubs?limit=2000`)
        .then(res => res.json())
        .then(data => {
          setClubs(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch clubs:", err);
          setLoading(false);
        });
    }
  }, [career]);

  const getLogoUrl = (gameId) => {
    if (!gameId) return null;
    return `/api/images/club/${gameId}?v=2`;
  };

  if (!career) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-lg">Please select or load a career universe first.</p>
      </div>
    );
  }

  // Extract unique leagues for filtering
  const leagues = ["ALL", ...Array.from(new Set(clubs.map(c => c.league).filter(Boolean)))].sort();

  // Filter clubs based on search query and selected league
  const filteredClubs = clubs.filter(club => {
    const matchesSearch = (club.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (club.short_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLeague = selectedLeague === "ALL" || club.league === selectedLeague;
    return matchesSearch && matchesLeague;
  });

  return (
    <div className="w-full max-w-7xl mx-auto py-4 px-2 sm:px-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            CLUBS DIRECTORY
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight font-headline-lg">
            Football Clubs ({filteredClubs.length})
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            All registered football clubs in the <span className="text-emerald-400 font-semibold">{career.team_name || career.name}</span> universe.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
            search
          </span>
          <input
            type="text"
            placeholder="Search all clubs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#161b22] border border-white/10 rounded-2xl py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors shadow-lg"
          />
        </div>
      </div>

      {/* League Filter Pills */}
      {leagues.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
          {leagues.map(l => (
            <button
              key={l}
              onClick={() => setSelectedLeague(l)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
                selectedLeague === l
                  ? 'bg-emerald-400 text-slate-950 border-emerald-400 shadow-[0_0_15px_rgba(78,222,163,0.3)]'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-white'
              }`}
            >
              {l === "ALL" ? `All Clubs (${clubs.length})` : l}
            </button>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_20px_rgba(78,222,163,0.3)]"></div>
          <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">Loading Clubs Database...</p>
        </div>
      ) : filteredClubs.length === 0 ? (
        <div className="py-20 text-center text-slate-500">
          <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
          <p className="text-base font-semibold">No clubs found matching "{searchQuery}"</p>
        </div>
      ) : (
        /* Clubs Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {filteredClubs.map(club => (
            <div
              key={club.id}
              onClick={() => navigate(`/clubs/${club.id}`)}
              className="bg-[#12161f]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-between text-center transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_35px_rgba(0,0,0,0.6)] hover:border-emerald-500/40 group cursor-pointer relative overflow-hidden"
            >
              {/* Subtle light effect at top */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

              {/* Club Crest Logo */}
              <div className="w-20 h-20 mb-3 relative flex items-center justify-center">
                <img 
                  src={getLogoUrl(club.game_id)} 
                  alt={club.name}
                  className="w-full h-full object-contain drop-shadow-xl group-hover:scale-110 transition-transform duration-300"
                  onError={(e) => { 
                    e.target.style.display = 'none'; 
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                  }}
                />
                <span className="material-symbols-outlined text-slate-600 text-4xl hidden">shield</span>
              </div>

              {/* Club Name & League */}
              <div className="w-full">
                <h3 className="text-sm font-bold text-white leading-snug group-hover:text-emerald-400 transition-colors line-clamp-1">
                  {club.name}
                </h3>
                {club.league && (
                  <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                    {club.league}
                  </p>
                )}
              </div>

              {/* Ratings Summary (if available) */}
              {club.overall_rating ? (
                <div className="mt-3 w-full pt-3 border-t border-white/5 flex items-center justify-around text-[10px] text-slate-400 font-mono">
                  <div>
                    <span className="text-slate-500 uppercase block">OVR</span>
                    <span className="font-bold text-emerald-400">{club.overall_rating}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase block">ATT</span>
                    <span className="font-bold text-white">{club.attack_rating || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase block">DEF</span>
                    <span className="font-bold text-white">{club.defense_rating || "-"}</span>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
