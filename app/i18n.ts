export type Language = 'zh' | 'ko';

export function detectUserLanguage(): Language {
  if (typeof window === 'undefined') return 'zh';

  // 1. Check URL query param (e.g. ?lang=ko or ?lang=zh)
  try {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang')?.toLowerCase();
    if (urlLang === 'ko' || urlLang === 'zh') {
      try { localStorage.setItem('panda_language', urlLang); } catch {}
      return urlLang;
    }
  } catch {
    // Continue
  }

  // 2. Prioritize explicitly saved preference by user
  try {
    const saved = localStorage.getItem('panda_language');
    if (saved === 'ko' || saved === 'zh') return saved;
  } catch {
    // Ignore storage errors (e.g. strict privacy mode)
  }

  // 2. Browser language detection (e.g. ko, ko-KR)
  try {
    const nav = window.navigator;
    const languages = nav.languages && nav.languages.length > 0 ? nav.languages : [nav.language || ''];
    const isKoreanLang = languages.some((l) => {
      const lower = (l || '').toLowerCase();
      return lower === 'ko' || lower.startsWith('ko-') || lower === 'kor';
    });
    if (isKoreanLang) return 'ko';
  } catch {
    // Continue
  }

  // 3. Timezone detection (Korea Standard Time: Asia/Seoul, ROK, KST)
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const lowerTz = tz.toLowerCase();
    if (lowerTz === 'asia/seoul' || lowerTz.includes('seoul') || lowerTz.includes('korea')) {
      return 'ko';
    }
  } catch {
    // Continue
  }

  // Other regions default to Chinese
  return 'zh';
}

