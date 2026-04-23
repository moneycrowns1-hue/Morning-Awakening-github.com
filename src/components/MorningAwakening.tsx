'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import gsap from 'gsap';
import {
  MISSIONS,
  type StreakData,
  DEFAULT_STREAK_DATA,
  getToday,
  isYesterday,
  isToday,
} from '@/lib/constants';
import { AudioEngine } from '@/lib/audioEngine';
import { Operator } from '@/lib/operator';
import {
  loadProfile,
  saveProfile,
  computeReward,
  applyAward,
  applyClassBonus,
  type OperatorProfile,
  type OperatorClass,
  PROFILE_KEY,
  DEFAULT_PROFILE,
  type OperatorStats,
} from '@/lib/progression';
import MissionPhaseV8 from './MissionPhaseV8';
import SummaryScreenV8 from './SummaryScreenV8';
import XpGainToast from './XpGainToast';
import LevelUpOverlay from './LevelUpOverlay';
import ProfileModal from './ProfileModal';
import SettingsModal from './SettingsModal';
import OnboardingModal from './OnboardingModal';
import WelcomeScreen from './WelcomeScreen';
import { appendSession, computeQualityScore } from '@/lib/sessionHistory';

type AppState = 'IDLE' | 'MISSION' | 'COMPLETE';
const STORAGE_KEY = 'morning-awakening-streak';
const SETTINGS_KEY = 'morning-awakening-settings';

interface Settings {
  voiceEnabled: boolean;
  masterVolume: number;
}
const DEFAULT_SETTINGS: Settings = { voiceEnabled: true, masterVolume: 0.6 };

interface XpToastData {
  id: number;
  xp: number;
  statName: keyof OperatorStats;
  statDelta: number;
}

