(function(){
  const ui = EFUI.shell({role:'participant',title:'我的活动',nav:[
    {label:'活动首页',href:'#home',icon:'⌂',active:true},
    {label:'我的报名',href:'#registration',icon:'▣'},
    {label:'我的赛程',href:'#schedule',icon:'◷'},
    {label:'实时比分',href:'#scores',icon:'＋'},
    {label:'个人档案',href:'#profile',icon:'◫'}
  ]});
  if(!ui) return;
  let s = ui.state, e = ui.active, user = ui.user;
  const sec = { home: renderHome, registration: renderRegistration, schedule: renderSchedule, scores: renderScores, profile: renderProfile };
  let section = 'home';

  function resolveSection() {
    const name = location.hash.replace('#', '');
    return sec[name] ? name : 'home';
  }
  function handleNav() {
    const name = resolveSection();
    if (name !== section) { section = name; document.querySelectorAll('.ef-nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + name)); render(); }
  }
  window.addEventListener('hashchange', handleNav);
  document.querySelectorAll('.ef-nav a').forEach(a => a.addEventListener('click', () => setTimeout(handleNav, 0)));
  section = resolveSection();

  function myRegs(){ return s.registrations.filter(r => r.eventId === e.id && r.name === user.name); }
  function myMatches(){
    const regs = myRegs();
    const projects = new Set(regs.map(r => r.project));
    return s.scheduleItems.filter(m => m.eventId === e.id && (m.sideA === user.name || m.sideB === user.name || projects.has(m.project)));
  }
  function myScores(){
    const ids = new Set(myMatches().map(m => m.id));
    return s.scores.filter(sc => sc.eventId === e.id && ids.has(sc.scheduleId));
  }
  function myRanking(){
    const ranks = EFStore.rankingsFor(e.id) || [];
    for (const r of ranks) {
      const idx = r.rows.findIndex(x => x.team === user.name);
      if (idx >= 0) return { project: r.project, rank: idx + 1, total: r.rows.length, points: r.rows[idx].points };
    }
    return null;
  }
  function doneCount(){ return myScores().filter(sc => sc.status === 'approved').length; }

  function render(){
    ui.content.innerHTML = '<div class="mobile-frame">' + (sec[section] || renderHome)() + '</div>';
    ui.content.querySelectorAll('[data-goto]').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); section = a.dataset.goto; render(); }));
    wire();
  }

  function renderHome(){
    const rank = myRanking();
    const notices = s.notifications.filter(n => n.eventId === e.id && (n.audience || '').indexOf('参赛者') >= 0);
    return '<div class="ef-toolbar"><div><p class="eyebrow">PARTICIPANT SPACE</p><p>你的报名、赛程、比分与成绩都在这里。</p></div><div class="ef-actions"><button class="primary-button" id="join">新增报名</button></div></div>'
      + '<div class="hero-panel"><h2>' + e.name + '</h2><p>' + EFUI.fmtDate(e.date) + ' · ' + e.venue + ' · 个人参赛档案已同步</p><div class="hero-actions"><button class="ghost-button" id="open-cert">查看电子证书</button></div></div>'
      + '<div class="metric-grid" style="margin-top:16px">'
      + '<article class="metric"><small>我的项目</small><strong>' + myRegs().length + '</strong><span>报名记录</span></article>'
      + '<article class="metric"><small>待确认</small><strong>' + myRegs().filter(x => x.status === 'pending').length + '</strong><span>组织者审核中</span></article>'
      + '<article class="metric"><small>已完成场次</small><strong>' + doneCount() + '</strong><span class="' + (doneCount() ? 'up' : '') + '">' + (doneCount() ? '成绩已同步' : '暂无完赛记录') + '</span></article>'
      + '<article class="metric"><small>个人排名</small><strong>' + (rank ? rank.rank : '—') + '</strong><span>' + (rank ? (rank.project + ' · ' + rank.points + ' 分') : '暂无排名') + '</span></article>'
      + '</div>'
      + '<div class="grid-2"><article class="panel"><div class="panel-head"><div><h2>我的赛程</h2><p>按时间查看场地与对手</p></div><a class="row-link" data-goto="schedule">全部</a></div><div class="panel-body"><div class="timeline">'
      + (myMatches().length ? myMatches().map(r => '<div class="timeline-item"><time>' + r.time + '</time><div><b>' + r.project + ' · ' + r.format + '</b><small>' + r.sideA + ' vs ' + r.sideB + ' · ' + r.venue + '</small></div>' + EFUI.status(r.state === '进行中' ? 'in_progress' : (r.state === '已完成' ? 'completed' : 'pending')) + '</div>').join('') : '<div class="mini-row"><span class="muted">暂无与你相关的赛程</span></div>')
      + '</div></div></article>'
      + '<article class="panel"><div class="panel-head"><div><h2>实时比分</h2><p>裁判端提交后自动更新</p></div></div><div class="panel-body"><div class="score-board">'
      + (myScores().length ? myScores().map(sc => { const r = s.scheduleItems.find(x => x.id === sc.scheduleId) || {}; return '<div class="score-team"><div><b>' + (r.sideA || '—') + '</b><small>' + (r.project || '') + '</small></div><div class="score-value">' + sc.scoreA + ' : ' + sc.scoreB + '</div><div><b>' + (r.sideB || '—') + '</b><small>' + EFUI.status(sc.status) + '</small></div></div>'; }).join('') : '<div class="mini-row"><span class="muted">暂无比分数据</span></div>')
      + '</div></div></article></div>'
      + '<div class="grid-2"><article class="panel"><div class="panel-head"><div><h2>报名状态</h2><p>费用和资格一目了然</p></div></div><div class="panel-body"><div class="mini-list">'
      + (myRegs().length ? myRegs().map(r => '<div class="mini-row"><div><b>' + r.project + '</b><small>' + r.org + ' · ' + (r.payment === 'paid' ? '费用已确认' : '等待缴费') + '</small></div>' + EFUI.status(r.status) + '</div>').join('') : '<div class="mini-row"><span class="muted">你还没有报名任何项目</span></div>')
      + '</div></div></article>'
      + '<article class="panel"><div class="panel-head"><div><h2>通知中心</h2><p>活动重要信息</p></div></div><div class="panel-body"><div class="mini-list">'
      + (notices.length ? notices.map(n => '<div class="notice-card" data-notice="' + n.id + '"><b>' + n.title + '</b><p>' + n.body + '</p><small>' + n.time + ' · 点击标记已读</small></div>').join('') : '<div class="mini-row"><span class="muted">暂无通知</span></div>')
      + '</div></div></article></div>';
  }

  function renderRegistration(){
    const regs = myRegs();
    return '<div class="ef-toolbar"><div><p class="eyebrow">MY REGISTRATIONS</p><p>查看你的全部报名记录与审核进度。</p></div><div class="ef-actions"><button class="primary-button" id="join">新增报名</button></div></div>'
      + '<article class="panel"><div class="panel-head"><div><h2>报名记录</h2><p>共 ' + regs.length + ' 条</p></div></div><div class="panel-body"><div class="table-wrap"><table><thead><tr><th>项目</th><th>组织</th><th>费用</th><th>报名时间</th><th>审核</th><th>缴费</th></tr></thead><tbody>'
      + (regs.length ? regs.map(r => { const p = (e.projects || []).find(x => x.name === r.project); return '<tr><td><b>' + r.project + '</b></td><td>' + r.org + '</td><td>¥' + (p ? p.fee : 0) + '</td><td>' + r.time + '</td><td>' + EFUI.status(r.status) + '</td><td>' + EFUI.status(r.payment) + '</td></tr>'; }).join('') : '<tr><td colspan="6" class="muted" style="text-align:center;padding:24px">还没有报名记录，点击右上角“新增报名”</td></tr>')
      + '</tbody></table></div></div></article>';
  }

  function renderSchedule(){
    const rows = myMatches();
    return '<div class="ef-toolbar"><div><p class="eyebrow">MY SCHEDULE</p><p>与你相关的场次安排，按时间排序。</p></div></div>'
      + '<article class="panel"><div class="panel-head"><div><h2>我的赛程</h2><p>共 ' + rows.length + ' 场</p></div></div><div class="panel-body"><div class="mini-list">'
      + (rows.length ? rows.map(r => '<div class="mini-row"><div><b>' + r.time + ' · ' + r.project + '</b><small>' + r.sideA + ' vs ' + r.sideB + ' · ' + r.venue + (r.day && r.day > 1 ? ' · 第' + r.day + '天' : '') + ' · 裁判 ' + r.referee + '</small></div>' + EFUI.status(r.state === '进行中' ? 'in_progress' : (r.state === '已完成' ? 'completed' : 'pending')) + '</div>').join('') : '<div class="mini-row"><span class="muted">暂无相关场次</span></div>')
      + '</div></div></article>';
  }

  function renderScores(){
    const scores = myScores();
    return '<div class="ef-toolbar"><div><p class="eyebrow">LIVE SCORES</p><p>裁判提交的比分实时同步。</p></div></div>'
      + '<article class="panel"><div class="panel-head"><div><h2>实时比分</h2><p>共 ' + scores.length + ' 条</p></div></div><div class="panel-body"><div class="score-board">'
      + (scores.length ? scores.map(sc => { const r = s.scheduleItems.find(x => x.id === sc.scheduleId) || {}; return '<div class="score-team"><div><b>' + r.sideA + '</b><small>' + r.project + '</small></div><div class="score-value">' + sc.scoreA + ' : ' + sc.scoreB + '</div><div><b>' + r.sideB + '</b><small>' + EFUI.status(sc.status) + '</small></div></div>'; }).join('') : '<div class="mini-row"><span class="muted">暂无比分数据</span></div>')
      + '</div></div></article>';
  }

  function renderProfile(){
    const rank = myRanking();
    const regs = myRegs();
    return '<div class="ef-toolbar"><div><p class="eyebrow">PROFILE</p><p>你的参赛档案与个人统计。</p></div></div>'
      + '<div class="hero-panel" style="display:flex;align-items:center;gap:16px"><div class="avatar" style="width:52px;height:52px;font-size:22px;background:#ff6a3d;color:#fff">' + user.name.slice(0, 1) + '</div><div><h2>' + user.name + '</h2><p>' + (user.roles || []).map(r => ({ organizer: '组织者', referee: '裁判', volunteer: '志愿者', participant: '参赛者' }[r] || r)).join(' · ') + ' · ' + e.name + '</p></div></div>'
      + '<div class="metric-grid" style="margin-top:16px">'
      + '<article class="metric"><small>报名项目</small><strong>' + regs.length + '</strong><span>已提交报名</span></article>'
      + '<article class="metric"><small>完赛场次</small><strong>' + doneCount() + '</strong><span class="' + (doneCount() ? 'up' : '') + '">' + (doneCount() ? '成绩已确认' : '暂无完赛') + '</span></article>'
      + '<article class="metric"><small>当前排名</small><strong>' + (rank ? rank.rank + '/' + rank.total : '—') + '</strong><span>' + (rank ? rank.points + ' 分' : '暂无排名') + '</span></article>'
      + '<article class="metric"><small>电子证书</small><strong>' + (regs.some(r => r.status === 'approved') ? '已生成' : '待审核') + '</strong><span>审核通过后生成</span></article>'
      + '</div>'
      + '<article class="panel" style="margin-top:16px"><div class="panel-head"><div><h2>我的报名</h2><p>费用与资格明细</p></div></div><div class="panel-body"><div class="mini-list">'
      + (regs.length ? regs.map(r => '<div class="mini-row"><div><b>' + r.project + '</b><small>' + r.org + ' · ' + r.phone + '</small></div>' + EFUI.status(r.status) + '</div>').join('') : '<div class="mini-row"><span class="muted">暂无报名记录</span></div>')
      + '</div></div></article>';
  }

  function wire(){
    const join = document.querySelector('#join');
    if (join) join.addEventListener('click', openJoin);
    const cert = document.querySelector('#open-cert');
    if (cert) cert.addEventListener('click', openCert);
    document.querySelectorAll('[data-notice]').forEach(n => n.addEventListener('click', () => { EFStore.readNotification(n.dataset.notice, user.id); s = EFStore.get(); render(); EFUI.toast('通知已标记为已读'); }));
  }

  function panel(html){ ui.panels.innerHTML = html; EFUI.wirePanels(); }

  function openJoin(){
    const regs = myRegs();
    const options = (e.projects || []).map(p => {
      const count = s.registrations.filter(r => r.eventId === e.id && r.project === p.name).length;
      const full = count >= p.quota;
      const mine = regs.some(r => r.project === p.name);
      return '<option value="' + p.name + '"' + (full || mine ? ' disabled' : '') + '>' + p.name + '（' + count + '/' + p.quota + ' · ¥' + p.fee + (full ? ' · 已满' : '') + (mine ? ' · 已报名' : '') + '）</option>';
    }).join('');
    panel('<div class="ef-overlay is-open" aria-hidden="false"><div class="ef-modal"><div class="drawer-head"><div><small>新增报名</small><h2>报名一个新项目</h2></div><button class="icon-button" data-close>×</button></div><form id="join-form"><label class="field"><span>项目</span><select class="ef-select" name="project">' + options + '</select></label><label class="field" style="margin-top:13px"><span>组织 / 队伍</span><input class="ef-input" name="org" value="个人报名" required></label><label class="field" style="margin-top:13px"><span>联系电话</span><input class="ef-input" name="phone" placeholder="用于赛事通知" required></label><div class="form-actions"><button type="button" class="ghost-button" data-close>取消</button><button class="primary-button" type="submit">提交报名</button></div></form></div></div>');
    document.querySelector('#join-form').addEventListener('submit', ev => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(ev.target));
      const p = (e.projects || []).find(x => x.name === d.project);
      const count = s.registrations.filter(r => r.eventId === e.id && r.project === d.project).length;
      if (count >= (p ? p.quota : Infinity)) { EFUI.toast('该项目名额已满', 'warn'); return; }
      EFStore.addRegistration({ eventId: e.id, name: user.name, org: d.org, project: d.project, phone: d.phone, status: 'pending', payment: 'unpaid', time: '刚刚' });
      EFUI.closePanel(ev.target); s = EFStore.get(); render();
      EFUI.toast('报名已提交，等待组织者审核');
    });
  }

  function openCert(){
    const approved = myRegs().filter(r => r.status === 'approved');
    panel('<div class="ef-overlay is-open" aria-hidden="false"><div class="ef-modal"><div class="drawer-head"><div><small>电子证书</small><h2>参赛纪念证书</h2></div><button class="icon-button" data-close>×</button></div><div class="hero-panel" style="background:#203b58"><p style="color:#b8cde3">赛智通 EventFlow · ' + e.name + '</p><h2>' + user.name + '</h2><p>' + (approved.length ? '已完成 ' + approved.length + ' 个项目报名，成绩已写入参赛档案。' : '报名审核通过后自动生成证书。') + '</p></div><div class="form-actions"><button class="primary-button" data-close>关闭</button></div></div></div>');
  }

  EFStore.subscribe(() => { s = EFStore.get(); e = s.events.find(x => x.id === (e && e.id)) || s.events[0]; render(); });
  render();
})();
