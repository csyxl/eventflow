(function(){
  const ui = EFUI.shell({role:'referee',title:'裁判工作台',nav:[
    {label:'我的安排',href:'#assignments',icon:'⌂',active:true},
    {label:'录入成绩',href:'#scoring',icon:'＋'},
    {label:'执裁记录',href:'#history',icon:'◫'}
  ]});
  if(!ui) return;
  let s = ui.state, e = ui.active, user = ui.user;

  function myRows(){ return s.scheduleItems.filter(x => x.eventId === e.id && x.referee === user.name); }
  function myScores(){ const ids = new Set(myRows().map(r => r.id)); return s.scores.filter(sc => sc.eventId === e.id && ids.has(sc.scheduleId)); }
  function pendingCount(){ const done = new Set(myScores().filter(sc => sc.status === 'approved' || sc.status === 'submitted').map(sc => sc.scheduleId)); return myRows().filter(r => !done.has(r.id)).length; }
  function approvedCount(){ return myScores().filter(sc => sc.status === 'approved').length; }

  function render(){
    const rows = myRows(), scores = myScores();
    ui.content.innerHTML = '<div class="ef-toolbar"><div><p class="eyebrow">REFEREE DESK</p><p>查看被分配场次，快速完成计分和提交。</p></div><div class="ef-actions"><button class="secondary-button" id="open-history">执裁统计</button></div></div>'
      + '<div class="metric-grid">'
      + '<article class="metric"><small>今日场次</small><strong>' + rows.length + '</strong><span>已分配给你</span></article>'
      + '<article class="metric"><small>待提交</small><strong>' + pendingCount() + '</strong><span>完成录入后提交</span></article>'
      + '<article class="metric"><small>已确认</small><strong>' + approvedCount() + '</strong><span class="' + (approvedCount() ? 'up' : '') + '">记录已归档</span></article>'
      + '<article class="metric"><small>执裁场次</small><strong>' + rows.length + '</strong><span>本活动累计</span></article>'
      + '</div>'
      + '<div class="grid-2"><article class="panel" id="assignments"><div class="panel-head"><div><h2>我的执裁安排</h2><p>场地与对阵实时同步</p></div></div><div class="panel-body"><div class="mini-list">'
      + (rows.length ? rows.map(r => { const sc = scores.find(x => x.scheduleId === r.id); return '<div class="task-card"><div class="task-foot"><b>' + r.time + ' · ' + r.project + '</b>' + EFUI.status(sc ? (sc.status === 'approved' ? 'approved' : 'submitted') : 'pending') + '</div><p>' + r.sideA + ' vs ' + r.sideB + '<br>' + r.venue + ' · ' + r.format + '</p><button class="primary-button" data-score="' + r.id + '">' + (sc ? '编辑成绩' : '开始计分') + '</button></div>'; }).join('') : '<div class="mini-row"><span class="muted">暂无分配给你的场次</span></div>')
      + '</div></div></article>'
      + '<article class="panel"><div class="panel-head"><div><h2>工作规范</h2><p>提交前的检查清单</p></div></div><div class="panel-body"><div class="timeline"><div class="timeline-item"><time>01</time><div><b>核对参赛双方</b><small>确认队名、组别与场地</small></div></div><div class="timeline-item"><time>02</time><div><b>录入最终比分</b><small>提交后等待组织者确认</small></div></div><div class="timeline-item"><time>03</time><div><b>锁定记录</b><small>确认后自动计入排名</small></div></div></div></div></article></div>'
      + '<article class="panel" style="margin-top:16px" id="history"><div class="panel-head"><div><h2>最近提交</h2><p>你的成绩记录</p></div></div><div class="panel-body"><div class="table-wrap"><table><thead><tr><th>项目</th><th>对阵</th><th>比分</th><th>状态</th></tr></thead><tbody>'
      + (scores.length ? scores.slice(0, 8).map(sc => { const r = s.scheduleItems.find(x => x.id === sc.scheduleId) || {}; return '<tr><td>' + (r.project || '—') + '</td><td>' + (r.sideA || '—') + ' vs ' + (r.sideB || '—') + '</td><td><b>' + sc.scoreA + ' : ' + sc.scoreB + '</b></td><td>' + EFUI.status(sc.status) + '</td></tr>'; }).join('') : '<tr><td colspan="4" class="muted" style="text-align:center;padding:24px">暂无成绩记录</td></tr>')
      + '</tbody></table></div></div></article>';
    wire();
  }

  function wire(){
    const h = document.querySelector('#open-history');
    if (h) h.addEventListener('click', () => openHistory());
    document.querySelectorAll('[data-score]').forEach(b => b.addEventListener('click', () => openScore(b.dataset.score)));
  }

  function panel(html){ ui.panels.innerHTML = html; EFUI.wirePanels(); }

  function openHistory(){
    const rows = myRows(), scores = myScores();
    const minutes = rows.length * 45;
    panel('<div class="ef-overlay is-open" aria-hidden="false"><div class="ef-modal"><div class="drawer-head"><div><small>执裁统计</small><h2>' + user.name + ' 的执裁档案</h2></div><button class="icon-button" data-close>×</button></div><div class="metric-grid" style="margin-top:8px">'
      + '<article class="metric"><small>执裁场次</small><strong>' + rows.length + '</strong><span>本活动</span></article>'
      + '<article class="metric"><small>预计时长</small><strong>' + Math.round(minutes / 60) + 'h</strong><span>按 45 分钟/场估算</span></article>'
      + '<article class="metric"><small>已确认成绩</small><strong>' + approvedCount() + '</strong><span class="' + (approvedCount() ? 'up' : '') + '">计入排名</span></article>'
      + '<article class="metric"><small>覆盖项目</small><strong>' + new Set(rows.map(r => r.project)).size + '</strong><span>项目类型</span></article>'
      + '</div><div class="form-actions"><button class="primary-button" data-close>关闭</button></div></div></div>');
  }

  function openScore(id){
    const r = s.scheduleItems.find(x => x.id === id);
    if (!r) return;
    const sc = s.scores.find(x => x.scheduleId === id) || { scoreA: 0, scoreB: 0 };
    panel('<div class="ef-overlay is-open" id="score-editor" aria-hidden="false"><div class="ef-modal"><div class="drawer-head"><div><small>' + r.project + ' · ' + r.time + ' · ' + r.venue + '</small><h2>' + r.sideA + ' vs ' + r.sideB + '</h2></div><button class="icon-button" data-close>×</button></div><form id="score-form"><div class="score-board"><div class="score-team"><div><b>' + r.sideA + '</b><small>主队</small></div><div class="score-controls"><button type="button" data-step="a" data-delta="-1">−</button><span class="score-value" id="score-a">' + sc.scoreA + '</span><button type="button" data-step="a" data-delta="1">＋</button></div><div></div></div><div class="score-team"><div><b>' + r.sideB + '</b><small>客队</small></div><div class="score-controls"><button type="button" data-step="b" data-delta="-1">−</button><span class="score-value" id="score-b">' + sc.scoreB + '</span><button type="button" data-step="b" data-delta="1">＋</button></div><div></div></div></div><label class="field" style="margin-top:15px"><span>裁判备注</span><textarea class="ef-textarea" name="note" placeholder="记录判罚或场次情况"></textarea></label><div class="form-actions"><button type="button" class="ghost-button" data-close>取消</button><button class="primary-button" type="submit">提交成绩</button></div></form></div></div>');
    let a = Number(sc.scoreA) || 0, b = Number(sc.scoreB) || 0;
    document.querySelectorAll('[data-step]').forEach(btn => btn.addEventListener('click', () => {
      if (btn.dataset.step === 'a') a = Math.max(0, a + Number(btn.dataset.delta));
      else b = Math.max(0, b + Number(btn.dataset.delta));
      document.querySelector('#score-a').textContent = a;
      document.querySelector('#score-b').textContent = b;
    }));
    document.querySelector('#score-form').addEventListener('submit', ev => {
      ev.preventDefault();
      const patch = { scoreA: a, scoreB: b, status: 'pending', updatedAt: new Date().toISOString() };
      if (sc.id) EFStore.updateScore(sc.id, patch); else EFStore.addScore({ scheduleId: id, eventId: e.id, scoreA: a, scoreB: b, status: 'pending', updatedAt: new Date().toISOString() });
      EFUI.closePanel(ev.target); s = EFStore.get(); render();
      EFUI.toast('成绩已提交，等待组织者确认');
    });
  }

  window.addEventListener('hashchange', function () {
    const name = location.hash.replace('#', '');
    document.querySelectorAll('.ef-nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + name));
  });

  EFStore.subscribe(() => { s = EFStore.get(); render(); });
  render();
})();
