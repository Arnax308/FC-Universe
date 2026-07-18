import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';

export default function PlayerProfile() {
  const { id } = useParams();
  const { career } = useOutletContext();
  const [player, setPlayer] = useState(null);
  const [stats, setStats] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [awards, setAwards] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!career) return;
    
    setLoading(true);
    fetch(`/api/careers/${career.id}/players/${id}/profile`)
      .then(res => res.json())
      .then(data => {
        setPlayer(data.player);
        setStats(data.stats || []);
        setTransfers(data.transfers || []);
        setAwards(data.awards || []);
        setTimeline(data.timeline || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching player profile:", err);
        setLoading(false);
      });
  }, [career, id]);

  const getPlayerImageUrl = (gameId) => {
    if (!gameId) return null;
    return `/api/images/player/${gameId}?v=2`;
  };

  const getFlagUrl = (nationality) => {
    // A mapping from EA IDs or Nationality string to flag URL would go here
    // But for now, we'll return a generic flag or null
    return `https://images.weserv.nl/?url=cdn.sofifa.net/flags/es.png`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!player) {
    return <div className="text-center p-8 text-on-surface">Player not found.</div>;
  }

  // Calculate Pace, Shooting, Passing, Dribbling, Defending, Physical averages
  const pace = Math.round(((player.sprint_speed || 0) + (player.acceleration || 0)) / 2) || '--';
  const sho = Math.round(((player.finishing || 0) + (player.shot_power || 0) + (player.positioning || 0)) / 3) || '--';
  const pas = Math.round(((player.short_passing || 0) + (player.long_passing || 0) + (player.vision || 0) + (player.crossing || 0)) / 4) || '--';
  const dri = Math.round(((player.dribbling || 0) + (player.ball_control || 0) + (player.agility || 0) + (player.balance || 0)) / 4) || '--';
  const def = Math.round(((player.standing_tackle || 0) + (player.sliding_tackle || 0) + (player.interceptions || 0)) / 3) || '--';
  const phy = Math.round(((player.strength || 0) + (player.stamina || 0)) / 2) || '--';

  return (
    <div className="md:ml-72 pt-20 min-h-screen relative z-10 pb-24">
      {/* Hero Section */}
      <section className="relative w-full min-h-[614px] md:min-h-[716px] flex flex-col justify-end px-4 sm:px-8 pb-12 pt-12 overflow-hidden">
        {/* Hero Image Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent z-10 md:w-2/3 w-full"></div>
            <>
              <img 
                className="w-full h-full object-cover object-top opacity-80 mix-blend-luminosity grayscale-[30%]" 
                src={getPlayerImageUrl(player.game_id)} 
                alt={player.known_name} 
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
              <div className="hidden w-full h-full bg-surface-container items-center justify-center opacity-30 absolute top-0 left-0">
                <span className="material-symbols-outlined text-[20vw] text-on-surface-variant/20">person</span>
              </div>
            </>
        </div>
        
        <div className="relative z-20 max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          {/* Player Identity */}
          <div className="md:col-span-7 flex flex-col gap-4">
            <div className="flex flex-wrap gap-2 items-center">
              {player.position && (
                <span className="px-3 py-1 rounded-full bg-white/5 backdrop-blur-lg text-xs font-bold text-primary border border-primary/30 shadow-[0_0_15px_rgba(78,222,163,0.2)]">
                  {player.position}
                </span>
              )}
              {player.jersey_number && (
                <span className="px-3 py-1 rounded-full bg-white/5 backdrop-blur-lg text-xs font-bold text-gray-300">
                  #{player.jersey_number}
                </span>
              )}
              {player.nationality && (
                <span className="px-3 py-1 rounded-full bg-white/5 backdrop-blur-lg text-xs font-bold text-gray-300 flex items-center gap-1">
                  {player.nationality}
                </span>
              )}
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black text-white uppercase drop-shadow-2xl">
              {player.known_name ? (
                <>
                  {player.known_name.split(' ')[0]} <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                    {player.known_name.split(' ').slice(1).join(' ')}
                  </span>
                </>
              ) : (
                <>
                  {player.first_name} <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                    {player.last_name}
                  </span>
                </>
              )}
            </h1>
          </div>
          
          {/* Core Stats Bento */}
          <div className="md:col-span-5 grid grid-cols-2 sm:grid-cols-4 gap-4 h-full content-end">
            {/* OVR */}
            <div className="col-span-2 sm:col-span-2 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 flex flex-col justify-center items-center relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/20 blur-2xl rounded-full group-hover:bg-primary/30 transition-colors"></div>
              <span className="text-xs uppercase font-bold text-gray-400 mb-2">Overall Rating</span>
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90 absolute" viewBox="0 0 36 36">
                  <path className="text-gray-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                  <path className="text-primary transition-all duration-1000" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${player.overall || 0}, 100`} strokeLinecap="round" strokeWidth="3"></path>
                </svg>
                <span className="text-4xl font-black text-white z-10">{player.overall || '--'}</span>
              </div>
              <span className="text-sm font-mono text-orange-400 mt-2 flex items-center gap-1">
                POT {player.potential || '--'}
              </span>
            </div>
          </div>
        </div>
      </section>
      
      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Detailed Attributes */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Attributes Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-300">Pace</span>
                  <span className="text-lg font-black text-white">{pace}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400"><span>Sprint Speed</span><span>{player.sprint_speed || '--'}</span></div>
                  <div className="flex justify-between text-xs text-gray-400"><span>Acceleration</span><span>{player.acceleration || '--'}</span></div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-300">Shooting</span>
                  <span className="text-lg font-black text-white">{sho}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400"><span>Finishing</span><span>{player.finishing || '--'}</span></div>
                  <div className="flex justify-between text-xs text-gray-400"><span>Shot Power</span><span>{player.shot_power || '--'}</span></div>
                  <div className="flex justify-between text-xs text-gray-400"><span>Positioning</span><span>{player.positioning || '--'}</span></div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-300">Passing</span>
                  <span className="text-lg font-black text-white">{pas}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400"><span>Short Passing</span><span>{player.short_passing || '--'}</span></div>
                  <div className="flex justify-between text-xs text-gray-400"><span>Long Passing</span><span>{player.long_passing || '--'}</span></div>
                  <div className="flex justify-between text-xs text-gray-400"><span>Vision</span><span>{player.vision || '--'}</span></div>
                  <div className="flex justify-between text-xs text-gray-400"><span>Crossing</span><span>{player.crossing || '--'}</span></div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-300">Dribbling</span>
                  <span className="text-lg font-black text-white">{dri}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400"><span>Dribbling</span><span>{player.dribbling || '--'}</span></div>
                  <div className="flex justify-between text-xs text-gray-400"><span>Ball Control</span><span>{player.ball_control || '--'}</span></div>
                  <div className="flex justify-between text-xs text-gray-400"><span>Agility</span><span>{player.agility || '--'}</span></div>
                  <div className="flex justify-between text-xs text-gray-400"><span>Balance</span><span>{player.balance || '--'}</span></div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-300">Defending</span>
                  <span className="text-lg font-black text-white">{def}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400"><span>Stand Tackle</span><span>{player.standing_tackle || '--'}</span></div>
                  <div className="flex justify-between text-xs text-gray-400"><span>Slide Tackle</span><span>{player.sliding_tackle || '--'}</span></div>
                  <div className="flex justify-between text-xs text-gray-400"><span>Interceptions</span><span>{player.interceptions || '--'}</span></div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-300">Physical</span>
                  <span className="text-lg font-black text-white">{phy}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400"><span>Strength</span><span>{player.strength || '--'}</span></div>
                  <div className="flex justify-between text-xs text-gray-400"><span>Stamina</span><span>{player.stamina || '--'}</span></div>
                </div>
              </div>

            </div>
          </div>

          {/* Season-by-Season Stats */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Season-by-Season Statistics</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-on-surface-variant">
                <thead className="text-xs uppercase text-on-surface border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3">Season</th>
                    <th className="px-4 py-3">Club</th>
                    <th className="px-4 py-3">Apps</th>
                    <th className="px-4 py-3">Goals</th>
                    <th className="px-4 py-3">Assists</th>
                    <th className="px-4 py-3">Avg Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.length > 0 ? (
                    stats.map((s, idx) => (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-white font-mono">{s.season_year}</td>
                        <td className="px-4 py-3 text-white font-bold">{s.club_name}</td>
                        <td className="px-4 py-3">{s.appearances}</td>
                        <td className="px-4 py-3 text-primary font-bold">{s.goals}</td>
                        <td className="px-4 py-3">{s.assists}</td>
                        <td className="px-4 py-3 font-mono text-orange-400 font-bold">{s.avg_rating.toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center text-gray-500 py-8">
                        No season statistics available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Career Timeline */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Career Timeline</h3>
            <div className="flex flex-col gap-4">
              {timeline.length > 0 ? (
                timeline.map((ev, idx) => (
                  <div key={idx} className="border-l-2 border-primary/30 pl-4 py-2 text-on-surface-variant text-sm">
                    <span className="block text-primary text-xs font-bold mb-1">SEASON {ev.season_year}</span>
                    {ev.description}
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4 text-sm">No timeline events recorded.</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Transfer History */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Transfer History</h3>
            <div className="flex flex-col gap-4">
              {transfers.length > 0 ? (
                transfers.map((t, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                    <div>
                      <p className="text-xs text-gray-400 font-mono">Season {t.season_year}</p>
                      <p className="text-sm text-white font-bold">{t.from_club_name} ➔ {t.to_club_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-primary font-bold uppercase">{t.type}</p>
                      <p className="text-sm text-orange-400 font-bold font-mono">
                        {t.fee > 0 ? `£${(t.fee / 1000000).toFixed(1)}M` : 'Free'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4 text-sm">
                  No transfer records extracted.
                </div>
              )}
            </div>
          </div>

          {/* Awards & Trophies */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Trophy Cabinet</h3>
            <div className="flex gap-3 flex-wrap justify-center py-2">
              {awards.length > 0 ? (
                awards.map((aw, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 px-3.5 py-2 rounded-xl text-xs font-bold">
                    <span className="material-symbols-outlined text-lg">military_tech</span>
                    <span>{aw.name} ({aw.season_year})</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4 text-sm w-full">
                  No trophies or individual awards recorded yet.
                </div>
              )}
            </div>
          </div>
          
          {/* Growth Curve */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Development Curve</h3>
            <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl text-gray-500 text-sm p-4 text-center">
              <span className="material-symbols-outlined text-3xl mb-1">trending_up</span>
              <span>Potential: {player.potential || '--'} (Current OVR: {player.overall || '--'})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
