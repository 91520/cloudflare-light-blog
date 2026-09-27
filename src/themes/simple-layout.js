// Simple 专属页面样式；仅在选择 Simple 时注入，不影响已有主题。
export const simpleBaseCSS = `
  header { background:#fff; color:#333; padding:34px 20px 26px; border-bottom:1px solid #eee; }
  header::after { display:none; }
  header h1 { font-size:1.8em; text-shadow:none; letter-spacing:0; }
  header a { color:#276077; }
  header p { font-size:.95em; color:#777; }
  .simple-header { max-width:1050px; margin:0 auto 16px; }
  .simple-nav { display:flex; justify-content:flex-end; gap:22px; margin-bottom:18px; font-size:.9em; }
  .simple-nav a { color:#555; }
  .simple-nav a:hover { color:#dd3333; }
  .simple-avatar { width:76px; height:76px; object-fit:cover; border-radius:50%; margin-bottom:8px; }
  main { max-width:1180px; gap:36px; margin-top:32px; }
  .profile-card { border:0; border-radius:0; box-shadow:none; padding:12px 0 22px; border-bottom:1px solid #eee; }
  .profile-card .avatar { width:100px; height:100px; border:0; }
  .profile-card .category-list a, .profile-card .link-list a { border:0; border-radius:0; background:transparent; padding:7px 0; }
  .profile-card .category-list a:hover, .profile-card .link-list a:hover { background:transparent; color:#dd3333; }
  .back-to-top, .mobile-nav-toggle { border-radius:4px; box-shadow:none; }
  @media (max-width:768px) { header { padding:22px 56px; } main { margin-top:16px; } }
`;

export const simpleHomeCSS = `
  #app { gap:0; }
  .post-card { border:0; border-bottom:1px solid #eee; border-radius:0; box-shadow:none; padding:22px 0; }
  .post-card:hover { transform:none; box-shadow:none; }
  .post-card .post-cover { width:180px; border-radius:3px; background:#f5f5f5; }
  .post-card .post-content { padding:0 18px; }
  .post-card h2 { font-size:1.45em; }
  .post-card h2 a:hover { color:#dd3333; }
  .post-card a.read-more { padding:0; background:transparent; color:#dd3333; border-radius:0; box-shadow:none; }
  .post-card a.read-more:hover, .post-card a.read-more:active { transform:none; box-shadow:none; text-decoration:underline; }
  @media (max-width:768px) { .post-card { padding:16px 0; } .post-card .post-content { padding:0; } }
`;

export const simplePostCSS = `
  .post-article { border:0; border-radius:0; box-shadow:none; padding:20px 0; }
  .post-article h1 { font-size:2em; }
  .post-article h2 { border-left:0; padding-left:0; }
  .post-toc { border:1px solid #eee; border-radius:4px; }
  .back-link { background:transparent; color:#dd3333; padding:0; border-radius:0; box-shadow:none; }
  .back-link:hover { box-shadow:none; }
  @media (max-width:768px) { .post-article { padding:16px 0; } }
`;
