import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';

export default function ClubProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext() || {};
  const { career } = context;

  const [club, setClub] = useState(null);
  const [squad, setSquad] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('OVERVIEW');

  useEffect(() => {
    if (career && career.id && id) {
      setLoading(true);
      
      // Fetch club details
      const p1 = fetch(`/api/careers/${career.id}/clubs/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.id) setClub(data);
        })
        .catch(err => console.error("Failed to fetch club details:", err));

      // Fetch squad players for this club
      const p2 = fetch(`/api/careers/${career.id}/players?club_id=${id}&limit=100`)
        .then(res => res.json())
        .then(data => {
          setSquad(Array.isArray(data) ? data : []);
        })
        .catch(err => console.error("Failed to fetch squad:", err));

      // Fetch transfers for this club
      const p3 = fetch(`/api/careers/${career.id}/transfers?club_id=${id}&limit=100`)
        .then(res => res.json())
        .then(data => {
          setTransfers(Array.isArray(data) ? data : []);
        })
        .catch(err => console.error("Failed to fetch transfers:", err));

      Promise.all([p1, p2, p3]).finally(() => setLoading(false));
    }
  }, [career, id]);

  const getLogoUrl = (gameId) => {
    if (!gameId) return null;
    return `/api/images/club/${gameId}?v=2`;
  };

  const getPlayerPhotoUrl = (gameId) => {
    if (!gameId) return null;
    return `/api/images/player/${gameId}?v=2`;
  };

  if (!career) {
    return <div className="p-8 text-center text-slate-400">Please select a career first.</div>;
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_20px_rgba(78,222,163,0.3)]"></div>
        <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">Loading Club Archives...</p>
      </div>
    );
  }

  const clubName = club?.name || "Real Madrid CF";
  const stadiumName = club?.stadium_name || "Santiago Bernabéu";
  const leagueName = club?.league || "La Liga";

  return (
    <div className="w-full max-w-7xl mx-auto py-2 px-2 sm:px-4 space-y-6">
      {/* Back Button */}
      <button 
        onClick={() => navigate('/clubs')}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold transition-all border border-white/5"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        Back to Clubs
      </button>

      {/* Main Club Banner Hero */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-white/10 shadow-2xl">
        {/* Background Stadium Image */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden">
          <img 
            src="/assets/stadium1.png" 
            alt="Stadium" 
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e1217] via-[#0e1217]/60 to-transparent"></div>
        </div>

        {/* Hero Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-end gap-5">
            {/* Club Logo Crest */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-black/60 border-2 border-white/20 p-2 flex items-center justify-center backdrop-blur-xl shadow-2xl flex-shrink-0">
              <img 
                src={getLogoUrl(club?.game_id)} 
                alt={clubName} 
                className="w-full h-full object-contain drop-shadow-xl"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>

            {/* Club Info */}
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight font-headline-lg">
                {clubName}
              </h1>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  {leagueName}
                </span>
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-medium flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">stadium</span>
                  {stadiumName}
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Cards: Manager & Finances */}
          <div className="flex items-center gap-4 bg-black/40 border border-white/10 rounded-2xl p-4 backdrop-blur-md self-start md:self-auto">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Manager</p>
              <p className="text-sm font-bold text-white mt-0.5">{career?.manager_name || "Carlo Ancelotti"}</p>
            </div>
            <div className="h-8 w-px bg-white/10"></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Finances</p>
              <p className="text-sm font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                <span>📈</span> Healthy
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 pb-2 scrollbar-none">
        {[
          'OVERVIEW',
          'HISTORY',
          'CURRENT SQUAD',
          'TRANSFERS',
          'RECORDS',
          'SEASON HISTORY',
          'TROPHIES',
          'STATISTICS'
        ].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold tracking-wider transition-all whitespace-nowrap border-b-2 ${
              activeTab === tab 
                ? 'border-emerald-400 text-emerald-400' 
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: League Position Chart & Metrics */}
          <div className="lg:col-span-2 space-y-6">
            {/* League Position Card */}
            <div className="bg-[#12161f]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">League Position</h3>
                  <p className="text-xs text-slate-400">Last 5 Seasons</p>
                </div>
                <span className="material-symbols-outlined text-slate-500">show_chart</span>
              </div>

              {/* Chart Visual */}
              <div className="pt-4 pb-2">
                <div className="flex items-end justify-between h-44 gap-3 px-4 border-b border-white/10 pb-4">
                  {[
                    { season: '19/20', pos: 4, label: '4th' },
                    { season: '20/21', pos: 3, label: '3rd' },
                    { season: '21/22', pos: 1, label: '1st', highlight: true },
                    { season: '22/23', pos: 3, label: '3rd' },
                    { season: '23/24', pos: 1, label: '1st', highlight: true }
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center flex-1 space-y-2">
                      <div className="w-full flex items-end justify-center h-32">
                        <div 
                          style={{ height: `${(5 - item.pos) * 25 + 25}%` }}
                          className={`w-full max-w-[48px] rounded-t-xl transition-all duration-500 ${
                            item.highlight 
                              ? 'bg-emerald-400 shadow-[0_0_20px_rgba(78,222,163,0.4)]' 
                              : 'bg-slate-700/80 hover:bg-slate-600'
                          }`}
                        ></div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">{item.season}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#12161f]/80 border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Net Spend</p>
                  <p className="text-2xl font-black text-white mt-1">€45.2M</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <span className="material-symbols-outlined">account_balance</span>
                </div>
              </div>

              <div className="bg-[#12161f]/80 border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Goals Scored</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">78 Goals</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <span className="material-symbols-outlined">sports_soccer</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Fixtures & Recent Form */}
          <div className="space-y-6">
            <div className="bg-[#12161f]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-lg">calendar_month</span>
                Fixtures & Results
              </h3>

              {/* Next Match Card */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 relative overflow-hidden">
                <span className="absolute top-3 right-3 bg-emerald-400 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                  NEXT MATCH
                </span>
                <p className="text-[10px] text-emerald-400/80 font-semibold uppercase tracking-wider">
                  {leagueName} • Matchday 28
                </p>
                <div className="flex items-center justify-around py-4">
                  <span className="font-bold text-white text-base">RMA</span>
                  <span className="text-xs font-black text-emerald-400 bg-black/40 px-3 py-1 rounded-full">VS</span>
                  <span className="font-bold text-white text-base">ATM</span>
                </div>
              </div>

              {/* Recent Form */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Form</p>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span className="font-bold text-white">RMA</span>
                    </div>
                    <span className="font-bold text-white text-sm">3 - 1</span>
                    <span className="text-slate-400">VAL</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      <span className="font-bold text-slate-400">SEV</span>
                    </div>
                    <span className="font-bold text-white text-sm">1 - 1</span>
                    <span className="text-slate-400">RMA</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span className="font-bold text-white">RMA</span>
                    </div>
                    <span className="font-bold text-white text-sm">2 - 0</span>
                    <span className="text-slate-400">BET</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HISTORY */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-8">
          {/* History Hero Archive Header */}
          <div className="relative rounded-3xl p-8 bg-gradient-to-r from-[#121a17] via-[#161b22] to-slate-900 border border-white/10 shadow-2xl overflow-hidden">
            <div className="max-w-2xl space-y-3">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest">
                Historical Archive
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                The White Legend
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Decades of unparalleled dominance, charting the journey from local kings to the eternal monarchs of European football.
              </p>
            </div>
          </div>

          {/* Grid: League Performance & Tactical Minds */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* League Performance Graph */}
            <div className="lg:col-span-2 bg-[#12161f]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">League Performance</h3>
                  <p className="text-xs text-slate-400">Position tracking over the last 20 seasons ({leagueName})</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                  ● League Winners
                </span>
              </div>

              {/* Simple SVG Trendline */}
              <div className="py-6">
                <svg className="w-full h-32 text-emerald-400" viewBox="0 0 500 100" fill="none">
                  <path 
                    d="M0,40 L40,60 L80,20 L120,45 L160,30 L200,55 L240,25 L280,35 L320,15 L360,20 L400,20 L440,30 L480,20 L500,20" 
                    stroke="currentColor" 
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/5 text-center">
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Titles (20Y)</p>
                  <p className="text-lg font-black text-emerald-400">09</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Average Pos.</p>
                  <p className="text-lg font-black text-white">1.8</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Lowest Pos.</p>
                  <p className="text-lg font-black text-amber-400">4th</p>
                </div>
              </div>
            </div>

            {/* Tactical Minds (Managers) */}
            <div className="bg-[#12161f]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-xl font-bold text-white">Tactical Minds</h3>
              
              <div className="space-y-3">
                {[
                  { name: "Carlo Ancelotti", tenure: "2013-15, 2021-Present", winRate: "72.4%" },
                  { name: "Zinedine Zidane", tenure: "2016-18, 2019-21", winRate: "66.2%" },
                  { name: "Vicente del Bosque", tenure: "1999-2003", winRate: "54.5%" }
                ].map((mgr, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-white">{mgr.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{mgr.tenure}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-emerald-400">{mgr.winRate}</p>
                      <p className="text-[9px] text-slate-500 uppercase">Win Rate</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* The Golden Chronicle (Eras) */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">The Golden Chronicle</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "The Galácticos Era",
                  years: "2000 - 2006",
                  desc: "A global revolution where President Florentino Pérez signed world-class superstars every summer, creating the most marketable team in history.",
                  trophies: "1x UCL, 2x La Liga"
                },
                {
                  title: "The Décima Quest",
                  years: "2009 - 2014",
                  desc: "A twelve-year obsession to capture the elusive 10th European Cup, culminating in Lisbon under Carlo Ancelotti.",
                  trophies: "1x UCL, 1x La Liga, 2x Copa"
                },
                {
                  title: "The Three-Peat",
                  years: "2016 - 2018",
                  desc: "Zinedine Zidane's unprecedented era of European dominance, winning three consecutive Champions League titles.",
                  trophies: "3x UCL, 1x La Liga"
                }
              ].map((era, i) => (
                <div key={i} className="bg-[#12161f]/80 border border-white/10 rounded-2xl p-6 space-y-3 shadow-xl hover:border-emerald-500/40 transition-all">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-white">{era.title}</h4>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">{era.years}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{era.desc}</p>
                  <p className="text-xs font-bold text-amber-400 pt-2 border-t border-white/5 flex items-center gap-1">
                    <span>🏆</span> {era.trophies}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Historical Records & Pantheon */}
          <div className="bg-[#12161f]/80 border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-white">Historical Records</h3>
              <div className="space-y-2">
                <p className="text-sm text-slate-300">
                  Top Appearance Maker: <span className="font-bold text-emerald-400">Raúl (741)</span>
                </p>
                <p className="text-sm text-slate-300">
                  All-Time Scorer: <span className="font-bold text-emerald-400">Ronaldo (450)</span>
                </p>
              </div>
            </div>
            
            <button className="px-6 py-3 rounded-2xl bg-emerald-400 text-slate-950 font-bold text-sm shadow-[0_0_20px_rgba(78,222,163,0.3)] hover:bg-emerald-300 transition-all">
              Explore Hall of Fame ☆
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: CURRENT SQUAD */}
      {activeTab === 'CURRENT SQUAD' && (
        <div className="bg-[#12161f]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Current Squad Roster ({squad.length})</h3>
          </div>

          {squad.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No player records found for this club.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {squad.map(player => (
                <div 
                  key={player.id}
                  onClick={() => navigate(`/players/${player.id}`)}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/40 flex items-center justify-between cursor-pointer transition-all hover:bg-white/[0.06]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center">
                      <img 
                        src={getPlayerPhotoUrl(player.game_id)} 
                        alt={player.known_name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{player.known_name || `${player.first_name} ${player.last_name}`}</p>
                      <p className="text-xs text-slate-400">{player.position || "MF"} • Age {player.age || 25}</p>
                    </div>
                  </div>

                  <span className="text-base font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                    {player.overall || 80}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TRANSFERS */}
      {activeTab === 'TRANSFERS' && (
        <div className="bg-[#12161f]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-xl font-bold text-white">Recent Transfer Activity</h3>
          {transfers.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No transfer records found for this club.</p>
          ) : (
            <div className="space-y-3">
              {transfers.map(t => (
                <div key={t.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-white text-sm">{t.player_name}</p>
                    <p className="text-slate-400 mt-0.5">
                      {t.from_club_name || "Unknown"} → {t.to_club_name || "Unknown"}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {t.fee ? `€${(t.fee / 1000000).toFixed(1)}M` : "Free"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5-8: Fallback / Trophies & Records */}
      {['RECORDS', 'SEASON HISTORY', 'TROPHIES', 'STATISTICS'].includes(activeTab) && (
        <div className="bg-[#12161f]/80 border border-white/10 rounded-3xl p-12 text-center text-slate-400 space-y-2">
          <span className="material-symbols-outlined text-4xl text-emerald-400 mb-2">military_tech</span>
          <h3 className="text-xl font-bold text-white">{activeTab} Archive</h3>
          <p className="text-xs text-slate-500">Historical database extracted for {clubName}.</p>
        </div>
      )}
    </div>
  );
}
