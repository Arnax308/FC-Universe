import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';

export default function Transfers() {
  const { career } = useOutletContext();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (career && career.id) {
      setLoading(true);
      fetch(`/api/careers/${career.id}/transfers?limit=150`)
        .then(res => res.json())
        .then(data => {
          setTransfers(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to fetch transfers:", err);
          setLoading(false);
        });
    }
  }, [career]);

  const getMinifaceUrl = (gameId) => {
    if (!gameId) return null;
    return `/api/images/player/${gameId}?v=2`;
  };

  const getLogoUrl = (gameId) => {
    if (!gameId) return null;
    return `/api/images/club/${gameId}?v=2`;
  };

  if (!career) {
    return <div className="p-8 text-on-surface">Please load a career first.</div>;
  }

  const getTypeStyle = (type) => {
    switch (type) {
      case 'buy':
        return 'bg-primary/10 border-primary/20 text-primary';
      case 'loan':
        return 'bg-secondary-container/10 border-secondary-container/20 text-secondary';
      case 'free':
        return 'bg-tertiary/10 border-tertiary/20 text-tertiary';
      case 'release':
        return 'bg-error/10 border-error/20 text-error';
      default:
        return 'bg-white/5 border-white/10 text-on-surface-variant';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'buy': return 'Transfer';
      case 'loan': return 'Loan';
      case 'free': return 'Free Agent';
      case 'release': return 'Released';
      default: return type || 'Transfer';
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-headline-lg font-headline-md text-on-surface mb-2 tracking-tight">Transfers Registry</h1>
        <p className="text-body-lg text-on-surface-variant">Player moves, loan spells, and free signings in the {career.name} universe.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-on-surface-variant text-label-caps font-label-caps">Loading transfers history...</p>
          </div>
        </div>
      ) : transfers.length === 0 ? (
        <div className="glass-panel border border-white/5 rounded-2xl p-12 text-center max-w-2xl mx-auto">
          <span className="material-symbols-outlined text-on-surface-variant text-6xl mb-4">swap_horiz</span>
          <h3 className="text-body-lg font-headline-md font-bold text-on-surface mb-2">No Transfers Recorded</h3>
          <p className="text-body-md text-on-surface-variant/80">Transfers are automatically detected and archived as you advance your Career Mode and re-import save updates.</p>
        </div>
      ) : (
        <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-label-caps font-label-caps text-on-surface-variant text-xs tracking-wider">
                  <th className="py-4 px-6 font-bold">Player</th>
                  <th className="py-4 px-6 font-bold">From</th>
                  <th className="py-4 px-6 font-bold text-center"></th>
                  <th className="py-4 px-6 font-bold">To</th>
                  <th className="py-4 px-6 font-bold text-center">Deal</th>
                  <th className="py-4 px-6 font-bold text-right">Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transfers.map((trans) => (
                  <tr key={trans.id} className="hover:bg-white/5 transition-colors group">
                    {/* Player column */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container border border-white/10 flex-shrink-0 flex items-center justify-center relative">
                          {trans.player_game_id >= 270000 ? (
                            <span className="material-symbols-outlined text-on-surface-variant text-lg">person</span>
                          ) : (
                            <img
                              src={getMinifaceUrl(trans.player_game_id)}
                              alt={trans.player_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          )}
                          <span className="hidden material-symbols-outlined text-on-surface-variant text-lg absolute inset-0 items-center justify-center bg-surface-container z-0">person</span>
                        </div>
                        <div className="min-w-0">
                          <Link to={`/players/${trans.player_id}`} className="text-body-md font-bold text-on-surface hover:text-primary transition-colors block truncate">
                            {trans.player_name}
                          </Link>
                          {trans.player_game_id >= 270000 && (
                            <span className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded border border-primary/20 mt-0.5 inline-block">Youth Academy</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* From Club column */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center p-0.5 flex-shrink-0 bg-surface-container/50 border border-white/5 rounded-full overflow-hidden">
                          {trans.from_club_game_id ? (
                            <img
                              src={getLogoUrl(trans.from_club_game_id)}
                              alt={trans.from_club_name}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                          ) : null}
                          <span className="material-symbols-outlined text-on-surface-variant text-sm hidden">shield</span>
                        </div>
                        <span className="text-body-md text-on-surface truncate max-w-[150px]">{trans.from_club_name || "Unknown Club"}</span>
                      </div>
                    </td>

                    {/* Arrow connector */}
                    <td className="py-4 px-6 text-center text-on-surface-variant/40 group-hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-lg">arrow_right_alt</span>
                    </td>

                    {/* To Club column */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 flex items-center justify-center p-0.5 flex-shrink-0 bg-surface-container/50 border border-white/5 rounded-full overflow-hidden">
                          {trans.to_club_game_id ? (
                            <img
                              src={getLogoUrl(trans.to_club_game_id)}
                              alt={trans.to_club_name}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                          ) : null}
                          <span className="material-symbols-outlined text-on-surface-variant text-sm hidden">shield</span>
                        </div>
                        <span className="text-body-md text-on-surface truncate max-w-[150px]">{trans.to_club_name || "Unknown Club"}</span>
                      </div>
                    </td>

                    {/* Deal Type Badge column */}
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getTypeStyle(trans.type)}`}>
                        {getTypeLabel(trans.type)}
                      </span>
                    </td>

                    {/* Fee column */}
                    <td className="py-4 px-6 text-right font-data-mono text-body-md text-on-surface font-semibold">
                      {trans.type === 'buy' ? '€0' : (trans.type === 'loan' ? 'Loan' : 'Free')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