export default function MorningAwakening() {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [missionIndex, setMissionIndex] = useState(0);
  const [streakData, setStreakData] = useState<StreakData>(DEFAULT_STREAK_DATA);
  const [profile, setProfile] = useState<OperatorProfile>(DEFAULT_PROFILE);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [startTime, setStartTime] = useState<number>(0);
  const [xpToasts, setXpToasts] = useState<XpToastData[]>([]);
  const [levelUp, setLevelUp] = useState<{ from: number; to: number } | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);
  const [skippedPhases, setSkippedPhases] = useState<number[]>([]);

  const audioRef = useRef<AudioEngine | null>(null);
  const operatorRef = useRef<Operator | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ═══════════════ Load persisted data ═══════════════
  useEffect(() => {
    // Profile (triggers onboarding on first run)
    let loadedProfile: OperatorProfile;
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) {
        setShowOnboarding(true);
        loadedProfile = loadProfile();
      } else {
        loadedProfile = loadProfile();
      }
    } catch {
      setShowOnboarding(true);
      loadedProfile = loadProfile();
    }
    setProfile(loadedProfile);
    setSettings(loadSettings());

    // Streak
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data: StreakData = JSON.parse(saved);
        if (data.lastCompletedDate) {
          if (isToday(data.lastCompletedDate)) {
            setStreakData(data);
            setAppState('COMPLETE');
            return;
          } else if (!isYesterday(data.lastCompletedDate)) {
            data.streak = 0;
          }
        }
        setStreakData(data);
      }
    } catch { /* fresh */ }
  }, []);

  // ═══════════════ Onboarding completion ═══════════════
  const handleOnboardingComplete = useCallback((name: string, cls: OperatorClass) => {
    let next: OperatorProfile = { ...DEFAULT_PROFILE, name, createdAt: new Date().toISOString() };
    next = applyClassBonus(next, cls);
    setProfile(next);
    saveProfile(next);
    setShowOnboarding(false);
  }, []);

  // ═══ Dōjō typewriter / legacy idle button effects removed ═══
  // The v8 WelcomeScreen handles its own entrance animations via
  // CSS .sunrise-fade-up on each element, so no imperative GSAP
  // timeline is needed for the IDLE state anymore.

  // ═══════════════ Persistence helpers ═══════════════
  function loadSettings(): Settings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return DEFAULT_SETTINGS;
  }

  const persistSettings = useCallback((s: Settings) => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }, []);

  const saveStreak = useCallback((data: StreakData) => {
    setStreakData(data);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }, []);

  // ═══════════════ Initialize audio + operator ═══════════════
  const handleInitialize = useCallback(async () => {
    if (!audioRef.current) {
      audioRef.current = new AudioEngine();
      audioRef.current.init();
      audioRef.current.setMasterVolume(settings.masterVolume);
    }
    if (!operatorRef.current) {
      operatorRef.current = new Operator(audioRef.current);
      operatorRef.current.setEnabled(settings.voiceEnabled);
    }
    // iOS Safari: unlock SpeechSynthesis inside this user-gesture click.
    operatorRef.current.unlockForIOS();
    // Critical on iPad: await the AudioContext.resume() while we're
    // still inside the user gesture, so the very first speak(intro)
    // below schedules on a running context. Without this, the intro
    // mp3 got queued on a suspended context and came out clipped or
    // silent while the later phase briefings (fired much later, once
    // the context had settled) played fine.
    await audioRef.current.resume();

    // Ambient drone disabled per user request (v8.0-α2) — sounded muddy
    // between voice lines. Voice bus, SFX (strike/chime/gong) and
    // ducking all still work because AudioEngine.init() already built
    // master/voiceBus/voiceDuckGain, independent of the ambient layers.
    audioRef.current.playStrike(0.9);

    // Boot line — ceremonial opener, FIXED text so it can be overridden
    // by /public/audio/voices/premium/opening.mp3 (the "slow" voice the
    // user records manually). Personalization (rank, name, streak) stays
    // visible in the HUD, not spoken.
    operatorRef.current.speak(
      'Sistema en línea. Sincronización completa. Te detecto, Jugador. Hoy es tu día. Doce fases. Una hora y cuarenta y cinco minutos que van a decidir las próximas dieciocho. Vamos a por ellas. Bienvenido.',
      { rate: 0.94 }
    );

    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0, duration: 0.4, onComplete: () => {
          setAppState('MISSION');
          setMissionIndex(0);
          setStartTime(Date.now());
          setSessionXp(0);
          setSkippedPhases([]);
          gsap.to(containerRef.current, { opacity: 1, duration: 0.4 });
        }
      });
    } else {
      setAppState('MISSION');
      setMissionIndex(0);
      setStartTime(Date.now());
      setSessionXp(0);
      setSkippedPhases([]);
    }
  }, [profile, streakData.streak, settings]);

  // ═══════════════ Award XP ═══════════════
  const grantReward = useCallback((missionIdx: number) => {
    const mission = MISSIONS[missionIdx];
    const award = computeReward(mission, streakData.streak);
    const prevLevel = profile.level;
    const updated = applyAward(profile, award, mission);
    setProfile(updated);
    saveProfile(updated);
    setSessionXp(x => x + award.xp);

    // Toast
    setXpToasts(ts => [...ts, {
      id: Date.now() + Math.random(),
      xp: award.xp,
      statName: award.statName,
      statDelta: award.statsDelta[award.statName],
    }]);

    if (updated.level > prevLevel) {
      setLevelUp({ from: prevLevel, to: updated.level });
      audioRef.current?.playGong();
    }
  }, [profile, streakData.streak]);

  // ═══════════════ Mission complete ═══════════════
  const handleMissionComplete = useCallback(() => {
    grantReward(missionIndex);

    const nextIndex = missionIndex + 1;

    if (nextIndex >= MISSIONS.length) {
      audioRef.current?.playGong();
      operatorRef.current?.speak('Protocolo completo. Doce fases ejecutadas. Lo has hecho, Jugador. Ahora el día es tuyo; ya ganaste la parte más difícil. Vive las próximas horas con la calma del que ya entrenó. Nos vemos mañana al amanecer.', { rate: 0.9 });

      const today = getToday();
      const newData: StreakData = {
        streak: streakData.streak + 1,
        completedDays: streakData.completedDays + 1,
        lastCompletedDate: today,
        history: [...streakData.history, today],
      };
      saveStreak(newData);

      // Persist the session for SummaryScreen mini-chart + HistoryScreen.
      const durationSec = startTime > 0 ? Math.floor((Date.now() - startTime) / 1000) : 0;
      const score = computeQualityScore({
        phasesCompleted: MISSIONS.length - skippedPhases.length,
        totalPhases: MISSIONS.length,
        skippedCount: skippedPhases.length,
        durationSec,
        streak: newData.streak,
      });
      appendSession({
        date: today,
        completedAt: Date.now(),
        durationSec,
        score,
        skippedPhases,
        phasesCompleted: MISSIONS.length - skippedPhases.length,
        xp: sessionXp,
        streak: newData.streak,
      });

      if (containerRef.current) {
        gsap.to(containerRef.current, {
          opacity: 0, duration: 0.5, onComplete: () => {
            setAppState('COMPLETE');
            gsap.to(containerRef.current, { opacity: 1, duration: 0.5 });
          }
        });
      } else {
        setAppState('COMPLETE');
      }
    } else {
      audioRef.current?.playChime();

      if (containerRef.current) {
        gsap.to(containerRef.current, {
          opacity: 0, x: -20, duration: 0.3, onComplete: () => {
            setMissionIndex(nextIndex);
            gsap.fromTo(containerRef.current,
              { opacity: 0, x: 20 },
              { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' });
          }
        });
      } else {
        setMissionIndex(nextIndex);
      }
    }
  }, [missionIndex, streakData, saveStreak, grantReward, startTime, skippedPhases, sessionXp]);

  const handleAudioTransition = useCallback(() => {
    audioRef.current?.playTransition();
  }, []);

  const handleProceedToStudy = useCallback(() => {
    audioRef.current?.stopAll();
    operatorRef.current?.cancel();
    setAppState('IDLE');
  }, []);

  const handleReset = useCallback(() => {
    audioRef.current?.stopAll();
    operatorRef.current?.cancel();
    setAppState('IDLE');
    setMissionIndex(0);
  }, []);

  // ═══════════════ Settings handlers ═══════════════
  const handleToggleVoice = useCallback((on: boolean) => {
    const next = { ...settings, voiceEnabled: on };
    setSettings(next);
    persistSettings(next);
    operatorRef.current?.setEnabled(on);
  }, [settings, persistSettings]);

  const handleVolumeChange = useCallback((v: number) => {
    const next = { ...settings, masterVolume: v };
    setSettings(next);
    persistSettings(next);
    audioRef.current?.setMasterVolume(v);
  }, [settings, persistSettings]);

  const handleResetProgress = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PROFILE_KEY);
    } catch { /* ignore */ }
    setStreakData(DEFAULT_STREAK_DATA);
    setProfile(DEFAULT_PROFILE);
    setShowSettings(false);
    setShowOnboarding(true);
    setAppState('IDLE');
    setMissionIndex(0);
  }, []);

  const removeToast = useCallback((id: number) => {
    setXpToasts(ts => ts.filter(t => t.id !== id));
  }, []);

  const totalElapsed = startTime > 0 ? Math.floor((Date.now() - startTime) / 1000) : 0;
  const currentPhase =
    appState === 'COMPLETE' ? MISSIONS.length :
    appState === 'MISSION'  ? missionIndex + 1 : 0;

  // ═══ v8 IDLE: sunrise welcome screen (early return) ═══
  // The dōjō layout below is kept for MISSION / COMPLETE until they
  // are reskinned in Sprint 2. Modals still render here so onboarding,
  // profile and settings keep working from the welcome.
  if (appState === 'IDLE') {
    return (
      <div
        className="w-full relative overflow-hidden"
        style={{ height: '100dvh', minHeight: '-webkit-fill-available', background: 'var(--sunrise-night)' }}
      >
        <WelcomeScreen
          profile={profile}
          streak={streakData.streak}
          onStart={handleInitialize}
          onOpenProfile={() => setShowProfile(true)}
          onOpenSettings={() => setShowSettings(true)}
        />

        {/* Profile modal */}
        {showProfile && (
          <ProfileModal profile={profile} streak={streakData.streak} onClose={() => setShowProfile(false)} />
        )}

        {/* Settings modal */}
        {showSettings && (
          <SettingsModal
            voiceEnabled={settings.voiceEnabled}
            masterVolume={settings.masterVolume}
            onToggleVoice={handleToggleVoice}
            onVolumeChange={handleVolumeChange}
            onClose={() => setShowSettings(false)}
            onResetProgress={handleResetProgress}
          />
        )}

        {/* Onboarding modal (first run) */}
        {showOnboarding && (
          <OnboardingModal onComplete={handleOnboardingComplete} />
        )}
      </div>
    );
  }

  return (
    <div
      className="w-full flex flex-col relative overflow-hidden"
      style={{ height: '100dvh', minHeight: '-webkit-fill-available', background: 'var(--sunrise-night)' }}
    >
      {/* Main Content. Each screen owns its own GradientBackground canvas,
          so no washi-bg / sumi-stroke / vignette chrome is needed here
          anymore. */}
      <div ref={containerRef} className="flex-1 flex flex-col relative z-10 min-h-0 overflow-hidden">
        {/* ═══ MISSION ═══ */}
        {appState === 'MISSION' && (
          <MissionPhaseV8
            key={MISSIONS[missionIndex].id}
            mission={MISSIONS[missionIndex]}
            onComplete={handleMissionComplete}
            audioTransition={handleAudioTransition}
            operator={operatorRef.current}
            onStrike={() => audioRef.current?.playStrike(0.5)}
            onSkipPhase={() => setSkippedPhases((prev) => [...prev, missionIndex])}
          />
        )}

        {/* ═══ COMPLETE ═══ */}
        {appState === 'COMPLETE' && (
          <SummaryScreenV8
            streakData={streakData}
            totalTime={totalElapsed}
            profile={profile}
            sessionXp={sessionXp}
            skippedPhases={skippedPhases}
            totalPhases={MISSIONS.length}
            onProceed={handleProceedToStudy}
          />
        )}
      </div>

      {/* XP toasts */}
      {xpToasts.map(t => (
        <XpGainToast
          key={t.id}
          xp={t.xp}
          statName={t.statName}
          statDelta={t.statDelta}
          onDone={() => removeToast(t.id)}
        />
      ))}

      {/* Level up overlay */}
      {levelUp && (
        <LevelUpOverlay
          previousLevel={levelUp.from}
          newLevel={levelUp.to}
          onDone={() => setLevelUp(null)}
        />
      )}

      {/* Profile modal */}
      {showProfile && (
        <ProfileModal profile={profile} streak={streakData.streak} onClose={() => setShowProfile(false)} />
      )}

      {/* Settings modal */}
      {showSettings && (
        <SettingsModal
          voiceEnabled={settings.voiceEnabled}
          masterVolume={settings.masterVolume}
          onToggleVoice={handleToggleVoice}
          onVolumeChange={handleVolumeChange}
          onClose={() => setShowSettings(false)}
          onResetProgress={handleResetProgress}
        />
      )}

      {/* Onboarding modal (first run) */}
      {showOnboarding && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}
    </div>
  );
}
