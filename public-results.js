(function(){
  const root = document.querySelector('#public-content');
  if (!root) return;
  function render(){
    const s = EFStore.get(), e = s.events[0], rows = s.scheduleItems.filter(x => x.eventId === e.id);
    const scores = s.scores.filter(x => x.eventId === e.id);
    const rankings = EFStore.rankingsFor(e.id) || [];
    root.innerHTML = '<section class="workspace-title"><p class="eyebrow">PUBLIC RESULTS</p><h1>' + e.name + ' · 公开查询</h1><p>无需登录即可查看已发布的赛程、比分与排名。</p></section>'
      + '<section class="event-choice"><div><b>活动状态</b><span>' + e.venue + ' · ' + EFUI.fmtDate(e.date) + ' · ' + e.status + '</span></div><select class="ef-select" id="project-filter" style="width:190px"><option value="all">全部项目</option>' + [...new Set(rows.map(r => r.project))].map(p => '<option>' + p + '</option>').join('') + '</select></section>'
      + '<div class="grid-2" style="margin-top:16px"><article class="panel"><div class="panel-head"><div><h2>赛程查询</h2><p>场地、时间、对阵和状态</p></div></div><div class="panel-body"><div class="mini-list" id="public-schedule">'
      + (rows.length ? rows.map(r => '<div class="mini-row" data-project="' + r.project + '"><div><b>' + r.time + ' · ' + r.project + '</b><small>' + r.sideA + ' vs ' + r.sideB + ' · ' + r.venue + (r.day && r.day > 1 ? ' · 第' + r.day + '天' : '') + '</small></div>' + EFUI.status(r.state === '进行中' ? 'in_progress' : (r.state === '已完成' ? 'completed' : 'pending')) + '</div>').join('') : '<div class="mini-row"><span class="muted">暂无已发布赛程</span></div>')
      + '</div></div></article>'
      + '<article class="panel"><div class="panel-head"><div><h2>实时比分</h2><p>裁判提交后自动同步</p></div></div><div class="panel-body"><div class="score-board">'
      + (scores.length ? scores.map(sc => { const r = rows.find(x => x.id === sc.scheduleId) || {}; return '<div class="score-team"><div><b>' + (r.sideA || '—') + '</b><small>' + (r.project || '场次已更新') + '</small></div><div class="score-value">' + sc.scoreA + ' : ' + sc.scoreB + '</div><div><b>' + (r.sideB || '—') + '</b><small>' + EFUI.status(sc.status) + '</small></div></div>'; }).join('') : '<div class="mini-row"><span class="muted">暂无比分数据</span></div>')
      + '</div></div></article></div>'
      + '<article class="panel" style="margin-top:16px"><div class="panel-head"><div><h2>项目排名</h2><p>已审核成绩按积分制汇总（胜3分 · 平1分 · 负0分）</p></div></div><div class="panel-body">'
      + (rankings.length ? rankings.map(g => '<div style="margin-bottom:18px"><h3 style="margin:6px 0 8px;font-size:15px;color:var(--ink)">' + g.project + '</h3><div class="table-wrap"><table><thead><tr><th>名次</th><th>参赛者 / 队伍</th><th>场次</th><th>胜</th><th>平</th><th>负</th><th>净胜分</th><th>积分</th></tr></thead><tbody>'
        + g.rows.map((x, i) => '<tr' + (i === 0 ? ' style="background:rgba(255,106,61,.06)"' : '') + '><td>' + (i + 1) + '</td><td><b>' + x.team + '</b>' + (i === 0 ? ' <span class="status success">榜首</span>' : '') + '</td><td>' + x.play + '</td><td>' + x.win + '</td><td>' + x.draw + '</td><td>' + x.lose + '</td><td>' + (x.gd > 0 ? '+' : '') + x.gd + '</td><td><b>' + x.points + '</b></td></tr>').join('')
        + '</tbody></table></div></div>').join('') : '<div class="mini-row"><span class="muted">暂无已确认的成绩，排名将在组织者审核后生成</span></div>')
      + '</div></article>';
    const filter = document.querySelector('#project-filter');
    if (filter) filter.addEventListener('change', e2 => document.querySelectorAll('#public-schedule [data-project]').forEach(r => r.style.display = e2.target.value === 'all' || r.dataset.project === e2.target.value ? '' : 'none'));
  }
  EFStore.subscribe(render);
  render();
})();
