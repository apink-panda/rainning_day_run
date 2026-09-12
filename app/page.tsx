'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CloudRain, Footprints, Heart, RotateCcw, Sparkles, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Panda = { id: string; name: string; color: string; pale: string; power: string; sheet: string; footInsets: readonly number[] };
type Puddle = { id: number; x: number; width: number; settled: boolean; engaged: boolean };
type WebGameContext = { registerTool: (tool: { name: string; title: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => unknown }, options?: { signal?: AbortSignal }) => void | Promise<void> };

const pandas: Panda[] = [
  // Per-frame footInsets match each sheet's transparent space below the visible feet at the 148px game size.
  { id: 'enji', name: 'Enji', color: '#58bff5', pale: '#dff4ff', power: '起跑加分', sheet: '/enji-run-jump-v9.png', footInsets: [0, 0, 0, 0, 0, 7, 6, 8, 7, 7] },
  { id: 'chorong', name: 'Chorong', color: '#f39ab5', pale: '#ffe5ed', power: '多一顆愛心', sheet: '/chorong-run-jump-v3.png', footInsets: [2, 3, 0, 6, 0, 10, 11, 15, 9, 10] },
  { id: 'najoo', name: 'Najoo', color: '#ae85d5', pale: '#f1e7fb', power: '水窪速度較慢', sheet: '/najoo-run-jump-v1.png', footInsets: [3, 2, 0, 0, 2, 7, 7, 14, 9, 8] },
  { id: 'bomi', name: 'Bomi', color: '#f4aa38', pale: '#fff0d3', power: '跳躍時間更長', sheet: '/bomi-run-jump-v1.png', footInsets: [3, 2, 0, 11, 3, 7, 7, 14, 12, 5] },
  { id: 'hayoung', name: 'Hayoung', color: '#f3ce42', pale: '#fff7cf', power: '擋住一次失誤', sheet: '/hayoung-run-jump-final.png', footInsets: [9, 8, 0, 15, 8, 11, 7, 28, 17, 11] },
];

const GAME_SECONDS = 45;
const jumpFrames = [5, 5, 6, 6, 7, 7, 7, 8, 8, 9];
const flipFrames = [5, 6, 7, 8, 9, 8, 7, 6];
const flipAngles = [0, 48, 98, 154, 210, 266, 316, 360];
const DOUBLE_TAP_WINDOW = 360;
const FLIP_ANIMATION_MS = 620;
const FLIP_AIRTIME_BONUS = 360;
const FOOT_LEFT = 23.5;
const FOOT_RIGHT = 31.5;
const MIN_VISIBLE_FOOT_CLEARANCE = 36;

function Sprite({ panda, frame, className = '' }: { panda: Panda; frame: number; className?: string }) {
  return <span className={`panda-sprite ${className}`} style={{ backgroundImage: `url('${panda.sheet}')`, '--frame-x': `${(frame % 5) * 25}%`, '--row-y': frame >= 5 ? '100%' : '0%' } as React.CSSProperties} aria-hidden="true" />;
}

