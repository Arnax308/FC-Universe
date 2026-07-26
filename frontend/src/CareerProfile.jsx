import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

function TrophyImage({ src, alt, className = "w-10 h-10" }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return <span className="text-2xl">🏆</span>;
  }
  return (
    <img 
      src={src} 
      alt={alt || "Trophy"} 
      className={`${className} object-contain drop-shadow-lg`}
      onError={() => setFailed(true)}
    />
  );
}

export default function CareerProfile() {
  const context = useOutletContext() || {};
  const { career } = context;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!career?.id) return;
    setLoading(true);
    fetch(`/api/careers/${career.id}/profile`)
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          setProfile(json.data);
        } else {
          setError("Failed to load career profile.");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch career profile:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [career]);

  const getLogoUrl = (gameId) => {
    if (!gameId) return null;
    return `/api/images/club/${gameId}?v=2`;
  };

  if (!career) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <span className="material-symbols-outlined text-5xl text-slate-500 mb-4">person_off</span>
        <p className="text-slate-400 text-sm">Please select a career universe first.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_20px_rgba(78,222,163,0.3)]"></div>
        <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">Building Legacy Profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <span className="material-symbols-outlined text-5xl text-red-400 mb-4">error</span>
        <p className="text-red-400 text-sm">{error || "Failed to load profile"}</p>
        <p className="text-slate-500 text-xs mt-2">Try re-syncing your save file first.</p>
      </div>
    );
  }

  const { 
    manager_name, team_name, team_id,
    career_start, career_end, total_seasons,
    total_trophies, trophy_counts,
    career_matches, career_wins, career_win_pct,
    awards_count, club_journey, managerial_stats: raw_mgr_stats, mastermind_stats: raw_mm_stats
  } = profile;

  const stats_list = raw_mgr_stats || raw_mm_stats || [];

  return (
    <div className="w-full max-w-7xl mx-auto py-2 px-2 sm:px-4 space-y-8">
      
      {/* ═══════════════════ HERO BANNER ═══════════════════ */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl">
        {/* Background */}
        <div className="relative h-56 sm:h-72 w-full overflow-hidden">
          <img 
            src="/assets/stadium1.png" 
            alt="Stadium" 
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e1217] via-[#0e1217]/70 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/20 via-transparent to-transparent"></div>
        </div>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-end gap-5">
            {/* Manager Badge */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-black/60 border-2 border-emerald-400/40 p-2 flex items-center justify-center backdrop-blur-xl shadow-[0_0_30px_rgba(78,222,163,0.2)] flex-shrink-0">
              {team_id ? (
                <img 
                  src={getLogoUrl(team_id)} 
                  alt={team_name} 
                  className="w-full h-full object-contain drop-shadow-xl"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <span className="material-symbols-outlined text-emerald-400 text-5xl">person</span>
              )}
            </div>

            {/* Manager Info */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Legacy Hub
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                {manager_name}
              </h1>
              <p className="text-slate-400 text-sm font-medium">
                {team_name} • {career_start} - Present • {total_seasons} {total_seasons === 1 ? 'Season' : 'Seasons'}
              </p>
            </div>
          </div>

          {/* Career Stats Capsule */}
          <div className="flex items-center gap-5 sm:gap-6 bg-black/50 border border-white/10 rounded-2xl p-4 px-6 backdrop-blur-md self-start md:self-auto">
            <div className="text-center">
              <p className="text-2xl font-black text-amber-400">{total_trophies}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Trophies</p>
            </div>
            <div className="h-8 w-px bg-white/10"></div>
            <div className="text-center">
              <p className="text-2xl font-black text-emerald-400">{career_win_pct}%</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Win Rate</p>
            </div>
            <div className="h-8 w-px bg-white/10"></div>
            <div className="text-center">
              <p className="text-2xl font-black text-white">{career_matches}</p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Matches</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════ TROPHY ROOM ═══════════════════ */}
      <div className="bg-[#12161f]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrophyImage src="/api/images/trophy/ucl" alt="Trophy" className="w-8 h-8" />
            <div>
              <h2 className="text-xl font-bold text-white">The Trophy Room</h2>
              <p className="text-xs text-slate-400">Career silverware across all clubs managed</p>
            </div>
          </div>
          <span className="text-xs text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
            {total_trophies} Total
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-center flex flex-col items-center hover:border-amber-500/30 transition-colors group">
            <TrophyImage src="/api/images/trophy/ucl" alt="Champions League" className="w-12 h-12 group-hover:scale-110 transition-transform" />
            <p className="text-2xl font-black text-amber-400 mt-2">{trophy_counts.champions_league}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Champions League</p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-center flex flex-col items-center hover:border-amber-500/30 transition-colors group">
            <TrophyImage src="/api/images/trophy/pl" alt="League Titles" className="w-12 h-12 group-hover:scale-110 transition-transform" />
            <p className="text-2xl font-black text-amber-400 mt-2">{trophy_counts.league_title}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">League Titles</p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-center flex flex-col items-center hover:border-amber-500/30 transition-colors group">
            <TrophyImage src="/api/images/trophy/fa" alt="Domestic Cups" className="w-12 h-12 group-hover:scale-110 transition-transform" />
            <p className="text-2xl font-black text-amber-400 mt-2">{trophy_counts.domestic_cup}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Domestic Cups</p>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 text-center flex flex-col items-center hover:border-amber-500/30 transition-colors group">
            <TrophyImage src="/api/images/trophy/uel" alt="Other" className="w-12 h-12 group-hover:scale-110 transition-transform" />
            <p className="text-2xl font-black text-amber-400 mt-2">{trophy_counts.europa_league + trophy_counts.other}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Int. / Other Cups</p>
          </div>
        </div>
      </div>

      {/* ═══════════════════ CLUB JOURNEY ═══════════════════ */}
      <div className="bg-[#12161f]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400">route</span>
              Club Journey
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Your managerial path through football history</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            📅 {career_start} - Present
          </span>
        </div>

        {club_journey.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm italic">
            <span className="material-symbols-outlined text-3xl text-slate-600 block mb-2">map</span>
            No career history data found. Try re-syncing your save file.
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none">
            {club_journey.map((tenure, idx) => (
              <div 
                key={idx}
                className={`flex-shrink-0 w-64 rounded-2xl p-5 border transition-all relative overflow-hidden ${
                  tenure.is_current 
                    ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_25px_rgba(78,222,163,0.15)]' 
                    : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                }`}
              >
                {/* Tenure date badge */}
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-3 ${
                  tenure.is_current 
                    ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/30' 
                    : 'bg-white/5 text-slate-400 border border-white/10'
                }`}>
                  {tenure.start_year} - {tenure.is_current ? 'Present' : tenure.end_year}
                </div>

                {/* Club Logo + Info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 p-1 flex items-center justify-center flex-shrink-0">
                    {tenure.club_game_id ? (
                      <img 
                        src={getLogoUrl(tenure.club_game_id)} 
                        alt={tenure.club_name}
                        className="w-full h-full object-contain"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <span className="material-symbols-outlined text-slate-500">shield</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className={`text-base font-bold truncate ${tenure.is_current ? 'text-emerald-400' : 'text-white'}`}>
                      {tenure.club_name}
                    </h3>
                    <p className="text-[10px] text-slate-400 truncate">{tenure.league || 'League Unknown'}</p>
                  </div>
                </div>

                {/* Trophies */}
                {tenure.trophies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {/* Group trophies by category */}
                    {(() => {
                      const grouped = {};
                      tenure.trophies.forEach(t => {
                        const key = t.category;
                        if (!grouped[key]) grouped[key] = { ...t, count: 0 };
                        grouped[key].count++;
                      });
                      return Object.values(grouped).map((g, gi) => (
                        <span key={gi} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold">
                          <TrophyImage src={g.icon} alt={g.name} className="w-3.5 h-3.5" />
                          {g.count}
                        </span>
                      ));
                    })()}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-500 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">No Trophies</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════ MANAGERIAL STATISTICS ═══════════════════ */}
      <div className="bg-[#12161f]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400">analytics</span>
              Managerial Statistics
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Career cumulative analysis by tenure</p>
          </div>
        </div>

        {stats_list.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm italic">
            <span className="material-symbols-outlined text-3xl text-slate-600 block mb-2">table_chart</span>
            No statistics available. Re-sync your save to populate data.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-white/10">
                  <th className="text-left py-3 px-3">Club</th>
                  <th className="text-left py-3 px-2">Tenure</th>
                  <th className="text-center py-3 px-2">M</th>
                  <th className="text-center py-3 px-2">W</th>
                  <th className="text-center py-3 px-2">D</th>
                  <th className="text-center py-3 px-2">L</th>
                  <th className="text-center py-3 px-2">GF</th>
                  <th className="text-center py-3 px-2">GA</th>
                  <th className="text-right py-3 px-3">Win %</th>
                </tr>
              </thead>
              <tbody>
                {stats_list.map((stat, idx) => (
                  <tr 
                    key={idx} 
                    className={`border-b border-white/5 hover:bg-white/[0.03] transition-colors ${
                      idx === stats_list.length - 1 ? 'bg-emerald-500/5' : ''
                    }`}
                  >
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/10 p-0.5 flex items-center justify-center flex-shrink-0">
                          {stat.club_game_id ? (
                            <img 
                              src={getLogoUrl(stat.club_game_id)} 
                              alt={stat.club_name}
                              className="w-full h-full object-contain"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <span className="material-symbols-outlined text-slate-500 text-sm">shield</span>
                          )}
                        </div>
                        <span className="font-bold text-white truncate max-w-[150px]">{stat.club_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-2 text-slate-400 font-mono text-xs">{stat.tenure}</td>
                    <td className="py-3.5 px-2 text-center text-white font-semibold">{stat.matches}</td>
                    <td className="py-3.5 px-2 text-center text-emerald-400 font-bold">{stat.wins}</td>
                    <td className="py-3.5 px-2 text-center text-slate-400">{stat.draws}</td>
                    <td className="py-3.5 px-2 text-center text-red-400">{stat.losses}</td>
                    <td className="py-3.5 px-2 text-center text-white">{stat.goals_for}</td>
                    <td className="py-3.5 px-2 text-center text-slate-400">{stat.goals_against}</td>
                    <td className={`py-3.5 px-3 text-right font-bold ${
                      stat.win_pct >= 60 ? 'text-emerald-400' : stat.win_pct >= 40 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {stat.win_pct}%
                    </td>
                  </tr>
                ))}
                {/* Career Totals Row */}
                <tr className="border-t-2 border-emerald-500/30 bg-emerald-500/5">
                  <td className="py-3.5 px-3 font-black text-emerald-400" colSpan={2}>
                    Career Totals
                  </td>
                  <td className="py-3.5 px-2 text-center text-white font-black">{career_matches}</td>
                  <td className="py-3.5 px-2 text-center text-emerald-400 font-black">
                    {stats_list.reduce((a, s) => a + s.wins, 0)}
                  </td>
                  <td className="py-3.5 px-2 text-center text-slate-400 font-bold">
                    {stats_list.reduce((a, s) => a + s.draws, 0)}
                  </td>
                  <td className="py-3.5 px-2 text-center text-red-400 font-bold">
                    {stats_list.reduce((a, s) => a + s.losses, 0)}
                  </td>
                  <td className="py-3.5 px-2 text-center text-white font-bold">
                    {stats_list.reduce((a, s) => a + s.goals_for, 0)}
                  </td>
                  <td className="py-3.5 px-2 text-center text-slate-400 font-bold">
                    {stats_list.reduce((a, s) => a + s.goals_against, 0)}
                  </td>
                  <td className={`py-3.5 px-3 text-right font-black ${
                    career_win_pct >= 60 ? 'text-emerald-400' : career_win_pct >= 40 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {career_win_pct}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
