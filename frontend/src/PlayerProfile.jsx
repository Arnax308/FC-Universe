import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext, Link } from 'react-router-dom';

export default function PlayerProfile() {
  const { id } = useParams();
  const { career } = useOutletContext();
  const [player, setPlayer] = useState(null);
  const [stats, setStats] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [awards, setAwards] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [conversionPlans, setConversionPlans] = useState([]);
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
        setConversionPlans(data.conversion_plans || []);
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

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-full min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <span className="text-on-surface-variant text-sm">Loading player profile...</span>
        </div>
      </div>
    );
  }

  if (!player) {
    return <div className="text-center p-8 text-on-surface">Player not found.</div>;
  }

  // Age calculation
  const currentYear = new Date().getFullYear();
  const playerAge = player.birth_year ? currentYear - player.birth_year : null;

  // Calculate face stats for radar
  const attacking = Math.round(((player.finishing || 0) + (player.shot_power || 0) + (player.positioning || 0) + (player.heading_accuracy || 0)) / 4) || 0;
  const creativity = Math.round(((player.vision || 0) + (player.crossing || 0) + (player.short_passing || 0) + (player.long_passing || 0) + (player.curve || 0)) / 5) || 0;
  const defending = Math.round(((player.standing_tackle || 0) + (player.sliding_tackle || 0) + (player.interceptions || 0) + (player.defensive_awareness || 0)) / 4) || 0;
  const physical = Math.round(((player.strength || 0) + (player.stamina || 0) + (player.aggression || 0) + (player.jumping || 0)) / 4) || 0;
  const tactical = Math.round(((player.reactions || 0) + (player.composure || 0) + (player.ball_control || 0)) / 3) || 0;

  // Radar polygon points (pentagon)
  const radarData = [
    { label: 'ATTACKING', value: attacking },
    { label: 'CREATIVITY', value: creativity },
    { label: 'TACTICAL', value: tactical },
    { label: 'DEFENDING', value: defending },
    { label: 'PHYSICAL', value: physical },
  ];

  const cx = 150, cy = 150, maxR = 100;
  const angleStep = (2 * Math.PI) / 5;
  const startAngle = -Math.PI / 2;

  const getPoint = (i, r) => {
    const angle = startAngle + i * angleStep;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  const radarPoints = radarData.map((d, i) => getPoint(i, (d.value / 99) * maxR));
  const radarPath = radarPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ') + ' Z';
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  // Face stat averages for full attributes display
  const pace = Math.round(((player.sprint_speed || 0) + (player.acceleration || 0)) / 2) || '--';
  const sho = Math.round(((player.finishing || 0) + (player.shot_power || 0) + (player.positioning || 0)) / 3) || '--';
  const pas = Math.round(((player.short_passing || 0) + (player.long_passing || 0) + (player.vision || 0) + (player.crossing || 0)) / 4) || '--';
  const dri = Math.round(((player.dribbling || 0) + (player.ball_control || 0) + (player.agility || 0) + (player.balance || 0)) / 4) || '--';
  const def = Math.round(((player.standing_tackle || 0) + (player.sliding_tackle || 0) + (player.interceptions || 0)) / 3) || '--';
  const phy = Math.round(((player.strength || 0) + (player.stamina || 0)) / 2) || '--';

  // Standout attributes (top 4 by value)
  const allAttrs = [
    { name: 'Dribbling', value: player.dribbling || 0 },
    { name: 'Vision', value: player.vision || 0 },
    { name: 'Agility', value: player.agility || 0 },
    { name: 'Finishing', value: player.finishing || 0 },
    { name: 'Sprint Speed', value: player.sprint_speed || 0 },
    { name: 'Ball Control', value: player.ball_control || 0 },
    { name: 'Short Passing', value: player.short_passing || 0 },
    { name: 'Long Passing', value: player.long_passing || 0 },
    { name: 'Crossing', value: player.crossing || 0 },
    { name: 'Shot Power', value: player.shot_power || 0 },
    { name: 'Strength', value: player.strength || 0 },
    { name: 'Stamina', value: player.stamina || 0 },
    { name: 'Reactions', value: player.reactions || 0 },
    { name: 'Composure', value: player.composure || 0 },
    { name: 'Balance', value: player.balance || 0 },
    { name: 'Acceleration', value: player.acceleration || 0 },
    { name: 'Interceptions', value: player.interceptions || 0 },
    { name: 'Stand Tackle', value: player.standing_tackle || 0 },
  ].sort((a, b) => b.value - a.value).slice(0, 4);

  const getStatColor = (val) => {
    if (val >= 90) return 'text-emerald-400';
    if (val >= 80) return 'text-primary';
    if (val >= 70) return 'text-yellow-400';
    if (val >= 60) return 'text-orange-400';
    return 'text-red-400';
  };

  const POSITION_MAP = {
    'ST': 'Striker', 'RW': 'Right Winger', 'LW': 'Left Winger',
    'CAM': 'Att. Midfielder', 'CM': 'Central Midfielder', 'CDM': 'Def. Midfielder',
    'RM': 'Right Midfielder', 'LM': 'Left Midfielder',
    'CB': 'Centre Back', 'RB': 'Right Back', 'LB': 'Left Back', 'GK': 'Goalkeeper'
  };

  const playerName = player.known_name || `${player.first_name || ''} ${player.last_name || ''}`.trim();
  const nameParts = playerName.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  return (
    <div className="w-full min-h-screen relative z-10 pb-24">
      {/* Breadcrumb */}
      <div className="px-4 sm:px-8 pt-4 pb-2 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <Link to={`/career/${career?.id}/players`} className="hover:text-primary transition-colors">Players</Link>
          <span className="text-on-surface-variant/40">›</span>
          <span className="text-on-surface">{playerName}</span>
        </div>
      </div>

      {/* ===== HERO SECTION ===== */}
      <section className="relative w-full min-h-[380px] md:min-h-[440px] overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30 z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent z-10"></div>
          <img
            className="w-full h-full object-cover object-top opacity-60 mix-blend-luminosity"
            src={getPlayerImageUrl(player.game_id)}
            alt={playerName}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-20 max-w-[1400px] mx-auto px-4 sm:px-8 h-full flex flex-col justify-end pb-8 pt-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
            {/* Left: Identity */}
            <div className="lg:col-span-7 flex flex-col gap-3">
              {/* Tags */}
              <div className="flex flex-wrap gap-2 items-center">
                {player.position && (
                  <span className="px-4 py-1.5 rounded-full bg-primary text-on-primary text-xs font-bold shadow-lg">
                    {POSITION_MAP[player.position] || player.position}
                  </span>
                )}
                {player.jersey_number && (
                  <span className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-gray-200 border border-white/10">
                    #{player.jersey_number}
                  </span>
                )}
                {player.nationality && (
                  <span className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-gray-200 border border-white/10 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">flag</span> {player.nationality}
                  </span>
                )}
                {playerAge && (
                  <span className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-gray-200 border border-white/10">
                    Age {playerAge}
                  </span>
                )}
                {player.player_type === 'youth' && (
                  <span className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">school</span> Youth Academy
                  </span>
                )}
                {player.player_type === 'regen' && (
                  <span className="px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">autorenew</span> Regen
                  </span>
                )}
              </div>

              {/* Player Name */}
              <h1 className="text-5xl md:text-7xl font-black text-white uppercase leading-[0.9] tracking-tight">
                {firstName}
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                  {lastName || firstName}
                </span>
              </h1>
            </div>

            {/* Right: Bento Cards */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              {/* Overall Rating Card */}
              <div className="bg-surface-container/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute -right-6 -top-6 w-28 h-28 bg-primary/15 blur-3xl rounded-full group-hover:bg-primary/25 transition-all duration-500"></div>
                <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest mb-2">Overall Rating</span>
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90 absolute" viewBox="0 0 36 36">
                    <path className="text-white/5" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                    <path className="text-primary transition-all duration-1000" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${player.overall || 0}, 100`} strokeLinecap="round" strokeWidth="3"></path>
                  </svg>
                  <span className="text-3xl font-black text-white z-10">{player.overall || '--'}</span>
                </div>
                <span className="text-xs font-bold text-primary mt-1.5 flex items-center gap-1">
                  ↑ POT {player.potential || '--'}
                </span>
              </div>

              {/* Current Club Card */}
              <div className="bg-surface-container/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest mb-3">◊ Current Club</span>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-surface-variant text-xl">shield</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">{player.club_name || 'Free Agent'}</p>
                    {player.secondary_positions && (
                      <p className="text-[10px] text-on-surface-variant mt-0.5">Alt: {player.secondary_positions}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== MAIN CONTENT BENTO GRID ===== */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-5 flex flex-col gap-5">

            {/* Profiler Radar */}
            <div className="bg-surface-container/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="material-symbols-outlined text-primary text-lg">radar</span>
                <h3 className="text-base font-bold text-white">Profiler</h3>
                <span className="ml-auto text-[10px] bg-white/5 px-2 py-1 rounded-full text-on-surface-variant font-bold border border-white/5">
                  {career?.current_season || 'SEASON'}
                </span>
              </div>

              {/* Radar Chart */}
              <div className="flex justify-center">
                <svg viewBox="0 0 300 300" className="w-full max-w-[280px]">
                  {/* Grid lines */}
                  {gridLevels.map((level, li) => {
                    const pts = Array.from({ length: 5 }, (_, i) => getPoint(i, maxR * level));
                    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ') + ' Z';
                    return <path key={li} d={path} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
                  })}
                  {/* Axes */}
                  {Array.from({ length: 5 }, (_, i) => {
                    const [ex, ey] = getPoint(i, maxR);
                    return <line key={i} x1={cx} y1={cy} x2={ex} y2={ey} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
                  })}
                  {/* Data polygon */}
                  <path d={radarPath} fill="rgba(78,222,163,0.15)" stroke="rgb(78,222,163)" strokeWidth="2" />
                  {/* Data points */}
                  {radarPoints.map((p, i) => (
                    <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="rgb(78,222,163)" stroke="#111" strokeWidth="1.5" />
                  ))}
                  {/* Labels */}
                  {radarData.map((d, i) => {
                    const [lx, ly] = getPoint(i, maxR + 28);
                    return (
                      <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                        className="fill-on-surface-variant text-[9px] font-bold uppercase tracking-wider">
                        {d.label}
                      </text>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Standout Attributes */}
            <div className="bg-surface-container/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <h3 className="text-base font-bold text-white mb-5">Standout Attributes</h3>
              <div className="flex flex-col gap-4">
                {allAttrs.map((attr, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-on-surface-variant w-28 shrink-0">{attr.name}</span>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-1000"
                        style={{ width: `${attr.value}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-primary w-8 text-right">{attr.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Position Conversion */}
            <div className="bg-surface-container/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-primary text-lg">published_with_changes</span>
                <h3 className="text-base font-bold text-white">Position Conversion</h3>
              </div>
              <p className="text-[11px] text-on-surface-variant mb-5">Estimated conversion time based on attributes, position distance & age.</p>

              {conversionPlans.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {conversionPlans.slice(0, 6).map((plan, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border transition-all ${
                        plan.is_secondary
                          ? 'bg-primary/10 border-primary/30'
                          : 'bg-white/[0.03] border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-black text-on-surface">{plan.target_position}</span>
                        <span className="text-[10px] font-bold text-tertiary bg-tertiary/10 px-2 py-0.5 rounded-full">
                          {plan.suitability}%
                        </span>
                      </div>
                      {plan.is_secondary && (
                        <span className="text-[8px] bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider inline-block mb-1.5">
                          Natural Alt
                        </span>
                      )}
                      <div className="flex items-baseline justify-between pt-2 border-t border-white/5">
                        <span className="text-[10px] text-on-surface-variant">{plan.difficulty}</span>
                        <span className="text-lg font-black text-primary">{plan.weeks}<span className="text-xs ml-0.5">wks</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-on-surface-variant text-sm p-4 bg-white/[0.02] rounded-xl border border-white/5 text-center">
                  No position conversions available.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-7 flex flex-col gap-5">

            {/* Full Attributes Breakdown */}
            <div className="bg-surface-container/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="material-symbols-outlined text-primary text-lg">analytics</span>
                <h3 className="text-base font-bold text-white">Attributes Breakdown</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
                {/* Pace */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Pace</span>
                    <span className={`text-lg font-black ${typeof pace === 'number' ? getStatColor(pace) : 'text-gray-500'}`}>{pace}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Sprint Speed</span><span className={getStatColor(player.sprint_speed || 0)}>{player.sprint_speed || '--'}</span></div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Acceleration</span><span className={getStatColor(player.acceleration || 0)}>{player.acceleration || '--'}</span></div>
                  </div>
                </div>
                {/* Shooting */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Shooting</span>
                    <span className={`text-lg font-black ${typeof sho === 'number' ? getStatColor(sho) : 'text-gray-500'}`}>{sho}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Finishing</span><span className={getStatColor(player.finishing || 0)}>{player.finishing || '--'}</span></div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Shot Power</span><span className={getStatColor(player.shot_power || 0)}>{player.shot_power || '--'}</span></div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Positioning</span><span className={getStatColor(player.positioning || 0)}>{player.positioning || '--'}</span></div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Long Shots</span><span className={getStatColor(player.long_shots || 0)}>{player.long_shots || '--'}</span></div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Volleys</span><span className={getStatColor(player.volleys || 0)}>{player.volleys || '--'}</span></div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Penalties</span><span className={getStatColor(player.penalties || 0)}>{player.penalties || '--'}</span></div>
                  </div>
                </div>
                {/* Passing */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Passing</span>
                    <span className={`text-lg font-black ${typeof pas === 'number' ? getStatColor(pas) : 'text-gray-500'}`}>{pas}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Short Passing</span><span className={getStatColor(player.short_passing || 0)}>{player.short_passing || '--'}</span></div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Long Passing</span><span className={getStatColor(player.long_passing || 0)}>{player.long_passing || '--'}</span></div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Vision</span><span className={getStatColor(player.vision || 0)}>{player.vision || '--'}</span></div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Crossing</span><span className={getStatColor(player.crossing || 0)}>{player.crossing || '--'}</span></div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>FK Accuracy</span><span className={getStatColor(player.free_kick_accuracy || 0)}>{player.free_kick_accuracy || '--'}</span></div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Curve</span><span className={getStatColor(player.curve || 0)}>{player.curve || '--'}</span></div>
                  </div>
                </div>
                {/* Dribbling */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Dribbling</span>
                    <span className={`text-lg font-black ${typeof dri === 'number' ? getStatColor(dri) : 'text-gray-500'}`}>{dri}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Dribbling</span><span className={getStatColor(player.dribbling || 0)}>{player.dribbling || '--'}</span></div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Ball Control</span><span className={getStatColor(player.ball_control || 0)}>{player.ball_control || '--'}</span></div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Agility</span><span className={getStatColor(player.agility || 0)}>{player.agility || '--'}</span></div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Balance</span><span className={getStatColor(player.balance || 0)}>{player.balance || '--'}</span></div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Reactions</span><span className={getStatColor(player.reactions || 0)}>{player.reactions || '--'}</span></div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Composure</span><span className={getStatColor(player.composure || 0)}>{player.composure || '--'}</span></div>
                  </div>
                </div>
                {/* Defending */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Defending</span>
                    <span className={`text-lg font-black ${typeof def === 'number' ? getStatColor(def) : 'text-gray-500'}`}>{def}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Stand Tackle</span><span className={getStatColor(player.standing_tackle || 0)}>{player.standing_tackle || '--'}</span></div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Slide Tackle</span><span className={getStatColor(player.sliding_tackle || 0)}>{player.sliding_tackle || '--'}</span></div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Interceptions</span><span className={getStatColor(player.interceptions || 0)}>{player.interceptions || '--'}</span></div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Heading</span><span className={getStatColor(player.heading_accuracy || 0)}>{player.heading_accuracy || '--'}</span></div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Def Awareness</span><span className={getStatColor(player.defensive_awareness || 0)}>{player.defensive_awareness || '--'}</span></div>
                  </div>
                </div>
                {/* Physical */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Physical</span>
                    <span className={`text-lg font-black ${typeof phy === 'number' ? getStatColor(phy) : 'text-gray-500'}`}>{phy}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Strength</span><span className={getStatColor(player.strength || 0)}>{player.strength || '--'}</span></div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Stamina</span><span className={getStatColor(player.stamina || 0)}>{player.stamina || '--'}</span></div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Aggression</span><span className={getStatColor(player.aggression || 0)}>{player.aggression || '--'}</span></div>
                    <div className="flex justify-between text-[11px] text-on-surface-variant"><span>Jumping</span><span className={getStatColor(player.jumping || 0)}>{player.jumping || '--'}</span></div>
                  </div>
                </div>
              </div>
              {/* GK Stats (only show for goalkeepers) */}
              {player.position === 'GK' && (
                <div className="mt-5 pt-5 border-t border-white/10">
                  <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Goalkeeper</h4>
                  <div className="grid grid-cols-5 gap-3">
                    {[{l:'Diving',v:player.gk_diving},{l:'Handling',v:player.gk_handling},{l:'Kicking',v:player.gk_kicking},{l:'Positioning',v:player.gk_positioning},{l:'Reflexes',v:player.gk_reflexes}].map((g,i) => (
                      <div key={i} className="flex flex-col items-center gap-1 p-2 bg-white/[0.03] rounded-lg">
                        <span className={`text-lg font-black ${getStatColor(g.v || 0)}`}>{g.v || '--'}</span>
                        <span className="text-[9px] text-on-surface-variant">{g.l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Meta info */}
              <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap gap-4">
                {player.weak_foot_ability && (
                  <div className="text-xs text-on-surface-variant">
                    <span className="font-bold text-white">Weak Foot:</span> {'⭐'.repeat(player.weak_foot_ability)}
                  </div>
                )}
                {player.skill_moves && (
                  <div className="text-xs text-on-surface-variant">
                    <span className="font-bold text-white">Skill Moves:</span> {'⭐'.repeat(player.skill_moves)}
                  </div>
                )}
                {player.international_rep && (
                  <div className="text-xs text-on-surface-variant">
                    <span className="font-bold text-white">Intl. Rep:</span> {'⭐'.repeat(player.international_rep)}
                  </div>
                )}
              </div>
            </div>

            {/* Career Statistics Table */}
            <div className="bg-surface-container/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="material-symbols-outlined text-primary text-lg">bar_chart</span>
                <h3 className="text-base font-bold text-white">Career Statistics</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase text-on-surface-variant tracking-wider border-b border-white/10">
                      <th className="px-3 py-2.5">Season</th>
                      <th className="px-3 py-2.5">Club</th>
                      <th className="px-3 py-2.5 text-center">APP</th>
                      <th className="px-3 py-2.5 text-center">GLS</th>
                      <th className="px-3 py-2.5 text-center">AST</th>
                      <th className="px-3 py-2.5 text-center">AVG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.length > 0 ? (
                      stats.map((s, idx) => (
                        <tr key={idx} className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors">
                          <td className="px-3 py-3 text-white font-mono text-xs">{s.season_year}</td>
                          <td className="px-3 py-3 text-white font-semibold text-xs flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-primary inline-block"></span>
                            {s.club_name}
                          </td>
                          <td className="px-3 py-3 text-on-surface-variant text-center text-xs">{s.appearances}</td>
                          <td className="px-3 py-3 text-primary font-bold text-center text-xs">{s.goals}</td>
                          <td className="px-3 py-3 text-primary font-bold text-center text-xs">{s.assists}</td>
                          <td className="px-3 py-3 font-mono text-orange-400 font-bold text-center text-xs">{s.avg_rating?.toFixed(1)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center text-on-surface-variant/50 py-8 text-sm">
                          No season statistics available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Row: Trajectory + Cabinet */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Trajectory */}
              <div className="bg-surface-container/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <span className="material-symbols-outlined text-primary text-lg">timeline</span>
                  <h3 className="text-base font-bold text-white">Trajectory</h3>
                </div>
                <div className="flex flex-col gap-0">
                  {timeline.length > 0 ? (
                    timeline.slice(0, 6).map((ev, idx) => (
                      <div key={idx} className="flex gap-3 pb-4 last:pb-0">
                        <div className="flex flex-col items-center">
                          <div className={`w-2.5 h-2.5 rounded-full ${idx === 0 ? 'bg-primary shadow-[0_0_8px_rgba(78,222,163,0.5)]' : 'bg-white/20'}`}></div>
                          {idx < Math.min(timeline.length, 6) - 1 && <div className="w-px flex-1 bg-white/10 mt-1"></div>}
                        </div>
                        <div className="flex-1 -mt-1">
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Season {ev.season_year}</span>
                          <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{ev.description}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-on-surface-variant/50 py-4 text-sm">No timeline events.</p>
                  )}
                </div>
              </div>

              {/* Cabinet */}
              <div className="bg-surface-container/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <span className="material-symbols-outlined text-primary text-lg">emoji_events</span>
                  <h3 className="text-base font-bold text-white">Honours & Cabinet ({awards.length + (player.trophies ? player.trophies.length : 0)})</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                  {awards.length > 0 || (player.trophies && player.trophies.length > 0) ? (
                    <>
                      {awards.map((aw, idx) => (
                        <div key={`aw-${idx}`} className="flex flex-col items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                          <img src="/assets/trophies/ballondor.png" alt="Award" className="w-8 h-8 object-contain" />
                          <span className="text-[10px] font-bold text-white leading-tight">{aw.name}</span>
                          <span className="text-[9px] text-amber-400 font-bold">x1 ({aw.season_year})</span>
                        </div>
                      ))}
                      {player.trophies && player.trophies.map((tr, idx) => (
                        <div key={`tr-${idx}`} className="flex flex-col items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                          <img src={tr.icon || "/assets/trophies/league.png"} alt="Trophy" className="w-8 h-8 object-contain" />
                          <span className="text-[10px] font-bold text-white leading-tight">{tr.name}</span>
                          <span className="text-[9px] text-emerald-400 font-bold">Team Silverware</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="col-span-2 text-center text-on-surface-variant/50 py-4 text-sm">
                      No trophies recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Transfer History */}
            <div className="bg-surface-container/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="material-symbols-outlined text-primary text-lg">swap_horiz</span>
                <h3 className="text-base font-bold text-white">Transfer History</h3>
              </div>
              <div className="flex flex-col gap-3">
                {transfers.length > 0 ? (
                  transfers.map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white/[0.03] p-3.5 rounded-xl border border-white/5 hover:border-white/10 transition-all">
                      <div>
                        <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider">Season {t.season_year}</p>
                        <p className="text-xs text-white font-semibold mt-0.5">{t.from_club_name} ➔ {t.to_club_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-primary font-bold uppercase">{t.type}</p>
                        <p className="text-sm text-orange-400 font-bold font-mono">
                          {t.fee > 0 ? `€${(t.fee / 1000000).toFixed(1)}M` : 'Free'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-on-surface-variant/50 py-4 text-sm">
                    No transfer records.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
