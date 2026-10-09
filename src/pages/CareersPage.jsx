import { useEffect, useRef, useState } from 'react';
import { Mail, Phone, UploadCloud, FileText, X, Briefcase, Palette, Printer, Users } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import Footer from '../components/Footer';
import Button from '../components/Button';
import Toast from '../components/Toast';
import DropZone from '../components/DropZone';
import PhoneInput, { isPhonePossible } from '../components/PhoneInput';
import { WhatsAppIcon } from '../components/SocialIcons';
import { CONTACT_INFO } from '../data/services';
import { useContent } from '../context/ContentContext';
import useReveal from '../hooks/useReveal';
import './CareersPage.css';

const POSITIONS = ['Graphic Designer', 'Signage & Installation Technician', 'Printing Operator', 'Digital Marketing Executive', 'Sales & Client Relations', 'Internship', 'Other / General application'];
const EXPERIENCE = ['Fresher', 'Less than 1 year', '1 to 3 years', '3 to 5 years', 'More than 5 years'];
const ACCEPT = '.pdf,.doc,.docx,.odt,.rtf,.txt';
const MAX_BYTES = 3 * 1024 * 1024;
const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

const toBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] || '');
  r.onerror = () => reject(new Error('Could not read that file.'));
  r.readAsDataURL(file);
});

