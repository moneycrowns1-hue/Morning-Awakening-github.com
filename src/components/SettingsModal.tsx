'use client';

interface SettingsModalProps {
  voiceEnabled: boolean;
  masterVolume: number;
  onToggleVoice: (on: boolean) => void;
  onVolumeChange: (v: number) => void;
  onClose: () => void;
  onResetProgress: () => void;
}

export default function SettingsModal({
  voiceEnabled,
  masterVolume,
  onToggleVoice,
  onVolumeChange,
  onClose,
  onResetProgress,
}: SettingsModalProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center px-5"
      style={{ background: 'rgba(10,9,8,0.8)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded border p-5"
        style={{
          background: 'rgba(21,18,14,0.96)',
          borderColor: 'rgba(201,162,39,0.25)',
          boxShadow: '0 0 40px rgba(0,0,0,0.6)',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div
            className="text-lg font-bold tracking-[0.25em]"
            style={{ color: '#c9a227', fontFamily: 'var(--font-cinzel), Georgia, serif' }}
          >
            AJUSTES
          </div>
          <button onClick={onClose} className="text-washi/40 hover:text-washi/80 text-xl">✕</button>
        </div>

        {/* Voice toggle */}
        <label className="flex items-center justify-between gap-3 mb-5 cursor-pointer">
          <div>
            <div className="text-[13px] tracking-[0.2em] text-washi/80">VOZ DEL JUGADOR</div>
            <div className="text-[11px] text-washi/35">Narración de fases</div>
          </div>
          <div
            className="w-11 h-6 rounded-full p-0.5 transition-colors"
            style={{ background: voiceEnabled ? 'rgba(201,162,39,0.8)' : 'rgba(122,111,99,0.3)' }}
          >
            <div
              className="w-5 h-5 rounded-full bg-washi transition-transform"
              style={{ transform: voiceEnabled ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </div>
          <input
            type="checkbox"
            className="sr-only"
            checked={voiceEnabled}
            onChange={(e) => onToggleVoice(e.target.checked)}
          />
        </label>

        {/* Master volume */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[13px] tracking-[0.2em] text-washi/80">VOLUMEN</div>
            <div className="text-[11px] text-washi/50">{Math.round(masterVolume * 100)}%</div>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={masterVolume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full accent-[#c9a227]"
          />
        </div>

        {/* Reset */}
        <button
          onClick={() => {
            if (confirm('¿Seguro que quieres borrar tu progreso? Esta acción no se puede deshacer.')) {
              onResetProgress();
            }
          }}
          className="w-full py-2 rounded border text-[12px] tracking-[0.2em] transition-colors"
          style={{
            borderColor: 'rgba(188,0,45,0.5)',
            color: '#bc002d',
            background: 'rgba(188,0,45,0.05)',
          }}
        >
          REINICIAR PROGRESO
        </button>
      </div>
    </div>
  );
}
