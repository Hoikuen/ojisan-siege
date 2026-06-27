// 手続き的サウンド（アセット不要・Web Audioで合成）。
// 画像と同じく「絵/音を後で差し替え」前提だが、最小ループの手応えのため軽い効果音を鳴らす。
// すべて try/catch で守り、音が出せない環境（headless検証など）でもゲームを止めない。

let ctx = null;
let master = null;
let muted = false;

function ensure() {
  if (muted) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch (e) {
    return null;
  }
}

// 単発トーン（周波数スライド対応）
function tone({ freq = 440, dur = 0.1, type = 'square', vol = 1, slideTo = null, delay = 0 }) {
  const c = ensure();
  if (!c || !master) return;
  try {
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  } catch (e) { /* 無音で続行 */ }
}

// 連音（ジングル用）
function seq(notes, type = 'triangle', step = 0.13, vol = 0.22, dur = 0.18) {
  notes.forEach((f, i) => tone({ freq: f, dur, type, vol, delay: i * step }));
}

export const Sfx = {
  resume() { ensure(); },
  setMuted(m) {
    muted = m;
    try { if (m && ctx) ctx.suspend(); else if (!m) ensure(); } catch (e) { /* noop */ }
  },
  isMuted() { return muted; },

  fire()    { tone({ freq: 520, dur: 0.05, type: 'square',   vol: 0.10, slideTo: 300 }); },
  hit()     { tone({ freq: 240, dur: 0.04, type: 'triangle', vol: 0.10 }); },
  explode() { tone({ freq: 180, dur: 0.18, type: 'sawtooth', vol: 0.18, slideTo: 60 }); },
  kill()    { tone({ freq: 640, dur: 0.06, type: 'square',   vol: 0.14, slideTo: 880 }); },
  build()   { tone({ freq: 360, dur: 0.10, type: 'square',   vol: 0.20, slideTo: 620 }); },
  upgrade() { tone({ freq: 560, dur: 0.12, type: 'square',   vol: 0.20, slideTo: 940 }); },
  sell()    { tone({ freq: 620, dur: 0.10, type: 'triangle', vol: 0.18, slideTo: 320 }); },
  leak()    { tone({ freq: 220, dur: 0.20, type: 'sawtooth', vol: 0.22, slideTo: 90 }); },
  wave()    { tone({ freq: 440, dur: 0.14, type: 'triangle', vol: 0.20, slideTo: 680 }); },
  win()     { seq([523, 659, 784, 1047], 'triangle', 0.14, 0.24, 0.2); },
  lose()    { seq([330, 247, 165], 'sawtooth', 0.2, 0.22, 0.3); },
};
