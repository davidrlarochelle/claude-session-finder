import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SearchX } from 'lucide-react';
import type { Session } from '../../../shared/types';
import SessionRow from './SessionRow';

interface Props {
  sessions: Session[];
  selectedId: string | undefined;
  onSelect: (session: Session) => void;
}

export default function SessionList({ sessions, selectedId, onSelect }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: sessions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
    overscan: 12,
  });

  if (sessions.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="ui-inset flex h-12 w-12 items-center justify-center rounded-full text-fg-subtle">
          <SearchX size={22} />
        </div>
        <p className="text-sm text-fg-muted">No sessions match your search.</p>
      </div>
    );
  }

  const items = virtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
        {items.map((vi) => {
          const session = sessions[vi.index];
          if (!session) return null;
          return (
            <div
              key={session.id}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vi.start}px)` }}
            >
              <SessionRow session={session} selected={session.id === selectedId} onSelect={onSelect} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
