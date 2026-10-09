import React from 'react';
import clsx from 'clsx';

export function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-3.5 h-3.5 text-studio-gold" />
      <h4 className="text-xs font-medium text-studio-text uppercase tracking-wide">{title}</h4>
    </div>
  );
}

export function ModelRow({ id, info, active, onSelect }) {
  return (
    <button onClick={onSelect}
      className={clsx('w-full flex items-center gap-3 px-3 py-2 rounded-md border transition-all text-left',
        active ? 'bg-studio-gold/10 border-studio-gold/40' : 'bg-studio-panel border-studio-border hover:border-studio-gold/25')}>
      <div className={clsx('w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
        active ? 'border-studio-gold' : 'border-studio-border')}>
        {active && <div className="w-2 h-2 rounded-full bg-studio-gold" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-studio-text truncate">{info.name}</span>
          {info.badge && <span className="text-[9px] text-studio-gold">{info.badge}</span>}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-studio-text-muted">
          <span>{info.params}</span><span>·</span><span>{info.context}</span><span>·</span><span>{info.specialty}</span>
        </div>
      </div>
    </button>
  );
}
