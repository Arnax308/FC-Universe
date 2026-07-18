import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';

export default function Players() {
  const { career, searchQuery } = useOutletContext();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [genderFilter, setGenderFilter] = useState(0); // 0 = Men, 1 = Women
  const [myClubFilter, setMyClubFilter] = useState(true); // Default to My Squad

  useEffect(() => {
    if (career && career.id) {
      setLoading(true);
      const url = searchQuery 
        ? `/api/careers/${career.id}/players?limit=200&gender=${genderFilter}&my_club=${myClubFilter}&search=${encodeURIComponent(searchQuery)}`
        : `/api/careers/${career.id}/players?limit=200&gender=${genderFilter}&my_club=${myClubFilter}`;
        
      // Add a slight debounce if searchQuery exists
      const timer = setTimeout(() => {
        fetch(url)
          .then(res => res.json())
          .then(data => {
            setPlayers(data);
            setLoading(false);
          })
          .catch(err => {
            console.error("Failed to fetch players:", err);
            setLoading(false);
          });
      }, searchQuery ? 300 : 0);
      
      return () => clearTimeout(timer);
    }
  }, [career, searchQuery, genderFilter, myClubFilter]);

  const getMinifaceUrl = (gameId) => {
    if (!gameId) return null;
    return `/api/images/player/${gameId}?v=2`;
  };

  if (!career) {
    return <div className="p-8 text-on-surface">Please load a career first.</div>;
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-headline-md text-on-surface mb-2 tracking-tight">Players Database</h1>
          <p className="text-body-lg text-on-surface-variant">
            {myClubFilter ? `Showing squad roster for ${career.team_name || "your club"}.` : `Showing top players in the ${career.name} universe.`}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 self-start lg:self-auto">
          {/* Squad Toggle */}
          <div className="flex bg-surface-container-high/40 p-1.5 rounded-full border border-white/5 backdrop-blur-md">
            <button 
              onClick={() => setMyClubFilter(true)}
              className={`px-5 py-2 rounded-full text-label-caps font-label-caps transition-all duration-300 ${myClubFilter ? 'bg-secondary text-on-secondary shadow-lg font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              My Squad
            </button>
            <button 
              onClick={() => setMyClubFilter(false)}
              className={`px-5 py-2 rounded-full text-label-caps font-label-caps transition-all duration-300 ${!myClubFilter ? 'bg-secondary text-on-secondary shadow-lg font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              All Players
            </button>
          </div>

          {/* Gender Tabs */}
          <div className="flex bg-surface-container-high/40 p-1.5 rounded-full border border-white/5 backdrop-blur-md">
            <button 
              onClick={() => setGenderFilter(0)}
              className={`px-6 py-2 rounded-full text-label-caps font-label-caps transition-all duration-300 ${genderFilter === 0 ? 'bg-primary text-on-primary shadow-[0_4px_12px_rgba(78,222,163,0.25)] font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Men
            </button>
            <button 
              onClick={() => setGenderFilter(1)}
              className={`px-6 py-2 rounded-full text-label-caps font-label-caps transition-all duration-300 ${genderFilter === 1 ? 'bg-primary text-on-primary shadow-[0_4px_12px_rgba(78,222,163,0.25)] font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Women
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-on-surface-variant text-label-caps font-label-caps">Loading Database...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map(player => (
            <Link to={`/players/${player.id}`} key={player.id} className="block group">
              <div className="bg-surface-container/60 backdrop-blur-2xl border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/5 transition-all cursor-pointer h-full border border-transparent group-hover:border-primary/30 group-hover:shadow-[0_0_15px_rgba(78,222,163,0.1)]">
                <div className="relative">
                  <img
                    src={getMinifaceUrl(player.game_id)}
                    alt={player.known_name || player.last_name}
                    className="w-16 h-16 object-cover rounded-full bg-surface-container/50 border border-white/10"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden w-16 h-16 rounded-full bg-surface-container/50 border border-white/10 items-center justify-center text-on-surface-variant absolute top-0 left-0 z-0">
                    <span className="material-symbols-outlined text-3xl">person</span>
                  </div>
                  {player.overall && (
                    <div className="absolute -bottom-2 -right-2 bg-primary text-on-primary text-xs font-bold px-1.5 py-0.5 rounded shadow-lg border border-primary-fixed-dim">
                      {player.overall}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-on-surface font-headline-md text-body-lg truncate">
                        {player.known_name || `${player.first_name || ''} ${player.last_name || ''}`}
                      </h3>
                      {player.game_id >= 270000 && (
                        <span className="bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5 rounded-full border border-primary/20 whitespace-nowrap self-center">
                          Youth
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-on-surface-variant text-label-caps font-label-caps mt-0.5 items-center">
                      {player.position && <span className="bg-white/5 px-2 py-0.5 rounded text-[10px]">{player.position}</span>}
                      {player.potential && <span className="text-tertiary font-bold">POT {player.potential}</span>}
                      {player.club_name && <span className="text-secondary font-bold">• {player.club_name}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-on-surface-variant group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined">chevron_right</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
