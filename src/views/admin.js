// ==================== 后台管理页面 ====================

import { themes, DIY_FIELDS } from '../themes/index.js';

// 仅缓存无用户数据的静态模板，每个 Worker isolate 构建一次。
let cachedAdminHTML;

export function getAdminHTML() {
  if (cachedAdminHTML) return cachedAdminHTML;
  // 序列化统一主题注册中心，避免后台预览与前台颜色配置各维护一份。
  const themeConfig = JSON.stringify(Object.fromEntries(Object.entries(themes).map(([key, theme]) => [key, { name:theme.name, layout:theme.layout, ...Object.fromEntries(DIY_FIELDS.map(field => [field, theme[field]])) }]))).replace(/</g, '\\u003c');
  const diyFields = JSON.stringify(DIY_FIELDS);
  return cachedAdminHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>博客管理后台</title>
  <link rel="icon" href="/icon/favicon.ico">
  <script defer src="https://cdnjs.loli.net/ajax/libs/vue/3.4.27/vue.global.prod.min.js" crossorigin="anonymous"><\/script>
  <script defer src="https://cdnjs.loli.net/ajax/libs/axios/1.7.2/axios.min.js" crossorigin="anonymous"><\/script>
  <script>
    (() => { const mode = localStorage.getItem('adminColorMode'); document.documentElement.dataset.colorMode = mode === 'dark' || mode === 'light' ? mode : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); })();
  <\/script>
  <style>
    :root { color-scheme: light; --bg:#f4f6f9; --surface:#fff; --subtle:#f8fafc; --border:#e2e8f0; --text:#1e293b; --muted:#64748b; --accent:#2563eb; --accent-hover:#1d4ed8; --accent-soft:#eff6ff; --on-accent:#fff; --danger:#dc2626; --danger-soft:#fef2f2; --success:#15803d; --warning:#b45309; --shadow:0 8px 30px rgb(15 23 42 / 8%); }
    :root[data-color-mode="dark"] { color-scheme:dark; --bg:#111827; --surface:#1f2937; --subtle:#182231; --border:#374151; --text:#e5e7eb; --muted:#a1adbd; --accent:#60a5fa; --accent-hover:#93c5fd; --accent-soft:#203555; --on-accent:#111827; --danger:#f87171; --danger-soft:#44252b; --success:#4ade80; --warning:#fbbf24; --shadow:0 8px 30px rgb(0 0 0 / 18%); }
    * { margin:0; padding:0; box-sizing:border-box; }
    [v-cloak] { display:none; }
    body { font:14px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif; background:var(--bg); color:var(--text); }
    button,input,textarea,select { font:inherit; }
    button,a,input,textarea,select { -webkit-tap-highlight-color:transparent; }
    button { cursor:pointer; border:1px solid var(--border); border-radius:8px; padding:8px 14px; background:var(--subtle); color:var(--text); font-weight:500; }
    button:hover { filter:brightness(.96); }
    button:disabled { cursor:not-allowed; opacity:.5; }
    :focus-visible { outline:2px solid var(--accent); outline-offset:3px; }
    input:not([type=radio]):not([type=checkbox]):not([type=file]),textarea,select,.custom-select-trigger { width:100%; padding:10px 12px; border:1px solid var(--border); border-radius:8px; background:var(--surface); color:var(--text); outline:none; }
    input:focus,textarea:focus,select:focus,.custom-select-trigger.active { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-soft); }
    input[type=checkbox],input[type=radio] { accent-color:var(--accent); }
    textarea { min-height:90px; resize:vertical; }
    h1,h2,h3 { color:var(--text); line-height:1.4; }
    h2 { font-size:23px; font-weight:650; }
    h3 { font-size:16px; }
    .text-muted { color:var(--muted); }
    .field-help { font-size:12px; color:var(--muted); margin-top:6px; }
    .section-title { margin-bottom:16px; }
    .inline-row { display:flex; align-items:center; gap:12px; }
    .wrap { flex-wrap:wrap; }
    .form-actions { display:flex; gap:10px; justify-content:flex-end; }
    .asset-icon { width:36px; height:36px; border:1px solid var(--border); border-radius:8px; background:var(--subtle); display:grid; place-items:center; overflow:hidden; flex-shrink:0; }
    .asset-icon img { width:32px; height:32px; object-fit:cover; }
    .inline-code { background:var(--subtle); padding:2px 6px; border-radius:4px; font-size:12px; }
    .text-danger { color:var(--danger); }
    .text-success { color:var(--success); }
    .text-accent { color:var(--accent); }
    .text-warning { color:var(--warning); }
    .login { min-height:100dvh; display:grid; place-items:center; padding:24px; }
    .login-box { width:100%; max-width:380px; padding:32px; border:1px solid var(--border); border-radius:16px; background:var(--surface); box-shadow:var(--shadow); }
    .login-box h1 { font-size:24px; margin-bottom:6px; }
    .login-box p { color:var(--muted); margin-bottom:24px; }
    .login-box input { margin-bottom:16px; }
    .login-box .btn { width:100%; }
    .login-color { position:fixed; right:24px; top:24px; }
    .admin-layout { min-height:100dvh; }
    .sidebar { position:fixed; inset:0 auto 0 0; width:224px; display:flex; flex-direction:column; background:var(--surface); border-right:1px solid var(--border); z-index:40; }
    .sidebar-header { padding:24px 22px; border-bottom:1px solid var(--border); }
    .sidebar-header h1 { font-size:18px; letter-spacing:-.5px; }
    .sidebar-header small { color:var(--muted); font-size:12px; }
    .sidebar-menu { padding:20px 12px; flex:1; overflow:auto; }
    .sidebar-menu a { display:flex; align-items:center; gap:12px; padding:11px 14px; color:var(--muted); text-decoration:none; border-radius:8px; margin-bottom:4px; }
    .sidebar-menu a:hover { background:var(--subtle); color:var(--text); }
    .sidebar-menu a.active { background:var(--accent-soft); color:var(--accent); font-weight:600; }
    .nav-icon { display:grid; place-items:center; width:20px; font-size:16px; }
    .sidebar-footer { padding:16px; border-top:1px solid var(--border); }
    .sidebar-footer button { width:100%; }
    .workspace { margin-left:224px; min-width:0; }
    .topbar { height:65px; position:sticky; top:0; z-index:30; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:0 32px; background:var(--surface); border-bottom:1px solid var(--border); }
    .topbar-title,.topbar-actions { display:flex; align-items:center; gap:12px; }
    .topbar-title { font-weight:600; }
    .topbar-actions a { color:var(--muted); text-decoration:none; }
    .menu-toggle { display:none; }
    .main-content { padding:28px 32px; max-width:1600px; margin:auto; min-width:0; }
    .page-header { margin-bottom:20px; }
    .page-description { color:var(--muted); margin-top:5px; }
    .btn,.btn-import { background:var(--accent); color:var(--on-accent); border-color:transparent; padding:9px 18px; }
    .btn:hover { background:var(--accent-hover); filter:none; }
    .btn-cancel,.btn-back { background:var(--surface); color:var(--text); border:1px solid var(--border); }
    .btn-cancel:hover,.btn-back:hover { background:var(--subtle); }
    .btn-danger,.delete,.danger { color:var(--danger); background:var(--danger-soft); border-color:transparent; }
    .btn-danger:hover,.delete:hover,.danger:hover { background:var(--danger-soft); }
    .edit { color:var(--accent); background:var(--accent-soft); border-color:transparent; }
    .card,.image-card,.theme-card { background:var(--surface); border:1px solid var(--border); border-radius:12px; }
    .card { padding:24px; margin-bottom:18px; }
    .table-card { padding:0; overflow-x:auto; }
    table { width:100%; border-collapse:collapse; font-size:14px; }
    th { background:var(--subtle); color:var(--muted); font-size:13px; font-weight:600; white-space:nowrap; }
    th,td { padding:13px 16px; text-align:left; }
    tbody tr { border-top:1px solid var(--border); }
    tbody tr:hover { background:var(--subtle); }
    .table-center { text-align:center; }
    .table-right { text-align:right; }
    .table-title { font-weight:600; max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .tag { display:inline-block; padding:2px 8px; color:var(--accent); background:var(--accent-soft); border-radius:5px; font-size:12px; }
    .status-dot { display:inline-block; width:7px; height:7px; border-radius:50%; background:var(--muted); margin-right:6px; }
    .status-dot.published { background:var(--success); }
    .form-group { margin-bottom:18px; }
    .form-group > label { display:block; font-weight:600; margin-bottom:7px; }
    .form-row,.personal-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:20px; align-items:start; }
    .form-h { display:flex; align-items:flex-start; gap:16px; margin-bottom:18px; }
    .form-h > label { flex:0 0 125px; padding-top:10px; font-weight:500; }
    .form-body { flex:1; min-width:0; }
    .form-h-center { align-items:center; }
    .form-h-center > label { padding-top:0; }
    .radio-item { position:relative; display:inline-flex; align-items:center; gap:7px; cursor:pointer; white-space:nowrap; }
    .radio-item input[type=radio] { position:absolute; opacity:0; width:1px; height:1px; }
    .radio-custom { width:17px; height:17px; flex-shrink:0; border:1px solid var(--border); border-radius:50%; background:var(--surface); }
    .radio-item input:checked + .radio-custom { border:5px solid var(--accent); }
    .radio-item input:focus-visible + .radio-custom { outline:2px solid var(--accent); outline-offset:3px; }
    .custom-select { position:relative; }
    .custom-select-trigger { display:flex; align-items:center; justify-content:space-between; cursor:pointer; }
    .custom-select-trigger::after { content:''; border:4px solid transparent; border-top-color:var(--muted); margin-top:4px; }
    .custom-select-dropdown { display:none; position:absolute; inset:calc(100% + 5px) 0 auto; max-height:220px; overflow:auto; z-index:50; padding:4px; border:1px solid var(--border); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); }
    .custom-select-dropdown.show { display:block; }
    .custom-select-option { padding:8px 12px; border-radius:5px; cursor:pointer; }
    .custom-select-option:hover,.custom-select-option.selected { background:var(--accent-soft); color:var(--accent); }
    .editor-layout { display:flex; gap:24px; }
    .editor-main { flex:3; min-width:0; }
    .editor-side { flex:1; min-width:280px; }
    .toolbar { display:flex; gap:4px; flex-wrap:wrap; margin-bottom:8px; }
    .toolbar button { font-size:12px; padding:4px 10px; }
    .emoji-item { cursor:pointer; padding:6px; border-radius:6px; }
    .emoji-item:hover { background:var(--subtle); }
    .cover-upload { width:180px; height:180px; border:1px dashed var(--border); border-radius:10px; background:var(--subtle); display:flex; align-items:center; justify-content:center; overflow:hidden; cursor:pointer; flex-shrink:0; }
    .cover-upload.dragging { border-color:var(--accent); }
    .cover-upload img { width:100%; height:100%; object-fit:cover; pointer-events:none; }
    .w-33,.w-50 { width:100%; max-width:820px; }
    .w-60 { width:100%; }
    .image-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:18px; }
    .image-card { overflow:hidden; }
    .image-card > img { display:block; width:100%; height:180px; object-fit:cover; background:var(--subtle); cursor:pointer; }
    .image-card-actions { display:flex; gap:8px; padding:12px; }
    .image-card-actions button { flex:1; font-size:13px; padding:6px; }
    .pick-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(84px,1fr)); gap:10px; max-height:320px; overflow:auto; }
    .pick-item { border:2px solid transparent; border-radius:8px; overflow:hidden; cursor:pointer; background:var(--subtle); }
    .pick-item.selected { border-color:var(--accent); }
    .pick-item img { display:block; width:100%; height:84px; object-fit:cover; }
    .pick-empty { padding:32px; text-align:center; color:var(--muted); }
    .modal { position:fixed; inset:0; background:rgb(0 0 0 / 50%); display:flex; align-items:center; justify-content:center; padding:20px; z-index:100; }
    .modal-box { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:28px; width:100%; max-width:420px; max-height:90dvh; overflow:auto; box-shadow:var(--shadow); }
    .image-picker { max-width:720px; }
    .toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); padding:10px 20px; border-radius:9px; background:var(--text); color:var(--surface); z-index:200; box-shadow:var(--shadow); }
    .theme-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:20px; }
    .theme-card { overflow:hidden; }
    .theme-card.current { border-color:var(--accent); }
    .theme-card-body { padding:18px; }
    .theme-card-title { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:7px; }
    .theme-card-body p { color:var(--muted); font-size:13px; min-height:42px; }
    .theme-card-actions { display:flex; gap:8px; margin-top:16px; }
    .theme-badge { color:var(--accent); background:var(--accent-soft); padding:2px 7px; font-size:11px; border-radius:5px; white-space:nowrap; }
    .theme-thumbnail { height:164px; padding:14px 18px; background:var(--thumb-bg); color:var(--thumb-text); border-bottom:1px solid var(--border); overflow:hidden; }
    .thumb-header { height:32px; background:var(--thumb-header); border-radius:5px; margin-bottom:10px; display:flex; align-items:center; padding:0 10px; font-size:9px; font-weight:600; }
    .thumb-layout { display:grid; grid-template-columns:44px 1fr; gap:8px; }
    .thumb-sidebar,.thumb-article { background:var(--thumb-card); border:1px solid var(--thumb-border); border-radius:5px; padding:7px; }
    .thumb-avatar { width:18px; height:18px; margin:0 auto 7px; border-radius:50%; background:var(--thumb-accent); opacity:.65; }
    .thumb-line { height:3px; margin:5px 0; background:var(--thumb-text); opacity:.2; border-radius:2px; }
    .thumb-heading { height:5px; width:60%; background:var(--thumb-text); opacity:.7; margin-bottom:8px; }
    .thumb-chip { width:25px; height:7px; background:var(--thumb-accent); border-radius:3px; margin-top:7px; }
    .thumb-article + .thumb-article { margin-top:7px; }
    .theme-thumbnail.simple .thumb-header { border-radius:0; border-bottom:1px solid var(--thumb-border); }
    .theme-thumbnail.simple .thumb-layout { grid-template-columns:1fr 44px; }
    .theme-thumbnail.simple .thumb-sidebar { order:2; }
    .theme-thumbnail.simple .thumb-article,.theme-thumbnail.simple .thumb-sidebar { border:0; border-radius:0; }
    .theme-editor { margin-top:24px; }
    .theme-editor-header { display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:20px; }
    .theme-preview-box { width:min(1200px,100%); max-width:none; padding:0; display:flex; flex-direction:column; overflow:hidden; }
    .preview-toolbar { display:flex; align-items:center; gap:12px; flex-wrap:wrap; padding:16px 20px; border-bottom:1px solid var(--border); }
    .preview-toolbar h3 { margin-right:auto; }
    .preview-toolbar .selected { color:var(--accent); background:var(--accent-soft); border-color:var(--accent); }
    .preview-stage { background:var(--bg); padding:16px; overflow:auto; height:70dvh; }
    .preview-stage iframe { display:block; border:1px solid var(--border); background:white; width:100%; height:100%; margin:auto; }
    .preview-stage.mobile iframe { width:375px; max-width:100%; }
    .preview-state { height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; color:var(--muted); }
    .preview-note { padding:9px 20px; color:var(--muted); font-size:12px; border-top:1px solid var(--border); }
    @media (max-width:1100px) { .personal-grid { grid-template-columns:1fr; } .editor-layout { flex-direction:column; } .editor-side { min-width:0; } }
    @media (max-width:768px) {
      .sidebar { transform:translateX(-100%); transition:transform .2s; }
      .sidebar.open { transform:translateX(0); }
      .sidebar-overlay { position:fixed; inset:0; z-index:35; background:rgb(0 0 0 / 40%); }
      .workspace { margin-left:0; }
      .menu-toggle { display:block; padding:5px 10px; }
      .topbar { padding:0 16px; height:58px; }
      .topbar-actions { gap:8px; font-size:12px; }
      .main-content { padding:20px 16px; }
      h2 { font-size:21px; }
      .card { padding:18px; }
      .table-card { padding:0; }
      table { min-width:600px; }
      .form-row,.personal-grid { grid-template-columns:1fr; }
      .form-h,.form-h-center { flex-direction:column; align-items:stretch; gap:7px; }
      .form-h > label { flex:none; padding:0; }
      .form-h input,.form-group input,textarea { font-size:16px; }
      .modal { padding:12px; }
      .modal-box { padding:20px; }
      .theme-preview-box { padding:0; }
      .preview-toolbar { padding:12px; gap:8px; }
      .preview-toolbar h3 { width:100%; }
      .preview-stage { padding:8px; height:65dvh; }
      .cover-upload { width:150px; height:150px; }
    }
    @media (prefers-reduced-motion:reduce) { * { transition:none !important; } }
  </style>
