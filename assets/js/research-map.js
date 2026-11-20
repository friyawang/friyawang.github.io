(() => {
  const root = document.getElementById('research-map');
  if (!root) return;
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const panel = root.querySelector('.rm-panel');
  const motionButton = root.querySelector('.rm-motion');
  const hotspotLayer = root.querySelector('.rm-hotspots');
  const html = document.documentElement;
  const W = 1000, H = 440;
  const RAIL_Y = 230;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const t = (en, zh) => (html.dataset.lang === 'zh' ? zh : en);
  const pub = (id, venue, en, zh) => ({ id, venue, en, zh: zh || en });

  const stations = [
    {
      id: 'agent', x: 320, y: 16, w: 360, h: 84,
      name: ['LLM Design Agent', '大模型设计智能体'],
      desc: ['Large language models that retrieve, size, optimize, and verify circuits.', '用大语言模型检索、设计、优化和验证电路。'],
      works: [
        pub('analogretriever', 'ICCAD 2026', 'AnalogRetriever: cross-modal analog circuit retrieval'),
        pub('safertl', 'AICAS 2026', 'SafeRTL: IP-preserving Verilog optimization'),
        pub('analog-design-bench', 'arXiv 2026', 'Analog Design Bench: long-horizon design agents'),
        pub('lithogrpo', 'ICML 2026', 'LithoGRPO: fast inverse lithography'),
        pub('eda-survey', '电子学报 2026', 'Survey on LLMs for EDA', '大语言模型在电子设计自动化中的应用综述')
      ]
    },
    {
      id: 'dcdc', x: 190, y: 168, w: 170, h: 124,
      name: ['DC–DC Converter', 'DC–DC 变换器'],
      desc: ['High-conversion-ratio and multi-output DC–DC converters, e.g., 12 V to 1 V.', '高降压比与多输出 DC–DC 变换器，如 12 V 至 1 V。'],
      works: [
        pub('jssc-2025', 'JSSC 2025', 'CF-SSHC rectifier and multi-output DC–DC with shared capacitors'),
        pub('iscas-2022', 'ISCAS 2022', 'Multi-output, multi-VCR system with shared capacitors')
      ]
    },
    {
      id: 'ldo', x: 440, y: 168, w: 150, h: 124,
      name: ['LDO Regulator', 'LDO 稳压器'],
      desc: ['Low-dropout regulators that turn a noisy supply into a clean one.', '低压差线性稳压器，把有纹波的电源变成干净稳定的电压。'],
      works: [
        pub('icsict-2026', 'ICSICT 2026', 'AI-agent-driven design optimization of FVF LDOs')
      ]
    },
    {
      id: 'load', x: 680, y: 170, w: 120, h: 120,
      name: ['1 V Load', '1 V 负载芯片'],
      desc: ['The digital or SoC load that the power chain ultimately supplies.', '电源链路最终供电的数字或 SoC 负载。'],
      works: []
    },
    {
      id: 'harvest', x: 190, y: 330, w: 170, h: 88,
      name: ['μW Energy Harvesting', '微瓦级能量采集'],
      desc: ['Interface circuits that collect microwatt-level energy from piezoelectric vibration.', '从压电振动中采集微瓦级能量的接口电路。'],
      works: [
        pub('tvlsi-2026', 'TVLSI 2026', 'Multi-input collaborative-flip SSHC design methodology'),
        pub('iscas-2026', 'ISCAS 2026', 'Dual-path SSHC rectifier with decoupled battery'),
        pub('tpel-2025', 'TPEL 2025', 'Reconfigurable piezoelectric harvester array'),
        pub('jssc-2024', 'JSSC 2024', 'Self-bias-flip rectifier and switched-PEH DC–DC for MPPT')
      ]
    }
  ];

  const railSegments = [
    { from: [130, RAIL_Y], to: [190, RAIL_Y], tone: 'hi' },
    { from: [360, RAIL_Y], to: [440, RAIL_Y], tone: 'mid' },
    { from: [590, RAIL_Y], to: [680, RAIL_Y], tone: 'lo' }
  ];
  const harvestPath = [[360, 374], [740, 374], [740, 290]];

  let palette = {};
  function readPalette() {
    const dark = html.dataset.theme === 'dark';
    palette = dark ? {
      bg: '#141b26', grid: 'rgba(145,184,255,.07)', box: '#1c2533', stroke: '#3a4658', ink: '#eaf0f8', muted: '#93a1b7',
      hi: '#f2a65a', mid: '#7fb0ff', lo: '#6fd3a5', agent: '#b49cff', trace: '#3a4658', chip: '#262f3d'
    } : {
      bg: '#f6f8fb', grid: 'rgba(40,91,194,.06)', box: '#ffffff', stroke: '#cfd7e3', ink: '#202a3b', muted: '#647086',
      hi: '#d9822b', mid: '#285bc2', lo: '#1f9d6b', agent: '#6b4fd6', trace: '#c3ccd9', chip: '#eef2f8'
    };
  }

  let scale = 1;
  function resize() {
    const cssW = canvas.clientWidth || W;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    scale = cssW / W;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssW * (H / W) * dpr);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function label(text, x, y, opts = {}) {
    ctx.font = `${opts.weight || 600} ${(opts.size || 14) * 1.4}px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.fillStyle = opts.color || palette.ink;
    ctx.textAlign = opts.align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  function box(s, active) {
    roundRect(s.x, s.y, s.w, s.h, 12);
    ctx.fillStyle = palette.box;
    ctx.fill();
    ctx.lineWidth = active ? 2.5 : 1.5;
    ctx.strokeStyle = active ? palette.mid : palette.stroke;
    ctx.stroke();
  }

  function drawGrid() {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }

  function drawTraces() {
    ctx.lineCap = 'round';
    ctx.strokeStyle = palette.trace;
    ctx.lineWidth = 6;
    railSegments.forEach(seg => { ctx.beginPath(); ctx.moveTo(...seg.from); ctx.lineTo(...seg.to); ctx.stroke(); });
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(...harvestPath[0]);
    harvestPath.slice(1).forEach(p => ctx.lineTo(...p));
    ctx.stroke();
  }

  function pointOnPolyline(points, f) {
    const lens = [];
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const l = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
      lens.push(l); total += l;
    }
    let d = f * total;
    for (let i = 0; i < lens.length; i++) {
      if (d <= lens[i]) {
        const k = d / lens[i];
        return [points[i][0] + (points[i + 1][0] - points[i][0]) * k, points[i][1] + (points[i + 1][1] - points[i][1]) * k];
      }
      d -= lens[i];
    }
    return points[points.length - 1];
  }

  function drawParticles(time) {
    railSegments.forEach((seg, i) => {
      const count = 3;
      for (let k = 0; k < count; k++) {
        const f = ((time * 0.00045) + k / count + i * 0.13) % 1;
        const x = seg.from[0] + (seg.to[0] - seg.from[0]) * f;
        ctx.beginPath();
        ctx.arc(x, RAIL_Y, i === 0 ? 5 : 4, 0, Math.PI * 2);
        ctx.fillStyle = palette[seg.tone];
        ctx.fill();
      }
    });
    for (let k = 0; k < 2; k++) {
      const phase = (time * 0.00018 + k * 0.5) % 1;
      const [x, y] = pointOnPolyline(harvestPath, phase);
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = palette.lo;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function drawSource() {
    roundRect(40, 196, 90, 68, 10);
    ctx.fillStyle = palette.box; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = palette.stroke; ctx.stroke();
    ctx.fillStyle = palette.hi;
    ctx.fillRect(52, 214, 6, 32);
    ctx.fillRect(64, 222, 6, 16);
    label('12 V', 100, 230, { size: 15, weight: 700 });
    label(t('Input', '输入'), 85, 282, { size: 12, color: palette.muted, weight: 500 });
  }

  function drawDcdc(s, time, active) {
    box(s, active);
    label(t('DC–DC', 'DC–DC'), s.x + s.w / 2, s.y + 20, { size: 15 });
    const x0 = s.x + 16, x1 = s.x + s.w - 16, base = s.y + 92, amp = 22;
    ctx.strokeStyle = palette.mid; ctx.lineWidth = 2;
    ctx.beginPath();
    const period = 34, shift = (time * 0.05) % period;
    for (let x = x0; x <= x1; x += 1) {
      const p = ((x - x0 + shift) % period) / period;
      const y = base - (p < 0.55 ? p / 0.55 : (1 - p) / 0.45) * amp;
      x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    label(t('inductor current', '电感电流'), s.x + s.w / 2, s.y + 108, { size: 11, color: palette.muted, weight: 500 });
    label('12 V → 1.2 V', s.x + s.w / 2, s.y + 42, { size: 12, color: palette.muted, weight: 500 });
  }

  function drawLdo(s, time, active) {
    box(s, active);
    label('LDO', s.x + s.w / 2, s.y + 20, { size: 15 });
    const x0 = s.x + 16, x1 = s.x + s.w - 16;
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = palette.mid;
    ctx.beginPath();
    for (let x = x0; x <= x1; x++) {
      const y = s.y + 54 + Math.sin((x + time * 0.12) * 0.35) * 5;
      x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = palette.lo; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(x0, s.y + 88); ctx.lineTo(x1, s.y + 88); ctx.stroke();
    label(t('ripple in', '输入纹波'), s.x + s.w / 2, s.y + 70, { size: 11, color: palette.muted, weight: 500 });
    label(t('clean 1.0 V out', '干净的 1.0 V'), s.x + s.w / 2, s.y + 106, { size: 11, color: palette.muted, weight: 500 });
  }

  function drawLoad(s, time, active) {
    const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    ctx.strokeStyle = palette.stroke; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const o = s.x + 18 + i * 21;
      [[o, s.y, o, s.y - 8], [o, s.y + s.h, o, s.y + s.h + 8], [s.x, s.y + 18 + i * 21, s.x - 8, s.y + 18 + i * 21], [s.x + s.w, s.y + 18 + i * 21, s.x + s.w + 8, s.y + 18 + i * 21]]
        .forEach(([a, b, c, d]) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); });
    }
    roundRect(s.x, s.y, s.w, s.h, 10);
    ctx.fillStyle = palette.chip; ctx.fill();
    ctx.lineWidth = active ? 2.5 : 1.5; ctx.strokeStyle = active ? palette.mid : palette.stroke; ctx.stroke();
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
      const on = Math.sin(time * 0.004 + r * 1.7 + c * 2.9) > -0.2;
      roundRect(cx - 34 + c * 38, cy - 34 + r * 38, 30, 30, 5);
      ctx.fillStyle = on ? palette.lo : palette.box;
      ctx.globalAlpha = on ? 0.75 : 1;
      ctx.fill(); ctx.globalAlpha = 1;
      ctx.lineWidth = 1; ctx.strokeStyle = palette.stroke; ctx.stroke();
    }
    label('1 V', cx, s.y + s.h + 26, { size: 13, weight: 700 });
  }

  function drawHarvester(s, time, active) {
    box(s, active);
    label(t('μW harvester', '微瓦级能量采集'), s.x + s.w / 2, s.y + 18, { size: 13 });
    const ax = s.x + 22, ay = s.y + 56;
    ctx.fillStyle = palette.stroke;
    ctx.fillRect(ax - 8, ay - 16, 10, 32);
    const bend = Math.sin(time * 0.009) * 12;
    ctx.strokeStyle = palette.hi; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(ax + 55, ay, ax + 100, ay + bend);
    ctx.stroke();
    ctx.fillStyle = palette.hi;
    roundRect(ax + 96, ay + bend - 8, 18, 16, 3); ctx.fill();
    label(t('piezo', '压电'), s.x + 62, s.y + 76, { size: 11, color: palette.muted, weight: 500 });
  }

  const agentLines = [
    ['retrieving similar circuits…', '检索相似电路…'],
    ['sizing transistors…', '调整器件尺寸…'],
    ['running simulation…', '运行仿真…'],
    ['spec met ✓', '指标满足 ✓']
  ];
  function drawAgent(s, time, active) {
    roundRect(s.x, s.y, s.w, s.h, 14);
    ctx.fillStyle = palette.box; ctx.fill();
    ctx.lineWidth = active ? 2.5 : 1.5;
    ctx.strokeStyle = active ? palette.agent : palette.stroke; ctx.stroke();
    const blink = (Math.sin(time * 0.006) + 1) / 2;
    ctx.beginPath(); ctx.arc(s.x + 30, s.y + s.h / 2, 16, 0, Math.PI * 2);
    ctx.fillStyle = palette.agent; ctx.globalAlpha = 0.25 + blink * 0.5; ctx.fill(); ctx.globalAlpha = 1;
    label('AI', s.x + 30, s.y + s.h / 2, { size: 12, weight: 800, color: palette.agent });
    label(t('LLM design agent', '大模型设计智能体'), s.x + 56, s.y + 28, { size: 14, align: 'left' });
    const line = agentLines[Math.floor(time / 1600) % agentLines.length];
    label(t(line[0], line[1]), s.x + 56, s.y + 58, { size: 12, color: palette.muted, weight: 500, align: 'left' });

    const targets = [stations[1], stations[2]];
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = palette.agent; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.5;
    targets.forEach(tg => {
      ctx.beginPath(); ctx.moveTo(tg.x + tg.w / 2, s.y + s.h); ctx.lineTo(tg.x + tg.w / 2, tg.y); ctx.stroke();
    });
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    targets.forEach((tg, i) => {
      const f = ((time * 0.0006) + i * 0.5) % 1;
      const y = s.y + s.h + (tg.y - s.y - s.h) * f;
      ctx.beginPath(); ctx.arc(tg.x + tg.w / 2, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = palette.agent; ctx.fill();
    });
  }

  let activeId = null;
  let hoverId = null;
  function draw(time) {
    drawGrid();
    drawTraces();
    drawParticles(time);
    drawSource();
    const on = id => id === activeId || id === hoverId;
    drawAgent(stations[0], time, on('agent'));
    drawDcdc(stations[1], time, on('dcdc'));
    drawLdo(stations[2], time, on('ldo'));
    drawLoad(stations[3], time, on('load'));
    drawHarvester(stations[4], time, on('harvest'));
  }

  function renderPanel() {
    const s = stations.find(st => st.id === activeId);
    if (!s) {
      panel.innerHTML = `<p class="rm-hint">${t('Click a block in the map to see related papers.', '点击图中的模块，查看相关论文。')}</p>`;
      return;
    }
    const works = s.works.length
      ? `<ul class="rm-works">${s.works.map(w => `<li><a href="/publications/#${w.id}">${t(w.en, w.zh)}</a><span>${w.venue}</span></li>`).join('')}</ul>`
      : '';
    panel.innerHTML = `<h4>${t(s.name[0], s.name[1])}</h4><p>${t(s.desc[0], s.desc[1])}</p>${works}`;
  }

  function buildHotspots() {
    hotspotLayer.innerHTML = '';
    stations.forEach(s => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rm-hotspot';
      b.style.left = `${(s.x / W) * 100}%`;
      b.style.top = `${(s.y / H) * 100}%`;
      b.style.width = `${(s.w / W) * 100}%`;
      b.style.height = `${(s.h / H) * 100}%`;
      b.setAttribute('aria-label', t(s.name[0], s.name[1]));
      b.addEventListener('click', () => { activeId = s.id; renderPanel(); if (!running) draw(lastTime); });
      b.addEventListener('mouseenter', () => { hoverId = s.id; if (!running) draw(lastTime); });
      b.addEventListener('mouseleave', () => { hoverId = null; if (!running) draw(lastTime); });
      hotspotLayer.appendChild(b);
    });
  }

  let running = !reduceMotion.matches;
  let lastTime = 0;
  function frame(now) {
    lastTime = now;
    draw(now);
    if (running) requestAnimationFrame(frame);
  }
  function updateMotionButton() {
    motionButton.textContent = running ? t('Pause animation', '暂停动画') : t('Play animation', '播放动画');
    motionButton.setAttribute('aria-pressed', String(!running));
  }
  motionButton.addEventListener('click', () => {
    running = !running;
    updateMotionButton();
    if (running) requestAnimationFrame(frame);
  });

  new MutationObserver(() => {
    readPalette();
    buildHotspots();
    renderPanel();
    updateMotionButton();
    if (!running) draw(lastTime);
  }).observe(html, { attributes: true, attributeFilter: ['data-theme', 'data-lang'] });

  window.addEventListener('resize', () => { resize(); if (!running) draw(lastTime); });

  readPalette();
  resize();
  buildHotspots();
  renderPanel();
  updateMotionButton();
  if (running) requestAnimationFrame(frame);
  else draw(1200);
})();
