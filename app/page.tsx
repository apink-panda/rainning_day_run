'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CloudRain, Footprints, Heart, Info, LogOut, Medal, Music, RotateCcw, Timer, Trophy, Volume2, VolumeX, X, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { audioManager } from '@/lib/audioManager';
import { getAssetPath } from '@/lib/assetHelper';
import {
  ApinkTrack,
  pickRoundWithLuckySong,
  pickRoundSongs,
  getSongBonusPercent,
  getYoutubeThumbnail,
} from './data/apinkTracks';

type Panda = { id: string; name: string; color: string; pale: string; sheet: string; footInsets: readonly number[] };
type Obstacle = { id: number; kind: 'puddle' | 'rock' | 'wide'; x: number; width: number; settled: boolean; engaged: boolean; flipped: boolean };
type LeaderboardEntry = { handle: string; score: number; panda: string; rank?: number };
type WebGameContext = { registerTool: (tool: { name: string; title: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => unknown }, options?: { signal?: AbortSignal }) => void | Promise<void> };
type Weather = 'day' | 'sunset' | 'storm' | 'night';
type PickupKind = 'shield' | 'heal' | 'rainbow' | 'star';
type Pickup = { id: number; kind: PickupKind; x: number; y: number; collected: boolean };
type LetterPickup = { id: number; char: string; songIndex: number; letterIndex: number; x: number; y: number; collected: boolean };
type Wave = { id: number; name: string; speedMultiplier: number; spawnInterval: number; title: string; subtitle: string; icon: string };

const pandas: Panda[] = [
  // Per-frame footInsets match each sheet's transparent space below the visible feet at the 148px game size.
  { id: 'enji', name: 'MEUNGDOONG', color: '#58bff5', pale: '#dff4ff', sheet: getAssetPath('/enji-run-jump-v11.png'), footInsets: [0, 0, 0, 0, 0, 7, 6, 8, 7, 7] },
  { id: 'chorong', name: 'RONGDOONG', color: '#f39ab5', pale: '#ffe5ed', sheet: getAssetPath('/chorong-run-jump-v3.png'), footInsets: [2, 3, 0, 6, 0, 10, 11, 15, 9, 10] },
  { id: 'najoo', name: 'JOODOONG', color: '#ae85d5', pale: '#f1e7fb', sheet: getAssetPath('/najoo-run-jump-v1.png'), footInsets: [3, 2, 0, 0, 2, 7, 7, 14, 9, 8] },
  { id: 'bomi', name: 'BOMDOONG', color: '#f4aa38', pale: '#fff0d3', sheet: getAssetPath('/bomi-run-jump-v1.png'), footInsets: [3, 2, 0, 11, 3, 7, 7, 14, 12, 5] },
  { id: 'hayoung', name: 'BANGDOONG', color: '#f3ce42', pale: '#fff7cf', sheet: getAssetPath('/hayoung-run-jump-final.png'), footInsets: [9, 8, 0, 15, 8, 11, 7, 28, 17, 11] },
];

const BASE_WAVES: Wave[] = [
  { id: 1, name: 'Wave 1', speedMultiplier: 1.0, spawnInterval: 2200, title: 'WAVE 1', subtitle: '舒爽起跑', icon: '🌧️' },
  { id: 2, name: 'Wave 2', speedMultiplier: 1.25, spawnInterval: 1950, title: 'SPEED UP!', subtitle: 'WAVE 2 · 步頻加快', icon: '⚡' },
  { id: 3, name: 'Wave 3', speedMultiplier: 1.5, spawnInterval: 1750, title: 'HEAVY RAIN!', subtitle: 'WAVE 3 · 暴風疾馳', icon: '⛈️' },
  { id: 4, name: 'Wave 4', speedMultiplier: 1.75, spawnInterval: 1600, title: 'STORM RUSH!', subtitle: 'WAVE 4 · 極限狂奔', icon: '🔥' },
  { id: 5, name: 'Wave 5', speedMultiplier: 2.0, spawnInterval: 1480, title: 'HYPER DASH!', subtitle: 'WAVE 5 · 音速突圍', icon: '🚀' },
  { id: 6, name: 'Wave 6', speedMultiplier: 2.25, spawnInterval: 1380, title: 'SONIC RAIN!', subtitle: 'WAVE 6 · 狂暴穿梭', icon: '🌪️' },
  { id: 7, name: 'Wave 7', speedMultiplier: 2.5, spawnInterval: 1300, title: 'METEOR SPEED!', subtitle: 'WAVE 7 · 流星神速', icon: '🌠' },
  { id: 8, name: 'Wave 8', speedMultiplier: 2.75, spawnInterval: 1240, title: 'APINK OVERDRIVE!', subtitle: 'WAVE 8 · 超越極限', icon: '👑' },
];

function getWaveIcon(waveId: number): string {
  const icons = ['🌧️', '⚡', '⛈️', '🔥', '🚀', '🌪️', '🌠', '👑'];
  return icons[(Math.max(1, waveId) - 1) % icons.length];
}

function getWave(elapsedMs: number): Wave {
  const s = elapsedMs / 1000;
  let waveId = 1;
  if (s < 16) {
    waveId = 1;
  } else if (s < 34) {
    waveId = 2;
  } else if (s < 54) {
    waveId = 3;
  } else if (s < 76) {
    waveId = 4;
  } else if (s < 100) {
    waveId = 5;
  } else if (s < 126) {
    waveId = 6;
  } else if (s < 154) {
    waveId = 7;
  } else if (s < 184) {
    waveId = 8;
  } else {
    // Wave 9, 10, 11, ... continues advancing infinitely every 28 seconds!
    waveId = 9 + Math.floor((s - 184) / 28);
  }

  if (waveId <= BASE_WAVES.length) {
    return BASE_WAVES[waveId - 1];
  }

  // Infinite wave progression beyond Wave 8:
  const extra = waveId - 8;
  const speedMultiplier = 2.75 + extra * 0.25;
  const spawnInterval = Math.max(1100, 1240 - extra * 25);
  const icon = getWaveIcon(waveId);

  return {
    id: waveId,
    name: `Wave ${waveId}`,
    speedMultiplier,
    spawnInterval,
    title: `LEVEL UP! WAVE ${waveId}`,
    subtitle: `速度加乘 ×${speedMultiplier.toFixed(2)} · 巔峰挑戰`,
    icon,
  };
}

function getWeather(elapsedMs: number): Weather {
  const cycle = (elapsedMs / 1000) % 88;
  if (cycle < 22) return 'day';
  if (cycle < 44) return 'sunset';
  if (cycle < 68) return 'storm';
  return 'night';
}

const weatherLabels: Record<Weather, { name: string; icon: string }> = {
  day: { name: '白天下雨', icon: '🌦️' },
  sunset: { name: '夕暮微雨', icon: '🌅' },
  storm: { name: '狂風暴雨', icon: '⛈️' },
  night: { name: '霓虹夜雨', icon: '🌙' },
};

const BASE_OBSTACLE_SPEED = 0.028;

function calculateObstacleSpeed(elapsedMs: number, isRainbow: boolean) {
  const s = elapsedMs / 1000;
  const wave = getWave(elapsedMs);
  // Strictly monotonic speed multiplier that stacks continuously without any drops or resets:
  // Base tier starts at 1.0x, smoothly ramping by ~0.0135x per second and stepping up on wave milestones
  let mult = Math.max(wave.speedMultiplier, 1.0 + s * 0.0135);
  if (isRainbow) mult *= 1.15;
  return BASE_OBSTACLE_SPEED * mult;
}

const GAME_SECONDS = 45;
const jumpFrames = [5, 5, 6, 6, 7, 7, 7, 8, 8, 9];
const flipFrames = [5, 6, 7, 8, 9, 8, 7, 6];
const bomiFlipFrames = [6, 6, 7, 7, 7, 7, 7, 8];
const flipAngles = [0, 48, 98, 154, 210, 266, 316, 360];
const bomiFlipOffsets: Record<number, readonly [number, number]> = {
  // Align Bomi's visible body center to the runner's 50%/55% rotation axis.
  5: [-5, -2],
  6: [-14, 0],
  7: [3, 19],
  8: [-4, 8],
  9: [-9, 2],
};
const DOUBLE_TAP_WINDOW = 360;
const FLIP_ANIMATION_MS = 620;
const FLIP_AIRTIME_BONUS = 360;
const FOOT_LEFT = 23.5;
const FOOT_RIGHT = 31.5;
const MIN_VISIBLE_FOOT_CLEARANCE = 36;
const ROCK_FOOT_CLEARANCE = 58;
const WIDE_FLIP_CLEARANCE = 24;
const WIDE_LANDING_GRACE_MS = 120;
const HURT_EXPRESSION_MS = 720;
const INVULNERABLE_MS = 2400;
const LEADERBOARD_STORAGE_KEY = 'panda_rain_leaderboard_v1';
const LEADERBOARD_HANDLE_KEY = 'panda_rain_player_handle';
const LEADERBOARD_API_URL = process.env.NEXT_PUBLIC_PANDA_RAIN_LEADERBOARD_URL?.trim() ?? '';

function normalizeLeaderboard(value: unknown): LeaderboardEntry[] {
  if (!Array.isArray(value)) return [];
  const map = new Map<string, LeaderboardEntry>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Partial<LeaderboardEntry>;
    const handle = String(row.handle ?? '').trim();
    if (!handle) continue;
    const score = Math.max(0, Number(row.score) || 0);
    const panda = String(row.panda ?? 'enji');
    const key = handle.toLowerCase();
    const existing = map.get(key);
    if (!existing || score > existing.score) {
      map.set(key, { handle, score, panda });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.score - a.score)
    .map((item, index, sorted) => ({ ...item, rank: sorted.findIndex((candidate) => candidate.score === item.score) + 1 }));
}

function maskHandle(handle: string) {
  const value = handle.trim();
  if (value.length <= 2) return `${value.slice(0, 1)}＊`;
  return `${value.slice(0, 1)}${'＊'.repeat(Math.min(4, value.length - 2))}${value.slice(-1)}`;
}

