import { Square, Box, Circle, Droplets } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StyleOption {
  value: string;
  icon: LucideIcon;
  title: string;
}

const OPTIONS: StyleOption[] = [
  { value: 'default', icon: Square, title: 'Default — flat design' },
  { value: 'skeu', icon: Box, title: 'Skeuomorphism — realistic depth' },
  { value: 'neu', icon: Circle, title: 'Neumorphism — soft UI' },
  { value: 'glass', icon: Droplets, title: 'Liquid Glass — translucent frosted' },
];

interface Props {
  style: string;
  onChange: (value: string) => void;
}

/** Segmented control to pick the design style. Renders itself in the active style. */
export default function StyleSwitcher({ style, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="Design style"
      className="ui-inset flex shrink-0 items-center gap-0.5 rounded-lg border border-border p-0.5"
    >
      {OPTIONS.map((o) => {
        const active = style === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            title={o.title}
            aria-label={o.title}
            aria-pressed={active}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
              active ? 'ui-btn-accent' : 'text-fg-subtle hover:text-fg'
            }`}
          >
            <o.icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
