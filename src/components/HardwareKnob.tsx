import React, { useRef, useState, useCallback } from 'react';

interface HardwareKnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  defaultValue?: number;
  color?: 'amber' | 'yellow' | 'emerald' | 'sky' | 'purple' | 'red' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  formatValue?: (val: number) => string;
  onChange: (val: number) => void;
}

const colorMap = {
  amber: { arc: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)', text: 'text-amber-400' },
  yellow: { arc: '#eab308', glow: 'rgba(234, 179, 8, 0.4)', text: 'text-yellow-400' },
  emerald: { arc: '#10b981', glow: 'rgba(16, 185, 129, 0.4)', text: 'text-emerald-400' },
  sky: { arc: '#0ea5e9', glow: 'rgba(14, 165, 233, 0.4)', text: 'text-sky-400' },
  purple: { arc: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)', text: 'text-purple-400' },
  red: { arc: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)', text: 'text-red-400' },
  neutral: { arc: '#a3a3a3', glow: 'rgba(163, 163, 163, 0.3)', text: 'text-neutral-300' },
};

export const HardwareKnob: React.FC<HardwareKnobProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  defaultValue,
  color = 'amber',
  size = 'md',
  formatValue,
  onChange,
}) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number>(0);
  const startValRef = useRef<number>(value);

  // Normalize 0 to 1
  const norm = Math.max(0, Math.min(1, (value - min) / (max - min)));
  // Angle: -135deg to +135deg (270deg total sweep)
  const angle = -135 + norm * 270;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValRef.current = value;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dy = startYRef.current - e.clientY; // drag up increases
    const range = max - min;
    const sensitivity = e.shiftKey ? 400 : 150; // shift key = fine adjustment
    const delta = (dy / sensitivity) * range;

    let nextVal = startValRef.current + delta;
    if (step) {
      nextVal = Math.round(nextVal / step) * step;
    }
    nextVal = Math.max(min, Math.min(max, nextVal));
    onChange(nextVal);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = (e.deltaY < 0 ? 1 : -1) * (step || 1);
    const nextVal = Math.max(min, Math.min(max, value + delta));
    onChange(nextVal);
  };

  const handleDoubleClick = () => {
    if (defaultValue !== undefined) {
      onChange(defaultValue);
    }
  };

  const c = colorMap[color];
  const sizePx = size === 'sm' ? 44 : size === 'lg' ? 64 : 52;
  const strokeWidth = size === 'sm' ? 3 : 4;
  const radius = (sizePx - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  // Arc 270 degrees = 0.75 of full circle
  const strokeDasharray = `${circumference * 0.75} ${circumference}`;
  const strokeDashoffset = circumference * 0.75 * (1 - norm);

  const displayString = formatValue
    ? formatValue(value)
    : `${Number(value.toFixed(step < 1 ? 1 : 0))}${unit}`;

  return (
    <div
      className="flex flex-col items-center select-none group"
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      title={`${label}: ${displayString} (Glisser verticalement, double-clic pour réinitialiser)`}
    >
      {/* Label */}
      <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider mb-1 truncate max-w-[70px] text-center">
        {label}
      </span>

      {/* Rotary Dial Container */}
      <div
        ref={knobRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative cursor-ns-resize flex items-center justify-center"
        style={{ width: sizePx + 8, height: sizePx + 8 }}
      >
        {/* SVG Arc for Circular Value Gauge */}
        <svg
          className="absolute inset-0 -rotate-[225deg] pointer-events-none"
          width={sizePx + 8}
          height={sizePx + 8}
          viewBox={`0 0 ${sizePx + 8} ${sizePx + 8}`}
        >
          {/* Background Track */}
          <circle
            cx={(sizePx + 8) / 2}
            cy={(sizePx + 8) / 2}
            r={radius}
            fill="none"
            stroke="#1f1f1f"
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
          />
          {/* Active Level Arc */}
          <circle
            cx={(sizePx + 8) / 2}
            cy={(sizePx + 8) / 2}
            r={radius}
            fill="none"
            stroke={c.arc}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              filter: isDragging ? `drop-shadow(0 0 4px ${c.glow})` : 'none',
              transition: isDragging ? 'none' : 'stroke-dashoffset 75ms ease-out',
            }}
          />
        </svg>

        {/* Physical Knob Body with Machined Metal Shading */}
        <div
          className={`rounded-full relative flex items-center justify-center transition-transform ${
            isDragging ? 'scale-95 shadow-inner' : 'hover:brightness-110 shadow-lg'
          }`}
          style={{
            width: sizePx,
            height: sizePx,
            background: 'radial-gradient(circle, #333333 0%, #202020 60%, #111111 100%)',
            border: '2px solid #3a3a3a',
            boxShadow: '0 4px 8px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.15)',
          }}
        >
          {/* Outer ridged ring */}
          <div className="absolute inset-1 rounded-full border border-neutral-700/40 pointer-events-none" />

          {/* Pointer Needle (Rotates with angle) */}
          <div
            className="absolute inset-0 flex items-start justify-center pointer-events-none"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <div
              className="w-1 rounded-full mt-1.5 shadow-sm"
              style={{
                height: sizePx * 0.28,
                backgroundColor: isDragging ? '#ffffff' : c.arc,
                boxShadow: isDragging ? '0 0 6px #fff' : `0 0 4px ${c.glow}`,
              }}
            />
          </div>

          {/* Center metal cap with concentric ring */}
          <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-neutral-800 to-neutral-600 border border-neutral-500/50 shadow-inner" />
        </div>
      </div>

      {/* Value Display */}
      <div className="mt-1 px-1.5 py-0.5 rounded bg-neutral-950/90 border border-neutral-800/80 min-w-[50px] text-center">
        <span className={`text-[10px] font-mono font-bold tabular-nums ${c.text}`}>
          {displayString}
        </span>
      </div>
    </div>
  );
};
