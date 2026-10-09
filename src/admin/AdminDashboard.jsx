import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Upload, Plus, ArrowUp, ArrowDown, LogOut, X, DatabaseBackup, Download, RotateCcw, Images, MessageSquareQuote, Layers, Inbox, ExternalLink, ChevronDown, Check, AlertCircle, Clock, Save, Building2, UserRound, FileText, UploadCloud } from 'lucide-react';
import { api, getToken, setToken, uploadImageWithStats, uploadImage, deleteMedia, tokenExpiry, goToLogin } from '../utils/api';
import DropZone from '../components/DropZone';
import { useContent } from '../context/ContentContext';
import './Admin.css';

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const TABS = [
  { id: 'Gallery', icon: Images, title: 'Gallery', sub: 'Upload work and fill in the project details visitors see when they open an image.' },
  { id: 'Clients', icon: Building2, title: 'Clients', sub: 'Upload client logos. They glide across the Clients page, six to a row.' },
  { id: 'Profile', icon: UserRound, title: 'Profile', sub: 'Your photo, details and works, shown at the bottom of the Careers page.' },
  { id: 'Reviews', icon: MessageSquareQuote, title: 'Reviews', sub: 'What clients say. Shown on the Home and Clients pages.' },
  { id: 'Services', icon: Layers, title: 'Services', sub: 'Edit the services, their descriptions and photos.' },
  { id: 'Enquiries', icon: Inbox, title: 'Inbox', sub: 'Messages from the Contact page and job applications from the Careers page.' },
  { id: 'Backups', icon: DatabaseBackup, title: 'Backups', sub: 'Snapshots of your content, taken daily.' },
];
const ICON_FOR = Object.fromEntries(TABS.map((t) => [t.id, t.icon]));

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { refresh } = useContent();
  const [ready, setReady] = useState(false);
  const [warn, setWarn] = useState(false);
  const [tab, setTab] = useState('Gallery');
  const [toast, setToast] = useState(null);
  const [left, setLeft] = useState(null);

  useEffect(() => {
    document.title = 'Admin';
    api('/api/login')
      .then((d) => { setWarn(d.usingDefaults); setReady(true); })
      .catch(() => { setToken(''); navigate('/admin/login', { replace: true }); });
  }, [navigate]);

  // Auto-logout: counts down to the session end, then signs out.
  useEffect(() => {
    const exp = tokenExpiry();
    if (!exp) return undefined;
    const tick = () => {
      const ms = exp - Date.now();
      if (ms <= 0) goToLogin(true); else setLeft(ms);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [ready]);

  const say = (text, ok = true) => {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 3500);
  };
  const save = async (payload, msg = 'Saved ✓') => {
    try { await api('/api/content', { method: 'PUT', body: payload }); await refresh(); say(msg); return true; }
    catch (e) { say(e.message, false); return false; }
  };
  const logout = () => goToLogin(false);
  const { gallery, reviews, clients } = useContent();
  const current = TABS.find((t) => t.id === tab);
  const counts = { Gallery: gallery.length, Clients: clients.length, Reviews: reviews.length };

  if (!ready) return <div className="adm-loading"><p>Checking sign-in…</p></div>;

  const timer = left !== null && (
    <span className={`adm-pill${left > 5 * 60000 ? ' adm-pill--ok' : ''}`} title="You are signed out automatically when this reaches zero">
      <Clock size={13} aria-hidden="true" />
      Auto logout in {String(Math.floor(left / 60000)).padStart(2, '0')}:{String(Math.floor(left / 1000) % 60).padStart(2, '0')}
    </span>
  );

  return (
    <div className="adm-shell">
      <aside className="adm-side" aria-label="Admin navigation">
        <div className="adm-side__brand"><img src="/logo/logo.png" alt="AD ZONEX" /><span>Admin</span></div>
        <nav className="adm-nav">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} type="button" className={`adm-nav__item${tab === t.id ? ' is-on' : ''}`} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
                <Icon size={19} aria-hidden="true" />
                <span>{t.title}</span>
                {counts[t.id] !== undefined && <span className="adm-nav__count">{counts[t.id]}</span>}
              </button>
            );
          })}
        </nav>
        <div className="adm-side__foot">
          {timer}
          <Link to="/" className="adm-btn"><ExternalLink size={16} aria-hidden="true" /> View website</Link>
          <button type="button" className="adm-btn" onClick={logout}><LogOut size={16} aria-hidden="true" /> Log out</button>
        </div>
      </aside>

      <div className="adm-content">
        <header className="adm-topbar">
          <img className="adm-topbar__mlogo" src="/logo/logo.png" alt="AD ZONEX" />
          <div className="adm-topbar__titles">
            <h1>{current.title}</h1>
            <p>{current.sub}</p>
          </div>
          <span className="adm-spacer" />
          <div className="adm-topbar__actions">
            <Link to="/" className="adm-btn adm-btn--icon" aria-label="View website"><ExternalLink size={17} /></Link>
            <button type="button" className="adm-btn adm-btn--icon" onClick={logout} aria-label="Log out"><LogOut size={17} /></button>
          </div>
        </header>

        {warn && (
          <div className="adm-warn" role="alert">
            You are still using the <b>example ID / password / key</b>. Change them in
            <code> server/lib/admin-config.mjs </code> (make a new key with <code>npm run gen-key</code>), then restart.
          </div>
        )}

        <main className="adm-main" key={tab}>
          {tab === 'Gallery' && <GalleryTab save={save} say={say} />}
          {tab === 'Clients' && <ClientsTab save={save} say={say} />}
          {tab === 'Profile' && <ProfileTab save={save} say={say} />}
          {tab === 'Reviews' && <ReviewsTab save={save} />}
          {tab === 'Services' && <ServicesTab save={save} say={say} />}
          {tab === 'Enquiries' && <EnquiriesTab say={say} />}
          {tab === 'Backups' && <BackupsTab say={say} />}
        </main>
      </div>

      <nav className="adm-bottomnav" aria-label="Admin sections">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} type="button" className={tab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
              <Icon size={21} aria-hidden="true" /><span>{t.title}</span>
            </button>
          );
        })}
      </nav>

      {toast && (
        <div className={`adm-toast${toast.ok ? '' : ' adm-toast--bad'}`} role="status" aria-live="polite">
          {toast.ok ? <Check size={17} aria-hidden="true" /> : <AlertCircle size={17} aria-hidden="true" />}{toast.text}
        </div>
      )}
    </div>
  );
}

