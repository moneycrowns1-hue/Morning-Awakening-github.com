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
  getRankByLevel,
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
  const [idleText, setIdleText] = useState('');
  const [showIdleButton, setShowIdleButton] = useState(false);
  const [xpToasts, setXpToasts] = useState<XpToastData[]>([]);
  const [levelUp, setLevelUp] = useState<{ from: number; to: number } | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);

  const audioRef = useRef<AudioEngine | null>(null);
  const operatorRef = useRef<Operator | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const idleButtonRef = useRef<HTMLButtonElement>(null);

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

  // ═══════════════ Idle typewriter ═══════════════
  useEffect(() => {
    if (appState !== 'IDLE') return;
    const text = 'PROTOCOLO v5.0 · 12 FASES · 3 BLOQUES · 5:00–6:45 AM · ESPERANDO AL OPERADOR…';
    let i = 0;
    setIdleText('');
    setShowIdleButton(false);
    const interval = setInterval(() => {
      if (i <= text.length) {
        setIdleText(text.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => setShowIdleButton(true), 400);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [appState]);

  // ═══════════════ Idle button entrance ═══════════════
  useEffect(() => {
    if (showIdleButton && idleButtonRef.current) {
      gsap.fromTo(idleButtonRef.current,
        { scale: 0.72, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(1.4)' });
    }
  }, [showIdleButton]);

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
  const handleInitialize = useCallback(() => {
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

    const firstMission = MISSIONS[0];
    audioRef.current.startAmbient(firstMission.layer);
    audioRef.current.playStrike(0.9);

    // Boot line
    const rank = getRankByLevel(profile.level);
    const streakPart = streakData.streak > 0
      ? ` Racha de ${streakData.streak} días.`
      : '';
    operatorRef.current.speak(
      `Sistema en línea. ${rank.titleEs} ${profile.name} detectado.${streakPart}`,
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
      operatorRef.current?.speak('Protocolo completo. El día es tuyo, Operador.', { rate: 0.9 });

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
      // Transition to next layer if changes
      const next = MISSIONS[nextIndex];
      const current = MISSIONS[missionIndex];
      audioRef.current?.playChime();
      if (next.layer !== current.layer) {
        audioRef.current?.switchLayer(next.layer, 4);
      }

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

      {/* Giant kanji watermark during IDLE */}
      {appState === 'IDLE' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="kanji-watermark" style={{ fontSize: 'min(62vw, 62vh)' }}>道</span>
        </div>
      )}

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
        {/* ═══ IDLE ═══ */}
        {appState === 'IDLE' && (
          <div
            className="scroll-area flex-1 flex flex-col items-center px-6 min-h-0"
            style={{
              paddingTop: '1.5rem',
              paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))',
              /* Centers content when it fits the viewport, but when it
                 overflows the top remains reachable by scroll. */
              justifyContent: 'safe center',
            }}
          >
            {/* Operator HUD (rank + xp) */}
            <div className="w-full max-w-sm mb-4">
              <OperatorHUD profile={profile} onOpenProfile={() => setShowProfile(true)} />
            </div>

            <div
              className="text-[12px] tracking-[0.6em] mb-4 opacity-50"
              style={{ color: '#c9a227' }}
            >
              ◇ 道場 · PROTOCOLO MATUTINO ◇
            </div>

            <h1
              className="text-3xl md:text-4xl font-bold mb-2 text-center animate-flicker"
              style={{
                color: '#e8dcc4',
                fontFamily: 'var(--font-cinzel), Georgia, serif',
                letterSpacing: '0.15em',
                textShadow: '0 0 18px rgba(201,162,39,0.25)',
              }}
            >
              MORNING AWAKENING
            </h1>

            <div className="text-[12px] tracking-[0.4em] mb-6" style={{ color: 'rgba(232,220,196,0.35)' }}>
              v5.0 · DŌJŌ OPERATOR
            </div>

            {/* Mission preview kanji strip */}
            <div className="w-full max-w-sm mb-5">
              <div className="grid grid-cols-6 gap-1 text-center">
                {MISSIONS.map(m => (
                  <div key={m.id} className="flex flex-col items-center">
                    <span
                      className="text-lg"
                      style={{
                        color: 'rgba(201,162,39,0.35)',
                        fontFamily: '"Hiragino Mincho ProN","Noto Serif JP",serif',
                      }}
                    >
                      {m.kanji}
                    </span>
                    <span className="text-[9px] tracking-widest mt-0.5" style={{ color: 'rgba(232,220,196,0.28)' }}>
                      {m.codename.slice(0, 4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Boot sequence */}
            <div className="w-full max-w-md mb-8">
              <div
                className="p-4 rounded hud-frame hud-frame-bottom"
                style={{
                  border: '1px solid rgba(201,162,39,0.15)',
                  background: 'rgba(201,162,39,0.03)',
                }}
              >
                <div className="text-[14px] leading-relaxed tracking-wide" style={{ color: 'rgba(232,220,196,0.75)' }}>
                  <span style={{ color: 'rgba(201,162,39,0.5)' }}>{'>'} </span>
                  {idleText}
                  {idleText.length < 75 && (
                    <span className="animate-pulse" style={{ color: '#c9a227' }}>█</span>
                  )}
                </div>
              </div>
            </div>

            {/* Initialize button */}
            {showIdleButton && (
              <button
                ref={idleButtonRef}
                onClick={handleInitialize}
                className="relative w-48 h-48 group"
                id="init-button"
              >
                <div
                  className="absolute inset-0 rounded-full animate-ring-pulse"
                  style={{ border: '1px solid rgba(201,162,39,0.25)' }}
                />
                <div
                  className="absolute inset-2 rounded-full"
                  style={{ border: '1px solid rgba(201,162,39,0.15)' }}
                />
                <div
                  className="absolute inset-5 rounded-full flex flex-col items-center justify-center transition-all duration-300 animate-ember-pulse group-hover:brightness-125"
                  style={{
                    background: 'rgba(201,162,39,0.06)',
                    border: '1px solid rgba(201,162,39,0.4)',
                  }}
                >
                  <div
                    className="text-5xl mb-1"
                    style={{
                      color: '#bc002d',
                      fontFamily: '"Hiragino Mincho ProN","Noto Serif JP",serif',
                      textShadow: '0 0 12px rgba(188,0,45,0.4)',
                    }}
                  >
                    始
                  </div>
                  <span
                    className="text-[13px] tracking-[0.25em] font-bold"
                    style={{ color: '#c9a227', fontFamily: 'var(--font-cinzel), Georgia, serif' }}
                  >
                    INICIAR
                  </span>
                  <span className="text-[10px] tracking-[0.2em] mt-1" style={{ color: 'rgba(201,162,39,0.5)' }}>
                    05:00 PROTOCOL
                  </span>
                </div>
              </button>
            )}
          </div>
        )}

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
          <span>MORNING:AWAKENING · v7.4</span>
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
