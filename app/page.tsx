'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CloudRain, Heart, RotateCcw, Shield, Sparkles, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Panda = { id: string; name: string; image: string; color: string; pale: string; ability: string; detail: string };
type Drop = { id: number; x: number; y: number; speed: number; kind: 'rain' | 'storm' };
type WebGameContext = { registerTool: (tool: { name: string; title: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => unknown }, options?: { signal?: AbortSignal }) => void | Promise<void> };

const pandas: Panda[] = [
  { id: 'enji', name: 'Enji', image: '/enji.png', color: '#56baf0', pale: '#dff4ff', ability: '加分雨滴', detail: '每滴多得 5 分' },
  { id: 'chorong', name: 'Chorong', image: '/chorong.png', color: '#f397b2', pale: '#ffe4ed', ability: '愛心雨衣', detail: '多一顆愛心' },
  { id: 'najoo', name: 'Najoo', image: '/najoo.png', color: '#ae86d4', pale: '#f0e6fb', ability: '慢速雨雲', detail: '掉落速度較慢' },
  { id: 'bomi', name: 'Bomi', image: '/bomi.png', color: '#f6aa37', pale: '#fff0d5', ability: '雨滴磁鐵', detail: '接取範圍更大' },
  { id: 'hayoung', name: 'Hayoung', image: '/hayoung.png', color: '#f4cd43', pale: '#fff7cf', ability: '地瓜護盾', detail: '擋住一次雷電' },
];

const GAME_SECONDS = 30;