const initials = (name) => (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

/** /careers — apply with a CV (PDF or Word), then meet the founder. */
export default function CareersPage() {
  const { profile } = useContent();
  const empty = { name: '', email: '', phone: '', position: '', experience: '', message: '', website: '' };
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);
  const closeToast = useRef(() => setToast(null)).current;

  useEffect(() => { document.title = 'Careers | AD ZONEX'; }, []);
  useReveal([profile?.works?.length]);

  const change = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const pick = (files) => {
    const f = files[0];
    if (!f) return;
    if (f.size > MAX_BYTES) { setErrors((er) => ({ ...er, file: `That file is ${kb(f.size)}. Please keep it under 3 MB.` })); return; }
    setFile(f);
    setErrors((er) => ({ ...er, file: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'A valid email is required.';
    if (form.phone && !isPhonePossible(form.phone)) errs.phone = 'Enter a valid phone number for the selected country.';
    if (!file) errs.file = 'Please attach your CV (PDF or Word document).';
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (sending) return;
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSending(true); setToast(null);
    try {
      const fileData = await toBase64(file);
      const res = await fetch('/api/careers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, fileName: file.name, fileData }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not send your application. Please try again.');
      setToast({ id: Date.now(), type: 'success', title: 'Application received!', message: 'Thank you for applying. We will contact you if there is a suitable opening.' });
      setForm(empty); setFile(null); setErrors({});
    } catch (err) {
      setToast({ id: Date.now(), type: 'error', title: 'Application not sent', message: err.message || 'Could not send your application.' });
    } finally { setSending(false); }
  };

  const paragraphs = (profile.about || '').split(/\n+/).map((p) => p.trim()).filter(Boolean);

  return (
    <div className="page careers">
      <SiteHeader activeHref="/careers" />
      <main>
        <section className="page-hero">
          <div className="container">
            <span className="eyebrow">Careers</span>
            <h1>Join the AD ZONEX team</h1>
            <p>Designers, printers, installers and marketers who like seeing their work out on the street. Send us your CV and tell us what you do best.</p>
          </div>
        </section>

        {/* ── Apply: same layout as the Contact page ───────────── */}
        <div className="container contact-body section">
          <div className="contact-form-col">
            <form className="contact-form" onSubmit={submit} noValidate>
              <div className="cf-row cf-row--2">
                <div className="cf-field">
                  <label htmlFor="cr-name">Name *</label>
                  <input id="cr-name" name="name" autoComplete="name" placeholder="Your name" value={form.name} onChange={change} className={errors.name ? 'cf-input--error' : ''} />
                  {errors.name && <span className="cf-error">{errors.name}</span>}
                </div>
                <div className="cf-field">
                  <label htmlFor="cr-email">Email *</label>
                  <input id="cr-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={change} className={errors.email ? 'cf-input--error' : ''} />
                  {errors.email && <span className="cf-error">{errors.email}</span>}
                </div>
              </div>

              <div className="cf-row cf-row--2">
                <div className="cf-field">
                  <label htmlFor="cr-phone">Phone</label>
                  <PhoneInput id="cr-phone" value={form.phone} onChange={(v) => { setForm((f) => ({ ...f, phone: v })); if (errors.phone) setErrors((er) => ({ ...er, phone: undefined })); }} />
                  {errors.phone && <span className="cf-error">{errors.phone}</span>}
                </div>
                <div className="cf-field">
                  <label htmlFor="cr-position">Applying for</label>
                  <select id="cr-position" name="position" value={form.position} onChange={change}>
                    <option value="">Select a role</option>
                    {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="cf-field">
                <label htmlFor="cr-exp">Experience</label>
                <select id="cr-exp" name="experience" value={form.experience} onChange={change}>
                  <option value="">Select your experience</option>
                  {EXPERIENCE.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* honeypot */}
              <input type="text" name="website" value={form.website} onChange={change} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0 }} />

              <div className="cf-field">
                <span className="cr-label">Your CV *</span>
                {file ? (
                  <div className="cr-file">
                    <FileText size={22} aria-hidden="true" />
                    <span className="cr-file__name"><strong>{file.name}</strong><small>{kb(file.size)}</small></span>
                    <button type="button" className="cr-file__x" onClick={() => setFile(null)} aria-label="Remove file"><X size={18} /></button>
                  </div>
                ) : (
                  <DropZone accept={ACCEPT} onFiles={pick} onReject={() => setErrors((er) => ({ ...er, file: 'Only PDF or Word documents (PDF, DOC, DOCX, ODT, RTF, TXT) are accepted.' }))} className={`cr-drop${errors.file ? ' cr-drop--error' : ''}`}>
                    <UploadCloud size={30} aria-hidden="true" />
                    <span><strong>Drag your CV here</strong> or click to choose a file</span>
                    <small>PDF, DOC, DOCX, ODT, RTF or TXT · up to 3 MB</small>
                  </DropZone>
                )}
                {errors.file && <span className="cf-error">{errors.file}</span>}
              </div>

              <div className="cf-field">
                <label htmlFor="cr-msg">Cover note</label>
                <textarea id="cr-msg" name="message" rows={5} placeholder="Tell us about yourself and the work you have done…" value={form.message} onChange={change} />
              </div>

              <div className="cf-submit">
                <Button type="submit" variant="primary" disabled={sending}>{sending ? 'Sending…' : 'Send application'}</Button>
              </div>
            </form>
          </div>

          <aside className="contact-details-col">
            <div className="contact-detail-card">
              <h2 className="contact-details-heading">Working at AD ZONEX</h2>
              <ul className="cr-points">
                <li><Palette size={18} aria-hidden="true" /><span>Real brands, real deadlines, work you can point to on the street.</span></li>
                <li><Printer size={18} aria-hidden="true" /><span>Design, printing, signage and digital under one roof.</span></li>
                <li><Users size={18} aria-hidden="true" /><span>A small team in Coimbatore where your work is seen.</span></li>
                <li><Briefcase size={18} aria-hidden="true" /><span>Freshers and experienced people are both welcome to apply.</span></li>
              </ul>
              <a href={`tel:${CONTACT_INFO.phone.replace(/\s+/g, '')}`} className="contact-detail-row"><Phone size={18} /><span>{CONTACT_INFO.phone}</span></a>
              <a href={CONTACT_INFO.whatsapp} target="_blank" rel="noreferrer" className="contact-detail-row"><WhatsAppIcon size={18} className="wa-glow" /><span>WhatsApp us</span></a>
              <a href={`mailto:${CONTACT_INFO.email}`} className="contact-detail-row"><Mail size={18} /><span>{CONTACT_INFO.email}</span></a>
            </div>
          </aside>
        </div>

        {/* ── Profile ─────────────────────────────────────────── */}
        <section className="section section--ink cr-profile" id="profile" aria-label="Founder profile">
          <div className="container">
            <div className="section-head reveal">
              <span className="eyebrow">Meet the founder</span>
              <h2>The person behind the work</h2>
            </div>

            <div className="cr-profile__grid">
              <div className="cr-profile__card reveal">
                <div className="cr-profile__photo">
                  {profile.photo ? <img src={profile.photo} alt={profile.name} loading="lazy" decoding="async" /> : <span aria-hidden="true">{initials(profile.name)}</span>}
                </div>
                <h3>{profile.name}</h3>
                <p className="cr-profile__role">{profile.role}</p>
                {profile.details.length > 0 && (
                  <dl className="cr-profile__facts">
                    {profile.details.map((d) => (<div key={d.label}><dt>{d.label}</dt><dd>{d.value}</dd></div>))}
                  </dl>
                )}
              </div>

              <div className="cr-profile__about reveal">
                {paragraphs.map((p, i) => <p key={i} className={i === 0 ? 'cr-lead' : ''}>{p}</p>)}
              </div>
            </div>

            {profile.works.length > 0 && (
              <>
                <h3 className="cr-works__title reveal">Selected work</h3>
                <ul className="cr-works">
                  {profile.works.map((w, i) => (
                    <li key={`${w.title}-${i}`} className="cr-work reveal" style={{ transitionDelay: `${(i % 3) * 70}ms` }}>
                      {w.image && <img src={w.image} alt={w.title} loading="lazy" decoding="async" />}
                      <div><h4>{w.title}</h4>{w.text && <p>{w.text}</p>}</div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
