(function () {
  const KEY = 'eventflow_state_v5';
  const now = () => new Date().toISOString();

  /* ---------- 演示数据生成（确定性） ---------- */
  const NAME_POOL = ['周宁', '林晓筱', '沈思远', '高远', '唐可', '何沐', '罗杰', '方雨桐', '许一鸣', '郑芷若', '韩沐辰', '秦朗月', '顾清欢', '谢子昂', '苏芮', '陈嘉树', '赵若曦', '孙明轩', '吴思彤', '张云帆', '李安然', '王嘉豪', '刘诗涵', '杨启铭', '黄雨欣', '陈泽宇', '林语嫣', '张子墨', '徐晨曦', '马天佑'];
  const ORG_POOL = ['信息学院', '设计学院', '商学院', '外国语学院', '艺术学院', '机械学院', '化工学院', '经济学院', '理学院', '计算机学院', '校教工队', '远行社', '晨光社', '风驰社', '北区代表队', '南区代表队'];

  function buildProjects() {
    return [
      { name: '篮球 · 男子组', quota: 8, fee: 50 },
      { name: '羽毛球 · 男单', quota: 32, fee: 30 },
      { name: '羽毛球 · 女单', quota: 32, fee: 30 },
      { name: '羽毛球 · 混双', quota: 16, fee: 60 },
      { name: '乒乓球 · 男单', quota: 32, fee: 30 },
      { name: '接力 · 公开组', quota: 16, fee: 40 },
      { name: '游泳 · 女子50m', quota: 24, fee: 20 }
    ];
  }

  // 生成 46 条报名记录：状态分布 待审核 6 / 待缴费 8 / 已通过 32
  function buildRegistrations(eventId, projects) {
    const rows = [];
    const days = ['09/12', '09/11', '09/11', '09/10', '09/10', '09/09', '09/08', '09/07'];
    let pi = 0;
    for (let i = 0; i < 46; i++) {
      const p = projects[pi % projects.length]; pi++;
      const name = NAME_POOL[i % NAME_POOL.length];
      const org = ORG_POOL[(i * 7 + 3) % ORG_POOL.length];
      let status = 'approved', payment = 'paid';
      if (i < 6) { status = 'pending'; payment = i < 2 ? 'unpaid' : 'paid'; }
      else if (i < 14) { status = 'approved'; payment = 'unpaid'; }
      rows.push({
        id: 'r' + (i + 1), eventId: eventId, name: name, org: org,
        project: p.name, phone: '138****' + String(1000 + i * 37).slice(-4),
        status: status, payment: payment,
        time: days[i % days.length] + ' ' + String(8 + (i % 9)) + ':' + String((i * 13) % 60).padStart(2, '0')
      });
    }
    return rows;
  }

  // 预置排程：覆盖 4 个高频项目的代表场次（编排模块会以引擎结果覆盖）
  function buildSchedule(eventId) {
    return [
      { id: 's1', eventId: eventId, project: '羽毛球 · 女单', format: '小组循环', time: '09:00', day: 1, venue: '体育馆A', referee: '陈默', state: '进行中', sideA: '林荫校队', sideB: '晨光校队' },
      { id: 's2', eventId: eventId, project: '篮球 · 男子组', format: '分组循环', time: '09:00', day: 1, venue: '体育馆B', referee: '苏然', state: '待开始', sideA: '北区代表队', sideB: '南区代表队' },
      { id: 's3', eventId: eventId, project: '乒乓球 · 男单', format: '淘汰', time: '10:30', day: 1, venue: '体育馆B', referee: '林岚', state: '待开始', sideA: '高远', sideB: '许一鸣' },
      { id: 's4', eventId: eventId, project: '接力 · 公开组', format: '公开组', time: '10:30', day: 1, venue: '操场', referee: '张弛', state: '待开始', sideA: '远行社', sideB: '风驰社' },
      { id: 's5', eventId: eventId, project: '羽毛球 · 男单', format: '小组循环', time: '12:00', day: 1, venue: '体育馆A', referee: '陈默', state: '待开始', sideA: '郑芷若', sideB: '韩沐辰' },
      { id: 's6', eventId: eventId, project: '篮球 · 男子组', format: '分组循环', time: '14:00', day: 1, venue: '体育馆A', referee: '苏然', state: '待开始', sideA: '信息学院', sideB: '商学院' }
    ];
  }

  const seed = {
    session: null,
    users: [
      { id: 'u1', name: '许清禾', account: 'organizer', password: '123456', roles: ['organizer', 'volunteer'] },
      { id: 'u2', name: '陈默', account: 'referee', password: '123456', roles: ['referee', 'organizer'] },
      { id: 'u3', name: '周宁', account: 'participant', password: '123456', roles: ['participant', 'volunteer'] }
    ],
    events: [{
      id: 'evt1',
      name: '秋季校园运动嘉年华',
      date: '2026-09-20',
      venue: '沈阳化工大学体育中心',
      status: '报名中',
      deadline: '2026-09-18',
      feeMode: '按项目收取',
      projects: buildProjects(),
      venues: ['体育馆A', '体育馆B', '操场'],
      timeSlots: ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00']
    }],
    registrations: [],
    scheduleItems: [],
    scores: [
      { id: 'sc1', scheduleId: 's1', eventId: 'evt1', scoreA: 2, scoreB: 1, status: 'approved', updatedAt: now() },
      { id: 'sc2', scheduleId: 's2', eventId: 'evt1', scoreA: 32, scoreB: 28, status: 'pending', updatedAt: now() },
      { id: 'sc3', scheduleId: 's5', eventId: 'evt1', scoreA: 21, scoreB: 18, status: 'approved', updatedAt: now() }
    ],
    tasks: [
      { id: 't1', eventId: 'evt1', title: '审核报名资料', owner: '许清禾', role: 'organizer', location: '工作台', due: '今天 18:00', status: 'pending', note: '核对待审核报名信息' },
      { id: 't2', eventId: 'evt1', title: '体育馆B 签到引导', owner: '周宁', role: 'volunteer', location: '体育馆B', due: '09:00', status: 'in_progress', note: '引导参赛者完成检录' },
      { id: 't3', eventId: 'evt1', title: '篮球场次计分', owner: '陈默', role: 'referee', location: '体育馆B', due: '09:00', status: 'pending', note: '完成比分录入并提交审核' }
    ],
    notifications: [
      { id: 'n1', eventId: 'evt1', title: '篮球项目场地调整', body: '篮球预选移至体育馆B，请相关人员提前 15 分钟到场。', audience: '裁判、参赛者', time: '09:24', readBy: [] },
      { id: 'n2', eventId: 'evt1', title: '志愿者签到提醒', body: '志愿者签到时间为 08:30，服务台领取工作牌。', audience: '志愿者', time: '08:12', readBy: [] }
    ],
    archives: [{ id: 'a1', eventId: 'evt1', title: '秋季校园运动嘉年华 · 运行档案', date: '2026-09-20', size: '2.4 MB', status: '自动同步' }],
    auditLogs: []
  };

  // 组装初始数据
  seed.registrations = buildRegistrations('evt1', seed.events[0].projects);
  seed.scheduleItems = buildSchedule('evt1');

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(clone(seed), JSON.parse(raw));
    } catch (e) {}
    return clone(seed);
  }
  let state = load();
  function persist() {
    localStorage.setItem(KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('ef:change', { detail: state }));
  }
  function audit(action, detail) {
    state.auditLogs.unshift({ id: 'log_' + Date.now(), action: action, detail: detail, by: state.session ? state.session.userId : 'system', at: now() });
  }

  /* ---------- 排名计算（积分制：胜3平1负0，净胜分/总得分为破同分） ---------- */
  function rankingsFor(eventId) {
    const e = state.events.find(x => x.id === eventId) || state.events[0];
    if (!e) return [];
    const approved = state.scores.filter(s => s.eventId === e.id && s.status === 'approved');
    const rows = state.scheduleItems.filter(r => r.eventId === e.id);
    const byProject = {};
    approved.forEach(sc => {
      const m = rows.find(x => x.id === sc.scheduleId);
      if (!m) return;
      const p = m.project || '综合项目';
      const grp = (byProject[p] = byProject[p] || {});
      [m.sideA, m.sideB].forEach(t => { if (!grp[t]) grp[t] = { team: t, play: 0, win: 0, draw: 0, lose: 0, points: 0, gd: 0, gf: 0 }; });
      const a = grp[m.sideA], b = grp[m.sideB];
      a.play++; b.play++;
      a.gf += Number(sc.scoreA) || 0; a.gd += (Number(sc.scoreA) || 0) - (Number(sc.scoreB) || 0);
      b.gf += Number(sc.scoreB) || 0; b.gd += (Number(sc.scoreB) || 0) - (Number(sc.scoreA) || 0);
      if (sc.scoreA > sc.scoreB) { a.win++; b.lose++; a.points += 3; }
      else if (sc.scoreA < sc.scoreB) { b.win++; a.lose++; b.points += 3; }
      else { a.draw++; b.draw++; a.points += 1; b.points += 1; }
    });
    return Object.keys(byProject).map(project => {
      const list = Object.values(byProject[project]).sort((x, y) => y.points - x.points || y.gd - x.gd || y.gf - x.gf);
      return { project: project, rows: list };
    });
  }

  /* ---------- 统计口径（页面 KPI 统一从这里取真实值） ---------- */
  function statsFor(eventId) {
    const e = state.events.find(x => x.id === eventId) || state.events[0];
    if (!e) return null;
    const regs = state.registrations.filter(r => r.eventId === e.id);
    const schedule = state.scheduleItems.filter(r => r.eventId === e.id);
    const scores = state.scores.filter(r => r.eventId === e.id);
    const approved = scores.filter(r => r.status === 'approved');
    const projects = e.projects || [];
    const projectStats = projects.map(p => {
      const rows = regs.filter(r => r.project === p.name);
      return {
        name: p.name, quota: p.quota || 0, fee: p.fee || 0,
        count: rows.length,
        paid: rows.filter(r => r.payment === 'paid').length,
        pending: rows.filter(r => r.status === 'pending').length,
        left: Math.max(0, (p.quota || 0) - rows.length),
        full: rows.length >= (p.quota || Infinity)
      };
    });
    return {
      event: e,
      registrations: regs,
      regCount: regs.length,
      pending: regs.filter(r => r.status === 'pending').length,
      approved: regs.filter(r => r.status === 'approved').length,
      rejected: regs.filter(r => r.status === 'rejected').length,
      paid: regs.filter(r => r.payment === 'paid').length,
      unpaid: regs.filter(r => r.payment === 'unpaid').length,
      schedule: schedule,
      scheduleCount: schedule.length,
      scheduledDone: schedule.filter(r => r.state === '已完成' || r.state === '已结束').length,
      scores: scores,
      scoresApproved: approved.length,
      scoresPending: scores.filter(r => r.status === 'pending').length,
      projectStats: projectStats,
      totalQuota: projects.reduce((a, p) => a + (p.quota || 0), 0),
      tasks: state.tasks.filter(t => t.eventId === e.id),
      tasksDone: state.tasks.filter(t => t.eventId === e.id && t.status === 'completed').length,
      notices: state.notifications.filter(n => n.eventId === e.id),
      users: state.users
    };
  }

  window.EFStore = {
    key: KEY,
    seed: clone(seed),
    get: function () { return state; },
    save: persist,
    reset: function () { state = clone(seed); persist(); },
    subscribe: function (fn) {
      const handler = function (e) { fn(e.detail || state); };
      window.addEventListener('ef:change', handler);
      window.addEventListener('ef:tick', handler);
      window.addEventListener('storage', function () { state = load(); fn(state); });
      return function () { window.removeEventListener('ef:change', handler); window.removeEventListener('ef:tick', handler); };
    },
    statsFor: statsFor,
    rankingsFor: rankingsFor,
    login: function (account, password) {
      const key = String(account || '').trim().toLowerCase();
      const user = state.users.find(u => u.account.toLowerCase() === key || u.name === String(account || '').trim());
      if (user && user.password === String(password || '')) {
        state.session = { userId: user.id, role: user.roles[0], at: now() };
        audit('账号登录', user.name); persist();
        return user;
      }
      return null;
    },
    setSession: function (userId, role) { state.session = { userId: userId, role: role, at: now() }; audit('切换身份', role); persist(); },
    clearSession: function () { state.session = null; persist(); },
    addEvent: function (event) {
      event.id = 'evt_' + Date.now();
      event.projects = event.projects || [];
      event.venues = event.venues || [];
      event.timeSlots = event.timeSlots || ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00'];
      state.events.unshift(event);
      audit('创建活动', event.name); persist(); return event;
    },
    updateEvent: function (id, patch) { const event = state.events.find(function (x) { return x.id === id; }); if (event) Object.assign(event, patch); audit('更新活动', id); persist(); },
    updateRegistration: function (id, patch) { const row = state.registrations.find(function (x) { return x.id === id; }); if (row) Object.assign(row, patch); audit('更新报名', id); persist(); },
    addRegistration: function (row) {
      row.id = 'r_' + Date.now();
      row.status = row.status || 'pending';
      row.payment = row.payment || 'unpaid';
      row.time = row.time || '刚刚';
      state.registrations.unshift(row);
      audit('新增报名', row.name); persist(); return row;
    },
    replaceSchedule: function (eventId, items) {
      const nextIds = {};
      const kept = state.scheduleItems.filter(function (x) { return x.eventId !== eventId; });
      const added = items.map(function (m, i) {
        const id = 's_' + Date.now() + '_' + i;
        nextIds[id] = true;
        return {
          id: id,
          eventId: eventId,
          project: m.project || '综合项目',
          format: m.roundLabel || m.format || '',
          time: m.time,
          day: m.day || 1,
          venue: m.venue,
          referee: m.referee,
          state: '待开始',
          sideA: m.sideA,
          sideB: m.sideB,
          source: 'engine'
        };
      });
      state.scheduleItems = kept.concat(added);
      // 一致性：移除引用已不存在场次的成绩（孤儿成绩），避免公开页/参赛者页出现空关联
      const liveIds = {};
      state.scheduleItems.forEach(function (x) { liveIds[x.id] = true; });
      state.scores = state.scores.filter(function (sc) { return sc.eventId !== eventId || liveIds[sc.scheduleId]; });
      audit('生成排程', eventId + ' ' + items.length + ' 场'); persist();
    },
    updateSchedule: function (id, patch) { const row = state.scheduleItems.find(function (x) { return x.id === id; }); if (row) Object.assign(row, patch); audit('更新排程', id); persist(); },
    addScore: function (score) { score.id = 'sc_' + Date.now(); state.scores.unshift(score); audit('提交成绩', score.scheduleId); persist(); return score; },
    updateScore: function (id, patch) { const row = state.scores.find(function (x) { return x.id === id; }); if (row) Object.assign(row, patch, { updatedAt: now() }); audit('审核成绩', id); persist(); },
    addTask: function (task) { task.id = 't_' + Date.now(); state.tasks.unshift(task); audit('分配任务', task.title); persist(); return task; },
    updateTask: function (id, patch) { const row = state.tasks.find(function (x) { return x.id === id; }); if (row) Object.assign(row, patch); audit('更新任务', id); persist(); },
    addNotification: function (n) { n.id = 'n_' + Date.now(); n.time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }); n.readBy = []; state.notifications.unshift(n); audit('发布通知', n.title); persist(); return n; },
    readNotification: function (id, userId) { const n = state.notifications.find(function (x) { return x.id === id; }); if (n && !n.readBy.includes(userId)) n.readBy.push(userId); persist(); },
    addArchive: function (archive) { archive.id = 'a_' + Date.now(); state.archives.unshift(archive); audit('归档活动', archive.title); persist(); }
  };
  // 仅数据变更（persist）时触发 ef:change；不设置定时刷新，避免整页重渲染清空表单状态
  window.addEventListener('storage', function () { state = load(); window.dispatchEvent(new CustomEvent('ef:change', { detail: state })); });
})();
