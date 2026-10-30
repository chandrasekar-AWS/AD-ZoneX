import { useId, useMemo, useRef, useState } from 'react';

/**
 * Suggest — a text box that offers suggestions while you type.
 * - Click the box or start typing: matching suggestions appear underneath.
 * - ↑ ↓ to move, Enter or Tab to pick, Esc to close, or just click one.
 * - `multi`: the box holds a comma-separated list ("Logo Design, Flex Printing"); suggestions are for the word
 *   you are typing now, and ones already in the list are left out.
 * `onChange` receives the new text (not an event).
 */
export default function Suggest({ value, onChange, suggestions = [], multi = false, max = 6, className = '', ...rest }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef(null);
  const text = String(value ?? '');

  const { head, token } = useMemo(() => {
    if (!multi) return { head: '', token: text.trim() };
    const cut = text.lastIndexOf(',');
    return { head: cut >= 0 ? `${text.slice(0, cut + 1)} ` : '', token: text.slice(cut + 1).trim() };
  }, [text, multi]);

  const list = useMemo(() => {
    const taken = new Set(multi ? text.split(',').slice(0, -1).map((x) => x.trim().toLowerCase()) : []);
    const q = token.toLowerCase();
    const seen = new Set();
    const out = [];
    for (const s of suggestions) {
      const v = String(s || '').trim();
      const k = v.toLowerCase();
      if (!v || seen.has(k) || taken.has(k) || k === q) continue;
      seen.add(k);
      out.push({ v, score: !q ? 2 : k.startsWith(q) ? 0 : k.split(/\s+/).some((w) => w.startsWith(q)) ? 1 : k.includes(q) ? 2 : -1 });
    }
    return out.filter((o) => o.score >= 0).sort((a, b) => a.score - b.score).slice(0, max).map((o) => o.v);
  }, [suggestions, token, text, multi, max]);

  const show = open && list.length > 0;
  const pick = (v) => { onChange(multi ? `${head}${v}` : v); setActive(0); if (!multi) setOpen(false); box.current?.focus(); };

  const onKey = (e) => {
    if (!show) { if (e.key === 'ArrowDown') setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % list.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + list.length) % list.length); }
    else if (e.key === 'Escape') { setOpen(false); }
    else if ((e.key === 'Enter' || e.key === 'Tab') && list[active] && (token || e.key === 'Enter')) {
      if (e.key === 'Enter' || token) { e.preventDefault(); pick(list[active]); }
    }
  };

  return (
    <span className={`sg ${className}`.trim()}>
      <input
        {...rest} ref={box} value={text} autoComplete="off" role="combobox" aria-expanded={show} aria-controls={`${id}-list`} aria-autocomplete="list"
        onChange={(e) => { onChange(e.target.value); setActive(0); setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={onKey}
      />
      {show && (
        <ul className="sg__list" id={`${id}-list`} role="listbox">
          <li className="sg__hint" aria-hidden="true">Suggestions</li>
          {list.map((s, i) => (
            <li key={s} role="option" aria-selected={i === active} className={i === active ? 'is-on' : ''}
              onMouseDown={(e) => { e.preventDefault(); pick(s); }} onMouseEnter={() => setActive(i)}>{s}</li>
          ))}
        </ul>
      )}
    </span>
  );
}