export const translations = {
  zh: {
    appTitle: '水窪跳跳',
    appSubtitle: 'PANDA RAIN CLUB',
    creditsTooltip: '音樂來源、授權與應援聲明',
    langToggleTitle: '한국어로 전환',
    langLabel: '繁中',
    audioOn: '開啟音樂與音效',
    audioOff: '靜音',
    soundBtnLabelOn: '聲音',
    soundBtnLabelOff: '靜音',
    exitBtn: '離開',
    distanceLabel: '距離',
    speedLabel: '速度',
    invulnerableStatus: '無敵中',
    rainbowStatus: '狂暴衝刺',
    widePuddleTag: '×2 連跳',
    tapCallout: '×2 連點翻轉 · 路上撿拾道具與歌曲字母',
    play: {
      ariaPlay: '輕點跳過石頭與水窪，長水窪連點兩下空中翻轉',
    },
    ready: {
      badge: 'NEW · WEATHER & ITEMS',
      title: '跳過水窪、收集雨天道具！',
      desc: '輕點跳躍；遇到標示 ×2 的長水窪，連點兩下翻轉。路上可撿拾 ☂️ 護盾、💖 愛心與 🌈 彩虹衝刺！',
      startBtn: '開始跳跳',
      leaderboardBtn: '雨天排行榜',
      selectPandaAria: '選擇熊貓',
      choosePandaPrefix: '選擇',
    },
    weather: {
      day: { name: '白天下雨', icon: '🌦️' },
      sunset: { name: '夕暮微雨', icon: '🌅' },
      storm: { name: '狂風暴雨', icon: '⛈️' },
      night: { name: '霓虹夜雨', icon: '🌙' },
    },
    waveSubtitles: {
      1: '舒爽起跑',
      2: 'WAVE 2 · 步頻加快',
      3: 'WAVE 3 · 暴風疾馳',
      4: 'WAVE 4 · 極限狂奔',
      5: 'WAVE 5 · 音速突圍',
      6: 'WAVE 6 · 狂暴穿梭',
      7: 'WAVE 7 · 流星神速',
      8: 'WAVE 8 · 超越極限',
      infiniteSubtitle: (mult: string) => `速度加乘 ×${mult} · 巔峰挑戰`,
    },
    songQuest: {
      artist: 'Apink',
      roundProgress: (cur: number, total: number, bonus: number) => `第 ${cur}/${total} 首 · 加成 +${bonus}%`,
      allStandardDone: '前 5 首常規歌曲全數收集完成！加成 +50%',
      luckySongTitle: (count: number) => `幸運歌曲 (${count} 字母)`,
      luckySongUnlocked: (title: string) => `幸運歌曲《${title}》解鎖！`,
      luckyAchieved: '幸運達成 +100%',
      luckyBonus: '幸運加成 +100%',
      charDone: '已收集',
      charNext: '下一個目標',
      charPending: '未收集',
      luckyRevealed: (char: string) => `已翻開 [${char}]`,
      luckySecret: (idx: number) => `第 ${idx} 個神秘單字`,
    },
    toasts: {
      flip: '空中翻轉！ 跳更遠',
      jumpGood: '跳過！ +100',
      ouch: '碰到了！',
      needFlip: '要連點兩下！',
      shield: '拾得雨傘護盾！ 抵擋一次障礙',
      heal: '撿到愛心！ 生命+1',
      rainbow: '狂暴彩虹衝刺！ 無敵加速',
      star: '幸運金星！ 距離+150m',
      letterCollect: (char: string, cur: number, total: number) => `收集單字 [${char}] ! (${cur}/${total}) +50m`,
      secretCollect: (char: string) => `收集神秘單字 [${char}] ! +80m`,
      songUnlocked: (bonus: number) => `歌曲解鎖！加成已提高至 +${bonus}%`,
    },
    pause: {
      title: '遊戲已暫停',
      confirmTitle: '要離開這場遊戲嗎？',
      confirmDesc: '目前的距離與時間將不會保留。',
      resumeBtn: '繼續遊戲',
      leaveBtn: '離開遊戲',
      audioMuted: '目前已靜音 · 點擊開啟聲音',
      audioPlaying: '音樂與音效播放中 · 點擊靜音',
    },
    result: {
      ranks: {
        legend: '雨天傳奇大師！',
        storm: '跳過整場大雨！',
        pro: '雨靴高手！',
        tryAgain: '再試一次！',
      },
      summaryTitle: (name: string) => `${name} 雨天挑戰結算`,
      recordNewTitle: '突破個人最高紀錄！',
      recordNewDesc: (oldScore: number, newScore: number, diff: number) =>
        `原紀錄 ${oldScore}m ➔ 本次新高 ${newScore}m · 進步 +${diff}m`,
      recordKeepTitle: (best: number) => `目前個人最佳紀錄：${best}m`,
      recordKeepDesc: (cur: number, best: number) =>
        `本次結算 ${cur}m 未超越 · 排行榜將妥善保留你的 ${best}m 最高紀錄`,
      recordTiedTitle: '追平個人最高紀錄！',
      recordTiedDesc: (best: number) => `再次達到 ${best}m · 表現極為穩定！`,
      recordFirstTitle: (score: number) => `初次挑戰結算：${score}m`,
      recordFirstDesc: '立即送出即可將個人最高紀錄登錄在雨天排行榜！',
      baseDistance: '基礎奔跑距離',
      songHits: (count: number) => `Apink 歌曲命中 (${count}/5 首)`,
      luckyHit: (isAchieved: boolean, count: number, total: number) =>
        `✨ 幸運歌曲${isAchieved ? ' (達成)' : ` (${count}/${total} 字)`}`,
      finalTotal: (bonus: number) => `結算總成績 (+${bonus}%)`,
      survivalSummary: (time: number, wave: number) => `存活時間 ${time} 秒 · 挑戰至 Wave ${wave}`,
      mvHeader: (hits: number) => `本回合 Apink 歌曲 MV（命中 ${hits}/6）`,
      mvDesc: '點選 YouTube 預覽卡片即可直接跳轉觀賞官方 MV',
      mvWatchHit: '▶ 點此觀看官方 MV',
      mvWatchLocked: '🎧 點此觀看 MV',
      mvLuckyTag: '🌟 幸運歌曲 100%',
      mvLuckyBlindTag: (count: number, total: number) => `🔮 幸運歌曲 (${count}/${total})`,
      mvHitTag: '✓ 命中收集',
      mvTrackIndex: (idx: number) => `第 ${idx} 首`,
      inputPlaceholder: '輸入暱稱或 IG 帳號',
      inputAria: '排行榜名稱',
      btnSyncing: '同步中…',
      btnUpdatedBest: '✅ 最高紀錄已更新',
      btnSubmitted: '✅ 成績已登錄',
      btnUpdateScore: (score: number) => `🚀 更新成績上去 (${score}m)`,
      btnKeepBest: (best: number) => `保留最高紀錄 (${best}m)`,
      btnSubmitNew: '登上排行榜',
      replayBtn: '再跳一次',
      changePandaBtn: '換一隻熊貓',
    },
    leaderboard: {
      title: '雨天跳跳排行榜',
      closeAria: '關閉排行榜',
      myRank: '我的名次',
      emptyTitle: '還沒有成績',
      emptyDesc: '完成第一場雨天挑戰，搶下榜首吧！',
      backToGame: '回到遊戲',
    },
    credits: {
      title: '音樂來源與活動聲明',
      closeAria: '關閉說明',
      disclaimerBadge: '📌 應援聲明',
      disclaimerText:
        '本活動為粉絲自製應援小遊戲，不進行任何商業販售，並與官方無關，若有侵犯權益請告知會立即下架關閉。',
      bgmSection: '🎵 背景音樂 (BGM) 來源與授權',
      bgmTitle: 'Empty Mind (雨天 Lo-Fi 輕音樂)',
      bgmLicense: 'Pixabay 免版稅授權',
      bgmCreator: '創作者：Lofi_hour',
      bgmPlatform: '來源平台：Pixabay Music (ID: 118973)',
      bgmDesc: '遵循 Pixabay Content License，允許商業與非商業在網站、遊戲中免費公開播放，無須強制署名。',
      sfxSection: '🔊 遊戲音效 (SFX)',
      sfxTitle: 'Web Audio API 即時頻率合成',
      sfxTag: '代碼原創',
      sfxDesc:
        '跳躍、翻滾、水窪碰撞濺水、愛心/護盾/彩虹道具、Apink 歌曲字母收集與通關慶祝音效，皆由代碼透過瀏覽器標準 Web Audio API 即時振盪器運算合成，無使用任何第三方版權音效包，零版權疑慮。',
      doneBtn: '我知道了',
    },
  },
  ko: {
    appTitle: '물웅덩이 깡총',
    appSubtitle: 'PANDA RAIN CLUB',
    creditsTooltip: '음악 출처, 라이선스 및 팬 공지',
    langToggleTitle: '切換為中文',
    langLabel: '한국어',
    audioOn: '음악 및 효과음 켜기',
    audioOff: '음소거',
    soundBtnLabelOn: '소리',
    soundBtnLabelOff: '음소거',
    exitBtn: '나가기',
    distanceLabel: '거리',
    speedLabel: '속도',
    invulnerableStatus: '무적 상태',
    rainbowStatus: '무지개 질주',
    widePuddleTag: '×2 더블점프',
    tapCallout: '×2 더블 탭 회전 · 길에서 아이템과 노래 알파벳 수집',
    play: {
      ariaPlay: '가볍게 탭하여 돌과 웅덩이를 뛰어넘고, 넓은 웅덩이는 더블 탭으로 공중회전',
    },
    ready: {
      badge: 'NEW · WEATHER & ITEMS',
      title: '물웅덩이를 뛰어넘고 비 오는 날 아이템을 모으세요!',
      desc: '가볍게 탭하여 점프! ×2 표시가 있는 넓은 웅덩이는 더블 탭으로 공중회전! 도중에 ☂️ 우산 방패, 💖 하트, 🌈 무지개 대시를 획득할 수 있어요!',
      startBtn: '게임 시작',
      leaderboardBtn: '빗속 랭킹',
      selectPandaAria: '판다 선택',
      choosePandaPrefix: '선택:',
    },
    weather: {
      day: { name: '낮 비', icon: '🌦️' },
      sunset: { name: '노을 비', icon: '🌅' },
      storm: { name: '폭풍우', icon: '⛈️' },
      night: { name: '밤 비', icon: '🌙' },
    },
    waveSubtitles: {
      1: '산뜻한 출발',
      2: 'WAVE 2 · 템포 업',
      3: 'WAVE 3 · 폭풍 질주',
      4: 'WAVE 4 · 한계 돌파',
      5: 'WAVE 5 · 음속 대시',
      6: 'WAVE 6 · 광란의 질주',
      7: 'WAVE 7 · 유성 스피드',
      8: 'WAVE 8 · 에이핑크 오버드라이브',
      infiniteSubtitle: (mult: string) => `속도 배율 ×${mult} · 정점 도전`,
    },
    songQuest: {
      artist: '에이핑크',
      roundProgress: (cur: number, total: number, bonus: number) => `제 ${cur}/${total} 곡 · 보너스 +${bonus}%`,
      allStandardDone: '정규 5곡 수집 완료! 보너스 +50%',
      luckySongTitle: (count: number) => `행운의 곡 (${count}글자)`,
      luckySongUnlocked: (title: string) => `행운의 곡 《${title}》 해금!`,
      luckyAchieved: '행운 달성 +100%',
      luckyBonus: '행운 보너스 +100%',
      charDone: '수집 완료',
      charNext: '다음 목표',
      charPending: '미수집',
      luckyRevealed: (char: string) => `확인됨 [${char}]`,
      luckySecret: (idx: number) => `제 ${idx}번째 비밀 알파벳`,
    },
    toasts: {
      flip: '공중회전! 더 멀리 점프',
      jumpGood: '점프 성공! +100',
      ouch: '부딪혔어요!',
      needFlip: '더블 탭 하세요!',
      shield: '우산 방패 획득! 장애물 1회 방어',
      heal: '하트 획득! 생명 +1',
      rainbow: '무지개 대시! 무적 가속',
      star: '행운의 별! 거리 +150m',
      letterCollect: (char: string, cur: number, total: number) => `알파벳 [${char}] 수집! (${cur}/${total}) +50m`,
      secretCollect: (char: string) => `비밀 알파벳 [${char}] 수집! +80m`,
      songUnlocked: (bonus: number) => `노래 해금! 보너스 +${bonus}% 달성`,
    },
    pause: {
      title: '게임 일시정지',
      confirmTitle: '게임을 종료하시겠습니까?',
      confirmDesc: '현재 거리와 시간은 저장되지 않습니다.',
      resumeBtn: '계속하기',
      leaveBtn: '나가기',
      audioMuted: '음소거 중 · 탭하여 소리 켜기',
      audioPlaying: '소리 재생 중 · 탭하여 음소거',
    },
    result: {
      ranks: {
        legend: '빗속 전설의 마스터!',
        storm: '폭우를 뛰어넘다!',
        pro: '레인부츠 달인!',
        tryAgain: '다시 도전해 보세요!',
      },
      summaryTitle: (name: string) => `${name} 비 오는 날 도전 정산`,
      recordNewTitle: '개인 최고 기록 경신!',
      recordNewDesc: (oldScore: number, newScore: number, diff: number) =>
        `이전 기록 ${oldScore}m ➔ 이번 신기록 ${newScore}m · +${diff}m 상승`,
      recordKeepTitle: (best: number) => `현재 개인 최고 기록: ${best}m`,
      recordKeepDesc: (cur: number, best: number) =>
        `이번 기록 ${cur}m · 랭킹에는 최고 기록 ${best}m가 보존됩니다`,
      recordTiedTitle: '개인 최고 기록 타이!',
      recordTiedDesc: (best: number) => `다시 ${best}m 달성 · 매우 안정적인 실력입니다!`,
      recordFirstTitle: (score: number) => `첫 도전 결과: ${score}m`,
      recordFirstDesc: '닉네임을 등록하고 빗속 랭킹에 이름을 올려보세요!',
      baseDistance: '기본 달린 거리',
      songHits: (count: number) => `에이핑크 곡 적중 (${count}/5 곡)`,
      luckyHit: (isAchieved: boolean, count: number, total: number) =>
        `✨ 행운의 곡${isAchieved ? ' (달성)' : ` (${count}/${total} 글자)`}`,
      finalTotal: (bonus: number) => `최종 결산 점수 (+${bonus}%)`,
      survivalSummary: (time: number, wave: number) => `생존 시간 ${time}초 · Wave ${wave} 도달`,
      mvHeader: (hits: number) => `이번 라운드 에이핑크 MV (수집 ${hits}/6)`,
      mvDesc: '유튜브 카드를 클릭하면 공식 MV로 이동합니다',
      mvWatchHit: '▶ 공식 MV 보러가기',
      mvWatchLocked: '🎧 MV 감상하기',
      mvLuckyTag: '🌟 행운의 곡 100%',
      mvLuckyBlindTag: (count: number, total: number) => `🔮 행운의 곡 (${count}/${total})`,
      mvHitTag: '✓ 수집 완료',
      mvTrackIndex: (idx: number) => `제 ${idx} 곡`,
      inputPlaceholder: '닉네임 또는 SNS 아이디 입력',
      inputAria: '랭킹 닉네임',
      btnSyncing: '동기화 중…',
      btnUpdatedBest: '✅ 최고 기록 업데이트 완료',
      btnSubmitted: '✅ 기록 등록 완료',
      btnUpdateScore: (score: number) => `🚀 신기록 등록하기 (${score}m)`,
      btnKeepBest: (best: number) => `최고 기록 유지 (${best}m)`,
      btnSubmitNew: '랭킹 등록하기',
      replayBtn: '다시 도전',
      changePandaBtn: '다른 판다 선택',
    },
    leaderboard: {
      title: '빗속 깡총 랭킹',
      closeAria: '랭킹 닫기',
      myRank: '내 순위',
      emptyTitle: '아직 기록이 없습니다',
      emptyDesc: '첫 도전을 완료하고 1위를 차지해 보세요!',
      backToGame: '게임으로 돌아가기',
    },
    credits: {
      title: '음악 출처 및 공지',
      closeAria: '닫기',
      disclaimerBadge: '📌 팬 서포트 안내',
      disclaimerText:
        '본 프로젝트는 비영리 팬 서포트 미니게임으로, 어떠한 상업적 판매도 하지 않으며 소속사와 무관합니다. 권리 침해 관련 문의 시 즉시 조치하겠습니다.',
      bgmSection: '🎵 배경음악 (BGM) 출처 및 라이선스',
      bgmTitle: 'Empty Mind (비 오는 날 Lo-Fi 이지리스닝)',
      bgmLicense: 'Pixabay 로열티 프리 라이선스',
      bgmCreator: '아티스트: Lofi_hour',
      bgmPlatform: '플랫폼: Pixabay Music (ID: 118973)',
      bgmDesc: 'Pixabay Content License에 따라 상업적/비상업적 웹사이트 및 게임에서 무료 공개 재생이 가능합니다.',
      sfxSection: '🔊 게임 효과음 (SFX)',
      sfxTitle: 'Web Audio API 실시간 주파수 합성',
      sfxTag: '오리지널 코드',
      sfxDesc:
        '점프, 회전, 물웅덩이 충돌, 하트/방패/무지개 아이템, 에이핑크 노래 알파벳 수집 및 클리어 사운드는 모두 브라우저 표준 Web Audio API 발진기를 통해 실시간 코드로 합성되었으며, 저작권 이슈가 전혀 없습니다.',
      doneBtn: '확인했습니다',
    },
  },
};
