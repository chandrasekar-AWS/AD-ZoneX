import { useRef, useState } from 'react';
import './DropZone.css';

const matches = (file, accept) => {
  if (!accept) return true;
  const name = file.name.toLowerCase();
  return accept.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).some((a) => (
    a.startsWith('.') ? name.endsWith(a) : a.endsWith('/*') ? file.type.startsWith(a.slice(0, -1)) : file.type === a
  ));
};

/**
 * DropZone — drag files onto it, or click it to browse. Used for job-application CVs and for admin image uploads.
 * `onFiles(files)` gets only the files that match `accept`; the rest go to `onReject(files)`.
 */
export default function DropZone({ accept, multiple = false, disabled = false, onFiles, onReject, className = '', children }) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);

  const handle = (list) => {
    const all = [...list];
    const ok = all.filter((f) => matches(f, accept));
    const bad = all.filter((f) => !matches(f, accept));
    if (bad.length) onReject?.(bad);
    if (ok.length) onFiles(multiple ? ok : ok.slice(0, 1));
  };

  return (
    <label
      className={`dz${over ? ' is-over' : ''}${disabled ? ' is-disabled' : ''} ${className}`.trim()}
      onDragEnter={(e) => { e.preventDefault(); if (disabled) return; depth.current += 1; setOver(true); }}
      onDragOver={(e) => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = disabled ? 'none' : 'copy'; }}
      onDragLeave={(e) => { e.preventDefault(); depth.current = Math.max(0, depth.current - 1); if (!depth.current) setOver(false); }}
      onDrop={(e) => { e.preventDefault(); depth.current = 0; setOver(false); if (!disabled) handle(e.dataTransfer.files); }}
    >
      <input
        className="dz__input" type="file" accept={accept} multiple={multiple} disabled={disabled}
        onChange={(e) => { handle(e.target.files); e.target.value = ''; }}
      />
      {children}
    </label>
  );
}
