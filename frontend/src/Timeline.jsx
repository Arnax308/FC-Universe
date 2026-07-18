import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

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
    return <div className="p-8 text-on-surface">Please load a career first.</div>;
  }

  const getEventIcon = (type) => {
    switch (type) {
      case 'season_start': return 'calendar_month';
      case 'transfer': return 'swap_horiz';
      case 'manager_appointment':
      case 'manager_move': return 'badge';
      case 'award': return 'military_tech';
      case 'retirement': return 'person_off';
      case 'trophy': return 'trophy';
      default: return 'info';
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'season_start': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'transfer': return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'manager_appointment':
      case 'manager_move': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'award': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'retirement': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'trophy': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default: return 'bg-white/5 text-on-surface-variant border-white/10';
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const d = new Date(timeStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const filterOptions = [
    { value: "all", label: "All Events" },
    { value: "season_start", label: "Seasons" },
    { value: "transfer", label: "Transfers" },
    { value: "manager_appointment", label: "Managers" },
    { value: "award", label: "Awards" },
    { value: "trophy", label: "Honors" },
  ];

  return (
    <div className="w-full">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-headline-md text-on-surface mb-2 tracking-tight">Timeline of History</h1>
          <p className="text-body-lg text-on-surface-variant">The chronological history and landmarks of your {career.name} universe.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Gender Filter */}
          <div className="flex bg-surface-container-high/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md self-start">
            <button
              onClick={() => setGenderFilter("all")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                genderFilter === "all" 
                  ? 'bg-emerald-500/20 text-primary' 
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              All Football
            </button>
            <button
              onClick={() => setGenderFilter("men")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                genderFilter === "men" 
                  ? 'bg-primary text-on-primary shadow-lg' 
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Men
            </button>
            <button
              onClick={() => setGenderFilter("women")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                genderFilter === "women" 
                  ? 'bg-primary text-on-primary shadow-lg' 
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Women
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 bg-surface-container-high/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                  filter === opt.value 
                    ? 'bg-primary text-on-primary shadow-lg' 
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-on-surface-variant text-label-caps font-label-caps">Restoring timeline logs...</p>
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="glass-panel border border-white/5 rounded-2xl p-12 text-center max-w-2xl mx-auto shadow-2xl">
          <span className="material-symbols-outlined text-amber-400 text-6xl mb-4 animate-pulse">info</span>
          <h3 className="text-body-lg font-headline-md font-bold text-white mb-2">Dormant Save Detected</h3>
          <p className="text-body-md text-on-surface-variant/80 max-w-md mx-auto mb-6">
            This save file has not been simulated in-game yet. There are no historical activities to display.
          </p>
          <div className="bg-white/5 p-5 rounded-2xl border border-white/10 text-left text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
            <p className="font-bold text-white mb-2">To view timeline updates:</p>
            <ol className="list-decimal list-inside space-y-1.5 text-on-surface-variant/95">
              <li>Open this save file in <strong>EA SPORTS FC 26</strong>.</li>
              <li>Simulate or play at least 1-2 weeks in your career calendar.</li>
              <li>Save your career progress.</li>
              <li>Go back to the Dashboard and click <strong>"Re-import / Update"</strong>.</li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {events.length <= 1 && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-4 rounded-2xl text-xs leading-relaxed max-w-2xl">
              <p className="font-bold mb-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">warning</span> Dormant Save Alert
              </p>
              <p>Only your initial manager appointment has been recorded. To populate player transfers, player awards, and trophy timelines, simulate your career in-game for a few weeks, save, and click "Re-import / Update"!</p>
            </div>
          )}
          <div className="relative border-l-2 border-white/10 ml-6 pl-8 space-y-8">
            {events.map((ev, index) => (
              <div key={ev.id} className="relative group animate-fade-in">
              {/* Timeline circle indicator */}
              <div className={`absolute -left-[50px] top-1.5 w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-lg backdrop-blur-md transition-all duration-300 group-hover:scale-110 z-10 ${getEventColor(ev.event_type)}`}>
                <span className="material-symbols-outlined text-lg">{getEventIcon(ev.event_type)}</span>
              </div>

              {/* Event card */}
              <div className="glass-panel border border-white/5 rounded-2xl p-5 hover:border-white/15 hover:bg-white/5 transition-all duration-300 relative overflow-hidden shadow-xl">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold text-primary font-data-mono uppercase tracking-wider bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full self-start">
                    {ev.event_type.replace('_', ' ')}
                  </span>
                  
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    <span>{formatTime(ev.created_at)}</span>
                    {ev.season_year && (
                      <span className="ml-2 bg-white/5 px-2 py-0.5 rounded border border-white/5 text-[11px] font-bold text-tertiary">
                        Season {ev.season_year}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-body-lg text-on-surface leading-relaxed pr-4 font-medium">{ev.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}
