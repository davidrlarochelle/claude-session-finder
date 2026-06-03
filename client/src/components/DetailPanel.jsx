import { useEffect, useState } from 'react';
import { X, Folder, GitBranch, Clock, HardDrive, MessageSquare, Cpu, Terminal, Timer, Coins, Wrench, Brain, AlertTriangle, Sparkles } from 'lucide-react';
import CopyButton from './CopyButton.jsx';
import { fetchPreview } from '../api.js';
import { relativeTime, formatSize, resumeCommand, formatCount, formatDuration } from '../utils.js';

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
          <Field icon={Timer} label="Duration">{session.durationMs ? formatDuration(session.durationMs) : '—'}</Field>
          <Field icon={MessageSquare} label="Messages">
            {session.countCapped ? `${session.messageCount}+` : session.messageCount}
          </Field>
          <Field icon={Coins} label="Tokens">
            {formatCount(session.tokensIn || 0)} in · {formatCount(session.tokensOut || 0)} out
          </Field>
          <Field icon={Cpu} label="Model">{session.model || '—'}</Field>
          <Field icon={HardDrive} label="Size">{formatSize(session.sizeBytes)}</Field>
        </div>

        {session.toolCallCount > 0 && (
          <div data-testid="detail-tools">
            <span className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-fg-subtle">
              <Wrench size={12} />
              Tools used ({session.toolCallCount})
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(session.toolCounts || {})
                .sort((a, b) => b[1] - a[1])
                .map(([name, n]) => (
                  <span key={name} className="ui-chip rounded-md bg-surface-hover px-1.5 py-0.5 text-xs text-fg-muted">
                    {name} ×{n}
                  </span>
                ))}
            </div>
          </div>
        )}

        {(session.errorCount > 0 || session.hasThinking || session.skill || session.stopReason) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-fg-subtle">
            {session.errorCount > 0 && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertTriangle size={12} />
                {session.errorCount} tool error{session.errorCount > 1 ? 's' : ''}
              </span>
            )}
            {session.hasThinking && (
              <span className="flex items-center gap-1">
                <Brain size={12} />
                Includes thinking
              </span>
            )}
            {session.skill && (
              <span className="flex items-center gap-1">
                <Sparkles size={12} />
                {session.skill}
              </span>
            )}
            {session.stopReason && <span>Stop: {session.stopReason}</span>}
          </div>
        )}

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
