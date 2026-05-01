'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import gsap from 'gsap';
import {
  MISSIONS,
  type Mission,
  type StreakData,
  DEFAULT_STREAK_DATA,
  getToday,
  isYesterday,
  isToday,
} from '@/lib/genesis/constants';
import { adaptGenesisProtocol, type GenesisAdaptedPlan } from '@/lib/genesis/genesisAdapter';
import { getDayProfile } from '@/lib/common/dayProfile';
import { AudioEngine } from '@/lib/common/audioEngine';
import { Operator } from '@/lib/genesis/operator';
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
} from '@/lib/genesis/progression';
import MissionPhaseV8 from './genesis/MissionPhaseV8';
import SummaryScreenV8 from './genesis/SummaryScreenV8';
import XpGainToast from './common/XpGainToast';
import ProfileModal from './profile/ProfileModal';
import SettingsScreen from './profile/SettingsScreen';
import HistoryScreen from './profile/HistoryScreen';
import OnboardingModal from './profile/OnboardingModal';
import WelcomeScreen from './home/WelcomeScreen';
import MorningCheckInPrompt, { shouldShowMorningCheckIn } from './home/MorningCheckInPrompt';
import { appendSession, computeQualityScore, loadSessions } from '@/lib/genesis/sessionHistory';
import { startSilentKeepalive, stopSilentKeepalive } from '@/lib/common/silentAudioKeepalive';
import { clearMediaSession } from '@/lib/common/mediaSession';
import {
  evaluateAchievements,
  getDefinition,
  loadUnlocked,
  persistNewlyUnlocked,
} from '@/lib/genesis/achievements';
import AchievementToast from './common/AchievementToast';
import MorningRitualScreen from './ritual/MorningRitualScreen';
import MorningRitualOverlay from './ritual/MorningRitualOverlay';
import MorningRitualPrompt from './ritual/MorningRitualPrompt';
import { consumeHealthHashIfPresent, loadHealthSnapshot } from '@/lib/common/healthkitBridge';
import NightProtocolFlow from './night/NightProtocolFlow';
import { useMorningRitual } from '@/lib/ritual/useMorningRitual';
import { unlockRitualAudio } from '@/lib/ritual/ritualEngine';
import { adaptRitualParams } from '@/lib/ritual/ritualAdapter';
import { formatTargetHHMM } from '@/lib/ritual/ritualSchedule';
import { loadCheckIn } from '@/lib/coach/state';
import { stopSleepEngine } from '@/lib/night/sleepEngine';
import { markHabit } from '@/lib/common/habits';
import NucleusTimelineScreen from './nucleus/NucleusTimelineScreen';
import NSDRPhaseScreen from './nucleus/NSDRPhaseScreen';
import CalendarScreen from './calendar/CalendarScreen';
import BruxismExerciseScreen from './wellness/BruxismExerciseScreen';
import DeepMeditationScreen from './wellness/DeepMeditationScreen';
import LymphaticFacialScreen from './wellness/LymphaticFacialScreen';
import CoachScreen from './coach/CoachScreen';
import { type DockTab } from './home/AppDock';
import AppMenu from './home/AppMenu';
import ProtocolsScreen from './home/ProtocolsScreen';
import ToolsScreen from './home/ToolsScreen';
import ProfileTabScreen from './profile/ProfileTabScreen';
import FitnessBridgeScreen from './profile/FitnessBridgeScreen';
import { isHabitDone } from '@/lib/common/habits';
import { isNucleusWindow } from '@/lib/nucleus/nucleusConstants';
import { consumeNucleusUrlParam, subscribeToNucleusActions } from '@/lib/nucleus/nucleusPings';

type AppState = 'IDLE' | 'MISSION' | 'COMPLETE';
const STORAGE_KEY = 'morning-awakening-streak';
const SETTINGS_KEY = 'morning-awakening-settings';

