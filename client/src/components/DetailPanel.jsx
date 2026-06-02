import { useEffect, useState } from 'react';
import { X, Folder, GitBranch, Clock, HardDrive, MessageSquare, Cpu, Terminal } from 'lucide-react';
import CopyButton from './CopyButton.jsx';
import { fetchPreview } from '../api.js';
import { relativeTime, formatSize, resumeCommand } from '../utils.js';

function Field({ icon: Icon, label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-fg-subtle">
        {Icon && <Icon size={11} />}
        {label}
      </span>
      <span className="break-words text-sm text-fg">{children}</span>
    </div>
  );
}

export default function DetailPanel({ session, onClose }) {
  const [turns, setTurns] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setLoading(true);
    setTurns(null);
    setError(null);
    fetchPreview(session.id)
      .then((data) => !cancelled && setTurns(data.turns || []))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!session) {
    return (
      <aside data-testid="detail-panel" className="hidden w-96 shrink-0 flex-col items-center justify-center gap-3 border-l border-border ui-panel p-6 text-center lg:flex">
        <div className="ui-inset flex h-12 w-12 items-center justify-center rounded-full text-fg-subtle">
          <MessageSquare size={22} />
        </div>
        <p className="max-w-[14rem] text-sm text-fg-muted">
          Select a session to see details and copy its resume command.
        </p>
      </aside>
    );
  }

  return (
    <aside data-testid="detail-panel" className="relative z-10 flex w-96 shrink-0 flex-col border-l border-border ui-raised">
      <div className="flex items-start justify-between gap-2 border-b border-border p-4">
        <h2 className="text-sm font-semibold text-fg">{session.title}</h2>
        <button
          onClick={onClose}
          aria-label="Close details"
          className="ui-btn rounded-md p-1 text-fg-subtle hover:text-fg"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-5 overflow-y-auto p-4">
        <div className="ui-display rounded-lg border border-border p-3">
          <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-fg-subtle">
            <Terminal size={12} />
            Resume command
          </span>
          <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs text-fg">
            {resumeCommand(session)}
          </pre>
          <div className="mt-2.5 flex gap-2">
            <CopyButton text={resumeCommand(session)} label="Copy command" />
            <CopyButton text={session.id} label="Copy id only" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field icon={Folder} label="Project">{session.project}</Field>
          <Field icon={GitBranch} label="Branch">{session.gitBranch || '—'}</Field>
          <Field icon={Clock} label="Last active">{relativeTime(session.mtimeMs)}</Field>
          <Field icon={HardDrive} label="Size">{formatSize(session.sizeBytes)}</Field>
          <Field icon={MessageSquare} label="Messages">
            {session.countCapped ? `${session.messageCount}+` : session.messageCount}
          </Field>
          <Field icon={Cpu} label="Model">{session.model || '—'}</Field>
        </div>
        {session.cwd && (
          <Field icon={Folder} label="Working dir">
            <span className="font-mono text-xs">{session.cwd}</span>
          </Field>
        )}
        <Field label="Session id">
          <span className="font-mono text-xs">{session.id}</span>
        </Field>

        <div>
          <span className="text-[11px] uppercase tracking-wide text-fg-subtle">Conversation preview</span>
          {loading && <p className="mt-2 text-sm text-fg-subtle">Loading…</p>}
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          {turns && turns.length === 0 && <p className="mt-2 text-sm text-fg-subtle">No text turns found.</p>}
          {turns && turns.length > 0 && (
            <div className="mt-2 space-y-3">
              {turns.map((t, i) => (
                <div key={i} className="text-sm">
                  <span
                    className={`ui-chip mb-1 inline-block rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                      t.role === 'user' ? 'bg-accent-soft text-accent' : 'bg-surface-hover text-fg-muted'
                    }`}
                  >
                    {t.role}
                  </span>
                  <p className="whitespace-pre-wrap break-words text-fg-muted">{t.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
