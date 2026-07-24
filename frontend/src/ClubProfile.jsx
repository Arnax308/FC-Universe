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
      
      // Fetch dynamic club details
      const p1 = fetch(`/api/careers/${career.id}/clubs/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data && (data.id || data.name)) {
            setClub(data);
          }
        })
        .catch(err => console.error("Failed to fetch club details:", err));

      // Fetch squad players for this club
      const p2 = fetch(`/api/careers/${career.id}/players?club_id=${id}&limit=500`)
        .then(res => res.json())
        .then(data => {
          setSquad(Array.isArray(data) ? data : []);
        })
        .catch(err => console.error("Failed to fetch squad:", err));

      // Fetch transfers for this club
      const p3 = fetch(`/api/careers/${career.id}/transfers?club_id=${id}&limit=200`)
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
        <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">Loading Club Data...</p>
      </div>
    );
  }

  const clubName = club?.name || "Club Profile";
  const stadiumName = club?.stadium_name || "Club Stadium";
  const leagueName = club?.league || "Unassigned League";
  const managerName = club?.manager_name || "Manager";

  // Dynamic calculations from squad
  const topPlayer = squad.length > 0 ? [...squad].sort((a, b) => (b.overall || 0) - (a.overall || 0))[0] : null;
  const avgOverall = squad.length > 0 ? (squad.reduce((acc, p) => acc + (p.overall || 0), 0) / squad.length).toFixed(1) : (club?.overall_rating || "-");

  // Dynamic net spend
  const netSpendEur = club?.net_spend !== undefined ? club.net_spend : 0;
  const formattedNetSpend = netSpendEur >= 0 
    ? `€${(netSpendEur / 1000000).toFixed(1)}M Spent` 
    : `€${(Math.abs(netSpendEur) / 1000000).toFixed(1)}M Profit`;

  // Trophies lists
  const historicalTrophies = club?.historical_trophies || [];
  const universeTrophies = club?.universe_trophies || [];
  const totalHistoricalCount = historicalTrophies.reduce((sum, t) => sum + (t.count || 0), 0) + universeTrophies.reduce((sum, t) => sum + (t.count || 0), 0);

  const renderTrophyIcon = (iconPath, name) => {
    if (iconPath && iconPath.startsWith('/')) {
      return (
        <img 
          src={iconPath} 
          alt={name} 
          className="w-10 h-10 object-contain drop-shadow-lg group-hover:scale-110 transition-transform" 
          onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'inline-block'; }}
        />
      );
    }
    return <span className="text-3xl">🏆</span>;
  };

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
              {club?.game_id ? (
                <img 
                  src={getLogoUrl(club.game_id)} 
                  alt={clubName} 
                  className="w-full h-full object-contain drop-shadow-xl"
                  onError={(e) => { 
                    e.target.style.display = 'none'; 
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'block';
                  }}
                />
              ) : null}
              <span className="material-symbols-outlined text-slate-400 text-5xl hidden">shield</span>
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

          {/* Right Header Cards: Manager & Financial Standing */}
          <div className="flex items-center gap-4 bg-black/40 border border-white/10 rounded-2xl p-4 backdrop-blur-md self-start md:self-auto">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Manager</p>
              <p className="text-sm font-bold text-white mt-0.5">{managerName}</p>
            </div>
            <div className="h-8 w-px bg-white/10"></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Net Transfer Spend</p>
              <p className="text-sm font-bold text-emerald-400 mt-0.5">
                {formattedNetSpend}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 pb-2 scrollbar-none">
        {[
          'OVERVIEW',
          'TROPHY CABINET',
          'CURRENT SQUAD',
          'TRANSFERS',
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
          {/* Left Column: Dynamic Club Rating & Squad Summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Club Ratings Overview */}
            <div className="bg-[#12161f]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Club Ratings</h3>
                  <p className="text-xs text-slate-400">Tactical Ratings & Squad Composition</p>
                </div>
                <span className="material-symbols-outlined text-emerald-400">equalizer</span>
              </div>

              {/* 4 Ratings Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Overall</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{club?.overall_rating || avgOverall || "-"}</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Attack</p>
                  <p className="text-2xl font-black text-white mt-1">{club?.attack_rating || "-"}</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Midfield</p>
                  <p className="text-2xl font-black text-white mt-1">{club?.midfield_rating || "-"}</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Defense</p>
                  <p className="text-2xl font-black text-white mt-1">{club?.defense_rating || "-"}</p>
                </div>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Star Player Card */}
              <div className="bg-[#12161f]/80 border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Star Player</p>
                  <p className="text-lg font-black text-white truncate mt-0.5">
                    {topPlayer ? (topPlayer.known_name || `${topPlayer.first_name} ${topPlayer.last_name}`) : (club?.top_player_name || "None")}
                  </p>
                  <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                    {topPlayer ? `${topPlayer.position || 'FW'} • OVR ${topPlayer.overall}` : ''}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-lg">
                  {topPlayer ? topPlayer.overall : (club?.top_player_overall || "-")}
                </div>
              </div>

              {/* Total Squad Count Card */}
              <div className="bg-[#12161f]/80 border border-white/10 rounded-2xl p-5 flex items-center justify-between shadow-xl">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Registered Squad</p>
                  <p className="text-2xl font-black text-white mt-1">{squad.length} Players</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <span className="material-symbols-outlined">groups</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Trophy Summary & Recent Transfers */}
          <div className="space-y-6">
            {/* Trophy Cabinet Highlights Card */}
            <div 
              onClick={() => setActiveTab('TROPHY CABINET')}
              className="bg-[#12161f]/80 backdrop-blur-xl border border-white/10 hover:border-amber-500/40 rounded-3xl p-6 shadow-xl space-y-4 cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src="/assets/trophies/ucl.png" alt="Trophy" className="w-6 h-6 object-contain" />
                  <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">Trophy Cabinet</h3>
                </div>
                <span className="text-xs text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                  {totalHistoricalCount} Silverware
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {historicalTrophies.slice(0, 4).map((t, idx) => (
                  <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-xl p-2.5 text-center flex flex-col items-center">
                    {renderTrophyIcon(t.icon, t.name)}
                    <p className="text-lg font-black text-amber-400 mt-1">{t.count}x</p>
                    <p className="text-[10px] text-slate-400 truncate w-full">{t.name}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Transfers Summary */}
            <div className="bg-[#12161f]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-lg">swap_horiz</span>
                Recent Transfers ({transfers.length})
              </h3>

              {transfers.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center italic">No transfer records logged for {clubName}.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {transfers.slice(0, 5).map(t => (
                    <div key={t.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-white truncate">{t.player_name}</p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {t.from_club_name || "Club"} → {t.to_club_name || "Club"}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-emerald-400 flex-shrink-0">
                        {t.fee ? `€${(t.fee / 1000000).toFixed(1)}M` : "Free"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TROPHY CABINET */}
      {activeTab === 'TROPHY CABINET' && (
        <div className="space-y-8">
          {/* Header Banner for Silverware */}
          <div className="relative rounded-3xl p-8 bg-gradient-to-r from-amber-950/40 via-[#161b22] to-slate-900 border border-amber-500/20 shadow-2xl overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center sm:text-left">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest">
                HALL OF CHAMPIONS
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                {clubName} Trophy Cabinet
              </h2>
              <p className="text-slate-400 text-sm max-w-xl">
                All-time historical silverware and honours won by {clubName} both historically and in your FC Universe save.
              </p>
            </div>
            
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-center min-w-[140px] flex flex-col items-center">
              <img src="/assets/trophies/ucl.png" alt="Trophy" className="w-12 h-12 object-contain" />
              <p className="text-3xl font-black text-amber-400 mt-1">{totalHistoricalCount}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Trophies</p>
            </div>
          </div>

          {/* In-Universe Trophies Section */}
          {universeTrophies.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-xl">auto_awesome</span>
                In-Universe Honors (Current Career Save)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {universeTrophies.map((t, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {renderTrophyIcon(t.icon, t.name)}
                      <div>
                        <p className="text-base font-bold text-white">{t.name}</p>
                        <p className="text-xs text-emerald-400 font-medium mt-0.5">{t.category}</p>
                      </div>
                    </div>
                    <span className="text-3xl font-black text-emerald-400">{t.count}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All-Time Historical Silverware */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <img src="/assets/trophies/league.png" alt="Silverware" className="w-6 h-6 object-contain" />
              All-Time Historical Silverware
            </h3>

            {historicalTrophies.length === 0 ? (
              <p className="text-slate-500 text-sm italic">No historical trophy records found.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {historicalTrophies.map((t, idx) => (
                  <div 
                    key={idx}
                    className="bg-[#12161f]/80 border border-white/10 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xl transition-all hover:-translate-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      {renderTrophyIcon(t.icon, t.name)}
                      <span className="text-2xl font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl">
                        {t.count}x
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                        {t.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">{t.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            <p className="text-sm text-slate-500 py-12 text-center italic">No players registered for {clubName} in the current database snapshot.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {squad.map(player => (
                <div 
                  key={player.id}
                  onClick={() => navigate(`/players/${player.id}`)}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/40 flex items-center justify-between cursor-pointer transition-all hover:bg-white/[0.06] group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                      <img 
                        src={getPlayerPhotoUrl(player.game_id)} 
                        alt={player.known_name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                        {player.known_name || `${player.first_name} ${player.last_name}`}
                      </p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {player.position || "MF"} • Age {player.age || (player.birth_year ? (2026 - player.birth_year) : 24)}
                      </p>
                    </div>
                  </div>

                  <span className="text-base font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20 flex-shrink-0">
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
          <h3 className="text-xl font-bold text-white">Transfer Logs ({transfers.length})</h3>
          {transfers.length === 0 ? (
            <p className="text-sm text-slate-500 py-12 text-center italic">No transfer records found for {clubName}.</p>
          ) : (
            <div className="space-y-3">
              {transfers.map(t => (
                <div key={t.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-white text-sm">{t.player_name}</p>
                    <p className="text-slate-400 mt-0.5">
                      {t.from_club_name || "Club"} → {t.to_club_name || "Club"}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {t.fee ? `€${(t.fee / 1000000).toFixed(1)}M` : "Free Transfer"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: STATISTICS */}
      {activeTab === 'STATISTICS' && (
        <div className="bg-[#12161f]/80 border border-white/10 rounded-3xl p-8 shadow-xl space-y-6">
          <h3 className="text-xl font-bold text-white">Squad Statistics Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Average Squad OVR</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">{avgOverall}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Total Squad Size</p>
              <p className="text-2xl font-black text-white mt-1">{squad.length}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Total Transfers</p>
              <p className="text-2xl font-black text-amber-400 mt-1">{transfers.length}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Domestic Prestige</p>
              <p className="text-2xl font-black text-white mt-1">{club?.domestic_prestige || 10}/10</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
