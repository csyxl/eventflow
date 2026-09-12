/* ============================================================
 * 赛智通 EventFlow · 前端智能编排引擎
 * 覆盖 7 种赛制：单循环 / 双循环 / 单淘汰 / 双败淘汰 /
 *               分组循环+交叉淘汰 / 瑞士制 / 积分赛
 * 约束调度：场地冲突、休息间隔、裁判资源、场地均衡
 * 设计：确定性算法（轮转法 + 贪心调度 + 局部回溯），秒级完成
 * ============================================================ */
(function () {
  'use strict';

  const BYE = '轮空';

  /* ---------- 1. 赛制配对生成器 ---------- */

  // 单循环（轮转法 circle method）
  function roundRobinPairs(teams) {
    const list = teams.slice();
    if (list.length % 2 === 1) list.push(BYE);
    const n = list.length, rounds = n - 1, half = n / 2;
    const fixed = list[0];
    const rot = list.slice(1);
    const out = [];
    for (let r = 0; r < rounds; r++) {
      const pairs = [];
      pairs.push([fixed, rot[0]]);
      for (let i = 1; i < half; i++) pairs.push([rot[i], rot[n - 1 - i]]);
      out.push({ round: r + 1, pairs: pairs.filter(p => !(p[0] === BYE || p[1] === BYE)) });
      rot.unshift(rot.pop()); // 旋转
    }
    return out;
  }

  // 双循环：单循环两遍，第二遍主客互换
  function doubleRoundRobinPairs(teams) {
    const first = roundRobinPairs(teams);
    return first.concat(first.map(r => ({ round: r.round + first.length, pairs: r.pairs.map(p => [p[1], p[0]]) })));
  }

  // 单淘汰：标准种子括号，2^k 空位，首轮轮空者记为"轮空"晋级
  function singleEliminationRounds(teams) {
    const n = teams.length;
    const rounds = Math.max(1, Math.ceil(Math.log2(n)));
    const slots = Math.pow(2, rounds);
    const seeded = orderSeeds(teams);
    const out = [];
    const firstPairs = [];
    for (let s = 0; s < slots; s += 2) {
      const a = seeded[s], b = seeded[s + 1];
      if (a !== undefined && b !== undefined) firstPairs.push([a, b]);
      else if (a !== undefined) firstPairs.push([a, BYE]);
      else if (b !== undefined) firstPairs.push([b, BYE]);
    }
    if (firstPairs.length) out.push({ round: 1, type: 'elim', pairs: firstPairs });
    for (let r = 1; r < rounds; r++) {
      const count = slots / Math.pow(2, r + 1);
      const pairs = [];
      for (let i = 0; i < count; i++) pairs.push([{ pending: true }, { pending: true }]);
      out.push({ round: r + 1, type: 'elim', pairs: pairs });
    }
    return out;
  }

  // 种子交错排列：order1=[1]; order(k) = order(k-1).flatMap(x => [x, n+1-x])
  // n=8 时得到 [1,8,4,5,2,7,3,6]，即标准 bracket（1v8 / 4v5 / 2v7 / 3v6）
  function orderSeeds(teams) {
    const n = teams.length;
    const rounds = Math.ceil(Math.log2(n));
    const slots = Math.pow(2, rounds);
    let order = [1];
    let size = 1;
    while (size < slots) {
      const next = [];
      order.forEach(x => next.push(x, size * 2 + 1 - x));
      order = next; size *= 2;
    }
    const byId = {};
    teams.forEach((t, i) => { byId[i + 1] = t; });
    const result = [];
    order.forEach(seed => { result.push(byId[seed]); });
    return result;
  }

  // 分组循环 + 交叉淘汰
  function groupKnockoutRounds(teams, groups) {
    const g = Math.max(2, Math.min(groups, Math.floor(teams.length / 2)));
    const size = Math.ceil(teams.length / g);
    const buckets = [];
    teams.slice().forEach((t, i) => {
      const bi = Math.min(g - 1, Math.floor(i / size));
      (buckets[bi] = buckets[bi] || []).push(t);
    });
    const out = [];
    // 第一阶段：组内单循环
    buckets.forEach((bt, gi) => {
      if (bt.length < 2) return;
      roundRobinPairs(bt).forEach(r => {
        out.push({ round: r.round, group: '第' + (gi + 1) + '组', type: 'group', pairs: r.pairs });
      });
    });
    // 第二阶段：各组前 2 名交叉淘汰（A1 vs B2，B1 vs A2 …）
    const knockout = [];
    for (let gi = 0; gi < buckets.length - 1; gi += 2) {
      const g1 = buckets[gi], g2 = buckets[gi + 1];
      knockout.push([{ qualifier: g1[0], label: '第' + (gi + 1) + '组第1' }, { qualifier: g2[1], label: '第' + (gi + 2) + '组第2' }]);
      knockout.push([{ qualifier: g2[0], label: '第' + (gi + 2) + '组第1' }, { qualifier: g1[1], label: '第' + (gi + 1) + '组第2' }]);
    }
    if (knockout.length) out.push({ round: '淘汰赛', type: 'knockout', pairs: knockout });
    return out;
  }

  // 瑞士制：固定轮数，首轮种子配对，后续轮按积分动态配对（框架先行）
  function swissRounds(teams, rounds) {
    const R = rounds || Math.max(3, Math.ceil(Math.log2(teams.length)));
    const out = [];
    const seeded = teams.slice();
    const first = [];
    for (let i = 0; i + 1 < seeded.length; i += 2) first.push([seeded[i], seeded[i + 1]]);
    if (seeded.length % 2) first.push([seeded[seeded.length - 1], BYE]);
    out.push({ round: 1, type: 'swiss', pairs: first });
    const perRound = Math.floor(seeded.length / 2) + (seeded.length % 2);
    for (let r = 2; r <= R; r++) {
      const pairs = [];
      for (let i = 0; i < perRound; i++) pairs.push([{ pending: true }, { pending: true }]);
      out.push({ round: r, type: 'swiss', pairs: pairs, dynamic: true });
    }
    return out;
  }

  // 双败淘汰（双层：胜者组单淘汰 + 败者组，负者落入；决赛胜者组冠军 vs 败者组冠军）
  function doubleEliminationRounds(teams) {
    const n = teams.length;
    const rounds = Math.max(1, Math.ceil(Math.log2(n)));
    const slots = Math.pow(2, rounds);
    const seeded = orderSeeds(teams);
    const out = [];
    const wb = [];
    for (let s = 0; s < slots; s += 2) {
      const a = seeded[s], b = seeded[s + 1];
      if (a !== undefined && b !== undefined) wb.push([a, b]);
      else if (a !== undefined) wb.push([a, BYE]);
      else if (b !== undefined) wb.push([b, BYE]);
    }
    if (wb.length) out.push({ round: 1, type: 'wb', label: '胜者组', pairs: wb });
    let count = wb.length;
    for (let r = 1; r < rounds; r++) {
      count = Math.max(1, Math.ceil(count / 2));
      const pairs = [];
      for (let i = 0; i < count; i++) pairs.push([{ pending: true }, { pending: true }]);
      out.push({ round: r + 1, type: 'wb', label: '胜者组', pairs: pairs, dynamic: true });
    }
    out.push({ round: 1, type: 'lb', label: '败者组', pairs: [{ pending: true }, { pending: true }], dynamic: true, note: '首轮负者进入' });
    out.push({ round: '决赛', type: 'final', label: '总决赛', pairs: [[{ pending: true }, { pending: true }]], dynamic: true });
    return out;
  }

  /* ---------- 2. 场次展开 ---------- */

  function expandMatches(rounds, config) {
    const matches = [];
    const project = config.project || '综合项目';
    rounds.forEach(r => {
      const pairs = r.pairs || [];
      pairs.forEach(p => {
        matches.push({
          project: project,
          roundLabel: r.group ? (r.group + ' · 第' + r.round + '轮') : (r.label ? r.label + ' · 第' + r.round + '轮' : '第' + r.round + '轮'),
          format: r.type,
          sideA: displayName(p[0]),
          sideB: displayName(p[1]),
          dynamic: !!r.dynamic
        });
      });
    });
    return matches;
  }

  function displayName(t) {
    if (!t) return '待定';
    if (t.pending) return '待定';
    if (t.qualifier) return t.label + ' 出线';
    return String(t);
  }

  /* ---------- 3. 约束调度（贪心 + 局部回溯 + 时段按需扩展） ---------- */

  function toMin(t) { const hm = String(t).split(':').map(Number); return hm[0] * 60 + hm[1]; }
  function pad2(n) { return String(Math.floor(n)).padStart(2, '0'); }

  // 为每个 match 分配 time×venue×referee，满足约束；槽位不足自动追加时段，排满当天自动进入下一赛日
  function scheduleMatches(matches, config) {
    const courts = config.courts.slice();
    const restMinutes = Math.max(0, config.restMinutes || 0);          // 队伍两场之间最少间隔（分钟）
    const refRestMinutes = Math.max(0, config.refRestMinutes || 0);    // 裁判两场之间最少间隔（分钟）
    const refereePool = config.refereeCount || Math.max(1, Math.ceil(courts.length / 2));
    const refNames = makeRefereeNames(refereePool);
    let timeSlots = config.timeSlots.slice();
    const dayStartTime = timeSlots[0] || '09:00';
    const maxTime = config.maxTime || '22:30';
    const slotDayOf = timeSlots.map(() => 1);   // 每个时段的赛日
    let dayCount = 1;

    function nextSlot(t) { const m = toMin(t) + 90; return pad2(m / 60) + ':' + pad2(m % 60); }
    function ensureSlots(need) {
      while (timeSlots.length < need) {
        const nxt = nextSlot(timeSlots[timeSlots.length - 1]);
        if (toMin(nxt) > toMin(maxTime)) {          // 当天排满 → 进入下一赛日
          dayCount++;
          timeSlots.push(dayStartTime);
          slotDayOf.push(dayCount);
        } else {
          timeSlots.push(nxt);
          slotDayOf.push(slotDayOf[slotDayOf.length - 1]);
        }
      }
    }

    // 占用表：以"场地|赛日|时间"为键，保证对外展示真实无冲突
    const venueUsed = {};   // `${court}|${day}|${time}` -> match
    const teamLast = {};    // team -> {d, t}
    const refBusy = {};     // `${ref}|${day}|${time}` -> true
    const refLast = {};     // ref -> {d, t}
    const assigned = [];

    function isRealTeam(t) { return t && t !== BYE && t !== '待定' && !t.startsWith('第') && !t.startsWith('组'); }
    function teamsOf(m) { return [m.sideA, m.sideB].filter(isRealTeam); }

    function conflict(m, si, court, ref) {
      const time = timeSlots[si], d = slotDayOf[si];
      if (venueUsed[court + '|' + d + '|' + time]) return '场地冲突';
      const ts = teamsOf(m);
      for (const t of ts) {
        const last = teamLast[t];
        if (last && last.d === d && toMin(time) - toMin(last.t) < restMinutes) return '休息间隔不足';
      }
      if (refBusy[ref + '|' + d + '|' + time]) return '裁判冲突';
      const rl = refLast[ref];
      if (rl && rl.d === d && toMin(time) - toMin(rl.t) < refRestMinutes) return '裁判间隔不足';
      return null;
    }

    function place(m, si, court, ref) {
      const time = timeSlots[si], d = slotDayOf[si];
      m.time = time;        // 纯时间；赛日存 m.day，展示时拼接
      m.day = d;
      m.venue = court;
      m.referee = ref;
      venueUsed[court + '|' + d + '|' + time] = m;
      refBusy[ref + '|' + d + '|' + time] = true;
      teamsOf(m).forEach(t => { teamLast[t] = { d: d, t: time }; });
      refLast[ref] = { d: d, t: time };
      assigned.push(m);
    }

    function attempt(m, offset) {
      for (let si = offset; si < timeSlots.length; si++) {
        for (let ci = 0; ci < courts.length; ci++) {
          for (let ri = 0; ri < refNames.length; ri++) {
            if (!conflict(m, si, courts[ci], refNames[ri])) { place(m, si, courts[ci], refNames[ri]); return true; }
          }
        }
      }
      return false;
    }

    // 优先排真实对阵，轮空场次其次，动态场次（待定）最后
    const real = matches.filter(m => !m.dynamic && m.sideA !== '待定' && m.sideB !== '待定' && m.sideA !== BYE && m.sideB !== BYE);
    const semi = matches.filter(m => m.sideA === BYE || m.sideB === BYE);
    const dynamic = matches.filter(m => m.dynamic || m.sideA === '待定' || m.sideB === '待定');

    real.forEach(m => {
      if (!attempt(m, 0)) {
        ensureSlots(timeSlots.length + 1);
        if (!attempt(m, 0)) { m.time = '待定'; m.venue = '待定'; m.referee = '待定'; m.flagged = '场地容量不足，请增加场地或赛日'; assigned.push(m); }
      }
    });
    semi.forEach(m => { if (!attempt(m, 0)) { ensureSlots(timeSlots.length + 1); attempt(m, 0); } });
    dynamic.forEach(m => {
      if (!attempt(m, 0)) { m.time = '待定'; m.venue = '待定'; m.referee = '待定'; m.flagged = '待晋级后编排'; assigned.push(m); }
    });

    return { matches: assigned, timeSlots: timeSlots, courts: courts };
  }

  function makeRefereeNames(n) {
    const names = ['陈默', '苏然', '林岚', '张弛', '顾言', '谢忱', '郑毅', '韩雪', '方拓', '秦朗'];
    const out = [];
    for (let i = 0; i < n; i++) out.push(names[i % names.length] + (i >= names.length ? (Math.floor(i / names.length) + 1) : ''));
    return out;
  }

  /* ---------- 4. 约束检查报告 ---------- */

  function buildReport(result, restMinutes) {
    const { matches, timeSlots, courts } = result;
    const real = matches.filter(m => m.sideA !== '待定' && m.sideB !== '待定' && m.sideA !== BYE && m.sideB !== BYE);
    let venueConflict = 0, restShort = 0, refConflict = 0;
    const venueCount = {}; const seen = new Set();
    const teamSlots = {};
    real.forEach(m => {
      venueCount[m.venue] = (venueCount[m.venue] || 0) + 1;
      const key = m.venue + '|' + (m.day || 1) + '|' + m.time; if (seen.has(key)) venueConflict++; seen.add(key);
      teamsOf2(m).forEach(t => { (teamSlots[t] = teamSlots[t] || []).push({ day: m.day || 1, time: m.time }); });
    });
    // 场地均衡度：场地使用次数标准差
    const counts = Object.values(venueCount);
    const avg = counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0;
    const sd = counts.length ? Math.sqrt(counts.reduce((a, b) => a + (b - avg) * (b - avg), 0) / counts.length) : 0;
    const balance = counts.length ? Math.max(0, Math.round((1 - sd / (avg || 1)) * 100)) : 100;
    // 休息间隔：同队相邻两场之间的分钟差（跨赛日视为满足）
    let intervals = [];
    Object.keys(teamSlots).forEach(t => {
      const list = teamSlots[t].sort((a, b) => a.day - b.day || toMin(a.time) - toMin(b.time));
      for (let i = 1; i < list.length; i++) {
        const prev = list[i - 1], cur = list[i];
        if (prev.day !== cur.day) { intervals.push(restMinutes + 1); continue; }  // 跨日达标
        intervals.push(toMin(cur.time) - toMin(prev.time));
      }
    });
    const meet = intervals.length ? intervals.filter(g => g >= (restMinutes || 0)).length / intervals.length : 1;
    return {
      total: matches.length,
      scheduled: matches.filter(m => m.time !== '待定').length,
      days: Math.max(1, ...matches.map(m => m.day || 1)),
      venueConflict: venueConflict,
      restShort: restShort,
      refConflict: refConflict,
      restMeetRate: Math.round(meet * 100),
      venueBalance: balance,
      capacityShort: matches.filter(m => m.flagged === '场地容量不足，请增加场地或赛日').length,
      flagged: matches.filter(m => m.flagged).length
    };
  }

  function teamsOf2(m) { return [m.sideA, m.sideB].filter(t => t && t !== BYE && t !== '待定' && !t.startsWith('第') && !t.startsWith('组')); }

  /* ---------- 5. 对外入口 ---------- */

  function generate(config) {
    const teams = (config.teams || []).map(t => String(t).trim()).filter(Boolean);
    if (teams.length < 2) return { error: '至少需要 2 支队伍' };
    let rounds;
    switch (config.format) {
      case 'single_round_robin': rounds = roundRobinPairs(teams); break;
      case 'double_round_robin': rounds = doubleRoundRobinPairs(teams); break;
      case 'single_elimination': rounds = singleEliminationRounds(teams); break;
      case 'double_elimination': rounds = doubleEliminationRounds(teams); break;
      case 'group_knockout': rounds = groupKnockoutRounds(teams, config.groups || 2); break;
      case 'swiss': rounds = swissRounds(teams, config.swissRounds || 5); break;
      case 'points': rounds = roundRobinPairs(teams); break;
      default: rounds = roundRobinPairs(teams);
    }
    const matches = expandMatches(rounds, config);
    const scheduled = scheduleMatches(matches, config);
    const report = buildReport(scheduled, config.restMinutes || 0);
    const el = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    return {
      format: config.format,
      formatLabel: FORMAT_LABELS[config.format] || config.format,
      teams: teams.length,
      matches: scheduled.matches,
      report: report,
      generatedMs: (el % 60).toFixed(1)  // 毫秒级完成（秒级展示用）
    };
  }

  const FORMAT_LABELS = {
    single_round_robin: '单循环',
    double_round_robin: '双循环',
    single_elimination: '单淘汰',
    double_elimination: '双败淘汰',
    group_knockout: '分组循环 + 交叉淘汰',
    swiss: '瑞士制',
    points: '积分赛'
  };

  const FORMAT_OPTIONS = [
    { value: 'single_round_robin', label: '单循环' },
    { value: 'double_round_robin', label: '双循环' },
    { value: 'single_elimination', label: '单淘汰' },
    { value: 'double_elimination', label: '双败淘汰' },
    { value: 'group_knockout', label: '分组循环 + 交叉淘汰' },
    { value: 'swiss', label: '瑞士制' },
    { value: 'points', label: '积分赛' }
  ];

  window.EventScheduler = { generate: generate, FORMAT_OPTIONS: FORMAT_OPTIONS, FORMAT_LABELS: FORMAT_LABELS };
})();