export default function Home() {
  const [selected, setSelected] = useState(0);
  const [phase, setPhase] = useState<'ready' | 'playing' | 'over'>('ready');
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(GAME_SECONDS);
  const [hearts, setHearts] = useState(3);
  const [puddles, setPuddles] = useState<Puddle[]>([]);
  const [jumpY, setJumpY] = useState(0);
  const [jumpFrame, setJumpFrame] = useState(0);
  const [flipAngle, setFlipAngle] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipPop, setFlipPop] = useState(false);
  const [flash, setFlash] = useState<'good' | 'ouch' | 'shield' | null>(null);
  const nextId = useRef(1);
  const jumpStart = useRef<number | null>(null);
  const flipStart = useRef<number | null>(null);
  const flipActiveRef = useRef(false);
  const selectedRef = useRef(selected);
  const phaseRef = useRef(phase);
  const jumpYRef = useRef(0);
  const jumpFrameRef = useRef(0);
  const clearedScoreRef = useRef(0);
  const shieldRef = useRef(false);
  const lastTime = useRef(0);
  const panda = pandas[selected];

  useEffect(() => { selectedRef.current = selected }, [selected]);
  useEffect(() => { phaseRef.current = phase }, [phase]);
  useEffect(() => { jumpYRef.current = jumpY }, [jumpY]);

  const startGame = useCallback((index = selectedRef.current) => {
    selectedRef.current = index;
    const firstScore = index === 0 ? 50 : 0;
    setSelected(index); setScore(firstScore); setTime(GAME_SECONDS);
    setHearts(index === 1 ? 4 : 3); setPuddles([]); setJumpY(0); setJumpFrame(0); setFlipAngle(0);
    setIsFlipping(false); setFlipPop(false); setFlash(null);
    jumpStart.current = null; flipStart.current = null; flipActiveRef.current = false;
    jumpFrameRef.current = 0; clearedScoreRef.current = 0;
    shieldRef.current = index === 4; lastTime.current = performance.now(); setPhase('playing');
  }, []);

  const jump = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const now = performance.now();
    if (jumpStart.current === null) {
      jumpStart.current = now;
      jumpFrameRef.current = 5;
      setJumpFrame(5);
      return;
    }
    const baseDuration = selectedRef.current === 3 ? 1120 : 940;
    const elapsed = now - jumpStart.current;
    if (flipActiveRef.current || elapsed > DOUBLE_TAP_WINDOW) return;
    const currentProgress = Math.min(1, elapsed / baseDuration);
    jumpStart.current = now - currentProgress * (baseDuration + FLIP_AIRTIME_BONUS);
    flipStart.current = now; flipActiveRef.current = true;
    setIsFlipping(true); setFlipPop(true);
    window.setTimeout(() => setFlipPop(false), 520);
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = window.setInterval(() => setTime((value) => {
      if (value <= 1) { setPhase('over'); return 0 }
      return value - 1;
    }), 1000);
    const spawner = window.setInterval(() => setPuddles((items) => [...items, {
      id: nextId.current++, x: 112,
      width: selectedRef.current === 2 ? 12 + Math.random() * 5 : 13 + Math.random() * 8,
      settled: false, engaged: false,
    }]), selectedRef.current === 2 ? 1800 : 1500);

    let raf = 0;
    const animate = (now: number) => {
      const delta = Math.min(40, now - lastTime.current); lastTime.current = now;
      if (jumpStart.current !== null) {
        const baseDuration = selectedRef.current === 3 ? 1120 : 940;
        const duration = baseDuration + (flipActiveRef.current ? FLIP_AIRTIME_BONUS : 0);
        const progress = Math.min(1, (now - jumpStart.current) / duration);
        let nextJumpFrame: number;
        if (flipStart.current !== null) {
          const flipProgress = Math.min(1, (now - flipStart.current) / FLIP_ANIMATION_MS);
          const flipIndex = Math.min(flipFrames.length - 1, Math.floor(flipProgress * flipFrames.length));
          nextJumpFrame = flipFrames[flipIndex];
          setFlipAngle(flipAngles[flipIndex]);
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
          jumpStart.current = null; setJumpY(0); jumpYRef.current = 0;
          flipStart.current = null; flipActiveRef.current = false;
          setFlipAngle(0); setIsFlipping(false);
          jumpFrameRef.current = nextRunFrame; setJumpFrame(nextRunFrame);
        }
      } else {
        const nextRunFrame = Math.floor(now / 105) % 5;
        jumpFrameRef.current = nextRunFrame; setJumpFrame(nextRunFrame);
      }
      setPuddles((items) => {
        const remaining: Puddle[] = [];
        const activePanda = pandas[selectedRef.current];
        const visibleFootClearance = jumpYRef.current + (activePanda.footInsets[jumpFrameRef.current] ?? 0);
        for (const puddle of items) {
          const baseSpeed = selectedRef.current === 2
            ? (puddle.engaged ? .032 : .022)
            : .028;
          const speed = baseSpeed + Math.min(0.009, clearedScoreRef.current / 80000);
          const moved = { ...puddle, x: puddle.x - speed * delta };
          const wetLeft = moved.x + moved.width * 0.12;
          const wetRight = moved.x + moved.width * 0.88;
          const feetOverWater = wetLeft < FOOT_RIGHT && wetRight > FOOT_LEFT;

          if (!moved.settled && feetOverWater) {
            moved.engaged = true;
            if (visibleFootClearance < MIN_VISIBLE_FOOT_CLEARANCE && shieldRef.current) {
              moved.settled = true;
              shieldRef.current = false; setFlash('shield'); window.setTimeout(() => setFlash(null), 420);
            } else if (visibleFootClearance < MIN_VISIBLE_FOOT_CLEARANCE) {
              moved.settled = true;
              setHearts((value) => { const next = value - 1; if (next <= 0) setPhase('over'); return Math.max(0, next) });
              setFlash('ouch'); window.setTimeout(() => setFlash(null), 520);
            }
          }

          if (!moved.settled && moved.engaged && wetRight <= FOOT_LEFT) {
            moved.settled = true;
            clearedScoreRef.current += 100;
            setScore((value) => value + 100);
            setFlash('good'); window.setTimeout(() => setFlash(null), 420);
          }
          if (moved.x > -25) remaining.push(moved);
        }
        return remaining;
      });
      if (phaseRef.current === 'playing') raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => { window.clearInterval(timer); window.clearInterval(spawner); cancelAnimationFrame(raf) };
  }, [phase]);

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

  const rank = score >= 1000 ? ['跳過整場大雨！', '★★★'] : score >= 500 ? ['雨靴高手！', '★★☆'] : ['再試一次！', '★☆☆'];

  return <main className="page-shell" style={{ '--panda': panda.color, '--panda-pale': panda.pale } as React.CSSProperties}>
    <section className="phone-stage" aria-label="熊貓水窪跳跳遊戲">
      <div className="rain-lines" aria-hidden="true" />
      <header className="game-header"><div className="brand-mark"><CloudRain size={20} /></div><div><p>PANDA RAIN CLUB</p><h1>水窪跳跳</h1></div></header>

      {phase === 'ready' && <div className="ready-screen">
        <div className="intro"><span>FRAME-BY-FRAME</span><h2>別踩到水窪！</h2><p>輕點跳躍，連點兩下可在空中翻轉得更遠。</p></div>
        <div className="preview-jump">
          <div className="preview-shadow" /><Sprite panda={panda} frame={7} className="preview-sprite" />
          <span className="motion motion-one">✦</span><span className="motion motion-two">✦</span>
        </div>
        <div className="power-pill"><Sparkles size={14} /> {panda.power}</div>
        <strong className="panda-name">{panda.name}</strong>
        <div className="picker" aria-label="選擇熊貓">
          {pandas.map((item, index) => <button key={item.id} className={selected === index ? 'panda-choice active' : 'panda-choice'} style={{ '--choice': item.color } as React.CSSProperties} onClick={() => setSelected(index)} aria-label={`選擇 ${item.name}：${item.power}`} aria-pressed={selected === index}><Sprite panda={item} frame={0} /></button>)}
        </div>
        <Button className="start-button" onClick={() => startGame()}>開始跳跳 <Footprints size={19} /></Button>
      </div>}

      {phase === 'playing' && <div className={`play-field ${flash === 'shield' ? 'good' : (flash ?? '')}`} onPointerDown={(event) => { event.preventDefault(); jump() }} role="button" tabIndex={0} onKeyDown={(event) => { if (!event.repeat && (event.code === 'Space' || event.code === 'Enter')) { event.preventDefault(); jump() } }} aria-label="輕點跳躍，連點兩下空中翻轉">
        <div className="hud"><div><span>距離</span><strong>{score}m</strong></div><div className="time"><Timer size={15} /><strong>{time}</strong><span>秒</span></div><div className="hearts" aria-label={`剩下 ${hearts} 顆愛心`}>{Array.from({ length: selected === 1 ? 4 : 3 }).map((_, i) => <Heart key={i} size={16} fill={i < hearts ? 'currentColor' : 'transparent'} />)}</div></div>
        <div className="frame-badge">{panda.name} · {isFlipping ? `FLIP ${Math.min(8, Math.floor(flipAngle / 45) + 1)}/8` : (jumpFrame >= 5 ? `JUMP ${jumpFrame - 4}/5` : `RUN ${jumpFrame + 1}/5`)}</div>
        {flipPop && <div className="game-pop flip-text">空中翻轉！ 跳更遠</div>}
        {flash === 'good' && <div className="game-pop">跳過！ +100</div>}{flash === 'shield' && <div className="game-pop">護盾擋住了！</div>}{flash === 'ouch' && <div className="game-pop ouch-text">噗通！</div>}
        <div className="horizon" /><div className="ground-track" />
        {puddles.map((puddle) => <div key={puddle.id} className="puddle" style={{ left: `${puddle.x}%`, width: `${puddle.width}%` }}><i /><i /></div>)}
        <div className={isFlipping ? 'runner flipping' : 'runner'} style={{ transform: `translateY(${-jumpY}px) rotate(${flipAngle}deg)` }}><Sprite panda={panda} frame={jumpFrame} /></div>
        <div className="tap-callout"><span>×2</span> 連點翻轉 · 跳得更遠</div>
      </div>}

      {phase === 'over' && <div className="result-screen">
        <div className="result-art"><Sprite panda={panda} frame={7} /></div><p className="stars">{rank[1]}</p><h2>{rank[0]}</h2><p>{panda.name} 一共跑了</p><strong className="result-score">{score}m</strong>
        <Button className="start-button" onClick={() => startGame()}><RotateCcw size={18} /> 再跳一次</Button><button className="change-panda" onClick={() => setPhase('ready')}>換一隻熊貓</button>
      </div>}
    </section>
  </main>;
}
