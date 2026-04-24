// js/audio.js
const Audio = (() => {
  let ctx, master, ambiGain, waveGain;
  let running = false;

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.75; master.connect(ctx.destination);
    ambiGain = ctx.createGain(); ambiGain.gain.value = 1; ambiGain.connect(master);
    waveGain = ctx.createGain(); waveGain.gain.value = 0; waveGain.connect(master);
    running = true;
  }

  function ensure() { if (!ctx) init(); if (ctx.state === 'suspended') ctx.resume(); }

  function osc(freq, type, vol, start, dur, target) {
    ensure();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(target || master);
    o.type = type; o.frequency.value = freq;
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now + start);
    g.gain.linearRampToValueAtTime(vol, now + start + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    o.start(now + start); o.stop(now + start + dur + 0.1);
    return { osc: o, gain: g };
  }

  function noise(vol, loFreq, hiFreq, start, dur, loop, target) {
    ensure();
    const len = ctx.sampleRate * Math.min(dur, 4);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = !!loop;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass';
    f.frequency.value = (loFreq + hiFreq) / 2; f.Q.value = 0.8;
    const g = ctx.createGain(); const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now + start);
    g.gain.linearRampToValueAtTime(vol, now + start + 0.3);
    if (!loop) g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    src.connect(f); f.connect(g); g.connect(target || master);
    src.start(now + start);
    if (!loop) src.stop(now + start + dur + 0.1);
    return { src, gain: g };
  }

  function playAmbience() {
    ensure();
    // Ocean waves
    noise(0.07, 150, 600, 0, 999, true, ambiGain);
    // Wind
    noise(0.03, 400, 1200, 0, 999, true, ambiGain);
    // Morning birds (chirps)
    function chirp() {
      if (!running) return;
      osc(700 + Math.random() * 500, 'sine', 0.04, 0, 0.1, ambiGain);
      osc(800 + Math.random() * 500, 'sine', 0.03, 0.12, 0.08, ambiGain);
      setTimeout(chirp, 2500 + Math.random() * 4000);
    }
    setTimeout(chirp, 1500);
  }

  function playEarthquake() {
    ensure();
    // Deep rumble
    noise(0.45, 15, 60, 0, 12, false);
    noise(0.35, 30, 100, 0, 12, false);
    osc(35, 'sawtooth', 0.2, 0, 10);
    // Impact cracks
    for (let i = 0; i < 10; i++) {
      noise(0.7, 80, 300, 0.5 + i * 1.1 + Math.random() * 0.4, 0.25);
    }
    // Fade out ambience
    if (ambiGain) { ambiGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 3); }
  }

  function playWaterRecede() {
    ensure();
    osc(180, 'sine', 0.1, 0, 3); osc(120, 'sine', 0.08, 0.5, 3);
    noise(0.15, 80, 250, 0, 4);
  }

  function playTsunamiApproach() {
    ensure();
    if (ambiGain) ambiGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
    // Build up roar
    const roar = noise(0.6, 60, 1500, 0, 999, true, waveGain);
    waveGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 3);
    // Impact boom
    noise(0.9, 25, 80, 1.5, 2);
    osc(55, 'sawtooth', 0.35, 2, 4);
    // Debris crashes
    for (let i = 0; i < 6; i++) noise(0.6, 200, 900, 2.5 + i * 2.5, 0.7);
    return roar;
  }

  function setWaveVolume(t) {
    if (waveGain) waveGain.gain.value = Math.min(1, t);
  }

  function playAlert() {
    ensure();
    for (let i = 0; i < 4; i++) {
      osc(880, 'square', 0.18, i * 0.55, 0.4);
      osc(660, 'square', 0.13, i * 0.55 + 0.25, 0.2);
    }
  }

  function playRescue() {
    ensure();
    [523, 659, 784, 1047].forEach((f, i) => osc(f, 'sine', 0.18, i * 0.12, 0.2));
  }

  function playObjectiveDone() {
    ensure();
    osc(440, 'sine', 0.15, 0, 0.1); osc(554, 'sine', 0.15, 0.11, 0.12); osc(659, 'sine', 0.2, 0.25, 0.22);
  }

  function playScream() {
    ensure();
    // Human panic sound approximation
    osc(400 + Math.random() * 200, 'sawtooth', 0.08, 0, 0.6);
    osc(350 + Math.random() * 150, 'sine', 0.06, 0.1, 0.5);
  }

  function playFootstep() {
    ensure(); noise(0.12, 100, 300, 0, 0.08);
  }

  function playGameOver() {
    ensure();
    if (waveGain) waveGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2);
    osc(220, 'sawtooth', 0.2, 0, 1.5); osc(165, 'sawtooth', 0.15, 1, 2); osc(110, 'sine', 0.12, 2.5, 3);
  }

  function playWin() {
    ensure();
    if (waveGain) waveGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
    const n = [523, 659, 784, 1047]; n.forEach((f, i) => osc(f, 'sine', 0.2, i * 0.18, 0.4));
    setTimeout(() => n.forEach((f, i) => osc(f, 'sine', 0.15, i * 0.12, 0.5)), 1200);
  }

  function stop() { running = false; if (ctx) ctx.suspend(); }

  return { init, ensure, playAmbience, playEarthquake, playWaterRecede, playTsunamiApproach, setWaveVolume, playAlert, playRescue, playObjectiveDone, playScream, playFootstep, playGameOver, playWin, stop };
})();
