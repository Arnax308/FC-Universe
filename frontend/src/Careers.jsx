import { useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { apiDelete, apiPost, qs, unwrap, useApi } from './lib/api'
import { ThemeScope, PitchLines } from './components/broadcast'
import { ClubCrest } from './components/media'
import { Async, EmptyState, Icon, PageHeader, SectionBanner, StatTile } from './components/ui'
import Modal from './components/Modal'

function KeepButton({ career, onKeep, busy }) {
  const kept = Boolean(career.is_preserved)
  return (
    <button
      type="button"
      onClick={() => onKeep(career, !kept)}
      disabled={busy}
      aria-pressed={kept}
      title={kept ? 'Kept forever — click to stop keeping it' : 'Keep forever, even if the save is deleted'}
      className={`flex items-center gap-1 rounded-lg px-3 font-head text-sm font-black uppercase italic ring-1 transition disabled:opacity-50 ${
        kept ? 'bg-flood text-night ring-flood' : 'bg-night-700 text-chalk-dim ring-white/10 hover:bg-night-600 hover:text-chalk'
      }`}
    >
      <Icon name="all_inclusive" className="text-xl" />
      <span className="hidden sm:inline">{kept ? 'Kept' : 'Keep'}</span>
    </button>
  )
}

function UniverseCard({ career, active, onSelect, onSync, onKeep, onRemove, syncing, busy }) {
  const orphaned = career.save_exists === false
  return (
    <ThemeScope club={career.team} className="h-full">
      <article className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border-2 bg-night-800 transition hover:-translate-y-1 ${active ? 'border-flood shadow-[0_0_0_4px_rgb(var(--flood)/.25)]' : 'border-club-1/60'}`}>
        <div className="stripes relative h-32">
          <div className="absolute inset-0 bg-gradient-to-t from-night-800 via-night-800/40 to-transparent" />
          <span className="absolute left-4 top-3 rounded bg-black/70 px-2 py-0.5 font-display text-lg">{career.current_season || '—'}</span>
          {active && <span className="absolute right-3 top-3 rounded bg-flood px-2 py-0.5 font-head text-sm font-black uppercase italic text-night">On air</span>}
          {!active && career.is_preserved && (
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded bg-black/70 px-2 py-0.5 font-head text-sm font-black uppercase italic text-flood">
              <Icon name="all_inclusive" className="text-base" /> Kept forever
            </span>
          )}
          <ClubCrest club={career.team} gameId={career.team_id} name={career.team_name} className="absolute -bottom-8 left-4 h-20 w-20" />
        </div>
        {orphaned && !career.is_preserved && (
          <div role="status" className="mx-4 mt-10 rounded-lg border-2 border-dashed border-derby bg-derby/15 p-3 text-sm">
            <p className="font-head font-black uppercase italic text-derby">Save deleted in FC 26</p>
            <p className="mt-1 text-chalk-dim">This universe’s save is gone. Keep its history forever, or remove it.</p>
            <div className="mt-2 flex gap-2">
              <button type="button" disabled={busy} onClick={() => onKeep(career, true)} className="rounded bg-flood px-3 py-1 font-head text-sm font-black uppercase italic text-night disabled:opacity-50">Keep forever</button>
              <button type="button" disabled={busy} onClick={() => onRemove(career)} className="rounded bg-night-600 px-3 py-1 font-head text-sm font-black uppercase italic ring-1 ring-white/10 hover:bg-derby disabled:opacity-50">Remove</button>
            </div>
          </div>
        )}
        <div className={`flex flex-1 flex-col px-4 pb-4 ${orphaned && !career.is_preserved ? 'pt-4' : 'pt-10'}`}>
          <h3 className="text-3xl leading-none">{career.name}</h3>
          {orphaned && career.is_preserved && <p className="label mt-1 text-chalk-dim">Save deleted · history kept</p>}
          <p className="mt-1 font-semibold text-club-1">{career.team_name || 'Unknown club'}</p>
          <p className="text-sm text-chalk-dim">Manager · {career.manager_name || '—'}</p>
          <dl className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white/5 p-2">
              <dt className="label">Seasons</dt>
              <dd className="num text-2xl">{career.seasons_count || 0}</dd>
            </div>
            <div className="rounded-lg bg-white/5 p-2">
              <dt className="label">Trophies</dt>
              <dd className="num flex items-center gap-1 text-2xl text-flood"><Icon name="trophy" fill className="text-xl" />{career.trophies_count || 0}</dd>
            </div>
          </dl>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => onSelect(career)}
              disabled={active}
              className="flex-1 rounded-lg bg-club-1 px-3 py-2 font-head text-base font-black uppercase italic text-club-ink transition hover:brightness-110 disabled:bg-flood disabled:text-night"
            >
              {active ? 'Active universe' : 'Enter universe'}
            </button>
            <KeepButton career={career} onKeep={onKeep} busy={busy} />
            {career.save_file_path && !orphaned && (
              <button
                type="button"
                onClick={() => onSync(career.save_file_path)}
                disabled={syncing}
                aria-label={`Re-sync ${career.name} from save file`}
                title="Re-sync from save file"
                className="rounded-lg bg-night-700 px-3 ring-1 ring-white/10 hover:bg-night-600 disabled:opacity-50"
              >
                <Icon name="sync" className={`text-xl ${syncing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </article>
    </ThemeScope>
  )
}

export default function Careers() {
  const { career, careers, refreshCareers, selectCareer, setImporting, importing } = useOutletContext()
  const [modalOpen, setModalOpen] = useState(false)
  const [status, setStatus] = useState(null)
  const [manualPath, setManualPath] = useState('')
  const [savesVersion, setSavesVersion] = useState(0)
  const saves = useApi(modalOpen ? `/careers/local-saves?v=${savesVersion}` : null, { select: unwrap })
  const summary = useApi(career ? `/careers/${career.id}/summary` : null, { select: unwrap })

  const [busy, setBusy] = useState(false)

  const keepCareer = (c, keep) => {
    setBusy(true)
    apiPost(`/careers/${c.id}/preserve${qs({ keep })}`)
      .then(() => {
        setStatus({ kind: 'ok', text: keep ? `“${c.name}” will be kept forever.` : `“${c.name}” will be removed once its save is deleted.` })
        return refreshCareers(career?.id)
      })
      .catch((err) => setStatus({ kind: 'error', text: err.message }))
      .finally(() => setBusy(false))
  }

  const removeCareer = (c) => {
    if (!window.confirm(`Remove “${c.name}” and its whole history from FC Universe? Your FC 26 save files are not touched.`)) return
    setBusy(true)
    apiDelete(`/careers/${c.id}`)
      .then(() => {
        setStatus({ kind: 'ok', text: `Removed “${c.name}”.` })
        return refreshCareers(c.id === career?.id ? null : career?.id)
      })
      .catch((err) => setStatus({ kind: 'error', text: err.message }))
      .finally(() => setBusy(false))
  }

  const syncAll = () => {
    if (importing) return
    setImporting('Syncing saves…')
    setStatus({ kind: 'busy', text: 'Checking the FC 26 save folder for new and updated careers…' })
    apiPost('/careers/sync')
      .then((body) => {
        const { synced = [], removed = [], failed = [] } = body.data || {}
        const parts = [
          synced.length ? `Synced ${synced.join(', ')}` : 'Everything was already up to date',
          removed.length ? `removed ${removed.length} career${removed.length > 1 ? 's' : ''} whose save is gone` : null,
          failed.length ? `${failed.length} save${failed.length > 1 ? 's' : ''} couldn’t be read` : null,
        ].filter(Boolean)
        setStatus({ kind: failed.length ? 'error' : 'ok', text: `${parts.join(' · ')}.` })
        return refreshCareers(career?.id)
      })
      .catch((err) => setStatus({ kind: 'error', text: err.message }))
      .finally(() => setImporting(null))
  }

  const runImport = (path) => {
    if (!path || importing) return
    setImporting('Syncing save…')
    setStatus({ kind: 'busy', text: 'Reading the save file and rebuilding this universe…' })
    apiPost(`/import${qs({ file_path: path })}`)
      .then((body) => {
        setStatus({ kind: 'ok', text: `Synced “${body.data.name}”.` })
        setSavesVersion((v) => v + 1)
        return refreshCareers(body.data.career_id)
      })
      .catch((err) => setStatus({ kind: 'error', text: err.message }))
      .finally(() => setImporting(null))
  }

  return (
    <div>
      <PageHeader kicker="Career mode multiverse" title="Choose your universe" accent="club">
        <p className="max-w-2xl text-lg text-chalk-dim">
          Every Career Mode save is its own football world — its own champions, transfers and legends.
        </p>
      </PageHeader>

      {status && (
        <div role="status" className={`mb-6 flex items-center gap-3 rounded-lg px-4 py-3 font-semibold ${status.kind === 'error' ? 'bg-derby' : status.kind === 'ok' ? 'bg-pitch text-night' : 'bg-flood text-night'}`}>
          <Icon name={status.kind === 'error' ? 'error' : status.kind === 'ok' ? 'check_circle' : 'sync'} className={status.kind === 'busy' ? 'animate-spin' : ''} />
          {status.text}
        </div>
      )}

      {career && (
        <section className="mb-10">
          <SectionBanner title="Now showing" kicker={career.name} color="club" />
          <div className="relative overflow-hidden rounded-2xl border-2 border-club-1 bg-night-800">
            <div className="grass absolute inset-0 opacity-50" aria-hidden="true" />
            <PitchLines />
            <div className="relative grid gap-4 p-5 md:grid-cols-[auto_1fr] md:items-center">
              <ClubCrest club={career.team} gameId={career.team_id} name={career.team_name} className="h-28 w-28" />
              <div>
                <div className="font-display text-giant uppercase leading-none">{career.team_name}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="chip bg-chalk text-night">{career.manager_name}</span>
                  <span className="chip bg-black/60">{career.current_season}</span>
                  <Link to="/career" className="chip bg-flood text-night hover:brightness-110">Legacy hub <Icon name="arrow_forward" className="text-base" /></Link>
                </div>
              </div>
            </div>
          </div>
          {summary.data && (
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <StatTile label="Clubs" value={summary.data.clubs?.toLocaleString()} icon="shield" color="cyan" />
              <StatTile label="Active players" value={summary.data.players?.toLocaleString()} icon="groups" color="pitch" />
              <StatTile label="Transfers logged" value={summary.data.transfers?.toLocaleString()} icon="swap_horiz" color="tangerine" />
              <StatTile label="Timeline events" value={summary.data.events?.toLocaleString()} icon="history" color="violet" />
            </div>
          )}
        </section>
      )}

      <SectionBanner
        title="All universes"
        kicker={`${careers.length} saves`}
        color="flood"
        right={(
          <button
            type="button"
            onClick={syncAll}
            disabled={Boolean(importing)}
            className="flex items-center gap-2 rounded-lg bg-night-700 px-4 py-2 font-head text-sm font-black uppercase italic ring-1 ring-white/10 hover:bg-night-600 disabled:opacity-50"
          >
            <Icon name="sync" className={`text-lg ${importing ? 'animate-spin' : ''}`} /> Sync all saves
          </button>
        )}
      />
      <p className="-mt-2 mb-5 max-w-3xl text-sm text-chalk-dim">
        A universe lives as long as its FC 26 save. Tap <Icon name="all_inclusive" className="align-middle text-base text-flood" /> <span className="font-semibold text-chalk">Keep</span> to hold on to its history forever, even after you delete the save.
      </p>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {careers.map((c, i) => (
          <div key={c.id} className="animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
            <UniverseCard
              career={c}
              active={c.id === career?.id}
              onSelect={selectCareer}
              onSync={runImport}
              onKeep={keepCareer}
              onRemove={removeCareer}
              syncing={Boolean(importing)}
              busy={busy}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="group flex min-h-72 flex-col items-center justify-center gap-3 rounded-2xl border-4 border-dashed border-flood/60 bg-night-800/60 p-6 transition hover:border-flood hover:bg-flood/10"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-flood text-night transition group-hover:rotate-90">
            <Icon name="add" className="text-4xl" />
          </span>
          <span className="font-head text-2xl font-black uppercase italic">Import a save</span>
          <span className="text-sm text-chalk-dim">Pick up a new Career Mode universe</span>
        </button>
      </div>
      {careers.length === 0 && (
        <div className="mt-6">
          <EmptyState icon="stadium" title="The stadium is empty">Import a Career Mode save to kick things off.</EmptyState>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Deadline day: import a save"
        banner={<div className="hazard flex h-9 items-center px-4"><span className="bg-night px-2 font-head text-sm font-black uppercase italic text-flood">Breaking · save detected</span></div>}
      >
        <Async state={saves} loadingLabel="Scanning save folder">
          {(list) => (
            list.length ? (
              <ul className="space-y-2">
                {list.map((s) => (
                  <li key={s.path} className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
                    <Icon name="sd_card" className="text-2xl text-cyan" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-head text-lg font-extrabold uppercase italic">{s.name}</div>
                      <div className="truncate text-xs text-chalk-dim">{s.filename} · {new Date(s.modified_at).toLocaleString()}</div>
                    </div>
                    <button
                      type="button"
                      disabled={Boolean(importing)}
                      onClick={() => runImport(s.path)}
                      className={`rounded-lg px-3 py-2 font-head text-sm font-black uppercase italic disabled:opacity-50 ${s.imported ? 'bg-night-600' : 'bg-flood text-night'}`}
                    >
                      {s.imported ? 'Re-sync' : 'Import'}
                    </button>
                  </li>
                ))}
              </ul>
            ) : <EmptyState icon="folder_off" title="No saves found">Couldn’t find any CmMgrC career saves in your EA FC 26 settings folder.</EmptyState>
          )}
        </Async>
        <form
          className="mt-5 border-t border-white/10 pt-4"
          onSubmit={(e) => { e.preventDefault(); runImport(manualPath.trim()) }}
        >
          <label htmlFor="manual-path" className="label">Or paste a save path</label>
          <div className="mt-2 flex gap-2">
            <input
              id="manual-path"
              value={manualPath}
              onChange={(e) => setManualPath(e.target.value)}
              placeholder="C:\\Users\\…\\EA SPORTS FC 26\\settings\\CmMgrC…"
              className="min-w-0 flex-1 rounded-lg bg-night px-3 py-2 ring-1 ring-white/15 placeholder:text-chalk-dim/60"
            />
            <button type="submit" disabled={!manualPath.trim() || Boolean(importing)} className="rounded-lg bg-pitch px-4 font-head font-black uppercase italic text-night disabled:opacity-50">Go</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
