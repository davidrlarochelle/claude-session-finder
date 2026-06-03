import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type React from 'react';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-secure contexts.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }
}

interface Props {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  onClick?: () => void;
}

export default function CopyButton({ text, label = 'Copy', copiedLabel = 'Copied!', className = '', onClick }: Props) {
  const [copied, setCopied] = useState(false);

  const handle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
    onClick?.();
  };

  return (
    <button
      type="button"
      onClick={handle}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium ${
        copied
          ? 'border-green-300 bg-green-50 text-green-700 shadow-pressed dark:border-green-800 dark:bg-green-950/50 dark:text-green-400'
          : 'ui-btn border-border text-fg-muted hover:text-fg'
      } ${className}`}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? copiedLabel : label}
    </button>
  );
}
