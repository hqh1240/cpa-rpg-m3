function cell(ctx, x, y, u, v, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(1, Math.round(u)), Math.max(1, Math.round(v)));
}

const CHARACTER_PALETTES = {
  bookkeeper: { hair: "#5a3820", skin: "#e8bd8d", shirt: "#c9862e", pants: "#4e5d78", weapon: "#d4a017", accent: "#f2d175" },
  auditor: { hair: "#2b3045", skin: "#e8bd8d", shirt: "#4169e1", pants: "#2b3045", weapon: "#b8c4d8", accent: "#87ceeb" },
  finance: { hair: "#245228", skin: "#e8bd8d", shirt: "#2e8b57", pants: "#1a3f28", weapon: "#c0c0c0", accent: "#9bc86f" },
  tax: { hair: "#7a3218", skin: "#e8bd8d", shirt: "#e4572e", pants: "#4a2a1a", weapon: "#f2c14e", accent: "#ffb56b" },
  law: { hair: "#4b2d18", skin: "#e8bd8d", shirt: "#6b5b95", pants: "#3a2a3a", weapon: "#d8c8e8", accent: "#f2c95f" },
  strategy: { hair: "#173a5c", skin: "#e8bd8d", shirt: "#3a8fb7", pants: "#1d3557", weapon: "#8fd3f2", accent: "#ffd166" }
};

const NPC_JOB_MAP = {
  npc_xiaofen: "bookkeeper",
  npc_shenming: "auditor",
  npc_old: "law"
};

function drawCpaCharacter(ctx, job, x, y, w, h) {
  const cw = 16;
  const ch = 24;
  const u = w / cw;
  const v = h / ch;
  const p = CHARACTER_PALETTES[job] || CHARACTER_PALETTES.bookkeeper;

  // shadow
  cell(ctx, x + 2 * u, y + 21 * v, 12 * u, 2 * v, "rgba(30,20,10,0.18)");

  // legs
  cell(ctx, x + 5 * u, y + 16 * v, 2 * u, 6 * v, p.pants);
  cell(ctx, x + 9 * u, y + 16 * v, 2 * u, 6 * v, p.pants);
  cell(ctx, x + 4 * u, y + 21 * v, 2 * u, 2 * v, "#2e2118");
  cell(ctx, x + 10 * u, y + 21 * v, 2 * u, 2 * v, "#2e2118");

  // body
  cell(ctx, x + 4 * u, y + 10 * v, 8 * u, 7 * v, p.shirt);
  cell(ctx, x + 3 * u, y + 12 * v, 2 * u, 5 * v, p.shirt);
  cell(ctx, x + 11 * u, y + 12 * v, 2 * u, 5 * v, p.shirt);
  cell(ctx, x + 5 * u, y + 11 * v, 6 * u, 2 * v, p.accent);

  // head
  cell(ctx, x + 5 * u, y + 4 * v, 6 * u, 6 * v, p.skin);
  cell(ctx, x + 5 * u, y + 3 * v, 6 * u, 2 * v, p.hair);
  cell(ctx, x + 4 * u, y + 4 * v, 2 * u, 3 * v, p.hair);
  cell(ctx, x + 10 * u, y + 4 * v, 2 * u, 3 * v, p.hair);
  cell(ctx, x + 6 * u, y + 6 * v, 1 * u, 1 * v, "#2e2118");
  cell(ctx, x + 9 * u, y + 6 * v, 1 * u, 1 * v, "#2e2118");

  // job decorations
  if (job === "bookkeeper") {
    cell(ctx, x + 12 * u, y + 9 * v, 2 * u, 2 * v, p.weapon);
    cell(ctx, x + 13 * u, y + 7 * v, 1 * u, 2 * v, p.accent);
    cell(ctx, x + 5 * u, y + 13 * v, 3 * u, 3 * v, "#6d4327");
  } else if (job === "auditor") {
    cell(ctx, x + 4 * u, y + 2 * v, 8 * u, 2 * v, p.weapon);
    cell(ctx, x + 11 * u, y + 8 * v, 2 * u, 5 * v, p.weapon);
    cell(ctx, x + 12 * u, y + 6 * v, 2 * u, 2 * v, p.accent);
  } else if (job === "finance") {
    cell(ctx, x + 4 * u, y + 3 * v, 8 * u, 3 * v, "#245228");
    cell(ctx, x + 11 * u, y + 10 * v, 1 * u, 6 * v, p.weapon);
    cell(ctx, x + 3 * u, y + 10 * v, 1 * u, 6 * v, p.weapon);
  } else if (job === "tax") {
    cell(ctx, x + 4 * u, y + 3 * v, 8 * u, 2 * v, p.weapon);
    cell(ctx, x + 12 * u, y + 9 * v, 1 * u, 6 * v, "#5c3a1e");
    cell(ctx, x + 12 * u, y + 8 * v, 3 * u, 1 * v, p.accent);
  } else if (job === "law") {
    cell(ctx, x + 3 * u, y + 8 * v, 10 * u, 10 * v, p.shirt);
    cell(ctx, x + 6 * u, y + 12 * v, 4 * u, 5 * v, p.weapon);
    cell(ctx, x + 5 * u, y + 5 * v, 3 * u, 3 * v, p.accent);
  } else if (job === "strategy") {
    cell(ctx, x + 3 * u, y + 10 * v, 3 * u, 9 * v, p.shirt);
    cell(ctx, x + 10 * u, y + 8 * v, 2 * u, 2 * v, p.weapon);
    cell(ctx, x + 9 * u, y + 9 * v, 4 * u, 4 * v, p.accent);
    cell(ctx, x + 10 * u, y + 10 * v, 2 * u, 2 * v, "#173a5c");
  }
}