export default function Home() {
  const [selected, setSelected] = useState(0);
  const [phase, setPhase] = useState<'ready' | 'playing' | 'over'>('ready');
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(GAME_SECONDS);
  const [hearts, setHearts] = useState(3);
  const [shield, setShield] = useState(false);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [playerX, setPlayerX] = useState(50);
  const [pop, setPop] = useState<string | null>(null);
  const nextId = useRef(0);
  const fieldRef = useRef<HTMLDivElement>(null);
  const panda = pandas[selected];
  const selectedRef = useRef(selected);
  const playerXRef = useRef(playerX);
  const phaseRef = useRef(phase);
  const shieldRef = useRef(shield);

  useEffect(() => { selectedRef.current = selected }, [selected]);
  useEffect(() => { playerXRef.current = playerX }, [playerX]);
  useEffect(() => { phaseRef.current = phase }, [phase]);
  useEffect(() => { shieldRef.current = shield }, [shield]);

  const startGame = useCallback(() => {
    setScore(0); setTime(GAME_SECONDS); setHearts(selectedRef.current === 1 ? 4 : 3);
    setShield(selectedRef.current === 4); setDrops([]); setPlayerX(50); setPop(null); setPhase('playing');
  }, []);

  useEffect(() => {
    const context = (document as Document & { modelContext?: WebGameContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'start_panda_rain_game',
      title: '開始熊貓雨衣隊遊戲',
      description: '選擇一隻熊貓並立即開始一局 30 秒的接雨遊戲。',
      inputSchema: {
        type: 'object',
        properties: { panda: { type: 'string', enum: pandas.map((item) => item.id) } },
        required: ['panda'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const id = typeof input === 'object' && input !== null ? (input as { panda?: unknown }).panda : undefined;
        const index = pandas.findIndex((item) => item.id === id);
        if (index < 0) throw new Error('請選擇有效的熊貓角色。');
        selectedRef.current = index;
        setSelected(index);
        setScore(0); setTime(GAME_SECONDS); setHearts(index === 1 ? 4 : 3);
        setShield(index === 4); setDrops([]); setPlayerX(50); setPop(null); setPhase('playing');
        return { status: 'started', panda: pandas[index].name, seconds: GAME_SECONDS };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = window.setInterval(() => setTime((value) => {
      if (value <= 1) { setPhase('over'); return 0 }
      return value - 1;
    }), 1000);
    const spawner = window.setInterval(() => {
      const isStorm = Math.random() < 0.19;
      setDrops((items) => [...items, {
        id: nextId.current++, x: 7 + Math.random() * 86, y: -8,
        speed: (isStorm ? 20 : 15 + Math.random() * 5) * (selectedRef.current === 2 ? 0.68 : 1),
        kind: isStorm ? 'storm' : 'rain',
      }]);
    }, 560);
    const motion = window.setInterval(() => setDrops((items) => {
      const remaining: Drop[] = [];
      for (const item of items) {
        const moved = { ...item, y: item.y + item.speed * 0.055 };
        const catchWidth = selectedRef.current === 3 ? 17 : 12;
        const collided = moved.y > 75 && moved.y < 91 && Math.abs(moved.x - playerXRef.current) < catchWidth;
        if (collided) {
          if (moved.kind === 'rain') {
            const gain = selectedRef.current === 0 ? 15 : 10;
            setScore((value) => value + gain); setPop(`+${gain}`); window.setTimeout(() => setPop(null), 260);
          } else if (shieldRef.current) {
            shieldRef.current = false; setShield(false); setPop('擋住了！'); window.setTimeout(() => setPop(null), 500);
          } else {
            setHearts((value) => { const next = value - 1; if (next <= 0) setPhase('over'); return Math.max(0, next) });
            setPop('小心雷電！'); window.setTimeout(() => setPop(null), 500);
          }
          continue;
        }
        if (moved.y < 105) remaining.push(moved);
      }
      return remaining;
    }), 55);
    return () => { window.clearInterval(timer); window.clearInterval(spawner); window.clearInterval(motion) };
  }, [phase]);

  const movePlayer = (clientX: number) => {
    if (phaseRef.current !== 'playing' || !fieldRef.current) return;
    const bounds = fieldRef.current.getBoundingClientRect();
    setPlayerX(Math.max(10, Math.min(90, ((clientX - bounds.left) / bounds.width) * 100)));
  };

  const result = useMemo(() => {
    if (score >= 350) return { title: '彩虹出現了！', note: '今天的雨都被你接住了。', stars: '★★★' };
    if (score >= 180) return { title: '雨快停了！', note: '再來一次，就能看見彩虹。', stars: '★★☆' };
    return { title: '還在下雨呢', note: '換一隻熊貓試試牠的能力吧。', stars: '★☆☆' };
  }, [score]);

  return (
    <main className="page-shell" style={{ '--panda': panda.color, '--panda-pale': panda.pale } as React.CSSProperties}>
      <section className="phone-stage" aria-label="熊貓雨衣隊遊戲">
        <div className="sky-glow" aria-hidden="true" /><div className="rain-lines" aria-hidden="true" />
        <header className="game-header">
          <div className="brand-mark"><CloudRain size={20} strokeWidth={2.5} /></div>
          <div><p className="eyebrow">PANDA RAIN CLUB</p><h1>熊貓雨衣隊</h1></div>
        </header>

        {phase === 'ready' && <div className="ready-screen">
          <div className="intro-copy"><p>接住今天的雨</p><span>左右拖曳熊貓，接水滴、閃雷電。</span></div>
          <div className="hero-panda">
            <span className="ability-pill"><Sparkles size={14} /> {panda.ability}</span>
            <div className="panda-sticker"><img src={panda.image} alt={`${panda.name} 穿著雨衣`} draggable={false} /></div>
            <strong>{panda.name}</strong><small>{panda.detail}</small>
          </div>
          <div className="picker" aria-label="選擇熊貓">
            {pandas.map((item, index) => <button className={index === selected ? 'panda-choice active' : 'panda-choice'} key={item.id}
              onClick={() => setSelected(index)} aria-label={`選擇 ${item.name}：${item.detail}`} aria-pressed={index === selected}
              style={{ '--choice': item.color } as React.CSSProperties}><img src={item.image} alt="" draggable={false} /></button>)}
          </div>
          <Button className="start-button" onClick={startGame}>開始接雨 <span>→</span></Button>
        </div>}

        {phase === 'playing' && <div className="play-field" ref={fieldRef}
          onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); movePlayer(event.clientX) }}
          onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) movePlayer(event.clientX) }}>
          <div className="hud">
            <div className="score-box"><span>水滴</span><strong>{score}</strong></div>
            <div className="timer-box"><Timer size={16} /><strong>{time}</strong><span>秒</span></div>
            <div className="heart-box" aria-label={`剩下 ${hearts} 顆愛心`}>
              {Array.from({ length: selected === 1 ? 4 : 3 }).map((_, index) => <Heart key={index} size={17} fill={index < hearts ? 'currentColor' : 'transparent'} />)}
            </div>
          </div>
          <div className="ability-status">{shield ? <><Shield size={14} /> 地瓜護盾準備中</> : panda.ability}</div>
          {drops.map((drop) => <div key={drop.id} className={`falling-item ${drop.kind}`} style={{ left: `${drop.x}%`, top: `${drop.y}%` }} aria-hidden="true">{drop.kind === 'rain' ? '💧' : '⚡'}</div>)}
          {pop && <div className="score-pop" style={{ left: `${playerX}%` }}>{pop}</div>}
          <div className="player" style={{ left: `${playerX}%` }}>{shield && <span className="shield-ring" />}<img src={panda.image} alt={panda.name} draggable={false} /></div>
          <p className="drag-hint">← 按住並左右拖曳 →</p>
        </div>}

        {phase === 'over' && <div className="result-screen">
          <div className="result-halo" /><div className="result-panda"><img src={panda.image} alt={panda.name} /></div>
          <p className="stars">{result.stars}</p><h2>{result.title}</h2><p>{result.note}</p>
          <div className="final-score"><span>收集水滴</span><strong>{score}</strong></div>
          <Button className="start-button" onClick={startGame}><RotateCcw size={17} /> 再玩一次</Button>
          <button className="change-panda" onClick={() => setPhase('ready')}>換一隻熊貓</button>
        </div>}
      </section>
    </main>
  );
}
