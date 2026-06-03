import { GitBranch, Clock, Timer, Coins, Wrench, AlertTriangle } from 'lucide-react';
import type React from 'react';
import type { Session } from '../../../shared/types';
import CopyButton from './CopyButton';
import { relativeTime, formatSize, shortId, resumeCommand, formatTokens, formatDuration } from '../utils';

interface Props {
  session: Session;
  selected: boolean;
  onSelect: (session: Session) => void;
}

export default function SessionRow({ session, selected, onSelect }: Props) {
  const tokens = (session.tokensIn || 0) + (session.tokensOut || 0);
  const topToolCount = session.topTool ? (session.toolCounts[session.topTool] ?? 0) : 0;
  const hasMetrics = session.durationMs || tokens || session.toolCallCount || session.errorCount;

  return (
    <div
      onClick={() => onSelect(session)}
      data-testid="session-row"
      data-session-id={session.id}
      className={`group flex cursor-pointer flex-col gap-1 border-b border-border px-4 py-3 ${
        selected ? 'ui-row-selected' : 'ui-row'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-1 text-sm font-semibold text-fg">{session.title}</h3>
        <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-fg-subtle">
          <Clock size={12} />
          {relativeTime(session.mtimeMs)}
        </span>
      </div>
      {session.preview && <p className="line-clamp-1 text-xs text-fg-muted">{session.preview}</p>}
      <div className="mt-0.5 flex items-center gap-2 text-xs text-fg-subtle">
        <span className="ui-chip rounded-md bg-accent-soft px-1.5 py-0.5 font-medium text-accent">{session.project}</span>
        {session.gitBranch && (
          <span className="flex items-center gap-1" title="git branch">
            <GitBranch size={12} />
            {session.gitBranch}
          </span>
        )}
        <span>{formatSize(session.sizeBytes)}</span>
        <span className="font-mono text-fg-subtle">{shortId(session.id)}</span>
        <span className="ml-auto" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          <CopyButton text={resumeCommand(session)} label="Copy resume" copiedLabel="Copied" />
        </span>
      </div>
      {hasMetrics && (
        <div data-testid="session-metrics" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg-subtle">
          {(session.durationMs ?? 0) > 0 && (
            <span data-testid="badge-duration" className="flex items-center gap-1" title="Session duration">
              <Timer size={12} />
              {formatDuration(session.durationMs)}
            </span>
          )}
          {tokens > 0 && (
            <span
              data-testid="badge-tokens"
              className="flex items-center gap-1"
              title={`${session.tokensIn || 0} input · ${session.tokensOut || 0} output tokens`}
            >
              <Coins size={12} />
              {formatTokens(tokens)}
            </span>
          )}
          {session.topTool && (
            <span data-testid="badge-tooltop" className="flex items-center gap-1" title={`${session.toolCallCount} tool calls`}>
              <Wrench size={12} />
              {session.topTool}
              {topToolCount > 1 ? ` ×${topToolCount}` : ''}
            </span>
          )}
          {session.errorCount > 0 && (
            <span
              data-testid="badge-errors"
              className="flex items-center gap-1 text-amber-600 dark:text-amber-400"
              title={`${session.errorCount} tool error(s)`}
            >
              <AlertTriangle size={12} />
              {session.errorCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
