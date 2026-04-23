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
import StatusBar from './StatusBar';
import MissionPhase from './MissionPhase';
import SummaryScreen from './SummaryScreen';
import OperatorHUD from './OperatorHUD';
import XpGainToast from './XpGainToast';
import LevelUpOverlay from './LevelUpOverlay';
import ProfileModal from './ProfileModal';
import SettingsModal from './SettingsModal';
import OnboardingModal from './OnboardingModal';
import WelcomeScreen from './WelcomeScreen';
import { Target } from 'lucide-react';

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

    // Ambient drone disabled per user request (v8.0-α1) — sounded muddy
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
          gsap.to(containerRef.current, { opacity: 1, duration: 0.4 });
        }
      });
    } else {
      setAppState('MISSION');
      setMissionIndex(0);
      setStartTime(Date.now());
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
  }, [missionIndex, streakData, saveStreak, grantReward]);

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
      className="w-full flex flex-col relative overflow-hidden washi-bg"
      style={{ height: '100dvh', minHeight: '-webkit-fill-available' }}
    >
      {/* Decorative sumi-e brushstrokes */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 400 800"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M -20 120 Q 80 60, 180 140 T 440 180"
          stroke="#c9a227"
          strokeWidth="1.5"
          fill="none"
          className="sumi-stroke"
          style={{ opacity: 0.12 }}
        />
        <path
          d="M 420 620 Q 300 560, 200 640 T -20 680"
          stroke="#bc002d"
          strokeWidth="1.2"
          fill="none"
          className="sumi-stroke"
          style={{ opacity: 0.1, animationDelay: '0.6s' }}
        />
      </svg>

      {/* Warm vignette */}
      <div className="absolute inset-0 pointer-events-none vignette-warm" />

      {/* Status Bar */}
      <StatusBar
        streak={streakData.streak}
        currentPhase={currentPhase}
        totalPhases={MISSIONS.length}
        onOpenSettings={() => setShowSettings(true)}
        voiceEnabled={settings.voiceEnabled}
      />

      {/* Main Content */}
      {/* min-h-0 + overflow-hidden here is CRITICAL: without them, a flex-1
          child will grow to fit its content (not shrink to parent), which
          breaks any inner overflow-y-auto scroll container. */}
      <div ref={containerRef} className="flex-1 flex flex-col relative z-10 min-h-0 overflow-hidden">
        {/* IDLE handled by the v8 WelcomeScreen early-return above. */}

        {/* ═══ MISSION ═══ */}
        {appState === 'MISSION' && (
          <MissionPhase
            key={MISSIONS[missionIndex].id}
            mission={MISSIONS[missionIndex]}
            onComplete={handleMissionComplete}
            audioTransition={handleAudioTransition}
            operator={operatorRef.current}
            onStrike={() => audioRef.current?.playStrike(0.5)}
          />
        )}

        {/* ═══ COMPLETE ═══ */}
        {appState === 'COMPLETE' && (
          <SummaryScreen
            streakData={streakData}
            totalTime={totalElapsed}
            profile={profile}
            sessionXp={sessionXp}
            onProceed={handleProceedToStudy}
          />
        )}
      </div>

      {/* Bottom system bar */}
      <div className="px-4 py-3 pb-[env(safe-area-inset-bottom,12px)] relative z-10">
        <div
          className="h-px mb-2"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(201,162,39,0.25), transparent)' }}
        />
        <div className="flex justify-between text-[11px] tracking-[0.25em]" style={{ color: 'rgba(232,220,196,0.25)' }}>
          <span>MORNING:AWAKENING · v8.0-α1</span>
          {appState === 'COMPLETE' && (
            <button
              onClick={handleReset}
              className="hover:brightness-150 transition"
              style={{ color: 'rgba(201,162,39,0.55)' }}
            >
              RESET
            </button>
          )}
          <span style={{ color: 'rgba(188,0,45,0.6)' }} className="inline-flex items-center gap-1.5">
            <Target size={12} strokeWidth={2} />
            {profile.name.toUpperCase()}
          </span>
        </div>
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