const mb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Uploads many images (each compressed first). Returns the urls plus a "saved 3.2 MB → 410 KB" summary. */
async function uploadMany(files, onEach) {
  let before = 0; let after = 0; const out = [];
  for (const f of files) {
    const r = await uploadImageWithStats(f);
    before += r.before; after += r.after;
    out.push(r.url);
    onEach?.(r.url, f);
  }
  return { urls: out, note: before > after ? ` (compressed ${mb(before)} → ${mb(after)})` : '' };
}

/* ───────────────────────── Gallery ───────────────────────── */
function GalleryTab({ save, say }) {
  const { gallery, sessions } = useContent();
  const [cat, setCat] = useState(sessions[0].id);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const upload = async (files) => {
    if (!files.length) return;
    setBusy(true);
    try {
      const added = [];
      const { note } = await uploadMany(files, (image, f) => {
        added.push({ id: uid(), image, category: cat, title: title.trim() || f.name.replace(/\.[^.]+$/, '') });
      });
      await save({ gallery: [...added, ...gallery] }, `${added.length} image(s) added to gallery ✓${note}`);
      setTitle('');
    } catch (err) { say(err.message, false); }
    setBusy(false);
  };

  const update = (id, patch) => save({ gallery: gallery.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
  const remove = async (g) => {
    if (!window.confirm(`Delete "${g.title}" from the gallery?`)) return;
    if (await save({ gallery: gallery.filter((x) => x.id !== g.id) }, 'Deleted ✓')) deleteMedia(g.image);
  };

  const [filter, setFilter] = useState('all');
  const shown = filter === 'all' ? gallery : gallery.filter((g) => g.category === filter);

  return (
    <section>
      <div className="adm-card adm-upload">
        <h2>Upload to gallery</h2>
        <p className="adm-card__sub">Pick a category and an optional title, then drag images onto the box below (or click it). Photos are compressed automatically.</p>
        <div className="adm-row">
          <label>Category
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <label className="adm-grow">Title (optional)
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Shop front ACP board" />
          </label>
        </div>
        <DropZone accept="image/*" multiple disabled={busy} onFiles={upload} onReject={() => say('Only image files can be uploaded here.', false)} className="adm-drop">
          <UploadCloud size={30} aria-hidden="true" />
          <span><strong>{busy ? 'Compressing and uploading…' : 'Drag images here'}</strong>{busy ? '' : ' or click to choose'}</span>
          <small>JPG, PNG or WebP. You can drop many at once.</small>
        </DropZone>
      </div>

      <div className="adm-toolbar">
        <div className="adm-chips" role="group" aria-label="Filter by category">
          <button type="button" className={`adm-chip${filter === 'all' ? ' is-on' : ''}`} onClick={() => setFilter('all')}>All <small>{gallery.length}</small></button>
          {sessions.map((s) => (
            <button key={s.id} type="button" className={`adm-chip${filter === s.id ? ' is-on' : ''}`} onClick={() => setFilter(s.id)}>
              {s.label} <small>{gallery.filter((g) => g.category === s.id).length}</small>
            </button>
          ))}
        </div>
        <p className="adm-muted">Changes appear on the public Gallery page immediately.</p>
      </div>

      {!shown.length && <p className="adm-empty">No images in this category yet.</p>}
      <div className="adm-grid">
        {shown.map((g) => <GalleryItem key={g.id} g={g} sessions={sessions} onSave={update} onDelete={remove} say={say} />)}
      </div>
    </section>
  );
}

const joinList = (v) => (Array.isArray(v) ? v.join(', ') : String(v || ''));
const splitList = (v) => String(v || '').split(/[\n,]/).map((x) => x.trim()).filter(Boolean);

/** Saves a picture to the computer, named after its title (works for every image the admin shows). */
async function downloadImage(url, title) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not download that image.');
  const blob = await res.blob();
  const ext = ({ 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/svg+xml': 'svg' })[blob.type] || (url.split('.').pop().split('?')[0] || 'jpg');
  const name = `${String(title || 'image').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'image'}.${ext}`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// What is stored vs what is typed: compare the cleaned-up forms so "A,B" and "A, B" count as the same.
const cleanItem = (v) => ({
  title: String(v.title ?? '').trim(), category: v.category,
  client: String(v.client ?? '').trim(), description: String(v.description ?? '').trim(),
  services: Array.isArray(v.services) ? v.services : splitList(v.services),
  tools: Array.isArray(v.tools) ? v.tools : splitList(v.tools),
});
const sameItem = (a, b) => JSON.stringify(cleanItem(a)) === JSON.stringify(cleanItem(b));

function GalleryItem({ g, sessions, onSave, onDelete, say }) {
  const fromG = (x) => ({ title: x.title, category: x.category, client: x.client || '', description: x.description || '', services: joinList(x.services), tools: joinList(x.tools) });
  const [f, setF] = useState(() => fromG(g));
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  // After a save (or any refresh) show exactly what is stored, so the button state is always honest.
  useEffect(() => { setF(fromG(g)); }, [g.title, g.category, g.client, g.description, JSON.stringify(g.services), JSON.stringify(g.tools)]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = !sameItem(f, g);
  const catLabel = sessions.find((s) => s.id === f.category)?.label || f.category;
  const hasDetails = !!(g.client || g.description || (g.services || []).length || (g.tools || []).length);

  const save = async () => {
    setBusy(true);
    await onSave(g.id, cleanItem(f));
    setBusy(false);
  };
  const download = async () => { try { await downloadImage(g.image, g.title); } catch (e) { say?.(e.message, false); } };

  return (
    <div className="adm-item">
      <div className="adm-item__media">
        <img src={g.image} alt={g.title} loading="lazy" decoding="async" />
        <span className="adm-item__badge">{catLabel}</span>
      </div>
      <div className="adm-item__body">
        <input value={f.title} onChange={(e) => set({ title: e.target.value })} aria-label="Title" />
        <select value={f.category} onChange={(e) => set({ category: e.target.value })} aria-label="Category">
          {sessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>

        <button type="button" className="adm-item__more" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <span>Project details {hasDetails ? '· filled in' : '· using defaults'}</span><ChevronDown size={16} aria-hidden="true" />
        </button>
        {open && (
          <div className="adm-item__details">
            <label>Company / client name
              <input value={f.client} onChange={(e) => set({ client: e.target.value })} placeholder="e.g. ARK Enclave" />
            </label>
            <label>Description
              <textarea value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="What you did for this client. A blank line starts a new paragraph." />
            </label>
            <label>Service provided
              <input value={f.services} onChange={(e) => set({ services: e.target.value })} placeholder="Logo Design, Flex Printing, ACP Board" />
            </label>
            <label>Tools used
              <input value={f.tools} onChange={(e) => set({ tools: e.target.value })} placeholder="Photoshop, Illustrator, CorelDRAW" />
            </label>
            <p className="adm-item__hint">Separate services and tools with commas. Leave a field empty to use the default.</p>
          </div>
        )}

        <div className="adm-actions">
          <button className={`adm-btn adm-btn--primary${dirty ? '' : ' is-saved'}`} disabled={!dirty || busy} onClick={save}>
            {dirty ? <Save size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />} {busy ? 'Saving…' : dirty ? 'Save' : 'Saved'}
          </button>
          <button className="adm-btn adm-btn--icon" onClick={download} aria-label={`Download ${g.title}`} title="Download image"><Download size={16} /></button>
          <button className="adm-btn adm-btn--danger adm-btn--icon" onClick={() => onDelete(g)} aria-label={`Delete ${g.title}`}><Trash2 size={16} /></button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Reviews ───────────────────────── */
function ReviewsTab({ save }) {
  const { reviews } = useContent();
  const [draft, setDraft] = useState({ quote: '', name: '', role: 'Customer' });

  const add = async () => {
    if (!draft.quote.trim() || !draft.name.trim()) return;
    if (await save({ reviews: [...reviews, { id: uid(), ...draft }] }, 'Review added ✓')) setDraft({ quote: '', name: '', role: 'Customer' });
  };

  return (
    <section>
      <div className="adm-card">
        <h2>Add a review</h2>
        <label>Review text
          <textarea rows={3} value={draft.quote} onChange={(e) => setDraft({ ...draft, quote: e.target.value })} />
        </label>
        <div className="adm-row">
          <label className="adm-grow">Customer name
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label className="adm-grow">Role / business
            <input value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
          </label>
          <button className="adm-btn adm-btn--primary" onClick={add}><Plus size={15} /> Add review</button>
        </div>
      </div>

      <div className="adm-list">
        {reviews.map((r) => (
          <ReviewItem key={r.id} r={r}
            onSave={(v) => save({ reviews: reviews.map((x) => (x.id === r.id ? { ...x, ...v } : x)) })}
            onDelete={() => window.confirm('Delete this review?') && save({ reviews: reviews.filter((x) => x.id !== r.id) }, 'Deleted ✓')} />
        ))}
        {!reviews.length && <p className="adm-empty">No reviews yet. Add the first one above.</p>}
      </div>
    </section>
  );
}

function ReviewItem({ r, onSave, onDelete }) {
  const [v, setV] = useState({ quote: r.quote, name: r.name, role: r.role });
  const dirty = v.quote !== r.quote || v.name !== r.name || v.role !== r.role;
  return (
    <div className="adm-card">
      <textarea rows={3} value={v.quote} onChange={(e) => setV({ ...v, quote: e.target.value })} />
      <div className="adm-row">
        <input className="adm-grow" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        <input className="adm-grow" value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })} />
        <button className="adm-btn adm-btn--primary" disabled={!dirty} onClick={() => onSave(v)}>Save</button>
        <button className="adm-btn adm-btn--danger adm-btn--icon" onClick={onDelete} aria-label="Delete review"><Trash2 size={16} /></button>
      </div>
    </div>
  );
}

/* ───────────────────────── Services ───────────────────────── */
function ServicesTab({ save, say }) {
  const { sessions } = useContent();
  const [cat, setCat] = useState(sessions[0].id);
  const session = sessions.find((s) => s.id === cat);
  const [list, setList] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setList(session.services.map((s) => ({ name: s.name, description: s.description || '', images: [...(s.images ?? (s.image ? [s.image] : []))] })));
    setDirty(false);
  }, [cat, session]);

  const edit = (i, patch) => { setList((l) => l.map((s, k) => (k === i ? { ...s, ...patch } : s))); setDirty(true); };
  const move = (i, d) => {
    const j = i + d; if (j < 0 || j >= list.length) return;
    const l = [...list]; [l[i], l[j]] = [l[j], l[i]]; setList(l); setDirty(true);
  };
  const del = (i) => { if (window.confirm(`Delete "${list[i].name}"?`)) { setList(list.filter((_, k) => k !== i)); setDirty(true); } };
  const add = () => { setList([...list, { name: 'New service', description: '', images: [] }]); setDirty(true); };
  const addImages = async (i, files) => {
    setBusy(true);
    try {
      const urls = [];
      for (const f of files) urls.push(await uploadImage(f));
      edit(i, { images: [...list[i].images, ...urls] });
    } catch (e) { say(e.message, false); }
    setBusy(false);
  };

  return (
    <section>
      <div className="adm-card">
        <div className="adm-row">
          <label>Category
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <span className="adm-grow" />
          <button className="adm-btn" onClick={add}><Plus size={15} /> Add service</button>
          <button className="adm-btn adm-btn--primary" disabled={!dirty || busy}
            onClick={async () => { if (await save({ services: { [cat]: list } }, 'Services saved ✓')) setDirty(false); }}>
            Save changes
          </button>
        </div>
        {dirty && <p className="adm-muted">You have unsaved changes.</p>}
      </div>

      {list.map((s, i) => (
        <div className="adm-card" key={i}>
          <div className="adm-row">
            <input className="adm-grow adm-title" value={s.name} onChange={(e) => edit(i, { name: e.target.value })} />
            <button className="adm-btn adm-btn--icon" onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp size={15} /></button>
            <button className="adm-btn adm-btn--icon" onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown size={15} /></button>
            <button className="adm-btn adm-btn--danger adm-btn--icon" onClick={() => del(i)} aria-label="Delete service"><Trash2 size={16} /></button>
          </div>
          <textarea rows={4} placeholder="Description" value={s.description} onChange={(e) => edit(i, { description: e.target.value })} />
          <div className="adm-thumbs">
            {s.images.map((src, k) => (
              <div className="adm-thumb" key={src + k}>
                <img src={src} alt="" />
                <button onClick={() => edit(i, { images: s.images.filter((_, x) => x !== k) })} aria-label="Remove image"><X size={13} /></button>
              </div>
            ))}
            <label className="adm-thumb adm-thumb--add">
              <Upload size={18} />
              <input type="file" accept="image/*" multiple hidden disabled={busy}
                onChange={(e) => { const f = [...e.target.files]; e.target.value = ''; if (f.length) addImages(i, f); }} />
            </label>
          </div>
        </div>
      ))}
    </section>
  );
}

/* ───────────────────────── Enquiries ───────────────────────── */
function EnquiriesTab({ say }) {
  const [view, setView] = useState('messages');
  return (
    <section>
      <div className="adm-chips" role="group" aria-label="Inbox" style={{ marginBottom: '1rem' }}>
        <button type="button" className={`adm-chip${view === 'messages' ? ' is-on' : ''}`} onClick={() => setView('messages')}>Contact messages</button>
        <button type="button" className={`adm-chip${view === 'applications' ? ' is-on' : ''}`} onClick={() => setView('applications')}>Job applications</button>
      </div>
      {view === 'messages' ? <MessagesList say={say} /> : <ApplicationsList say={say} />}
    </section>
  );
}

function ApplicationsList({ say }) {
  const [items, setItems] = useState(null);
  const load = () => api('/api/applications').then((d) => setItems(d.items)).catch((e) => say(e.message, false));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const download = async (a) => {
    try {
      const res = await fetch(`/api/applications?file=${encodeURIComponent(a.id)}`, { headers: { authorization: `Bearer ${getToken()}` } });
      if (!res.ok) throw new Error('Could not download that file.');
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement('a');
      link.href = url; link.download = a.fileName || 'cv'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) { say(e.message, false); }
  };
  const del = async (key) => {
    if (!window.confirm('Delete this application and its CV?')) return;
    await api(`/api/applications?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
    load();
  };

  if (!items) return <p className="adm-muted">Loading…</p>;
  return (
    <div className="adm-list">
      {items.map((a) => (
        <div className="adm-card adm-enq" key={a.key}>
          <span className="adm-enq__avatar" aria-hidden="true">{(a.name || '?').trim().charAt(0).toUpperCase()}</span>
          <div className="adm-enq__body">
            <div className="adm-row" style={{ alignItems: 'center' }}>
              <strong className="adm-grow">{a.name} · {a.position || 'General application'}</strong>
              <span className={`adm-pill${a.emailed ? ' adm-pill--ok' : ' adm-pill--warn'}`}>{a.emailed ? `Emailed → ${a.sentTo}` : 'Saved here only'}</span>
              <button className="adm-btn adm-btn--danger adm-btn--icon adm-btn--sm" onClick={() => del(a.key)} aria-label={`Delete application from ${a.name}`}><Trash2 size={15} /></button>
            </div>
            <p className="adm-muted">{new Date(a.at).toLocaleString()} · <a href={`mailto:${a.email}`}>{a.email}</a>{a.phone && ` · ${a.phone}`}{a.experience && ` · ${a.experience}`}</p>
            {a.message && <p className="adm-enq__msg">{a.message}</p>}
            <div><button className="adm-btn adm-btn--sm" onClick={() => download(a)}><FileText size={15} aria-hidden="true" /> Download CV · {a.fileName} ({mb(a.fileSize || 0)})</button></div>
          </div>
        </div>
      ))}
      {!items.length && <p className="adm-empty">No applications yet. CVs sent from the Careers page appear here.</p>}
    </div>
  );
}

function MessagesList({ say }) {
  const [items, setItems] = useState(null);
  const load = () => api('/api/enquiries').then((d) => setItems(d.items)).catch((e) => say(e.message, false));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const del = async (key) => {
    if (!window.confirm('Delete this enquiry?')) return;
    await api(`/api/enquiries?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
    load();
  };
  if (!items) return <p className="adm-muted">Loading…</p>;
  return (
    <section className="adm-list">
      {items.map((q) => (
        <div className="adm-card adm-enq" key={q.key}>
          <span className="adm-enq__avatar" aria-hidden="true">{(q.name || '?').trim().charAt(0).toUpperCase()}</span>
          <div className="adm-enq__body">
            <div className="adm-row" style={{ alignItems: 'center' }}>
              <strong className="adm-grow">{q.name} · {q.service || 'General enquiry'}</strong>
              <span className={`adm-pill${q.emailed ? ' adm-pill--ok' : ' adm-pill--warn'}`}>{q.emailed ? `Emailed → ${q.sentTo}` : `Saved here · server email off (${q.sentTo})`}</span>
              <button className="adm-btn adm-btn--danger adm-btn--icon adm-btn--sm" onClick={() => del(q.key)} aria-label={`Delete enquiry from ${q.name}`}><Trash2 size={16} /></button>
            </div>
            <p className="adm-muted">{new Date(q.at).toLocaleString()} · <a href={`mailto:${q.email}`}>{q.email}</a>{q.phone && ` · ${q.phone}`}{(q.city || q.state) && ` · ${[q.city, q.state].filter(Boolean).join(', ')}`}</p>
            <p className="adm-enq__msg">{q.message || '—'}</p>
          </div>
        </div>
      ))}
      {!items.length && <p className="adm-empty">No enquiries yet. Messages from the Contact page will appear here.</p>}
    </section>
  );
}

/* ───────────────────────── Backups ───────────────────────── */
function BackupsTab({ say }) {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = () => api('/api/backups').then((d) => setItems(d.items)).catch((e) => say(e.message, false));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const backupNow = async () => {
    setBusy(true);
    try { await api('/api/backups', { method: 'POST' }); say('Backup saved ✓'); load(); }
    catch (e) { say(e.message, false); }
    setBusy(false);
  };

  const restore = async (key) => {
    if (!window.confirm('Restore this backup? It will replace the current gallery, reviews and services.')) return;
    try { await api(`/api/backups?key=${encodeURIComponent(key)}`, { method: 'PUT' }); say('Restored ✓ — reload the site to see it.'); }
    catch (e) { say(e.message, false); }
  };

  const download = async (key) => {
    try {
      const token = (await import('../utils/api')).getToken();
      const res = await fetch(`/api/content`, { headers: { authorization: `Bearer ${token}` } });
      const live = await res.json();
      const blob = new Blob([JSON.stringify(live, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `adzone-backup-${key.split('/')[1] || 'current'}.json`;
      a.click();
    } catch (e) { say(e.message, false); }
  };

  if (!items) return <p className="adm-muted">Loading…</p>;
  return (
    <section>
      <div className="adm-card">
        <div className="adm-row">
          <div className="adm-grow">
            <h2 style={{ marginBottom: 4 }}>Backups</h2>
            <p className="adm-muted">A snapshot of your gallery, reviews and services is taken automatically every day (last 30 kept). You can also back up right now, or download the current data as a file.</p>
          </div>
          <button className="adm-btn" onClick={() => download('current')}><Download size={15} /> Download current data</button>
          <button className="adm-btn adm-btn--primary" disabled={busy} onClick={backupNow}><DatabaseBackup size={15} /> {busy ? 'Saving…' : 'Back up now'}</button>
        </div>
      </div>

      <div className="adm-list">
        {items.map((b) => (
          <div className="adm-card adm-bk" key={b.key}>
            <span className="adm-bk__icon" aria-hidden="true"><DatabaseBackup size={19} /></span>
            <div className="adm-row" style={{ flex: 1, alignItems: 'center' }}>
              <strong className="adm-grow">{new Date(b.at).toLocaleString()}</strong>
              <span className={`adm-pill${b.reason === 'auto' ? ' adm-pill--ok' : ''}`}>{b.reason === 'auto' ? 'Automatic' : 'Manual'}</span>
              <button className="adm-btn" onClick={() => download(b.key)}><Download size={14} /> Download</button>
              <button className="adm-btn" onClick={() => restore(b.key)}><RotateCcw size={14} /> Restore</button>
            </div>
          </div>
        ))}
        {!items.length && <p className="adm-empty">No backups yet. Click “Back up now”, or wait for tonight's automatic one.</p>}
      </div>
    </section>
  );
}

/* ───────────────────────── Clients ───────────────────────── */
function ClientsTab({ save, say }) {
  const { clients } = useContent();
  const [busy, setBusy] = useState(false);

  const add = async (files) => {
    setBusy(true);
    try {
      const added = [];
      const { note } = await uploadMany(files, (image, f) => added.push({ id: uid(), image, name: f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') }));
      await save({ clients: [...clients, ...added] }, `${added.length} logo(s) added ✓${note}`);
    } catch (err) { say(err.message, false); }
    setBusy(false);
  };
  const rename = (id, name) => save({ clients: clients.map((c) => (c.id === id ? { ...c, name } : c)) }, 'Saved ✓');
  const remove = async (c) => {
    if (!window.confirm(`Remove "${c.name || 'this logo'}" from the Clients page?`)) return;
    if (await save({ clients: clients.filter((x) => x.id !== c.id) }, 'Removed ✓')) deleteMedia(c.image);
  };
  const rows = Math.ceil(clients.length / 6);

  return (
    <section>
      <div className="adm-card adm-upload">
        <h2>Add client logos</h2>
        <p className="adm-card__sub">Drag logos here or click to choose. PNG with a transparent background looks best. Every six logos make a new row on the Clients page, so you can add as many as you like.</p>
        <DropZone accept="image/*" multiple disabled={busy} onFiles={add} onReject={() => say('Only image files can be uploaded here.', false)} className="adm-drop">
          <UploadCloud size={30} aria-hidden="true" />
          <span><strong>{busy ? 'Compressing and uploading…' : 'Drag logos here'}</strong>{busy ? '' : ' or click to choose'}</span>
          <small>JPG, PNG or WebP</small>
        </DropZone>
      </div>
      <p className="adm-muted" style={{ marginBottom: '1rem' }}>{clients.length} logo(s) · {rows} row(s) on the Clients page</p>
      {!clients.length && <p className="adm-empty">No client logos yet.</p>}
      <div className="adm-grid adm-grid--logos">
        {clients.map((c) => <ClientCard key={c.id} c={c} onSave={rename} onDelete={remove} say={say} />)}
      </div>
    </section>
  );
}

function ClientCard({ c, onSave, onDelete, say }) {
  const [name, setName] = useState(c.name || '');
  useEffect(() => { setName(c.name || ''); }, [c.name]);
  const dirty = name.trim() !== (c.name || '').trim();
  return (
    <div className="adm-item">
      <div className="adm-item__media adm-item__media--logo"><img src={c.image} alt={c.name} loading="lazy" decoding="async" /></div>
      <div className="adm-item__body">
        <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Client name" placeholder="Client name" />
        <div className="adm-actions">
          <button className={`adm-btn adm-btn--primary${dirty ? '' : ' is-saved'}`} disabled={!dirty} onClick={() => onSave(c.id, name.trim())}>
            {dirty ? <Save size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />} {dirty ? 'Save' : 'Saved'}
          </button>
          <button className="adm-btn adm-btn--icon" onClick={() => downloadImage(c.image, c.name || 'client-logo').catch((e) => say?.(e.message, false))} aria-label={`Download ${c.name || 'logo'}`} title="Download logo"><Download size={16} /></button>
          <button className="adm-btn adm-btn--danger adm-btn--icon" onClick={() => onDelete(c)} aria-label={`Delete ${c.name || 'logo'}`}><Trash2 size={16} /></button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Profile ───────────────────────── */
function ProfileTab({ save, say }) {
  const { profile } = useContent();
  const [p, setP] = useState(() => ({ ...profile, details: [...profile.details], works: [...profile.works] }));
  const [busy, setBusy] = useState(false);
  const set = (patch) => setP((x) => ({ ...x, ...patch }));
  const tidy = (x) => JSON.stringify({
    name: x.name.trim(), role: x.role.trim(), photo: x.photo || '', about: x.about.trim(),
    details: x.details.map((d) => ({ label: d.label.trim(), value: d.value.trim() })).filter((d) => d.label && d.value),
    works: x.works.map((w) => ({ title: w.title.trim(), text: (w.text || '').trim(), image: w.image || '' })).filter((w) => w.title),
  });
  const dirty = tidy(p) !== tidy(profile);
  const setList = (key, i, patch) => setP((x) => ({ ...x, [key]: x[key].map((it, k) => (k === i ? { ...it, ...patch } : it)) }));
  const dropList = (key, i) => setP((x) => ({ ...x, [key]: x[key].filter((_, k) => k !== i) }));

  const pickPhoto = async (files) => {
    setBusy(true);
    try { const { urls } = await uploadMany(files); set({ photo: urls[0] }); } catch (err) { say(err.message, false); }
    setBusy(false);
  };
  const pickWorkImage = async (files, i) => {
    setBusy(true);
    try { const { urls } = await uploadMany(files); setList('works', i, { image: urls[0] }); } catch (err) { say(err.message, false); }
    setBusy(false);
  };

  return (
    <section>
      <div className="adm-card">
        <h2>About you</h2>
        <div className="adm-profile-top">
          <DropZone accept="image/*" disabled={busy} onFiles={pickPhoto} onReject={() => say('Please choose an image.', false)} className="adm-photo">
            {p.photo ? <img src={p.photo} alt="" /> : <span><UserRound size={34} aria-hidden="true" /></span>}
            <small>{busy ? 'Uploading…' : 'Drop or click to change photo'}</small>
          </DropZone>
          <div className="adm-profile-fields">
            <label>Name<input value={p.name} onChange={(e) => set({ name: e.target.value })} /></label>
            <label>Role / headline<input value={p.role} onChange={(e) => set({ role: e.target.value })} placeholder="e.g. Founder · AD ZONEX, Coimbatore" /></label>
          </div>
        </div>
        <label>About you
          <textarea rows={6} value={p.about} onChange={(e) => set({ about: e.target.value })} placeholder="Write a few paragraphs. A blank line starts a new paragraph." />
        </label>
      </div>

      <div className="adm-card">
        <h2>Quick details</h2>
        <p className="adm-card__sub">Short facts shown under your photo, like Experience, Education or Languages.</p>
        {p.details.map((d, i) => (
          <div className="adm-row" key={i}>
            <label>Label<input value={d.label} onChange={(e) => setList('details', i, { label: e.target.value })} placeholder="Experience" /></label>
            <label className="adm-grow">Value<input value={d.value} onChange={(e) => setList('details', i, { value: e.target.value })} placeholder="16+ years in design, print and signage" /></label>
            <button className="adm-btn adm-btn--danger adm-btn--icon" onClick={() => dropList('details', i)} aria-label="Remove detail"><Trash2 size={16} /></button>
          </div>
        ))}
        <div><button className="adm-btn adm-btn--sm" onClick={() => set({ details: [...p.details, { label: '', value: '' }] })}><Plus size={15} aria-hidden="true" /> Add detail</button></div>
      </div>

      <div className="adm-card">
        <h2>Your works</h2>
        <p className="adm-card__sub">Projects you want to highlight. Each has a title, a short description and an optional picture.</p>
        {p.works.map((w, i) => (
          <div className="adm-work" key={i}>
            <DropZone accept="image/*" disabled={busy} onFiles={(f) => pickWorkImage(f, i)} onReject={() => say('Please choose an image.', false)} className="adm-work__img">
              {w.image ? <img src={w.image} alt="" /> : <UploadCloud size={24} aria-hidden="true" />}
              <small>Picture</small>
            </DropZone>
            <div className="adm-work__fields">
              <label>Title<input value={w.title} onChange={(e) => setList('works', i, { title: e.target.value })} /></label>
              <label>Description<textarea rows={3} value={w.text} onChange={(e) => setList('works', i, { text: e.target.value })} /></label>
            </div>
            <button className="adm-btn adm-btn--danger adm-btn--icon" onClick={() => dropList('works', i)} aria-label="Remove work"><Trash2 size={16} /></button>
          </div>
        ))}
        <div><button className="adm-btn adm-btn--sm" onClick={() => set({ works: [...p.works, { title: '', text: '', image: '' }] })}><Plus size={15} aria-hidden="true" /> Add work</button></div>
      </div>

      <div className="adm-savebar">
        <button className={`adm-btn adm-btn--primary${dirty ? '' : ' is-saved'}`} disabled={busy || !dirty} onClick={() => save({ profile: p }, 'Profile saved ✓')}>
          {dirty ? <Save size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />} {dirty ? 'Save profile' : 'Saved'}
        </button>
        <span className="adm-muted">{dirty ? 'You have unsaved changes.' : 'Shown at the bottom of the Careers page.'}</span>
      </div>
    </section>
  );
}