function Sprite({ panda, frame, className = '', offset = [0, 0] }: { panda: Panda; frame: number; className?: string; offset?: readonly [number, number] }) {
  return <span className={`panda-sprite ${className}`} style={{ backgroundImage: `url('${panda.sheet}')`, '--frame-x': `${(frame % 5) * 25}%`, '--row-y': frame >= 5 ? '100%' : '0%', transform: `translate(${offset[0]}px, ${offset[1]}px)` } as React.CSSProperties} aria-hidden="true" />;
}

function ShowcaseSprite({ panda, frame, className = '' }: { panda: Panda; frame: number; className?: string }) {
  return <img className={`showcase-sprite ${className}`} src={getAssetPath(`/selection-frames/${panda.id}/frame-${frame + 1}.png`)} alt="" aria-hidden="true" draggable={false} />;
}

export default function Home() {
  const [selected, setSelected] = useState(0);
  const [phase, setPhase] = useState<'ready' | 'playing' | 'paused' | 'over'>('ready');
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [weather, setWeather] = useState<Weather>('day');
  const [isLightning, setIsLightning] = useState(false);
  const [currentWave, setCurrentWave] = useState(1);
  const [currentSpeed, setCurrentSpeed] = useState(BASE_OBSTACLE_SPEED);
  const [waveNotice, setWaveNotice] = useState<{ title: string; subtitle: string; icon: string } | null>(null);
  const [hasShield, setHasShield] = useState(false);
  const [isRainbow, setIsRainbow] = useState(false);
  const [itemToast, setItemToast] = useState<{ text: string; color: string } | null>(null);
  const [jumpY, setJumpY] = useState(0);
  const [jumpFrame, setJumpFrame] = useState(0);
  const [flipAngle, setFlipAngle] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [hasFlipped, setHasFlipped] = useState(false);
  const [flipPop, setFlipPop] = useState(false);
  const [showcaseFrame, setShowcaseFrame] = useState(0);
  const [flash, setFlash] = useState<'good' | 'ouch' | 'need-flip' | null>(null);
  const [isHurt, setIsHurt] = useState(false);
  const [isInvulnerable, setIsInvulnerable] = useState(false);
  const [loadedSheets, setLoadedSheets] = useState<Record<string, boolean>>({});
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardStatus, setLeaderboardStatus] = useState('此裝置排行榜');
  const [playerHandle, setPlayerHandle] = useState('');
  const [lastSubmittedHandle, setLastSubmittedHandle] = useState('');
  const [scoreSubmitting, setScoreSubmitting] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [lastSubmittedScore, setLastSubmittedScore] = useState<number | null>(null);
  const [isNewRecordSubmitted, setIsNewRecordSubmitted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [roundSongs, setRoundSongs] = useState<ApinkTrack[]>([]);
  const [activeSongIndex, setActiveSongIndex] = useState(0);
  const [collectedLetterCount, setCollectedLetterCount] = useState(0);
  const [completedSongs, setCompletedSongs] = useState<ApinkTrack[]>([]);
  const [luckySong, setLuckySong] = useState<ApinkTrack | null>(null);
  const [luckyRevealed, setLuckyRevealed] = useState<boolean[]>([]);
  const [isLuckyCompleted, setIsLuckyCompleted] = useState(false);
  const [letterPickups, setLetterPickups] = useState<LetterPickup[]>([]);

  const obstaclesRef = useRef<Obstacle[]>([]);
  const pickupsRef = useRef<Pickup[]>([]);
  const letterPickupsRef = useRef<LetterPickup[]>([]);
  const roundSongsRef = useRef<ApinkTrack[]>([]);
  const activeSongIndexRef = useRef(0);
  const collectedLetterCountRef = useRef(0);
  const completedSongsRef = useRef<ApinkTrack[]>([]);
  const luckySongRef = useRef<ApinkTrack | null>(null);
  const luckyRevealedRef = useRef<boolean[]>([]);
  const isLuckyCompletedRef = useRef(false);
  const nextLetterAtRef = useRef(0);
  const nextId = useRef(1);
  const spawnCount = useRef(0);
  const gameStart = useRef(0);
  const pausedAt = useRef<number | null>(null);
  const jumpStart = useRef<number | null>(null);
  const flipStart = useRef<number | null>(null);
  const flipActiveRef = useRef(false);
  const lastFlipLandingAt = useRef(0);
  const lastLandingAt = useRef(0);
  const invulnerableUntil = useRef(0);
  const hurtUntil = useRef(0);
  const gameOverAt = useRef(0);
  const heartsRef = useRef(3);
  const hurtTimer = useRef<number | null>(null);
  const invulnerableTimer = useRef<number | null>(null);
  const gameOverTimer = useRef<number | null>(null);
  const itemToastTimer = useRef<number | null>(null);
  const selectedRef = useRef(selected);
  const phaseRef = useRef(phase);
  const jumpYRef = useRef(0);
  const jumpFrameRef = useRef(0);
  const clearedScoreRef = useRef(0);
  const lastTime = useRef(0);
  const hasShieldRef = useRef(false);
  const rainbowUntilRef = useRef(0);
  const lastWaveRef = useRef(1);
  const lastWeatherRef = useRef<Weather>('day');
  const lightningTimerRef = useRef(0);
  const distanceAccRef = useRef(0);
  const nextSpawnAtRef = useRef(0);
  const nextItemAtRef = useRef(0);
  const currentSpeedRef = useRef(BASE_OBSTACLE_SPEED);
  const panda = pandas[selected];

  useEffect(() => { selectedRef.current = selected }, [selected]);
  useEffect(() => { phaseRef.current = phase }, [phase]);
  useEffect(() => { jumpYRef.current = jumpY }, [jumpY]);
  const readLocalLeaderboard = useCallback(() => {
    try { return normalizeLeaderboard(JSON.parse(window.localStorage.getItem(LEADERBOARD_STORAGE_KEY) ?? '[]')) }
    catch { return [] }
  }, []);

  const syncLeaderboard = useCallback(async () => {
    const local = readLocalLeaderboard();
    if (local.length > 0) {
      setLeaderboardEntries(local);
    }
    if (!LEADERBOARD_API_URL) return;
    try {
      const response = await fetch(`${LEADERBOARD_API_URL}?action=leaderboard&game=panda_rain&ts=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json() as { game?: string; leaderboard?: unknown };
      if (data.game === 'panda_rain' && Array.isArray(data.leaderboard)) {
        setLeaderboardEntries(normalizeLeaderboard(data.leaderboard));
      }
    } catch {
      // Keep local if cloud fails
    }
  }, [readLocalLeaderboard]);

  useEffect(() => {
    try { setPlayerHandle(window.localStorage.getItem(LEADERBOARD_HANDLE_KEY) ?? '') } catch { /* local storage may be unavailable */ }
    setIsMuted(audioManager.isMuted());
    void syncLeaderboard();
  }, [syncLeaderboard]);

  const handleToggleAudio = useCallback(() => {
    const next = audioManager.toggleMute();
    setIsMuted(next);
  }, []);

  useEffect(() => {
    if (phase === 'over') {
      void syncLeaderboard();
    }
  }, [phase, syncLeaderboard]);
  useEffect(() => {
    // Keep both the runner sheet and first-hit expression ready before play begins.
    for (const character of pandas) {
      const runnerImage = new window.Image();
      runnerImage.onload = () => setLoadedSheets((loaded) => ({ ...loaded, [character.id]: true }));
      runnerImage.src = character.sheet;
      if (runnerImage.complete && runnerImage.naturalWidth > 0) {
        setLoadedSheets((loaded) => ({ ...loaded, [character.id]: true }));
      }
      const hurtImage = new window.Image();
      hurtImage.src = getAssetPath(`/selection-frames/${character.id}/frame-2.png`);
    }
  }, []);
  useEffect(() => () => {
    if (hurtTimer.current !== null) window.clearTimeout(hurtTimer.current);
    if (invulnerableTimer.current !== null) window.clearTimeout(invulnerableTimer.current);
    if (gameOverTimer.current !== null) window.clearTimeout(gameOverTimer.current);
    if (itemToastTimer.current !== null) window.clearTimeout(itemToastTimer.current);
  }, []);
  useEffect(() => {
    if (phase !== 'ready') return;
    setShowcaseFrame(0);
    for (let frame = 1; frame <= 6; frame += 1) {
      const image = new window.Image();
      image.src = getAssetPath(`/selection-frames/${pandas[selected].id}/frame-${frame}.png`);
    }
    const timer = window.setInterval(() => setShowcaseFrame((frame) => (frame + 1) % 6), 260);
    return () => window.clearInterval(timer);
  }, [phase, selected]);

  const triggerItemToast = useCallback((text: string, color: string) => {
    setItemToast({ text, color });
    if (itemToastTimer.current !== null) window.clearTimeout(itemToastTimer.current);
    itemToastTimer.current = window.setTimeout(() => setItemToast(null), 1100);
  }, []);

  const startGame = useCallback((index = selectedRef.current) => {
    selectedRef.current = index;
    setSelected(index); setScore(0); setTime(0);
    obstaclesRef.current = [];
    pickupsRef.current = [];
    setHearts(3); setObstacles([]); setPickups([]); setJumpY(0); setJumpFrame(0); setFlipAngle(0);
    setIsFlipping(false); setHasFlipped(false); setFlipPop(false); setFlash(null);
    setIsHurt(false); setIsInvulnerable(false);
    setHasShield(false); hasShieldRef.current = false;
    setIsRainbow(false); rainbowUntilRef.current = 0;
    setWeather('day'); lastWeatherRef.current = 'day';
    setCurrentWave(1); lastWaveRef.current = 1;
    setWaveNotice(null); setItemToast(null);
    setIsLightning(false);
    currentSpeedRef.current = BASE_OBSTACLE_SPEED; setCurrentSpeed(BASE_OBSTACLE_SPEED);
    if (hurtTimer.current !== null) window.clearTimeout(hurtTimer.current);
    if (invulnerableTimer.current !== null) window.clearTimeout(invulnerableTimer.current);
    if (gameOverTimer.current !== null) window.clearTimeout(gameOverTimer.current);
    if (itemToastTimer.current !== null) window.clearTimeout(itemToastTimer.current);
    hurtTimer.current = null; invulnerableTimer.current = null; gameOverTimer.current = null; itemToastTimer.current = null;
    invulnerableUntil.current = 0; hurtUntil.current = 0; gameOverAt.current = 0; heartsRef.current = 3;
    jumpStart.current = null; flipStart.current = null; flipActiveRef.current = false; lastFlipLandingAt.current = 0; lastLandingAt.current = 0;
    jumpFrameRef.current = 0; clearedScoreRef.current = 0; spawnCount.current = 0; distanceAccRef.current = 0;
    pausedAt.current = null;
    const round = pickRoundWithLuckySong(5);
    roundSongsRef.current = round.standardSongs;
    setRoundSongs(round.standardSongs);
    luckySongRef.current = round.luckySong;
    setLuckySong(round.luckySong);
    const initialRevealed = new Array(round.luckySong.collectLetters.length).fill(false);
    luckyRevealedRef.current = initialRevealed;
    setLuckyRevealed(initialRevealed);
    isLuckyCompletedRef.current = false;
    setIsLuckyCompleted(false);

    activeSongIndexRef.current = 0;
    setActiveSongIndex(0);
    collectedLetterCountRef.current = 0;
    setCollectedLetterCount(0);
    completedSongsRef.current = [];
    setCompletedSongs([]);
    letterPickupsRef.current = [];
    setLetterPickups([]);
    const now = performance.now();
    lightningTimerRef.current = now + 5000;
    nextSpawnAtRef.current = now + 1400;
    nextItemAtRef.current = now + 5500;
    nextLetterAtRef.current = now + 2400;
    setScoreSubmitted(false); setLastSubmittedHandle(''); setLastSubmittedScore(null); setIsNewRecordSubmitted(false);
    void audioManager.initAudio();
    audioManager.startBgm();
    gameStart.current = now; lastTime.current = now; setPhase('playing');
  }, []);

  const pauseForExit = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    pausedAt.current = performance.now();
    audioManager.pauseBgm();
    if (hurtTimer.current !== null) window.clearTimeout(hurtTimer.current);
    if (invulnerableTimer.current !== null) window.clearTimeout(invulnerableTimer.current);
    if (gameOverTimer.current !== null) window.clearTimeout(gameOverTimer.current);
    hurtTimer.current = null; invulnerableTimer.current = null; gameOverTimer.current = null;
    phaseRef.current = 'paused';
    setPhase('paused');
  }, []);

  const resumeGame = useCallback(() => {
    const now = performance.now();
    const pausedDuration = pausedAt.current === null ? 0 : now - pausedAt.current;
    gameStart.current += pausedDuration;
    if (jumpStart.current !== null) jumpStart.current += pausedDuration;
    if (flipStart.current !== null) flipStart.current += pausedDuration;
    if (lastFlipLandingAt.current > 0) lastFlipLandingAt.current += pausedDuration;
    if (lastLandingAt.current > 0) lastLandingAt.current += pausedDuration;
    if (nextSpawnAtRef.current > 0) nextSpawnAtRef.current += pausedDuration;
    if (nextItemAtRef.current > 0) nextItemAtRef.current += pausedDuration;
    if (nextLetterAtRef.current > 0) nextLetterAtRef.current += pausedDuration;
    if (lightningTimerRef.current > 0) lightningTimerRef.current += pausedDuration;
    if (rainbowUntilRef.current > 0) rainbowUntilRef.current += pausedDuration;
    if (hurtUntil.current > 0) {
      hurtUntil.current += pausedDuration;
      hurtTimer.current = window.setTimeout(() => { setIsHurt(false); hurtUntil.current = 0; hurtTimer.current = null }, Math.max(0, hurtUntil.current - now));
    }
    if (invulnerableUntil.current > 0) {
      invulnerableUntil.current += pausedDuration;
      invulnerableTimer.current = window.setTimeout(() => { setIsInvulnerable(false); invulnerableUntil.current = 0; invulnerableTimer.current = null }, Math.max(0, invulnerableUntil.current - now));
    }
    if (gameOverAt.current > 0) {
      gameOverAt.current += pausedDuration;
      gameOverTimer.current = window.setTimeout(() => { phaseRef.current = 'over'; setPhase('over'); gameOverAt.current = 0; gameOverTimer.current = null }, Math.max(0, gameOverAt.current - now));
    }
    pausedAt.current = null;
    lastTime.current = now;
    audioManager.resumeBgm();
    phaseRef.current = 'playing';
    setPhase('playing');
  }, []);

  const leaveGame = useCallback(() => {
    audioManager.stopBgm();
    pausedAt.current = null;
    obstaclesRef.current = [];
    pickupsRef.current = [];
    setObstacles([]); setPickups([]); setJumpY(0); setJumpFrame(0); setFlipAngle(0);
    setIsFlipping(false); setHasFlipped(false); setFlipPop(false); setFlash(null);
    setIsHurt(false); setIsInvulnerable(false);
    setHasShield(false); hasShieldRef.current = false;
    setIsRainbow(false); rainbowUntilRef.current = 0;
    setWaveNotice(null); setItemToast(null);
    if (hurtTimer.current !== null) window.clearTimeout(hurtTimer.current);
    if (invulnerableTimer.current !== null) window.clearTimeout(invulnerableTimer.current);
    if (gameOverTimer.current !== null) window.clearTimeout(gameOverTimer.current);
    if (itemToastTimer.current !== null) window.clearTimeout(itemToastTimer.current);
    hurtTimer.current = null; invulnerableTimer.current = null; gameOverTimer.current = null; itemToastTimer.current = null;
    hurtUntil.current = 0; invulnerableUntil.current = 0; gameOverAt.current = 0;
    jumpStart.current = null; flipStart.current = null; flipActiveRef.current = false;
    phaseRef.current = 'ready';
    setPhase('ready');
  }, []);

  const jump = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const now = performance.now();
    if (jumpStart.current === null) {
      jumpStart.current = now;
      jumpFrameRef.current = 5;
      setJumpFrame(5);
      audioManager.playJump();
      return;
    }
    const baseDuration = 940;
    const elapsed = now - jumpStart.current;
    if (flipActiveRef.current || elapsed > DOUBLE_TAP_WINDOW) return;
    const currentProgress = Math.min(1, elapsed / baseDuration);
    jumpStart.current = now - currentProgress * (baseDuration + FLIP_AIRTIME_BONUS);
    flipStart.current = now; flipActiveRef.current = true;
    setIsFlipping(true); setHasFlipped(true); setFlipPop(true);
    audioManager.playFlip();
    window.setTimeout(() => setFlipPop(false), 520);
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;

    // Survival time counting up in seconds
    const secondTimer = window.setInterval(() => {
      setTime((prev) => prev + 1);
    }, 1000);

    let raf = 0;
    const animate = (now: number) => {
      const delta = Math.min(40, now - lastTime.current);
      lastTime.current = now;
      const elapsed = now - gameStart.current;

      const isRainbowActive = rainbowUntilRef.current > now;
      setIsRainbow(isRainbowActive);

      // Speed calculation with wave and buffs
      const speed = calculateObstacleSpeed(elapsed, isRainbowActive);
      currentSpeedRef.current = speed;
      setCurrentSpeed(speed);

      // Distance accumulation
      distanceAccRef.current += speed * delta * 1.08;
      if (distanceAccRef.current >= 1) {
        const add = Math.floor(distanceAccRef.current);
        distanceAccRef.current -= add;
        clearedScoreRef.current += add;
        setScore((val) => val + add);
      }

      // Dynamic Weather cycle
      const nextWeather = getWeather(elapsed);
      if (nextWeather !== lastWeatherRef.current) {
        lastWeatherRef.current = nextWeather;
        setWeather(nextWeather);
      }

      // Storm lightning flash
      if (nextWeather === 'storm' && now > lightningTimerRef.current) {
        setIsLightning(true);
        window.setTimeout(() => setIsLightning(false), 85);
        lightningTimerRef.current = now + 4000 + Math.random() * 4500;
      }

      // Wave stage progression
      const nextWave = getWave(elapsed);
      if (nextWave.id !== lastWaveRef.current) {
        lastWaveRef.current = nextWave.id;
        setCurrentWave(nextWave.id);
        audioManager.playWaveUp();
        setWaveNotice({
          title: nextWave.title,
          subtitle: nextWave.subtitle,
          icon: nextWave.icon,
        });
        window.setTimeout(() => setWaveNotice(null), 2000);
      }

      // Obstacle spawning (guaranteed safe clearance from previous obstacles and pickups)
      if (now >= nextSpawnAtRef.current) {
        // Find the closest existing obstacle trailing edge on stage
        const rightmostObstacle = obstaclesRef.current.reduce<Obstacle | null>((max, obs) => {
          if (!max || (obs.x + obs.width) > (max.x + max.width)) return obs;
          return max;
        }, null);

        // Required physical gap:
        // Jump duration: 940ms for normal jump, 1300ms for flip jump.
        // As speed scales continuously, distance traveled during jump is speed * duration.
        // We guarantee clearance for the entire jump + safe ground running room before the next obstacle reaches player!
        const isWideObstacle = rightmostObstacle?.kind === 'wide';
        const jumpTravel = speed * (isWideObstacle ? 1300 : 940);
        const safeLandingBuffer = Math.max(16, speed * 420);
        const minObstacleGap = rightmostObstacle
          ? Math.max(isWideObstacle ? 68 : 52, jumpTravel + safeLandingBuffer)
          : 0;
        const tooCloseToPreviousObstacle = rightmostObstacle
          ? (112 - (rightmostObstacle.x + rightmostObstacle.width)) < minObstacleGap
          : false;
        const tooCloseToPickup = pickupsRef.current.some((p) => Math.abs(p.x - 112) < 32) || letterPickupsRef.current.some((lp) => Math.abs(lp.x - 112) < 32);

        if (tooCloseToPreviousObstacle || tooCloseToPickup) {
          // Delay briefly to allow the screen to scroll and guarantee a safe running space
          nextSpawnAtRef.current = now + 160;
        } else {
          const spawnIndex = spawnCount.current++;
          // Never spawn two wide puddles back-to-back
          const canBeWide = rightmostObstacle?.kind !== 'wide' && spawnIndex % 5 === 4;
          const kind: Obstacle['kind'] = canBeWide ? 'wide' : spawnIndex % 2 === 1 ? 'rock' : 'puddle';
          const width = kind === 'wide' ? Math.min(36, 24 + (speed - BASE_OBSTACLE_SPEED) * 320)
            : kind === 'rock' ? 10 + Math.random() * 3 : 13 + Math.random() * 7;
          obstaclesRef.current = [...obstaclesRef.current, { id: nextId.current++, kind, x: 112, width, settled: false, engaged: false, flipped: false }];
          setObstacles(obstaclesRef.current);
          const spawnInterval = nextWave.spawnInterval;
          nextSpawnAtRef.current = now + spawnInterval;
        }
      }

      // Pickup spawning (guaranteed safe gap from any obstacle so player never collides while collecting)
      if (now >= nextItemAtRef.current) {
        const tooCloseToObstacle = obstaclesRef.current.some(
          (obs) => Math.abs(obs.x - 110) < 32 || (obs.x <= 110 && obs.x + obs.width >= 78)
        ) || letterPickupsRef.current.some((lp) => Math.abs(lp.x - 110) < 24);
        if (tooCloseToObstacle) {
          nextItemAtRef.current = now + 450;
        } else {
          const pool: PickupKind[] = ['star', 'star', 'shield', 'heal', 'rainbow'];
          if (heartsRef.current === 1) {
            pool.push('heal', 'heal', 'shield');
          }
          const kind = pool[Math.floor(Math.random() * pool.length)];
          // All pickups spawn along the running track at ground level so players can collect them without jumping
          pickupsRef.current = [...pickupsRef.current, { id: nextId.current++, kind, x: 110, y: 0, collected: false }];
          setPickups(pickupsRef.current);
          // Spawn interval reduced: items appear every 7.5s ~ 12.5s (average ~10s)
          nextItemAtRef.current = now + 7500 + Math.random() * 5000;
        }
      }

      // Apink letter spawning (A-Z random letters, current standard song letters, and lucky secret song letters)
      if (now >= nextLetterAtRef.current) {
        const tooCloseToObstacle = obstaclesRef.current.some(
          (obs) => Math.abs(obs.x - 110) < 32 || (obs.x <= 110 && obs.x + obs.width >= 78)
        );
        const tooCloseToPickup = pickupsRef.current.some((p) => Math.abs(p.x - 110) < 24);
        const tooCloseToLetter = letterPickupsRef.current.some((lp) => Math.abs(lp.x - 110) < 24);

        if (tooCloseToObstacle || tooCloseToPickup || tooCloseToLetter) {
          nextLetterAtRef.current = now + 320;
        } else {
          const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          const currentStandardSong = activeSongIndexRef.current < roundSongsRef.current.length
            ? roundSongsRef.current[activeSongIndexRef.current]
            : null;
          const standardNeededChar = currentStandardSong && collectedLetterCountRef.current < currentStandardSong.collectLetters.length
            ? currentStandardSong.collectLetters[collectedLetterCountRef.current]
            : null;

          // Missing letters from the 6th lucky secret song
          const lucky = luckySongRef.current;
          const missingLuckyChars: string[] = [];
          if (lucky && !isLuckyCompletedRef.current) {
            for (let i = 0; i < lucky.collectLetters.length; i++) {
              if (!luckyRevealedRef.current[i]) {
                missingLuckyChars.push(lucky.collectLetters[i]);
              }
            }
          }

          const roll = Math.random();
          let chosenChar: string;
          if (standardNeededChar && roll < 0.42) {
            chosenChar = standardNeededChar;
          } else if (missingLuckyChars.length > 0 && roll < 0.75) {
            chosenChar = missingLuckyChars[Math.floor(Math.random() * missingLuckyChars.length)];
          } else {
            chosenChar = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
          }

          letterPickupsRef.current = [
            ...letterPickupsRef.current,
            {
              id: nextId.current++,
              char: chosenChar,
              songIndex: activeSongIndexRef.current,
              letterIndex: collectedLetterCountRef.current,
              x: 110,
              y: 0,
              collected: false,
            },
          ];
          setLetterPickups(letterPickupsRef.current);
          // Spawn next letter in ~1.8s - 2.8s
          nextLetterAtRef.current = now + 1800 + Math.random() * 1000;
        }
      }

      // Runner jump and flip physics
      if (jumpStart.current !== null) {
        const baseDuration = 940;
        const duration = baseDuration + (flipActiveRef.current ? FLIP_AIRTIME_BONUS : 0);
        const progress = Math.min(1, (now - jumpStart.current) / duration);
        let nextJumpFrame: number;
        if (flipStart.current !== null) {
          const flipProgress = Math.min(1, (now - flipStart.current) / FLIP_ANIMATION_MS);
          const activeFlipFrames = selectedRef.current === 3 ? bomiFlipFrames : flipFrames;
          const flipIndex = Math.min(activeFlipFrames.length - 1, Math.floor(flipProgress * activeFlipFrames.length));
          nextJumpFrame = activeFlipFrames[flipIndex];
          setFlipAngle(selectedRef.current === 3 ? flipProgress * 360 : flipAngles[flipIndex]);
          if (flipProgress >= 1) {
            flipStart.current = null; setFlipAngle(0); setIsFlipping(false);
          }
        } else {
          const frameIndex = Math.min(jumpFrames.length - 1, Math.floor(progress * jumpFrames.length));
          nextJumpFrame = jumpFrames[frameIndex];
        }
        jumpFrameRef.current = nextJumpFrame; setJumpFrame(nextJumpFrame);
        const height = Math.sin(progress * Math.PI) * (flipActiveRef.current ? 178 : 162);
        setJumpY(height); jumpYRef.current = height;
        if (progress >= 1) {
          const nextRunFrame = Math.floor(now / 105) % 5;
          if (flipActiveRef.current) lastFlipLandingAt.current = now;
          lastLandingAt.current = now;
          jumpStart.current = null; setJumpY(0); jumpYRef.current = 0;
          flipStart.current = null; flipActiveRef.current = false;
          setFlipAngle(0); setIsFlipping(false); setHasFlipped(false);
          jumpFrameRef.current = nextRunFrame; setJumpFrame(nextRunFrame);
        }
      } else {
        const nextRunFrame = Math.floor(now / 105) % 5;
        jumpFrameRef.current = nextRunFrame; setJumpFrame(nextRunFrame);
      }

      // Pickup items movement & collision detection
      {
        const remainingPickups: Pickup[] = [];
        for (const item of pickupsRef.current) {
          const moved = { ...item, x: item.x - speed * delta };
          if (!moved.collected) {
            const hDist = Math.abs(moved.x - 27.5);
            const vDist = Math.abs(jumpYRef.current - moved.y);
            // Generous collection window: running on foot without jumping collects effortlessly, and mid-jump also catches
            if (hDist < 6.4 && vDist < 140) {
              moved.collected = true;
              audioManager.playPickup(moved.kind);
              if (moved.kind === 'shield') {
                hasShieldRef.current = true;
                setHasShield(true);
                triggerItemToast('☂️ 雨傘護盾！抵擋 1 次傷害', '#74f0b2');
              } else if (moved.kind === 'heal') {
                if (heartsRef.current < 3) {
                  heartsRef.current += 1;
                  setHearts(heartsRef.current);
                  triggerItemToast('💖 體力補充！愛心 +1', '#ff8db6');
                } else {
                  clearedScoreRef.current += 200;
                  setScore((v) => v + 200);
                  triggerItemToast('💖 滿血激勵！+200m', '#ffb3cf');
                }
              } else if (moved.kind === 'rainbow') {
                rainbowUntilRef.current = now + 4200;
                setIsRainbow(true);
                triggerItemToast('🌈 彩虹狂飆！無敵衝刺', '#ffd666');
              } else if (moved.kind === 'star') {
                clearedScoreRef.current += 30;
                setScore((v) => v + 30);
                triggerItemToast('✦ 雨滴星鑽 +30m', '#7fe8ff');
              }
            }
          }
          if (moved.x > -20 && (!moved.collected || moved.x > 12)) {
            remainingPickups.push(moved);
          }
        }
        pickupsRef.current = remainingPickups;
        setPickups(remainingPickups);
      }

      // Apink song letter movement & collection detection
      {
        const remainingLetters: LetterPickup[] = [];
        const currentTargetSong = activeSongIndexRef.current < roundSongsRef.current.length
          ? roundSongsRef.current[activeSongIndexRef.current]
          : null;

        for (const letter of letterPickupsRef.current) {
          const moved = { ...letter, x: letter.x - speed * delta };
          if (!moved.collected) {
            const hDist = Math.abs(moved.x - 27.5);
            const vDist = Math.abs(jumpYRef.current - moved.y);
            // Ground-level letter collection window (effortless on foot or mid-jump)
            if (hDist < 6.4 && vDist < 140) {
              moved.collected = true;
              let hitStandard = false;
              let hitLucky = false;

              // 1. Check Standard Song (1~5)
              if (
                currentTargetSong &&
                collectedLetterCountRef.current < currentTargetSong.collectLetters.length &&
                moved.char === currentTargetSong.collectLetters[collectedLetterCountRef.current]
              ) {
                hitStandard = true;
                audioManager.playLetterPickup(false);
                const nextCount = collectedLetterCountRef.current + 1;
                collectedLetterCountRef.current = nextCount;
                setCollectedLetterCount(nextCount);
                clearedScoreRef.current += 50;
                setScore((v) => v + 50);

                if (nextCount >= currentTargetSong.collectLetters.length) {
                  audioManager.playSongComplete(false);
                  const newCompleted = [...completedSongsRef.current, currentTargetSong];
                  completedSongsRef.current = newCompleted;
                  setCompletedSongs(newCompleted);

                  const songCount = newCompleted.length;
                  const bonusPct = getSongBonusPercent(songCount, isLuckyCompletedRef.current);
                  triggerItemToast(`🎵 完成第 ${songCount} 首 Apink《${currentTargetSong.title}》！加成 +${bonusPct}%`, '#ff8db6');

                  const nextSongIdx = activeSongIndexRef.current + 1;
                  activeSongIndexRef.current = nextSongIdx;
                  setActiveSongIndex(nextSongIdx);
                  collectedLetterCountRef.current = 0;
                  setCollectedLetterCount(0);
                  nextLetterAtRef.current = now + 1200;
                } else {
                  triggerItemToast(`🔤 收集單字 [${moved.char}]！(${nextCount}/${currentTargetSong.collectLetters.length}) +50m`, '#ffb3cf');
                }
              }

              // 2. Check 6th Lucky Secret Song
              const lucky = luckySongRef.current;
              if (lucky && !isLuckyCompletedRef.current) {
                const targetLetters = lucky.collectLetters;
                let matchIdx = -1;
                for (let i = 0; i < targetLetters.length; i++) {
                  if (targetLetters[i] === moved.char && !luckyRevealedRef.current[i]) {
                    matchIdx = i;
                    break;
                  }
                }

                if (matchIdx !== -1) {
                  hitLucky = true;
                  audioManager.playLetterPickup(true);
                  const nextRevealed = [...luckyRevealedRef.current];
                  nextRevealed[matchIdx] = true;
                  luckyRevealedRef.current = nextRevealed;
                  setLuckyRevealed(nextRevealed);

                  const isNowCompleted = nextRevealed.every(Boolean);
                  if (isNowCompleted) {
                    audioManager.playSongComplete(true);
                    isLuckyCompletedRef.current = true;
                    setIsLuckyCompleted(true);
                    clearedScoreRef.current += 300;
                    setScore((v) => v + 300);
                    triggerItemToast(`🌟 幸運歌曲《${lucky.title}》全數命中！解鎖加成 +100%！`, '#ffd700');
                  } else {
                    clearedScoreRef.current += 80;
                    setScore((v) => v + 80);
                    const revealedCount = nextRevealed.filter(Boolean).length;
                    if (!hitStandard) {
                      triggerItemToast(`✨ 幸運歌曲命中 [${moved.char}]！(${revealedCount}/${nextRevealed.length}) +80m`, '#ffd700');
                    }
                  }
                }
              }

              // 3. Decoy / non-matching random A-Z letter
              if (!hitStandard && !hitLucky) {
                audioManager.playPickup('star');
                clearedScoreRef.current += 30;
                setScore((v) => v + 30);
                triggerItemToast(`✦ 拾獲單字 [${moved.char}] +30m`, '#7fe8ff');
              }
            }
          }
          if (moved.x > -20 && (!moved.collected || moved.x > 12)) {
            remainingLetters.push(moved);
          }
        }
        letterPickupsRef.current = remainingLetters;
        setLetterPickups(remainingLetters);
      }

      const takeHit = (reason: 'ouch' | 'need-flip') => {
        if (now < invulnerableUntil.current) return;
        audioManager.playObstacleHit();
        invulnerableUntil.current = now + INVULNERABLE_MS;
        hurtUntil.current = now + HURT_EXPRESSION_MS;
        setIsHurt(true); setIsInvulnerable(true);
        if (hurtTimer.current !== null) window.clearTimeout(hurtTimer.current);
        if (invulnerableTimer.current !== null) window.clearTimeout(invulnerableTimer.current);
        hurtTimer.current = window.setTimeout(() => { setIsHurt(false); hurtUntil.current = 0; hurtTimer.current = null }, HURT_EXPRESSION_MS);
        invulnerableTimer.current = window.setTimeout(() => { setIsInvulnerable(false); invulnerableUntil.current = 0; invulnerableTimer.current = null }, INVULNERABLE_MS);
        heartsRef.current = Math.max(0, heartsRef.current - 1);
        setHearts(heartsRef.current);
        if (heartsRef.current === 0) {
          audioManager.playGameOver();
          audioManager.pauseBgm();
          gameOverAt.current = now + HURT_EXPRESSION_MS;
          gameOverTimer.current = window.setTimeout(() => { phaseRef.current = 'over'; setPhase('over'); gameOverAt.current = 0; gameOverTimer.current = null }, HURT_EXPRESSION_MS);
        }
        setFlash(reason); window.setTimeout(() => setFlash(null), 520);
      };

      // Obstacle collision and passing
      {
        const remaining: Obstacle[] = [];
        const activePanda = pandas[selectedRef.current];
        const visibleFootClearance = jumpYRef.current + (activePanda.footInsets[jumpFrameRef.current] ?? 0);
        for (const obstacle of obstaclesRef.current) {
          const moved = { ...obstacle, x: obstacle.x - speed * delta };
          const isWide = moved.kind === 'wide';
          const contactLeft = moved.x + moved.width * (isWide ? 0.16 : 0.12);
          const contactRight = moved.x + moved.width * (isWide ? 0.84 : 0.88);
          const feetOverObstacle = contactLeft < (isWide ? 30 : FOOT_RIGHT) && contactRight > (isWide ? 25 : FOOT_LEFT);
          if (isWide && feetOverObstacle && flipActiveRef.current) moved.flipped = true;
          const requiredClearance = moved.kind === 'rock' ? ROCK_FOOT_CLEARANCE
            : isWide && moved.flipped ? WIDE_FLIP_CLEARANCE : MIN_VISIBLE_FOOT_CLEARANCE;

          if (!moved.settled && feetOverObstacle) {
            moved.engaged = true;
            const waitingForSecondTap = isWide && !moved.flipped && jumpStart.current !== null
              && now - jumpStart.current <= DOUBLE_TAP_WINDOW;
            const justLandedFlip = isWide && moved.flipped && now - lastFlipLandingAt.current <= WIDE_LANDING_GRACE_MS;
            const justLandedNormal = !isWide && moved.engaged && now - lastLandingAt.current <= 140;

            // Rainbow rush smashes through obstacles
            if (isRainbowActive) {
              moved.settled = true;
              clearedScoreRef.current += 150;
              setScore((value) => value + 150);
              setFlash('good');
              triggerItemToast('💥 狂飆撞碎障礙！+150m', '#ffd666');
            } else if (!waitingForSecondTap && !justLandedFlip && !justLandedNormal && visibleFootClearance < requiredClearance) {
              moved.settled = true;
              if (hasShieldRef.current) {
                hasShieldRef.current = false;
                setHasShield(false);
                setFlash('ouch');
                triggerItemToast('☂️ 雨傘護盾抵擋傷害！', '#7ee8ff');
                invulnerableUntil.current = now + 1200;
                setIsInvulnerable(true);
                if (invulnerableTimer.current !== null) window.clearTimeout(invulnerableTimer.current);
                invulnerableTimer.current = window.setTimeout(() => { setIsInvulnerable(false); invulnerableUntil.current = 0; invulnerableTimer.current = null }, 1200);
              } else {
                takeHit(isWide && !moved.flipped ? 'need-flip' : 'ouch');
              }
            }
          }

          if (!moved.settled && moved.engaged && contactRight <= (isWide ? 25 : FOOT_LEFT)) {
            moved.settled = true;
            if (isWide && !moved.flipped) {
              if (hasShieldRef.current) {
                hasShieldRef.current = false;
                setHasShield(false);
                setFlash('ouch');
                triggerItemToast('☂️ 雨傘護盾抵擋傷害！', '#7ee8ff');
                invulnerableUntil.current = now + 1200;
                setIsInvulnerable(true);
                if (invulnerableTimer.current !== null) window.clearTimeout(invulnerableTimer.current);
                invulnerableTimer.current = window.setTimeout(() => { setIsInvulnerable(false); invulnerableUntil.current = 0; invulnerableTimer.current = null }, 1200);
              } else {
                takeHit('need-flip');
              }
            } else {
              clearedScoreRef.current += 100;
              setScore((value) => value + 100);
              setFlash('good'); window.setTimeout(() => setFlash(null), 420);
            }
          }
          if (moved.x > -25) remaining.push(moved);
        }
        obstaclesRef.current = remaining;
        setObstacles(remaining);
      }
      if (phaseRef.current === 'playing') raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => { window.clearInterval(secondTimer); cancelAnimationFrame(raf) };
  }, [phase, triggerItemToast]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: WebGameContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'start_puddle_jump_game', title: '開始水窪跳跳',
      description: '選擇一隻熊貓並開始 45 秒的水窪跳躍遊戲。',
      inputSchema: { type: 'object', properties: { panda: { type: 'string', enum: pandas.map((item) => item.id) } }, required: ['panda'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const id = typeof input === 'object' && input !== null ? (input as { panda?: unknown }).panda : undefined;
        const index = pandas.findIndex((item) => item.id === id);
        if (index < 0) throw new Error('請選擇有效的熊貓角色。');
        startGame(index); return { status: 'started', panda: pandas[index].name, seconds: GAME_SECONDS };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, [startGame]);

  const openLeaderboard = useCallback(async (highlightHandle = '') => {
    const targetHandle = highlightHandle || playerHandle;
    const localEntries = readLocalLeaderboard();
    setLeaderboardEntries(localEntries);
    setLastSubmittedHandle(targetHandle);
    setLeaderboardStatus(LEADERBOARD_API_URL ? '正在同步雨天排行榜…' : '此裝置排行榜');
    setLeaderboardOpen(true);
    if (!LEADERBOARD_API_URL) return;
    setLeaderboardLoading(true);
    try {
      const response = await fetch(`${LEADERBOARD_API_URL}?action=leaderboard&game=panda_rain&ts=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('leaderboard request failed');
      const data = await response.json() as { game?: string; leaderboard?: unknown };
      if (data.game !== 'panda_rain') throw new Error('unexpected leaderboard');
      setLeaderboardEntries(normalizeLeaderboard(data.leaderboard));
      setLeaderboardStatus('雲端排行榜');
    } catch {
      setLeaderboardStatus('連線失敗，顯示此裝置紀錄');
    } finally {
      setLeaderboardLoading(false);
    }
  }, [playerHandle, readLocalLeaderboard]);

  const submitScore = useCallback(async (overrideScore?: number) => {
    const handle = playerHandle.trim().slice(0, 28);
    if (!handle || scoreSubmitting) return;
    const finalScore = typeof overrideScore === 'number' ? overrideScore : score;
    setScoreSubmitting(true);
    try {
      window.localStorage.setItem(LEADERBOARD_HANDLE_KEY, handle);
      const localEntries = readLocalLeaderboard();
      const existing = localEntries.find((item) => item.handle.toLowerCase() === handle.toLowerCase());
      const isBetterScore = !existing || finalScore > existing.score;
      const bestScore = existing ? Math.max(existing.score, finalScore) : finalScore;
      const nextLocal = existing
        ? localEntries.map((item) =>
            item.handle.toLowerCase() === handle.toLowerCase()
              ? { ...item, score: bestScore, panda: finalScore >= item.score ? panda.id : item.panda }
              : item
          )
        : [...localEntries, { handle, score: finalScore, panda: panda.id }];
      const normalizedLocal = normalizeLeaderboard(nextLocal);
      window.localStorage.setItem(
        LEADERBOARD_STORAGE_KEY,
        JSON.stringify(normalizedLocal.map(({ handle: savedHandle, score: savedScore, panda: savedPanda }) => ({ handle: savedHandle, score: savedScore, panda: savedPanda })))
      );
      setLeaderboardEntries(normalizedLocal);
      setLeaderboardStatus(LEADERBOARD_API_URL ? '正在同步雨天排行榜…' : '已儲存在此裝置');
      setLastSubmittedHandle(handle);
      setLastSubmittedScore(finalScore);
      setIsNewRecordSubmitted(existing ? isBetterScore : false);
      setScoreSubmitted(true);
      setLeaderboardOpen(true);

      if (LEADERBOARD_API_URL) {
        try {
          const response = await fetch(LEADERBOARD_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ game: 'panda_rain', handle, score: finalScore, panda: panda.id }),
          });
          if (!response.ok) throw new Error('score sync failed');
          const data = await response.json() as { game?: string; leaderboard?: unknown };
          if (data.game !== 'panda_rain') throw new Error('unexpected leaderboard');
          const normalizedCloud = normalizeLeaderboard(data.leaderboard);
          setLeaderboardEntries(normalizedCloud);
          if (existing) {
            if (isBetterScore) {
              setLeaderboardStatus(`🎉 成功更新最高紀錄為 ${finalScore}m！`);
            } else {
              setLeaderboardStatus(`🏆 已保留個人最高紀錄 ${existing.score}m`);
            }
          } else {
            setLeaderboardStatus('成績已登上雲端排行榜');
          }
        } catch {
          setLeaderboardStatus('雲端同步失敗，成績已保存在此裝置');
        }
      }
    } finally {
      setScoreSubmitting(false);
    }
  }, [panda.id, playerHandle, readLocalLeaderboard, score, scoreSubmitting]);

  const rank = score >= 2000 ? ['雨天傳奇大師！', '★★★'] : score >= 1000 ? ['跳過整場大雨！', '★★★'] : score >= 500 ? ['雨靴高手！', '★★☆'] : ['再試一次！', '★☆☆'];
  const myLeaderboardEntry = leaderboardEntries.find((item) => item.handle.toLowerCase() === lastSubmittedHandle.toLowerCase());
  const flipOffset: readonly [number, number] = selected === 3 && hasFlipped ? (bomiFlipOffsets[jumpFrame] ?? [0, 0] as const) : [0, 0] as const;
  const spriteSheetReady = Boolean(loadedSheets[panda.id]);

  return <main className="page-shell" style={{ '--panda': panda.color, '--panda-pale': panda.pale } as React.CSSProperties}>
    <section className={`phone-stage${phase === 'paused' ? ' game-paused' : ''}`} data-weather={weather} aria-label="熊貓水窪跳跳遊戲">
      {isLightning && <div className="lightning-overlay" aria-hidden="true" />}
      <div className="rain-lines" aria-hidden="true" />
      <header className="game-header">
        <button
          className="brand-mark brand-mark-btn"
          type="button"
          onClick={() => {
            if (phase === 'playing') pauseForExit();
            setCreditsOpen(true);
          }}
          title="音樂來源、授權與應援聲明"
          aria-label="音樂來源、授權與應援聲明"
        >
          <CloudRain size={20} />
          <span className="brand-mark-badge" aria-hidden="true">
            <Info size={11} strokeWidth={2.6} />
          </span>
        </button>
        <div><p>PANDA RAIN CLUB</p><h1>水窪跳跳</h1></div>
        {phase !== 'playing' && phase !== 'paused' && (
          <button
            className={`audio-toggle-button${isMuted ? ' is-muted' : ''}`}
            type="button"
            onClick={handleToggleAudio}
            title={isMuted ? '開啟音樂與音效' : '靜音'}
            aria-label={isMuted ? '開啟音樂與音效' : '靜音'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        )}
      </header>

      {phase === 'ready' && <div className="ready-screen">
        <div className="intro"><span>NEW · WEATHER & ITEMS</span><h2>跳過水窪、收集雨天道具！</h2><p>輕點跳躍；遇到標示 ×2 的長水窪，連點兩下翻轉。路上可撿拾 ☂️ 護盾、💖 愛心與 🌈 彩虹衝刺！</p></div>
        <div className="preview-jump">
          <div className="preview-shadow" /><ShowcaseSprite panda={panda} frame={showcaseFrame} className="preview-showcase" />
          <span className="motion motion-one">✦</span><span className="motion motion-two">✦</span>
        </div>
        <strong className="panda-name">{panda.name}</strong>
        <div className="picker" aria-label="選擇熊貓">
          {pandas.map((item, index) => <button key={item.id} className={selected === index ? 'panda-choice active' : 'panda-choice'} style={{ '--choice': item.color } as React.CSSProperties} onClick={() => setSelected(index)} aria-label={`選擇 ${item.name}`} aria-pressed={selected === index}><ShowcaseSprite panda={item} frame={selected === index ? showcaseFrame : 0} className="choice-showcase" /></button>)}
        </div>
        <Button className="start-button" onClick={() => startGame()}>開始跳跳 <Footprints size={19} /></Button>
        <button className="leaderboard-link" type="button" onClick={() => void openLeaderboard()}><Trophy size={16} /> 雨天排行榜</button>
      </div>}

      {(phase === 'playing' || phase === 'paused') && <div className={`play-field${phase === 'paused' ? ' paused' : ''} ${flash === 'need-flip' ? 'ouch' : (flash ?? '')}`} style={{ '--road-duration': `${(0.65 * BASE_OBSTACLE_SPEED) / Math.max(0.015, currentSpeed)}s` } as React.CSSProperties} onPointerDown={(event) => { event.preventDefault(); jump() }} role="button" tabIndex={phase === 'playing' ? 0 : -1} onKeyDown={(event) => { if (!event.repeat && (event.code === 'Space' || event.code === 'Enter')) { event.preventDefault(); jump() } }} aria-label="輕點跳過石頭與水窪，長水窪連點兩下空中翻轉">
        <div className="play-top-actions">
          <button
            className={`play-audio-toggle${isMuted ? ' is-muted' : ''}`}
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              handleToggleAudio();
            }}
            title={isMuted ? '開啟音樂與音效' : '靜音'}
            aria-label={isMuted ? '開啟音樂與音效' : '靜音'}
          >
            {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            <span className="audio-label-text">{isMuted ? '靜音' : '聲音'}</span>
          </button>
          <button
            className="exit-game-button"
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={pauseForExit}
            aria-label="離開遊戲"
          >
            <X size={17} />
            <span>離開</span>
          </button>
        </div>
        <div className="hud">
          <div><span>距離</span><strong>{score}m</strong></div>
          <div className="time"><Timer size={15} /><strong>{time}</strong><span>秒</span></div>
          <div className="hearts" aria-label={`剩下 ${hearts} 顆愛心`}>
            {Array.from({ length: 3 }).map((_, i) => <Heart key={i} size={16} fill={i < hearts ? 'currentColor' : 'transparent'} />)}
            <div className="hud-buffs">
              {hasShield && <span className="buff-badge buff-shield">☂️ 護盾</span>}
              {isRainbow && <span className="buff-badge buff-rainbow">🌈 狂飆</span>}
            </div>
          </div>
        </div>
        <div className="wave-badge-indicator">{getWaveIcon(currentWave)} Wave {currentWave}</div>
        <div className="frame-badge">{panda.name} · 速度 ×{(currentSpeed / BASE_OBSTACLE_SPEED).toFixed(1)} · {isInvulnerable ? '無敵中' : isRainbow ? '狂暴衝刺' : isFlipping ? `FLIP ${Math.min(8, Math.floor(flipAngle / 45) + 1)}/8` : (jumpFrame >= 5 ? `JUMP ${jumpFrame - 4}/5` : `RUN ${jumpFrame + 1}/5`)}</div>
        <div className="weather-badge">{weatherLabels[weather].icon} {weatherLabels[weather].name}</div>
        {/* Apink Song Quest Bar */}
        {(roundSongs.length > 0 || luckySong) && (
          <div className="song-quest-bar">
            {/* 1. Standard Songs 1 to 5 */}
            <div className="song-quest-section">
              {activeSongIndex < roundSongs.length ? (
                <>
                  <div className="song-quest-meta">
                    <span className="song-quest-disc">💿</span>
                    <span className="song-quest-title">Apink《{roundSongs[activeSongIndex]?.title}》</span>
                    {roundSongs[activeSongIndex]?.koreanTitle && (
                      <span className="song-quest-ko">({roundSongs[activeSongIndex].koreanTitle})</span>
                    )}
                    <span className="song-quest-count-badge">
                      第 {activeSongIndex + 1}/5 首 · 加成 +{getSongBonusPercent(completedSongs.length)}%
                    </span>
                  </div>
                  <div className="song-quest-letters">
                    {roundSongs[activeSongIndex]?.collectLetters.split('').map((char, idx) => {
                      const isDone = idx < collectedLetterCount;
                      const isNext = idx === collectedLetterCount;
                      return (
                        <span
                          key={idx}
                          className={`quest-char-box ${isDone ? 'done' : isNext ? 'next' : ''}`}
                          title={isDone ? '已收集' : isNext ? '下一個目標' : '未收集'}
                        >
                          {char}
                        </span>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="song-quest-meta" style={{ color: '#ffd700', fontWeight: 900 }}>
                  <span>🎉</span>
                  <span>前 5 首常規歌曲全數收集完成！加成 +50%</span>
                </div>
              )}
            </div>

            {/* Divider between standard quest and lucky quest */}
            {luckySong && <div className="song-quest-divider" />}

            {/* 2. Lucky Secret Song */}
            {luckySong && (
              <div className="song-quest-section">
                <div className="song-quest-meta">
                  <span className="lucky-quest-sparkle">✨</span>
                  <span className="lucky-quest-title">
                    {isLuckyCompleted
                      ? `幸運歌曲《${luckySong.title}》解鎖！`
                      : `幸運歌曲 (${luckySong.letterCount} 字母)`}
                  </span>
                  <span className={`lucky-quest-badge ${isLuckyCompleted ? 'completed' : ''}`}>
                    {isLuckyCompleted ? '幸運達成 +100%' : '幸運加成 +100%'}
                  </span>
                </div>
                <div className="song-quest-letters">
                  {luckySong.collectLetters.split('').map((char, idx) => {
                    const revealed = Boolean(luckyRevealed[idx]);
                    return (
                      <span
                        key={idx}
                        className={`quest-char-box ${revealed ? 'lucky-done' : 'lucky-hidden'}`}
                        title={revealed ? `已翻開 [${char}]` : `第 ${idx + 1} 個神秘單字`}
                      >
                        {revealed ? char : '?'}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        {waveNotice && <div className="wave-notice-banner"><div className="wave-notice-icon">{waveNotice.icon}</div><div className="wave-notice-text"><strong>{waveNotice.title}</strong><span>{waveNotice.subtitle}</span></div></div>}
        {itemToast && <div className="item-toast-pop" style={{ '--toast-color': itemToast.color } as React.CSSProperties}>{itemToast.text}</div>}
        {flipPop && <div className="game-pop flip-text">空中翻轉！ 跳更遠</div>}
        {flash === 'good' && <div className="game-pop">跳過！ +100</div>}{flash === 'ouch' && <div className="game-pop ouch-text">碰到了！</div>}{flash === 'need-flip' && <div className="game-pop ouch-text">要連點兩下！</div>}
        <div className="horizon" /><div className="ground-track" />
        {obstacles.map((obstacle) => obstacle.kind === 'rock'
          ? <div key={obstacle.id} className="rock" style={{ left: `${obstacle.x}%`, width: `${obstacle.width}%` }} aria-hidden="true">🪨</div>
          : <div key={obstacle.id} className={`puddle${obstacle.kind === 'wide' ? ' wide-puddle' : ''}`} style={{ left: `${obstacle.x}%`, width: `${obstacle.width}%` }} aria-hidden="true"><i /><i />{obstacle.kind === 'wide' && <span>×2 連跳</span>}</div>)}
        {pickups.map((item) => <div key={item.id} className={`pickup-item pickup-${item.kind}${item.collected ? ' collected' : ''}`} style={{ left: `${item.x}%`, bottom: `${104 + item.y}px` }} aria-hidden="true"><div className="pickup-core">{item.kind === 'shield' && '☂️'}{item.kind === 'heal' && '💖'}{item.kind === 'rainbow' && '🌈'}{item.kind === 'star' && '✦'}</div><div className="pickup-glow" /></div>)}
        {letterPickups.map((item) => (
          <div
            key={item.id}
            className={`letter-bubble${item.collected ? ' collected' : ''}`}
            style={{ left: `${item.x}%`, bottom: `${104 + item.y}px` }}
            aria-hidden="true"
          >
            <div className="letter-core">
              <span className="letter-char">{item.char}</span>
              <span className="letter-note">♪</span>
              <div className="letter-glow" />
            </div>
          </div>
        ))}
        <div className={`runner${isFlipping ? ' flipping' : ''}${selected === 3 && hasFlipped ? ' stabilized' : ''}${isHurt ? ' hurt' : ''}${isInvulnerable ? ' invulnerable' : ''}${isRainbow ? ' rainbow-mode' : ''}`} style={{ transform: `translateY(${-jumpY}px) rotate(${flipAngle}deg)` }}>
          {hasShield && <div className="runner-umbrella-shield"><span className="shield-icon">☂️</span><div className="shield-aura" /></div>}
          <ShowcaseSprite panda={panda} frame={0} className={`runner-fallback${spriteSheetReady ? ' is-hidden' : ''}`} />
          <Sprite panda={panda} frame={jumpFrame} offset={flipOffset} className={spriteSheetReady ? 'is-ready' : 'is-loading'} />
          <ShowcaseSprite panda={panda} frame={1} className="hurt-sprite" />
          {isHurt && <span className="hurt-drop" aria-hidden="true">💧</span>}
        </div>
        <div className="tap-callout"><span>×2</span> 連點翻轉 · 路上撿拾道具與歌曲字母</div>
      </div>}

      {phase === 'paused' && <div className="exit-confirm-backdrop" role="presentation" onKeyDown={(event) => { if (event.key === 'Escape') resumeGame() }}>
        <div className="exit-confirm" role="dialog" aria-modal="true" aria-labelledby="exit-confirm-title" aria-describedby="exit-confirm-description">
          <div className="exit-confirm-icon"><LogOut size={24} /></div>
          <p>遊戲已暫停</p>
          <h2 id="exit-confirm-title">要離開這場遊戲嗎？</h2>
          <span id="exit-confirm-description">目前的距離與時間將不會保留。</span>
          <div className="pause-sound-wrapper">
            <button
              className={`pause-sound-btn${isMuted ? ' is-muted' : ''}`}
              type="button"
              onClick={handleToggleAudio}
              aria-label={isMuted ? '開啟音樂與音效' : '靜音'}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              <span>{isMuted ? '目前已靜音 · 點擊開啟聲音' : '音樂與音效播放中 · 點擊靜音'}</span>
            </button>
          </div>
          <Button className="resume-button" onClick={resumeGame} autoFocus>繼續遊戲</Button>
          <button className="confirm-exit-button" type="button" onClick={leaveGame}>離開遊戲</button>
        </div>
      </div>}

      {phase === 'over' && (() => {
        const standardBonusPercent = getSongBonusPercent(completedSongs.length);
        const luckyBonusPercent = isLuckyCompleted ? 100 : 0;
        const totalBonusPercent = standardBonusPercent + luckyBonusPercent;
        const bonusScore = Math.round(score * (totalBonusPercent / 100));
        const finalScore = score + bonusScore;
        const currentRank = finalScore >= 2000 ? ['雨天傳奇大師！', '★★★'] : finalScore >= 1000 ? ['跳過整場大雨！', '★★★'] : finalScore >= 500 ? ['雨靴高手！', '★★☆'] : ['再試一次！', '★☆☆'];
        const luckyHitCount = luckyRevealed.filter(Boolean).length;
        const allMvTracks = [...roundSongs];
        if (luckySong && !allMvTracks.some((t) => t.title === luckySong.title)) {
          allMvTracks.push(luckySong);
        }

        const trimmedHandle = playerHandle.trim();
        const existingEntry = trimmedHandle
          ? (leaderboardEntries.find((item) => item.handle.toLowerCase() === trimmedHandle.toLowerCase())
            ?? readLocalLeaderboard().find((item) => item.handle.toLowerCase() === trimmedHandle.toLowerCase()))
          : undefined;
        const previousBest = existingEntry ? existingEntry.score : null;
        const hasPreviousScore = previousBest !== null;
        const isNewRecord = hasPreviousScore && finalScore > previousBest;
        const isLowerThanBest = hasPreviousScore && finalScore < previousBest;
        const isTiedBest = hasPreviousScore && finalScore === previousBest;
        const hasSubmittedThisRun = Boolean(
          scoreSubmitted &&
          lastSubmittedScore === finalScore &&
          trimmedHandle &&
          lastSubmittedHandle.toLowerCase() === trimmedHandle.toLowerCase()
        );

        return (
          <div className="result-screen">
            <div className="result-art"><Sprite panda={panda} frame={7} /></div>
            <p className="stars">{currentRank[1]}</p>
            <h2>{currentRank[0]}</h2>
            <p>{panda.name} 雨天挑戰結算</p>

            {/* Personal Best Record Recognition Banner */}
            {hasPreviousScore && isNewRecord && (
              <div className="personal-record-banner new-high" role="status">
                <span className="record-banner-icon">🎉</span>
                <div className="record-banner-body">
                  <strong className="record-banner-title">突破個人最高紀錄！</strong>
                  <p className="record-banner-desc">
                    原紀錄 <strong>{previousBest}m</strong> ➔ 本次新高 <strong className="new-high-score">{finalScore}m</strong>
                    <span className="record-diff-tag">進步 +{finalScore - previousBest}m</span>
                  </p>
                </div>
              </div>
            )}
            {hasPreviousScore && isLowerThanBest && (
              <div className="personal-record-banner keep-best" role="status">
                <span className="record-banner-icon">🏆</span>
                <div className="record-banner-body">
                  <strong className="record-banner-title">目前個人最佳紀錄：{previousBest}m</strong>
                  <p className="record-banner-desc">
                    本次結算 {finalScore}m 未超越 · 排行榜將妥善保留你的 <strong>{previousBest}m</strong> 最高紀錄
                  </p>
                </div>
              </div>
            )}
            {hasPreviousScore && isTiedBest && (
              <div className="personal-record-banner tied-best" role="status">
                <span className="record-banner-icon">✨</span>
                <div className="record-banner-body">
                  <strong className="record-banner-title">追平個人最高紀錄！</strong>
                  <p className="record-banner-desc">
                    再次達到 <strong>{previousBest}m</strong> · 表現極為穩定！
                  </p>
                </div>
              </div>
            )}
            {!hasPreviousScore && trimmedHandle && (
              <div className="personal-record-banner first-record" role="status">
                <span className="record-banner-icon">🌟</span>
                <div className="record-banner-body">
                  <strong className="record-banner-title">初次挑戰結算：{finalScore}m</strong>
                  <p className="record-banner-desc">
                    立即送出即可將個人最高紀錄登錄在雨天排行榜！
                  </p>
                </div>
              </div>
            )}

            {/* Score Breakdown Card */}
            <div className="result-score-card">
              <div className="result-score-row">
                <span>基礎奔跑距離</span>
                <strong>{score}m</strong>
              </div>
              <div className="result-score-row bonus-row">
                <span>Apink 歌曲命中 ({completedSongs.length}/5 首)</span>
                <strong className="bonus-accent">+{standardBonusPercent}%</strong>
              </div>
              {luckySong && (
                <div className="result-score-row lucky-row">
                  <span>✨ 幸運歌曲{isLuckyCompleted ? ' (達成)' : ` (${luckyHitCount}/${luckySong.letterCount} 字)`}</span>
                  <strong className="lucky-accent">{isLuckyCompleted ? '+100%' : '+0%'}</strong>
                </div>
              )}
              <div className="result-score-divider" />
              <div className="result-score-row total-row">
                <span>結算總成績 (+{totalBonusPercent}%)</span>
                <strong className="result-score-main">{finalScore}m</strong>
              </div>
            </div>

            <p style={{ marginTop: '2px', marginBottom: '14px', fontSize: '13px', color: '#9bb8d2' }}>
              存活時間 <strong>{time}</strong> 秒 · 挑戰至 Wave {currentWave}
            </p>

            {/* Apink Official MV Preview List */}
            <div className="mv-preview-section">
              <div className="mv-section-header">
                <span className="mv-section-icon">💿</span>
                <div>
                  <h3>本回合 Apink 歌曲 MV（命中 {completedSongs.length + (isLuckyCompleted ? 1 : 0)}/6）</h3>
                  <p>點選 YouTube 預覽卡片即可直接跳轉觀賞官方 MV</p>
                </div>
              </div>
              <div className="mv-card-list">
                {allMvTracks.map((track, idx) => {
                  const isLuckyTrack = Boolean(luckySong && track.title === luckySong.title);
                  const isHit = isLuckyTrack
                    ? isLuckyCompleted
                    : completedSongs.some((s) => s.title === track.title);
                  const thumbUrl = getYoutubeThumbnail(track.officialMvUrl);

                  return (
                    <a
                      key={track.title}
                      href={track.officialMvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mv-card ${isLuckyTrack ? 'is-lucky' : ''} ${isHit ? 'is-hit' : 'is-locked'}`}
                      title={`在 YouTube 觀看 Apink《${track.title}》官方 MV`}
                    >
                      <div className="mv-thumb-wrapper">
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={`Apink ${track.title} MV Thumbnail`}
                            className="mv-thumb-img"
                            loading="lazy"
                          />
                        ) : (
                          <div className="mv-thumb-fallback">🎵</div>
                        )}
                        <div className="mv-play-overlay">
                          <span className="mv-play-btn">▶</span>
                        </div>
                        <span className={`mv-status-badge ${isLuckyTrack ? (isLuckyCompleted ? 'lucky' : 'lucky-blind') : (isHit ? 'hit' : '')}`}>
                          {isLuckyTrack
                            ? (isLuckyCompleted ? '🌟 幸運歌曲 100%' : `🔮 幸運歌曲 (${luckyHitCount}/${track.letterCount})`)
                            : (isHit ? '✓ 命中收集' : `第 ${idx + 1} 首`)}
                        </span>
                      </div>
                      <div className="mv-card-info">
                        <span className={`mv-card-title ${isLuckyTrack ? 'lucky-tag' : ''}`}>
                          {isLuckyTrack ? `✨ ${track.title}` : track.title}
                        </span>
                        {track.koreanTitle && <span className="mv-card-ko">{track.koreanTitle}</span>}
                        <span className="mv-card-meta">{track.year} · {track.album}</span>
                        <span className="mv-link-prompt">
                          {isHit ? '▶ 點此觀看官方 MV' : '🎧 點此觀看 MV'}
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="score-submit-group">
              <input
                value={playerHandle}
                onChange={(event) => setPlayerHandle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && trimmedHandle && !scoreSubmitting && !hasSubmittedThisRun) {
                    void submitScore(finalScore);
                  }
                }}
                maxLength={28}
                placeholder="輸入暱稱或 IG 帳號"
                aria-label="排行榜名稱"
              />
              <button
                type="button"
                className={`score-submit-btn ${isNewRecord ? 'is-new-record' : ''}`}
                onClick={() => void submitScore(finalScore)}
                disabled={!trimmedHandle || scoreSubmitting || hasSubmittedThisRun}
              >
                {scoreSubmitting
                  ? '同步中…'
                  : hasSubmittedThisRun
                  ? isNewRecordSubmitted
                    ? '✅ 最高紀錄已更新'
                    : '✅ 成績已登錄'
                  : isNewRecord
                  ? `🚀 更新成績上去 (${finalScore}m)`
                  : isLowerThanBest
                  ? `保留最高紀錄 (${previousBest}m)`
                  : '登上排行榜'}
              </button>
            </div>
            <Button className="start-button" onClick={() => startGame()}>
              <RotateCcw size={18} /> 再跳一次
            </Button>
            <button className="change-panda" onClick={() => { audioManager.stopBgm(); setPhase('ready'); }}>
              換一隻熊貓
            </button>
          </div>
        );
      })()}

      {leaderboardOpen && <div className="leaderboard-backdrop" role="presentation">
        <section className="leaderboard-panel" role="dialog" aria-modal="true" aria-labelledby="leaderboard-title">
          <button className="leaderboard-close" type="button" onClick={() => setLeaderboardOpen(false)} aria-label="關閉排行榜"><X size={19} /></button>
          <div className="leaderboard-heading-icon"><Trophy size={25} /></div>
          <p>PANDA RAIN CLUB</p>
          <h2 id="leaderboard-title">雨天跳跳排行榜</h2>
          <div className="leaderboard-status"><span className={leaderboardLoading ? 'syncing' : ''} />{leaderboardStatus}</div>
          {myLeaderboardEntry && <div className="leaderboard-mine"><span>我的名次</span><strong>#{myLeaderboardEntry.rank}</strong><span>{myLeaderboardEntry.score}m</span></div>}
          <div className="leaderboard-list" aria-live="polite">
            {leaderboardEntries.length === 0 && !leaderboardLoading
              ? <div className="leaderboard-empty"><CloudRain size={28} /><strong>還沒有成績</strong><span>完成第一場雨天挑戰，搶下榜首吧！</span></div>
              : leaderboardEntries.slice(0, 10).map((entry) => {
                const entryPanda = pandas.find((item) => item.id === entry.panda) ?? pandas[0];
                const isMine = Boolean(lastSubmittedHandle) && entry.handle.toLowerCase() === lastSubmittedHandle.toLowerCase();
                return <div className={`leaderboard-row rank-${entry.rank}${isMine ? ' is-mine' : ''}`} key={`${entry.handle}-${entry.rank}`}>
                  <div className="leaderboard-rank">{entry.rank && entry.rank <= 3 ? <Medal size={19} /> : entry.rank}</div>
                  <div className="leaderboard-avatar" style={{ '--entry-color': entryPanda.color } as React.CSSProperties}><ShowcaseSprite panda={entryPanda} frame={0} /></div>
                  <div className="leaderboard-player"><strong>{maskHandle(entry.handle)}</strong><span>{entryPanda.name}{isMine ? ' · YOU' : ''}</span></div>
                  <strong className="leaderboard-score">{entry.score}<small>m</small></strong>
                </div>;
              })}
          </div>
          <button className="leaderboard-done" type="button" onClick={() => setLeaderboardOpen(false)}>回到遊戲</button>
        </section>
      </div>}

      {creditsOpen && <div className="credits-backdrop" role="presentation" onClick={() => setCreditsOpen(false)}>
        <section
          className="credits-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="credits-title"
          onClick={(e) => e.stopPropagation()}
        >
          <button className="credits-close" type="button" onClick={() => setCreditsOpen(false)} aria-label="關閉說明">
            <X size={19} />
          </button>
          <div className="credits-heading-icon"><CloudRain size={26} /></div>
          <p className="credits-sub">PANDA RAIN CLUB</p>
          <h2 id="credits-title">音樂來源與活動聲明</h2>

          <div className="credits-disclaimer-box">
            <div className="credits-disclaimer-badge">📌 應援聲明</div>
            <p className="credits-disclaimer-text">
              本活動為粉絲自製應援小遊戲，不進行任何商業販售，並與官方無關，若有侵犯權益請告知會立即下架關閉。
            </p>
          </div>

          <div className="credits-content-scroll">
            <div className="credits-section">
              <div className="credits-section-title">
                <Music size={15} />
                <span>🎵 背景音樂 (BGM) 來源與授權</span>
              </div>
              <div className="credits-card">
                <div className="credits-card-header">
                  <strong>Empty Mind (雨天 Lo-Fi 輕音樂)</strong>
                  <span className="credits-tag">Pixabay 免版稅授權</span>
                </div>
                <div className="credits-meta-row">
                  <span>創作者：<strong>Lofi_hour</strong></span>
                  <span>來源平台：<strong>Pixabay Music (ID: 118973)</strong></span>
                </div>
                <p className="credits-desc">
                  遵循 Pixabay Content License，允許商業與非商業在網站、遊戲中免費公開播放，無須強制署名。
                </p>
              </div>
            </div>

            <div className="credits-section">
              <div className="credits-section-title">
                <Volume2 size={15} />
                <span>🔊 遊戲音效 (SFX)</span>
              </div>
              <div className="credits-card">
                <div className="credits-card-header">
                  <strong>Web Audio API 即時頻率合成</strong>
                  <span className="credits-tag tag-code">代碼原創</span>
                </div>
                <p className="credits-desc">
                  跳躍、翻滾、水窪碰撞濺水、愛心/護盾/彩虹道具、Apink 歌曲字母收集與通關慶祝音效，皆由代碼透過瀏覽器標準 Web Audio API 即時振盪器運算合成，無使用任何第三方版權音效包，零版權疑慮。
                </p>
              </div>
            </div>
          </div>

          <button className="credits-done-btn" type="button" onClick={() => setCreditsOpen(false)}>
            我知道了
          </button>
        </section>
      </div>}
    </section>
  </main>;
}
