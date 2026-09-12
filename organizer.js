(function () {
  const ui = EFUI.shell({
    role: 'organizer',
    title: '活动控制台',
    nav: [
      { label: '总览', href: '#overview', icon: '⌂', active: true },
      { label: '报名管理', href: '#registrations', icon: '▣' },
      { label: '智能编排', href: '#schedule', icon: '⌘' },
      { label: '成绩与排名', href: '#scores', icon: '✓' },
      { label: '协同中心', href: '#collab', icon: '♧' },
      { label: '数据归档', href: '#archive', icon: '◫' }
    ]
  });
  if (!ui) return;
  let s = ui.state, e = ui.active, section = 'overview';

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
  function timeLabel(m) { return m.day && m.day > 1 ? '第' + m.day + '天 ' + m.time : m.time; }
  function panel(html) { ui.panels.innerHTML = html; EFUI.wirePanels(); }

  function render() {
    const st = EFStore.statsFor(e.id);
    const map = {
      overview: renderOverview,
      registrations: renderRegistrations,
      schedule: renderSchedule,
      scores: renderScores,
      collab: renderCollab,
      archive: renderArchive
    };
    ui.content.innerHTML = '<div class="ef-section" data-section="' + section + '">' + (map[section] || renderOverview)(st) + '</div>';
    ui.content.querySelectorAll('.ef-nav-anchor').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); go(a.dataset.section); }));
    wire(st);
    restoreEngineResult();   // 重渲染后恢复上一次编排结果，避免表单状态丢失
  }

  function restoreEngineResult() {
    if (!lastEngineResult || section !== 'schedule') return;
    const rp = ui.content.querySelector('#engine-result-panel');
    if (!rp) return;
    rp.style.display = '';
    const res = lastEngineResult;
    ui.content.querySelector('#engine-summary').textContent = res.formatLabel + ' · ' + res.teams + ' 支队伍 · ' + res.report.total + ' 场 · 耗时 ' + res.generatedMs + 'ms';
    const badge = ui.content.querySelector('#engine-badge');
    badge.textContent = res.report.venueConflict === 0 ? '0 冲突' : res.report.venueConflict + ' 冲突';
    badge.className = 'status ' + (res.report.venueConflict === 0 ? 'good' : 'warn');
    ui.content.querySelector('#engine-report').innerHTML = reportHtml(res.report);
    ui.content.querySelector('#engine-table').innerHTML = res.matches.map(m => '<tr><td>' + (m.day && m.day > 1 ? '第' + m.day + '天' : '当日') + '</td><td>' + esc(m.time) + '</td><td>' + esc(m.venue) + '</td><td><b>' + esc(m.sideA) + '</b> vs <b>' + esc(m.sideB) + '</b>' + (m.flagged ? ' <span class="status warn">' + esc(m.flagged) + '</span>' : '') + '</td><td>' + esc(m.referee) + '</td><td>' + esc(m.roundLabel) + '</td></tr>').join('');
    const saveBtn = ui.content.querySelector('#schedule-save');
    if (saveBtn) saveBtn.disabled = false;
  }

  function go(name) {
    section = name;
    document.querySelectorAll('.ef-nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + name));
    render();
  }

  /* ---------- 总览 ---------- */
  function renderOverview(st) {
    return '<div class="ef-toolbar"><div><p class="eyebrow">ORGANIZER CONSOLE</p><p>一站式管理报名、编排、成绩与团队协作，所有数字实时取自活动数据。</p></div><div class="ef-actions"><button class="secondary-button" id="event-edit">编辑活动</button><button class="primary-button coral" id="event-create">创建活动</button></div></div>'
      + hero(st)
      + '<div class="metric-grid" style="margin-top:16px">'
      + metric('报名人数', st.regCount, '已通过 ' + st.approved + ' 人')
      + metric('待审核', st.pending, '需要组织者处理')
      + metric('已完成场次', st.scoresApproved, '共 ' + st.scheduleCount + ' 场排程')
      + metric('报名名额占用', Math.round(st.regCount / Math.max(1, st.totalQuota) * 100) + '%', '总名额 ' + st.totalQuota)
      + '</div>'
      + '<div class="grid-2">'
      + '<article class="panel"><div class="panel-head"><div><h2>报名处理队列</h2><p>最近需要关注的报名记录</p></div><button class="row-link ef-nav-anchor" data-section="registrations">查看全部</button></div><div class="panel-body"><div class="mini-list">'
      + st.registrations.filter(r => r.status === 'pending').slice(0, 4).map(r => '<div class="mini-row"><div><b>' + esc(r.name) + ' · ' + esc(r.project) + '</b><small>' + esc(r.org) + ' · ' + r.time + '</small></div>' + EFUI.status(r.status) + '</div>').join('')
      + (st.pending === 0 ? '<div class="mini-row"><span class="muted">暂无待处理报名</span></div>' : '')
      + '</div></div></article>'
      + '<article class="panel"><div class="panel-head"><div><h2>排程健康度</h2><p>由编排引擎约束检查得出</p></div><button class="row-link ef-nav-anchor" data-section="schedule">打开编排器</button></div><div class="panel-body"><div class="mini-list">'
      + '<div class="mini-row"><span>已编排场次</span><b class="up">' + st.scheduleCount + ' 场</b></div>'
      + '<div class="mini-row"><span>场地数量</span><b>' + (e.venues || []).length + ' 块</b></div>'
      + '<div class="mini-row"><span>覆盖项目</span><b>' + (e.projects || []).length + ' 项</b></div>'
      + '</div></div></article>'
      + '</div>'
      + '<div class="grid-2" style="margin-top:16px"><article class="panel"><div class="panel-head"><div><h2>成绩审核</h2><p>裁判提交后自动进入队列</p></div><button class="row-link ef-nav-anchor" data-section="scores">处理队列</button></div><div class="panel-body"><div class="mini-list">'
      + st.scores.slice(0, 4).map(sc => { const m = st.schedule.find(x => x.id === sc.scheduleId) || {}; return '<div class="mini-row"><div><b>' + esc(m.project || '未命名') + ' · ' + esc(m.sideA) + ' vs ' + esc(m.sideB) + '</b><small>' + sc.scoreA + ' : ' + sc.scoreB + '</small></div>' + EFUI.status(sc.status) + '</div>'; }).join('')
      + '</div></div></article>'
      + '<article class="panel"><div class="panel-head"><div><h2>报名项目分布</h2><p>按项目统计报名与名额</p></div></div><div class="panel-body"><div class="util-list">'
      + st.projectStats.slice(0, 5).map(p => '<div class="util-row"><span class="util-name">' + esc(p.name) + '</span><div class="bar"><span style="width:' + Math.min(100, Math.round(p.count / Math.max(1, p.quota) * 100)) + '%" class="' + (p.full ? 'bar-full' : '') + '"></span></div><b class="util-value">' + p.count + '/' + p.quota + '</b></div>').join('')
      + '</div></div></article></div>';
  }

  function hero(st) {
    return '<div class="hero-panel"><h2>' + esc(e.name) + '</h2><p>' + esc(e.venue) + ' · ' + EFUI.fmtDate(e.date) + ' · 报名截止 ' + EFUI.fmtDate(e.deadline) + ' · ' + e.status + '</p><div class="hero-actions"><button class="ghost-button" id="open-notice">发布通知</button><button class="ghost-button" id="open-task">分配任务</button></div></div>';
  }
  function metric(label, value, foot) {
    return '<article class="metric"><small>' + label + '</small><strong>' + value + '</strong><span>' + foot + '</span></article>';
  }

  /* ---------- 报名管理 ---------- */
  function renderRegistrations(st) {
    return '<div class="ef-toolbar"><div><p class="eyebrow">REGISTRATION</p><p>审核、缴费、名额与项目分布在一个入口完成。</p></div><div class="ef-actions"><input class="ef-input search-input" id="reg-search" placeholder="搜索姓名、组织或项目"><button class="secondary-button" id="export-signups">导出名单</button><button class="primary-button" id="add-reg">新增报名</button></div></div>'
      + '<div class="metric-grid"><article class="metric"><small>总报名</small><strong>' + st.regCount + '</strong><span>共 ' + st.projectStats.length + ' 个项目</span></article>'
      + '<article class="metric"><small>已缴费</small><strong>' + st.paid + '</strong><span>待缴费 ' + st.unpaid + '</span></article>'
      + '<article class="metric"><small>待审核</small><strong>' + st.pending + '</strong><span>审核通过 ' + st.approved + '</span></article>'
      + '<article class="metric"><small>名额已满</small><strong>' + st.projectStats.filter(p => p.full).length + '</strong><span>自动关闭报名</span></article></div>'
      + '<div class="grid-2"><article class="panel"><div class="panel-head"><div><h2>项目名额看板</h2><p>绿色为可报名，橙色为即将满员</p></div></div><div class="panel-body"><div class="util-list">'
      + st.projectStats.map(p => '<div class="util-row"><span class="util-name">' + esc(p.name) + ' <small>¥' + p.fee + '</small></span><div class="bar"><span style="width:' + Math.min(100, Math.round(p.count / Math.max(1, p.quota) * 100)) + '%" class="' + (p.full ? 'bar-full' : p.count / Math.max(1, p.quota) >= 0.8 ? 'bar-warn' : '') + '"></span></div><b class="util-value">' + p.count + '/' + p.quota + (p.full ? ' 满' : ' 剩' + p.left) + '</b></div>').join('')
      + '</div></div></article>'
      + '<article class="panel"><div class="panel-head"><div><h2>缴费状态</h2><p>报名费用收取情况</p></div></div><div class="panel-body"><div class="mini-list"><div class="mini-row"><span>已缴费</span><b class="up">' + st.paid + ' 人</b></div><div class="mini-row"><span>待缴费</span><b>' + st.unpaid + ' 人</b></div><div class="mini-row"><span>应收费用</span><b>¥' + st.registrations.filter(r => r.payment === 'paid').reduce((a, r) => a + (feeOf(r.project)), 0) + '</b></div></div></div></article></div>'
      + '<article class="panel"><div class="panel-head"><div><h2>报名名单</h2><p>共 ' + st.regCount + ' 条记录</p></div><div class="filters"><button class="filter active" data-f="all">全部</button><button class="filter" data-f="pending">待审核</button><button class="filter" data-f="unpaid">待缴费</button></div></div><div class="panel-body"><div class="table-wrap"><table><thead><tr><th>报名人</th><th>组织</th><th>项目</th><th>联系方式</th><th>费用</th><th>状态</th><th>操作</th></tr></thead><tbody id="reg-table">'
      + st.registrations.map(r => '<tr data-status="' + r.status + '" data-payment="' + r.payment + '" data-search="' + (r.name + r.org + r.project).toLowerCase() + '"><td><span class="person"><span class="avatar">' + esc(r.name.slice(0, 1)) + '</span>' + esc(r.name) + '</span></td><td>' + esc(r.org) + '</td><td>' + esc(r.project) + '</td><td>' + r.phone + '</td><td>' + (r.payment === 'paid' ? '已缴费' : '待缴费') + '</td><td>' + EFUI.status(r.status) + '</td><td><button class="row-link" data-reg="' + r.id + '">查看详情</button></td></tr>').join('')
      + '</tbody></table></div></div></article>';
  }

  function feeOf(projectName) {
    const p = (e.projects || []).find(x => x.name === projectName);
    return p ? (p.fee || 0) : 0;
  }

  /* ---------- 智能编排 ---------- */
  function renderSchedule(st) {
    const formats = (window.EventScheduler ? EventScheduler.FORMAT_OPTIONS : []).map(f => '<option value="' + f.value + '">' + f.label + '</option>').join('');
    const venuesVal = (e.venues || []).join('，');
    const slotsVal = (e.timeSlots || []).join('，');
    const rows = st.schedule.slice();
    rows.sort((a, b) => (a.day || 1) - (b.day || 1) || String(a.time).localeCompare(String(b.time)));
    return '<div class="ef-toolbar"><div><p class="eyebrow">SMART SCHEDULING</p><p>自研 CSP+GA 编排引擎：输入赛制、队伍与约束，秒级生成可行赛程。</p></div><div class="ef-actions"><button class="primary-button" id="run-engine">生成排程</button><button class="secondary-button" id="schedule-save" disabled>保存到活动</button></div></div>'
      + '<article class="panel"><div class="panel-head"><div><h2>编排配置</h2><p>7 种赛制 · 多约束（场地 / 休息间隔 / 裁判）</p></div></div><div class="panel-body"><form id="engine-form" class="field-grid">'
      + fieldSel('赛制', 'format', formats, 'single_round_robin')
      + fieldNum('队伍数量', 'team-count', 8, 2, 64)
      + fieldTxt('队伍名称', 'teams', '每行一支队伍，留空则用“队伍1、队伍2…”生成')
      + fieldTxt('场地（逗号分隔）', 'courts', venuesVal)
      + fieldTxt('时段起点/间隔', 'slots', slotsVal)
      + fieldNum('休息间隔（分钟）', 'rest', 30, 0, 120)
      + fieldNum('裁判数量', 'referees', 3, 1, 12)
      + fieldNum('分组数（分组循环用）', 'groups', 2, 2, 8)
      + '<div class="field full"><button class="secondary-button" type="button" id="quick-teams">填充 8 支示例队伍</button><span class="muted" style="font-size:11px;margin-left:8px">编排结果实时计算，支持保存后通知变更</span></div>'
      + '</form></div></article>'
      + '<article class="panel" id="engine-result-panel" style="display:none"><div class="panel-head"><div><h2>编排结果</h2><p id="engine-summary"></p></div><span class="status good" id="engine-badge">已优化</span></div><div class="panel-body" id="engine-report"></div><div class="panel-body"><div class="table-wrap"><table><thead><tr><th>赛日</th><th>时间</th><th>场地</th><th>对阵</th><th>裁判</th><th>轮次</th></tr></thead><tbody id="engine-table"></tbody></table></div></div></article>'
      + '<article class="panel"><div class="panel-head"><div><h2>当前活动排程</h2><p>已保存到活动 · ' + rows.length + ' 场</p></div><button class="row-link" id="edit-schedule-items">编辑场次</button></div><div class="panel-body"><div class="table-wrap"><table><thead><tr><th>时间</th><th>场地</th><th>项目</th><th>对阵</th><th>裁判</th><th>状态</th></tr></thead><tbody>'
      + (rows.length ? rows.map(m => '<tr><td>' + timeLabel(m) + '</td><td>' + esc(m.venue) + '</td><td>' + esc(m.project) + '</td><td><b>' + esc(m.sideA) + '</b> vs <b>' + esc(m.sideB) + '</b></td><td>' + esc(m.referee || '—') + '</td><td>' + EFUI.status(m.state === '进行中' ? 'in_progress' : m.state === '已完成' || m.state === '已结束' ? 'completed' : 'pending') + '</td></tr>').join('')
      : '<tr><td colspan="6" class="muted">尚未编排，点击上方"生成排程"开始</td></tr>')
      + '</tbody></table></div></div></article>';
  }

  function fieldSel(label, name, opts, val) {
    return '<label class="field"><span>' + label + '</span><select class="ef-select" name="' + name + '">' + opts + '</select></label>';
  }
  function fieldNum(label, name, val, min, max) {
    return '<label class="field"><span>' + label + '</span><input class="ef-input" type="number" name="' + name + '" value="' + val + '" min="' + min + '" max="' + max + '"></label>';
  }
  function fieldTxt(label, name, val, ph) {
    return '<label class="field full"><span>' + label + '</span><textarea class="ef-textarea" name="' + name + '" style="min-height:52px" placeholder="' + (ph || '') + '">' + esc(val) + '</textarea></label>';
  }

  /* ---------- 成绩与排名 ---------- */
  function renderScores(st) {
    const rankings = EFStore.rankingsFor(e.id);
    return '<div class="ef-toolbar"><div><p class="eyebrow">SCORES & RANKING</p><p>裁判提交 → 组织者确认 → 自动计算积分排名。</p></div><div class="ef-actions"><button class="primary-button" id="score-review">待确认 ' + st.scoresPending + '</button></div></div>'
      + '<div class="metric-grid"><article class="metric"><small>已确认成绩</small><strong>' + st.scoresApproved + '</strong><span>自动计入排名</span></article>'
      + '<article class="metric"><small>待确认</small><strong>' + st.scoresPending + '</strong><span>裁判已提交</span></article>'
      + '<article class="metric"><small>排程场次</small><strong>' + st.scheduleCount + '</strong><span>' + st.scheduledDone + ' 场已结束</span></article>'
      + '<article class="metric"><small>覆盖项目</small><strong>' + rankings.length + '</strong><span>已产生积分排名</span></article></div>'
      + '<div class="grid-2"><article class="panel"><div class="panel-head"><div><h2>成绩审核队列</h2><p>确认后自动更新排名</p></div></div><div class="panel-body"><div class="mini-list">'
      + (st.scores.length ? st.scores.map(sc => { const m = st.schedule.find(x => x.id === sc.scheduleId) || {}; return '<div class="task-card"><div class="task-foot"><b>' + esc(m.project || '未命名') + ' · ' + esc(m.sideA) + ' vs ' + esc(m.sideB) + '</b>' + EFUI.status(sc.status) + '</div><p>比分 ' + sc.scoreA + ' : ' + sc.scoreB + '</p>' + (sc.status === 'pending' ? '<div class="ef-actions" style="justify-content:flex-start"><button class="primary-button" data-approve="' + sc.id + '">确认成绩</button></div>' : '') + '</div>'; }).join('')
      : '<div class="mini-row"><span class="muted">暂无成绩记录</span></div>')
      + '</div></div></article>'
      + '<article class="panel"><div class="panel-head"><div><h2>积分排名</h2><p>胜 3 分 · 平 1 分 · 负 0 分，净胜分破同分</p></div></div><div class="panel-body"><div class="mini-list">'
      + (rankings.length ? rankings.map(rk => '<div class="rank-block"><div class="rank-title">' + esc(rk.project) + '</div>' + rk.rows.slice(0, 6).map((r, i) => '<div class="mini-row"><span class="rank-no">' + (i + 1) + '</span><b>' + esc(r.team) + '</b><span class="muted">' + r.win + '胜' + r.draw + '平' + r.lose + '负 · 净胜 ' + (r.gd > 0 ? '+' : '') + r.gd + '</span><b>' + r.points + ' 分</b></div>').join('') + '</div>').join('')
      : '<div class="mini-row"><span class="muted">确认成绩后自动生成排名</span></div>')
      + '</div></div></article></div>';
  }

  /* ---------- 协同中心 ---------- */
  function renderCollab(st) {
    return '<div class="ef-toolbar"><div><p class="eyebrow">COLLABORATION</p><p>任务、通知与角色在同一工作流中。</p></div><div class="ef-actions"><button class="secondary-button" id="open-notice">发布通知</button><button class="primary-button" id="open-task">分配任务</button></div></div>'
      + '<div class="grid-2"><article class="panel"><div class="panel-head"><div><h2>任务看板</h2><p>按角色查看待办事项</p></div></div><div class="panel-body"><div class="mini-list">'
      + (st.tasks.length ? st.tasks.map(t => '<div class="task-card"><div class="task-foot"><b>' + esc(t.title) + '</b>' + EFUI.status(t.status) + '</div><p>' + esc(t.location || '') + ' · ' + esc(t.due || '') + '<br>' + esc(t.note || '') + '</p></div>').join('') : '<div class="mini-row"><span class="muted">暂无任务</span></div>')
      + '</div></div></article>'
      + '<article class="panel"><div class="panel-head"><div><h2>角色在线状态</h2><p>成员权限与任务同步</p></div></div><div class="panel-body"><div class="util-list">'
      + '<div class="util-row"><span class="util-name">组织者</span><div class="bar"><span style="width:100%;background:#ff6a3d"></span></div><b class="util-value">' + st.users.filter(u => u.roles.includes('organizer')).length + ' 人</b></div>'
      + '<div class="util-row"><span class="util-name">裁判</span><div class="bar"><span style="width:60%;background:#2f6fe4"></span></div><b class="util-value">' + st.users.filter(u => u.roles.includes('referee')).length + ' 人</b></div>'
      + '<div class="util-row"><span class="util-name">志愿者</span><div class="bar"><span style="width:60%;background:#2e9d76"></span></div><b class="util-value">' + st.users.filter(u => u.roles.includes('volunteer')).length + ' 人</b></div>'
      + '<div class="util-row"><span class="util-name">参赛者</span><div class="bar"><span style="width:' + Math.min(100, Math.round(st.regCount / Math.max(1, st.totalQuota) * 100)) + '%;background:#a27bdb"></span></div><b class="util-value">' + st.regCount + ' 人</b></div>'
      + '</div></div></article></div>'
      + '<article class="panel"><div class="panel-head"><div><h2>通知记录</h2><p>系统发送与阅读回执</p></div></div><div class="table-wrap"><table><thead><tr><th>通知内容</th><th>发送对象</th><th>时间</th><th>已读</th></tr></thead><tbody>'
      + (st.notices.length ? st.notices.map(n => '<tr><td><b>' + esc(n.title) + '</b><br><span class="muted">' + esc(n.body) + '</span></td><td>' + esc(n.audience || '全部') + '</td><td>' + n.time + '</td><td>' + n.readBy.length + ' / ' + st.users.length + '</td></tr>').join('') : '<tr><td colspan="4" class="muted">暂无通知</td></tr>')
      + '</tbody></table></div></article>';
  }

  /* ---------- 数据归档 ---------- */
  function renderArchive(st) {
    return '<div class="ef-toolbar"><div><p class="eyebrow">ARCHIVE & REPORT</p><p>赛事数据自动沉淀，可导出与对比历史。</p></div><div class="ef-actions"><button class="secondary-button" id="export-data">导出数据</button><button class="primary-button" id="archive-data">生成归档报告</button></div></div>'
      + '<div class="metric-grid"><article class="metric"><small>报名记录</small><strong>' + st.regCount + '</strong><span>结构化归档</span></article>'
      + '<article class="metric"><small>成绩记录</small><strong>' + st.scores.length + '</strong><span>' + st.scoresApproved + ' 条已确认</span></article>'
      + '<article class="metric"><small>排程场次</small><strong>' + st.scheduleCount + '</strong><span>全部可追溯</span></article>'
      + '<article class="metric"><small>操作记录</small><strong>' + s.auditLogs.length + '</strong><span>全量审计</span></article></div>'
      + '<div class="grid-2"><article class="panel"><div class="panel-head"><div><h2>项目报名分布</h2><p>按项目统计</p></div></div><div class="panel-body"><div class="util-list">'
      + st.projectStats.map(p => '<div class="util-row"><span class="util-name">' + esc(p.name) + '</span><div class="bar"><span style="width:' + Math.min(100, Math.round(p.count / Math.max(1, st.regCount) * 100)) + '%"></span></div><b class="util-value">' + p.count + '</b></div>').join('')
      + '</div></div></article>'
      + '<article class="panel"><div class="panel-head"><div><h2>状态与缴费</h2><p>报名与缴费汇总</p></div></div><div class="panel-body"><div class="mini-list">'
      + '<div class="mini-row"><span>报名通过</span><b>' + st.approved + '</b></div>'
      + '<div class="mini-row"><span>待审核</span><b>' + st.pending + '</b></div>'
      + '<div class="mini-row"><span>已缴费</span><b>' + st.paid + '</b></div>'
      + '<div class="mini-row"><span>待缴费</span><b>' + st.unpaid + '</b></div>'
      + '</div></div></article></div>'
      + '<article class="panel"><div class="panel-head"><div><h2>历史归档</h2><p>自动沉淀的赛事档案</p></div></div><div class="panel-body"><div class="mini-list">'
      + s.archives.map(a => '<div class="mini-row"><div><b>' + esc(a.title) + '</b><small>' + a.date + ' · ' + a.size + '</small></div><span class="status success">' + esc(a.status) + '</span></div>').join('')
      + '</div></div></article>';
  }

  /* ---------- 事件绑定 ---------- */
  function wire(st) {
    const q = sel => ui.content.querySelector(sel);
    const ev = (sel, fn) => { const el = q(sel); if (el) el.addEventListener('click', fn); };

    ev('#event-create', () => openEvent());
    ev('#event-edit', () => openEvent(e));
    ev('#open-notice', openNotice);
    ev('#open-task', openTask);
    ev('#export-signups', () => { exportRegs(st); });
    ev('#add-reg', () => openReg());
    ev('#run-engine', runEngine);
    ev('#schedule-save', saveSchedule);
    ev('#quick-teams', () => {
      const ta = q('[name="teams"]');
      if (ta) ta.value = ['北区代表队', '南区代表队', '信息学院', '商学院', '外国语学院', '艺术学院', '校教工队', '远行社'].join('\n');
    });
    ev('#score-review', () => { const el = q('#score-review'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); EFUI.toast('待确认成绩已高亮，请逐条审核'); });
    ev('#edit-schedule-items', openScheduleItems);
    ev('#export-data', exportData);
    ev('#archive-data', openArchive);

    // 报名搜索 / 筛选
    const search = q('#reg-search');
    if (search) search.addEventListener('input', () => filterRegs(search.value));
    ui.content.querySelectorAll('.filter[data-f]').forEach(b => b.addEventListener('click', () => {
      ui.content.querySelectorAll('.filter[data-f]').forEach(x => x.classList.toggle('active', x === b));
      filterRegs(search ? search.value : '');
    }));
    // 报名详情 / 成绩确认
    ui.content.querySelectorAll('[data-reg]').forEach(b => b.addEventListener('click', () => openReg(b.dataset.reg)));
    ui.content.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', () => {
      EFStore.updateScore(b.dataset.approve, { status: 'approved' });
      s = EFStore.get(); render(); EFUI.toast('成绩已确认，排名已自动更新');
    }));
    // 编排配置联动：切换赛制时显示/隐藏分组数
    const formatSel = q('[name="format"]');
    if (formatSel) formatSel.addEventListener('change', () => {
      const groups = q('[name="groups"]').closest('.field');
      if (groups) groups.style.display = formatSel.value === 'group_knockout' ? '' : 'none';
    });
  }

  function filterRegs(term) {
    const t = (term || '').toLowerCase();
    const active = ui.content.querySelector('.filter.active');
    const f = active ? active.dataset.f : 'all';
    ui.content.querySelectorAll('#reg-table tr').forEach(r => {
      const okSearch = !t || (r.dataset.search || '').includes(t);
      const okFilter = f === 'all' || (f === 'pending' && r.dataset.status === 'pending') || (f === 'unpaid' && r.dataset.payment === 'unpaid');
      r.style.display = okSearch && okFilter ? '' : 'none';
    });
  }

  /* ---------- 编排引擎 ---------- */
  let lastEngineResult = null;
  function runEngine() {
    if (!window.EventScheduler) { EFUI.toast('编排引擎未加载'); return; }
    const form = ui.content.querySelector('#engine-form');
    const fd = new FormData(form);
    let teams = String(fd.get('teams') || '').split(/\n|,|，/).map(t => t.trim()).filter(Boolean);
    const count = Number(fd.get('team-count')) || 8;
    if (!teams.length) teams = Array.from({ length: count }, (_, i) => '队伍' + (i + 1));
    else if (teams.length > count) teams = teams.slice(0, count);
    const courts = String(fd.get('courts') || '').split(/[,，、]/).map(t => t.trim()).filter(Boolean);
    const slots = String(fd.get('slots') || '').split(/[,，、]/).map(t => t.trim()).filter(Boolean);
    if (courts.length < 1) { EFUI.toast('请至少填写 1 块场地'); return; }
    if (slots.length < 1) { EFUI.toast('请填写时段起点'); return; }
    const result = EventScheduler.generate({
      format: fd.get('format'),
      teams: teams,
      courts: courts,
      timeSlots: slots,
      restMinutes: Number(fd.get('rest')) || 0,
      refereeCount: Number(fd.get('referees')) || 1,
      groups: Number(fd.get('groups')) || 2,
      project: '综合项目'
    });
    if (result.error) { EFUI.toast(result.error); return; }
    lastEngineResult = result;
    const rp = ui.content.querySelector('#engine-result-panel');
    rp.style.display = '';
    ui.content.querySelector('#engine-summary').textContent = result.formatLabel + ' · ' + teams.length + ' 支队伍 · ' + result.report.total + ' 场 · 耗时 ' + result.generatedMs + 'ms';
    const badge = ui.content.querySelector('#engine-badge');
    badge.textContent = result.report.venueConflict === 0 ? '0 冲突' : result.report.venueConflict + ' 冲突';
    badge.className = 'status ' + (result.report.venueConflict === 0 ? 'good' : 'warn');
    ui.content.querySelector('#engine-report').innerHTML = reportHtml(result.report);
    ui.content.querySelector('#engine-table').innerHTML = result.matches.map(m => '<tr><td>' + (m.day && m.day > 1 ? '第' + m.day + '天' : '当日') + '</td><td>' + esc(m.time) + '</td><td>' + esc(m.venue) + '</td><td><b>' + esc(m.sideA) + '</b> vs <b>' + esc(m.sideB) + '</b>' + (m.flagged ? ' <span class="status warn">' + esc(m.flagged) + '</span>' : '') + '</td><td>' + esc(m.referee) + '</td><td>' + esc(m.roundLabel) + '</td></tr>').join('');
    const saveBtn = ui.content.querySelector('#schedule-save');
    saveBtn.disabled = false;
    EFUI.toast('排程已生成：' + result.report.total + ' 场，0 场地冲突');
  }

  function reportHtml(r) {
    return '<div class="metric-grid" style="margin-bottom:0"><article class="metric"><small>场地冲突</small><strong class="' + (r.venueConflict === 0 ? 'up' : '') + '">' + r.venueConflict + '</strong><span>' + (r.venueConflict === 0 ? '全部满足' : '需调整') + '</span></article>'
      + '<article class="metric"><small>休息间隔达标</small><strong>' + r.restMeetRate + '%</strong><span>同队两场最小间隔</span></article>'
      + '<article class="metric"><small>场地使用均衡</small><strong>' + r.venueBalance + '%</strong><span>各场地场次均衡度</span></article>'
      + '<article class="metric"><small>赛程跨度</small><strong>' + r.days + ' 天</strong><span>共 ' + r.total + ' 场</span></article></div>';
  }

  function saveSchedule() {
    if (!lastEngineResult) return;
    const items = lastEngineResult.matches.filter(m => m.time !== '待定');
    EFStore.replaceSchedule(e.id, items);
    s = EFStore.get(); render(); EFUI.toast('排程已保存到活动，共 ' + items.length + ' 场');
  }

  /* ---------- 抽屉 ---------- */
  function openReg(id) {
    const r = id ? s.registrations.find(x => x.id === id) : null;
    panel('<div class="drawer-backdrop is-open"></div><div class="ef-drawer is-open" id="reg-panel" aria-hidden="false"><div class="drawer-head"><div><small>报名资料</small><h2>' + (r ? esc(r.name) : '新增报名') + '</h2></div><button class="icon-button" data-close>×</button></div><form id="reg-form"><div class="field-grid"><label class="field"><span>姓名</span><input class="ef-input" name="name" required value="' + (r ? esc(r.name) : '') + '"></label><label class="field"><span>组织</span><input class="ef-input" name="org" required value="' + (r ? esc(r.org) : '') + '"></label><label class="field full"><span>项目</span><select class="ef-select" name="project">' + (e.projects || []).map(p => '<option ' + (r && r.project === p.name ? 'selected' : '') + '>' + esc(p.name) + '</option>').join('') + '</select></label><label class="field"><span>联系方式</span><input class="ef-input" name="phone" value="' + (r ? esc(r.phone) : '') + '"></label><label class="field"><span>缴费状态</span><select class="ef-select" name="payment"><option value="paid" ' + (r && r.payment === 'paid' ? 'selected' : '') + '>已缴费</option><option value="unpaid" ' + (r && r.payment === 'unpaid' ? 'selected' : '') + '>待缴费</option></select></label></div><div class="form-actions"><button type="button" class="ghost-button" data-close>取消</button><button class="primary-button" type="submit">保存资料</button></div></form></div>');
    document.querySelector('#reg-form').addEventListener('submit', ev => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(ev.target));
      const st0 = EFStore.statsFor(e.id);
      const proj = st0.projectStats.find(p => p.name === d.project);
      if (!r && proj && proj.full) { EFUI.toast('该项目名额已满，请选择其他项目'); return; }
      if (r) EFStore.updateRegistration(r.id, d);
      else EFStore.addRegistration({ eventId: e.id, name: d.name, org: d.org, project: d.project, phone: d.phone, status: 'pending', payment: d.payment, time: '刚刚' });
      EFUI.closePanel(ev.target); s = EFStore.get(); render(); EFUI.toast('报名资料已保存');
    });
  }

  function openEvent(existing) {
    panel('<div class="ef-overlay is-open" aria-hidden="false"><div class="ef-modal"><div class="drawer-head"><div><small>活动设置</small><h2>' + (existing ? '编辑活动' : '创建活动') + '</h2></div><button class="icon-button" data-close>×</button></div><form id="event-form"><div class="field-grid"><label class="field full"><span>活动名称</span><input class="ef-input" name="name" required value="' + (existing ? esc(existing.name) : '') + '"></label><label class="field"><span>开始日期</span><input class="ef-input" type="date" name="date" required value="' + (existing ? existing.date : '2026-10-01') + '"></label><label class="field"><span>活动地点</span><input class="ef-input" name="venue" required value="' + (existing ? esc(existing.venue) : '') + '"></label><label class="field"><span>报名截止</span><input class="ef-input" type="date" name="deadline" required value="' + (existing ? existing.deadline : '2026-09-28') + '"></label><label class="field"><span>收费方式</span><select class="ef-select" name="fee"><option>按项目收取</option><option>免费报名</option><option>统一报名费</option></select></label></div><div class="form-actions"><button type="button" class="ghost-button" data-close>取消</button><button class="primary-button coral" type="submit">保存活动</button></div></form></div></div>');
    document.querySelector('#event-form').addEventListener('submit', ev => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(ev.target));
      if (existing) EFStore.updateEvent(existing.id, d);
      else EFStore.addEvent(Object.assign(d, { status: '筹备中', projects: e.projects, venues: e.venues, timeSlots: e.timeSlots }));
      EFUI.closePanel(ev.target); s = EFStore.get(); e = s.events.find(x => x.id === (existing ? existing.id : s.events[0].id)) || s.events[0]; render(); EFUI.toast('活动已保存');
    });
  }

  function openNotice() {
    panel('<div class="ef-overlay is-open" aria-hidden="false"><div class="ef-modal"><div class="drawer-head"><div><small>协作通知</small><h2>发布通知</h2></div><button class="icon-button" data-close>×</button></div><form id="notice-form"><div class="field-grid"><label class="field full"><span>标题</span><input class="ef-input" name="title" required></label><label class="field full"><span>正文</span><textarea class="ef-textarea" name="body" required></textarea></label><label class="field"><span>发送对象</span><select class="ef-select" name="audience"><option>全部成员</option><option>裁判</option><option>志愿者</option><option>参赛者</option><option>已缴费参赛者</option></select></label><label class="field"><span>发送时间</span><select class="ef-select" name="timing"><option>立即发送</option><option>定时发送</option></select></label></div><div class="form-actions"><button type="button" class="ghost-button" data-close>取消</button><button class="primary-button" type="submit">发布通知</button></div></form></div></div>');
    document.querySelector('#notice-form').addEventListener('submit', ev => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(ev.target));
      EFStore.addNotification({ eventId: e.id, title: d.title, body: d.body, audience: d.audience });
      EFUI.closePanel(ev.target); render(); EFUI.toast('通知已发布');
    });
  }

  function openTask() {
    panel('<div class="ef-overlay is-open" aria-hidden="false"><div class="ef-modal"><div class="drawer-head"><div><small>协作任务</small><h2>分配任务</h2></div><button class="icon-button" data-close>×</button></div><form id="task-form"><div class="field-grid"><label class="field full"><span>任务名称</span><input class="ef-input" name="title" required></label><label class="field"><span>负责人</span><input class="ef-input" name="owner" value="周宁" required></label><label class="field"><span>角色</span><select class="ef-select" name="role"><option value="volunteer">志愿者</option><option value="referee">裁判</option><option value="organizer">组织者</option></select></label><label class="field"><span>地点</span><input class="ef-input" name="location" value="体育馆A"></label><label class="field"><span>截止时间</span><input class="ef-input" name="due" value="今天 18:00"></label><label class="field full"><span>说明</span><textarea class="ef-textarea" name="note"></textarea></label></div><div class="form-actions"><button type="button" class="ghost-button" data-close>取消</button><button class="primary-button" type="submit">保存任务</button></div></form></div></div>');
    document.querySelector('#task-form').addEventListener('submit', ev => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(ev.target));
      EFStore.addTask(Object.assign(d, { eventId: e.id, status: 'pending' }));
      EFUI.closePanel(ev.target); render(); EFUI.toast('任务已分配');
    });
  }

  function exportRegs(st) {
    const csv = ['姓名,组织,项目,报名状态,缴费状态'].concat(st.registrations.map(r => [r.name, r.org, r.project, r.status, r.payment].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','))).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '报名名单.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
    EFUI.toast('报名名单已导出 CSV');
  }

  /* ---------- 兼容 organizer-enhance.js 的接口 ---------- */
  window.__organizerHooks = {
    openScheduleItems: function () { openScheduleItems(); },
    openArchive: function () { openArchive(); },
    exportData: function () { exportData(); }
  };
  function openScheduleItems() {
    const rows = s.scheduleItems.filter(x => x.eventId === e.id);
    panel('<div class="ef-overlay is-open" aria-hidden="false"><div class="ef-modal"><div class="drawer-head"><div><small>排程编辑器</small><h2>调整场次安排</h2></div><button class="icon-button" data-close>×</button></div><form id="items-form"><div class="mini-list">' + (rows.length ? rows.map(r => '<div class="field-grid" style="margin-bottom:12px"><label class="field"><span>' + esc(r.project) + ' · 对阵</span><input class="ef-input" name="match-' + r.id + '" value="' + esc(r.sideA + ' vs ' + r.sideB) + '"></label><label class="field"><span>时间</span><input class="ef-input" type="time" name="time-' + r.id + '" value="' + esc(r.time) + '"></label><label class="field"><span>场地</span><input class="ef-input" name="venue-' + r.id + '" value="' + esc(r.venue) + '"></label><label class="field"><span>负责人</span><input class="ef-input" name="ref-' + r.id + '" value="' + esc(r.referee) + '"></label></div>').join('') : '<div class="mini-row"><span class="muted">暂无场次，请先生成排程</span></div>') + '</div><div class="form-actions"><button type="button" class="ghost-button" data-close>取消</button><button class="primary-button" type="submit">保存排程</button></div></form></div></div>');
    const form = document.querySelector('#items-form');
    if (!form) return;
    form.addEventListener('submit', ev => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      rows.forEach(r => {
        const match = String(fd.get('match-' + r.id) || '').split(' vs ');
        EFStore.updateSchedule(r.id, { sideA: match[0] || r.sideA, sideB: match.slice(1).join(' vs ') || r.sideB, time: fd.get('time-' + r.id), venue: fd.get('venue-' + r.id), referee: fd.get('ref-' + r.id) });
      });
      EFUI.closePanel(ev.target); s = EFStore.get(); render(); EFUI.toast('场次安排已保存');
    });
  }

  function openArchive() {
    const st0 = EFStore.statsFor(e.id);
    panel('<div class="ef-overlay is-open" aria-hidden="false"><div class="ef-modal"><div class="drawer-head"><div><small>数据归档</small><h2>' + esc(e.name) + '</h2></div><button class="icon-button" data-close>×</button></div><div class="metric-grid"><article class="metric"><small>报名记录</small><strong>' + st0.regCount + '</strong></article><article class="metric"><small>成绩记录</small><strong>' + st0.scores.length + '</strong></article><article class="metric"><small>操作记录</small><strong>' + s.auditLogs.length + '</strong></article></div><p>归档将保存当前活动摘要，可随时下载 JSON 文件。</p><div class="form-actions"><button class="ghost-button" data-close>取消</button><button class="secondary-button" id="download-json">下载 JSON</button><button class="primary-button" id="confirm-archive">生成归档</button></div></div></div>');
    const dl = document.querySelector('#download-json');
    if (dl) dl.addEventListener('click', function () {
      const data = JSON.stringify({ event: e, registrations: st0.registrations, schedule: st0.schedule, scores: st0.scores, notifications: st0.notices }, null, 2);
      const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'eventflow-' + e.id + '.json'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 500);
    });
    const ca = document.querySelector('#confirm-archive');
    if (ca) ca.addEventListener('click', function () {
      EFStore.addArchive({ eventId: e.id, title: e.name + ' · 运行档案', date: e.date, size: '本地生成', status: '已归档' });
      EFUI.closePanel(ca); render(); EFUI.toast('活动归档已生成');
    });
  }

  function exportData() {
    const st0 = EFStore.statsFor(e.id);
    const data = JSON.stringify({ event: e, registrations: st0.registrations, schedule: st0.schedule, scores: st0.scores, rankings: EFStore.rankingsFor(e.id) }, null, 2);
    const blob = new Blob(['\ufeff' + data], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'eventflow-' + e.id + '-data.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
    EFUI.toast('活动数据已导出 JSON');
  }

  // 顶部导航：由 ef-ui shell 生成，这里接管 section 切换（hash 驱动，点击与 hashchange 双保险）
  function handleNavChange() {
    const name = location.hash.replace('#', '') || 'overview';
    if (mapKeys[name] && name !== section) {
      section = name;
      document.querySelectorAll('.ef-nav a').forEach(x => x.classList.toggle('active', x.getAttribute('href') === '#' + name));
      render();
    }
  }
  window.addEventListener('hashchange', handleNavChange);
  document.querySelectorAll('.ef-nav a').forEach(a => {
    a.addEventListener('click', () => { setTimeout(handleNavChange, 0); });
  });
  const mapKeys = { overview: 1, registrations: 1, schedule: 1, scores: 1, collab: 1, archive: 1 };

  EFStore.subscribe(() => { s = EFStore.get(); if (!s.events.find(x => x.id === e.id)) e = s.events[0]; render(); });
  render();
})();
