(function () {
  const roleLabels = { organizer: '组织者', referee: '裁判', volunteer: '志愿者', participant: '参赛者' };
  const pageByRole = { organizer: 'organizer.html', referee: 'referee.html', volunteer: 'volunteer.html', participant: 'participant.html' };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  function currentUser() { const state = EFStore.get(); return state.users.find(u => u.id === (state.session && state.session.userId)) || state.users[0]; }
  function ensureSession(role) { const state = EFStore.get(); if (!state.session) { location.href = 'index.html'; return null; } if (role && state.session.role !== role) { location.href = pageByRole[state.session.role] || 'workspace.html'; return null; } return currentUser(); }
  function toast(message, type = 'success') { const el = $('#ef-toast'); if (!el) return; el.textContent = message; el.dataset.type = type; el.classList.add('show'); clearTimeout(window.__efToast); window.__efToast = setTimeout(() => el.classList.remove('show'), 2600); }
  function openPanel(id) { const el = $(id); if (el) { el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false'); } }
  function closePanel(el) { const target = typeof el === 'string' ? $(el) : el.closest('.ef-overlay, .ef-drawer'); if (target) { target.classList.remove('is-open'); target.setAttribute('aria-hidden', 'true'); } }
  function wirePanels() {
    $$('[data-close]').forEach(b => b.addEventListener('click', () => closePanel(b)));
    $$('.ef-overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) closePanel(o); }));
    const search = $('#help-panel input');
    if (search && !search.dataset.bound) {
      search.dataset.bound = 'true';
      search.addEventListener('input', () => {
        const term = search.value.trim().toLowerCase();
        $$('#help-panel .help-list button').forEach(item => {
          item.style.display = !term || item.textContent.toLowerCase().includes(term) ? '' : 'none';
        });
      });
    }
  }
  function shell(cfg) {
    const role = cfg.role, title = cfg.title, nav = cfg.nav;
    const user = ensureSession(role); if (!user) return null;
    const state = EFStore.get(), active = state.events[0];
    const links = nav.map(n => '<a class="' + (n.active ? 'active' : '') + '" href="' + n.href + '"><span class="nav-glyph">' + n.icon + '</span>' + n.label + '</a>').join('');
    document.body.innerHTML = '<div class="ef-shell role-' + role + '"><aside class="ef-sidebar"><a class="ef-brand" href="workspace.html"><span class="brand-mark">EF</span><span><b>赛智通 EventFlow</b><small>中小型赛事智能办赛助手</small></span></a><div class="ef-side-event"><small>当前活动</small><strong>' + (active ? active.name : '未选择活动') + '</strong><span>' + (active ? active.date : '') + ' · ' + (active ? active.status : '') + '</span></div><nav class="ef-nav">' + links + '</nav><div class="ef-sidebar-foot"><span class="avatar">' + user.name.slice(0, 1) + '</span><div><b>' + user.name + '</b><small>' + roleLabels[role] + '</small></div><button class="icon-button" data-logout aria-label="退出登录">↗</button></div></aside><main class="ef-main"><header class="ef-topbar"><div><span class="ef-breadcrumb">EventFlow / ' + roleLabels[role] + '</span><h1>' + title + '</h1></div><div class="ef-top-actions"><button class="ghost-button" data-switch>切换身份</button><button class="icon-button" data-help aria-label="帮助中心">?</button><span class="top-user">' + user.name + ' · ' + roleLabels[role] + '</span></div></header><div class="ef-content" id="ef-content"></div></main></div><div class="ef-toast" id="ef-toast" role="status" aria-live="polite"></div><div id="ef-panels"></div>';
    const panels = $('#ef-panels');
    panels.innerHTML = helpPanel();
    wirePanels();
    $('[data-logout]').addEventListener('click', () => { EFStore.clearSession(); location.href = 'index.html'; });
    $('[data-switch]').addEventListener('click', () => { location.href = 'workspace.html'; });
    $('[data-help]').addEventListener('click', () => openPanel('#help-panel'));
    return { user: user, state: state, active: active, content: $('#ef-content'), panels: $('#ef-panels') };
  }
  function helpPanel() { return '<div class="ef-drawer" id="help-panel" aria-hidden="true"><div class="drawer-head"><div><small>支持中心</small><h2>需要什么帮助？</h2></div><button class="icon-button" data-close>×</button></div><input class="ef-input" placeholder="搜索帮助内容"/><div class="help-list"><button><b>快速开始</b><span>创建活动并发布报名入口</span></button><button><b>智能编排</b><span>理解约束设置与排程调整</span></button><button><b>角色协作</b><span>配置裁判、志愿者与参赛者权限</span></button><button><b>数据归档</b><span>导出活动报告和成绩记录</span></button></div></div>'; }
  function status(value) { const map = { pending: ['待审核', 'warning'], approved: ['已通过', 'success'], rejected: ['已驳回', 'danger'], paid: ['已缴费', 'success'], unpaid: ['待缴费', 'warning'], in_progress: ['进行中', 'info'], completed: ['已完成', 'success'], submitted: ['待确认', 'warning'] }; const x = map[value] || [value, 'neutral']; return '<span class="status ' + x[1] + '">' + x[0] + '</span>'; }
  function fmtDate(value) { return value ? value.replaceAll('-', '/') : ''; }
  window.EFUI = { $, $$, roleLabels, pageByRole, ensureSession, toast, openPanel, closePanel, wirePanels, shell, helpPanel, status, fmtDate };
})();
