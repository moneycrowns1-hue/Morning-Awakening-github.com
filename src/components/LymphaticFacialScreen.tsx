'use client';

// ═══════════════════════════════════════════════════════════
// LymphaticFacialScreen · 10-min directional drainage routine.
// Wrapper around WellnessSessionRunner.
// ═══════════════════════════════════════════════════════════

import WellnessSessionRunner from './WellnessSessionRunner';
import { WELLNESS_ROUTINES } from '@/lib/wellnessRoutines';

interface LymphaticFacialScreenProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function LymphaticFacialScreen({ onComplete, onCancel }: LymphaticFacialScreenProps) {
  return (
    <WellnessSessionRunner
      routine={WELLNESS_ROUTINES.lymphatic_facial}
      onComplete={onComplete}
      onCancel={onCancel}
    />
  );
}
