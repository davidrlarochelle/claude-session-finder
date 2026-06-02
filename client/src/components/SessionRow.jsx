import { GitBranch, Clock } from 'lucide-react';
import CopyButton from './CopyButton.jsx';
import { relativeTime, formatSize, shortId, resumeCommand } from '../utils.js';

export default function SessionRow({ session, selected, onSelect }) {
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
        <span className="ml-auto" onClick={(e) => e.stopPropagation()}>
          <CopyButton text={resumeCommand(session)} label="Copy resume" copiedLabel="Copied" />
        </span>
      </div>
    </div>
  );
}
