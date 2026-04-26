'use client';

// ═══════════════════════════════════════════════════════════
// BruxismExerciseScreen · 8-min routine: jaw reset, masseter
// massage, pterygoid + temporal release, 4-6 calming breath.
// Wrapper around WellnessSessionRunner.
// ═══════════════════════════════════════════════════════════

import WellnessSessionRunner from './WellnessSessionRunner';
import { WELLNESS_ROUTINES } from '@/lib/wellness/wellnessRoutines';

interface BruxismExerciseScreenProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function BruxismExerciseScreen({ onComplete, onCancel }: BruxismExerciseScreenProps) {
  return (
    <WellnessSessionRunner
      routine={WELLNESS_ROUTINES.bruxism}
      onComplete={onComplete}
      onCancel={onCancel}
    />
  );
}