function drawCpaMonster(ctx, type, x, y, w, h) {
  const cw = type === "boss" ? 24 : 16;
  const ch = type === "boss" ? 24 : 16;
  const u = w / cw;
  const v = h / ch;

  if (type === "paper_crane") {
    cell(ctx, x + 3 * u, y + 7 * v, 10 * u, 8 * v, "#f4dd9f");
    cell(ctx, x + 5 * u, y + 3 * v, 6 * u, 5 * v, "#fff2cf");
    cell(ctx, x + 1 * u, y + 9 * v, 6 * u, 3 * v, "#d7ad6a");
    cell(ctx, x + 9 * u, y + 9 * v, 6 * u, 3 * v, "#d7ad6a");
    cell(ctx, x + 6 * u, y + 5 * v, 1 * u, 1 * v, "#5c3a1e");
    cell(ctx, x + 9 * u, y + 5 * v, 1 * u, 1 * v, "#5c3a1e");
  } else if (type === "ink_blob") {
    cell(ctx, x + 2 * u, y + 8 * v, 12 * u, 7 * v, "#4d4f63");
    cell(ctx, x + 4 * u, y + 5 * v, 8 * u, 6 * v, "#626579");
    cell(ctx, x + 5 * u, y + 8 * v, 2 * u, 2 * v, "#ffffff");
    cell(ctx, x + 9 * u, y + 8 * v, 2 * u, 2 * v, "#ffffff");
    cell(ctx, x + 6 * u, y + 9 * v, 1 * u, 1 * v, "#1d1d2a");
    cell(ctx, x + 10 * u, y + 9 * v, 1 * u, 1 * v, "#1d1d2a");
  } else if (type === "abacus_golem") {
    cell(ctx, x + 2 * u, y + 4 * v, 12 * u, 12 * v, "#8a5a35");
    cell(ctx, x + 4 * u, y + 2 * v, 8 * u, 4 * v, "#6d4327");
    cell(ctx, x + 5 * u, y + 3 * v, 2 * u, 2 * v, "#f2d175");
    cell(ctx, x + 9 * u, y + 3 * v, 2 * u, 2 * v, "#f2d175");
    cell(ctx, x + 5 * u, y + 10 * v, 6 * u, 2 * v, "#6d4327");
    cell(ctx, x + 5 * u, y + 8 * v, 2 * u, 2 * v, "#f2d175");
    cell(ctx, x + 9 * u, y + 8 * v, 2 * u, 2 * v, "#f2d175");
  } else if (type === "trial_ghost") {
    cell(ctx, x + 3 * u, y + 4 * v, 10 * u, 10 * v, "rgba(190,205,240,0.85)");
    cell(ctx, x + 4 * u, y + 3 * v, 8 * u, 4 * v, "rgba(220,230,255,0.9)");
    cell(ctx, x + 5 * u, y + 6 * v, 1 * u, 2 * v, "#2b3045");
    cell(ctx, x + 9 * u, y + 6 * v, 1 * u, 2 * v, "#2b3045");
    cell(ctx, x + 5 * u, y + 12 * v, 6 * u, 1 * v, "#6b7aa8");
    cell(ctx, x + 6 * u, y + 13 * v, 4 * u, 1 * v, "#6b7aa8");
  } else if (type === "equity_knight") {
    cell(ctx, x + 3 * u, y + 2 * v, 10 * u, 8 * v, "#5f6b7a");
    cell(ctx, x + 5 * u, y + 4 * v, 2 * u, 2 * v, "#f2d175");
    cell(ctx, x + 9 * u, y + 4 * v, 2 * u, 2 * v, "#f2d175");
    cell(ctx, x + 4 * u, y + 9 * v, 8 * u, 6 * v, "#6f7d8f");
    cell(ctx, x + 2 * u, y + 10 * v, 4 * u, 6 * v, "#4f5a68");
    cell(ctx, x + 10 * u, y + 10 * v, 4 * u, 6 * v, "#4f5a68");
    cell(ctx, x + 12 * u, y + 5 * v, 2 * u, 9 * v, "#c0a86b");
  } else if (type === "merge_giant") {
    cell(ctx, x + 6 * u, y + 4 * v, 12 * u, 10 * v, "#c9d4a8");
    cell(ctx, x + 3 * u, y + 10 * v, 18 * u, 12 * v, "#8f9f7a");
    cell(ctx, x + 7 * u, y + 6 * v, 3 * u, 3 * v, "#ead59a");
    cell(ctx, x + 14 * u, y + 6 * v, 3 * u, 3 * v, "#ead59a");
    cell(ctx, x + 8 * u, y + 12 * v, 8 * u, 2 * v, "#f2d175");
    cell(ctx, x + 3 * u, y + 18 * v, 5 * u, 5 * v, "#6f7d63");
    cell(ctx, x + 16 * u, y + 18 * v, 5 * u, 5 * v, "#6f7d63");
  }
}
