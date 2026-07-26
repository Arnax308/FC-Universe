import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';

export default function Timeline() {
  const { career } = useOutletContext();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");

  useEffect(() => {
    if (career && career.id) {
      setLoading(true);
      let url = filter === "all" 
        ? `/api/careers/${career.id}/timeline?limit=200`
        : `/api/careers/${career.id}/timeline?limit=200&event_type=${filter}`;
        
      if (genderFilter !== "all") {
        const gVal = genderFilter === "men" ? 0 : 1;
        url += `&gender=${gVal}`;
      }
        
      fetch(url)
        .then(res => res.json())
        .then(data => {
          setEvents(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch timeline:", err);
          setLoading(false);
        });
    }
  }, [career, filter, genderFilter]);

  if (!career) {
    return <div className="p-8 text-slate-400 text-center">Please select a career universe first.</div>;
  }

  const getCategoryDetails = (type) => {
    switch (type) {
      case 'trophy':
        return {
          label: 'Trophy',
          badgeStyle: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
          nodeStyle: 'bg-amber-400 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.8)]',
          icon: 'trophy',
          actionText: 'View Trophy Details'
        };
      case 'award':
        return {
          label: 'Award',
          badgeStyle: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
          nodeStyle: 'bg-emerald-400 border-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.8)]',
          icon: 'stars',
          actionText: 'View Player Profile'
        };
      case 'transfer':
        return {
          label: 'Transfer',
          badgeStyle: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
          nodeStyle: 'bg-blue-400 border-blue-300 shadow-[0_0_12px_rgba(96,165,250,0.8)]',
          icon: 'swap_horiz',
          actionText: 'View Transfer Details'
        };
      case 'manager_appointment':
      case 'manager_move':
        return {
          label: 'Manager',
          badgeStyle: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
          nodeStyle: 'bg-purple-400 border-purple-300 shadow-[0_0_12px_rgba(192,132,252,0.8)]',
          icon: 'badge',
          actionText: 'View Manager Profile'
        };
      case 'season_start':
        return {
          label: 'Season Kickoff',
          badgeStyle: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
          nodeStyle: 'bg-indigo-400 border-indigo-300 shadow-[0_0_12px_rgba(129,140,248,0.8)]',
          icon: 'calendar_today',
          actionText: 'View Season Overview'
        };
      default:
        return {
          label: 'Event',
          badgeStyle: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
          nodeStyle: 'bg-slate-400 border-slate-300 shadow-[0_0_8px_rgba(148,163,184,0.6)]',
          icon: 'info',
          actionText: 'View Event Details'
        };
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const d = new Date(timeStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filterOptions = [
    { value: "all", label: "All Events" },
    { value: "trophy", label: "Honors & Cups" },
    { value: "award", label: "Awards" },
    { value: "transfer", label: "Transfers" },
    { value: "season_start", label: "Seasons" },
    { value: "manager_appointment", label: "Managerial" },
  ];

  // Group events by season year
  const eventsBySeason = {};
  events.forEach(ev => {
    const sYear = ev.season_year || 2025;
    if (!eventsBySeason[sYear]) {
      eventsBySeason[sYear] = [];
    }
    eventsBySeason[sYear].push(ev);
  });

  const sortedSeasons = Object.keys(eventsBySeason).sort((a, b) => b - a);

  let globalIndex = 0;

  return (
    <div className="w-full max-w-6xl mx-auto py-4 px-2 sm:px-6">
      
      {/* ═══════════════════ PAGE HEADER ═══════════════════ */}
      <div className="mb-10 text-center sm:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            Historical Timeline
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-2xl">
            Track the defining moments, transfers, and triumphs that shaped the {career.name} world football.
          </p>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-3 self-center md:self-end">
          {/* Gender Filter */}
          <div className="flex bg-[#12161f]/80 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl">
            <button
              onClick={() => setGenderFilter("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                genderFilter === "all" 
                  ? 'bg-emerald-500 text-slate-950 shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setGenderFilter("men")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                genderFilter === "men" 
                  ? 'bg-emerald-500 text-slate-950 shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Men
            </button>
            <button
              onClick={() => setGenderFilter("women")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                genderFilter === "women" 
                  ? 'bg-emerald-500 text-slate-950 shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Women
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-1.5 bg-[#12161f]/80 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filter === opt.value 
                    ? 'bg-emerald-500 text-slate-950 shadow-md' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-xs font-bold tracking-wider uppercase">Loading Timeline Records...</p>
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-[#12161f]/80 border border-white/10 rounded-3xl p-12 text-center max-w-xl mx-auto shadow-2xl backdrop-blur-xl">
          <span className="material-symbols-outlined text-amber-400 text-5xl mb-3 block">auto_stories</span>
          <h3 className="text-xl font-bold text-white mb-2">No Timeline Events Logged</h3>
          <p className="text-slate-400 text-xs leading-relaxed max-w-md mx-auto mb-6">
            Simulate or play matches in your career save, then re-import to populate silverware, awards, and landmark events.
          </p>
        </div>
      ) : (
        /* ═══════════════════ VERTICAL TIMELINE CONTAINER ═══════════════════ */
        <div className="relative py-6">
          
          {/* Central Vertical Axis Line */}
          <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500/60 via-slate-700 to-slate-800 -translate-x-1/2 z-0"></div>

          {sortedSeasons.map((seasonYear) => {
            const seasonEvents = eventsBySeason[seasonYear];

            return (
              <div key={seasonYear} className="space-y-8 mb-12 relative z-10">
                
                {/* 🗓️ SEASON HEADING BADGE (CENTERED ON AXIS) */}
                <div className="flex justify-start sm:justify-center my-6 pl-4 sm:pl-0">
                  <div className="bg-[#12161f] border border-emerald-500/40 px-6 py-2.5 rounded-full text-white font-bold text-sm sm:text-base tracking-wide shadow-[0_0_20px_rgba(16,185,129,0.25)] flex items-center gap-2 backdrop-blur-xl">
                    <span className="material-symbols-outlined text-emerald-400 text-lg">calendar_today</span>
                    <span>{seasonYear} Season</span>
                  </div>
                </div>

                {/* EVENTS IN THIS SEASON */}
                {seasonEvents.map((ev) => {
                  const cat = getCategoryDetails(ev.event_type);
                  const isEven = globalIndex % 2 === 0;
                  globalIndex++;

                  return (
                    <div 
                      key={ev.id} 
                      className={`relative flex flex-col sm:flex-row items-start sm:items-center ${
                        isEven ? 'sm:flex-row-reverse' : ''
                      }`}
                    >
                      {/* CARD CONTAINER (Left or Right on desktop, full width on mobile) */}
                      <div className="w-full sm:w-1/2 pl-10 sm:pl-0 sm:px-8">
                        <div className="bg-[#12161f]/80 backdrop-blur-xl border border-white/10 hover:border-emerald-500/40 rounded-2xl p-5 shadow-xl transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden">
                          
                          {/* Card Top Row: Date & Category Pill */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="text-[11px] font-semibold text-slate-400">
                              {formatTime(ev.created_at) || `Season ${seasonYear}`}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${cat.badgeStyle}`}>
                              {cat.label}
                            </span>
                          </div>

                          {/* Event Content Row */}
                          <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${cat.badgeStyle}`}>
                              <span className="material-symbols-outlined text-base">{cat.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors leading-snug">
                                {ev.description}
                              </h3>
                            </div>
                          </div>

                          {/* Footer Link / Action */}
                          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
                            <span className="flex items-center gap-1.5">
                              {cat.actionText}
                              <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* GLOWING DOT ON CENTRAL AXIS */}
                      <div className="absolute left-4 sm:left-1/2 top-6 sm:top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 bg-slate-900 z-20 flex items-center justify-center">
                        <div className={`w-2.5 h-2.5 rounded-full ${cat.nodeStyle}`}></div>
                      </div>

                      {/* SPACER FOR OPPOSITE SIDE ON DESKTOP */}
                      <div className="hidden sm:block w-1/2"></div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