</head>
<body>
  <div id="app" v-cloak>
    <div v-if="!logged" class="login" role="main" aria-label="登录">
      <button class="login-color" @click="toggleColorMode" :aria-label="colorMode==='dark'?'切换浅色模式':'切换深色模式'">{{colorMode==='dark'?'浅色模式':'深色模式'}}</button>
      <div class="login-box">
        <h1>博客管理后台</h1>
        <p>登录以管理内容与网站外观</p>
        <input v-model="username" type="text" autocomplete="username" placeholder="管理员账号" aria-label="管理员账号">
        <input v-model="password" type="password" autocomplete="current-password" placeholder="登录密码" @keyup.enter="login" aria-label="管理员密码">
        <button class="btn" @click="login" :disabled="loggingIn">{{loggingIn?'登录中…':'登录'}}</button>
      </div>
    </div>
    <div v-else class="admin-layout">
      <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen=false"></div>
      <nav class="sidebar" :class="{open:sidebarOpen}" aria-label="主导航">
        <div class="sidebar-header"><h1>博客控制台</h1><small>内容管理与站点配置</small></div>
        <div class="sidebar-menu">
          <a v-for="item in navigation" :key="item.id" href="#" :class="{active:currentPage===item.id}" :aria-current="currentPage===item.id?'page':null" @click.prevent="navigate(item.id)"><span class="nav-icon" aria-hidden="true">{{item.icon}}</span>{{item.label}}</a>
        </div>
        <div class="sidebar-footer"><button @click="logout">退出登录</button></div>
      </nav>
      <div class="workspace">
      <header class="topbar">
        <div class="topbar-title"><button class="menu-toggle" @click="sidebarOpen=!sidebarOpen" aria-label="切换导航菜单" :aria-expanded="sidebarOpen">☰</button><span>{{pageTitle}}</span></div>
        <div class="topbar-actions"><a href="/" target="_blank" rel="noopener">查看博客 ↗</a><button @click="toggleColorMode" :aria-label="colorMode==='dark'?'切换浅色模式':'切换深色模式'">{{colorMode==='dark'?'浅色':'深色'}}</button></div>
      </header>
      <main class="main-content" aria-label="主要内容">
        <div v-if="pageLoading" class="text-muted" role="status">加载中…</div>
        <div v-if="pageLoadError" class="card text-danger" role="alert">{{pageLoadError}} <button @click="loadPage(currentPage)">重试</button></div>
        <div v-if="currentPage==='posts'">
          <!-- 文章列表 -->
          <div v-if="!editingId">
          <div class="page-header"><h2>文章管理</h2></div>
          <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap">
            <button class="btn" @click="openAdd()">新建文章</button>
            <button class="btn btn-import" @click="showImportModal=true">导入文章</button>
          </div>
          <div class="w-60"><div class="card table-card">
            <table >
              <thead>
                <tr >
                  <th style="text-align:center;width:70px;white-space:nowrap">删除</th>
                  <th style="text-align:center;width:70px;white-space:nowrap">编辑</th>
                  <th style="text-align:center;width:60px">ID</th>
                  <th style="text-align:left">文章标题</th>
                  <th style="text-align:left;width:120px;white-space:nowrap">分类</th>
                  <th style="text-align:left;width:200px">标签</th>
                  <th style="text-align:center;width:100px">状态</th>
                  <th style="text-align:right;width:120px">发布日期</th>
                  <th style="text-align:right;width:120px">最后更新</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="post in posts" :key="post.id">
                  <tr >
                    <td class="table-center" style="white-space:nowrap"><button class="delete" @click="deletePost(post.id)" style="white-space:nowrap">删除</button></td>
                    <td class="table-center" style="white-space:nowrap"><button class="edit" @click="toggleEdit(post)" style="white-space:nowrap">编辑</button></td>
                    <td class="table-center text-muted">#{{post.id}}</td>
                    <td class="table-title">
                      <span v-if="currentPinnedId == post.id" class="tag" style="margin-right:6px" title="已置顶">置顶</span>{{post.title}}
                    </td>
                    <td class="text-muted" style="white-space:nowrap">{{post.category}}</td>
                    <td >
                      <div style="display:flex;flex-wrap:wrap;gap:4px">
                        <template v-for="(tag, i) in (post.tags || '').split(',').filter(t => t.trim())" :key="i">
                          <span class="tag">{{tag.trim()}}</span>
                        </template>
                      </div>
                    </td>
                    <td class="table-center" style="white-space:nowrap"><span class="status-dot" :class="{published:post.status==='published'}"></span><span style="font-size:15px;vertical-align:middle">{{post.status==='published'?'已发布':'草稿'}}</span></td>
                    <td class="table-right text-muted">{{new Date(post.published_at || post.created_at).toLocaleDateString('zh-CN')}}</td>
                    <td class="table-right text-muted">{{post.updated_at ? new Date(post.updated_at).toLocaleDateString('zh-CN') : '-'}}</td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
          <div v-if="Math.ceil(postTotal / postPageSize) > 1" style="display:flex;justify-content:center;gap:8px;margin-top:16px">
            <button class="btn btn-cancel" @click="loadPosts(postPage-1)" :style="{opacity:postPage<=1?0.4:1}" :disabled="postPage<=1" style="padding:8px 16px;font-size:14px">上一页</button>
            <span style="display:flex;align-items:center;font-weight:600;font-size:14px">{{postPage}} / {{Math.ceil(postTotal / postPageSize)}}</span>
            <button class="btn btn-cancel" @click="loadPosts(postPage+1)" :style="{opacity:postPage>=Math.ceil(postTotal/postPageSize)?0.4:1}" :disabled="postPage>=Math.ceil(postTotal/postPageSize)" style="padding:8px 16px;font-size:14px">下一页</button>
          </div>
          </div>
          </div>

          <!-- 编辑/新建文章 -->
          <div v-if="editingId" class="card" style="margin-top:20px">
            <div class="page-header" style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
              <button class="btn-back" @click="cancelNewPost">返回</button>
              <h2>{{editingId === 'new' ? '新建文章' : '编辑文章'}}</h2>
            </div>
            <div class="editor-layout">
              <div class="editor-main" style="display:flex;flex-direction:column">
                <div class="form-group"><label>文章标题</label><input v-model="form.title"></div>
                <div class="form-group" style="flex:1;display:flex;flex-direction:column">
                  <label>文章内容</label>
                  <div class="toolbar">
                    <button type="button" @click="insertMd('heading')" >标题</button>
                    <button type="button" @click="insertMd('bold')" style="font-weight:700">B</button>
                    <button type="button" @click="insertMd('italic')" style="font-style:italic">I</button>
                    <button type="button" @click="insertMd('link')" >链接</button>
                    <button type="button" @click="insertMd('code')" >代码</button>
                    <button type="button" @click="insertMd('ul')" >•列表</button>
                    <button type="button" @click="insertMd('ol')" >1.序号</button>
                    <button type="button" @click="insertMd('quote')" >❝引用</button>
                    <button type="button" @click="insertMd('hr')" >—分割线</button>
                    <button type="button" @click="insertMd('details')" >▼折叠</button>
                    <button type="button" @click="openImagePicker()" title="插入图片" >上传图片</button>
                  </div>
                  <div style="background:var(--subtle);border:2px solid var(--border);border-radius:12px;padding:12px;margin-bottom:8px;max-height:200px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:8px">
                    <div v-if="!settingsForm.iconfont_css" class="text-muted" style="padding:8px">未配置表情包链接，请在「网站设置」中配置并保存</div>
                    <div v-else-if="emojiLoading" class="text-muted" style="padding:8px">加载中...</div>
                    <div v-else-if="iconList.length === 0" class="text-muted" style="padding:8px">未找到图标，请检查链接是否正确</div>
                    <div v-for="icon in iconList" :key="icon.cls" @click="insertEmoji(icon)" class="emoji-item">
                      <svg v-if="icon.type === 'svg'" aria-hidden="true" style="width:24px;height:24px;fill:currentColor;overflow:hidden"><use :xlink:href="'#' + icon.cls"></use></svg>
                      <i v-else :class="icon.cls" style="font-size:24px"></i>
                    </div>
                  </div>
                  <textarea v-model="form.content" style="flex:1;min-height:400px"></textarea>
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:auto;padding-top:12px"><button class="btn" @click="savePost">保存</button><button class="btn btn-cancel" @click="cancelNewPost">取消</button></div>
              </div>
              <div class="editor-side">
                <div class="form-group"><label>发布状态</label>
                  <div class="custom-select" @click.stop>
                    <div class="custom-select-trigger" :class="{active: customSelects['status']}" @click="toggleSelect('status')">{{ form.status === 'draft' ? '草稿' : '已发布' }}</div>
                    <div class="custom-select-dropdown" :class="{show: customSelects['status']}">
                      <div class="custom-select-option" :class="{selected: form.status==='draft'}" @click="selectOption('status', 'draft', 'status')">草稿</div>
                      <div class="custom-select-option" :class="{selected: form.status==='published'}" @click="selectOption('status', 'published', 'status')">已发布</div>
                    </div>
                  </div>
                </div>
                <div class="form-group"><label>发布日期</label><input type="date" v-model="form.published_at"></div>
                <div class="form-group"><label>文章分类</label>
                  <div class="custom-select" @click.stop>
                    <div class="custom-select-trigger" :class="{active: customSelects['category']}" @click="toggleSelect('category')">{{ form.category || '请选择' }}</div>
                    <div class="custom-select-dropdown" :class="{show: customSelects['category']}">
                      <div class="custom-select-option" @click="selectOption('category', '', 'category')">请选择</div>
                      <div v-for="cat in categories" :key="cat.id" class="custom-select-option" :class="{selected: form.category===cat.name}" @click="selectOption('category', cat.name, 'category')">{{ cat.name }}</div>
                    </div>
                  </div>
                </div>
                <div class="form-group"><label>文章标签</label><input v-model="form.tags" placeholder="多个标签用英文逗号隔开，如：JavaScript,Vue,React"></div>
                <div class="form-group">
                  <label>文章密码</label>
                  <div class="inline-row">
                    <label class="radio-item" >
                      <input type="radio" value="" v-model="form.passwordType">
                      <span class="radio-custom"></span>
                      <span class="radio-label">无</span>
                    </label>
                    <label class="radio-item" >
                      <input type="radio" value="has" v-model="form.passwordType">
                      <span class="radio-custom"></span>
                      <span class="radio-label">有</span>
                    </label>
                    <input v-if="form.passwordType === 'has'" v-model="form.password" type="password" :placeholder="form.hadPassword ? '已设置，留空保持不变' : '请输入密码'" style="flex:1">
                  </div>
                </div>
                <div class="form-group">
                  <label>封面图片</label>
                  <input v-model="form.cover_image" @input="coverPreview=form.cover_image" placeholder="输入外链地址" style="width:100%;margin-bottom:8px">
                  <div style="display:flex;gap:12px;align-items:center;justify-content:center">
                    <div class="cover-upload" @dragover.prevent="$event.currentTarget.classList.add('dragging')" @dragleave="$event.currentTarget.classList.remove('dragging')" @drop.prevent="$event.currentTarget.classList.remove('dragging');handleCoverDrop($event)" @click="$event.currentTarget.querySelector('input[type=file]').click()">
                      <input type="file" @change="handleCoverChange" accept="image/*" @click.stop style="display:none">
                      <img v-if="coverPreview" :src="coverPreview" alt="封面预览">
                      <p v-else style="color:var(--muted);font-size:13px;pointer-events:none">点击或拖拽上传</p>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:8px">
                      <button type="button" @click="$event.target.closest('div').querySelector('input[type=file]').click()" class="btn">{{coverPreview ? '更换' : '上传'}}</button>
                      <input type="file" @change="handleCoverChange" accept="image/*" style="display:none">
                      <button v-if="coverPreview" @click="deleteCover" class="btn-danger">删除</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="currentPage==='category'">
          <div class="page-header"><h2>分类管理</h2></div>
          <button class="btn" @click="editingCategory='new';categoryForm={name:'',slug:'',description:''}" style="margin-bottom:16px">添加分类</button>
          <div v-if="editingCategory==='new'" class="card w-50">
            <div class="form-row">
              <div class="form-group"><label>英文ID</label><input v-model="categoryForm.slug"></div>
              <div class="form-group"><label>中文名称</label><input v-model="categoryForm.name"></div>
            </div>
            <div class="form-actions"><button class="btn" @click="saveCategory">保存</button><button class="btn btn-cancel" @click="editingCategory=null">取消</button></div>
          </div>
          <div class="w-50">
            <div class="card table-card">
              <table >
                <thead>
                  <tr >
                    <th style="text-align:center;width:70px;white-space:nowrap">删除</th>
                    <th style="text-align:center;width:70px;white-space:nowrap">编辑</th>
                    <th style="text-align:left">英文ID</th>
                    <th style="text-align:left">中文名称</th>
                    <th style="text-align:center;width:90px;white-space:nowrap">文章数</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="cat in categories" :key="cat.id">
                    <tr >
                      <td class="table-center" style="white-space:nowrap"><button class="delete" @click="deleteCategory(cat.id)" style="white-space:nowrap">删除</button></td>
                      <td class="table-center" style="white-space:nowrap"><button class="edit" @click="editingCategory===cat.id?editingCategory=null:editCategory(cat)" style="white-space:nowrap">{{editingCategory===cat.id?'收起':'编辑'}}</button></td>
                      <td style="padding:14px 16px;color:var(--muted);font-size:15px">/{{cat.slug}}</td>
                      <td style="padding:14px 16px;font-weight:600;font-size:16px">{{cat.name}}</td>
                      <td style="padding:14px 16px;text-align:center;color:var(--accent);font-weight:700;font-size:15px">{{categoryCounts[cat.name] || 0}}</td>
                    </tr>
                    <tr v-if="editingCategory===cat.id">
                      <td colspan="5" style="padding:16px;background:var(--subtle);border-top:2px solid var(--border)">
                        <div class="form-row">
                          <div class="form-group"><label>英文ID</label><input v-model="categoryForm.slug"></div>
                          <div class="form-group"><label>中文名称</label><input v-model="categoryForm.name"></div>
                        </div>
                        <div class="form-actions"><button class="btn" @click="saveCategory">保存</button><button class="btn btn-cancel" @click="editingCategory=null">取消</button></div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div v-if="currentPage==='trash'">
          <div class="page-header"><h2>回收站</h2></div>
          <div v-if="trashPosts.length===0" class="card" style="text-align:center;color:var(--muted)">回收站是空的</div>
          <div class="w-33"><div v-if="trashPosts.length > 0" class="card table-card">
            <table >
              <thead>
                <tr >
                  <th style="text-align:center;width:80px;white-space:nowrap">删除</th>
                  <th style="text-align:center;width:80px;white-space:nowrap">恢复</th>
                  <th style="text-align:center;width:60px">ID</th>
                  <th style="text-align:left">文章标题</th>
                  <th style="text-align:left;width:150px;white-space:nowrap">分类</th>
                  <th style="text-align:right;width:120px">发布日期</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="post in trashPosts" :key="post.id" >
                  <td class="table-center" style="white-space:nowrap"><button class="delete" @click="permanentDelete(post.id)" style="white-space:nowrap">删除</button></td>
                  <td class="table-center" style="white-space:nowrap"><button class="edit" @click="restorePost(post.id)" style="white-space:nowrap">恢复</button></td>
                  <td class="table-center text-muted">#{{post.id}}</td>
                  <td class="table-title">{{post.title}}</td>
                  <td class="text-muted" style="white-space:nowrap">{{post.category}}</td>
                  
                  <td class="table-right text-muted">{{new Date(post.published_at || post.created_at).toLocaleDateString('zh-CN')}}</td>
                </tr>
              </tbody>
            </table>
          </div></div>
        </div>
        <div v-if="currentPage==='images'">
          <div class="page-header" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
            <h2 >图片管理</h2>
            <button class="btn" @click="$refs.imageFileInput.click()">上传图片</button>
            <input type="file" ref="imageFileInput" @change="handleImageUpload" accept="image/*" style="display:none">
            <span v-if="imagesLoaded && images.length > 0" class="text-muted">已加载 {{images.length}} 张（含文章封面图）</span>
          </div>
          <div v-if="imagesLoadError" class="card" style="padding:20px;color:var(--danger)">加载图片失败：{{imagesLoadError}}</div>
          <div v-else-if="imagesLoaded && !r2Configured" class="card" style="padding:24px;line-height:1.8">
            未配置 R2 存储桶，无法使用图片管理。<br>
            请在 Cloudflare 控制台创建 R2 存储桶后，在 Worker 设置中添加绑定（变量名 <b>R2</b>），或参考项目内 <code>wrangler.toml</code> 中 R2 部分的注释说明。
          </div>
          <div v-else-if="!imagesLoaded" style="color:var(--muted)">加载中...</div>
          <div v-else-if="images.length===0" class="card" style="padding:32px;color:var(--muted);text-align:center">暂无图片，点击右上角「上传图片」</div>
          <div v-else>
            <div class="image-grid">
              <div v-for="img in images" :key="img.key" class="image-card">
                <img :src="img.url" :alt="img.key" loading="lazy" @click="copyImageLink(img)" @load="captureImageSize($event, img.key)" :title="'点击复制链接：' + img.key">
                <div v-if="imageSizes[img.key]" style="text-align:center;color:var(--muted);font-size:12px;padding:6px 12px 0;white-space:nowrap">{{imageSizes[img.key][0]}} × {{imageSizes[img.key][1]}}</div>
                <div class="image-card-actions">
                  <button @click="copyImageLink(img)">复制链接</button>
                  <button class="danger" @click="deleteImage(img)">删除</button>
                </div>
              </div>
            </div>
            <div v-if="imagesHasMore" style="text-align:center;margin-top:16px">
              <button class="btn" @click="loadMoreImages">加载更多</button>
            </div>
          </div>
        </div>
        <div v-if="currentPage==='settings'">
          <div class="page-header"><h2>网站设置</h2></div>
          <button class="btn" @click="saveSiteSettings" :disabled="!settingsLoaded" style="margin-bottom:16px">保存设置</button>
          <div style="max-width:760px;width:100%">
          <div class="card">
            <div class="form-h"><label>网站标题</label><div class="form-body"><input v-model="settingsForm.site_name"></div></div>
            <div class="form-h"><label>网站副标题</label><div class="form-body"><input v-model="settingsForm.site_description"></div></div>
            <div class="form-h"><label>网站图标</label><div class="form-body"><div class="inline-row"><div class="asset-icon"><img src="/icon/favicon.ico" ></div><span class="text-muted">替换 <code class="inline-code">public/icon/favicon.ico</code> 文件即可更换</span></div></div></div>
            <div class="form-h"><label>网站页脚（支持HTML）</label><div class="form-body"><div style="display:flex;gap:8px;margin-bottom:8px"><button @click="applyFooterTemplate" class="btn">应用预设模板</button></div><textarea v-model="settingsForm.site_footer" rows="3"></textarea></div></div>
            <div class="form-h"><label>版权说明（支持HTML）</label><div class="form-body"><div style="display:flex;gap:8px;margin-bottom:8px"><button @click="applyCopyrightTemplate" class="btn">应用预设模板</button></div><textarea v-model="settingsForm.copyright_notice" rows="4" placeholder="例如：© 2026 我的博客. All rights reserved."></textarea></div></div>
            <div class="form-h"><label>表情包引入</label><div class="form-body"><input v-model="settingsForm.iconfont_css" placeholder="Font class(.css) 或 Symbol(.js) 格式，如：//at.alicdn.com/t/c/font_xxx.js"><p class="field-help">支持 iconfont.cn 的 Font class（单色，颜色跟随文字）与 Symbol（多色，保留图库原始配色，推荐）格式，配置后可在编辑器中插入表情图标</p></div></div>
            <div class="form-h"><label>自定义JS</label><div class="form-body"><textarea v-model="settingsForm.custom_js" rows="4" placeholder="请输入完整的 script 标签，例如：&lt;script src=&quot;https://cdnjs.loli.net/ajax/libs/xxx/xxx.min.js&quot;&gt;&lt;/script&gt;"></textarea></div></div>
            <div class="form-h form-h-center"><label>全站密码</label><div class="form-body"><div class="inline-row wrap"><label class="radio-item" ><input type="radio" value="" v-model="settingsForm.sitePasswordType"><span class="radio-custom"></span><span class="radio-label">无</span></label><label class="radio-item" ><input type="radio" value="has" v-model="settingsForm.sitePasswordType"><span class="radio-custom"></span><span class="radio-label">有</span></label><input v-if="settingsForm.sitePasswordType === 'has'" v-model="settingsForm.site_password" type="password" :placeholder="sitePasswordSet ? '已设置，留空保持不变' : '请输入全站密码'" style="flex:1;min-width:160px"></div></div></div>
            <div class="form-h form-h-center"><label>允许搜索引擎爬取</label><div class="form-body"><div class="inline-row"><label class="radio-item" ><input type="radio" value="1" v-model="settingsForm.allow_robots"><span class="radio-custom"></span><span class="radio-label">是</span></label><label class="radio-item" ><input type="radio" value="0" v-model="settingsForm.allow_robots"><span class="radio-custom"></span><span class="radio-label">否</span></label></div></div></div>
            <div class="form-h form-h-center"><label>启用压缩</label><div class="form-body"><div class="inline-row"><label class="radio-item" ><input type="radio" value="1" v-model="settingsForm.enable_compression"><span class="radio-custom"></span><span class="radio-label">是</span></label><label class="radio-item" ><input type="radio" value="0" v-model="settingsForm.enable_compression"><span class="radio-custom"></span><span class="radio-label">否</span></label></div></div></div>
            <div class="form-h"><label>CORS 允许来源</label><div class="form-body"><input v-model="settingsForm.allowed_origins" placeholder="*（多域名用逗号分隔，* 表示全部）"></div></div>
            <div class="form-h form-h-center"><label>MCP 服务开关</label><div class="form-body"><div class="inline-row">
              <label class="radio-item" ><input type="radio" value="1" v-model="settingsForm.enable_mcp"><span class="radio-custom"></span><span class="radio-label">开启</span></label>
              <label class="radio-item" ><input type="radio" value="0" v-model="settingsForm.enable_mcp"><span class="radio-custom"></span><span class="radio-label">关闭</span></label>
            </div></div></div>
          </div>
          </div>
          <div v-if="settingsForm.enable_mcp === '1'" style="max-width:760px;width:100%">
            <div class="card">
              <h3 class="section-title">MCP 服务 / API 密钥</h3>
              <div class="form-h"><label>MCP 服务地址</label><div class="form-body"><div class="inline-row"><input :value="mcpAddress" readonly style="flex:1"><button type="button" class="btn" @click="copyText(mcpAddress, '地址')" style="padding:8px 20px;font-size:14px">复制地址</button></div><p class="field-help">在 AstrBot / OpenClaw 等支持 MCP 的 agent 中，选择 Streamable HTTP 传输，填入此地址与下方密钥即可对接。</p></div></div>
              <div class="form-h"><label>生成新密钥</label><div class="form-body">
                <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:6px">
                  <input v-model="agentKeyForm.name" placeholder="密钥名称（可选）" style="flex:1;min-width:150px">
                  <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:14px;font-weight:600"><input type="checkbox" v-model="agentKeyForm.read" style="width:16px;height:16px;cursor:pointer">读权限</label>
                  <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:14px;font-weight:600"><input type="checkbox" v-model="agentKeyForm.write" style="width:16px;height:16px;cursor:pointer">写权限</label>
                  <button type="button" class="btn" @click="generateAgentKey" :disabled="agentKeys.length >= 2">{{ agentKeys.length >= 2 ? '已达上限' : '生成密钥' }}</button>
                </div>
                <p v-if="agentKeys.length >= 2" style="font-size:12px;color:var(--danger);margin:0">已达 2 个密钥上限，请先吊销一个再生成。</p>
                <p v-else style="font-size:12px;color:var(--muted);margin:0">读 = 查看/读取文章与分类；写 = 新建/修改/发布/删除文章及上传图片。</p>
              </div></div>
              <div v-if="agentKeys.length > 0" class="form-h" style="align-items:flex-start"><label>已生成密钥</label><div class="form-body">
                <div v-for="k in agentKeys" :key="k.id" style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--subtle);border:2px solid var(--border);border-radius:12px;margin-bottom:8px;flex-wrap:wrap">
                  <div style="min-width:100px"><strong style="color:var(--text)">{{k.name}}</strong></div>
                  <div style="display:flex;gap:6px">
                    <span v-if="k.permissions && k.permissions.indexOf('read') !== -1" class="tag">读</span>
                    <span v-if="k.permissions && k.permissions.indexOf('write') !== -1" class="tag text-warning">写</span>
                  </div>
                  <code style="flex:1;min-width:160px;color:var(--muted);letter-spacing:1px">{{ maskKey(k.key) }}</code>
                  <button type="button" class="btn" @click="copyText(k.key, '密钥')" style="padding:6px 14px;font-size:13px">复制</button>
                  <button type="button" class="btn btn-cancel" @click="resetAgentKey(k)" style="padding:6px 14px;font-size:13px">重置</button>
                  <button type="button" class="btn delete" @click="revokeAgentKey(k)" style="padding:6px 14px;font-size:13px">吊销</button>
                </div>
              </div></div>
            </div>
          </div>
        </div>
        <div v-if="currentPage==='personal'">
          <div class="page-header"><h2>个性设置</h2></div>
          <button class="btn" @click="savePersonalSettings" :disabled="!settingsLoaded" style="margin-bottom:16px">保存设置</button>
          <div class="personal-grid">
            <div class="card">
              <h3 class="section-title">个人信息</h3>
              <div class="form-h"><label>个人名称</label><div class="form-body"><input v-model="settingsForm.site_author"></div></div>
              <div class="form-h"><label>个人头像</label><div class="form-body"><div class="inline-row">
                <div class="asset-icon"><img src="/icon/profile.png" ></div>
                <span class="text-muted">替换 <code class="inline-code">public/icon/profile.png</code> 文件即可更换</span>
              </div></div></div>
              <div class="form-h"><label>个人简介</label><div class="form-body"><textarea v-model="settingsForm.site_bio" rows="3"></textarea></div></div>
              <div class="form-h"><label>建站时间</label><div class="form-body"><input type="date" v-model="settingsForm.site_created_at"></div></div>
              <div class="form-h"><label>友链标题</label><div class="form-body"><input v-model="settingsForm.links_title" placeholder="友链"></div></div>
              <div class="form-h"><label>友链标题图标</label><div class="form-body"><div class="inline-row">
                <div class="asset-icon"><img src="/icon/friend-links.png" ></div>
                <span class="text-muted">替换 <code class="inline-code">public/icon/friend-links.png</code> 文件即可更换</span>
              </div></div></div>
              <div class="form-h"><label>友链内容</label><div class="form-body"><textarea v-model="settingsForm.site_links" rows="4" placeholder="格式示例：&#10;Google,https://google.com&#10;GitHub,https://github.com&#10;示例站点,http://example.com&#10;&#10;支持 http:// 和 https:// 开头的网址"></textarea></div></div>
            </div>
            <div class="card">
              <h3 class="section-title">布局与模块</h3>
              <div class="form-h form-h-center"><label>个人简介位置</label><div class="form-body"><div class="inline-row">
                <label class="radio-item" ><input type="radio" value="left" v-model="settingsForm.profile_position"><span class="radio-custom"></span><span class="radio-label">居左</span></label>
                <label class="radio-item" ><input type="radio" value="right" v-model="settingsForm.profile_position"><span class="radio-custom"></span><span class="radio-label">居右</span></label>
              </div></div></div>
              <div class="form-h form-h-center"><label>标签云开关</label><div class="form-body"><div class="inline-row">
                <label class="radio-item" ><input type="radio" value="1" v-model="settingsForm.enable_tag_cloud"><span class="radio-custom"></span><span class="radio-label">显示</span></label>
                <label class="radio-item" ><input type="radio" value="0" v-model="settingsForm.enable_tag_cloud"><span class="radio-custom"></span><span class="radio-label">不显示</span></label>
              </div></div></div>
              <div class="form-h form-h-center"><label>文章目录开关</label><div class="form-body"><div class="inline-row">
                <label class="radio-item" ><input type="radio" value="1" v-model="settingsForm.enable_post_toc"><span class="radio-custom"></span><span class="radio-label">显示</span></label>
                <label class="radio-item" ><input type="radio" value="0" v-model="settingsForm.enable_post_toc"><span class="radio-custom"></span><span class="radio-label">不显示</span></label>
              </div></div></div>
              <div class="form-h form-h-center"><label>标签云位置</label><div class="form-body"><div class="inline-row">
                <label class="radio-item" ><input type="radio" value="left" v-model="settingsForm.tag_cloud_position"><span class="radio-custom"></span><span class="radio-label">居左</span></label>
                <label class="radio-item" ><input type="radio" value="right" v-model="settingsForm.tag_cloud_position"><span class="radio-custom"></span><span class="radio-label">居右</span></label>
              </div></div></div>
              <div class="form-h"><label>分类标题图标</label><div class="form-body"><div class="inline-row">
                <div class="asset-icon"><img src="/icon/category.png" ></div>
                <span class="text-muted">替换 <code class="inline-code">public/icon/category.png</code> 文件即可更换</span>
              </div></div></div>
              <div class="form-h form-h-center"><label>置顶文章</label><div class="form-body"><div class="inline-row wrap">
                <label class="radio-item" ><input type="radio" value="" v-model="settingsForm.pinnedType"><span class="radio-custom"></span><span class="radio-label">无</span></label>
                <label class="radio-item" ><input type="radio" value="has" v-model="settingsForm.pinnedType"><span class="radio-custom"></span><span class="radio-label">有</span></label>
                <input v-if="settingsForm.pinnedType === 'has'" v-model="settingsForm.pinned_post_id" type="number" min="0" step="1" placeholder="输入文章编号" style="flex:1;min-width:120px" @input="settingsForm.pinned_post_id = settingsForm.pinned_post_id.replace(/[^0-9]/g, '')">
              </div></div></div>
              <div class="form-h"><label>置顶文章图标</label><div class="form-body"><div class="inline-row">
                <div class="asset-icon"><img src="/icon/pin-post.png" ></div>
                <span class="text-muted">替换 <code class="inline-code">public/icon/pin-post.png</code> 文件即可更换</span>
              </div></div></div>
              <div class="form-h form-h-center"><label>广告位置</label><div class="form-body"><div class="inline-row">
                <label class="radio-item" ><input type="radio" value="left" v-model="settingsForm.ad_position"><span class="radio-custom"></span><span class="radio-label">左侧栏</span></label>
                <label class="radio-item" ><input type="radio" value="right" v-model="settingsForm.ad_position"><span class="radio-custom"></span><span class="radio-label">右侧栏</span></label>
              </div></div></div>
              <div class="form-h"><label>广告内容</label><div class="form-body"><textarea v-model="settingsForm.ad_content" rows="4" placeholder="HTML 示例：&#10;<a href='https://example.com'><img src='广告图片链接'></a>&#10;Markdown 示例：&#10;[![广告](广告图片链接)](https://example.com)"></textarea><p class="field-help">广告图片使用1:1比例</p></div></div>
            </div>
          </div>
        </div>
        <section v-if="currentPage==='themes'" aria-label="博客主题">
          <div class="page-header"><h2>博客主题</h2><p class="page-description">选择博客外观。预览不会保存设置，也不会改变后台配色。</p></div>
          <div v-if="!settingsLoaded" class="card text-muted">正在加载已保存的主题配置…</div>
          <template v-else>
            <div class="theme-grid">
              <article v-for="theme in themeOptions" :key="theme.value" class="theme-card" :class="{current:savedTheme===theme.value}">
                <div class="theme-thumbnail" :class="theme.layout" :style="thumbnailStyle(theme.value)" aria-hidden="true">
                  <div class="thumb-header">{{settingsForm.site_name || '我的博客'}} <span style="margin-left:auto">首页 · 归档</span></div>
                  <div class="thumb-layout">
                    <div class="thumb-sidebar"><div class="thumb-avatar"></div><div class="thumb-line"></div><div class="thumb-line"></div><div class="thumb-line"></div><div class="thumb-chip"></div></div>
                    <div><div class="thumb-article"><div class="thumb-heading"></div><div class="thumb-line"></div><div class="thumb-line"></div><div class="thumb-chip"></div></div><div class="thumb-article"><div class="thumb-heading"></div><div class="thumb-line"></div></div></div>
                  </div>
                </div>
                <div class="theme-card-body">
                  <div class="theme-card-title"><h3>{{theme.name}}</h3><span v-if="savedTheme===theme.value" class="theme-badge">当前启用</span><span v-else-if="themeDraft===theme.value" class="theme-badge">已选草稿</span></div>
                  <p>{{theme.description}}</p>
                  <div class="theme-card-actions"><button class="btn-cancel" @click="openThemePreview(theme.value)">预览</button><button v-if="theme.value==='diy-themes'" class="btn-cancel" @click="themeDraft=theme.value">编辑</button><button class="btn" @click="applyBlogTheme(theme.value)" :disabled="themeSaving || (savedTheme===theme.value && (theme.value!=='diy-themes' || !diyDirty))">{{themeSaving && themeDraft===theme.value?'应用中…':'应用'}}</button></div>
                </div>
              </article>
            </div>
            <div v-if="themeDraft==='diy-themes'" class="card theme-editor">
              <div class="theme-editor-header"><div><h3>DIY 主题编辑</h3><p class="text-muted">{{diyDirty?'有未保存的更改，预览使用当前草稿。':'配置与已保存版本一致。'}} 更改只在应用后生效。</p></div><div style="display:flex;gap:8px"><button class="btn-cancel" @click="resetThemeDraft" :disabled="themeSaving">恢复已保存</button><button class="btn" @click="openThemePreview('diy-themes')">预览草稿</button></div></div>
              <div class="personal-grid"><div v-for="field in diyFields" :key="field.key" class="form-h"><label :for="'diy-' + field.key">{{field.label}}</label><div class="form-body"><input :id="'diy-' + field.key" v-model.trim="diyTheme[field.key]" :placeholder="field.placeholder" :maxlength="300"></div></div></div>
              <button class="btn" @click="applyBlogTheme('diy-themes')" :disabled="themeSaving || (savedTheme==='diy-themes' && !diyDirty)">保存并应用 DIY 主题</button>
            </div>
          </template>
        </section>
      </main>
      </div>
      <div v-if="previewOpen" class="modal" @click.self="closeThemePreview" @keydown.esc="closeThemePreview">
        <div class="modal-box theme-preview-box" role="dialog" aria-modal="true" aria-labelledby="theme-preview-title" tabindex="-1" ref="previewDialog">
          <div class="preview-toolbar"><h3 id="theme-preview-title">{{previewName}} · 静态预览</h3><button :class="{selected:previewWidth==='desktop'}" @click="previewWidth='desktop'">桌面</button><button :class="{selected:previewWidth==='mobile'}" @click="previewWidth='mobile'">手机</button><button @click="closeThemePreview" aria-label="关闭主题预览">关闭</button></div>
          <div class="preview-stage" :class="{mobile:previewWidth==='mobile'}">
            <div v-if="previewLoading" class="preview-state" role="status">正在生成预览…</div>
            <div v-else-if="previewError" class="preview-state" role="alert"><p>{{previewError}}</p><button @click="openThemePreview(previewTheme)">重新加载</button></div>
            <iframe v-else-if="previewHtml" :srcdoc="previewHtml" sandbox="" title="博客主题静态预览" referrerpolicy="no-referrer"></iframe>
          </div>
          <p class="preview-note">预览不会保存；脚本、登录及页面跳转已禁用。</p>
        </div>
      </div>
      <!-- 导入弹窗 -->
      <div v-if="showImportModal" class="modal" @click.self="showImportModal=false">
        <div class="modal-box" style="max-width:500px">
          <h3 class="section-title">导入文章</h3>
          <p style="margin-bottom:16px;font-size:14px">支持 WordPress 导出的 XML 文件</p>
          <div style="margin-bottom:16px">
            <input type="file" ref="importFile" accept=".xml" style="display:none" @change="handleImportFile">
            <button class="btn" @click="$refs.importFile.click()" style="width:100%">选择 XML 文件</button>
          </div>
          <div v-if="importFileName" style="margin-bottom:16px;padding:12px;background:var(--subtle);border-radius:12px;border:2px solid var(--border)">
            <p style="font-size:14px">已选择: {{importFileName}}</p>
          </div>
          <div v-if="importResult" style="margin-bottom:16px;padding:12px;background:var(--subtle);border-radius:12px;border:2px solid var(--border)">
            <p style="font-size:14px;margin-bottom:8px">导入结果:</p>
            <p class="text-success">成功: {{importResult.success}} 篇</p>
            <p v-if="importResult.failed > 0" style="color:var(--danger);font-size:14px">失败: {{importResult.failed}} 篇</p>
          </div>
          <div style="display:flex;gap:12px;justify-content:center">
            <button class="btn btn-cancel" @click="showImportModal=false;importFileName='';importResult=null">关闭</button>
            <button class="btn" @click="importPosts" :disabled="!importFileName || importing">
              {{importing ? '导入中...' : '开始导入'}}
            </button>
          </div>
        </div>
      </div>
      <!-- 插入图片弹窗（对接 R2 图片库） -->
      <div v-if="showImagePicker" class="modal" @click.self="showImagePicker=false">
        <div class="modal-box image-picker">
          <h3 class="section-title">插入图片</h3>
          <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
            <button class="btn" @click="$refs.pickerFileInput.click()" :disabled="pickUploading">{{pickUploading ? '上传中...' : '上传新图片'}}</button>
            <input type="file" ref="pickerFileInput" @change="handleImageUpload" accept="image/*" style="display:none">
            <span v-if="!r2Configured" style="color:var(--danger);font-size:13px">未配置 R2 存储桶，无法上传图片</span>
            <span v-else-if="imagesLoadError" style="color:var(--danger);font-size:13px">{{imagesLoadError}}</span>
          </div>
          <div v-if="!imagesLoaded" style="color:var(--muted);font-size:14px;padding:24px 0;text-align:center">图片加载中...</div>
          <div v-else-if="images.length===0" class="pick-empty">暂无图片，可先点击「上传图片」</div>
          <div v-else class="pick-grid">
            <div v-for="img in images" :key="img.key" class="pick-item" :class="{selected: selectedImage && selectedImage.key===img.key}" @click="selectedImage=img" :title="img.key">
              <img :src="img.url" :alt="img.key" loading="lazy">
            </div>
          </div>
          <div v-if="selectedImage" style="display:flex;gap:14px;align-items:center;margin-top:18px;padding:12px;background:var(--subtle);border:2px solid var(--border);border-radius:12px">
            <img :src="selectedImage.url" style="width:90px;height:90px;object-fit:cover;border-radius:8px;flex-shrink:0" @load="captureImageSize($event, selectedImage.key)">
            <div style="flex:1;min-width:0">
              <div style="color:var(--muted);font-size:12px;margin-bottom:6px">图片链接</div>
              <input :value="locationOrigin + selectedImage.url" readonly >
              <div style="margin-top:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
                <button class="btn" @click="insertPickedImage" style="padding:8px 20px;font-size:13px">插入图片</button>
                <button class="btn delete" @click="deleteImage(selectedImage)" style="padding:8px 20px;font-size:13px">删除图片</button>
                <span v-if="imageSizes[selectedImage.key]" style="color:var(--muted);font-size:12px">{{imageSizes[selectedImage.key][0]}} × {{imageSizes[selectedImage.key][1]}}</span>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:20px">
            <button class="btn btn-cancel" @click="showImagePicker=false">取消</button>
          </div>
        </div>
      </div>
      <div v-if="confirmModal.show" class="modal" @click.self="confirmModal.onCancel && confirmModal.onCancel()">
        <div class="modal-box">
          <h3 class="section-title">{{confirmModal.title}}</h3>
          <p style="margin-bottom:16px;white-space:pre-line">{{confirmModal.message}}</p>
          <div v-if="confirmModal.checkbox" style="margin-bottom:20px;display:flex;align-items:center;gap:8px;justify-content:center">
            <input type="checkbox" id="confirmCheckbox" v-model="confirmModal.checkboxValue" style="width:16px;height:16px;cursor:pointer">
            <label for="confirmCheckbox" style="cursor:pointer;font-size:14px">{{confirmModal.checkboxLabel}}</label>
          </div>
          <div style="display:flex;gap:12px;justify-content:center">
            <button class="btn btn-cancel" @click="confirmModal.onCancel && confirmModal.onCancel()">取消</button>
            <button class="btn" @click="confirmModal.onConfirm && confirmModal.onConfirm(confirmModal.checkboxValue)">确认</button>
          </div>
        </div>
      </div>
      <div v-if="toast" class="toast">{{toast}}</div>
    </div>
  </div>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
    const { createApp, ref, computed, onMounted, onUnmounted, watch, nextTick } = Vue;
    createApp({
      setup() {
        const logged = ref(false);
        const loggingIn = ref(false);
        const colorMode = ref(document.documentElement.dataset.colorMode);
        const sidebarOpen = ref(false);
        const navigation = [
          { id:'posts', label:'文章管理', icon:'▤' }, { id:'category', label:'分类管理', icon:'▦' },
          { id:'images', label:'图片管理', icon:'▧' }, { id:'themes', label:'博客主题', icon:'◈' },
          { id:'personal', label:'个性设置', icon:'○' }, { id:'settings', label:'网站设置', icon:'⚙' },
          { id:'trash', label:'回收站', icon:'⌫' }
        ];
        const pageTitle = computed(() => navigation.find(item => item.id === currentPage.value)?.label || '控制台');
        const navigate = (page) => { currentPage.value = page; sidebarOpen.value = false; };
        const toggleColorMode = () => { colorMode.value = colorMode.value === 'dark' ? 'light' : 'dark'; localStorage.setItem('adminColorMode', colorMode.value); document.documentElement.dataset.colorMode = colorMode.value; };
        const colorScheme = matchMedia('(prefers-color-scheme: dark)');
        const followSystemColor = (event) => { if (!localStorage.getItem('adminColorMode')) { colorMode.value = event.matches ? 'dark' : 'light'; document.documentElement.dataset.colorMode = colorMode.value; } };
        const username = ref('');
        const password = ref('');
        const posts = ref([]);
        const categoryCounts = ref({});
        const editingId = ref(null);
        const form = ref({ title: '', content: '', category: '', tags: '', status: 'published', cover_image: '', password: '', passwordType: '', hadPassword: false, published_at: new Date().toISOString().split('T')[0] });
        const coverPreview = ref('');
        const toast = ref('');
        const categories = ref([]);
        const currentPage = ref('posts');
        const settingsForm = ref({ site_name: '', site_description: '', site_bio: '', site_links: '', site_author: '', site_footer: '', custom_js: '', iconfont_css: '', site_theme: 'animal-forest', enable_tag_cloud: '1', enable_post_toc: '1', enable_mcp: '0', profile_position: 'left', tag_cloud_position: 'left', pinned_post_id: '', pinnedType: '', copyright_notice: '', ad_content: '', ad_position: 'left', site_password: '', sitePasswordType: '' });
        // 全站密码是否已设置（哈希不回传，仅用标记区分“保持不变”与“首次设置”）
        const sitePasswordSet = ref(false);
        const categoryForm = ref({ name: '', slug: '', description: '' });
        const editingCategory = ref(null);
        const trashPosts = ref([]);
        const confirmModal = ref({ show: false, title: '', message: '', checkbox: false, checkboxLabel: '', checkboxValue: true, onConfirm: null, onCancel: null });
        // 导入相关状态
        const showImportModal = ref(false);
        const importFileName = ref('');
        const importFileData = ref(null);
        const importing = ref(false);
        const importResult = ref(null);
        // 置顶相关状态
        const currentPinnedId = ref('');
        // 表情包相关状态
        const iconList = ref([]);
        const emojiLoading = ref(false);
        const loadedIconfontUrl = ref('');
        const pageLoading = ref(false);
        const pageLoadError = ref('');
        const settingsLoaded = ref(false);
        const loadedResources = new Set();
        const resourceRequests = new Map();
        let pageRequest = 0;
        const ensureResource = (name, loader) => {
          if (loadedResources.has(name)) return Promise.resolve();
          if (resourceRequests.has(name)) return resourceRequests.get(name);
          const request = Promise.resolve().then(loader).then((result) => { if (result === false) throw new Error('加载失败'); loadedResources.add(name); }).finally(() => resourceRequests.delete(name));
          resourceRequests.set(name, request);
          return request;
        };
        const loadPage = async (page) => {
          if (!logged.value) return;
          const request = ++pageRequest;
          pageLoading.value = true; pageLoadError.value = '';
          try {
            const resources = {
              posts: [['posts', loadPosts], ['categories', loadCategories], ['settings', loadSettings]],
              category: [['categories', loadCategories], ['posts', loadPosts]],
              images: [['images', loadImages]], trash: [['trash', loadTrash]],
              personal: [['settings', loadSettings]], themes: [['settings', loadSettings]],
              settings: [['settings', loadSettings], ['agentKeys', loadAgentKeys]]
            };
            await Promise.all((resources[page] || []).map(([name, loader]) => ensureResource(name, loader)));
          } catch { if (request === pageRequest) pageLoadError.value = '加载失败，请重试。'; }
          finally { if (request === pageRequest) pageLoading.value = false; }
        };
        const check = () => {
          if (!localStorage.getItem('token')) return;
          const saved = localStorage.getItem('adminPage') || 'posts';
          const page = saved === 'appearance' ? 'themes' : saved === 'profile' ? 'personal' : saved;
          currentPage.value = navigation.some(item => item.id === page) ? page : 'posts';
          logged.value = true;
          loadPage(currentPage.value);
        };
        const api = (url, o = {}) => {
          o.headers = o.headers || {};
          o.headers['Authorization'] = 'Bearer ' + localStorage.getItem('token');
          return axios(url, o).catch(function(e) {
            if (e.response && e.response.status === 401) logout();
            throw e;
          });
        };
        const login = async () => {
          if (loggingIn.value) return;
          loggingIn.value = true;
          try { const r = await axios.post('/api/login', { username:username.value, password:password.value }); if (r.data.success) { localStorage.setItem('token',r.data.token); password.value = ''; logged.value = true; loadPage(currentPage.value); } }
          catch (e) { alert(e.response ? e.response.data.error || '登录失败' : '登录失败'); }
          finally { loggingIn.value = false; }
        };
        const logout = () => { closeThemePreview(); localStorage.removeItem('token'); logged.value = false; sidebarOpen.value = false; loadedResources.clear(); settingsLoaded.value = false; imagesLoaded.value = false; };
        const loadPosts = async (page = postPage.value) => { try { const r = await api('/api/admin/posts?page=' + page); posts.value = r.data.data; postTotal.value = r.data.total; categoryCounts.value = r.data.categoryCounts || {}; postPage.value = page; if (page > 1 && !posts.value.length && postTotal.value) await loadPosts(page - 1); } catch (e) { showToast('加载文章失败'); return false; } };
        const loadCategories = async () => { try { const r = await api('/api/categories'); categories.value = r.data; } catch (e) { showToast('加载分类失败'); return false; } };
        const loadSettings = async () => { try { const r = await api('/api/admin/settings'); const pinnedId = r.data.pinned_post_id || ''; try { const saved = JSON.parse(r.data.diy_theme || '{}'); diyTheme.value = Object.fromEntries(diyFields.map(({ key }) => [key, typeof saved[key] === 'string' ? saved[key] : themes['diy-themes'][key]])); } catch { diyTheme.value = Object.fromEntries(diyFields.map(({ key }) => [key, themes['diy-themes'][key]])); } sitePasswordSet.value = r.data.site_password_set === '1'; settingsForm.value = { site_name: r.data.site_name || '', site_description: r.data.site_description || '', site_bio: r.data.site_bio || '', site_links: r.data.site_links || '', site_author: r.data.site_author || '', site_footer: r.data.site_footer || '', custom_js: r.data.custom_js || '', iconfont_css: r.data.iconfont_css || '', site_theme: r.data.site_theme || 'animal-forest', allow_robots: r.data.allow_robots || '1', enable_compression: r.data.enable_compression || '1', links_title: r.data.links_title || '友链', site_created_at: r.data.site_created_at || '2020-02-02', site_password: '', sitePasswordType: sitePasswordSet.value ? 'has' : '', allowed_origins: r.data.allowed_origins || '*', enable_tag_cloud: r.data.enable_tag_cloud || '1', enable_post_toc: r.data.enable_post_toc || '1', enable_mcp: r.data.enable_mcp || '0', profile_position: r.data.profile_position || 'left', tag_cloud_position: r.data.tag_cloud_position || 'left', pinned_post_id: pinnedId, pinnedType: pinnedId ? 'has' : '', copyright_notice: r.data.copyright_notice || '', ad_content: r.data.ad_content || '', ad_position: r.data.ad_position || 'left' }; currentPinnedId.value = pinnedId; savedTheme.value = settingsForm.value.site_theme; themeDraft.value = savedTheme.value; savedDiyTheme.value = { ...diyTheme.value }; settingsLoaded.value = true; } catch (e) { showToast('加载设置失败'); return false; } };
        const loadTrash = async () => { try { const r = await api('/api/admin/trash'); trashPosts.value = r.data; } catch (e) { showToast('加载回收站失败'); return false; } };
        const showToast = (m) => { toast.value = m; setTimeout(() => toast.value = '', 2000); };
        const showConfirm = (t, m, options = {}) => new Promise(r => {
          confirmModal.value = {
            show: true,
            title: t,
            message: m,
            checkbox: options.checkbox || false,
            checkboxLabel: options.checkboxLabel || '',
            checkboxValue: options.checkboxDefault !== undefined ? options.checkboxDefault : true,
            onConfirm: (checkboxVal) => { confirmModal.value.show = false; r({ confirmed: true, checkboxValue: checkboxVal }); },
            onCancel: () => { confirmModal.value.show = false; r({ confirmed: false, checkboxValue: false }); }
          };
        });
        const postPage = ref(1);
        const postPageSize = 10;
        const postTotal = ref(0);
        const openAdd = () => { editingId.value = 'new'; form.value = { title: '', content: '', category: '', tags: '', status: 'published', cover_image: '', password: '', passwordType: '', hadPassword: false, published_at: new Date().toISOString().split('T')[0] }; coverPreview.value = ''; };
        const cancelNewPost = async () => { const { confirmed } = await showConfirm('确认取消', '未保存的内容将丢失'); if (confirmed) { editingId.value = null; } };
        const toggleEdit = async (p) => { if (editingId.value === p.id) { editingId.value = null; return; } try { const r = await api('/api/admin/post?id=' + p.id); const post = r.data; editingId.value = p.id; form.value = { title: post.title, content: post.content, category: post.category, tags: post.tags, status: post.status, cover_image: post.cover_image || '', password: '', passwordType: post.has_password ? 'has' : '', hadPassword: !!post.has_password, published_at: post.published_at ? post.published_at.split('T')[0] : new Date().toISOString().split('T')[0] }; coverPreview.value = post.cover_image || ''; } catch (e) { showToast('加载文章失败'); } };
        const savePost = async () => { if (form.value.passwordType === 'has' && !form.value.password && !form.value.hadPassword) { alert('请输入文章密码'); return; } const { confirmed } = await showConfirm('确认保存', '确定保存？'); if (!confirmed) return; try { const postData = { ...form.value }; if (postData.passwordType !== 'has') { postData.password = ''; } else if (!postData.password) { delete postData.password; } delete postData.passwordType; delete postData.hadPassword; if (editingId.value === 'new') { await api('/api/admin/post', { method: 'POST', data: postData }); } else { await api('/api/admin/post?id=' + editingId.value, { method: 'PUT', data: postData }); } editingId.value = null; loadPosts(); showToast('保存成功'); } catch (e) { alert('保存失败'); } };
        const deletePost = async (id) => { const { confirmed } = await showConfirm('确认删除', '移到回收站？'); if (!confirmed) return; try { await api('/api/admin/post?id=' + id, { method: 'DELETE' }); loadPosts(); loadedResources.delete('trash'); showToast('已移到回收站'); } catch (e) { showToast('删除失败'); } };
        const editCategory = (c) => { editingCategory.value = c.id; categoryForm.value = { name: c.name, slug: c.slug, description: c.description || '' }; };
        const saveCategory = async () => { if (!categoryForm.value.name || !categoryForm.value.slug) { alert('请填写'); return; } const { confirmed } = await showConfirm('确认保存', '确定？'); if (!confirmed) return; try { const d = { ...categoryForm.value }; if (editingCategory.value && editingCategory.value !== 'new') d.id = editingCategory.value; await api('/api/category', { method: 'POST', data: d }); loadCategories(); editingCategory.value = null; categoryForm.value = { name: '', slug: '', description: '' }; showToast('保存成功'); } catch (e) { alert('保存失败'); } };
        const deleteCategory = async (id) => { const { confirmed } = await showConfirm('确认删除', '确定？'); if (!confirmed) return; try { await api('/api/category?id=' + id, { method: 'DELETE' }); loadCategories(); showToast('已删除'); } catch (e) { showToast('删除分类失败'); } };
        // 从 settingsForm 中挑选指定字段（各设置页独立保存，不影响其他页字段）
        const pickSettings = (keys) => { const data = {}; keys.forEach(k => { data[k] = settingsForm.value[k]; }); return data; };
        const postSettings = async (data, onSuccess) => { try { const r = await api('/api/settings', { method: 'POST', data: data }); if (r.data && r.data.success) { showToast('保存成功'); if (onSuccess) onSuccess(); } else { alert('保存失败: ' + (r.data ? r.data.error : '未知错误')); } } catch (e) { console.error('保存设置错误:', e); alert('保存失败: ' + (e.response ? e.response.data.error || e.response.statusText : e.message)); } };
        // 网站设置：站点信息 + 内容与安全
        const saveSiteSettings = async () => {
          if (!settingsLoaded.value) return;
          if (settingsForm.value.sitePasswordType === 'has' && !settingsForm.value.site_password && !sitePasswordSet.value) { alert('请输入全站密码'); return; }
          const data = pickSettings(['site_name', 'site_description', 'site_footer', 'copyright_notice', 'iconfont_css', 'custom_js', 'allowed_origins', 'allow_robots', 'enable_compression', 'enable_mcp']);
          if (settingsForm.value.sitePasswordType !== 'has') { data.site_password = ''; } else if (settingsForm.value.site_password) { data.site_password = settingsForm.value.site_password; }
          await postSettings(data, () => { sitePasswordSet.value = settingsForm.value.sitePasswordType === 'has'; settingsForm.value.site_password = ''; syncIconfontAfterSave(); });
        };
        // 个性设置：布局模块 + 个人信息（合并保存）
        const savePersonalSettings = async () => {
          if (!settingsLoaded.value) return;
          if (settingsForm.value.pinnedType === 'has' && !settingsForm.value.pinned_post_id) { alert('请输入置顶文章编号'); return; }
          const data = pickSettings([
            'profile_position', 'enable_tag_cloud', 'enable_post_toc', 'tag_cloud_position', 'ad_position', 'ad_content',
            'site_author', 'site_bio', 'site_created_at', 'links_title', 'site_links'
          ]);
          data.pinned_post_id = settingsForm.value.pinnedType === 'has' ? settingsForm.value.pinned_post_id : '';
          await postSettings(data, () => { currentPinnedId.value = data.pinned_post_id; });
        };
        const handleCoverChange = async (e) => { const f = e.target.files[0]; if (f) await uploadFile(f); };
        const handleCoverDrop = async (e) => { const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) await uploadFile(f); };
        const uploadFile = async (f) => { if (f.size > 2097152) { alert('文件大小不能超过 2MB'); return; } const fd = new FormData(); fd.append('file', f); const r = await fetch('/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }, body: fd }); const d = await r.json(); if (d.url) { form.value.cover_image = d.url; coverPreview.value = d.url; } else { alert(d.error || '上传失败'); } };
        const deleteCover = async () => {
          const imageUrl = form.value.cover_image;
          if (!imageUrl) return;
          
          const { confirmed, checkboxValue } = await showConfirm(
            '删除封面图片',
            '确定要删除封面图片吗？',
            { checkbox: true, checkboxLabel: '同时删除存储桶中的图片资源', checkboxDefault: true }
          );
          
          if (!confirmed) return;
          
          if (checkboxValue && imageUrl.startsWith('/images/')) {
            try {
              await api('/api/delete-image', { method: 'POST', data: { url: imageUrl } });
              showToast('图片已从存储桶删除');
            } catch (e) {
              showToast('删除存储桶图片失败');
            }
          }
          
          form.value.cover_image = '';
          coverPreview.value = '';
        };
        // ===== 图片管理 / 插入图片（R2 图片库）=====
        const images = ref([]);
        const r2Configured = ref(true);
        const imagesLoaded = ref(false);
        const imagesLoadError = ref('');
        const imagesCursor = ref('');
        const imagesHasMore = ref(false);
        const showImagePicker = ref(false);
        const selectedImage = ref(null);
        const pickUploading = ref(false);
        const locationOrigin = location.origin;
        const imageSizes = ref({});

        const captureImageSize = (e, key) => {
          const el = e && e.target;
          if (!el || !key) return;
          const w = el.naturalWidth;
          const h = el.naturalHeight;
          if (w && h) imageSizes.value[key] = [w, h];
        };

        const loadImages = async () => {
          try {
            const r = await api('/api/admin/images?limit=24');
            images.value = r.data.images || [];
            imagesCursor.value = r.data.cursor || '';
            imagesHasMore.value = !!r.data.hasMore;
            r2Configured.value = r.data.configured !== false;
            imagesLoadError.value = r.data.error || '';
          } catch (e) {
            imagesLoadError.value = (e.response && e.response.data && e.response.data.error) ? e.response.data.error : '加载失败';
            return false;
          } finally {
            imagesLoaded.value = true;
          }
        };

        const loadMoreImages = async () => {
          if (!imagesHasMore.value || !imagesCursor.value) return;
          try {
            const r = await api('/api/admin/images?limit=24&cursor=' + encodeURIComponent(imagesCursor.value));
            images.value = images.value.concat(r.data.images || []);
            imagesCursor.value = r.data.cursor || '';
            imagesHasMore.value = !!r.data.hasMore;
          } catch (e) {
            showToast('加载更多失败');
          }
        };

        const handleImageUpload = async (e) => {
          const f = e.target.files && e.target.files[0];
          e.target.value = ''; // 允许重复选择同一文件
          if (!f) return;
          if (!f.type.startsWith('image/')) { alert('请选择图片文件'); return; }
          if (f.size > 2097152) { alert('文件大小不能超过 2MB'); return; }
          pickUploading.value = true;
          try {
            const fd = new FormData();
            fd.append('file', f);
            const res = await fetch('/api/upload', { method: 'POST', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }, body: fd });
            if (!res.ok) { const d = await res.json().catch(() => null); throw new Error((d && d.error) || '上传失败'); }
            const d = await res.json();
            if (d.url) {
              await loadImages();
              const uploaded = images.value.find(i => i.url === d.url);
              if (uploaded && showImagePicker.value) selectedImage.value = uploaded;
              showToast('上传成功，可在图片管理中查看');
            } else {
              throw new Error(d.error || '上传失败');
            }
          } catch (err) {
            alert(err && err.message ? err.message : '上传失败');
          } finally {
            pickUploading.value = false;
          }
        };

        const openImagePicker = async () => {
          showImagePicker.value = true;
          selectedImage.value = null;
          await ensureResource('images', loadImages).catch(() => {});
        };

        const insertPickedImage = () => {
          if (!selectedImage.value) return;
          const md = '![图片](' + locationOrigin + selectedImage.value.url + ')';
          const ta = document.querySelector('textarea:focus') || document.querySelector('textarea');
          if (ta) {
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            const text = form.value.content || '';
            form.value.content = text.substring(0, start) + md + text.substring(end);
            setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + md.length; }, 0);
          } else {
            form.value.content = (form.value.content || '') + md;
          }
          showImagePicker.value = false;
          showToast('已插入');
        };

        const copyImageLink = async (img) => {
          const url = locationOrigin + img.url;
          try {
            await navigator.clipboard.writeText(url);
            showToast('链接已复制');
          } catch (err) {
            showToast(url);
          }
        };

        const deleteImage = async (img) => {
          const { confirmed } = await showConfirm('确认删除', '确定删除图片「' + img.key + '」？引用该图片的文章将无法显示此图。');
          if (!confirmed) return;
          try {
            await api('/api/admin/images?key=' + encodeURIComponent(img.key), { method: 'DELETE' });
            images.value = images.value.filter(i => i.key !== img.key);
            if (selectedImage.value && selectedImage.value.key === img.key) selectedImage.value = null;
            showToast('已删除');
          } catch (e) {
            showToast('删除失败: ' + ((e.response && e.response.data && e.response.data.error) || ''));
          }
        };

        const restorePost = async (id) => { const { confirmed } = await showConfirm('确认恢复', '将文章恢复为草稿？'); if (!confirmed) return; try { await api('/api/admin/restore', { method: 'POST', data: { id } }); loadedResources.delete('posts'); loadTrash(); showToast('已恢复'); } catch (e) { showToast('恢复失败'); } };
        const permanentDelete = async (id) => { const { confirmed } = await showConfirm('确认删除', '彻底删除？不可恢复！'); if (!confirmed) return; try { await api('/api/admin/permanent-delete', { method: 'POST', data: { id } }); loadTrash(); showToast('已删除'); } catch (e) { showToast('删除失败'); } };

        // ===== MCP / Agent 密钥管理 =====
        const agentKeys = ref([]);
        const agentKeyForm = ref({ name: '', read: true, write: true });
        const mcpAddress = location.origin + '/mcp';

        const loadAgentKeys = async () => {
          try { const r = await api('/api/admin/agent-keys'); agentKeys.value = r.data || []; }
          catch (e) { showToast('加载密钥失败'); return false; }
        };
        const maskKey = (k) => k ? (k.slice(0, 3) + '••••••••••••' + k.slice(-4)) : '';
        const copyText = async (text, label) => {
          try { await navigator.clipboard.writeText(text); showToast((label || '内容') + '已复制'); }
          catch (e) { showToast(text); }
        };
        const generateAgentKey = async () => {
          const perms = [];
          if (agentKeyForm.value.read) perms.push('read');
          if (agentKeyForm.value.write) perms.push('write');
          if (perms.length === 0) { alert('请至少勾选一项权限（读/写）'); return; }
          try {
            const r = await api('/api/admin/agent-keys', { method: 'POST', data: { name: agentKeyForm.value.name, permissions: perms } });
            if (r.data && r.data.success) { await loadAgentKeys(); agentKeyForm.value.name = ''; showToast('密钥已生成'); }
            else alert((r.data && r.data.error) || '生成失败');
          } catch (e) { alert((e.response && e.response.data && e.response.data.error) || '生成失败'); }
        };
        const resetAgentKey = async (k) => {
          const { confirmed } = await showConfirm('确认重置', '重置后旧密钥将立即失效，确定？');
          if (!confirmed) return;
          try { await api('/api/admin/agent-keys/reset', { method: 'POST', data: { id: k.id } }); await loadAgentKeys(); showToast('已重置'); }
          catch (e) { showToast('重置失败'); }
        };
        const revokeAgentKey = async (k) => {
          const { confirmed } = await showConfirm('确认吊销', '吊销后该密钥立即失效，且不可恢复，确定？');
          if (!confirmed) return;
          try { await api('/api/admin/agent-keys?id=' + k.id, { method: 'DELETE' }); await loadAgentKeys(); showToast('已吊销'); }
          catch (e) { showToast('吊销失败'); }
        };

        
        const insertMd = (type) => {
          const ta = document.querySelector('textarea:focus') || document.querySelector('textarea');
          if (!ta) return;
          const start = ta.selectionStart;
          const end = ta.selectionEnd;
          const text = form.value.content || '';
          const selected = text.substring(start, end);
          let insert = '';
          switch(type) {
            case 'heading': insert = '## ' + (selected || '标题'); break;
            case 'bold': insert = '**' + (selected || '加粗') + '**'; break;
            case 'italic': insert = '*' + (selected || '斜体') + '*'; break;
            case 'link': insert = '[' + (selected || '链接') + '](https://)'; break;
            case 'image': insert = '![' + (selected || '图片') + '](https://)'; break;
            case 'code': var hasNL = selected.indexOf(String.fromCharCode(10)) >= 0; var cb = String.fromCharCode(96)+String.fromCharCode(96)+String.fromCharCode(96); insert = hasNL ? cb + String.fromCharCode(10) + (selected || '代码') + String.fromCharCode(10) + cb : String.fromCharCode(96) + (selected || '代码') + String.fromCharCode(96); break;
            case 'ul': insert = '- ' + (selected || '列表项'); break;
            case 'ol': insert = '1. ' + (selected || '列表项'); break;
            case 'quote': insert = '> ' + (selected || '引用'); break;
            case 'hr': insert = String.fromCharCode(10) + '---' + String.fromCharCode(10); break;
            case 'details': insert = String.fromCharCode(10) + '<details>' + String.fromCharCode(10) + '<summary>' + (selected || '折叠标题') + '</summary>' + String.fromCharCode(10) + String.fromCharCode(10) + '折叠内容' + String.fromCharCode(10) + String.fromCharCode(10) + '</details>' + String.fromCharCode(10); break;
          }
          form.value.content = text.substring(0, start) + insert + text.substring(end);
          setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + insert.length; }, 0);
        };

        // 表情包功能
        const loadEmojiOnInit = async () => {
          if (settingsForm.value.iconfont_css && !emojiLoading.value && loadedIconfontUrl.value !== settingsForm.value.iconfont_css) {
            await loadIconList();
          }
        };
        // 保存设置后同步表情包资源（链接变更时自动重载，无需手动刷新页面）
        const syncIconfontAfterSave = () => {
          const cssUrl = settingsForm.value.iconfont_css;
          if (!cssUrl) { iconList.value = []; loadedIconfontUrl.value = ''; return; }
          if (cssUrl !== loadedIconfontUrl.value) { loadIconList(); }
        };
        const loadIconList = async () => {
          emojiLoading.value = true;
          try {
            const cssUrl = settingsForm.value.iconfont_css;
            if (!cssUrl) { emojiLoading.value = false; return; }
            const url = cssUrl.startsWith('//') ? 'https:' + cssUrl : cssUrl;
            // .js 为 Symbol（多色 SVG）模式，.css 为 Font class（单色字体）模式
            const isSymbol = url.split('?')[0].endsWith('.js');
            // 清理旧链接注入的资源（Symbol 模式还需移除已插入的 SVG 雪碧图，避免旧图标 id 冲突）
            document.querySelectorAll('[data-iconfont-res]').forEach(el => {
              const res = el.tagName === 'SCRIPT' ? el.src : el.href;
              if (res !== url) {
                if (el.tagName === 'SCRIPT') {
                  document.querySelectorAll('body > svg[aria-hidden="true"]').forEach(s => { if (s.style.width === '0px' || s.getAttribute('width') === '0') s.remove(); });
                }
                el.remove();
              }
            });
            // 动态注入 iconfont 资源
            if (isSymbol) {
              if (!document.querySelector('script[src="' + url + '"]')) {
                const script = document.createElement('script');
                script.src = url;
                script.setAttribute('data-iconfont-res', '1');
                document.head.appendChild(script);
              }
            } else if (!document.querySelector('link[href="' + url + '"]')) {
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = url;
              link.setAttribute('data-iconfont-res', '1');
              document.head.appendChild(link);
            }
            // 通过后端代理获取资源内容（解决跨域问题）
            const proxyUrl = '/api/proxy-css?url=' + encodeURIComponent(cssUrl);
            console.log('[表情包] 请求代理:', proxyUrl, '模式:', isSymbol ? 'Symbol' : 'Font class');
            const resp = await fetch(proxyUrl);
            console.log('[表情包] 响应状态:', resp.status, resp.statusText);
            const resText = await resp.text();
            console.log('[表情包] 内容长度:', resText.length, '前100字符:', resText.substring(0, 100));
            const icons = [];
            const seen = new Set();
            let match;
            if (isSymbol) {
              // Symbol 模式：从 JS 中解析 <symbol id="icon-xxx"> 定义
              const regex = /<symbol[^>]*?id="((?:icon|iconfont)[a-zA-Z0-9_-]*)"/g;
              while ((match = regex.exec(resText)) !== null) {
                if (match[1] && !seen.has(match[1])) { seen.add(match[1]); icons.push({ type: 'svg', cls: match[1] }); }
              }
            } else {
              // Font class 模式：匹配 .icon-xxx:before 格式（iconfont 官方格式）
              const regex = /\\.((?:icon|iconfont)[a-zA-Z0-9_-]*?)\\s*:\\s*before\\s*\\{/g;
              while ((match = regex.exec(resText)) !== null) {
                if (match[1] && !seen.has(match[1])) { seen.add(match[1]); icons.push({ type: 'font', cls: 'iconfont ' + match[1] }); }
              }
            }
            console.log('[表情包] 找到图标数量:', icons.length, icons.slice(0, 3));
            iconList.value = icons;
            loadedIconfontUrl.value = cssUrl;
          } catch (e) {
            console.error('[表情包] 加载失败:', e);
            iconList.value = [];
          } finally {
            emojiLoading.value = false;
          }
        };
        const insertEmoji = (icon) => {
          const ta = document.querySelector('textarea:focus') || document.querySelector('textarea');
          if (!ta) return;
          const start = ta.selectionStart;
          const end = ta.selectionEnd;
          const text = form.value.content || '';
          const insert = icon.type === 'svg'
            ? '<svg class="icon" aria-hidden="true"><use xlink:href="#' + icon.cls + '"></use></svg>'
            : '<i class="' + icon.cls + '"></i>';
          form.value.content = text.substring(0, start) + insert + text.substring(end);
          setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = start + insert.length; }, 0);
        };

        // 与前台共用主题注册表；新增主题只需在 src/themes/ 注册。
        const themes = ${themeConfig};
        const descriptions = { 'animal-forest':'柔和的森林配色，圆润卡片与侧栏布局。', 'ocean-breeze':'清爽海蓝色调，适合日常记录与技术分享。', 'simple':'轻量留白布局，用内容呈现最纯粹的阅读体验。', 'diy-themes':'调整字体与颜色，打造自己的博客外观。' };
        const themeOptions = Object.entries(themes).map(([value, theme]) => ({ value, name:theme.name, layout:theme.layout || 'classic', description:descriptions[value] || '自定义博客外观' }));
        const diyLabels = { fontFamily:'字体族', fontUrl:'字体 CSS 地址', headerBg:'页头背景', sidebarBg:'侧栏背景', btnBg:'按钮颜色', btnShadow:'按钮阴影', dangerBg:'警示颜色', dangerShadow:'警示阴影', cardBg:'卡片背景', cardBorder:'卡片边框', bodyBg:'页面背景', textPrimary:'标题文字', textBody:'正文文字', textSecondary:'次要文字', inputBorder:'输入框边框', inputShadow:'输入框阴影' };
        const diyFields = ${diyFields}.map(key => ({ key, label:diyLabels[key] || key, placeholder:themes['diy-themes'][key] }));
        const diyTheme = ref(Object.fromEntries(diyFields.map(({ key }) => [key, themes['diy-themes'][key]])));
        const savedTheme = ref('animal-forest');
        const themeDraft = ref('animal-forest');
        const savedDiyTheme = ref({ ...diyTheme.value });
        const themeSaving = ref(false);
        const diyDirty = computed(() => diyFields.some(({ key }) => diyTheme.value[key] !== savedDiyTheme.value[key]));
        const thumbnailStyle = (name) => {
          const theme = name === 'diy-themes' ? { ...themes[name], ...diyTheme.value } : themes[name];
          return { '--thumb-bg':theme.bodyBg, '--thumb-header':theme.headerBg, '--thumb-card':theme.cardBg, '--thumb-border':theme.cardBorder, '--thumb-text':theme.textPrimary, '--thumb-accent':theme.btnBg };
        };
        const resetThemeDraft = () => { diyTheme.value = { ...savedDiyTheme.value }; };
        const applyBlogTheme = async (name) => {
          if (themeSaving.value || !settingsLoaded.value) return;
          themeDraft.value = name;
          const data = { site_theme:name };
          if (name === 'diy-themes') data.diy_theme = JSON.stringify(Object.fromEntries(diyFields.map(({ key }) => [key,diyTheme.value[key]])));
          themeSaving.value = true;
          try { await postSettings(data, () => { savedTheme.value = name; settingsForm.value.site_theme = name; if (name === 'diy-themes') savedDiyTheme.value = JSON.parse(data.diy_theme); }); }
          finally { themeSaving.value = false; }
        };
        const previewOpen = ref(false);
        const previewHtml = ref('');
        const previewLoading = ref(false);
        const previewError = ref('');
        const previewTheme = ref('');
        const previewWidth = ref('desktop');
        const previewDialog = ref(null);
        const previewName = computed(() => themes[previewTheme.value]?.name || '主题');
        let previewRequest = 0;
        let previewController;
        let previewTrigger;
        const closeThemePreview = () => {
          ++previewRequest; previewController?.abort(); previewController = null;
          previewOpen.value = false; previewHtml.value = ''; previewError.value = ''; previewLoading.value = false;
          document.body.style.overflow = '';
          nextTick(() => previewTrigger?.focus());
        };
        const openThemePreview = async (name) => {
          if (!previewOpen.value) previewTrigger = document.activeElement;
          previewController?.abort();
          const controller = new AbortController(); previewController = controller;
          const request = ++previewRequest;
          previewTheme.value = name; previewOpen.value = true; previewHtml.value = ''; previewError.value = ''; previewLoading.value = true;
          document.body.style.overflow = 'hidden';
          nextTick(() => previewDialog.value?.focus());
          try {
            const r = await api('/api/admin/theme-preview', { method:'POST', data:{ site_theme:name, diy_theme:name === 'diy-themes' ? { ...diyTheme.value } : {} }, responseType:'text', signal:controller.signal });
            if (request === previewRequest && previewOpen.value) previewHtml.value = r.data;
          } catch (e) {
            if (request !== previewRequest || controller.signal.aborted) return;
            let message = '预览加载失败，请重试。';
            try { const error = typeof e.response?.data === 'string' ? JSON.parse(e.response.data) : e.response?.data; if (error?.error) message = error.error; } catch {}
            previewError.value = message;
          } finally { if (request === previewRequest) previewLoading.value = false; }
        };

        const applyCopyrightTemplate = () => {
          settingsForm.value.copyright_notice = '<div style="text-align:center;line-height:2">版权归属：@' + (settingsForm.value.site_author || '作者') + '<br>文章来自：{{article_url}}<br>发布日期：{{publish_date}}</div>';
        };

        const applyFooterTemplate = () => {
          settingsForm.value.site_footer = '© ' + new Date().getFullYear() + ' ' + (settingsForm.value.site_name || '我的博客') + ' | 已运行 {{days_running}} 天 | 建站于 {{site_created_at}}';
        };

        // 自定义下拉组件
        const customSelects = ref({});
        
        const toggleSelect = (id) => {
          Object.keys(customSelects.value).forEach(key => {
            if (key !== id) customSelects.value[key] = false;
          });
          customSelects.value[id] = !customSelects.value[id];
        };
        
        const selectOption = (id, value, field) => {
          if (field === 'category') form.value.category = value;
          else if (field === 'status') form.value.status = value;
          customSelects.value[id] = false;
        };
        
        const closeAllSelects = () => {
          Object.keys(customSelects.value).forEach(key => {
            customSelects.value[key] = false;
          });
        };

        // 导入相关方法
        const handleImportFile = async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          if (!file.name.endsWith('.xml')) {
            alert('请选择 XML 文件');
            return;
          }
          importFileName.value = file.name;
          importFileData.value = await file.text();
          importResult.value = null;
        };

        const importPosts = async () => {
          if (!importFileData.value) {
            alert('请先选择文件');
            return;
          }
          importing.value = true;
          try {
            const r = await api('/api/admin/import-wordpress', {
              method: 'POST',
              data: { xml: importFileData.value },
              headers: { 'Content-Type': 'application/json' }
            });
            importResult.value = r.data;
            loadPosts();
            loadCategories();
            if (r.data.failed === 0) {
              showToast('导入完成');
            }
          } catch (e) {
            alert('导入失败: ' + (e.response ? e.response.data.error : e.message));
          } finally {
            importing.value = false;
          }
        };

        watch(currentPage, (page) => { localStorage.setItem('adminPage', page); if (logged.value) loadPage(page); }, { flush:'sync' });
        watch(editingId, (id) => { if (id) ensureResource('settings', loadSettings).then(loadEmojiOnInit).catch(() => {}); });
        onMounted(() => { check(); document.addEventListener('click', closeAllSelects); colorScheme.addEventListener('change', followSystemColor); });
        onUnmounted(() => { closeThemePreview(); document.removeEventListener('click', closeAllSelects); colorScheme.removeEventListener('change', followSystemColor); });
        return { navigation, pageTitle, navigate, sidebarOpen, colorMode, toggleColorMode, loggingIn, pageLoading, pageLoadError, loadPage, settingsLoaded, savedTheme, themeDraft, themeSaving, diyDirty, thumbnailStyle, resetThemeDraft, applyBlogTheme, previewOpen, previewLoading, previewError, previewHtml, previewTheme, previewName, previewWidth, previewDialog, openThemePreview, closeThemePreview, logged, username, password, login, logout, posts, categoryCounts, editingId, form, coverPreview, toast, openAdd, cancelNewPost, toggleEdit, handleCoverChange, handleCoverDrop, deleteCover, savePost, deletePost, categories, currentPage, postPage, postPageSize, postTotal, loadPosts, categoryForm, saveCategory, deleteCategory, editCategory, editingCategory, settingsForm, saveSiteSettings, savePersonalSettings, themeOptions, diyFields, diyTheme, sitePasswordSet, trashPosts, restorePost, permanentDelete, confirmModal, showConfirm, insertMd, applyCopyrightTemplate, applyFooterTemplate, customSelects, toggleSelect, selectOption, showImportModal, importFileName, importFileData, importing, importResult, handleImportFile, importPosts, currentPinnedId, iconList, emojiLoading, insertEmoji, images, r2Configured, imagesLoaded, imagesLoadError, imagesCursor, imagesHasMore, showImagePicker, selectedImage, pickUploading, locationOrigin, imageSizes, captureImageSize, loadImages, loadMoreImages, handleImageUpload, openImagePicker, insertPickedImage, copyImageLink, deleteImage, agentKeys, agentKeyForm, mcpAddress, loadAgentKeys, maskKey, copyText, generateAgentKey, resetAgentKey, revokeAgentKey };
      }
    }).mount('#app');
    });
  <\/script>
</body>
</html>`;
}
