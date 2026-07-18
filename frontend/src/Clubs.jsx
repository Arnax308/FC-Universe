import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';

export default function Clubs() {
  const { career } = useOutletContext();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (career && career.id) {
      setLoading(true);
      fetch(`/api/careers/${career.id}/clubs?limit=100`)
        .then(res => res.json())
        .then(data => {
          setClubs(data);
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
    return <div className="p-8 text-on-surface">Please load a career first.</div>;
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-headline-lg font-headline-md text-on-surface mb-2 tracking-tight">Clubs Directory</h1>
        <p className="text-body-lg text-on-surface-variant">Football clubs in the {career.name} universe.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-on-surface-variant text-label-caps font-label-caps">Loading Database...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-gutter">
          {clubs.map(club => (
            <div key={club.id} className="relative bg-surface-container/60 backdrop-blur-2xl border border-white/5 rounded-2xl p-6 flex flex-col items-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-white/20 group overflow-hidden">
              {/* Subtle top light effect */}
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              
              <div className="w-20 h-20 mb-4 relative z-10 flex items-center justify-center">
                <img 
                  src={getLogoUrl(club.game_id)} 
                  alt={club.name}
                  className="w-full h-full object-contain drop-shadow-xl"
                  onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                />
                <span className="material-symbols-outlined text-on-surface-variant text-4xl hidden">shield</span>
              </div>
              <h3 className="text-body-lg font-headline-md font-bold text-on-surface text-center leading-tight">{club.name}</h3>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
