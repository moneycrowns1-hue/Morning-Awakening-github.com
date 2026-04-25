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
import SettingsScreen from './SettingsScreen';
import HistoryScreen from './HistoryScreen';
import OnboardingModal from './OnboardingModal';
import WelcomeScreen from './WelcomeScreen';
import { appendSession, computeQualityScore, loadSessions } from '@/lib/sessionHistory';
import { startSilentKeepalive, stopSilentKeepalive } from '@/lib/silentAudioKeepalive';
import { clearMediaSession } from '@/lib/mediaSession';
import {
  evaluateAchievements,
  getDefinition,
  loadUnlocked,
  persistNewlyUnlocked,
} from '@/lib/achievements';
import AchievementToast from './AchievementToast';
import AlarmScreen from './AlarmScreen';
import WonderwakeClockScreen from './WonderwakeClockScreen';
import { consumeHealthHashIfPresent } from '@/lib/healthkitBridge';
import AlarmRingingOverlay from './AlarmRingingOverlay';
import NightProtocolFlow from './NightProtocolFlow';
import { useAlarmController } from '@/lib/useAlarmController';
import { unlockAlarmAudio } from '@/lib/alarmEngine';
import { stopSleepEngine } from '@/lib/sleepEngine';
import { markHabit } from '@/lib/habits';
import NucleusTimelineScreen from './NucleusTimelineScreen';
import NSDRPhaseScreen from './NSDRPhaseScreen';
import CalendarScreen from './CalendarScreen';
import BruxismExerciseScreen from './BruxismExerciseScreen';
import DeepMeditationScreen from './DeepMeditationScreen';
import LymphaticFacialScreen from './LymphaticFacialScreen';
import AppDock, { type DockTab } from './AppDock';
import ProtocolsScreen from './ProtocolsScreen';
import ToolsScreen from './ToolsScreen';
import ProfileTabScreen from './ProfileTabScreen';
import FitnessBridgeScreen from './FitnessBridgeScreen';
import { isHabitDone } from '@/lib/habits';
import { isNucleusWindow } from '@/lib/nucleusConstants';
import { consumeNucleusUrlParam, subscribeToNucleusActions } from '@/lib/nucleusPings';

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
  const [showHistory, setShowHistory] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);
  const [skippedPhases, setSkippedPhases] = useState<number[]>([]);
  const [achievementQueue, setAchievementQueue] = useState<string[]>([]);
  const [showAlarm, setShowAlarm] = useState(false);
  const [showAlarmDetails, setShowAlarmDetails] = useState(false);
  const [showNightMode, setShowNightMode] = useState(false);
  const [showNucleusMode, setShowNucleusMode] = useState(false);
  const [showNSDR, setShowNSDR] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showBruxism, setShowBruxism] = useState(false);
  const [showDeepMeditation, setShowDeepMeditation] = useState(false);
  const [showLymphatic, setShowLymphatic] = useState(false);
  const [showFitnessModal, setShowFitnessModal] = useState(false);
  // Active tab in the AppDock. Always starts on 'home' (no persistence).
  const [activeTab, setActiveTab] = useState<DockTab>('home');

  // Gentle alarm controller — owns AlarmEngine, silent keepalive, wake
  // lock and the ringing overlay state. Config changes persist through
  // the hook itself (saveAlarm inside setConfig).
  const alarm = useAlarmController();

  // If the gentle alarm starts while Night Mode audio is playing,
  // kill the ambient loop so the alarm ramp is clearly audible
  // (otherwise they'd mix and the peak would sound muddy).
  useEffect(() => {
    if (alarm.isRinging) {
      stopSleepEngine();
      setShowNightMode(false);
    }
  }, [alarm.isRinging]);

  const audioRef = useRef<AudioEngine | null>(null);
  const operatorRef = useRef<Operator | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ingest Apple Health data on mount if the URL hash carries a
  // fresh export from the user's Apple Shortcut (see HealthBridgeScreen).
  // This runs before anything else so the HUD badge reflects the
  // correct status without requiring a manual refresh.
  useEffect(() => {
    const snap = consumeHealthHashIfPresent();
    if (snap) {
      // Small non-blocking feedback. The HUD health button will
      // re-read status on next Night screen open.
      try {
        // Optional: could push an XP toast here.
        console.info('[HealthKit] imported', snap.nights.length, 'nights');
      } catch { /* ignore */ }
    }
  }, []);

  // Consume ?nucleus_done= / ?nucleus_open= produced by SW notification
  // taps. If the user opened the timeline from a notification, surface
  // it automatically.
  useEffect(() => {
    const action = consumeNucleusUrlParam();
    if (action?.verb === 'open') {
      setShowNucleusMode(true);
    }
    // Live SW message bridge (already-open tab): same behaviour.
    const unsubscribe = subscribeToNucleusActions((msg) => {
      if (msg.verb === 'open' || msg.verb === 'done') {
        // 'done' already marks the habit inside the helper; we just
        // surface the timeline so the user gets visual confirmation.
        setShowNucleusMode(true);
      }
    });
    return unsubscribe;
  }, []);

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

  // Re-entry guard so a stray double-click or the alarm-dismiss chain
  // racing with the WelcomeScreen Start button can't fire the opener
  // speech twice (which surfaced as "voz de fase 1 duplicada").
  const initializingRef = useRef(false);

  // ═══════════════ Initialize audio + operator ═══════════════
  const handleInitialize = useCallback(async () => {
    if (initializingRef.current) return;
    if (appState !== 'IDLE') return;
    initializingRef.current = true;
    // Release the lock once we've actually left IDLE; the setTimeout
    // gives the GSAP fade-out + setAppState below a chance to run.
    window.setTimeout(() => { initializingRef.current = false; }, 1500);

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

    // Start the silent <audio> keepalive so iOS classifies the page as
    // 'playing media' and shows our Media Session metadata on the lock
    // screen. Must run inside this user gesture — iOS rejects .play()
    // otherwise. No-op on Android / desktop (they handle Media Session
    // regardless, but the element doesn't hurt).
    startSilentKeepalive();

    // Ambient drone disabled per user request (v8.0-α3) — sounded muddy
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
  }, [profile, streakData.streak, settings, appState]);

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
      operatorRef.current?.speak('Protocolo Génesis completo. Trece fases ejecutadas. Lo has hecho, Jugador. Ahora el día es tuyo; ya ganaste la parte más difícil. Vive las próximas horas con la calma del que ya entrenó. Nos vemos mañana al amanecer.', { rate: 0.9 });

      const today = getToday();
      const newData: StreakData = {
        streak: streakData.streak + 1,
        completedDays: streakData.completedDays + 1,
        lastCompletedDate: today,
        history: [...streakData.history, today],
      };
      saveStreak(newData);

      // Habit tracking: morning protocol counts as a day-of-habit.
      try { markHabit('morning_protocol', today); } catch { /* ignore */ }

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

      // Re-evaluate achievements against the *updated* sessions list.
      // Any newly-unlocked ids get persisted and queued for the toast
      // stack the SummaryScreen renders. loadSessions returns the full
      // history including the record we just appended.
      const unlocked = loadUnlocked();
      const freshlyUnlocked = evaluateAchievements(loadSessions(), unlocked);
      if (freshlyUnlocked.length > 0) {
        persistNewlyUnlocked(freshlyUnlocked);
        setAchievementQueue((q) => [...q, ...freshlyUnlocked]);
      }

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
    // Tear down the lock-screen media session + silent keepalive audio
    // once the user returns to IDLE. Mirror of startSilentKeepalive()
    // in handleInitialize.
    clearMediaSession();
    stopSilentKeepalive();
    setAppState('IDLE');
  }, []);

  const handleReset = useCallback(() => {
    audioRef.current?.stopAll();
    operatorRef.current?.cancel();
    clearMediaSession();
    stopSilentKeepalive();
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
      // Also wipe derived state so the fresh profile isn't haunted by
      // old sessions, unlocked achievements or a scheduled reminder.
      localStorage.removeItem('morning-awakening-sessions');
      localStorage.removeItem('morning-awakening-achievements');
      localStorage.removeItem('morning-awakening-reminder');
    } catch { /* ignore */ }
    setStreakData(DEFAULT_STREAK_DATA);
    setProfile(DEFAULT_PROFILE);
    setShowSettings(false);
    setShowOnboarding(true);
    setAppState('IDLE');
    setMissionIndex(0);
    setAchievementQueue([]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setXpToasts(ts => ts.filter(t => t.id !== id));
  }, []);

  // ═══════════════ Alarm dismiss / snooze ═══════════════
  // When the user dismisses the ringing alarm, optionally chain
  // straight into the morning protocol (config.chainProtocol).
  // handleInitialize needs the click to happen inside a user gesture
  // for iOS AudioContext unlock — the dismiss button IS that gesture.
  const handleAlarmDismiss = useCallback(async () => {
    // Unlock the shared AudioContext inside the tap gesture BEFORE
    // any await. iOS needs this or the wake-up stem won't play.
    unlockAlarmAudio();
    const shouldChain = alarm.config.chainProtocol && appState === 'IDLE';
    if (shouldChain) {
      // Close any fullscreens that would mask the protocol start.
      setShowAlarm(false);
      setShowHistory(false);
      setShowSettings(false);
      // Play the wake-up voice stem first (musica principal.mp3 has
      // voice+music mixed in). When it ends, start the protocol.
      await alarm.dismissWithWakeup(() => {
        void handleInitialize();
      });
    } else {
      // No chain → just stop.
      alarm.dismiss();
    }
  }, [alarm, appState]);  // eslint-disable-line react-hooks/exhaustive-deps

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
        {/* Settings takes over the IDLE screen when active (full-page,
            not a modal anymore). Same for History. Both slide-up via
            sunrise-fade-up. Welcome renders otherwise. */}
        {showSettings ? (
          <SettingsScreen
            voiceEnabled={settings.voiceEnabled}
            masterVolume={settings.masterVolume}
            onToggleVoice={handleToggleVoice}
            onVolumeChange={handleVolumeChange}
            onResetProgress={handleResetProgress}
            onClose={() => setShowSettings(false)}
          />
        ) : showHistory ? (
          <HistoryScreen onClose={() => setShowHistory(false)} />
        ) : showAlarm ? (
          showAlarmDetails ? (
            <AlarmScreen
              config={alarm.config}
              onChange={alarm.setConfig}
              onPreview={alarm.preview}
              onFireNow={alarm.fireNow}
              onFireTest={alarm.fireTest}
              onClose={() => setShowAlarmDetails(false)}
            />
          ) : (
            <WonderwakeClockScreen
              alarmConfig={alarm.config}
              onToggleAlarm={(enabled) => alarm.setConfig({ ...alarm.config, enabled })}
              onOpenDetails={() => setShowAlarmDetails(true)}
              onClose={() => { setShowAlarm(false); setShowAlarmDetails(false); }}
            />
          )
        ) : showNightMode ? (
          <NightProtocolFlow
            alarmConfig={alarm.config}
            voiceEnabled={settings.voiceEnabled}
            masterVolume={settings.masterVolume}
            onClose={() => setShowNightMode(false)}
          />
        ) : showNSDR ? (
          <NSDRPhaseScreen
            onComplete={() => setShowNSDR(false)}
            onCancel={() => setShowNSDR(false)}
          />
        ) : showNucleusMode ? (
          <NucleusTimelineScreen
            onClose={() => setShowNucleusMode(false)}
            onLaunchNSDR={() => { setShowNSDR(true); }}
            onLaunchNight={() => { setShowNucleusMode(false); setShowNightMode(true); }}
          />
        ) : showBruxism ? (
          <BruxismExerciseScreen
            onComplete={() => setShowBruxism(false)}
            onCancel={() => setShowBruxism(false)}
          />
        ) : showDeepMeditation ? (
          <DeepMeditationScreen
            onComplete={() => setShowDeepMeditation(false)}
            onCancel={() => setShowDeepMeditation(false)}
          />
        ) : showLymphatic ? (
          <LymphaticFacialScreen
            onComplete={() => setShowLymphatic(false)}
            onCancel={() => setShowLymphatic(false)}
          />
        ) : (
          <>
            {/* ── Tab content (the AppDock at the bottom switches it) ── */}
            {activeTab === 'home' && (
              <WelcomeScreen
                profile={profile}
                streak={streakData.streak}
                onStart={handleInitialize}
                onOpenNightMode={() => setShowNightMode(true)}
                onOpenNucleus={() => setShowNucleusMode(true)}
              />
            )}
            {activeTab === 'protocols' && (
              <ProtocolsScreen
                onLaunchMorning={() => { setActiveTab('home'); void handleInitialize(); }}
                onLaunchNucleus={() => setShowNucleusMode(true)}
                onLaunchNight={() => setShowNightMode(true)}
              />
            )}
            {activeTab === 'tools' && (
              <ToolsScreen
                onLaunchBruxism={() => setShowBruxism(true)}
                onLaunchDeepMeditation={() => setShowDeepMeditation(true)}
                onLaunchLymphatic={() => setShowLymphatic(true)}
                onLaunchNSDR={() => setShowNSDR(true)}
                onOpenAlarm={() => setShowAlarm(true)}
                onOpenFitness={() => setShowFitnessModal(true)}
                alarmArmed={alarm.config.enabled}
              />
            )}
            {activeTab === 'calendar' && (
              <CalendarScreen onClose={() => setActiveTab('home')} />
            )}
            {activeTab === 'profile' && (
              <ProfileTabScreen
                profile={profile}
                streak={streakData.streak}
                onOpenHistory={() => setShowHistory(true)}
                onOpenSettings={() => setShowSettings(true)}
              />
            )}

            {/* ── Bottom dock (always visible on IDLE non-fullscreen) ── */}
            <AppDock
              active={activeTab}
              onChange={setActiveTab}
              protocolsBadge={
                !isHabitDone('morning_protocol') ||
                isNucleusWindow(new Date()) ||
                (new Date().getHours() >= 20 && !isHabitDone('night_protocol'))
              }
              toolsBadge={
                isHabitDone('bruxism_exercise') ||
                isHabitDone('deep_meditation') ||
                isHabitDone('lymphatic_facial')
              }
            />
          </>
        )}

        {/* Apple Fitness modal (opened from Tools tab) */}
        {showFitnessModal && (
          <FitnessBridgeScreen
            mode="connect"
            onClose={() => setShowFitnessModal(false)}
          />
        )}

        {/* Profile modal (stays as overlay since it's quick info) */}
        {showProfile && (
          <ProfileModal profile={profile} streak={streakData.streak} onClose={() => setShowProfile(false)} />
        )}

        {/* Onboarding modal (first run) */}
        {showOnboarding && (
          <OnboardingModal onComplete={handleOnboardingComplete} />
        )}

        {/* Alarm ringing overlay — takes over when the gentle alarm
            actually fires, even if another IDLE full-screen was open. */}
        {alarm.isRinging && (
          <AlarmRingingOverlay
            stage={alarm.stage}
            intensity={alarm.intensity}
            audioStarted={alarm.audioStarted}
            onTapToWake={() => { void alarm.tapToWake(); }}
            onDismiss={handleAlarmDismiss}
            onSnooze={() => alarm.snooze(9)}
            willChainProtocol={alarm.config.chainProtocol}
          />
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

      {/* Profile modal remains accessible during MISSION for a quick
          glance at rank / stats without leaving focus mode. Settings
          and History are hidden here on purpose: they live on IDLE. */}
      {showProfile && (
        <ProfileModal profile={profile} streak={streakData.streak} onClose={() => setShowProfile(false)} />
      )}

      {/* Onboarding modal (first run) */}
      {showOnboarding && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}

      {/* Achievement toast stack — renders in MISSION/COMPLETE only.
          Each toast self-dismisses after ~3.6s and pops itself off the
          queue via onDone. The IDLE branch renders its own copy below
          so unlocks also surface on Welcome (e.g. if the user closes
          and re-opens mid-flow). */}
      {achievementQueue.map((id, i) => {
        const def = getDefinition(id);
        if (!def) return null;
        return (
          <AchievementToast
            key={`${id}-${i}`}
            def={def}
            stackIndex={i}
            onDone={() => setAchievementQueue((q) => q.filter((x, idx) => !(idx === 0 && x === id)))}
          />
        );
      })}

      {/* Alarm ringing overlay — same as IDLE branch, also available
          during MISSION/COMPLETE so an alarm fired mid-protocol or
          post-summary still gets focus. */}
      {alarm.isRinging && (
        <AlarmRingingOverlay
          stage={alarm.stage}
          intensity={alarm.intensity}
          audioStarted={alarm.audioStarted}
          onTapToWake={() => { void alarm.tapToWake(); }}
          onDismiss={handleAlarmDismiss}
          onSnooze={() => alarm.snooze(9)}
          willChainProtocol={alarm.config.chainProtocol}
        />
      )}
    </div>
  );
}