// ── Feature flag ──────────────────────────────────────────────
// La ganancia de XP / subida de nivel / stats por completar fases
// Génesis está desactivada temporalmente. El toast chocaba contra
// el rediseño editorial y el usuario pidió retirarlo hasta tener
// un flujo definitivo. Flip a `true` para reactivar sin tocar nada
// más: grantReward, XpGainToast y todo el pipeline siguen intactos.
const XP_ENABLED = false;

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
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);
  const [skippedPhases, setSkippedPhases] = useState<number[]>([]);
  const [achievementQueue, setAchievementQueue] = useState<string[]>([]);
  // Plan Génesis resuelto al iniciar (snapshot al momento del tap).
  // Si null, se cae al catálogo entero (modo `full`) por compat.
  const [genesisPlan, setGenesisPlan] = useState<GenesisAdaptedPlan | null>(null);
  const [showRitualSettings, setShowRitualSettings] = useState(false);
  const [showNightMode, setShowNightMode] = useState(false);
  const [showNucleusMode, setShowNucleusMode] = useState(false);
  const [showNSDR, setShowNSDR] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showBruxism, setShowBruxism] = useState(false);
  const [showDeepMeditation, setShowDeepMeditation] = useState(false);
  const [showLymphatic, setShowLymphatic] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [showFitnessModal, setShowFitnessModal] = useState(false);
  // Auto-prompt matutino del coach: aparece la primera vez que el
  // usuario abre la app cada mañana (04:00–11:00) si todavía no
  // marcó check-in. Sustituye al saludo automático inexistente
  // hasta que el puente con Apple Health/Fitness esté listo.
  const [showMorningCheckIn, setShowMorningCheckIn] = useState(false);
  // Active tab in the AppMenu. Always starts on 'home' (no persistence).
  const [activeTab, setActiveTab] = useState<DockTab>('home');
  // Whether the fullscreen overlay menu is open.
  const [menuOpen, setMenuOpen] = useState(false);

  // Disparar el check-in matutino al montar (sólo en cliente, sólo
  // si pasamos los gates de hora + flag + check-in ausente).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (shouldShowMorningCheckIn()) {
      setShowMorningCheckIn(true);
    }
  }, []);

  // Morning ritual controller — NO timer, NO wake lock, NO keepalive.
  // Only fires when the user explicitly opens it. Persistence is
  // handled inside the hook (saveRitual on setConfig + push sync).
  const ritual = useMorningRitual();

  // If the ritual starts while Night Mode audio is playing,
  // kill the ambient loop so the ramp is clearly audible.
  useEffect(() => {
    if (ritual.isRunning) {
      stopSleepEngine();
      setShowNightMode(false);
    }
  }, [ritual.isRunning]);

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

  // ==============================================================
  // Génesis adapter · resuelve el plan al momento del tap del botón.
  // Mismo patrón que el ritual matutino: snapshot al iniciar, sin
  // recomputar mientras el flow corre. Persiste el override per-día.
  // ==============================================================
  const buildGenesisPlan = useCallback((): GenesisAdaptedPlan => {
    let userOverride: GenesisAdaptedPlan['mode'] | null = null;
    try {
      const today = getToday();
      const raw = window.localStorage.getItem(`ma-genesis-mode-day-${today}`);
      if (raw === 'full' || raw === 'express' || raw === 'recovery') {
        userOverride = raw;
      }
    } catch { /* ignore */ }
    return adaptGenesisProtocol({
      now: new Date(),
      health: loadHealthSnapshot(),
      checkIn: loadCheckIn(),
      dayProfile: getDayProfile(),
      userOverride,
    });
  }, []);

  // Tick que se incrementa cuando el usuario cambia el override
  // manual de modo Génesis desde la Welcome. Sirve para forzar el
  // re-cálculo de `previewPlan` ya que `buildGenesisPlan` lee la
  // localStorage y no es reactivo por sí mismo.
  const [genesisOverrideTick, setGenesisOverrideTick] = useState(0);

  // Override actual guardado en localStorage (re-leído cada render
  // mientras estamos en IDLE). Pasa al WelcomeScreen para que el
  // chip activo se pinte correctamente.
  const genesisOverride = (() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(`ma-genesis-mode-day-${getToday()}`);
      if (raw === 'full' || raw === 'express' || raw === 'recovery') return raw;
    } catch { /* ignore */ }
    return null;
  })();

  // Persistencia + tick para que el preview se recompute al instante.
  const handleSetGenesisMode = useCallback((mode: 'full' | 'express' | 'recovery' | null) => {
    try {
      const key = `ma-genesis-mode-day-${getToday()}`;
      if (mode === null) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, mode);
      }
    } catch { /* ignore */ }
    setGenesisOverrideTick((t) => t + 1);
  }, []);

  // Plan visible para la WelcomeScreen (preview del adapter sin
  // arrancar todavía). Recomputa cuando el usuario vuelve a IDLE
  // o cuando cambia el override manual (vía tick).
  void genesisOverrideTick; // referenciado en deps implícitas del render
  const previewPlan = appState === 'IDLE' ? buildGenesisPlan() : null;

  // Sesión actual: missions a usar y conteo total. Si no hay plan
  // (camino legacy / primer mount) cae al catálogo completo.
  const sessionMissions: Mission[] = genesisPlan?.missions ?? MISSIONS;
  const sessionTotalPhases = sessionMissions.length;

  // ============= Initialize audio + operator =============
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
    // Resolver el plan Génesis ANTES de cualquier await: necesitamos
    // el snapshot del modo / fases para esta sesión. Es pure y barato.
    const plan = buildGenesisPlan();
    setGenesisPlan(plan);

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
    // Mensaje de apertura adaptado al modo elegido por el adapter:
    // 'full' menciona la duración aproximada, mientras que express y
    // recovery la omiten (sus duraciones varían y no aporta a la
    // narrativa). El número de fases lo calcula el plan en vivo.
    const totalPhasesNow = plan.missions.length;
    const totalSecondsNow = plan.totalSec;
    const totalMinutes = Math.round(totalSecondsNow / 60);
    const openerLine = plan.mode === 'full'
      ? `Sistema en línea. Sincronización completa. Te detecto, Jugador. Hoy es tu día. ${totalPhasesNow} fases. Aproximadamente ${totalMinutes} minutos que van a decidir las próximas dieciocho horas. Vamos a por ellas. Bienvenido.`
      : `Sistema en línea. Sincronización completa. Te detecto, Jugador. Hoy vamos en modo ${plan.mode === 'express' ? 'express' : 'recovery'}: ${totalPhasesNow} fases esenciales en aproximadamente ${totalMinutes} minutos. Lo importante es presentarte. Bienvenido.`;
    operatorRef.current.speak(openerLine, { rate: 0.94 });

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
  }, [profile, streakData.streak, settings, appState, buildGenesisPlan]);

  // =============== Award XP ===============
  const grantReward = useCallback((missionIdx: number) => {
    // Feature-flagged off: conserva progresión en localStorage pero
    // no suma XP ni muestra el toast mientras rediseñamos el sistema.
    if (!XP_ENABLED) return;
    const mission = sessionMissions[missionIdx];
    if (!mission) return;
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

    // El "Modo Ascenso" (LevelUpOverlay) se retiró: estaba bugueado y
    // con el diseño viejo. El gong de subida de nivel se mantiene
    // como feedback auditivo mínimo hasta que se rediseñe el flujo.
    if (updated.level > prevLevel) {
      audioRef.current?.playGong();
    }
  }, [profile, streakData.streak, sessionMissions]);

  // =============== Mission complete ===============
  const handleMissionComplete = useCallback(() => {
    grantReward(missionIndex);

    const nextIndex = missionIndex + 1;

    if (nextIndex >= sessionTotalPhases) {
      audioRef.current?.playGong();
      // Mensaje de cierre adaptado: cantidad de fases real, no hardcoded.
      const closingLine = sessionTotalPhases >= MISSIONS.length
        ? 'Protocolo Génesis completo. Trece fases ejecutadas. Lo has hecho, Jugador. Ahora el día es tuyo; ya ganaste la parte más difícil. Vive las próximas horas con la calma del que ya entrenó. Nos vemos mañana al amanecer.'
        : `Protocolo Génesis completo. ${sessionTotalPhases} fases ejecutadas. Lo has hecho, Jugador. Ahora el día es tuyo; ya ganaste la parte más difícil. Vive las próximas horas con la calma del que ya entrenó. Nos vemos mañana al amanecer.`;
      operatorRef.current?.speak(closingLine, { rate: 0.9 });

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
        phasesCompleted: sessionTotalPhases - skippedPhases.length,
        totalPhases: sessionTotalPhases,
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
        phasesCompleted: sessionTotalPhases - skippedPhases.length,
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
  }, [missionIndex, streakData, saveStreak, grantReward, startTime, skippedPhases, sessionXp, sessionTotalPhases]);

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

  // ═══════════════ Ritual lifecycle ═══════════════
  // Cuando el ritual termina (botón "comenzar Génesis" o "cerrar
  // ritual" del overlay), opcionalmente encadena Génesis. El click
  // ES el gesto que iOS necesita para destrabar audio del wakeup.
  const handleRitualClose = useCallback(async () => {
    unlockRitualAudio();
    const shouldChain = ritual.config.chainProtocol && appState === 'IDLE';
    if (shouldChain) {
      setShowRitualSettings(false);
      setShowHistory(false);
      setShowSettings(false);
      await ritual.dismissWithWakeup(() => {
        void handleInitialize();
      });
    } else {
      ritual.dismiss();
    }
  }, [ritual, appState]);  // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════════════ Adaptive params + start ═══════════════
  // Centraliza la lógica de "qué parámetros pasar al ritual"
  // leyendo health + signals para adaptar ramp / volumen / tono.
  const buildAdaptiveParams = useCallback(() => {
    const health = loadHealthSnapshot();
    const checkIn = loadCheckIn();
    return adaptRitualParams(ritual.config, health, checkIn?.stress ?? null);
  }, [ritual.config]);

  // Start del ritual desde un gesto del usuario (banner del welcome
  // o botón "comenzar ahora" de la pantalla de config).
  const handleStartRitual = useCallback(() => {
    const params = buildAdaptiveParams();
    void ritual.start(params);
  }, [ritual, buildAdaptiveParams]);

  const totalElapsed = startTime > 0 ? Math.floor((Date.now() - startTime) / 1000) : 0;
  const currentPhase =
    appState === 'COMPLETE' ? sessionTotalPhases :
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
        ) : showRitualSettings ? (
          <MorningRitualScreen
            config={ritual.config}
            onChange={ritual.setConfig}
            onPreview={ritual.preview}
            onStartNow={handleStartRitual}
            onClose={() => setShowRitualSettings(false)}
          />
        ) : showNightMode ? (
          <NightProtocolFlow
            alarmConfig={ritual.config}
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
        ) : showCoach ? (
          <CoachScreen onClose={() => setShowCoach(false)} />
        ) : showCalendar ? (
          <CalendarScreen onClose={() => setShowCalendar(false)} />
        ) : (
          <>
            {/* ── Tab content (the AppDock at the bottom switches it) ── */}
            {activeTab === 'home' && (
              <div className="w-full h-full flex flex-col">
                {/* Prompt del ritual matutino — sólo visible dentro de
                    la ventana ±60/90min del target, y mientras el
                    ritual no esté ya corriendo. Tap arranca el audio
                    desde el gesto del usuario (única vía iOS-segura). */}
                {ritual.shouldOffer && !ritual.isRunning && (
                  <MorningRitualPrompt
                    targetHHMM={formatTargetHHMM(ritual.config)}
                    rationale={buildAdaptiveParams().rationale || undefined}
                    onStart={handleStartRitual}
                  />
                )}
                <div className="flex-1 min-h-0">
                  <WelcomeScreen
                    profile={profile}
                    streak={streakData.streak}
                    onStart={handleInitialize}
                    onOpenNightMode={() => setShowNightMode(true)}
                    onOpenNucleus={() => setShowNucleusMode(true)}
                    onOpenCoach={() => setShowCoach(true)}
                    onOpenCalendar={() => setShowCalendar(true)}
                    adaptiveHint={previewPlan?.rationale || undefined}
                    adaptiveMode={previewPlan?.mode}
                    onSetGenesisMode={handleSetGenesisMode}
                    genesisOverride={genesisOverride}
                  />
                </div>
              </div>
            )}
            {activeTab === 'protocols' && (
              <ProtocolsScreen
                onLaunchMorning={() => { setActiveTab('home'); void handleInitialize(); }}
                onLaunchNucleus={() => setShowNucleusMode(true)}
                onLaunchNight={() => setShowNightMode(true)}
                onLaunchCoach={() => setShowCoach(true)}
              />
            )}
            {activeTab === 'tools' && (
              <ToolsScreen
                onLaunchBruxism={() => setShowBruxism(true)}
                onLaunchDeepMeditation={() => setShowDeepMeditation(true)}
                onLaunchLymphatic={() => setShowLymphatic(true)}
                onLaunchNSDR={() => setShowNSDR(true)}
                onLaunchCoach={() => setShowCoach(true)}
                onOpenAlarm={() => setShowRitualSettings(true)}
                onOpenFitness={() => setShowFitnessModal(true)}
                alarmArmed={ritual.config.enabled}
              />
            )}
            {activeTab === 'profile' && (
              <ProfileTabScreen
                profile={profile}
                streak={streakData.streak}
                onOpenHistory={() => setShowHistory(true)}
                onOpenSettings={() => setShowSettings(true)}
              />
            )}

            {/* ── Fullscreen overlay menu (replaces the bottom dock) ── */}
            <AppMenu
              open={menuOpen}
              active={activeTab}
              onOpenChange={setMenuOpen}
              onChange={setActiveTab}
              profile={profile}
              streak={streakData.streak}
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

        {/* Auto check-in matutino · primer open del día en ventana 04–11h.
            Sustituye al saludo automático hasta que el puente Health
            quede operativo. Persiste vía updateCheckIn(). */}
        {showMorningCheckIn && appState === 'IDLE' && !ritual.isRunning && !showOnboarding && (
          <MorningCheckInPrompt onDone={() => setShowMorningCheckIn(false)} />
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

        {/* Ritual overlay — takes over when the user starts the
            morning ritual, even if another IDLE full-screen was open. */}
        {ritual.isRunning && (
          <MorningRitualOverlay
            stage={ritual.stage}
            intensity={ritual.intensity}
            audioStarted={ritual.audioStarted}
            onTapToWake={() => { void ritual.tapToWake(); }}
            onClose={handleRitualClose}
            willChainProtocol={ritual.config.chainProtocol}
            rationale={buildAdaptiveParams().rationale || undefined}
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
        {/* === MISSION === */}
        {appState === 'MISSION' && sessionMissions[missionIndex] && (
          <MissionPhaseV8
            key={sessionMissions[missionIndex].id}
            mission={sessionMissions[missionIndex]}
            totalPhases={sessionTotalPhases}
            phaseDisplay={missionIndex + 1}
            onComplete={handleMissionComplete}
            audioTransition={handleAudioTransition}
            operator={operatorRef.current}
            onStrike={() => audioRef.current?.playStrike(0.5)}
            onSkipPhase={() => setSkippedPhases((prev) => [...prev, missionIndex])}
            onOpenCoach={() => setShowCoach(true)}
          />
        )}

        {/* === COMPLETE === */}
        {appState === 'COMPLETE' && (
          <SummaryScreenV8
            streakData={streakData}
            totalTime={totalElapsed}
            profile={profile}
            sessionXp={sessionXp}
            skippedPhases={skippedPhases}
            totalPhases={sessionTotalPhases}
            onProceed={handleProceedToStudy}
          />
        )}
      </div>

      {/* XP toasts · gated por XP_ENABLED (off temporal) */}
      {XP_ENABLED && xpToasts.map(t => (
        <XpGainToast
          key={t.id}
          xp={t.xp}
          statName={t.statName}
          statDelta={t.statDelta}
          onDone={() => removeToast(t.id)}
        />
      ))}

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

      {/* Ritual overlay — same as IDLE branch, also available
          during MISSION/COMPLETE in the rare case the user starts
          the ritual right when Génesis is closing. */}
      {ritual.isRunning && (
        <MorningRitualOverlay
          stage={ritual.stage}
          intensity={ritual.intensity}
          audioStarted={ritual.audioStarted}
          onTapToWake={() => { void ritual.tapToWake(); }}
          onClose={handleRitualClose}
          willChainProtocol={ritual.config.chainProtocol}
          rationale={buildAdaptiveParams().rationale || undefined}
        />
      )}
    </div>
  );
}
