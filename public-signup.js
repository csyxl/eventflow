(function(){
  const root = document.querySelector('#signup-content');
  if (!root) return;
  function render(){
    const s = EFStore.get(), e = s.events[0];
    if (!e) { root.innerHTML = '<section class="workspace-title"><h1>暂无开放报名的活动</h1></section>'; return; }
    const regs = s.registrations.filter(r => r.eventId === e.id);
    const projects = (e.projects || []).map(p => {
      const count = regs.filter(r => r.project === p.name).length;
      return Object.assign({}, p, { count: count, left: Math.max(0, p.quota - count), full: count >= p.quota });
    });
    const open = e.status === '报名中' && e.deadline >= new Date().toISOString().slice(0, 10);
    root.innerHTML = '<section class="workspace-title"><p class="eyebrow">PUBLIC SIGNUP</p><h1>' + e.name + '</h1><p>' + e.venue + ' · ' + EFUI.fmtDate(e.date) + ' · 报名截止 ' + EFUI.fmtDate(e.deadline) + '</p><p class="status ' + (open ? 'success' : 'warn') + '" style="display:inline-block;margin-top:8px">' + (open ? '报名通道开放中' : '报名已截止') + '</p></section>'
      + '<div class="metric-grid" style="margin-top:16px">'
      + '<article class="metric"><small>开放项目</small><strong>' + projects.length + '</strong><span>本次赛事</span></article>'
      + '<article class="metric"><small>已报名</small><strong>' + regs.length + '</strong><span>人次</span></article>'
      + '<article class="metric"><small>总名额</small><strong>' + projects.reduce((a, p) => a + p.quota, 0) + '</strong><span>人</span></article>'
      + '<article class="metric"><small>剩余名额</small><strong>' + projects.reduce((a, p) => a + p.left, 0) + '</strong><span class="up">先到先得</span></article>'
      + '</div>'
      + '<div class="grid-2" style="margin-top:16px">'
      + '<article class="panel"><div class="panel-head"><div><h2>项目一览</h2><p>按项目查看名额与费用</p></div></div><div class="panel-body"><div class="mini-list">'
      + projects.map(p => '<div class="mini-row"><div><b>' + p.name + '</b><small>已报 ' + p.count + ' / 名额 ' + p.quota + (p.full ? ' · 已满' : ' · 余 ' + p.left) + '</small></div><div style="text-align:right"><b style="color:var(--coral)">¥' + p.fee + '</b><br>' + (p.full ? EFUI.status('approved') : EFUI.status('pending')) + '</div></div>').join('')
      + '</div></div></article>'
      + '<article class="panel"><div class="panel-head"><div><h2>在线报名</h2><p>' + (open ? '填写信息，提交后由组织者审核' : '当前未开放，请联系组织者') + '</p></div></div><div class="panel-body">'
      + (open ? '<form id="signup-form"><label class="field"><span>姓名</span><input class="ef-input" name="name" required placeholder="与证件一致"></label><label class="field" style="margin-top:13px"><span>组织 / 队伍</span><input class="ef-input" name="org" required placeholder="学院、社团或单位"></label><label class="field" style="margin-top:13px"><span>联系电话</span><input class="ef-input" name="phone" required placeholder="用于赛事通知"></label><label class="field" style="margin-top:13px"><span>报名项目</span><select class="ef-select" name="project">' + projects.map(p => '<option value="' + p.name + '"' + (p.full ? ' disabled' : '') + '>' + p.name + '（¥' + p.fee + (p.full ? ' · 已满' : ' · 余 ' + p.left + '）') + '</option>').join('') + '</select></label><div class="form-actions"><button class="primary-button coral" type="submit">提交报名</button></div></form>' : '<div class="mini-row"><span class="muted">报名通道已关闭，请关注后续通知。</span></div>')
      + '</div></article></div>';
    if (open) {
      document.querySelector('#signup-form').addEventListener('submit', ev => {
        ev.preventDefault();
        const d = Object.fromEntries(new FormData(ev.target));
        const p = projects.find(x => x.name === d.project);
        if (p && p.full) { EFUI.toast('该项目名额已满', 'warn'); return; }
        EFStore.addRegistration({ eventId: e.id, name: d.name, org: d.org, phone: d.phone, project: d.project, status: 'pending', payment: 'unpaid', time: '刚刚' });
        ev.target.reset();
        render();
        EFUI.toast('报名已提交，请等待组织者审核');
      });
    }
  }
  EFStore.subscribe(render);
  render();
})();
