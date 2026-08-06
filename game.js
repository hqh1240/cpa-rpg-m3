(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const modal = document.getElementById("modal");
  const toast = document.getElementById("toast");
  const tooltip = document.getElementById("tooltip");
  const loadingPanel = document.getElementById("loadingPanel");
  const loadingBar = document.getElementById("loadingBar");
  const loadingHint = document.getElementById("loadingHint");
  let loadedAssets = 0;
  const TOTAL_LOAD_STEPS = 36;
  const hud = document.getElementById("hud");
  const touchControls = document.getElementById("touchControls");
  const W = canvas.width;
  const H = canvas.height;

  const SAVE_KEY = "cpa_rpg_m2_save_v1";
  const GAME_VERSION = "0.9.0";
  const BUILD_LABEL = "M3 Phase 1 · 2026-08-06";

  const assets = {
    scene: null,
    tileset: null,
    tinyTilemap: null,
    formalTileset: null,
    interior: null,
    interiorTileset: null,
    battleBgs: {},
    playerIdle: null,
    playerWalk: null,
    playerSword: null,
    goblinIdle: null,
    goblinAttack: null,
    playerSheets: {},
    monsterSheets: {},
    props: {},
    dust: null
  };

  function todayString() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function weekStartString(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    const offset = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - offset);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function currentWeekKey() {
    return weekStartString(todayString());
  }

  const TASK_DELIVERY = {
    main: "npc_xiaofen",
    defeat3: "npc_xiaofen",
    chest2: "npc_xiaofen",
    defeat_ink: "npc_shenming",
    collect3: "npc_xiaofen",
    talk_old: "npc_old",
    craft_task: "npc_old",
    shop_task: "npc_shenming",
    defeat_crane: "npc_shenming",
    answer10: "npc_xiaofen",
    enhance_task: "npc_old"
  };

  const SCENE_OBSTACLES = [];

  const BATTLE_REGIONS = {
    paper_crane: { id: "accounting", bg: "gold_field", tint: "rgba(212, 160, 23, 0.10)", label: "金算原野" },
    ink_blob: { id: "auditing", bg: "audit_archive", tint: "rgba(65, 105, 225, 0.12)", label: "审计之塔" },
    abacus_golem: { id: "finance", bg: "lake_field", tint: "rgba(46, 139, 87, 0.12)", label: "财务湖畔" },
    merge_giant: { id: "law", bg: "town_court", tint: "rgba(123, 104, 238, 0.16)", label: "经济法庭" },
    trial_ghost: { id: "strategy", bg: "bright_wild", tint: "rgba(135, 206, 235, 0.12)", label: "战略阁" },
    final_boss: { id: "strategy", bg: "bright_wild", tint: "rgba(40, 32, 92, 0.24)", label: "战略星塔 · 终局" }
  };

  const DECOR_TILES = {
    grass: [{ col: 0, row: 0 }, { col: 1, row: 0 }],
    flower: [{ col: 2, row: 0 }, { col: 3, row: 0 }, { col: 9, row: 0 }, { col: 10, row: 0 }, { col: 11, row: 0 }],
    bush: [{ col: 4, row: 0 }, { col: 5, row: 0 }, { col: 6, row: 0 }, { col: 7, row: 0 }, { col: 8, row: 0 }]
  };

  const SYSTEM_UNLOCK_LEVELS = {
    skill: 3,
    shop: 5,
    equip: 5,
    craft: 5,
    enhance: 5,
    partner: 8,
    book: 10,
    challenge: 10
  };

  const ZONE_BOSS_STATE = {
    audit_boss: "auditBossKilled",
    capital_boss: "capitalBossKilled",
    tax_boss: "taxBossKilled",
    law_boss: "lawBossKilled",
    strategy_boss: "strategyBossKilled"
  };

  const ZONE_BOSS_TASK = {
    audit_boss: "audit_boss_task",
    capital_boss: "capital_boss_task",
    tax_boss: "tax_boss_task",
    law_boss: "law_boss_task",
    strategy_boss: "strategy_boss_task"
  };

  const REGION_CLEARED_FLAG = {
    audit_boss: "auditCleared",
    capital_boss: "capitalCleared",
    tax_boss: "taxCleared",
    law_boss: "lawCleared",
    strategy_boss: "strategyCleared"
  };

  const REGION_BOSS_INTRO = {
    audit_boss: { title: "审计铁堡 · 区域决战", text: "凭证巨像把审计证据链搅成乱码。击败它，让审计铁堡的证据秩序恢复。" },
    capital_boss: { title: "资本密林 · 区域决战", text: "估值树王用扭曲的现金流吞噬投资收益。击败它，让资本密林的财务规则重归清晰。" },
    tax_boss: { title: "税率荒原 · 区域决战", text: "税章巨像将申报规则碾成灰烬。击败它，让税率荒原的纳税秩序恢复运转。" },
    law_boss: { title: "法条神殿 · 区域决战", text: "法槌裁决者篡改了关键法条。击败它，让法条神殿的规则重新生效。" },
    strategy_boss: { title: "战略星塔 · 区域决战", text: "并购霸主把战略决策扭曲成无序扩张。击败它，为最终试炼打开通路。" }
  };

  const REGION_TASK_GROUPS = {
    audit_tower: [
      { id: "audit_boss_task", title: "审计铁堡讨伐", desc: "击败区域 Boss 凭证巨像，修复审计证据链", progress: 0, target: 1, done: false, deliverNpc: "audit_npc", reward: { gold: 80, exp: 90, skillPoints: 2 } },
      { id: "audit_quiz_task", title: "审计题解", desc: "答对 3 道审计领域题目", progress: 0, target: 3, done: false, deliverNpc: "audit_npc", reward: { gold: 50, exp: 60, skillPoints: 1 } },
      { id: "audit_rooms_task", title: "证据库巡查", desc: "探索审计铁堡 3 个室内场景", progress: 0, target: 3, done: false, deliverNpc: "audit_npc", reward: { gold: 45, exp: 50, skillPoints: 1 } },
      { id: "audit_monster_task", title: "审计肃清", desc: "击败审计铁堡 2 只普通怪物", progress: 0, target: 2, done: false, deliverNpc: "audit_npc", reward: { gold: 60, exp: 70, skillPoints: 1 } }
    ],
    capital_forest: [
      { id: "capital_boss_task", title: "资本密林讨伐", desc: "击败区域 Boss 估值树王，恢复财务分析秩序", progress: 0, target: 1, done: false, deliverNpc: "capital_npc", reward: { gold: 90, exp: 100, skillPoints: 2 } },
      { id: "capital_quiz_task", title: "财管题解", desc: "答对 3 道财务成本管理题目", progress: 0, target: 3, done: false, deliverNpc: "capital_npc", reward: { gold: 55, exp: 65, skillPoints: 1 } },
      { id: "capital_rooms_task", title: "资本沙盘巡礼", desc: "探索资本密林 3 个室内场景", progress: 0, target: 3, done: false, deliverNpc: "capital_npc", reward: { gold: 50, exp: 55, skillPoints: 1 } },
      { id: "capital_monster_task", title: "资本肃清", desc: "击败资本密林 2 只普通怪物", progress: 0, target: 2, done: false, deliverNpc: "capital_npc", reward: { gold: 65, exp: 75, skillPoints: 1 } }
    ],
    tax_wasteland: [
      { id: "tax_boss_task", title: "税率荒原讨伐", desc: "击败区域 Boss 税章巨像，恢复纳税申报秩序", progress: 0, target: 1, done: false, deliverNpc: "tax_npc", reward: { gold: 100, exp: 110, skillPoints: 2 } },
      { id: "tax_quiz_task", title: "税法题解", desc: "答对 3 道税法领域题目", progress: 0, target: 3, done: false, deliverNpc: "tax_npc", reward: { gold: 60, exp: 70, skillPoints: 1 } },
      { id: "tax_rooms_task", title: "申报厅巡查", desc: "探索税率荒原 3 个室内场景", progress: 0, target: 3, done: false, deliverNpc: "tax_npc", reward: { gold: 55, exp: 60, skillPoints: 1 } },
      { id: "tax_monster_task", title: "税率肃清", desc: "击败税率荒原 2 只普通怪物", progress: 0, target: 2, done: false, deliverNpc: "tax_npc", reward: { gold: 70, exp: 80, skillPoints: 1 } }
    ],
    law_temple: [
      { id: "law_boss_task", title: "法条神殿讨伐", desc: "击败区域 Boss 法槌裁决者，恢复法律规则", progress: 0, target: 1, done: false, deliverNpc: "law_npc", reward: { gold: 110, exp: 120, skillPoints: 2 } },
      { id: "law_quiz_task", title: "经济法题解", desc: "答对 3 道经济法领域题目", progress: 0, target: 3, done: false, deliverNpc: "law_npc", reward: { gold: 65, exp: 75, skillPoints: 1 } },
      { id: "law_rooms_task", title: "法条卷宗巡阅", desc: "探索法条神殿 3 个室内场景", progress: 0, target: 3, done: false, deliverNpc: "law_npc", reward: { gold: 60, exp: 65, skillPoints: 1 } },
      { id: "law_monster_task", title: "法条肃清", desc: "击败法条神殿 2 只普通怪物", progress: 0, target: 2, done: false, deliverNpc: "law_npc", reward: { gold: 75, exp: 85, skillPoints: 1 } }
    ],
    strategy_star: [
      { id: "strategy_boss_task", title: "战略星塔讨伐", desc: "击败区域 Boss 并购霸主，稳固战略决策", progress: 0, target: 1, done: false, deliverNpc: "strategy_npc", reward: { gold: 120, exp: 130, skillPoints: 2 } },
      { id: "strategy_quiz_task", title: "战略题解", desc: "答对 3 道战略与风险管理题目", progress: 0, target: 3, done: false, deliverNpc: "strategy_npc", reward: { gold: 70, exp: 80, skillPoints: 1 } },
      { id: "strategy_rooms_task", title: "战略沙盘巡礼", desc: "探索战略星塔 3 个室内场景", progress: 0, target: 3, done: false, deliverNpc: "strategy_npc", reward: { gold: 65, exp: 70, skillPoints: 1 } },
      { id: "strategy_monster_task", title: "战略肃清", desc: "击败战略星塔 2 只普通怪物", progress: 0, target: 2, done: false, deliverNpc: "strategy_npc", reward: { gold: 80, exp: 90, skillPoints: 1 } }
    ]
  };

  const POINT_QUIZ_TASK = {
    审计证据: "audit_quiz_task",
    审计目标: "audit_quiz_task",
    内部控制: "audit_quiz_task",
    审计意见: "audit_quiz_task",
    货币时间价值: "capital_quiz_task",
    资本成本: "capital_quiz_task",
    财务杠杆: "capital_quiz_task",
    资本预算: "capital_quiz_task",
    增值税: "tax_quiz_task",
    企业所得税: "tax_quiz_task",
    个人所得税: "tax_quiz_task",
    税收优惠: "tax_quiz_task",
    公司法: "law_quiz_task",
    合同法: "law_quiz_task",
    证券法: "law_quiz_task",
    破产法: "law_quiz_task",
    SWOT: "strategy_quiz_task",
    五力模型: "strategy_quiz_task",
    价值链: "strategy_quiz_task",
    并购战略: "strategy_quiz_task"
  };

  const PLAN_SUBJECT_POINTS = {
    会计: ["会计等式", "会计要素", "会计假设", "会计基础", "借贷方向", "科目分类", "试算平衡", "凭证", "账簿", "存货", "固定资产", "无形资产", "投资性房地产", "金融资产", "长期股权投资", "收入", "费用", "成本", "利润", "利润分配", "所有者权益", "报表", "现金流量", "质量要求", "会计主体", "货币计量", "会计分期", "计量属性", "负债", "职工薪酬", "租赁", "资产减值", "所得税", "借款费用", "或有事项", "债务重组", "外币折算", "会计政策", "会计估计", "前期差错", "政府补助", "每股收益", "公允价值", "职业道德", "应收项目", "财产清查", "政府会计", "货币资金"],
    审计: ["审计目标", "审计证据", "内部控制", "审计意见", "审计程序", "审计计划", "审计重要性", "审计风险", "审计抽样", "管理层认定", "舞弊风险"],
    财管: ["货币时间价值", "资本成本", "财务杠杆", "资本预算", "营运资本", "风险与报酬", "经营杠杆", "财务分析", "本量利分析", "股利政策"],
    税法: ["增值税", "消费税", "企业所得税", "个人所得税", "税收优惠", "发票管理", "房产税", "印花税", "土地增值税", "车辆购置税", "契税", "税收征管"],
    经济法: ["公司法", "公司治理", "合同法", "证券法", "破产法", "票据法", "物权法", "反垄断法", "合伙企业法"],
    战略: ["SWOT", "五力模型", "价值链", "并购战略", "公司战略类型", "平衡计分卡", "波士顿矩阵", "风险管理", "风险类型"]
  };

  const ROOM_TASK_MAP = {
    audit_meeting: "audit_rooms_task",
    audit_evidence: "audit_rooms_task",
    audit_chief: "audit_rooms_task",
    capital_cashflow: "capital_rooms_task",
    capital_structure: "capital_rooms_task",
    capital_investment: "capital_rooms_task",
    tax_vat: "tax_rooms_task",
    tax_cit: "tax_rooms_task",
    tax_incentive: "tax_rooms_task",
    law_contract: "law_rooms_task",
    law_securities: "law_rooms_task",
    law_bankruptcy: "law_rooms_task",
    strategy_sandbox: "strategy_rooms_task",
    strategy_five: "strategy_rooms_task",
    strategy_ma: "strategy_rooms_task"
  };

  const ZONE_MONSTER_TASK = {
    audit_monster_1: "audit_monster_task",
    audit_monster_2: "audit_monster_task",
    capital_monster_1: "capital_monster_task",
    capital_monster_2: "capital_monster_task",
    tax_monster_1: "tax_monster_task",
    tax_monster_2: "tax_monster_task",
    law_monster_1: "law_monster_task",
    law_monster_2: "law_monster_task",
    strategy_monster_1: "strategy_monster_task",
    strategy_monster_2: "strategy_monster_task"
  };

  const REGION_NPC_MEMORY = {
    audit_npc: {
      cleared: "auditCleared",
      boss: "auditBossKilled",
      clearedText: "普通怪物已经清除，凭证巨像正在审计铁堡深处现身。",
      bossText: "证据链已经恢复。你在审计领域的判断力，比很多底稿都可靠。",
      finalText: "六域已经平衡。你让每一份凭证都找到了它应有的位置。"
    },
    capital_npc: {
      cleared: "capitalCleared",
      boss: "capitalBossKilled",
      clearedText: "普通怪物已经清除，估值树王正在资本密林深处等你。",
      bossText: "财务分析秩序恢复了。你已经能看穿现金流背后的真实回报。",
      finalText: "六域平衡后，资本密林终于不再吞噬理性投资。"
    },
    tax_npc: {
      cleared: "taxCleared",
      boss: "taxBossKilled",
      clearedText: "普通怪物已经清除，税章巨像正在税率荒原中央凝聚。",
      bossText: "纳税申报秩序恢复了。你把复杂的税法规则重新拉回了正轨。",
      finalText: "六域平衡了，税率荒原的每一张发票都恢复清晰。"
    },
    law_npc: {
      cleared: "lawCleared",
      boss: "lawBossKilled",
      clearedText: "普通怪物已经清除，法槌裁决者正在篡改最后几段法条。",
      bossText: "法条已经恢复效力。你证明规则不是文字，而是秩序。",
      finalText: "六域平衡后，法条神殿的法槌再次敲响。"
    },
    strategy_npc: {
      cleared: "strategyCleared",
      boss: "strategyBossKilled",
      clearedText: "普通怪物已经清除，并购霸主封锁了通往最终试炼的道路。",
      bossText: "战略决策恢复了。并购霸主已经倒下，最终试炼就在前方。",
      finalText: "六域已经重归平衡。你完成了从分录到战略的完整旅程。"
    }
  };

  const MAIN_STORY = {
    1: [
      { speaker: "小分", text: "怪物、宝箱和材料都查过了。天平衡碑上的合并报表巨像已经苏醒，它会把你的答案变成攻击。" },
      { speaker: "老会计", text: "去吧。报表不只是数字，更是六域平衡的根基。" }
    ],
    2: [
      { speaker: "小分", text: "你击败了合并报表巨像！审计铁堡的传送门已经开启，证据链正在等待修复。" }
    ],
    3: [
      { speaker: "审计统领", text: "审计铁堡肃清了。凭证巨像倒下后，资本密林里新的财务异常开始浮出水面。" }
    ],
    4: [
      { speaker: "财管导师", text: "资本密林恢复了。税率荒原的申报秩序正在被税章巨像压垮。" }
    ],
    5: [
      { speaker: "税务官", text: "税率荒原恢复了。法条神殿的规则被法槌裁决者篡改，六域开始失去最后的秩序。" }
    ],
    6: [
      { speaker: "法务官", text: "法条神殿恢复了。战略星塔里的并购霸主封锁了最终试炼的路。" }
    ],
    7: [
      { speaker: "战略官", text: "战略星塔已肃清。小分、审计统领、财管导师、税务官、法务官正在为你送来最后的祝福。" },
      { speaker: "小分", text: "六域的力量已经齐聚，去击败六域失衡之主，让记账大陆重新平衡。" }
    ],
    8: [
      { speaker: "小分", text: "六域重新平衡了！你完成了从第一笔分录到最终战略的全部试炼。" },
      { speaker: "老会计", text: "这就是注会纪元。恭喜你，真正的会计勇者。" }
    ]
  };

  const MAIN_STEP_LABELS = {
    0: "金算原野 · 调查借贷失衡",
    1: "金算原野 · 直面合并报表巨像",
    2: "审计铁堡 · 修复证据链",
    3: "资本密林 · 重铸财务秩序",
    4: "税率荒原 · 恢复申报规则",
    5: "法条神殿 · 重立法典",
    6: "战略星塔 · 肃清并购霸主",
    7: "终局试炼 · 六域失衡之主",
    8: "通关 · 六域平衡"
  };

  const ACHIEVEMENTS = {
    first_battle: { name: "初战告捷", desc: "完成第一场战斗", type: "战斗", reward: { gold: 20 } },
    beat_3: { name: "三连斩", desc: "击败 3 只普通怪物", type: "战斗", reward: { gold: 50 } },
    beat_boss: { name: "天平衡衡", desc: "击败合并报表巨像", type: "战斗", reward: { gold: 100, exp: 100, skillPoints: 2 } },
    answer10: { name: "答题新手", desc: "累计答对 10 道题", type: "学习", reward: { exp: 50 } },
    wrong_zero: { name: "错题清零", desc: "将一道错题复习至掌握", type: "学习", reward: { gold: 30 } },
    collect10: { name: "材料达人", desc: "采集 10 次材料", type: "探索", reward: { gold: 40 } },
    open_chest2: { name: "开箱有喜", desc: "开启 2 个宝箱", type: "探索", reward: { gold: 30 } },
    enhance1: { name: "强化入门", desc: "强化任意装备 1 次", type: "成长", reward: { skillPoints: 1 } },
    all_jobs: { name: "职业收藏家", desc: "解锁全部职业", type: "成长", reward: { gold: 200, skillPoints: 3 } },
    level10: { name: "十级簿记", desc: "角色等级达到 10 级", type: "成长", reward: { gold: 100, exp: 100, skillPoints: 2 } },
    level20: { name: "科目专家", desc: "角色等级达到 20 级", type: "成长", reward: { gold: 200, exp: 200, skillPoints: 3 } },
    level30: { name: "注会贤者", desc: "角色等级达到 30 级", type: "成长", reward: { gold: 400, exp: 400, skillPoints: 4 } },
    kill10: { name: "怪物清道夫", desc: "累计击败 10 只普通怪物", type: "战斗", reward: { gold: 150, exp: 150, skillPoints: 2 } },
    answer50: { name: "百炼成钢", desc: "累计答对 50 道题", type: "学习", reward: { gold: 120, exp: 120, skillPoints: 2 } },
    answer100: { name: "千题不怠", desc: "累计答对 100 道题", type: "学习", reward: { gold: 250, exp: 250, skillPoints: 3 } },
    streak10: { name: "十连学霸", desc: "连续答对 10 道题", type: "学习", reward: { gold: 100, exp: 100, skillPoints: 2 } },
    coverage60: { name: "考纲过半", desc: "考纲覆盖率达到 60%", type: "学习", reward: { gold: 120, exp: 120, skillPoints: 2 } },
    coverage90: { name: "考纲制霸", desc: "考纲覆盖率达到 90%", type: "学习", reward: { gold: 300, exp: 300, skillPoints: 3 } },
    chest10: { name: "宝箱收藏家", desc: "开启 10 个宝箱", type: "探索", reward: { gold: 120, exp: 100, skillPoints: 2 } },
    rooms15: { name: "房间巡礼", desc: "访问 15 个室内场景", type: "探索", reward: { gold: 150, exp: 120, skillPoints: 2 } },
    level25: { name: "领域高手", desc: "角色等级达到 25 级", type: "成长", reward: { gold: 300, exp: 300, skillPoints: 3 } },
    level40: { name: "注会传奇", desc: "角色等级达到 40 级", type: "成长", reward: { gold: 500, exp: 500, skillPoints: 4 } },
    task25: { name: "任务大师", desc: "完成 25 个任务", type: "成长", reward: { gold: 300, exp: 300, skillPoints: 3 } },
    weekly20: { name: "周报常客", desc: "单周完成 20 道题", type: "学习", reward: { gold: 100, exp: 100, skillPoints: 2 } },
    all_zone_bosses: { name: "五域讨伐", desc: "击败审计、财管、税法、经济法和战略区域 Boss", type: "区域", reward: { gold: 300, exp: 300, skillPoints: 3 } },
    final_clear: { name: "六域平衡", desc: "击败六域失衡之主，完成最终试炼", type: "终局", reward: { gold: 500, exp: 500, skillPoints: 5 } }
  };

  const defaultState = () => ({
    screen: "title",
    saveVersion: 3,
    player: {
      x: 440,
      y: 380,
      hp: 90,
      maxHp: 90,
      mp: 50,
      maxMp: 50,
      level: 1,
      exp: 0,
      expNext: 80,
      gold: 40,
      attack: 16,
      defense: 9,
      facing: "down",
      moveTarget: null
    },
    weapon: { id: "pencil_sword", name: "铅笔短剑", atk: 5 },
    armor: { id: "apprentice_robe", name: "学徒布衣", def: 2 },
    equipmentLevels: { weapon: 0, armor: 0 },
    jobs: { current: "accountant", unlocked: ["accountant"] },
    jobStoriesSeen: [],
    partner: { id: "ledger_spirit", name: "记账精灵", hp: 90, maxHp: 90, atk: 8, mood: 60, active: true, level: 1, exp: 0, expNext: 50, skill: "记账祝福" },
    unlockedSkills: ["lending_slash", "trial_balance"],
    skillPoints: 2,
    inventory: { hpPotion: 1, mpPotion: 1, materials: { stone: 0, ink: 0, beads: 0, credential: 0 } },
    reviewMap: {},
    pointProgress: {},
    pointCorrect: {},
    examHistory: [],
    monstersKilled: 0,
    bossKilled: false,
    auditCleared: false,
    capitalCleared: false,
    taxCleared: false,
    lawCleared: false,
    strategyCleared: false,
    gameCompleted: false,
    auditBossKilled: false,
    capitalBossKilled: false,
    taxBossKilled: false,
    lawBossKilled: false,
    strategyBossKilled: false,
    wrongQuestions: [],
    answered: 0,
    correct: 0,
    quizStreak: 0,
    openedChests: [],
    visitedRooms: [],
    questStep: 0,
    mainStep: 0,
    tasks: [
      { id: "main", title: "调查借贷失衡", desc: "击败合并报表巨像，恢复天平衡碑的平衡", progress: 0, target: 1, done: false },
      { id: "defeat3", title: "击败扭曲怪物", desc: "击败 3 只普通怪物", progress: 0, target: 3, done: false },
      { id: "chest2", title: "开启宝箱", desc: "开启 2 个宝箱", progress: 0, target: 2, done: false },
      { id: "defeat_ink", title: "审明的委托", desc: "击败墨渍怪，复习借贷方向", progress: 0, target: 1, done: false },
      { id: "collect3", title: "小分的委托", desc: "采集 3 次地图材料", progress: 0, target: 3, done: false },
      { id: "talk_old", title: "拜访老会计", desc: "与老会计对话，了解六域的历史", progress: 0, target: 1, done: false },
      { id: "craft_task", title: "会计工坊委托", desc: "打造 1 件装备或药水", progress: 0, target: 1, done: false },
      { id: "shop_task", title: "杂货铺采购", desc: "在审明杂货铺购买 1 件商品", progress: 0, target: 1, done: false },
      { id: "defeat_crane", title: "纸鹤调查", desc: "击败凭证纸鹤，检查凭证异常", progress: 0, target: 1, done: false, reward: { gold: 45, exp: 60, skillPoints: 1 } },
      { id: "answer10", title: "答题十连", desc: "累计答对 10 道题", progress: 0, target: 10, done: false, reward: { gold: 80, exp: 120, skillPoints: 2 } },
      { id: "enhance_task", title: "强化委托", desc: "强化任意装备 1 次", progress: 0, target: 1, done: false, reward: { gold: 50, exp: 70, skillPoints: 1 } }
    ],
    soundEnabled: true,
    settings: { shake: true, volume: 0.8, musicEnabled: true, sfxEnabled: true, musicVolume: 0.5, sfxVolume: 0.8 },
    room: null,
    zone: "gold_field",
    achievements: [],
    levelTitles: [],
    collectCount: 0,
    daily: { date: todayString(), answered: 0, target: 5, done: false },
    plan: { enabled: true, dailyTarget: 5, subjects: [] },
    week: { weekStart: currentWeekKey(), answered: 0, correct: 0, subjects: {}, playSeconds: 0 },
    weeklyHistory: [],
    lowQuality: false,
    _unlockAll: false,
    notifiedSystems: []
    });

  let state = loadSave() || defaultState();
  if (state.soundEnabled === undefined) state.soundEnabled = true;
  if (!state.weapon) state.weapon = { id: "pencil_sword", name: "铅笔短剑", atk: 5 };
  if (!state.armor) state.armor = { id: "apprentice_robe", name: "学徒布衣", def: 2 };
  if (!state.equipmentLevels) state.equipmentLevels = { weapon: 0, armor: 0 };
  if (!state.unlockedSkills) state.unlockedSkills = ["lending_slash", "trial_balance", "subject_switch", "entry_combo", "consolidation"];
  if (!state.tasks) state.tasks = defaultState().tasks;
  if (state.skillPoints === undefined) state.skillPoints = 0;
  if (!state.inventory) state.inventory = { hpPotion: 1, mpPotion: 1 };
  if (!state.inventory.materials) state.inventory.materials = { stone: 0, ink: 0, beads: 0, credential: 0 };
  if (!state.jobs) state.jobs = { current: "accountant", unlocked: ["accountant"] };
  if (!state.jobStoriesSeen) state.jobStoriesSeen = [];
  if (!state.partner) state.partner = { id: "ledger_spirit", name: "记账精灵", hp: 90, maxHp: 90, atk: 8, mood: 60, active: true };
  if (!state.partner.level) state.partner.level = 1;
  if (!state.partner.exp) state.partner.exp = 0;
  if (!state.partner.expNext) state.partner.expNext = 50;
  if (!state.partner.skill) state.partner.skill = "记账祝福";
  if (!state.player.facing) state.player.facing = "down";
  if (state.player.moveTarget === undefined) state.player.moveTarget = null;
  if (!state.reviewMap) state.reviewMap = {};
  if (!state.pointProgress) state.pointProgress = {};
  if (!state.pointCorrect) state.pointCorrect = {};
  if (!state.examHistory) state.examHistory = [];
  if (!state.plan) state.plan = { enabled: true, dailyTarget: 5, subjects: [] };
  if (state.plan.enabled === undefined) state.plan.enabled = true;
  if (!state.plan.dailyTarget) state.plan.dailyTarget = 5;
  if (!Array.isArray(state.plan.subjects)) state.plan.subjects = [];
  if (!state.week) state.week = { weekStart: currentWeekKey(), answered: 0, correct: 0, subjects: {}, playSeconds: 0 };
  if (!Array.isArray(state.weeklyHistory)) state.weeklyHistory = [];
  if (state.week.weekStart !== currentWeekKey()) {
    state.weeklyHistory.unshift({ ...state.week });
    state.weeklyHistory = state.weeklyHistory.slice(0, 8);
    state.week = { weekStart: currentWeekKey(), answered: 0, correct: 0, subjects: {}, playSeconds: 0 };
  }
  if (!state.week.subjects) state.week.subjects = {};
  if (!state.daily || state.daily.date !== todayString()) {
    state.daily = { date: todayString(), answered: 0, target: state.plan.dailyTarget || 5, done: false };
  } else {
    state.daily.target = state.plan.dailyTarget || state.daily.target;
  }
  if (!state.settings) state.settings = { shake: true, volume: 0.8, musicEnabled: true, sfxEnabled: true, musicVolume: 0.5, sfxVolume: 0.8 };
  if (state.settings.volume === undefined) state.settings.volume = 0.8;
  if (state.settings.musicEnabled === undefined) state.settings.musicEnabled = true;
  if (state.settings.sfxEnabled === undefined) state.settings.sfxEnabled = true;
  if (state.settings.musicVolume === undefined) state.settings.musicVolume = 0.5;
  if (state.settings.sfxVolume === undefined) state.settings.sfxVolume = 0.8;
  if (state._unlockAll === undefined) state._unlockAll = false;
  if (!Array.isArray(state.notifiedSystems)) state.notifiedSystems = [];
  if (state.saveVersion === undefined) state.saveVersion = 3;
  if (state.lowQuality === undefined) {
    state.lowQuality = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  }
  if (!state.room) state.room = null;
  if (!state.zone) state.zone = "gold_field";
  if (state.auditCleared === undefined) state.auditCleared = false;
  if (state.capitalCleared === undefined) state.capitalCleared = false;
  if (state.taxCleared === undefined) state.taxCleared = false;
  if (state.lawCleared === undefined) state.lawCleared = false;
  if (state.strategyCleared === undefined) state.strategyCleared = false;
  if (state.gameCompleted === undefined) state.gameCompleted = false;
  if (state.auditBossKilled === undefined) state.auditBossKilled = false;
  if (state.capitalBossKilled === undefined) state.capitalBossKilled = false;
  if (state.taxBossKilled === undefined) state.taxBossKilled = false;
  if (state.lawBossKilled === undefined) state.lawBossKilled = false;
  if (state.strategyBossKilled === undefined) state.strategyBossKilled = false;
  if (
    state.auditCleared === false &&
    Array.isArray(state.monstersKilledIds) &&
    state.monstersKilledIds.includes("audit_monster_1") &&
    state.monstersKilledIds.includes("audit_monster_2")
  ) {
    state.auditCleared = true;
  }
  if (
    state.capitalCleared === false &&
    Array.isArray(state.monstersKilledIds) &&
    state.monstersKilledIds.includes("capital_monster_1") &&
    state.monstersKilledIds.includes("capital_monster_2")
  ) {
    state.capitalCleared = true;
  }
  if (
    state.taxCleared === false &&
    Array.isArray(state.monstersKilledIds) &&
    state.monstersKilledIds.includes("tax_monster_1") &&
    state.monstersKilledIds.includes("tax_monster_2")
  ) {
    state.taxCleared = true;
  }
  if (
    state.lawCleared === false &&
    Array.isArray(state.monstersKilledIds) &&
    state.monstersKilledIds.includes("law_monster_1") &&
    state.monstersKilledIds.includes("law_monster_2")
  ) {
    state.lawCleared = true;
  }
  if (
    state.strategyCleared === false &&
    Array.isArray(state.monstersKilledIds) &&
    state.monstersKilledIds.includes("strategy_monster_1") &&
    state.monstersKilledIds.includes("strategy_monster_2")
  ) {
    state.strategyCleared = true;
  }
  if (!state.achievements) state.achievements = [];
  if (!Array.isArray(state.levelTitles)) state.levelTitles = [];
  if (state.mainStep === undefined) state.mainStep = 0;
  if (state.quizStreak === undefined) state.quizStreak = 0;
  if (!Array.isArray(state.visitedRooms)) state.visitedRooms = [];
  if (!state.collectCount) state.collectCount = 0;
  if (!state.tasks.some((t) => t.id === "defeat_ink")) {
    const inkTask = defaultState().tasks.find((t) => t.id === "defeat_ink");
    if (inkTask) state.tasks.push(inkTask);
  }
  if (!state.tasks.some((t) => t.id === "collect3")) {
    const collectTask = defaultState().tasks.find((t) => t.id === "collect3");
    if (collectTask) state.tasks.push(collectTask);
  }
  if (!state.tasks.some((t) => t.id === "talk_old")) {
    const oldTask = defaultState().tasks.find((t) => t.id === "talk_old");
    if (oldTask) state.tasks.push(oldTask);
  }
  if (!state.tasks.some((t) => t.id === "craft_task")) {
    const craftTask = defaultState().tasks.find((t) => t.id === "craft_task");
    if (craftTask) state.tasks.push(craftTask);
  }
  if (!state.tasks.some((t) => t.id === "shop_task")) {
    const shopTask = defaultState().tasks.find((t) => t.id === "shop_task");
    if (shopTask) state.tasks.push(shopTask);
  }
  for (const taskId of ["defeat_crane", "answer10", "enhance_task"]) {
    if (!state.tasks.some((t) => t.id === taskId)) {
      const task = defaultState().tasks.find((t) => t.id === taskId);
      if (task) state.tasks.push(task);
    }
  }
  function ensureTaskFields() {
    state.tasks.forEach((t) => {
      if (!t.deliverNpc && TASK_DELIVERY[t.id]) t.deliverNpc = TASK_DELIVERY[t.id];
      if (!t.deliverable) t.deliverable = false;
      if (!t.delivered) t.delivered = false;
    });
  }
  ensureTaskFields();
  activateRegionTasks(state.zone);

  const entities = [
    { id: "npc_xiaofen", type: "npc", x: 430, y: 332, label: "小分", text: "欢迎来到记账大陆！借贷失衡后，怪物开始扭曲这里的知识。击败它们前，先回忆一下：资产增加记哪方？", name: "小分" },
    { id: "npc_shenming", type: "npc", x: 724, y: 286, label: "审明", text: "我是审明。别急着打怪，先去知识碑复习“会计等式”。答对题目会让技能更有效。", name: "审明" },
    { id: "npc_old", type: "npc", x: 96, y: 352, label: "老会计", text: "我是记账大陆最后一代老会计。复式记账是世界的根基，只要借贷平衡，知识就不会扭曲。你可以去采集金算石和墨渍残页，用来打造装备。", name: "老会计" },
    { id: "balance_landmark", type: "landmark", x: 496, y: 176, label: "天平衡碑", text: "天平衡碑正在发光。借贷失衡后，这里的法则碎片已经扭曲，只有击败合并报表巨像才能恢复平衡。" },
    { id: "door_shop", type: "door", x: 680, y: 252, label: "审明杂货铺", target: "shop" },
    { id: "door_home", type: "door", x: 70, y: 322, label: "老会计家", target: "home" },
    { id: "door_workshop", type: "door", x: 360, y: 210, label: "会计工坊", target: "workshop" },
    { id: "door_archive", type: "door", x: 648, y: 121, label: "审计档案室", target: "archive" },
    { id: "door_ledger", type: "door", x: 853, y: 402, label: "旧账房", target: "ledger" },
    { id: "door_audit", type: "door", x: 832, y: 180, label: "审计工作台", target: "audit_room" },
    { id: "door_finance", type: "door", x: 96, y: 500, label: "财务分析室", target: "finance_room" },
    { id: "door_tax", type: "door", x: 832, y: 500, label: "税法咨询处", target: "tax_room" },
    { id: "door_law", type: "door", x: 192, y: 170, label: "经济法图书馆", target: "law_room" },
    { id: "door_strategy", type: "door", x: 440, y: 500, label: "战略沙盘室", target: "strategy_room" },
    { id: "chest_1", type: "chest", x: 720, y: 326, label: "宝箱", reward: 30 },
    { id: "chest_2", type: "chest", x: 160, y: 440, label: "宝箱", reward: 50 },
    { id: "sign_1", type: "sign", x: 400, y: 170, label: "路标", text: "北侧通往审计档案室，东侧通往审计铁堡。会计原野的核心是借贷平衡，先完成小分和审明的委托再前进。" },
    { id: "sign_2", type: "sign", x: 760, y: 220, label: "警戒路标", text: "前方天平祭坛有合并报表巨像。击破前记得复习报表知识点，并准备好药水和强化装备。" },
    { id: "stone_1", type: "stone", x: 250, y: 300, label: "知识碑", point: "会计等式", tip: "资产 = 负债 + 所有者权益。答对一题可获得学习反馈。" },
    { id: "stone_2", type: "stone", x: 690, y: 430, label: "知识碑", point: "借贷方向", tip: "借表示资产和费用增加，贷表示负债、所有者权益和收入增加。" },
    { id: "collect_1", type: "collect", x: 300, y: 410, label: "金算石", material: "stone", amount: 1 },
    { id: "collect_2", type: "collect", x: 620, y: 450, label: "墨渍残页", material: "ink", amount: 1 },
    { id: "collect_3", type: "collect", x: 740, y: 410, label: "算盘珠", material: "beads", amount: 1 },
    { id: "portal_tower", type: "portal", x: 896, y: 178, label: "审计铁堡入口", target: "审计铁堡", locked: true },
    { id: "monster_1", type: "monster", x: 570, y: 278, label: "凭证纸鹤", point: "凭证", hp: 42, attack: 9, exp: 26, gold: 18 },
    { id: "monster_2", type: "monster", x: 178, y: 432, label: "墨渍怪", point: "借贷方向", hp: 38, attack: 8, exp: 22, gold: 15 },
    { id: "monster_3", type: "monster", x: 800, y: 382, label: "算盘傀儡", point: "科目分类", hp: 50, attack: 11, exp: 30, gold: 22 },
    { id: "boss_1", type: "boss", x: 520, y: 220, label: "合并报表巨像", point: "报表", hp: 180, attack: 15, exp: 120, gold: 80 }
  ];

  const ROOMS = {
    shop: { name: "审明杂货铺", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 700, y: 270 } },
    home: { name: "老会计家", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 80, y: 340 } },
    workshop: { name: "会计工坊", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 360, y: 210 } },
    archive: { name: "审计档案室", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 648, y: 121 } },
    ledger: { name: "旧账房", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 853, y: 402 } },
    audit_room: { name: "审计工作台", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 832, y: 200 } },
    finance_room: { name: "财务分析室", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 96, y: 520 } },
    tax_room: { name: "税法咨询处", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 832, y: 520 } },
    law_room: { name: "经济法图书馆", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 192, y: 190 } },
    strategy_room: { name: "战略沙盘室", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 440, y: 520 } },
    audit_meeting: { name: "审计会议室", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 560, y: 390 } },
    audit_evidence: { name: "证据库", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 680, y: 390 } },
    audit_chief: { name: "审计长办公室", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 480, y: 410 } },
    capital_cashflow: { name: "现金流演练场", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 560, y: 390 } },
    capital_structure: { name: "资本结构实验室", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 680, y: 390 } },
    capital_investment: { name: "投资决策室", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 480, y: 410 } },
    tax_vat: { name: "增值税演练场", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 560, y: 390 } },
    tax_cit: { name: "企业所得税申报厅", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 680, y: 390 } },
    tax_incentive: { name: "税收优惠室", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 480, y: 410 } },
    law_contract: { name: "合同审查厅", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 560, y: 390 } },
    law_securities: { name: "证券法讲堂", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 680, y: 390 } },
    law_bankruptcy: { name: "破产法庭", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 480, y: 410 } },
    strategy_sandbox: { name: "战略沙盘厅", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 560, y: 390 } },
    strategy_five: { name: "五力决策室", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 680, y: 390 } },
    strategy_ma: { name: "并购实验室", spawn: { x: 300, y: 320 }, exit: { x: 300, y: 430 }, doorExternal: { x: 480, y: 410 } }
  };

  const ROOM_ENTITIES = {
    shop: [
      { id: "room_shop_npc", type: "npc", x: 250, y: 300, label: "审明", text: "欢迎来到杂货铺。你可以购买药水、装备和职业凭证。", name: "审明" },
      { id: "room_shop_chest", type: "chest", x: 640, y: 300, label: "货架", reward: 30 }
    ],
    home: [
      { id: "room_home_npc", type: "npc", x: 240, y: 300, label: "老会计", text: "家虽然简单，但账本都整理得很清楚。别忘了去复习会计等式。", name: "老会计" },
      { id: "room_home_chest", type: "chest", x: 660, y: 320, label: "账本箱", reward: 40 }
    ],
    workshop: [
      { id: "room_workshop_bench", type: "bench", x: 300, y: 300, label: "打造台" }
    ],
    archive: [
      { id: "room_archive_npc", type: "npc", x: 240, y: 300, label: "档案员", text: "这里的档案都需要重新核对。击败凭证纸鹤后，记得来找我交付任务。", name: "档案员" },
      { id: "room_archive_chest", type: "chest", x: 640, y: 300, label: "档案箱", reward: 35 }
    ],
    ledger: [
      { id: "room_ledger_npc", type: "npc", x: 240, y: 300, label: "账房先生", text: "旧账房的账本很多，但都能对上。你可以在这里复习借贷方向。", name: "账房先生" },
      { id: "room_ledger_chest", type: "chest", x: 640, y: 300, label: "旧账箱", reward: 45 }
    ],
    audit_room: [
      { id: "room_audit_npc", type: "npc", x: 240, y: 300, label: "审计师", text: "审计工作台存放着证据底稿。先掌握审计目标，再去挑战审计铁堡。", name: "审计师" },
      { id: "room_audit_chest", type: "chest", x: 640, y: 300, label: "证据柜", reward: 40 }
    ],
    finance_room: [
      { id: "room_finance_npc", type: "npc", x: 240, y: 300, label: "财务分析师", text: "财务分析室用来计算现金流和资本成本。答对财务题目会更容易理解杠杆。", name: "财务分析师" },
      { id: "room_finance_chest", type: "chest", x: 640, y: 300, label: "预算箱", reward: 42 }
    ],
    tax_room: [
      { id: "room_tax_npc", type: "npc", x: 240, y: 300, label: "税务顾问", text: "税法咨询处整理了许多纳税调整表。增值税和企业所得税是考试重点。", name: "税务顾问" },
      { id: "room_tax_chest", type: "chest", x: 640, y: 300, label: "税单柜", reward: 44 }
    ],
    law_room: [
      { id: "room_law_npc", type: "npc", x: 240, y: 300, label: "法务官", text: "经济法图书馆藏有公司法、合同法和证券法条文。遇到纠纷时可以来这里复习。", name: "法务官" },
      { id: "room_law_chest", type: "chest", x: 640, y: 300, label: "法典箱", reward: 46 }
    ],
    strategy_room: [
      { id: "room_strategy_npc", type: "npc", x: 240, y: 300, label: "战略官", text: "战略沙盘室用于推演并购和价值链。多思考全局，才能制定最合适的方案。", name: "战略官" },
      { id: "room_strategy_chest", type: "chest", x: 640, y: 300, label: "沙盘箱", reward: 48 }
    ],
    audit_meeting: [
      { id: "room_audit_meeting_npc", type: "npc", x: 240, y: 300, label: "会议长", text: "审计会议室用来复核审计计划。先明确重要性水平，再决定证据收集的范围。", name: "会议长" },
      { id: "room_audit_meeting_chest", type: "chest", x: 640, y: 300, label: "纪要箱", reward: 50 }
    ],
    audit_evidence: [
      { id: "room_audit_evidence_npc", type: "npc", x: 240, y: 300, label: "证据保管员", text: "证据库里的函证、监盘记录和分析程序材料都要分类保存。证据的充分性和适当性都很重要。", name: "证据保管员" },
      { id: "room_audit_evidence_chest", type: "chest", x: 640, y: 300, label: "证据柜", reward: 52 }
    ],
    audit_chief: [
      { id: "room_audit_chief_npc", type: "npc", x: 240, y: 300, label: "审计长", text: "审计长办公室负责最终判断。只有证据充分、程序完整，才能形成可信的审计结论。", name: "审计长" },
      { id: "room_audit_chief_chest", type: "chest", x: 640, y: 300, label: "审批箱", reward: 54 }
    ],
    capital_cashflow: [
      { id: "room_capital_cashflow_npc", type: "npc", x: 240, y: 300, label: "现金流教练", text: "现金流演练场用来训练经营、投资和筹资活动的分类。记得先判断业务实质，再归入对应活动。", name: "现金流教练" },
      { id: "room_capital_cashflow_chest", type: "chest", x: 640, y: 300, label: "现金流箱", reward: 56 }
    ],
    capital_structure: [
      { id: "room_capital_structure_npc", type: "npc", x: 240, y: 300, label: "资本结构师", text: "资本结构实验室研究债务和权益的配比。财务杠杆越高，风险和期望报酬通常也越高。", name: "资本结构师" },
      { id: "room_capital_structure_chest", type: "chest", x: 640, y: 300, label: "杠杆箱", reward: 58 }
    ],
    capital_investment: [
      { id: "room_capital_investment_npc", type: "npc", x: 240, y: 300, label: "投资顾问", text: "投资决策室用净现值和内部报酬率评估项目。关注增量现金流，而不是历史沉没成本。", name: "投资顾问" },
      { id: "room_capital_investment_chest", type: "chest", x: 640, y: 300, label: "决策箱", reward: 60 }
    ],
    tax_vat: [
      { id: "room_tax_vat_npc", type: "npc", x: 240, y: 300, label: "增值税讲师", text: "增值税演练场用来训练销项税额、进项税额和应纳税额计算。先分清一般计税和简易计税。", name: "增值税讲师" },
      { id: "room_tax_vat_chest", type: "chest", x: 640, y: 300, label: "销项箱", reward: 62 }
    ],
    tax_cit: [
      { id: "room_tax_cit_npc", type: "npc", x: 240, y: 300, label: "所得税顾问", text: "企业所得税申报厅整理收入总额、免税收入和各项扣除。应纳税所得额是计算税负的核心。", name: "所得税顾问" },
      { id: "room_tax_cit_chest", type: "chest", x: 640, y: 300, label: "申报箱", reward: 64 }
    ],
    tax_incentive: [
      { id: "room_tax_incentive_npc", type: "npc", x: 240, y: 300, label: "优惠专员", text: "税收优惠室存放研发加计扣除、小型微利企业优惠和高新技术企业税率等资料。", name: "优惠专员" },
      { id: "room_tax_incentive_chest", type: "chest", x: 640, y: 300, label: "优惠箱", reward: 66 }
    ],
    law_contract: [
      { id: "room_law_contract_npc", type: "npc", x: 240, y: 300, label: "合同审查员", text: "合同审查厅用来判断要约、承诺和合同效力。注意强制性规定和格式条款的规则。", name: "合同审查员" },
      { id: "room_law_contract_chest", type: "chest", x: 640, y: 300, label: "合同箱", reward: 68 }
    ],
    law_securities: [
      { id: "room_law_securities_npc", type: "npc", x: 240, y: 300, label: "证券法讲师", text: "证券法讲堂重点讲解信息披露、上市公司治理和证券发行注册制度。", name: "证券法讲师" },
      { id: "room_law_securities_chest", type: "chest", x: 640, y: 300, label: "披露箱", reward: 70 }
    ],
    law_bankruptcy: [
      { id: "room_law_bankruptcy_npc", type: "npc", x: 240, y: 300, label: "破产管理人", text: "破产法庭处理清算和重整程序。破产费用和共益债务通常优先清偿。", name: "破产管理人" },
      { id: "room_law_bankruptcy_chest", type: "chest", x: 640, y: 300, label: "重整箱", reward: 72 }
    ],
    strategy_sandbox: [
      { id: "room_strategy_sandbox_npc", type: "npc", x: 240, y: 300, label: "战略导师", text: "战略沙盘厅用来推演竞争战略和资源配置。先判断市场环境，再选择成本领先或差异化。", name: "战略导师" },
      { id: "room_strategy_sandbox_chest", type: "chest", x: 640, y: 300, label: "沙盘箱", reward: 74 }
    ],
    strategy_five: [
      { id: "room_strategy_five_npc", type: "npc", x: 240, y: 300, label: "竞争分析师", text: "五力决策室研究现有竞争者、潜在进入者、替代品、供应商和购买者的议价能力。", name: "竞争分析师" },
      { id: "room_strategy_five_chest", type: "chest", x: 640, y: 300, label: "五力箱", reward: 76 }
    ],
    strategy_ma: [
      { id: "room_strategy_ma_npc", type: "npc", x: 240, y: 300, label: "并购顾问", text: "并购实验室分析横向、纵向和多元化并购。并购成功的关键是战略协同和整合能力。", name: "并购顾问" },
      { id: "room_strategy_ma_chest", type: "chest", x: 640, y: 300, label: "并购箱", reward: 78 }
    ]
  };

  const ROOM_EXIT = { id: "room_exit", type: "exit", x: 300, y: 430, label: "离开" };

  const ALL_SKILLS = {
    lending_slash: { id: "lending_slash", name: "借贷斩", mp: 8, desc: "物理伤害×1.2", point: "借贷方向", power: 1.2 },
    trial_balance: { id: "trial_balance", name: "试算平衡", mp: 12, desc: "回复 HP 15%", point: "试算平衡", power: 0 },
    subject_switch: { id: "subject_switch", name: "科目切换", mp: 10, desc: "ATK+30%，持续 3 回合", point: "科目分类", power: 1.3 },
    entry_combo: { id: "entry_combo", name: "分录连击", mp: 16, desc: "两次攻击×0.8", point: "会计要素", power: 1.6 },
    consolidation: { id: "consolidation", name: "合并报表", mp: 24, desc: "强力 AOE 伤害", point: "报表", power: 2.2 },
    audit_adjust: { id: "audit_adjust", name: "审计调整", mp: 10, desc: "证据攻击×1.3", point: "审计证据", power: 1.3 },
    evidence_check: { id: "evidence_check", name: "证据收集", mp: 12, desc: "目标攻击×1.4", point: "审计目标", power: 1.4 },
    control_test: { id: "control_test", name: "控制测试", mp: 14, desc: "内控攻击×1.5", point: "内部控制", power: 1.5 },
    opinion_judge: { id: "opinion_judge", name: "意见签发", mp: 18, desc: "意见攻击×1.8", point: "审计意见", power: 1.8 },
    time_value: { id: "time_value", name: "复利斩", mp: 10, desc: "时间价值攻击×1.3", point: "货币时间价值", power: 1.3 },
    capital_cost: { id: "capital_cost", name: "资本成本", mp: 12, desc: "成本攻击×1.4", point: "资本成本", power: 1.4 },
    leverage_strike: { id: "leverage_strike", name: "杠杆连击", mp: 14, desc: "杠杆攻击×1.5", point: "财务杠杆", power: 1.5 },
    budget_blast: { id: "budget_blast", name: "资本预算", mp: 18, desc: "预算攻击×1.8", point: "资本预算", power: 1.8 },
    vat_arrow: { id: "vat_arrow", name: "增值税箭", mp: 10, desc: "增值税攻击×1.3", point: "增值税", power: 1.3 },
    cit_storm: { id: "cit_storm", name: "所得税爆", mp: 12, desc: "企业所得税攻击×1.4", point: "企业所得税", power: 1.4 },
    iit_burn: { id: "iit_burn", name: "个税灼烧", mp: 14, desc: "个人所得税攻击×1.5", point: "个人所得税", power: 1.5 },
    tax_incentive: { id: "tax_incentive", name: "优惠陷阱", mp: 18, desc: "税收优惠攻击×1.8", point: "税收优惠", power: 1.8 },
    company_law: { id: "company_law", name: "公司法盾", mp: 10, desc: "公司法攻击×1.3", point: "公司法", power: 1.3 },
    contract_guard: { id: "contract_guard", name: "合同护盾", mp: 12, desc: "合同法攻击×1.4", point: "合同法", power: 1.4 },
    securities_bless: { id: "securities_bless", name: "证券祝福", mp: 14, desc: "证券法攻击×1.5", point: "证券法", power: 1.5 },
    bankruptcy_cleanse: { id: "bankruptcy_cleanse", name: "破产净化", mp: 18, desc: "破产法攻击×1.8", point: "破产法", power: 1.8 },
    swot_call: { id: "swot_call", name: "SWOT召唤", mp: 10, desc: "SWOT攻击×1.3", point: "SWOT", power: 1.3 },
    five_force: { id: "five_force", name: "五力结界", mp: 12, desc: "五力攻击×1.4", point: "五力模型", power: 1.4 },
    value_chain: { id: "value_chain", name: "价值链斩", mp: 14, desc: "价值链攻击×1.5", point: "价值链", power: 1.5 },
    m_a_fusion: { id: "m_a_fusion", name: "并购融合", mp: 18, desc: "并购攻击×1.8", point: "并购战略", power: 1.8 },
    ledger_guard: { id: "ledger_guard", name: "账簿护盾", mp: 14, desc: "账簿攻击×1.4", point: "账簿", power: 1.4 },
    report_verdict: { id: "report_verdict", name: "报表裁决", mp: 22, desc: "报表攻击×2.0", point: "报表", power: 2.0 },
    risk_strike: { id: "risk_strike", name: "风险突袭", mp: 16, desc: "审计风险攻击×1.6", point: "审计风险", power: 1.6 },
    materiality_judge: { id: "materiality_judge", name: "重要性裁断", mp: 20, desc: "重要性攻击×2.0", point: "审计重要性", power: 2.0 },
    npv_judgment: { id: "npv_judgment", name: "净现值裁决", mp: 16, desc: "净现值攻击×1.6", point: "资本预算", power: 1.6 },
    duPont_blade: { id: "duPont_blade", name: "杜邦利刃", mp: 20, desc: "财务分析攻击×2.0", point: "财务分析", power: 2.0 },
    vat_refund: { id: "vat_refund", name: "进项回流", mp: 16, desc: "增值税攻击×1.6", point: "增值税", power: 1.6 },
    land_tax_wave: { id: "land_tax_wave", name: "土地增值税浪", mp: 20, desc: "土地增值税攻击×2.0", point: "土地增值税", power: 2.0 },
    board_guard: { id: "board_guard", name: "董事会之盾", mp: 16, desc: "公司治理攻击×1.6", point: "公司治理", power: 1.6 },
    bankruptcy_order: { id: "bankruptcy_order", name: "破产序曲", mp: 20, desc: "破产法攻击×2.0", point: "破产法", power: 2.0 },
    bcg_star: { id: "bcg_star", name: "明星矩阵", mp: 16, desc: "波士顿矩阵攻击×1.6", point: "波士顿矩阵", power: 1.6 },
    balanced_score: { id: "balanced_score", name: "平衡计分斩", mp: 20, desc: "平衡计分卡攻击×2.0", point: "平衡计分卡", power: 2.0 }
  };

  const SKILLS = ALL_SKILLS;

  const JOBS = {
    accountant: { id: "accountant", name: "簿记剑士", subject: "会计", skills: ["lending_slash", "trial_balance", "subject_switch", "entry_combo", "consolidation", "ledger_guard", "report_verdict"], atk: 2, def: 0, mp: 0, desc: "均衡稳定，会计基础" },
    auditor: { id: "auditor", name: "审计法师", subject: "审计", skills: ["audit_adjust", "evidence_check", "control_test", "opinion_judge", "risk_strike", "materiality_judge"], atk: 0, def: 2, mp: 10, desc: "证据与控制" },
    finance: { id: "finance", name: "财管游侠", subject: "财管", skills: ["time_value", "capital_cost", "leverage_strike", "budget_blast", "npv_judgment", "duPont_blade"], atk: 2, def: 0, mp: 0, desc: "高回报计算" },
    tax: { id: "tax", name: "税法弓手", subject: "税法", skills: ["vat_arrow", "cit_storm", "iit_burn", "tax_incentive", "vat_refund", "land_tax_wave"], atk: 1, def: 0, mp: 4, desc: "远程与持续伤害" },
    law: { id: "law", name: "经济法祭司", subject: "经济法", skills: ["company_law", "contract_guard", "securities_bless", "bankruptcy_cleanse", "board_guard", "bankruptcy_order"], atk: 0, def: 2, mp: 6, desc: "护盾与治疗" },
    strategy: { id: "strategy", name: "战略召唤师", subject: "战略", skills: ["swot_call", "five_force", "value_chain", "m_a_fusion", "bcg_star", "balanced_score"], atk: 0, def: 0, mp: 12, desc: "多单位与全局" }
  };

  const PLAYER_DIR_COL = { down: 0, right: 1, left: 2, up: 3 };

  const MONSTER_SPRITE = {
    paper_crane: "paper_crane",
    ink_blob: "ink_blob",
    abacus_golem: "abacus_golem",
    trial_ghost: "trial_ghost",
    merge_giant: "merge_giant",
    final_boss: "merge_giant"
  };

  const MAP_W = 60;
  const MAP_H = 34;
  const TILE = 16;

  const MAP_BUILDING_REGIONS = [
    { y0: 9, y1: 11, x0: 32, x1: 35 },
    { y0: 13, y1: 16, x0: 39, x1: 44 },
    { y0: 15, y1: 22, x0: 48, x1: 57 },
    { y0: 17, y1: 22, x0: 36, x1: 40 },
    { y0: 18, y1: 22, x0: 42, x1: 45 },
    { y0: 23, y1: 25, x0: 39, x1: 43 },
    { y0: 28, y1: 30, x0: 32, x1: 35 },
    { y0: 9, y1: 11, x0: 2, x1: 5 },
    { y0: 4, y1: 9, x0: 48, x1: 56 },
    { y0: 25, y1: 30, x0: 3, x1: 9 },
    { y0: 26, y1: 30, x0: 48, x1: 56 },
    { y0: 4, y1: 9, x0: 8, x1: 16 },
    { y0: 28, y1: 30, x0: 24, x1: 31 }
  ];

  function buildMapGrid() {
    const grid = [];
    for (let y = 0; y < MAP_H; y++) {
      grid.push(new Array(MAP_W).fill(0));
    }

    // water
    for (let x = 0; x < MAP_W; x++) {
      grid[14][x] = 2;
    }
    // bridge
    for (let x = 28; x <= 31; x++) {
      grid[14][x] = 1;
    }

    // horizontal roads
    for (let x = 0; x < MAP_W; x++) {
      grid[22][x] = 1;
      grid[23][x] = 1;
    }

    // vertical road
    for (let y = 8; y <= 23; y++) {
      grid[y][26] = 1;
    }

    // farm fields
    for (let y = 27; y <= 30; y++) {
      for (let x = 10; x <= 20; x++) {
        grid[y][x] = 6;
      }
    }

    // building footprints keep players out of large structures
    for (const region of MAP_BUILDING_REGIONS) {
      for (let y = region.y0; y <= region.y1; y++) {
        for (let x = region.x0; x <= region.x1; x++) {
          grid[y][x] = 5;
        }
      }
    }

    // trees
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (grid[y][x] !== 0) continue;
        if ((x * 31 + y * 17) % 31 === 0 || x < 2 || x > MAP_W - 3 || y < 2 || y > MAP_H - 3) {
          grid[y][x] = 3;
        }
      }
    }

    // flowers
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (grid[y][x] === 0 && (x + y * 7) % 29 === 0) grid[y][x] = 4;
      }
    }

    // shop door and approach
    grid[15][42] = 7;
    grid[16][42] = 0;
    grid[17][42] = 0;

    // new room doors and approaches
    const newDoors = [
      { y: 10, x: 52 },
      { y: 31, x: 6 },
      { y: 31, x: 52 },
      { y: 10, x: 12 },
      { y: 31, x: 27 }
    ];
    for (const door of newDoors) {
      grid[door.y][door.x] = 7;
      if (door.y + 1 < MAP_H) grid[door.y + 1][door.x] = 0;
    }

    return grid;
  }

  const mapGrid = buildMapGrid();

  const AUDIT_BUILDING_REGIONS = [
    { y0: 8, y1: 19, x0: 24, x1: 35 },
    { y0: 5, y1: 10, x0: 8, x1: 14 },
    { y0: 5, y1: 10, x0: 44, x1: 50 },
    { y0: 24, y1: 29, x0: 8, x1: 14 },
    { y0: 24, y1: 29, x0: 44, x1: 50 }
  ];

  function buildAuditMapGrid() {
    const grid = [];
    for (let y = 0; y < MAP_H; y++) {
      grid.push(new Array(MAP_W).fill(0));
    }

    for (const region of AUDIT_BUILDING_REGIONS) {
      for (let y = region.y0; y <= region.y1; y++) {
        for (let x = region.x0; x <= region.x1; x++) {
          grid[y][x] = 5;
        }
      }
    }

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (grid[y][x] !== 0) continue;
        if (y === 14 || y === 15) grid[y][x] = 2;
        if (x === 26 && y >= 20 && y <= 23) grid[y][x] = 1;
        if ((y === 22 || y === 23) && x >= 8 && x <= 50) grid[y][x] = 1;
        if ((x * 19 + y * 13) % 37 === 0) grid[y][x] = 3;
      }
    }

    const doors = [
      { y: 20, x: 30 },
      { y: 11, x: 11 },
      { y: 11, x: 47 },
      { y: 30, x: 11 },
      { y: 30, x: 47 }
    ];
    for (const door of doors) {
      grid[door.y][door.x] = 7;
      if (door.y + 1 < MAP_H) grid[door.y + 1][door.x] = 0;
    }

    return grid;
  }

  const auditMapGrid = buildAuditMapGrid();

  function getCurrentMapGrid() {
    if (state.zone === "audit_tower") return auditMapGrid;
    if (state.zone === "capital_forest") return capitalMapGrid;
    if (state.zone === "tax_wasteland") return taxMapGrid;
    if (state.zone === "law_temple") return lawMapGrid;
    if (state.zone === "strategy_star") return strategyMapGrid;
    return mapGrid;
  }

  function getCurrentBuildingRegions() {
    if (state.zone === "audit_tower") return AUDIT_BUILDING_REGIONS;
    if (state.zone === "capital_forest") return CAPITAL_BUILDING_REGIONS;
    if (state.zone === "tax_wasteland") return TAX_BUILDING_REGIONS;
    if (state.zone === "law_temple") return LAW_BUILDING_REGIONS;
    if (state.zone === "strategy_star") return STRATEGY_BUILDING_REGIONS;
    return MAP_BUILDING_REGIONS;
  }

  const AUDIT_ENTITIES = [
    { id: "audit_gate_back", type: "zone_gate", x: 520, y: 410, label: "返回金算原野", target: "gold_field" },
    { id: "audit_gate_capital", type: "zone_gate", x: 760, y: 400, label: "资本密林入口", target: "capital_forest" },
    { id: "audit_npc", type: "npc", x: 430, y: 340, label: "审计统领", text: "审计铁堡负责检验证据链。击败底稿魔像和函证幽灵后，凭证巨像会出现。", name: "审计统领" },
    { id: "audit_chest", type: "chest", x: 650, y: 300, label: "审计战利箱", reward: 60 },
    { id: "audit_stone", type: "stone", x: 250, y: 300, label: "证据碑", point: "审计证据", tip: "审计证据需要具备充分性和适当性。外部独立来源的书面证据通常更可靠。" },
    { id: "door_audit_meeting", type: "door", x: 560, y: 360, label: "审计会议室", target: "audit_meeting" },
    { id: "door_audit_evidence", type: "door", x: 680, y: 360, label: "证据库", target: "audit_evidence" },
    { id: "door_audit_chief", type: "door", x: 480, y: 380, label: "审计长办公室", target: "audit_chief" },
    { id: "audit_monster_1", type: "monster", x: 680, y: 220, label: "底稿魔像", point: "审计证据", hp: 60, attack: 12, exp: 40, gold: 30 },
    { id: "audit_monster_2", type: "monster", x: 220, y: 420, label: "函证幽灵", point: "函证", hp: 55, attack: 11, exp: 36, gold: 28 },
    { id: "audit_boss", type: "boss", x: 120, y: 180, label: "凭证巨像", point: "审计证据", hp: 130, attack: 15, exp: 90, gold: 60 }
  ];

  const CAPITAL_BUILDING_REGIONS = [
    { y0: 8, y1: 19, x0: 24, x1: 35 },
    { y0: 4, y1: 9, x0: 8, x1: 14 },
    { y0: 4, y1: 9, x0: 44, x1: 50 },
    { y0: 24, y1: 29, x0: 8, x1: 14 },
    { y0: 24, y1: 29, x0: 44, x1: 50 }
  ];

  function buildCapitalMapGrid() {
    const grid = [];
    for (let y = 0; y < MAP_H; y++) {
      grid.push(new Array(MAP_W).fill(0));
    }

    for (const region of CAPITAL_BUILDING_REGIONS) {
      for (let y = region.y0; y <= region.y1; y++) {
        for (let x = region.x0; x <= region.x1; x++) {
          grid[y][x] = 5;
        }
      }
    }

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (grid[y][x] !== 0) continue;
        if (x >= 10 && x <= 20 && y >= 15 && y <= 16) grid[y][x] = 2;
        if (x === 26 && y >= 20 && y <= 23) grid[y][x] = 1;
        if ((y === 22 || y === 23) && x >= 8 && x <= 50) grid[y][x] = 1;
        if ((x * 17 + y * 29) % 31 === 0) grid[y][x] = 3;
      }
    }

    const doors = [
      { y: 20, x: 30 },
      { y: 10, x: 11 },
      { y: 10, x: 47 },
      { y: 30, x: 11 },
      { y: 30, x: 47 }
    ];
    for (const door of doors) {
      grid[door.y][door.x] = 7;
      if (door.y + 1 < MAP_H) grid[door.y + 1][door.x] = 0;
    }

    return grid;
  }

  const capitalMapGrid = buildCapitalMapGrid();

  const CAPITAL_ENTITIES = [
    { id: "capital_gate_back", type: "zone_gate", x: 520, y: 410, label: "返回审计铁堡", target: "audit_tower" },
    { id: "capital_gate_tax", type: "zone_gate", x: 760, y: 400, label: "税率荒原入口", target: "tax_wasteland" },
    { id: "capital_npc", type: "npc", x: 430, y: 340, label: "财管导师", text: "资本密林里的现金流狼和杠杆树精会扭曲财务分析。肃清它们后，估值树王会现身。", name: "财管导师" },
    { id: "capital_chest", type: "chest", x: 650, y: 300, label: "资本战利箱", reward: 70 },
    { id: "capital_stone", type: "stone", x: 250, y: 300, label: "现金流碑", point: "现金流量", tip: "投资、经营和筹资活动构成现金流量表。资本预算更关注项目未来的增量现金流。" },
    { id: "door_capital_cashflow", type: "door", x: 560, y: 360, label: "现金流演练场", target: "capital_cashflow" },
    { id: "door_capital_structure", type: "door", x: 680, y: 360, label: "资本结构实验室", target: "capital_structure" },
    { id: "door_capital_invest", type: "door", x: 480, y: 380, label: "投资决策室", target: "capital_investment" },
    { id: "capital_monster_1", type: "monster", x: 680, y: 220, label: "现金流狼", point: "现金流量", hp: 62, attack: 13, exp: 44, gold: 34 },
    { id: "capital_monster_2", type: "monster", x: 220, y: 420, label: "杠杆树精", point: "财务杠杆", hp: 58, attack: 12, exp: 40, gold: 32 },
    { id: "capital_boss", type: "boss", x: 120, y: 180, label: "估值树王", point: "资本预算", hp: 140, attack: 16, exp: 100, gold: 70 }
  ];

  const TAX_BUILDING_REGIONS = [
    { y0: 8, y1: 19, x0: 24, x1: 35 },
    { y0: 4, y1: 9, x0: 8, x1: 14 },
    { y0: 4, y1: 9, x0: 44, x1: 50 },
    { y0: 24, y1: 29, x0: 8, x1: 14 },
    { y0: 24, y1: 29, x0: 44, x1: 50 }
  ];

  function buildTaxMapGrid() {
    const grid = [];
    for (let y = 0; y < MAP_H; y++) {
      grid.push(new Array(MAP_W).fill(0));
    }

    for (const region of TAX_BUILDING_REGIONS) {
      for (let y = region.y0; y <= region.y1; y++) {
        for (let x = region.x0; x <= region.x1; x++) {
          grid[y][x] = 5;
        }
      }
    }

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (grid[y][x] !== 0) continue;
        if (x >= 10 && x <= 20 && y >= 15 && y <= 16) grid[y][x] = 2;
        if (x === 26 && y >= 20 && y <= 23) grid[y][x] = 1;
        if ((y === 22 || y === 23) && x >= 8 && x <= 50) grid[y][x] = 1;
        if ((x * 23 + y * 11) % 43 === 0) grid[y][x] = 3;
      }
    }

    const doors = [
      { y: 20, x: 30 },
      { y: 10, x: 11 },
      { y: 10, x: 47 },
      { y: 30, x: 11 },
      { y: 30, x: 47 }
    ];
    for (const door of doors) {
      grid[door.y][door.x] = 7;
      if (door.y + 1 < MAP_H) grid[door.y + 1][door.x] = 0;
    }

    return grid;
  }

  const taxMapGrid = buildTaxMapGrid();

  const TAX_ENTITIES = [
    { id: "tax_gate_back", type: "zone_gate", x: 520, y: 410, label: "返回资本密林", target: "capital_forest" },
    { id: "tax_gate_law", type: "zone_gate", x: 760, y: 400, label: "法条神殿入口", target: "law_temple" },
    { id: "tax_npc", type: "npc", x: 430, y: 340, label: "税务官", text: "税率荒原的发票魔像和逾期税兽会扰乱纳税申报。肃清它们后，税章巨像会出现。", name: "税务官" },
    { id: "tax_chest", type: "chest", x: 650, y: 300, label: "税收战利箱", reward: 80 },
    { id: "tax_stone", type: "stone", x: 250, y: 300, label: "发票碑", point: "发票管理", tip: "增值税专用发票是合法抵扣进项税额的重要凭证，发票管理直接影响税务处理。" },
    { id: "door_tax_vat", type: "door", x: 560, y: 360, label: "增值税演练场", target: "tax_vat" },
    { id: "door_tax_cit", type: "door", x: 680, y: 360, label: "企业所得税申报厅", target: "tax_cit" },
    { id: "door_tax_incentive", type: "door", x: 480, y: 380, label: "税收优惠室", target: "tax_incentive" },
    { id: "tax_monster_1", type: "monster", x: 680, y: 220, label: "发票魔像", point: "发票管理", hp: 64, attack: 14, exp: 48, gold: 36 },
    { id: "tax_monster_2", type: "monster", x: 220, y: 420, label: "逾期税兽", point: "税收征管", hp: 60, attack: 13, exp: 44, gold: 34 },
    { id: "tax_boss", type: "boss", x: 120, y: 180, label: "税章巨像", point: "企业所得税", hp: 150, attack: 17, exp: 110, gold: 80 }
  ];

  const LAW_BUILDING_REGIONS = [
    { y0: 8, y1: 19, x0: 24, x1: 35 },
    { y0: 4, y1: 9, x0: 8, x1: 14 },
    { y0: 4, y1: 9, x0: 44, x1: 50 },
    { y0: 24, y1: 29, x0: 8, x1: 14 },
    { y0: 24, y1: 29, x0: 44, x1: 50 }
  ];

  function buildLawMapGrid() {
    const grid = [];
    for (let y = 0; y < MAP_H; y++) {
      grid.push(new Array(MAP_W).fill(0));
    }

    for (const region of LAW_BUILDING_REGIONS) {
      for (let y = region.y0; y <= region.y1; y++) {
        for (let x = region.x0; x <= region.x1; x++) {
          grid[y][x] = 5;
        }
      }
    }

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (grid[y][x] !== 0) continue;
        if (x >= 10 && x <= 20 && y >= 15 && y <= 16) grid[y][x] = 2;
        if (x === 26 && y >= 20 && y <= 23) grid[y][x] = 1;
        if ((y === 22 || y === 23) && x >= 8 && x <= 50) grid[y][x] = 1;
        if ((x * 29 + y * 17) % 41 === 0) grid[y][x] = 3;
      }
    }

    const doors = [
      { y: 20, x: 30 },
      { y: 10, x: 11 },
      { y: 10, x: 47 },
      { y: 30, x: 11 },
      { y: 30, x: 47 }
    ];
    for (const door of doors) {
      grid[door.y][door.x] = 7;
      if (door.y + 1 < MAP_H) grid[door.y + 1][door.x] = 0;
    }

    return grid;
  }

  const lawMapGrid = buildLawMapGrid();

  const LAW_ENTITIES = [
    { id: "law_gate_back", type: "zone_gate", x: 520, y: 410, label: "返回税率荒原", target: "tax_wasteland" },
    { id: "law_gate_strategy", type: "zone_gate", x: 760, y: 400, label: "战略星塔入口", target: "strategy_star" },
    { id: "law_npc", type: "npc", x: 430, y: 340, label: "法务官", text: "法条神殿的合同魔像和破产幽灵会扭曲法律条文。肃清它们后，法槌裁决者会现身。", name: "法务官" },
    { id: "law_chest", type: "chest", x: 650, y: 300, label: "法条战利箱", reward: 90 },
    { id: "law_stone", type: "stone", x: 250, y: 300, label: "合同法碑", point: "合同法", tip: "合同通常经要约和承诺两个阶段成立。合同内容违反强制性规定的，可能无效。" },
    { id: "door_law_contract", type: "door", x: 560, y: 360, label: "合同审查厅", target: "law_contract" },
    { id: "door_law_securities", type: "door", x: 680, y: 360, label: "证券法讲堂", target: "law_securities" },
    { id: "door_law_bankruptcy", type: "door", x: 480, y: 380, label: "破产法庭", target: "law_bankruptcy" },
    { id: "law_monster_1", type: "monster", x: 680, y: 220, label: "合同魔像", point: "合同法", hp: 66, attack: 15, exp: 52, gold: 38 },
    { id: "law_monster_2", type: "monster", x: 220, y: 420, label: "破产幽灵", point: "破产法", hp: 62, attack: 14, exp: 48, gold: 36 },
    { id: "law_boss", type: "boss", x: 120, y: 180, label: "法槌裁决者", point: "证券法", hp: 160, attack: 18, exp: 120, gold: 90 }
  ];

  const STRATEGY_BUILDING_REGIONS = [
    { y0: 8, y1: 19, x0: 24, x1: 35 },
    { y0: 4, y1: 9, x0: 8, x1: 14 },
    { y0: 4, y1: 9, x0: 44, x1: 50 },
    { y0: 24, y1: 29, x0: 8, x1: 14 },
    { y0: 24, y1: 29, x0: 44, x1: 50 }
  ];

  function buildStrategyMapGrid() {
    const grid = [];
    for (let y = 0; y < MAP_H; y++) {
      grid.push(new Array(MAP_W).fill(0));
    }

    for (const region of STRATEGY_BUILDING_REGIONS) {
      for (let y = region.y0; y <= region.y1; y++) {
        for (let x = region.x0; x <= region.x1; x++) {
          grid[y][x] = 5;
        }
      }
    }

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (grid[y][x] !== 0) continue;
        if (x >= 10 && x <= 20 && y >= 15 && y <= 16) grid[y][x] = 2;
        if (x === 26 && y >= 20 && y <= 23) grid[y][x] = 1;
        if ((y === 22 || y === 23) && x >= 8 && x <= 50) grid[y][x] = 1;
        if ((x * 31 + y * 19) % 47 === 0) grid[y][x] = 3;
      }
    }

    const doors = [
      { y: 20, x: 30 },
      { y: 10, x: 11 },
      { y: 10, x: 47 },
      { y: 30, x: 11 },
      { y: 30, x: 47 }
    ];
    for (const door of doors) {
      grid[door.y][door.x] = 7;
      if (door.y + 1 < MAP_H) grid[door.y + 1][door.x] = 0;
    }

    return grid;
  }

  const strategyMapGrid = buildStrategyMapGrid();

  const STRATEGY_ENTITIES = [
    { id: "strategy_gate_back", type: "zone_gate", x: 520, y: 410, label: "返回法条神殿", target: "law_temple" },
    { id: "strategy_npc", type: "npc", x: 430, y: 340, label: "战略官", text: "战略星塔的迷雾兽和并购巨像会扰乱决策。肃清它们后，并购霸主会挡住通往最终试炼的路。", name: "战略官" },
    { id: "strategy_chest", type: "chest", x: 650, y: 300, label: "战略战利箱", reward: 100 },
    { id: "strategy_stone", type: "stone", x: 250, y: 300, label: "SWOT碑", point: "SWOT", tip: "SWOT 分析结合优势、劣势、机会和威胁，是制定战略的基础工具。" },
    { id: "door_strategy_sandbox", type: "door", x: 560, y: 360, label: "战略沙盘厅", target: "strategy_sandbox" },
    { id: "door_strategy_five", type: "door", x: 680, y: 360, label: "五力决策室", target: "strategy_five" },
    { id: "door_strategy_ma", type: "door", x: 480, y: 380, label: "并购实验室", target: "strategy_ma" },
    { id: "strategy_monster_1", type: "monster", x: 680, y: 220, label: "战略迷雾兽", point: "SWOT", hp: 68, attack: 16, exp: 56, gold: 40 },
    { id: "strategy_monster_2", type: "monster", x: 220, y: 420, label: "并购巨像", point: "并购战略", hp: 64, attack: 15, exp: 52, gold: 38 },
    { id: "strategy_boss", type: "boss", x: 120, y: 180, label: "并购霸主", point: "并购战略", hp: 170, attack: 19, exp: 130, gold: 100 },
    { id: "final_boss", type: "boss", x: 480, y: 220, label: "六域失衡之主", point: "六域平衡", hp: 260, attack: 20, exp: 300, gold: 200 }
  ];

  function tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return 3;
    return getCurrentMapGrid()[ty][tx];
  }

  function isWalkableTile(tx, ty) {
    const code = tileAt(tx, ty);
    return code === 0 || code === 1 || code === 3 || code === 4 || code === 6 || code === 7;
  }

  function isWalkablePixel(x, y) {
    return isWalkableTile(Math.floor(x / TILE), Math.floor(y / TILE));
  }

  function getTileSource(code, x, y) {
    if (code === 0) {
      const variants = [
        { col: 0, row: 0 },
        { col: 1, row: 0 },
        { col: 0, row: 0 }
      ];
      return variants[(x + y) % variants.length];
    }
    if (code === 1) {
      const variants = [
        { col: 0, row: 1 },
        { col: 1, row: 1 },
        { col: 0, row: 2 },
        { col: 1, row: 2 }
      ];
      return variants[(x * 3 + y) % variants.length];
    }
    if (code === 2) {
      const variants = [
        { col: 0, row: 4 },
        { col: 1, row: 4 },
        { col: 0, row: 5 },
        { col: 1, row: 5 }
      ];
      return variants[(x + y) % variants.length];
    }
    if (code === 4) {
      const variants = [
        { col: 2, row: 0 },
        { col: 3, row: 0 },
        { col: 9, row: 0 },
        { col: 11, row: 0 }
      ];
      return variants[(x * 5 + y * 3) % variants.length];
    }
    if (code === 6) return { col: 7, row: 3 };
    if (code === 3) {
      const variants = [
        { col: 4, row: 0 },
        { col: 5, row: 0 },
        { col: 7, row: 0 }
      ];
      return variants[(x + y) % variants.length];
    }
    if (code === 7) return { col: 1, row: 0 };
    return null;
  }

  function getFormalTileSource(code, x, y) {
    if (code === 0) {
      const variants = [
        { tx: 9, ty: 6 },
        { tx: 1, ty: 4 },
        { tx: 4, ty: 4 }
      ];
      return variants[(x + y) % variants.length];
    }
    if (code === 1) {
      const variants = [
        { tx: 1, ty: 4 },
        { tx: 4, ty: 4 },
        { tx: 1, ty: 5 },
        { tx: 2, ty: 5 }
      ];
      return variants[(x * 2 + y) % variants.length];
    }
    if (code === 2) {
      const variants = [
        { tx: 7, ty: 8 },
        { tx: 8, ty: 8 },
        { tx: 7, ty: 9 }
      ];
      return variants[(x + y) % variants.length];
    }
    if (code === 3 || code === 4) {
      const variants = [
        { tx: 4, ty: 7 },
        { tx: 5, ty: 7 },
        { tx: 6, ty: 7 }
      ];
      return variants[(x * 3 + y) % variants.length];
    }
    if (code === 6) return { tx: 4, ty: 7 };
    if (code === 7) return { tx: 1, ty: 8 };
    return null;
  }

  function drawFormalTile(tx, ty, dx, dy) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(assets.formalTileset, tx * TILE, ty * TILE, TILE, TILE, dx, dy, TILE, TILE);
  }

  function drawFormalTileScaled(tx, ty, dx, dy, scale = 3) {
    if (!assets.formalTileset) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(assets.formalTileset, tx * TILE, ty * TILE, TILE, TILE, dx, dy, TILE * scale, TILE * scale);
  }

  function drawTileMap() {
    if (!assets.tinyTilemap) {
      drawSceneCover();
      return;
    }
    const officialOverlay = state.zone === "gold_field" && !!assets.scene;
    const formalMode = !officialOverlay && !!assets.formalTileset;
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const code = getCurrentMapGrid()[y][x];
        if (officialOverlay && (code === 3 || code === 5)) continue;
        const baseCode = code === 5 ? 1 : code;
        const px = x * TILE;
        const py = y * TILE;
        if (formalMode) {
          const fsrc = getFormalTileSource(baseCode, x, y);
          if (fsrc) drawFormalTile(fsrc.tx, fsrc.ty, px, py);
        } else {
          const src = getTileSource(baseCode, x, y);
          if (!src) continue;
          ctx.drawImage(assets.tinyTilemap, src.col * 17, src.row * 17, TILE, TILE, px, py, TILE, TILE);
        }
        if (code === 2) {
          ctx.fillStyle = "rgba(255,255,255,0.2)";
          const phase = (Date.now() / 280 + x + y) % 4;
          ctx.fillRect(px + phase, py + 11, 3, 2);
          ctx.fillRect(px + 9, py + 4, 3, 2);
        }
      }
    }
    if (formalMode) drawFormalBuildings();
    else if (!officialOverlay) drawKenneyBuildings();
  }

  function drawTinyTile(col, row, dx, dy, scale = 1) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(assets.tinyTilemap, col * 17, row * 17, TILE, TILE, dx, dy, TILE * scale, TILE * scale);
  }

  function drawKenneyBuildings() {
    if (!assets.tinyTilemap) return;
    ctx.imageSmoothingEnabled = false;
    for (const region of getCurrentBuildingRegions()) {
      const width = region.x1 - region.x0 + 1;
      const houseCount = Math.max(1, Math.min(3, Math.floor(width / 3)));
      const step = Math.floor(width / houseCount);
      const roofY = region.y0 * TILE;
      const wallY = roofY + TILE;
      for (let i = 0; i < houseCount; i++) {
        const hx = (region.x0 + i * step) * TILE;
        drawTinyTile(4, 5, hx, roofY);
        drawTinyTile(5, 5, hx + TILE, roofY);
        drawTinyTile(0, 7, hx, wallY);
        drawTinyTile(1, 7, hx + TILE, wallY);
      }
    }
  }

  function drawFormalBuildings() {
    if (!assets.formalTileset) return;
    ctx.imageSmoothingEnabled = false;
    for (const region of getCurrentBuildingRegions()) {
      const width = region.x1 - region.x0 + 1;
      const buildingCount = Math.max(1, Math.min(3, Math.floor(width / 3)));
      const step = Math.floor(width / buildingCount);
      const y0 = region.y0 * TILE;
      for (let i = 0; i < buildingCount; i++) {
        const hx = (region.x0 + i * step) * TILE;
        drawFormalTile(0, 8, hx, y0);
        drawFormalTile(1, 8, hx + TILE, y0);
        drawFormalTile(2, 8, hx, y0 + TILE);
        drawFormalTile(3, 8, hx + TILE, y0 + TILE);
      }
    }
  }

  function drawPixelTree(px, py) {
    ctx.fillStyle = "rgba(30, 20, 10, 0.16)";
    ctx.fillRect(px + 3, py + 11, 10, 3);
    ctx.fillStyle = "#6b4327";
    ctx.fillRect(px + 6, py + 7, 4, 7);
    ctx.fillStyle = "#2f642d";
    ctx.fillRect(px + 2, py + 2, 12, 8);
    ctx.fillStyle = "#4a8740";
    ctx.fillRect(px + 5, py, 6, 5);
  }

  function drawPixelFlower(px, py) {
    ctx.fillStyle = "#3f7439";
    ctx.fillRect(px + 6, py + 8, 2, 5);
    ctx.fillStyle = "#e46b5f";
    ctx.fillRect(px + 4, py + 4, 3, 3);
    ctx.fillStyle = "#eec45f";
    ctx.fillRect(px + 9, py + 5, 3, 3);
  }

  function drawPixelHouse(px, py) {
    ctx.fillStyle = "rgba(30, 20, 10, 0.18)";
    ctx.fillRect(px + 3, py + 12, 10, 3);
    ctx.fillStyle = "#8f5a33";
    ctx.fillRect(px + 3, py + 6, 10, 8);
    ctx.fillStyle = "#7d3d2a";
    ctx.fillRect(px + 2, py + 2, 12, 6);
    ctx.fillStyle = "#a84d33";
    ctx.fillRect(px + 5, py, 6, 4);
    ctx.fillStyle = "#f5d59a";
    ctx.fillRect(px + 6, py + 8, 3, 3);
  }

  function drawPixelField(px, py) {
    ctx.fillStyle = "#c89514";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(px + 2 + i * 4, py + 5, 2, 8);
    }
    ctx.fillStyle = "#f2c95f";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(px + 1 + i * 4, py + 3, 3, 4);
    }
  }

  function normalizeEntityPositions() {
    entities.forEach((e) => {
      if (isWalkablePixel(e.x + 8, e.y + 8)) return;
      const cx = Math.floor((e.x + 8) / TILE);
      const cy = Math.floor((e.y + 8) / TILE);
      for (let r = 1; r <= 6; r++) {
        let placed = false;
        for (let dy = -r; dy <= r && !placed; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const tx = cx + dx;
            const ty = cy + dy;
            if (isWalkableTile(tx, ty)) {
              e.x = tx * TILE + 8;
              e.y = ty * TILE + 8;
              placed = true;
              break;
            }
          }
        }
        if (placed) break;
      }
    });
  }

  function isSystemUnlocked(key) {
    if (state._unlockAll) return true;
    const level = SYSTEM_UNLOCK_LEVELS[key];
    return level === undefined || (state.player.level || 1) >= level;
  }

  function systemLockTip(key, label) {
    return `${label} Lv.${SYSTEM_UNLOCK_LEVELS[key] || 0}`;
  }

  function isBossDefeated(entity) {
    if (!entity || entity.type !== "boss") return false;
    if (entity.id === "boss_1") return !!state.bossKilled;
    if (entity.id === "final_boss") return !!state.gameCompleted;
    const flag = ZONE_BOSS_STATE[entity.id];
    return flag ? !!state[flag] : false;
  }

  function isBossUnlocked(entity) {
    if (!entity || entity.type !== "boss") return false;
    if (entity.id === "boss_1") return true;
    if (entity.id === "final_boss") return !!state.strategyCleared;
    const flag = REGION_CLEARED_FLAG[entity.id];
    return flag ? !!state[flag] : true;
  }

  function menuButton(label, action, key) {
    const unlocked = !key || isSystemUnlocked(key);
    const text = key && !unlocked ? `${label}（Lv.${SYSTEM_UNLOCK_LEVELS[key]}）` : label;
    return `<button class="pixel-btn secondary" data-action="${action}" ${unlocked ? "" : "disabled"}>${text}</button>`;
  }

  function getCurrentJob() {
    return JOBS[state.jobs.current] || JOBS.accountant;
  }

  function getJobBonus(type) {
    const job = getCurrentJob();
    return job[type] || 0;
  }

  function getWeaponAtk() {
    return state.weapon.atk + (state.equipmentLevels.weapon || 0) * 2;
  }

  function getArmorDef() {
    return state.armor.def + (state.equipmentLevels.armor || 0);
  }

  function getCurrentJobSkills() {
    const job = getCurrentJob();
    return job.skills.map((id) => ALL_SKILLS[id]).filter(Boolean);
  }

  function getPlanQuestions(count) {
    const subjects = state.plan.subjects && state.plan.subjects.length
      ? state.plan.subjects
      : Object.keys(PLAN_SUBJECT_POINTS);
    const points = subjects.flatMap((subject) => PLAN_SUBJECT_POINTS[subject] || []);
    const pool = points.length ? QUESTIONS.filter((q) => points.includes(q.point)) : QUESTIONS;
    const source = pool.length ? pool : QUESTIONS;
    return [...source].sort(() => Math.random() - 0.5).slice(0, Math.max(1, count));
  }

  function getSmartReviewQuestions(count) {
    const now = Date.now();
    const wrongIds = state.wrongQuestions || [];
    const due = wrongIds
      .map((id) => QUESTIONS.find((q) => q.id === id))
      .filter(Boolean)
      .filter((q) => {
        const rec = state.reviewMap[q.id];
        return !rec || !rec.next || rec.next <= now;
      });
    const pool = due.length ? due : wrongIds.map((id) => QUESTIONS.find((q) => q.id === id)).filter(Boolean);
    if (pool.length < count) {
      const weak = [...POINTS]
        .sort((a, b) => (state.pointProgress[a] || 0) - (state.pointProgress[b] || 0))
        .flatMap((point) => QUESTIONS.filter((q) => q.point === point))
        .filter((q) => !pool.some((x) => x.id === q.id));
      pool.push(...weak);
    }
    const source = pool.length ? pool : QUESTIONS;
    return [...source].sort(() => Math.random() - 0.5).slice(0, Math.max(1, count));
  }

  function pointSubject(point) {
    for (const [subject, points] of Object.entries(PLAN_SUBJECT_POINTS)) {
      if (points.includes(point)) return subject;
    }
    return "综合";
  }

  function getMonsterType(id) {
    if (id === "monster_1") return "paper_crane";
    if (id === "monster_2") return "ink_blob";
    if (id === "monster_3") return "abacus_golem";
    if (id === "boss_1") return "merge_giant";
    if (id === "audit_monster_1") return "trial_ghost";
    if (id === "audit_monster_2") return "ink_blob";
    if (id === "capital_monster_1") return "abacus_golem";
    if (id === "capital_monster_2") return "trial_ghost";
    if (id === "tax_monster_1") return "merge_giant";
    if (id === "tax_monster_2") return "paper_crane";
    if (id === "law_monster_1") return "trial_ghost";
    if (id === "law_monster_2") return "merge_giant";
    if (id === "strategy_monster_1") return "paper_crane";
    if (id === "strategy_monster_2") return "merge_giant";
    if (id === "audit_boss") return "trial_ghost";
    if (id === "capital_boss") return "abacus_golem";
    if (id === "tax_boss") return "merge_giant";
    if (id === "law_boss") return "trial_ghost";
    if (id === "strategy_boss") return "merge_giant";
    if (id === "final_boss") return "final_boss";
    return "paper_crane";
  }

  function getActiveEntities() {
    if (state.room) {
      return [...(ROOM_ENTITIES[state.room] || []), ROOM_EXIT];
    }
    if (state.zone === "audit_tower") return AUDIT_ENTITIES;
    if (state.zone === "capital_forest") return CAPITAL_ENTITIES;
    if (state.zone === "tax_wasteland") return TAX_ENTITIES;
    if (state.zone === "law_temple") return LAW_ENTITIES;
    if (state.zone === "strategy_star") return STRATEGY_ENTITIES;
    return entities;
  }

  function playerBody(x, y) {
    return { x: x - 8, y: y - 12, w: 16, h: 20 };
  }

  function entityBody(e) {
    if (e.type === "npc" || e.type === "monster" || e.type === "boss") {
      return { x: e.x - 12, y: e.y - 16, w: 24, h: 28 };
    }
    if (e.type === "landmark") {
      return { x: e.x - 20, y: e.y - 20, w: 40, h: 44 };
    }
    if (e.type === "portal") {
      return { x: e.x - 12, y: e.y - 12, w: 24, h: 24 };
    }
    return null;
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function canMoveTo(x, y) {
    if (x < 8 || y < 8 || x > W - 8 || y > H - 8) return false;
    const body = playerBody(x, y);
    if (!state.room) {
      const probes = [
        [body.x, body.y],
        [body.x + body.w, body.y],
        [body.x, body.y + body.h],
        [body.x + body.w, body.y + body.h]
      ];
      for (const [px, py] of probes) {
        const code = tileAt(Math.floor(px / TILE), Math.floor(py / TILE));
        if (code === 2 || code === 5) return false;
      }
    }
    for (const ob of SCENE_OBSTACLES) {
      if (rectsOverlap(body, ob)) return false;
    }
    for (const e of getActiveEntities()) {
      const eb = entityBody(e);
      if (!eb) continue;
      if (e.type === "chest" && state.openedChests.includes(e.id)) continue;
      if (e.type === "monster" && (state.monstersKilledIds || []).includes(e.id)) continue;
      if (e.type === "boss" && (!isBossUnlocked(e) || isBossDefeated(e))) continue;
      if (rectsOverlap(body, eb)) return false;
    }
    return true;
  }

  const keys = {};
  const touch = { up: false, down: false, left: false, right: false };
  const mapEffects = [];
  let lastTime = 0;
  let audioCtx = null;
  let bgmTimer = null;
  let bgmAudio = null;
  let bgmStep = 0;

  const BGM_NOTES = [261.63, 329.63, 392, 329.63, 293.66, 329.63, 261.63, 220];
  const BGM_MAP = "assets/audio/kenney_music-jingles/Audio/8-Bit jingles/jingles_NES02.ogg";
  const BGM_BATTLE = "assets/audio/kenney_music-jingles/Audio/8-Bit jingles/jingles_NES08.ogg";

  const KENNEY_SFX = {
    click: "assets/audio/kenney_ui-audio/Audio/click1.ogg",
    switch: "assets/audio/kenney_ui-audio/Audio/switch1.ogg",
    hover: "assets/audio/kenney_ui-audio/Audio/rollover1.ogg",
    door: "assets/audio/kenney_rpg-audio/Audio/doorOpen_1.ogg",
    doorClose: "assets/audio/kenney_rpg-audio/Audio/doorClose_1.ogg",
    chest: "assets/audio/kenney_rpg-audio/Audio/metalLatch.ogg",
    collect: "assets/audio/kenney_rpg-audio/Audio/handleSmallLeather.ogg",
    gold: "assets/audio/kenney_rpg-audio/Audio/handleCoins.ogg",
    book: "assets/audio/kenney_rpg-audio/Audio/bookOpen.ogg",
    hit: "assets/audio/kenney_rpg-audio/Audio/metalClick.ogg",
    skill: "assets/audio/kenney_rpg-audio/Audio/knifeSlice.ogg",
    item: "assets/audio/kenney_rpg-audio/Audio/handleCoins2.ogg",
    correct: "assets/audio/kenney_ui-audio/Audio/click3.ogg",
    wrong: "assets/audio/kenney_rpg-audio/Audio/creak2.ogg",
    craft: "assets/audio/kenney_rpg-audio/Audio/chop.ogg",
    enhance: "assets/audio/kenney_rpg-audio/Audio/metalClick.ogg",
    footstep: "assets/audio/kenney_rpg-audio/Audio/footstep00.ogg",
    levelup: "assets/audio/kenney_music-jingles/Audio/Hit jingles/jingles_HIT00.ogg",
    win: "assets/audio/kenney_music-jingles/Audio/8-Bit jingles/jingles_NES00.ogg"
  };

  function ensureAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, duration, type = "square", gain = 0.035, when = 0) {
    if (!state.soundEnabled || state.settings.sfxEnabled === false) return;
    try {
      const ctx = ensureAudio();
      const vol = gain * state.settings.volume * state.settings.sfxVolume;
      const t = ctx.currentTime + when;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + duration + 0.02);
    } catch (e) {
      // audio unavailable
    }
  }

  const audioCache = {};
  const BGM_BY_ZONE = {
    gold_field: "assets/audio/kenney_music-jingles/Audio/8-Bit jingles/jingles_NES02.ogg",
    audit_tower: "assets/audio/kenney_music-jingles/Audio/8-Bit jingles/jingles_NES08.ogg",
    capital_forest: "assets/audio/kenney_music-jingles/Audio/8-Bit jingles/jingles_NES04.ogg",
    tax_wasteland: "assets/audio/kenney_music-jingles/Audio/8-Bit jingles/jingles_NES06.ogg",
    law_temple: "assets/audio/kenney_music-jingles/Audio/8-Bit jingles/jingles_NES10.ogg",
    strategy_star: "assets/audio/kenney_music-jingles/Audio/8-Bit jingles/jingles_NES12.ogg"
  };

  function playKenneySfx(kind) {
    if (!state.soundEnabled || state.settings.sfxEnabled === false) return false;
    const src = KENNEY_SFX[kind];
    if (!src) return false;
    try {
      if (!audioCache[kind]) {
        const cached = new Audio(src);
        cached.preload = "auto";
        audioCache[kind] = cached;
      }
      const audio = audioCache[kind];
      audio.currentTime = 0;
      audio.volume = Math.max(0.06, (state.settings.volume || 0.8) * (state.settings.sfxVolume || 0.8) * 0.65);
      const playPromise = audio.play();
      if (playPromise && playPromise.catch) playPromise.catch(() => {});
      return true;
    } catch (e) {
      return false;
    }
  }

  function sfx(kind) {
    if (playKenneySfx(kind)) return;
    if (kind === "click") tone(520, 0.06, "square", 0.02);
    else if (kind === "hit") tone(180, 0.12, "sawtooth", 0.035);
    else if (kind === "correct") {
      tone(523.25, 0.12, "square", 0.035);
      tone(659.25, 0.16, "square", 0.035, 0.1);
    } else if (kind === "wrong") {
      tone(220, 0.2, "sawtooth", 0.03);
      tone(160, 0.25, "sawtooth", 0.03, 0.08);
    } else if (kind === "gold") {
      tone(880, 0.08, "square", 0.03);
      tone(1320, 0.1, "square", 0.03, 0.07);
    } else if (kind === "levelup") {
      [392, 523.25, 659.25, 783.99].forEach((f, i) => tone(f, 0.18, "triangle", 0.04, i * 0.12));
    } else if (kind === "win") {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.22, "triangle", 0.04, i * 0.14));
    }
  }

  function playBgm(src) {
    if (!state.soundEnabled || state.settings.musicEnabled === false) return;
    if (bgmAudio && bgmAudio.src && bgmAudio.src.endsWith(src)) {
      if (bgmAudio.paused) bgmAudio.play().catch(() => {});
      return;
    }
    stopBgm();
    try {
      bgmAudio = new Audio(src);
      bgmAudio.loop = true;
      bgmAudio.volume = Math.max(0.08, (state.settings.volume || 0.8) * (state.settings.musicVolume || 0.5) * 0.55);
      const promise = bgmAudio.play();
      if (promise && promise.catch) promise.catch(() => {});
    } catch (e) {
      // audio unavailable
    }
  }

  function startBgm() {
    playZoneBgm(state.zone || "gold_field");
  }

  function playZoneBgm(zone) {
    playBgm(BGM_BY_ZONE[zone] || BGM_MAP);
  }

  function stopBgm() {
    if (bgmTimer) {
      clearInterval(bgmTimer);
      bgmTimer = null;
    }
    if (bgmAudio) {
      try {
        bgmAudio.pause();
      } catch (e) {
        // ignore
      }
      bgmAudio = null;
    }
  }

  function updateLoadingProgress() {
    const pct = Math.min(100, Math.round((loadedAssets / TOTAL_LOAD_STEPS) * 100));
    if (loadingBar) loadingBar.style.width = pct + "%";
    if (loadingHint) loadingHint.textContent = pct + "%";
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        loadedAssets += 1;
        updateLoadingProgress();
        document.body.dataset.sunnyside = "ok";
        resolve(img);
      };
      img.onerror = () => {
        document.body.dataset.sunnyside = "fail";
        reject(new Error("load failed: " + src));
      };
      img.src = src;
    });
  }

  async function loadAssets() {
    const base = "assets/sunnyside/";
    assets.scene = await loadImage(base + "scene.png");
    assets.tileset = await loadImage(base + "tileset.png");
    assets.tinyTilemap = await loadImage("assets/tiles/kenney_tiny_town/Tilemap/tilemap.png");
    assets.formalTileset = await loadImage("assets/tiles/formal_dungeon.png");
    assets.interior = await loadImage("assets/rooms/interior.png");
    assets.interiorTileset = await loadImage("assets/rooms/interior_tileset.png");
    const battleBgs = {
      gold_field: "assets/battle_bg/gold_field.png",
      audit_archive: "assets/battle_bg/audit_archive.png",
      lake_field: "assets/battle_bg/lake_field.png",
      bright_wild: "assets/battle_bg/bright_wild.png",
      town_court: "assets/battle_bg/town_court.png"
    };
    for (const [key, src] of Object.entries(battleBgs)) {
      assets.battleBgs[key] = await loadImage(src);
    }
    assets.playerIdle = await loadImage(base + "chars/player_idle.png");
    assets.playerWalk = await loadImage(base + "chars/player_walk.png");
    assets.playerSword = await loadImage(base + "chars/player_sword.png");
    assets.goblinIdle = await loadImage(base + "monsters/goblin_idle.png");
    assets.goblinAttack = await loadImage(base + "monsters/goblin_attack.png");
    const propFiles = {
      chest: "chest.png",
      chestOpen: "chest_open.png",
      coin: "coin.png",
      peaks: "peaks.png",
      flask: "flask.png",
      box: "box.png",
      torch: "torch.png"
    };
    for (const [key, file] of Object.entries(propFiles)) {
      assets.props[key] = await loadImage("assets/props/" + file);
    }
    assets.dust = await loadImage("assets/effects/dust.png");
    assets.dust._frameWidth = 16;
    assets.dust._frames = 9;
    for (const jobId of Object.keys(JOBS)) {
      assets.playerSheets[jobId] = await loadImage("assets/characters/player_" + jobId + ".png");
    }
    for (const monsterId of Object.keys(MONSTER_SPRITE)) {
      const monsterAssetId = MONSTER_SPRITE[monsterId] || monsterId;
      assets.monsterSheets[monsterId] = await loadImage("assets/monsters/monster_" + monsterAssetId + ".png");
    }
    assets.playerIdle._box = { x: 42, y: 21, w: 13, h: 18 };
    assets.playerWalk._box = { x: 42, y: 22, w: 13, h: 17 };
    assets.playerSword._box = { x: 38, y: 20, w: 17, h: 19 };
    assets.goblinIdle._box = { x: 39, y: 23, w: 18, h: 16 };
    assets.goblinAttack._box = { x: 38, y: 20, w: 19, h: 19 };
    assets.playerIdle._frameWidth = 96;
    assets.playerIdle._frames = 9;
    assets.playerWalk._frameWidth = 96;
    assets.playerWalk._frames = 8;
    assets.playerSword._frameWidth = 96;
    assets.playerSword._frames = 10;
    assets.goblinIdle._frameWidth = 96;
    assets.goblinIdle._frames = 8;
    assets.goblinAttack._frameWidth = 96;
    assets.goblinAttack._frames = 9;
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === "object" && (!parsed.saveVersion || parsed.saveVersion < 3)) {
        parsed.saveVersion = 3;
      }
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function save() {
    try {
      state.saveVersion = 3;
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
      // storage unavailable
    }
  }

  function resetSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      // ignore
    }
    state = defaultState();
  }

  function openModal(html) {
    modal.innerHTML = html;
    modal.classList.remove("hidden");
    if (state.screen === "battle") modal.classList.add("battle-mode");
    else modal.classList.remove("battle-mode");
    decorateModalButtons();
  }

  function closeModal() {
    hideTooltip();
    modal.classList.add("hidden");
    modal.classList.remove("battle-mode");
    modal.innerHTML = "";
    if (state._pendingMainStory) setTimeout(flushPendingStory, 120);
  }

  const ACTION_TIP = {
    start: "<b>开始新冒险</b><br>创建新存档并进入新手引导",
    continue: "<b>继续冒险</b><br>读取当前自动保存的进度",
    about: "<b>关于</b><br>查看版本、构建和素材说明",
    check_update: "<b>检查更新</b><br>通过 version.json 检查是否有新版本",
    close: "<b>返回</b><br>关闭当前窗口",
    battle_attack: "<b>攻击</b><br>普通伤害，有一定概率触发暴击",
    battle_skill: "<b>技能</b><br>触发 CPA 知识题，答对后伤害大幅提升",
    battle_item: "<b>药水</b><br>回复 HP/MP，使用后轮到怪物攻击",
    battle_run: "<b>逃跑</b><br>70% 概率离开战斗",
    quiz_continue: "<b>继续</b><br>确认答题结果并返回战斗",
    skill_use: "<b>使用技能</b><br>进入对应考点知识试炼",
    use_item: "<b>使用道具</b><br>在战斗内恢复状态",
    world_map: "<b>世界地图</b><br>查看六区域并传送",
    tasks: "<b>任务</b><br>查看主线与支线进度",
    equip: "<b>装备与技能</b><br>查看职业、装备和技能",
    skill_tree: "<b>技能树</b><br>按层级查看职业技能",
    craft: "<b>打造</b><br>使用材料制作装备或药水",
    enhance: "<b>强化</b><br>消耗材料提升装备",
    achievements: "<b>成就</b><br>查看已完成和待解锁成就",
    partner: "<b>伙伴</b><br>查看伙伴等级、好感与技能",
    challenge: "<b>复习挑战</b><br>错题专练、薄弱点专练和模拟考",
    plan: "<b>学习计划</b><br>设置每日题量和科目偏好",
    plan_target: "<b>每日目标</b><br>调整学习计划每天完成的题量",
    plan_subject: "<b>科目偏好</b><br>切换学习计划抽取题目的科目范围",
    weekly_report: "<b>学习周报</b><br>查看本周答题、正确率、最强科目和时长",
    download_weekly: "<b>下载周报</b><br>生成学习周报图片并保存",
    point_map: "<b>考纲导航</b><br>按科目查看考点并针对性答题",
    point_quiz: "<b>考点练习</b><br>开始一道当前考点的题目",
    job_quiz: "<b>职业推荐</b><br>通过偏好题推荐适合你的 CPA 职业",
    job_quiz_answer: "<b>选择答案</b><br>根据偏好累计职业得分",
    job_recommend_continue: "<b>确认推荐</b><br>进入装备与技能查看推荐职业",
    book: "<b>错题本</b><br>按考点复习错题",
    report: "<b>学习报告</b><br>查看正确率、考纲覆盖和薄弱点",
    settings: "<b>设置</b><br>音频、存档和震动设置"
  };

  const UI_ICON_SRC = {
    sword: "assets/ui/rpgui/sword.png",
    axe: "assets/sunnyside/ui/axe.png",
    hammer: "assets/sunnyside/ui/hammer.png",
    confirm: "assets/ui/rpgui/checkbox-on.png",
    cancel: "assets/sunnyside/ui/cancel.png",
    left: "assets/sunnyside/ui/arrow_left.png",
    right: "assets/sunnyside/ui/arrow_right.png",
    cursor: "assets/sunnyside/ui/cursor_01.png"
  };

  function uiIcon(name) {
    const src = UI_ICON_SRC[name] || UI_ICON_SRC.confirm;
    return `<span class="ui-icon"><img src="${src}" alt=""></span>`;
  }

  function iconBtn(label, action, dataset = {}, opts = {}) {
    const attrs = Object.entries(dataset || {}).map(([k, v]) => `data-${k}="${v}"`).join(" ");
    const icon = opts.icon ? uiIcon(opts.icon) : "";
    return `<button class="pixel-btn ${opts.cls || ""}" data-action="${action}" ${attrs}${opts.disabled ? " disabled" : ""}>${icon}<span>${label}</span></button>`;
  }

  function iconForAction(action) {
    const map = {
      start: "confirm",
      continue: "right",
      about: "cursor",
      check_update: "cursor",
      close: "cancel",
      learn: "cursor",
      shop: "confirm",
      deliver_task: "confirm",
      npc_return: "cursor",
      boss_start: "sword",
      battle_attack: "sword",
      battle_skill: "hammer",
      battle_item: "confirm",
      battle_run: "cancel",
      battle_cancel: "cancel",
      skill_use: "hammer",
      use_item: "confirm",
      enhance: "hammer",
      enhance_item: "hammer",
      craft_item: "hammer",
      shop_buy: "confirm",
      switch_job: "sword",
      learn_skill: "cursor",
      job_story_continue: "confirm",
      challenge_start: "cursor",
      review_question: "cursor",
      quiz_continue: "confirm",
      toggle_sound: "confirm",
      toggle_music: "confirm",
      toggle_sfx: "confirm",
      toggle_shake: "cursor",
      volume_down: "left",
      volume_up: "right",
      music_down: "left",
      music_up: "right",
      sfx_down: "left",
      sfx_up: "right",
      preview_bgm: "cursor",
      test_sfx: "hammer",
      export_save: "confirm",
      import_save: "confirm",
      copy_save: "confirm",
      download_save: "confirm",
      import_save_confirm: "confirm",
      reset: "cancel",
      world_map: "right",
      partner: "confirm",
      challenge: "cursor",
      plan: "cursor",
      plan_target: "right",
      plan_subject: "confirm",
      point_map: "cursor",
      point_quiz: "confirm",
      job_quiz: "cursor",
      job_quiz_answer: "confirm",
      job_recommend_continue: "confirm",
      weekly_report: "cursor",
      download_weekly: "confirm",
      settings: "cursor",
      settings_back: "cancel",
      achievements: "confirm",
      tasks: "confirm",
      equip: "sword",
      skill_tree: "hammer",
      craft: "hammer",
      book: "cursor",
      report: "cursor",
      title: "cancel",
      story_next: "right"
    };
    return map[action] || "confirm";
  }

  function decorateModalButtons() {
    modal.querySelectorAll(".pixel-btn").forEach((btn) => {
      if (!btn.dataset.tip && ACTION_TIP[btn.dataset.action]) btn.dataset.tip = ACTION_TIP[btn.dataset.action];
      if (btn.querySelector(".ui-icon")) return;
      const icon = iconForAction(btn.dataset.action);
      btn.insertAdjacentHTML("afterbegin", uiIcon(icon));
    });
  }

  function showTooltip(content, x, y) {
    tooltip.innerHTML = content;
    tooltip.classList.remove("hidden");
    moveTooltip(x, y);
  }

  function moveTooltip(x, y) {
    const w = tooltip.offsetWidth || 260;
    const h = tooltip.offsetHeight || 60;
    tooltip.style.left = Math.max(8, Math.min(window.innerWidth - w - 10, x + 16)) + "px";
    tooltip.style.top = Math.max(8, Math.min(window.innerHeight - h - 10, y + 16)) + "px";
  }

  function hideTooltip() {
    tooltip.classList.add("hidden");
    tooltip.innerHTML = "";
  }

  function entityTooltip(entity) {
    if (entity.type === "monster") {
      return `<b>${entity.label}</b><br>弱点：${entity.point}<br>HP ${entity.hp} · 经验 ${entity.exp} · 金币 ${entity.gold}`;
    }
    if (entity.type === "boss") {
      return `<b>${entity.label}</b><br>BOSS · 弱点：${entity.point}<br>HP ${entity.hp} · 经验 ${entity.exp} · 金币 ${entity.gold}`;
    }
    if (entity.type === "npc") {
      return `<b>${entity.label}</b><br>按 E 对话或交付任务`;
    }
    if (entity.type === "chest") return `<b>${entity.label}</b><br>开启可获得金币或装备`;
    if (entity.type === "stone") return `<b>知识碑 · ${entity.point}</b><br>${entity.tip}`;
    if (entity.type === "collect") return `<b>${entity.label}</b><br>可采集材料`;
    if (entity.type === "door") return `<b>${entity.label}</b><br>进入室内场景`;
    if (entity.type === "portal") return `<b>${entity.label}</b><br>前往新区域`;
    if (entity.type === "sign" || entity.type === "landmark") return `<b>${entity.label}</b><br>${entity.text}`;
    return `<b>${entity.label}</b>`;
  }

  function enhanceBattleHud() {
    if (modal.querySelector(".battle-hp")) return;
    const b = state.battle;
    const hpPct = Math.max(0, Math.round((b.hp / b.maxHp) * 100));
    const text = modal.querySelector(".modal-text");
    if (!text) return;
    const hpBox = document.createElement("div");
    hpBox.className = "battle-hp";
    hpBox.innerHTML = `
      <div class="bar-label">${b.monster.label} HP</div>
      <div class="bar-track"><div class="bar-fill enemy-hp" style="width:${hpPct}%"></div></div>
      <div class="hp-number">${b.hp} / ${b.maxHp}</div>
    `;
    text.parentNode.insertBefore(hpBox, text);
  }

  function fadeAction(callback) {
    const el = document.getElementById("fadePanel");
    if (!el) {
      callback();
      return;
    }
    el.classList.add("show");
    setTimeout(() => {
      callback();
      setTimeout(() => el.classList.remove("show"), 130);
    }, 130);
  }

  function showToast(msg, ms = 1800) {
    if (showToast._t) clearTimeout(showToast._t);
    toast.classList.remove("achievement", "levelup");
    toast.textContent = msg;
    toast.classList.remove("hidden");
    showToast._t = setTimeout(() => toast.classList.add("hidden"), ms);
  }

  function showAchievementToast(a) {
    const reward = a.reward || {};
    const parts = [];
    if (reward.gold) parts.push(reward.gold + " 金币");
    if (reward.exp) parts.push(reward.exp + " 经验");
    if (reward.skillPoints) parts.push(reward.skillPoints + " 技能点");
    if (showToast._t) clearTimeout(showToast._t);
    toast.classList.add("achievement");
    toast.innerHTML = `
      <div class="toast-kicker">成就解锁 · ${a.type}</div>
      <div class="toast-name">${a.name}</div>
      <div class="toast-desc">${a.desc}${parts.length ? " · 奖励 " + parts.join("、") : ""}</div>
    `;
    toast.classList.remove("hidden");
    showToast._t = setTimeout(() => {
      toast.classList.add("hidden");
      toast.classList.remove("achievement");
      toast.textContent = "";
    }, 2800);
  }

  function showLevelUpToast(level) {
    if (showToast._t) clearTimeout(showToast._t);
    toast.classList.add("levelup");
    toast.innerHTML = `
      <div class="toast-kicker">LEVEL UP</div>
      <div class="toast-level">Lv.${level}</div>
      <div class="toast-desc">能力提升 · 属性增长 · 技能点 +1</div>
    `;
    toast.classList.remove("hidden");
    showToast._t = setTimeout(() => {
      toast.classList.add("hidden");
      toast.classList.remove("levelup");
      toast.textContent = "";
    }, 2600);
  }

  function drawSceneCover() {
    const img = assets.scene;
    const scale = Math.max(W / img.width, H / img.height);
    const sw = W / scale;
    const sh = H / scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, W, H);
  }

  function decorHash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967295;
  }

  function drawDecorations() {
    if (state.zone !== "gold_field") return;
    if (!assets.tinyTilemap) return;
    ctx.imageSmoothingEnabled = false;
    for (let ty = 3; ty < MAP_H - 3; ty++) {
      for (let tx = 3; tx < MAP_W - 3; tx++) {
        if (getCurrentMapGrid()[ty][tx] !== 0) continue;
        const r = decorHash(tx, ty);
        if (r > (state.lowQuality ? 0.022 : 0.045)) continue;
        const px = tx * TILE;
        const py = ty * TILE;
        const cx = px + 8;
        const cy = py + 8;
        let blocked = false;
        for (const e of entities) {
          if (Math.abs(e.x - cx) < 34 && Math.abs(e.y - cy) < 34) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          for (const ob of SCENE_OBSTACLES) {
            if (cx > ob.x - 20 && cx < ob.x + ob.w + 20 && cy > ob.y - 20 && cy < ob.y + ob.h + 20) {
              blocked = true;
              break;
            }
          }
        }
        if (blocked) continue;
        const variant = r < 0.012 ? "grass" : r < 0.024 ? "flower" : "bush";
        const list = DECOR_TILES[variant];
        const tile = list[Math.floor(decorHash(tx + 7, ty + 13) * list.length)];
        const sx = tile.col * 17;
        const sy = tile.row * 17;
        ctx.drawImage(assets.tinyTilemap, sx, sy, 16, 16, px + 4, py + 5, 20, 20);
      }
    }
  }

  function drawFrame(img, x, y, dw, dh, frame = 0) {
    ctx.imageSmoothingEnabled = false;
    const b = img._box || { x: 0, y: 0, w: 96, h: 64 };
    const sx = b.x + (img._frameWidth ? frame * img._frameWidth : 0);
    ctx.drawImage(img, sx, b.y, b.w, b.h, x, y, dw, dh);
  }

  function animFrame(img, fps = 8, maxFrames = 0) {
    const total = maxFrames || img._frames || 1;
    return Math.floor(performance.now() / (1000 / fps)) % total;
  }

  const JOB_TINT = {
    accountant: "rgba(212, 160, 23, 0.72)",
    auditor: "rgba(65, 105, 225, 0.72)",
    finance: "rgba(46, 139, 87, 0.72)",
    tax: "rgba(228, 87, 46, 0.72)",
    law: "rgba(107, 91, 149, 0.72)",
    strategy: "rgba(58, 143, 183, 0.72)"
  };

  const MONSTER_TINT = {
    paper_crane: "rgba(255, 214, 102, 0.62)",
    ink_blob: "rgba(70, 80, 140, 0.68)",
    abacus_golem: "rgba(184, 124, 62, 0.68)",
    trial_ghost: "rgba(154, 164, 220, 0.66)",
    merge_giant: "rgba(192, 72, 62, 0.66)",
    final_boss: "rgba(104, 62, 188, 0.74)"
  };

  function drawTintedFrame(img, x, y, w, h, frame, tint) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    drawFrame(img, x, y, w, h, frame);
    if (tint) {
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = tint;
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
  }

  function drawTintedEffect(img, frame, x, y, w, h, tint) {
    if (!img) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, frame * 16, 0, 16, img.height, x, y, w, h);
    if (tint) {
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = tint;
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();
  }

  function isPlayerMoving() {
    return Boolean(
      state.player.moveTarget ||
      keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight ||
      keys.w || keys.s || keys.a || keys.d ||
      keys.W || keys.S || keys.A || keys.D ||
      touch.up || touch.down || touch.left || touch.right
    );
  }

  function drawPlayerSprite(x, y, w, h) {
    const facing = state.player.facing || "down";
    const moving = isPlayerMoving();
    const img = moving ? assets.playerWalk : assets.playerIdle;
    const tint = JOB_TINT[state.jobs.current] || JOB_TINT.accountant;
    if (img && img._box) {
      const frame = animFrame(img, moving ? 9 : 4, moving ? 8 : 2);
      if (facing === "left" || facing === "right") {
        ctx.save();
        ctx.translate(x + w / 2, 0);
        ctx.scale(facing === "left" ? -1 : 1, 1);
        ctx.translate(-(x + w / 2), 0);
        drawTintedFrame(img, x, y, w, h, frame, tint);
        ctx.restore();
      } else {
        drawTintedFrame(img, x, y, w, h, frame, tint);
        if (facing === "up") {
          ctx.fillStyle = "rgba(20, 28, 42, 0.18)";
          ctx.fillRect(x + Math.round(w * 0.18), y + Math.round(h * 0.34), Math.round(w * 0.64), Math.round(h * 0.42));
        }
      }
      ctx.fillStyle = "rgba(30, 20, 10, 0.22)";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h - 2, w * 0.32, h * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    const sheet = assets.playerSheets[state.jobs.current] || assets.playerSheets.accountant;
    if (sheet) {
      const col = PLAYER_DIR_COL[facing] || 0;
      const row = moving ? Math.floor(performance.now() / 110) % 3 : 0;
      ctx.drawImage(sheet, col * 16, row * 16, 16, 16, x, y, w, h);
    }
  }

  function drawChest(x, y, opened) {
    const img = opened ? assets.props.chestOpen : assets.props.chest;
    if (img) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, 16, 16, x - 8, y - 20, 48, 48);
      return;
    }
    ctx.fillStyle = opened ? "rgba(30, 22, 16, 0.75)" : "rgba(30, 22, 16, 0.2)";
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 28, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = opened ? "#6f4a24" : "#8a5a2c";
    ctx.fillRect(x + 2, y + 8, 28, 20);
    ctx.fillStyle = opened ? "#5e3a1d" : "#b97b38";
    ctx.fillRect(x + 2, y + 8, 28, 6);
    ctx.fillStyle = opened ? "#5e3a1d" : "#e0b25a";
    ctx.fillRect(x + 11, y + 14, 10, 6);
    if (!opened) {
      ctx.fillStyle = "#ffe9a8";
      ctx.fillRect(x + 5, y + 3, 5, 5);
      ctx.fillRect(x + 22, y + 3, 5, 5);
    }
  }

  function drawStone(x, y) {
    if (assets.formalTileset) {
      ctx.fillStyle = "rgba(30, 20, 10, 0.2)";
      ctx.beginPath();
      ctx.ellipse(x + 14, y + 28, 22, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      drawFormalTileScaled(9, 4, x - 24, y - 48, 5);
      return;
    }
    ctx.fillStyle = "rgba(30, 22, 16, 0.2)";
    ctx.beginPath();
    ctx.ellipse(x + 14, y + 32, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5d3a20";
    ctx.fillRect(x + 8, y + 12, 4, 22);
    ctx.fillRect(x + 16, y + 12, 4, 22);
    ctx.fillStyle = "#9a6b3f";
    ctx.fillRect(x, y + 2, 28, 13);
    ctx.fillStyle = "#c69a5d";
    ctx.fillRect(x + 4, y + 5, 20, 6);
    ctx.fillStyle = "#4b2d18";
    ctx.fillRect(x + 7, y + 7, 14, 2);
  }

  function drawEntityLabel(entity) {
    const x = entity.x + 12;
    const y = entity.y - 36;
    const hasDeliver = state.tasks.some((t) => t.deliverable && t.deliverNpc === entity.id);
    const label = entity.label;
    ctx.font = "bold 12px 'Microsoft YaHei'";
    const textWidth = ctx.measureText(label).width;
    const w = Math.min(150, textWidth + 18);
    const h = 22;
    const bx = x - w / 2;
    const by = y - h;
    ctx.save();
    ctx.fillStyle = "rgba(23, 18, 14, 0.90)";
    ctx.strokeStyle = "rgba(242, 201, 95, 0.70)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, by, w, h, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = hasDeliver ? "#ffd66b" : "#fff2d0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, by + h / 2 + 1);
    if (hasDeliver) {
      ctx.fillStyle = "#f2c95f";
      ctx.beginPath();
      ctx.arc(bx + w - 7, by - 4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#241a14";
      ctx.font = "bold 9px 'Microsoft YaHei'";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", bx + w - 7, by - 4);
    }
    ctx.restore();
  }

  function drawMonsterSprite(m, x, y, w, h, isBoss) {
    const type = getMonsterType(m.id);
    const tint = MONSTER_TINT[type] || MONSTER_TINT.paper_crane;
    const img = isBoss ? assets.goblinAttack : assets.goblinIdle;
    if (img && img._box) {
      const frame = animFrame(img, isBoss ? 6 : 8);
      drawTintedFrame(img, x, y, w, h, frame, tint);
      ctx.fillStyle = "rgba(30, 20, 10, 0.22)";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h - 3, w * 0.3, h * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    const sheet = assets.monsterSheets[type] || assets.monsterSheets.paper_crane;
    if (sheet) {
      ctx.imageSmoothingEnabled = false;
      const frame = Math.floor(performance.now() / (isBoss ? 190 : 240)) % 2;
      ctx.drawImage(sheet, 0, frame * 16, 16, 16, x, y, w, h);
      ctx.fillStyle = "rgba(30, 20, 10, 0.22)";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h - 3, w * 0.3, h * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    drawFrame(assets.goblinIdle, x - 8, y - 8, w + 16, h + 16, animFrame(assets.goblinIdle, 5));
  }

  const NPC_JOB_SPRITE = {
    npc_xiaofen: "accountant",
    npc_shenming: "auditor",
    npc_old: "law",
    room_shop_npc: "auditor",
    room_home_npc: "law",
    room_archive_npc: "auditor",
    room_ledger_npc: "finance",
    room_audit_npc: "auditor",
    room_finance_npc: "finance",
    room_tax_npc: "tax",
    room_law_npc: "law",
    room_strategy_npc: "strategy",
    audit_npc: "auditor",
    room_audit_meeting_npc: "auditor",
    room_audit_evidence_npc: "auditor",
    room_audit_chief_npc: "auditor",
    capital_npc: "finance",
    room_capital_cashflow_npc: "finance",
    room_capital_structure_npc: "finance",
    room_capital_investment_npc: "finance",
    tax_npc: "tax",
    room_tax_vat_npc: "tax",
    room_tax_cit_npc: "tax",
    room_tax_incentive_npc: "tax",
    law_npc: "law",
    room_law_contract_npc: "law",
    room_law_securities_npc: "law",
    room_law_bankruptcy_npc: "law",
    strategy_npc: "strategy",
    room_strategy_sandbox_npc: "strategy",
    room_strategy_five_npc: "strategy",
    room_strategy_ma_npc: "strategy"
  };

  function drawNpcSprite(e, x, y, w, h) {
    const jobId = NPC_JOB_SPRITE[e.id] || "accountant";
    if (assets.playerIdle && assets.playerIdle._box) {
      const frame = animFrame(assets.playerIdle, 3, 2);
      drawTintedFrame(assets.playerIdle, x, y, w, h, frame, JOB_TINT[jobId] || JOB_TINT.accountant);
      ctx.fillStyle = "rgba(30, 20, 10, 0.2)";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h - 2, w * 0.3, h * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    const sheet = assets.playerSheets[jobId] || assets.playerSheets.accountant;
    if (sheet) {
      ctx.drawImage(sheet, 0, 0, 16, 16, x, y, w, h);
      return;
    }
    drawFrame(assets.playerIdle, x - 8, y - 8, w + 16, h + 16, animFrame(assets.playerIdle, 3, 2));
  }

  function drawSign(e) {
    const x = e.x;
    const y = e.y;
    if (assets.formalTileset) {
      ctx.fillStyle = "rgba(30, 20, 10, 0.2)";
      ctx.beginPath();
      ctx.ellipse(x + 14, y + 28, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      drawFormalTileScaled(3, 9, x - 16, y - 32, 3);
      return;
    }
    ctx.fillStyle = "rgba(30, 20, 10, 0.18)";
    ctx.beginPath();
    ctx.ellipse(x + 14, y + 28, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5c3a1e";
    ctx.fillRect(x + 10, y + 8, 4, 22);
    ctx.fillStyle = "#8a5a2c";
    ctx.fillRect(x - 6, y, 36, 12);
    ctx.fillStyle = "#c69a5d";
    ctx.fillRect(x - 3, y + 3, 30, 6);
    ctx.fillStyle = "#4a2e1a";
    ctx.fillRect(x - 6, y + 10, 36, 2);
  }

  function updateHUD() {
    const p = state.player;
    const goldMissing = ["defeat3", "chest2", "collect3"].filter((id) => {
      const task = state.tasks.find((t) => t.id === id);
      return !task || !task.done;
    });
    const mainlineHint = goldMissing.length
      ? "主线：击败 3 只怪物 · 开启 2 个宝箱 · 采集 3 次材料"
      : "主线：前往天平衡碑，挑战合并报表巨像";
    const effectiveMaxMp = p.maxMp + getJobBonus("mp");
    document.getElementById("hpBar").style.width = Math.max(0, (p.hp / p.maxHp) * 100) + "%";
    document.getElementById("mpBar").style.width = Math.max(0, (p.mp / effectiveMaxMp) * 100) + "%";
    document.getElementById("hpText").textContent = p.hp + "/" + p.maxHp;
    document.getElementById("mpText").textContent = p.mp + "/" + effectiveMaxMp;
    document.getElementById("goldText").textContent = p.gold + " G";
    document.getElementById("questText").textContent =
      state.gameCompleted ? "主线：六域已平衡，记账大陆恢复秩序" : state.bossKilled ? "主线：击败合并报表巨像，恢复记账大陆的平衡" : mainlineHint;
    const zoneNames = {
      gold_field: "金算原野 · 分录镇",
      audit_tower: "审计铁堡",
      capital_forest: "资本密林",
      tax_wasteland: "税率荒原",
      law_temple: "法条神殿",
      strategy_star: "战略星塔"
    };
    const subEl = document.querySelector(".hero-sub");
    if (subEl) subEl.textContent = state.room ? (ROOMS[state.room]?.name || "室内场景") : (zoneNames[state.zone] || state.zone);
    updateMinimap();
  }

  function updateMinimap() {
    const map = document.getElementById("minimap");
    map.innerHTML = "";
    const marks = [
      ...getActiveEntities()
        .filter((e) => {
          if (e.type === "chest" && state.openedChests.includes(e.id)) return false;
          if (e.type === "monster" && (state.monstersKilledIds || []).includes(e.id)) return false;
          if (e.type === "boss" && (!isBossUnlocked(e) || isBossDefeated(e))) return false;
          return true;
        })
        .map((e) => ({ x: e.x, y: e.y, c: e.type === "boss" ? "#c43d2e" : e.type === "monster" ? "#b23b2b" : e.type === "npc" ? "#3f8ec4" : "#f2d175" })),
      { x: state.player.x, y: state.player.y, c: "#ffffff" }
    ];
    marks.forEach((m) => {
      const cell = document.createElement("div");
      const col = Math.max(1, Math.min(7, Math.round((m.x / W) * 7)));
      const row = Math.max(1, Math.min(7, Math.round((m.y / H) * 7)));
      cell.style.gridColumn = col;
      cell.style.gridRow = row;
      cell.style.background = m.c;
      map.appendChild(cell);
    });
  }

  function drawMap() {
    if (state.room) {
      drawRoomBackground(state.room);
      getActiveEntities().forEach((e) => {
        if (e.type === "npc") drawNpcSprite(e, e.x - 24, e.y - 48, 48, 48);
        else if (e.type === "chest") drawChest(e.x, e.y, state.openedChests.includes(e.id));
        else if (e.type === "exit") drawExit(e);
        else if (e.type === "bench") drawBench(e);
        drawEntityLabel(e);
      });
      drawPlayerSprite(state.player.x - 28, state.player.y - 64, 56, 56);
      return;
    }
    if (state.zone === "gold_field" && assets.scene) drawSceneCover();
    drawTileMap();
    drawDecorations();
    const zoneTints = {
      audit_tower: "rgba(65, 105, 225, 0.08)",
      capital_forest: "rgba(46, 139, 87, 0.10)",
      tax_wasteland: "rgba(228, 87, 46, 0.10)",
      law_temple: "rgba(107, 91, 149, 0.12)",
      strategy_star: "rgba(58, 143, 183, 0.12)"
    };
    if (zoneTints[state.zone]) {
      ctx.fillStyle = zoneTints[state.zone];
      ctx.fillRect(0, 0, W, H);
    }
    const light = ctx.createRadialGradient(W / 2, H * 0.42, 60, W / 2, H * 0.42, W * 0.72);
    light.addColorStop(0, "rgba(255, 236, 180, 0.14)");
    light.addColorStop(1, "rgba(255, 236, 180, 0)");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, W, H);
      getActiveEntities().forEach((e) => {
      if (e.type === "npc") drawNpcSprite(e, e.x - 24, e.y - 48, 48, 48);
      else if (e.type === "chest") drawChest(e.x, e.y, state.openedChests.includes(e.id));
      else if (e.type === "sign") drawSign(e);
      else if (e.type === "stone") drawStone(e.x, e.y);
      else if (e.type === "collect") {
        drawCollect(e);
        drawEntityLabel(e);
      } else if (e.type === "portal" || e.type === "zone_gate") {
        drawPortal(e);
        drawEntityLabel(e);
        } else if (e.type === "landmark") {
          drawLandmark(e);
          drawEntityLabel(e);
        } else if (e.type === "door") {
          drawDoor(e);
          drawEntityLabel(e);
        }
      else if (e.type === "monster") {
        if (!(state.monstersKilledIds || []).includes(e.id)) {
          drawMonsterSprite(e, e.x - 32, e.y - 48, 64, 64, false);
          drawEntityLabel(e);
        }
      } else if (e.type === "boss") {
        if (isBossUnlocked(e) && !isBossDefeated(e)) {
          drawMonsterSprite(e, e.x - 60, e.y - 88, 120, 120, true);
          drawEntityLabel(e);
        }
      } else {
        drawEntityLabel(e);
      }
    });
    drawPlayerIndicator(state.player.x, state.player.y);
    drawPlayerSprite(state.player.x - 28, state.player.y - 64, 56, 56);
    const now = Date.now();
    for (let i = mapEffects.length - 1; i >= 0; i--) {
      const e = mapEffects[i];
      if (now - e.born > 1000) {
        mapEffects.splice(i, 1);
        continue;
      }
      const age = now - e.born;
      ctx.globalAlpha = Math.max(0, 1 - age / 1000);
      ctx.fillStyle = e.color;
      ctx.font = "bold 20px 'Microsoft YaHei'";
      ctx.fillText(e.text, e.x, e.y - age * 0.03);
      ctx.globalAlpha = 1;
    }
  }

  function drawCollect(e) {
    const x = e.x;
    const y = e.y;
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 280);
    const icon = e.material === "stone" ? assets.props.peaks : e.material === "ink" ? assets.props.flask : assets.props.box;
    if (icon) {
      ctx.globalAlpha = 0.82 + 0.18 * pulse;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(icon, 0, 0, 16, 16, x + 2, y - 16, 40, 40);
      ctx.globalAlpha = 1;
      return;
    }
    ctx.globalAlpha = 0.82 + 0.18 * pulse;
    ctx.fillStyle = "rgba(30, 22, 16, 0.2)";
    ctx.beginPath();
    ctx.ellipse(x + 14, y + 28, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    if (e.material === "stone") {
      ctx.fillStyle = "#6f7a72";
      ctx.fillRect(x + 5, y + 10, 18, 14);
      ctx.fillStyle = "#aeb8ad";
      ctx.fillRect(x + 8, y + 12, 10, 4);
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(x + 12, y + 16, 4, 4);
    } else if (e.material === "ink") {
      ctx.fillStyle = "#4d4f63";
      ctx.beginPath();
      ctx.ellipse(x + 14, y + 18, 14, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#6f7390";
      ctx.beginPath();
      ctx.ellipse(x + 11, y + 15, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#7a4a28";
      ctx.fillRect(x + 8, y + 10, 14, 16);
      ctx.fillStyle = "#f2c95f";
      ctx.fillRect(x + 10, y + 13, 4, 4);
      ctx.fillRect(x + 16, y + 13, 4, 4);
      ctx.fillRect(x + 13, y + 19, 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  function drawPortal(e) {
    const x = e.x;
    const y = e.y;
    const t = Date.now() / 300;
    if (assets.formalTileset) {
      ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t);
      ctx.fillStyle = "rgba(120, 180, 255, 0.2)";
      ctx.beginPath();
      ctx.arc(x + 16, y + 20, 34, 0, Math.PI * 2);
      ctx.fill();
      drawFormalTileScaled(1, 8, x - 16, y - 32, 4);
      ctx.globalAlpha = 1;
      return;
    }
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t);
    ctx.fillStyle = "#5f7fc0";
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 24, 22, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b9d7f2";
    ctx.beginPath();
    ctx.ellipse(x + 16, y + 22, 13, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff2c0";
    ctx.beginPath();
    ctx.moveTo(x + 12, y + 32);
    ctx.lineTo(x + 22, y + 32);
    ctx.lineTo(x + 16, y + 44);
    ctx.closePath();
    ctx.fill();
  }

  function drawLandmark(e) {
    const x = e.x;
    const y = e.y;
    if (assets.formalTileset) {
      ctx.fillStyle = "rgba(30, 20, 10, 0.2)";
      ctx.fillRect(x + 4, y + 32, 28, 4);
      drawFormalTileScaled(0, 8, x - 24, y - 40, 4);
      ctx.fillStyle = "rgba(255, 225, 150, 0.4)";
      ctx.beginPath();
      ctx.ellipse(x + 18, y + 20, 18, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.fillStyle = "rgba(30, 22, 16, 0.18)";
    ctx.fillRect(x + 4, y + 32, 28, 4);
    ctx.fillStyle = "#8d9188";
    ctx.fillRect(x + 15, y + 8, 6, 26);
    ctx.fillStyle = "#aab0a3";
    ctx.fillRect(x + 6, y + 2, 24, 7);
    ctx.fillStyle = "#f2c95f";
    ctx.fillRect(x + 8, y + 4, 6, 3);
    ctx.fillRect(x + 24, y + 4, 6, 3);
    ctx.fillStyle = "rgba(255, 225, 150, 0.5)";
    ctx.beginPath();
    ctx.ellipse(x + 18, y + 18, 16, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawInteriorTile(col, row, dx, dy, scale = 3) {
    if (!assets.interiorTileset) return;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(assets.interiorTileset, col * 16, row * 16, 16, 16, dx, dy, 16 * scale, 16 * scale);
  }

  function drawFormalRoomFurniture(roomId) {
    if (!assets.interiorTileset) return;
    if (roomId === "shop") {
      drawInteriorTile(4, 0, 120, 250, 4);
      drawInteriorTile(5, 0, 184, 250, 4);
      drawInteriorTile(6, 0, 540, 160, 3);
      drawInteriorTile(7, 0, 588, 160, 3);
      drawInteriorTile(8, 0, 540, 220, 3);
      drawInteriorTile(9, 0, 588, 220, 3);
    } else if (roomId === "home") {
      drawInteriorTile(4, 1, 520, 180, 4);
      drawInteriorTile(5, 1, 584, 180, 4);
      drawInteriorTile(6, 1, 648, 180, 4);
      drawInteriorTile(4, 0, 130, 250, 3);
      drawInteriorTile(5, 0, 178, 250, 3);
    } else if (roomId === "workshop" || roomId === "audit_meeting" || roomId === "strategy_sandbox") {
      drawInteriorTile(0, 1, 100, 220, 4);
      drawInteriorTile(1, 1, 164, 220, 4);
      drawInteriorTile(0, 1, 500, 180, 4);
      drawInteriorTile(1, 1, 564, 180, 4);
    } else if (roomId === "archive" || roomId === "audit_evidence" || roomId === "law_securities") {
      drawInteriorTile(8, 1, 480, 150, 4);
      drawInteriorTile(9, 1, 544, 150, 4);
      drawInteriorTile(8, 1, 608, 150, 4);
      drawInteriorTile(4, 0, 120, 240, 3);
      drawInteriorTile(5, 0, 168, 240, 3);
    } else if (roomId === "ledger" || roomId === "capital_structure" || roomId === "tax_cit") {
      drawInteriorTile(8, 1, 480, 170, 4);
      drawInteriorTile(9, 1, 544, 170, 4);
      drawInteriorTile(4, 0, 120, 230, 3);
      drawInteriorTile(5, 0, 168, 230, 3);
    } else {
      drawInteriorTile(4, 0, 130, 230, 3);
      drawInteriorTile(5, 0, 178, 230, 3);
      drawInteriorTile(6, 0, 520, 200, 3);
      drawInteriorTile(7, 0, 568, 200, 3);
    }
  }

  function drawRoomBackground(roomId) {
    ctx.fillStyle = "#241a14";
    ctx.fillRect(0, 0, W, H);
    if (assets.interior) {
      const img = assets.interior;
      const scale = Math.max(W / img.width, H / img.height);
      const sw = W / scale;
      const sh = H / scale;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, W, H);
      ctx.fillStyle = "rgba(30, 22, 16, 0.30)";
      ctx.fillRect(0, 0, W, H);
    } else {
      ctx.fillStyle = "#6d4327";
      ctx.fillRect(0, 0, W, 78);
      ctx.fillStyle = "#8f5a33";
      ctx.fillRect(0, 0, W, 8);
      ctx.fillStyle = "#a9784a";
      ctx.fillRect(0, 78, W, H - 78);
      ctx.strokeStyle = "#7a4a28";
      ctx.lineWidth = 2;
      for (let y = 78; y < H; y += 34) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    }

    if (roomId === "shop") {
      // counter
      ctx.fillStyle = "#5c3a1e";
      ctx.fillRect(120, 250, 170, 70);
      ctx.fillStyle = "#b97b38";
      ctx.fillRect(120, 250, 170, 16);
      // shelves
      ctx.fillStyle = "#4a2e1a";
      ctx.fillRect(540, 160, 230, 130);
      ctx.fillStyle = "#c69a5d";
      ctx.fillRect(548, 170, 214, 12);
      ctx.fillRect(548, 210, 214, 12);
      ctx.fillRect(548, 250, 214, 12);
    } else if (roomId === "home") {
      // bed
      ctx.fillStyle = "#4a2e1a";
      ctx.fillRect(520, 180, 260, 150);
      ctx.fillStyle = "#c76a4f";
      ctx.fillRect(532, 192, 236, 100);
      ctx.fillStyle = "#f2d9b0";
      ctx.fillRect(540, 192, 220, 18);
      // table
      ctx.fillStyle = "#5c3a1e";
      ctx.fillRect(130, 250, 180, 80);
      ctx.fillStyle = "#8a5a2c";
      ctx.fillRect(130, 250, 180, 14);
        ctx.fillStyle = "#f2d175";
        ctx.fillRect(150, 270, 50, 8);
      } else if (roomId === "archive") {
        ctx.fillStyle = "#4a2e1a";
        ctx.fillRect(480, 150, 260, 210);
        ctx.fillStyle = "#8f6b3f";
        ctx.fillRect(492, 162, 236, 20);
        ctx.fillRect(492, 210, 236, 20);
        ctx.fillRect(492, 258, 236, 20);
        ctx.fillStyle = "#6d4327";
        ctx.fillRect(120, 240, 220, 120);
        ctx.fillStyle = "#b97b38";
        ctx.fillRect(120, 240, 220, 16);
      } else if (roomId === "ledger") {
        ctx.fillStyle = "#4a2e1a";
        ctx.fillRect(480, 170, 260, 220);
        ctx.fillStyle = "#8f6b3f";
        ctx.fillRect(492, 182, 236, 18);
        ctx.fillStyle = "#5c3a1e";
        ctx.fillRect(120, 230, 220, 130);
        ctx.fillStyle = "#8a5a2c";
        ctx.fillRect(120, 230, 220, 16);
      ctx.fillStyle = "#f2d175";
      ctx.fillRect(140, 260, 60, 10);
      ctx.fillRect(220, 260, 60, 10);
      } else if (roomId === "audit_room") {
        ctx.fillStyle = "#2b3045";
        ctx.fillRect(120, 170, 240, 210);
        ctx.fillStyle = "#4169e1";
        ctx.fillRect(132, 182, 216, 20);
        ctx.fillRect(132, 230, 216, 20);
        ctx.fillRect(132, 278, 216, 20);
        ctx.fillStyle = "#b8c4d8";
        ctx.fillRect(500, 190, 280, 220);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(640, 300, 46, 0, Math.PI * 2);
        ctx.strokeStyle = "#4169e1";
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(676, 336);
        ctx.lineTo(716, 376);
        ctx.stroke();
      } else if (roomId === "finance_room") {
        ctx.fillStyle = "#245228";
        ctx.fillRect(120, 230, 240, 150);
        ctx.fillStyle = "#2e8b57";
        ctx.fillRect(120, 230, 240, 18);
        ctx.fillStyle = "#9bc86f";
        ctx.fillRect(140, 270, 70, 18);
        ctx.fillRect(140, 310, 70, 18);
        ctx.fillStyle = "#f2c95f";
        ctx.fillRect(500, 170, 280, 240);
        ctx.fillStyle = "#173a2a";
        ctx.fillRect(520, 190, 100, 60);
        ctx.fillRect(520, 270, 100, 60);
        ctx.fillRect(640, 230, 100, 60);
        ctx.fillStyle = "#ffffff";
        for (let i = 0; i < 8; i++) {
          const bx = 120 + i * 90 + Math.sin(Date.now() / 700 + i) * 8;
          ctx.fillRect(bx, 430 - i * 14, 3, 3);
        }
      } else if (roomId === "tax_room") {
        ctx.fillStyle = "#7a3218";
        ctx.fillRect(120, 210, 260, 180);
        ctx.fillStyle = "#e4572e";
        ctx.fillRect(120, 210, 260, 18);
        ctx.fillStyle = "#f2c14e";
        ctx.fillRect(140, 250, 70, 12);
        ctx.fillRect(140, 280, 70, 12);
        ctx.fillRect(140, 310, 70, 12);
        ctx.fillStyle = "#4a2a1a";
        ctx.fillRect(500, 180, 280, 230);
        ctx.fillStyle = "#fff2cf";
        ctx.fillRect(520, 200, 90, 14);
        ctx.fillRect(520, 226, 90, 14);
        ctx.fillRect(520, 252, 90, 14);
        ctx.fillRect(640, 200, 90, 14);
        ctx.fillRect(640, 226, 90, 14);
      } else if (roomId === "law_room") {
        ctx.fillStyle = "#3a2a3a";
        ctx.fillRect(120, 160, 260, 230);
        ctx.fillStyle = "#6b5b95";
        ctx.fillRect(132, 172, 236, 18);
        ctx.fillRect(132, 220, 236, 18);
        ctx.fillRect(132, 268, 236, 18);
        ctx.fillStyle = "#d8c8e8";
        ctx.fillRect(520, 210, 260, 180);
        ctx.fillStyle = "#8a7bb8";
        ctx.beginPath();
        ctx.moveTo(640, 220);
        ctx.lineTo(700, 220);
        ctx.lineTo(680, 250);
        ctx.lineTo(620, 250);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#f2c95f";
        ctx.fillRect(644, 250, 12, 60);
        ctx.fillRect(610, 250, 80, 10);
      } else if (roomId === "strategy_room") {
        ctx.fillStyle = "#173a5c";
        ctx.fillRect(120, 190, 260, 200);
        ctx.fillStyle = "#3a8fb7";
        ctx.fillRect(120, 190, 260, 18);
        ctx.fillStyle = "#8fd3f2";
        for (let i = 0; i < 8; i++) {
          for (let j = 0; j < 5; j++) {
            ctx.fillRect(150 + i * 24, 230 + j * 22, 14, 10);
          }
        }
        ctx.fillStyle = "#1d3557";
        ctx.fillRect(500, 170, 280, 230);
        ctx.fillStyle = "#ffd166";
        ctx.fillRect(530, 200, 90, 60);
        ctx.fillRect(650, 200, 90, 60);
        ctx.fillRect(530, 280, 90, 60);
        ctx.fillRect(650, 280, 90, 60);
      } else if (roomId === "audit_meeting") {
        ctx.fillStyle = "#2b3045";
        ctx.fillRect(120, 210, 720, 190);
        ctx.fillStyle = "#4169e1";
        ctx.fillRect(120, 210, 720, 18);
        ctx.fillStyle = "#b8c4d8";
        ctx.fillRect(180, 260, 560, 18);
        ctx.fillRect(180, 320, 560, 18);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(300, 240, 320, 10);
        ctx.fillStyle = "#6f7d8f";
        for (let i = 0; i < 6; i++) {
          ctx.fillRect(160 + i * 110, 280, 70, 16);
        }
      } else if (roomId === "audit_evidence") {
        ctx.fillStyle = "#1f2733";
        ctx.fillRect(120, 150, 260, 270);
        ctx.fillStyle = "#4169e1";
        ctx.fillRect(132, 162, 236, 18);
        ctx.fillRect(132, 210, 236, 18);
        ctx.fillRect(132, 258, 236, 18);
        ctx.fillRect(132, 306, 236, 18);
        ctx.fillStyle = "#8f6b3f";
        ctx.fillRect(500, 180, 280, 240);
        ctx.fillStyle = "#f2c95f";
        ctx.fillRect(520, 200, 80, 40);
        ctx.fillRect(640, 200, 80, 40);
        ctx.fillRect(520, 280, 80, 40);
        ctx.fillRect(640, 280, 80, 40);
        ctx.fillStyle = "#5c3a1e";
        ctx.fillRect(520, 232, 80, 6);
        ctx.fillRect(640, 232, 80, 6);
        ctx.fillRect(520, 312, 80, 6);
        ctx.fillRect(640, 312, 80, 6);
      } else if (roomId === "audit_chief") {
        ctx.fillStyle = "#3a2e24";
        ctx.fillRect(120, 200, 280, 190);
        ctx.fillStyle = "#6d4327";
        ctx.fillRect(120, 200, 280, 18);
        ctx.fillStyle = "#8a5a2c";
        ctx.fillRect(150, 260, 220, 16);
        ctx.fillStyle = "#f2d175";
        ctx.fillRect(170, 300, 60, 40);
        ctx.fillRect(250, 300, 60, 40);
        ctx.fillStyle = "#2b3045";
        ctx.fillRect(500, 170, 280, 230);
        ctx.fillStyle = "#b8c4d8";
        ctx.fillRect(520, 190, 240, 60);
        ctx.fillStyle = "#ffd166";
        ctx.fillRect(680, 300, 70, 40);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 28px 'Microsoft YaHei'";
        ctx.fillText("已审", 696, 328);
      } else if (roomId === "capital_cashflow") {
        ctx.fillStyle = "#245228";
        ctx.fillRect(120, 190, 720, 220);
        ctx.fillStyle = "#2e8b57";
        ctx.fillRect(120, 190, 720, 18);
        ctx.fillStyle = "#9bc86f";
        for (let i = 0; i < 5; i++) {
          ctx.fillRect(170 + i * 130, 250, 90, 22);
          ctx.fillRect(170 + i * 130, 320, 90, 22);
        }
        ctx.fillStyle = "#f2c95f";
        for (let i = 0; i < 5; i++) {
          ctx.fillRect(200 + i * 130, 225, 12, 12);
          ctx.fillRect(200 + i * 130, 295, 12, 12);
        }
      } else if (roomId === "capital_structure") {
        ctx.fillStyle = "#173a2a";
        ctx.fillRect(120, 200, 300, 200);
        ctx.fillStyle = "#2e8b57";
        ctx.fillRect(120, 200, 300, 18);
        ctx.fillStyle = "#9bc86f";
        ctx.fillRect(150, 260, 240, 16);
        ctx.fillRect(150, 300, 240, 16);
        ctx.fillStyle = "#f2c95f";
        ctx.fillRect(150, 240, 80, 14);
        ctx.fillRect(310, 240, 80, 14);
        ctx.fillStyle = "#3a8fb7";
        ctx.fillRect(500, 170, 280, 230);
        ctx.fillStyle = "#8fd3f2";
        ctx.fillRect(520, 200, 110, 60);
        ctx.fillRect(650, 200, 110, 60);
        ctx.fillRect(520, 290, 110, 60);
        ctx.fillRect(650, 290, 110, 60);
      } else if (roomId === "capital_investment") {
        ctx.fillStyle = "#1d3557";
        ctx.fillRect(120, 170, 280, 240);
        ctx.fillStyle = "#3a8fb7";
        ctx.fillRect(120, 170, 280, 18);
        ctx.fillStyle = "#8fd3f2";
        ctx.fillRect(140, 210, 100, 50);
        ctx.fillRect(260, 210, 100, 50);
        ctx.fillRect(140, 280, 100, 50);
        ctx.fillRect(260, 280, 100, 50);
        ctx.fillStyle = "#ffd166";
        ctx.fillRect(500, 190, 280, 220);
        ctx.fillStyle = "#2b3045";
        ctx.fillRect(520, 210, 100, 40);
        ctx.fillRect(640, 210, 100, 40);
        ctx.fillRect(520, 280, 100, 40);
        ctx.fillRect(640, 280, 100, 40);
      } else if (roomId === "tax_vat") {
        ctx.fillStyle = "#7a3218";
        ctx.fillRect(120, 190, 720, 220);
        ctx.fillStyle = "#e4572e";
        ctx.fillRect(120, 190, 720, 18);
        ctx.fillStyle = "#fff2cf";
        for (let i = 0; i < 6; i++) {
          ctx.fillRect(160 + i * 110, 240, 80, 30);
          ctx.fillRect(160 + i * 110, 300, 80, 30);
        }
        ctx.fillStyle = "#f2c14e";
        for (let i = 0; i < 6; i++) {
          ctx.fillRect(180 + i * 110, 260, 40, 10);
          ctx.fillRect(180 + i * 110, 320, 40, 10);
        }
      } else if (roomId === "tax_cit") {
        ctx.fillStyle = "#4a2a1a";
        ctx.fillRect(120, 200, 300, 200);
        ctx.fillStyle = "#e4572e";
        ctx.fillRect(120, 200, 300, 18);
        ctx.fillStyle = "#f2c14e";
        ctx.fillRect(150, 250, 240, 16);
        ctx.fillRect(150, 290, 240, 16);
        ctx.fillRect(150, 330, 240, 16);
        ctx.fillStyle = "#fff2cf";
        ctx.fillRect(500, 180, 280, 230);
        ctx.fillStyle = "#4a2a1a";
        ctx.fillRect(520, 200, 90, 50);
        ctx.fillRect(640, 200, 90, 50);
        ctx.fillRect(520, 280, 90, 50);
        ctx.fillRect(640, 280, 90, 50);
      } else if (roomId === "tax_incentive") {
        ctx.fillStyle = "#245228";
        ctx.fillRect(120, 170, 280, 240);
        ctx.fillStyle = "#2e8b57";
        ctx.fillRect(120, 170, 280, 18);
        ctx.fillStyle = "#9bc86f";
        ctx.fillRect(150, 210, 100, 50);
        ctx.fillRect(280, 210, 100, 50);
        ctx.fillRect(150, 290, 100, 50);
        ctx.fillRect(280, 290, 100, 50);
        ctx.fillStyle = "#f2c95f";
        ctx.fillRect(500, 190, 280, 220);
        ctx.fillStyle = "#245228";
        ctx.fillRect(520, 210, 100, 40);
        ctx.fillRect(650, 210, 100, 40);
        ctx.fillRect(520, 290, 100, 40);
        ctx.fillRect(650, 290, 100, 40);
      } else if (roomId === "law_contract") {
        ctx.fillStyle = "#3a2a3a";
        ctx.fillRect(120, 190, 720, 220);
        ctx.fillStyle = "#6b5b95";
        ctx.fillRect(120, 190, 720, 18);
        ctx.fillStyle = "#d8c8e8";
        for (let i = 0; i < 5; i++) {
          ctx.fillRect(160 + i * 130, 240, 90, 30);
          ctx.fillRect(160 + i * 130, 300, 90, 30);
        }
        ctx.fillStyle = "#f2c95f";
        ctx.beginPath();
        ctx.moveTo(820, 230);
        ctx.lineTo(860, 230);
        ctx.lineTo(845, 270);
        ctx.lineTo(800, 270);
        ctx.closePath();
        ctx.fill();
      } else if (roomId === "law_securities") {
        ctx.fillStyle = "#2b3045";
        ctx.fillRect(120, 170, 280, 240);
        ctx.fillStyle = "#4169e1";
        ctx.fillRect(120, 170, 280, 18);
        ctx.fillStyle = "#b8c4d8";
        ctx.fillRect(140, 210, 240, 16);
        ctx.fillRect(140, 250, 240, 16);
        ctx.fillRect(140, 290, 240, 16);
        ctx.fillStyle = "#87ceeb";
        ctx.fillRect(500, 190, 280, 220);
        ctx.fillStyle = "#1d3557";
        ctx.fillRect(520, 210, 100, 50);
        ctx.fillRect(650, 210, 100, 50);
        ctx.fillRect(520, 290, 100, 50);
        ctx.fillRect(650, 290, 100, 50);
      } else if (roomId === "law_bankruptcy") {
        ctx.fillStyle = "#241a14";
        ctx.fillRect(120, 170, 720, 240);
        ctx.fillStyle = "#5c3a1e";
        ctx.fillRect(120, 170, 720, 18);
        ctx.fillStyle = "#8a5a2c";
        ctx.fillRect(200, 260, 560, 16);
        ctx.fillStyle = "#d8c8e8";
        ctx.fillRect(380, 220, 200, 34);
        ctx.fillStyle = "#f2c95f";
        ctx.fillRect(720, 250, 60, 18);
        ctx.fillRect(740, 268, 18, 70);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(180, 180, 90, 60);
        ctx.fillRect(690, 180, 90, 60);
      } else if (roomId === "strategy_sandbox") {
        ctx.fillStyle = "#173a5c";
        ctx.fillRect(120, 190, 720, 220);
        ctx.fillStyle = "#3a8fb7";
        ctx.fillRect(120, 190, 720, 18);
        ctx.fillStyle = "#8fd3f2";
        for (let i = 0; i < 7; i++) {
          ctx.fillRect(150 + i * 90, 230, 60, 60);
          ctx.fillRect(150 + i * 90, 320, 60, 60);
        }
        ctx.fillStyle = "#ffd166";
        for (let i = 0; i < 7; i++) {
          ctx.fillRect(180 + i * 90, 250, 16, 16);
          ctx.fillRect(180 + i * 90, 340, 16, 16);
        }
      } else if (roomId === "strategy_five") {
        ctx.fillStyle = "#1d3557";
        ctx.fillRect(120, 170, 280, 240);
        ctx.fillStyle = "#3a8fb7";
        ctx.fillRect(120, 170, 280, 18);
        ctx.fillStyle = "#8fd3f2";
        for (let i = 0; i < 5; i++) {
          ctx.fillRect(150 + i * 44, 220, 34, 120);
        }
        ctx.fillStyle = "#ffd166";
        ctx.fillRect(500, 190, 280, 220);
        ctx.fillStyle = "#173a5c";
        ctx.fillRect(520, 210, 80, 40);
        ctx.fillRect(620, 210, 80, 40);
        ctx.fillRect(720, 210, 40, 40);
        ctx.fillRect(520, 280, 80, 40);
        ctx.fillRect(620, 280, 80, 40);
        ctx.fillRect(720, 280, 40, 40);
      } else if (roomId === "strategy_ma") {
        ctx.fillStyle = "#2b3045";
        ctx.fillRect(120, 170, 280, 240);
        ctx.fillStyle = "#4169e1";
        ctx.fillRect(120, 170, 280, 18);
        ctx.fillStyle = "#b8c4d8";
        ctx.fillRect(150, 210, 100, 50);
        ctx.fillRect(280, 210, 100, 50);
        ctx.fillRect(150, 290, 100, 50);
        ctx.fillRect(280, 290, 100, 50);
        ctx.fillStyle = "#ffd166";
        ctx.fillRect(200, 240, 130, 10);
        ctx.fillRect(200, 320, 130, 10);
        ctx.fillStyle = "#f2c95f";
        ctx.fillRect(500, 190, 280, 220);
        ctx.fillStyle = "#1d3557";
        ctx.fillRect(520, 210, 90, 50);
        ctx.fillRect(650, 210, 90, 50);
        ctx.fillRect(520, 290, 90, 50);
        ctx.fillRect(650, 290, 90, 50);
      } else {
      // crafting tables
      ctx.fillStyle = "#4a2e1a";
      ctx.fillRect(100, 220, 220, 120);
      ctx.fillStyle = "#8a5a2c";
      ctx.fillRect(100, 220, 220, 18);
      ctx.fillStyle = "#5c3a1e";
      ctx.fillRect(500, 180, 240, 150);
      ctx.fillStyle = "#7a4a28";
      ctx.fillRect(500, 180, 240, 18);
      ctx.fillStyle = "#f2d175";
      ctx.fillRect(560, 250, 40, 20);
      ctx.fillRect(640, 250, 40, 20);
    }

    // 室内家具由各房间的程序化布局绘制，避免额外 tileset 叠加造成花块。

    ctx.fillStyle = "rgba(255, 230, 180, 0.12)";
    ctx.fillRect(0, 78, W, 14);
  }

  function drawDoor(e) {
    if (assets.formalTileset) {
      drawFormalTileScaled(1, 8, e.x - 16, e.y - 32, 3);
      return;
    }
    ctx.fillStyle = "#4a2e1a";
    ctx.fillRect(e.x - 8, e.y - 18, 32, 38);
    ctx.fillStyle = "#8f5a33";
    ctx.fillRect(e.x - 6, e.y - 16, 28, 34);
    ctx.fillStyle = "#f2c95f";
    ctx.fillRect(e.x + 5, e.y - 8, 5, 5);
  }

  function drawExit(e) {
    if (assets.formalTileset) {
      drawFormalTileScaled(2, 8, e.x - 16, e.y - 32, 3);
      ctx.fillStyle = "#f2c95f";
      ctx.beginPath();
      ctx.moveTo(e.x, e.y - 12);
      ctx.lineTo(e.x + 10, e.y + 2);
      ctx.lineTo(e.x - 10, e.y + 2);
      ctx.closePath();
      ctx.fill();
      return;
    }
    ctx.fillStyle = "rgba(30, 22, 16, 0.8)";
    ctx.fillRect(e.x - 22, e.y - 28, 44, 52);
    ctx.fillStyle = "#f2c95f";
    ctx.beginPath();
    ctx.moveTo(e.x, e.y - 10);
    ctx.lineTo(e.x + 10, e.y + 6);
    ctx.lineTo(e.x - 10, e.y + 6);
    ctx.closePath();
    ctx.fill();
  }

  function drawBench(e) {
    if (assets.interiorTileset) {
      drawInteriorTile(4, 0, e.x - 32, e.y - 24, 4);
      return;
    }
    ctx.fillStyle = "rgba(30, 22, 16, 0.2)";
    ctx.fillRect(e.x - 22, e.y - 4, 44, 8);
    ctx.fillStyle = "#5c3a1e";
    ctx.fillRect(e.x - 24, e.y - 30, 48, 30);
    ctx.fillStyle = "#8a5a2c";
    ctx.fillRect(e.x - 24, e.y - 30, 48, 8);
    ctx.fillStyle = "#f2d175";
    ctx.fillRect(e.x - 10, e.y - 18, 20, 8);
    ctx.fillStyle = "#c0c0c0";
    ctx.fillRect(e.x + 6, e.y - 24, 10, 12);
  }

  function drawPlayerIndicator(x, y) {
    ctx.fillStyle = "rgba(255, 228, 154, 0.95)";
    ctx.beginPath();
    ctx.moveTo(x - 9, y - 2);
    ctx.lineTo(x + 9, y - 2);
    ctx.lineTo(x, y + 14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#6d4327";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawPartner(x, y) {
    const px = x - 126;
    const py = y - 16;
    ctx.fillStyle = "rgba(255, 228, 154, 0.25)";
    ctx.beginPath();
    ctx.ellipse(px + 36, py + 37, 26, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f2c95f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(px + 36, py + 37, 28, 15, 0, 0, Math.PI * 2);
    ctx.stroke();
    drawFrame(assets.playerIdle, px, py, 72, 48, animFrame(assets.playerIdle, 3, 2));
  }

  function drawCoverToCanvas(img) {
    const scale = Math.max(W / img.width, H / img.height);
    const sw = W / scale;
    const sh = H / scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, W, H);
  }

  function drawRegionBattleBackground() {
    const region = state.battle.region || BATTLE_REGIONS.paper_crane;
    const img = assets.battleBgs[region.bg] || assets.scene;
    if (img) drawCoverToCanvas(img);
    else drawSceneCover();
    const themeColors = {
      accounting: ["rgba(212, 160, 23, 0.34)", "rgba(212, 160, 23, 0.02)"],
      auditing: ["rgba(65, 105, 225, 0.36)", "rgba(65, 105, 225, 0.03)"],
      finance: ["rgba(46, 139, 87, 0.34)", "rgba(46, 139, 87, 0.02)"],
      tax: ["rgba(255, 99, 71, 0.34)", "rgba(255, 99, 71, 0.02)"],
      law: ["rgba(123, 104, 238, 0.38)", "rgba(123, 104, 238, 0.03)"],
      strategy: ["rgba(135, 206, 235, 0.34)", "rgba(135, 206, 235, 0.02)"]
    };
    const colors = themeColors[region.id] || themeColors.accounting;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    if (assets.formalTileset) {
      const floorTiles = {
        accounting: { tx: 9, ty: 6 },
        auditing: { tx: 1, ty: 4 },
        finance: { tx: 4, ty: 4 },
        tax: { tx: 7, ty: 8 },
        law: { tx: 1, ty: 4 },
        strategy: { tx: 9, ty: 6 }
      };
      const floor = floorTiles[region.id] || floorTiles.accounting;
      const floorY = H - 118;
      for (let x = 0; x < W; x += TILE) {
        drawFormalTile(floor.tx, floor.ty, x, floorY);
      }
      ctx.fillStyle = "rgba(16, 12, 8, 0.26)";
      ctx.fillRect(0, floorY, W, 118);
    }
    const now = Date.now();
    const particleConfig = {
      accounting: { count: 14, tint: "rgba(255, 214, 102, 0.68)" },
      auditing: { count: 10, tint: "rgba(108, 165, 232, 0.72)" },
      finance: { count: 12, tint: "rgba(111, 219, 154, 0.72)" },
      tax: { count: 16, tint: "rgba(255, 168, 91, 0.72)" },
      law: { count: 8, tint: "rgba(186, 160, 255, 0.72)" },
      strategy: { count: 18, tint: "rgba(235, 248, 255, 0.8)" }
    };
    const cfg = particleConfig[region.id] || particleConfig.accounting;
    if (assets.dust) {
      for (let i = 0; i < cfg.count; i++) {
        const frame = Math.floor(now / 90 + i * 2) % 9;
        const x = (i * 97 + now * 0.012 + Math.sin(now / 900 + i * 1.3) * 28) % (W - 40) + 20;
        const y = (i * 61 + Math.cos(now / 800 + i) * 24 + H * 0.42) % (H * 0.55) + 40;
        const size = 8 + (i % 4) * 4;
        drawTintedEffect(assets.dust, frame, x, y, size, size, cfg.tint);
      }
    } else {
      if (region.id === "accounting") {
        ctx.fillStyle = cfg.tint;
        for (let i = 0; i < cfg.count; i++) ctx.fillRect((i * 73 + now * 0.012) % W, (i * 131 + H * 0.5) % H, 3, 3);
      } else if (region.id === "finance") {
        ctx.fillStyle = cfg.tint;
        for (let i = 0; i < cfg.count; i++) {
          ctx.beginPath();
          ctx.arc(70 + i * 82, H - ((now * 0.018 + i * 53) % (H * 0.62)), 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = cfg.tint;
        for (let i = 0; i < cfg.count; i++) ctx.fillRect((i * 61 + now * 0.01) % W, (i * 37 + H * 0.4) % H, 2, 2);
      }
    }
  }

  function drawMonsterCpaOverlay(m, x, y, w, h) {
    const type = getMonsterType(m.id);
    const now = Date.now();
    if (type === "paper_crane") {
      ctx.strokeStyle = "rgba(255, 222, 130, 0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.24, y + h * 0.28);
      ctx.lineTo(x + w * 0.5, y + h * 0.42);
      ctx.lineTo(x + w * 0.76, y + h * 0.28);
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 214, 102, 0.28)";
      ctx.beginPath();
      ctx.arc(x + w * 0.5, y + h * 0.36, 7 + Math.sin(now / 240) * 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === "ink_blob") {
      ctx.fillStyle = "rgba(30, 34, 64, 0.9)";
      for (let i = 0; i < 8; i++) {
        const px = x + w * (0.22 + ((i * 17) % 58) / 100);
        const py = y + h * (0.2 + ((i * 29) % 56) / 100);
        ctx.beginPath();
        ctx.arc(px, py, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (type === "abacus_golem") {
      ctx.fillStyle = "#f2c95f";
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 5; col++) {
          const bx = x + w * 0.28 + col * 9;
          const by = y + h * 0.24 + row * 8;
          ctx.beginPath();
          ctx.arc(bx, by, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.strokeStyle = "#8a5a2c";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + w * 0.24, y + h * 0.2, w * 0.52, h * 0.3);
    } else if (type === "merge_giant") {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(x + w * 0.08, y + h * (0.12 + i * 0.16));
        ctx.lineTo(x + w * 0.92, y + h * (0.12 + i * 0.16));
        ctx.stroke();
      }
      for (let i = 1; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(x + w * (0.08 + i * 0.14), y + h * 0.08);
        ctx.lineTo(x + w * (0.08 + i * 0.14), y + h * 0.84);
        ctx.stroke();
      }
    }
  }

  function drawBattle() {
    const now = Date.now();
    const anim = state.battle.anim;
    const playerAtkAge = now - anim.playerAttack;
    const monsterHitAge = now - anim.monsterHit;
    const monsterAtkAge = now - anim.monsterAttack;
    const playerHitAge = now - anim.playerHit;
    const playerDx = playerAtkAge >= 0 && playerAtkAge < 320 ? 28 * Math.sin((Math.PI * playerAtkAge) / 320) : 0;
    const monsterDx = monsterAtkAge >= 0 && monsterAtkAge < 320 ? -26 * Math.sin((Math.PI * monsterAtkAge) / 320) : 0;
    const monsterHitDx = monsterHitAge >= 0 && monsterHitAge < 220 ? 20 * Math.sin((Math.PI * monsterHitAge) / 220) : 0;
    const shaking = state.settings.shake !== false && state.battle.shakeUntil && Date.now() < state.battle.shakeUntil;
    const shakeX = shaking ? (Math.random() * 6 - 3) : 0;
    const shakeY = shaking ? (Math.random() * 6 - 3) : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    drawRegionBattleBackground();
    const m = state.battle.monster;
    if (state.battle.bossEnteredAt) {
      const enterAge = now - state.battle.bossEnteredAt;
      if (enterAge >= 0 && enterAge < 1800) {
        const fadeIn = Math.min(1, enterAge / 220);
        const fadeOut = enterAge > 1450 ? (1800 - enterAge) / 350 : 1;
        ctx.fillStyle = `rgba(8, 5, 3, ${0.48 * fadeIn})`;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = `rgba(255, 228, 154, ${0.95 * fadeIn * fadeOut})`;
        ctx.font = "bold 46px 'Microsoft YaHei'";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(m.label, W / 2, H * 0.32);
        ctx.fillStyle = `rgba(255, 244, 214, ${0.72 * fadeIn * fadeOut})`;
        ctx.font = "bold 17px 'Microsoft YaHei'";
        ctx.fillText("区域失衡之源 · 主线决战", W / 2, H * 0.32 + 52);
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
      }
    }
    if (assets.playerSword && assets.playerSword._box) {
      const frame = animFrame(assets.playerSword, 10);
      drawTintedFrame(assets.playerSword, 120 + playerDx, 300, 160, 160, frame, JOB_TINT[state.jobs.current] || JOB_TINT.accountant);
    } else {
      const playerSheet = assets.playerSheets[state.jobs.current] || assets.playerSheets.accountant;
      if (playerSheet) {
        const col = PLAYER_DIR_COL[state.player.facing || "down"] || 0;
        const frame = playerAtkAge >= 0 && playerAtkAge < 320 ? 1 : Math.floor(now / 260) % 2;
        ctx.drawImage(playerSheet, col * 16, frame * 16, 16, 16, 120 + playerDx, 300, 160, 160);
      } else {
        drawFrame(assets.playerSword, 120 + playerDx, 250, 200, 224, animFrame(assets.playerSword, 10));
      }
    }
    if (assets.dust && playerAtkAge >= 0 && playerAtkAge < 320) {
      const frame = Math.floor(playerAtkAge / 42) % 9;
      drawTintedEffect(assets.dust, frame, 360, 330, 96, 64, "rgba(255, 244, 214, 0.85)");
    }
    if (playerAtkAge >= 0 && playerAtkAge < 220) {
      const progress = Math.min(1, playerAtkAge / 220);
      ctx.strokeStyle = `rgba(255, 224, 102, ${0.65 * (1 - progress)})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(210 + progress * 130, 330);
      ctx.lineTo(210 + progress * 300, 330);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.45 * (1 - progress)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(210 + progress * 150, 318);
      ctx.lineTo(210 + progress * 280, 342);
      ctx.stroke();
    }
    if (playerHitAge >= 0 && playerHitAge < 220) {
      ctx.fillStyle = "rgba(255, 80, 60, 0.25)";
      ctx.fillRect(120, 300, 160, 160);
    }
    const dw = m.isBoss ? 216 : 162;
    const dh = m.isBoss ? 216 : 162;
    drawMonsterSprite(m, 590 + monsterDx + monsterHitDx, m.isBoss ? 260 : 330, dw, dh, m.isBoss);
    drawMonsterCpaOverlay(m, 590 + monsterDx + monsterHitDx, m.isBoss ? 260 : 330, dw, dh);
    if (monsterHitAge >= 0 && monsterHitAge < 220) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
      ctx.fillRect(590, m.isBoss ? 260 : 330, dw, dh);
    }
    if (now < state.battle.critFlashUntil) {
      const critAge = state.battle.critFlashUntil - now;
      const radius = 120 + (420 - critAge) * 0.25;
      const grad = ctx.createRadialGradient(650, 300, 20, 650, 300, radius);
      grad.addColorStop(0, "rgba(255, 224, 102, 0.9)");
      grad.addColorStop(1, "rgba(255, 224, 102, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(650, 300, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    if (now < state.battle.phaseFlashUntil) {
      const phaseAlpha = 0.18 + 0.08 * Math.sin(now / 90);
      ctx.fillStyle = `rgba(220, 40, 40, ${phaseAlpha})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (m.isBoss && state.battle.phase2) {
      const baseAlpha = state.battle.phase3 ? 0.3 : 0.16;
      ctx.fillStyle = `rgba(230, 60, 50, ${baseAlpha + 0.08 * Math.sin(now / 220)})`;
      ctx.fillRect(590, 260, dw, dh);
    }
    if (state.battle.effects) {
      const now = Date.now();
      state.battle.effects = state.battle.effects.filter((e) => now - e.born < 900);
      state.battle.effects.forEach((e) => {
        const age = now - e.born;
        ctx.globalAlpha = Math.max(0, 1 - age / 900);
        ctx.fillStyle = e.color;
        ctx.font = `bold ${e.big ? 34 : 26}px 'Microsoft YaHei'`;
        ctx.fillText(e.text, e.x, e.y - age * 0.035);
        ctx.globalAlpha = 1;
      });
    }
    ctx.restore();
  }

  function addEffect(text, x, y, color, big = false) {
    if (!state.battle) return;
    if (state.lowQuality && state.battle.effects.length > 6) return;
    state.battle.effects.push({ text, x, y, color, born: Date.now(), big });
  }

  function drawTitleBackdrop() {
    drawSceneCover();
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "rgba(20, 14, 8, 0.28)");
    grad.addColorStop(0.55, "rgba(20, 14, 8, 0.12)");
    grad.addColorStop(1, "rgba(16, 10, 6, 0.62)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    const subjects = [
      { name: "会计", color: "#d4a017" },
      { name: "审计", color: "#4169e1" },
      { name: "财管", color: "#2e8b57" },
      { name: "税法", color: "#e4572e" },
      { name: "经济法", color: "#6b5b95" },
      { name: "战略", color: "#3a8fb7" }
    ];
    subjects.forEach((s, i) => {
      const x = 54 + i * 60;
      ctx.fillStyle = "rgba(18, 14, 10, 0.82)";
      ctx.fillRect(x, 34, 48, 48);
      ctx.fillStyle = s.color;
      ctx.fillRect(x + 6, 40, 36, 6);
      ctx.fillRect(x + 6, 50, 24, 6);
      ctx.fillRect(x + 6, 60, 30, 6);
      ctx.fillStyle = "#fff2cf";
      ctx.font = "bold 12px 'Microsoft YaHei'";
      ctx.fillText(s.name, x + 12, 74);
    });
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    if (state.screen === "map") drawMap();
    else if (state.screen === "battle") drawBattle();
    else drawTitleBackdrop();
  }

  function updateMap(dt) {
    const p = state.player;
    const speed = 120 * dt;
    let dx = 0;
    let dy = 0;
    if (keys["ArrowUp"] || keys["w"] || touch.up) dy -= 1;
    if (keys["ArrowDown"] || keys["s"] || touch.down) dy += 1;
    if (keys["ArrowLeft"] || keys["a"] || touch.left) dx -= 1;
    if (keys["ArrowRight"] || keys["d"] || touch.right) dx += 1;
    if (dx || dy) {
      p.moveTarget = null;
      const len = Math.hypot(dx, dy);
      const nx = p.x + (dx / len) * speed;
      const ny = p.y + (dy / len) * speed;
      if (canMoveTo(nx, p.y)) p.x = nx;
      if (canMoveTo(p.x, ny)) p.y = ny;
      if (dx > 0) p.facing = "right";
      else if (dx < 0) p.facing = "left";
      if (dy > 0) p.facing = "down";
      else if (dy < 0) p.facing = "up";
    } else if (p.moveTarget) {
      const tx = p.moveTarget.x - p.x;
      const ty = p.moveTarget.y - p.y;
      const dist = Math.hypot(tx, ty);
      if (dist < 4) {
        p.moveTarget = null;
      } else {
        const nx = p.x + (tx / dist) * speed;
        const ny = p.y + (ty / dist) * speed;
        if (canMoveTo(nx, p.y)) p.x = nx;
        if (canMoveTo(p.x, ny)) p.y = ny;
        if (Math.abs(tx) > Math.abs(ty)) p.facing = tx > 0 ? "right" : "left";
        else p.facing = ty > 0 ? "down" : "up";
      }
    }
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function nearestEntity() {
    let best = null;
    let bestDist = 80;
    getActiveEntities().forEach((e) => {
      if (e.type === "chest" && state.openedChests.includes(e.id)) return;
      if (e.type === "monster" && (state.monstersKilledIds || []).includes(e.id)) return;
      if (e.type === "boss" && (!isBossUnlocked(e) || isBossDefeated(e))) return;
      const d = distance(state.player, e);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    });
    return best;
  }

  function tryInteract() {
    const target = nearestEntity();
    if (target) {
      interact(target);
      return true;
    }
    showToast("附近没有可交互目标");
    return false;
  }

  function interact(entity) {
    if (!entity) return;
    if (entity.type === "npc") {
      openNpcDialog(entity);
    } else if (entity.type === "chest") {
      openChest(entity);
      } else if (entity.type === "sign") {
        openSign(entity);
      } else if (entity.type === "stone") {
        openStone(entity);
      } else if (entity.type === "collect") {
        collectMaterial(entity);
      } else if (entity.type === "portal") {
        openPortal(entity);
      } else if (entity.type === "zone_gate") {
        changeZone(entity.target);
      } else if (entity.type === "landmark") {
        openLandmark(entity);
      } else if (entity.type === "door") {
        enterRoom(entity);
      } else if (entity.type === "exit") {
        leaveRoom();
      } else if (entity.type === "bench") {
        openCraft();
      } else if (entity.type === "monster") {
        startBattle(entity, false);
      } else if (entity.type === "boss") {
        if (entity.id === "boss_1" && !state._unlockAll) {
          const required = ["defeat3", "chest2", "collect3"];
          const missing = required.filter((id) => {
            const task = state.tasks.find((t) => t.id === id);
            return !task || !task.done;
          });
          if (missing.length) {
            showToast("主线尚未完成：先击败 3 只怪物、开启 2 个宝箱、采集 3 次材料");
            return;
          }
        }
        if (entity.id === "final_boss" && !state.strategyCleared) {
          showToast("先肃清战略星塔的战略迷雾兽和并购巨像");
          return;
        }
        const zoneFlag = REGION_CLEARED_FLAG[entity.id];
        if (zoneFlag && !state[zoneFlag]) {
          showToast("先肃清本区域的普通怪物，再挑战区域 Boss");
          return;
        }
        openBossIntro(entity);
      }
    }

    function enterRoom(entity) {
      const room = ROOMS[entity.target];
      if (!room) return;
      fadeAction(() => {
        state.room = entity.target;
        if (!state.visitedRooms.includes(entity.target)) {
          state.visitedRooms.push(entity.target);
          if (state.visitedRooms.length >= 15) unlockAchievement("rooms15");
          const roomTask = ROOM_TASK_MAP[entity.target];
          if (roomTask) updateTask(roomTask, 1);
        }
        state.player.x = room.spawn.x;
        state.player.y = room.spawn.y;
        state.player.moveTarget = null;
        closeModal();
        updateHUD();
        sfx("door");
        showToast("进入" + room.name);
      });
    }

    function leaveRoom() {
      if (!state.room) return;
      const room = ROOMS[state.room];
      fadeAction(() => {
        state.room = null;
        state.player.x = room.doorExternal.x;
        state.player.y = room.doorExternal.y;
        state.player.moveTarget = null;
        closeModal();
        updateHUD();
        sfx("doorClose");
        showToast("返回金算原野");
      });
    }

    const ZONE_UNLOCK = {
      audit_tower: () => state.bossKilled,
      capital_forest: () => state.auditCleared,
      tax_wasteland: () => state.capitalCleared,
      law_temple: () => state.taxCleared,
      strategy_star: () => state.lawCleared
    };

    function changeZone(target) {
      if (ZONE_UNLOCK[target] && !ZONE_UNLOCK[target]()) {
        showToast("该区域尚未解锁");
        return;
      }
      fadeAction(() => {
        state.room = null;
        state.zone = target;
        state.player.x = target === "audit_tower" ? 480 : 440;
        state.player.y = target === "audit_tower" ? 400 : 380;
        if (target === "capital_forest") {
          state.player.x = 480;
          state.player.y = 400;
        }
        if (target === "tax_wasteland") {
          state.player.x = 480;
          state.player.y = 400;
        }
        if (target === "law_temple") {
          state.player.x = 480;
          state.player.y = 400;
        }
        if (target === "strategy_star") {
          state.player.x = 480;
          state.player.y = 400;
        }
        state.player.moveTarget = null;
        closeModal();
        activateRegionTasks(target);
        save();
        updateHUD();
        const names = { audit_tower: "审计铁堡", capital_forest: "资本密林", tax_wasteland: "税率荒原", law_temple: "法条神殿", strategy_star: "战略星塔", gold_field: "金算原野" };
        playZoneBgm(target);
        showToast("进入" + (names[target] || target));
      });
    }

    function collectMaterial(entity) {
      state.inventory.materials[entity.material] = (state.inventory.materials[entity.material] || 0) + entity.amount;
      state.collectCount += 1;
      if (state.collectCount >= 10) unlockAchievement("collect10");
      mapEffects.push({ text: "+1 " + entity.label, x: entity.x + 8, y: entity.y, color: "#ffd166", born: Date.now() });
        updateTask("collect3", 1);
        state.partner.mood = Math.min(100, state.partner.mood + 2);
        gainPartnerExp(5);
        save();
      updateHUD();
      sfx("collect");
      sfx("gold");
      showToast("采集到 " + entity.label);
    }

    function openBossIntro(boss) {
      const isFinal = boss.id === "final_boss";
      const zoneIntro = REGION_BOSS_INTRO[boss.id];
      const title = isFinal ? "战略星塔 · 终局试炼" : zoneIntro ? zoneIntro.title : "天平衡碑 · 决战前";
      const text = isFinal
        ? "六域失衡之主把六科知识扭曲成了混乱闭环。会计、审计、财管、税法、经济法和战略的力量同时失控。<br><br>战略官：这是最终试炼。回答每一道题，才能让六域重新平衡。"
        : zoneIntro ? zoneIntro.text : "合并报表巨像正从无数扭曲的凭证中重组，天平开始失衡。<br><br>小分：这就是借贷失衡的源头。只有答对报表知识，才能找到它的弱点。";
      openModal(`
        <div class="modal-box">
          <div class="modal-title">${title}</div>
          <div class="info-card">${text}</div>
          <div class="modal-actions">
            <button class="pixel-btn" data-action="boss-start" data-boss="${boss.id}">开始决战</button>
            <button class="pixel-btn secondary" data-action="close">暂避</button>
          </div>
        </div>
      `);
    }

    function openPortal(portal) {
      if (portal.target === "审计铁堡" && state.bossKilled) {
        openModal(`
          <div class="modal-box">
            <div class="modal-title">${portal.target} 路 入口开启</div>
            <div class="info-card">
              你已击破合并报表巨像，审计铁堡的传送门开始运转。前方有新的审计怪物和战利品。
            </div>
            <div class="modal-actions">
              <button class="pixel-btn" data-action="enter-audit-tower">进入审计铁堡</button>
              <button class="pixel-btn secondary" data-action="close">暂不进入</button>
            </div>
          </div>
        `);
        return;
      }
      openModal(`
        <div class="modal-box">
          <div class="modal-title">${portal.target} · 后续区域</div>
          <div class="info-card">
            传送门暂时封闭。正式版将开放审计铁堡、资本密林、税率荒原、法条神殿和战略星塔。
          </div>
          <div class="modal-actions">
            <button class="pixel-btn" data-action="close">返回金算原野</button>
          </div>
        </div>
      `);
    }

    function openLandmark(landmark) {
      openModal(`
        <div class="modal-box">
          <div class="modal-title">${landmark.label}</div>
          <div class="info-card">${landmark.text}</div>
          <div class="modal-actions">
            <button class="pixel-btn" data-action="close">返回</button>
          </div>
        </div>
      `);
    }

  function npcDialogText(npc) {
    if (npc.id === "npc_old") {
      if (state.gameCompleted) return "你比当年那些考生更厉害。六域已经平衡，但这把算盘我还给你留着。";
      if (state.bossKilled) return "借贷已经重新平衡。接下来还有五个区域等着你，记住：每一条分录都有来处。";
      return npc.text;
    }
    if (npc.id === "npc_xiaofen") {
      if (state.gameCompleted) return "你完成了整片记账大陆的冒险！六科知识都被你重新点亮了。";
      if (state.bossKilled) return "你击败了合并报表巨像！金算原野恢复平静了，快去审计铁堡吧。";
      return npc.text;
    }
    if (npc.id === "npc_shenming") {
      if (state.gameCompleted) return "六域平衡了。你不仅是勇者，更是真正的会计师。";
      if (state.bossKilled) return "我这边已经准备好新货。审计铁堡的证据链需要你去验证。";
      return npc.text;
    }
    const memory = REGION_NPC_MEMORY[npc.id];
    if (memory) {
      if (state.gameCompleted) return memory.finalText;
      if (state[memory.boss]) return memory.bossText;
      if (state[memory.cleared]) return memory.clearedText;
    }
    return npc.text;
  }

  function openNpcDialog(npc) {
    if (npc.id === "npc_old") {
      updateTask("talk_old", 1);
      const oldTask = state.tasks.find((t) => t.id === "talk_old");
      if (oldTask && oldTask.deliverable) deliverTask("talk_old", true);
    }
    const deliverable = state.tasks.filter((t) => t.deliverable && t.deliverNpc === npc.id);
    const deliveryCards = deliverable
      .map((t) => {
        const reward = t.reward || { gold: 30, exp: 40, skillPoints: 1 };
        return `
          <div class="delivery-card">
            <div class="delivery-title">待交付 · ${t.title}</div>
            <div class="delivery-desc">${t.desc}</div>
            <div class="delivery-rewards">
              <span>${reward.gold} 金币</span>
              <span>${reward.exp} 经验</span>
              <span>${reward.skillPoints} 技能点</span>
            </div>
            <div class="modal-actions">
              <button class="pixel-btn" data-action="deliver-task" data-task="${t.id}">交付：${t.title}</button>
            </div>
          </div>
        `;
      })
      .join("");
    openModal(`
      <div class="modal-box">
        <div class="modal-title">NPC · ${npc.name}</div>
        <div class="npc-card">
          <div class="npc-name">${uiIcon("cursor")}${npc.label}</div>
          <div class="npc-line">${npcDialogText(npc)}</div>
        </div>
        ${deliveryCards}
        <div class="modal-actions">
          <button class="pixel-btn" data-action="close">关闭</button>
          <button class="pixel-btn secondary" data-action="learn">学习提示</button>
          ${npc.id === "npc_shenming" ? (isSystemUnlocked("shop") ? '<button class="pixel-btn secondary" data-action="shop">打开商店</button>' : '<button class="pixel-btn secondary" disabled>商店 Lv.5</button>') : ""}
        </div>
      </div>
    `);
  }

  function openChest(chest) {
    if (state.openedChests.includes(chest.id)) return;
    state.openedChests.push(chest.id);
    if (state.openedChests.length >= 2) unlockAchievement("open_chest2");
    if (state.openedChests.length >= 10) unlockAchievement("chest10");
    state.player.gold += chest.reward;
    if (chest.id === "chest_2" && state.weapon.id === "pencil_sword") {
      state.weapon = { id: "compounding_dagger", name: "复利匕首", atk: 8 };
      showToast("获得装备：复利匕首");
    } else if (chest.id === "chest_1" && state.armor.id === "apprentice_robe") {
      state.armor = { id: "audit_light_armor", name: "审铁轻甲", def: 4 };
      showToast("获得装备：审铁轻甲");
    }
    updateTask("chest2", 1);
    save();
    updateHUD();
    sfx("chest");
    sfx("gold");
    showToast("获得 " + chest.reward + " 金币");
  }

  function activateRegionTasks(zone) {
    const group = REGION_TASK_GROUPS[zone];
    if (!group) return;
    group.forEach((task) => {
      if (!state.tasks.some((t) => t.id === task.id)) state.tasks.push({ ...task });
    });
    ensureTaskFields();
  }

  function advanceMainStory(step) {
    if (state.mainStep >= step) return;
    state.mainStep = step;
    save();
    const lines = MAIN_STORY[step];
    if (!lines) return;
    if (state._unlockAll) return;
    if (modal.classList.contains("hidden")) {
      playStory(lines, () => {});
    } else {
      state._pendingMainStory = lines;
      showToast("主线剧情已推进：" + (MAIN_STEP_LABELS[step] || "新章节"));
    }
  }

  function flushPendingStory() {
    if (!state._pendingMainStory) return;
    const lines = state._pendingMainStory;
    state._pendingMainStory = null;
    playStory(lines, () => {});
  }

  function updateTask(taskId, amount) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task || task.done) return;
    task.progress = Math.min(task.target, task.progress + amount);
    if (task.progress >= task.target) {
      if (!task.deliverable && !task.done) {
        if (!task.deliverNpc) {
          deliverTask(task.id);
        } else {
          task.deliverable = true;
          save();
          updateHUD();
          showToast("任务完成：" + task.title + "，请前往对应 NPC 交付");
        }
      }
    }
    if (["defeat3", "chest2", "collect3"].includes(taskId) && !state.bossKilled) {
      const ready = ["defeat3", "chest2", "collect3"].every((id) => {
        const t = state.tasks.find((x) => x.id === id);
        return t && t.done;
      });
      if (ready) advanceMainStory(1);
    }
  }

  function deliverTask(taskId, silent = false) {
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task || task.done) return;
    task.deliverable = false;
    task.done = true;
    const reward = task.reward || { gold: 30, exp: 40, skillPoints: 1 };
    state.player.gold += reward.gold;
    state.player.exp += reward.exp;
    state.player.skillPoints += reward.skillPoints;
    maybeLevelUp();
    save();
    updateHUD();
    const doneCount = state.tasks.filter((t) => t.done).length;
    if (doneCount >= 25) unlockAchievement("task25");
    sfx("win");
    if (silent) {
      showToast("任务交付完成：" + task.title);
      return;
    }
    openModal(`
      <div class="modal-box">
        <div class="modal-title">任务交付完成</div>
        <div class="result-banner correct">${task.title}</div>
        <div class="reward-grid">
          <div class="report-card"><div class="num">${reward.gold} G</div><div>金币</div></div>
          <div class="report-card"><div class="num">${reward.exp}</div><div>经验</div></div>
          <div class="report-card"><div class="num">+${reward.skillPoints}</div><div>技能点</div></div>
        </div>
        <div class="info-card">${task.desc}</div>
        <div class="modal-actions">
          <button class="pixel-btn" data-action="close">返回</button>
          <button class="pixel-btn secondary" data-action="npc-return" data-npc="${task.deliverNpc || ""}">继续与 NPC 对话</button>
        </div>
      </div>
    `);
  }

  function openEquip() {
    if (!isSystemUnlocked("equip")) {
      showToast(systemLockTip("equip", "装备与技能") + " 解锁");
      return;
    }
    const job = getCurrentJob();
    const jobButtons = Object.values(JOBS)
      .map((j) => {
        const unlocked = state.jobs.unlocked.includes(j.id);
        const current = state.jobs.current === j.id;
        const label = current ? j.name + "（当前）" : unlocked ? j.name : j.name + "（后续解锁）";
        const button = unlocked && !current
          ? `<button class="pixel-btn small" data-action="switch-job" data-job="${j.id}">切换</button>`
          : `<span class="caption">${current ? "使用中" : "未解锁"}</span>`;
        return `<div class="book-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
          <div><b>${label}</b><br><span class="caption">${j.desc}</span></div>${button}
        </div>`;
      })
      .join("");

    const skillRows = getCurrentJobSkills()
      .map((s) => {
        if (job.id === "accountant") {
          const learned = state.unlockedSkills.includes(s.id);
          const button = learned
            ? `<span style="color:#2f7a35;">已习得</span>`
            : `<button class="pixel-btn small" data-action="learn-skill" data-skill="${s.id}">学习</button>`;
          return `<div class="book-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;" data-tip="${s.name}：${s.desc} · 消耗 ${s.mp} MP">
            <div><b>${s.name}</b> · ${s.mp} MP<br><span class="caption">${s.desc}</span></div>${button}
          </div>`;
        }
        return `<div class="book-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;" data-tip="${s.name}：${s.desc} · 消耗 ${s.mp} MP">
          <div><b>${s.name}</b> · ${s.mp} MP<br><span class="caption">${s.desc}</span></div><span style="color:#2f7a35;">已习得</span>
        </div>`;
      })
      .join("");
    openModal(`
      <div class="modal-box">
        <div class="modal-title">装备与技能</div>
        <div class="equip-layout">
          <div class="equip-column">
            <div class="book-card">
              <span class="book-point">武器槽</span>
              <div class="equip-slot-name">${state.weapon.name}</div>
              <div class="caption">ATK +${getWeaponAtk()} · 强化 ${state.equipmentLevels.weapon}</div>
            </div>
            <div class="book-card">
              <span class="book-point">防具槽</span>
              <div class="equip-slot-name">${state.armor.name}</div>
              <div class="caption">DEF +${getArmorDef()} · 强化 ${state.equipmentLevels.armor}</div>
            </div>
            <div class="book-card">
              <div class="equip-slot-name">角色属性</div>
              <div class="caption">攻击 ${state.player.attack + getWeaponAtk() + getJobBonus("atk")} · 防御 ${state.player.defense + getArmorDef() + getJobBonus("def")}</div>
              <div class="caption">技能点 ${state.player.skillPoints} · 职业 ${job.name}（${job.subject}）</div>
            </div>
            <div class="modal-actions">
              <button class="pixel-btn" data-action="enhance">装备强化</button>
            </div>
          </div>
          <div class="equip-column">
            <div class="book-card">
              <span class="book-point">职业</span>
              ${jobButtons}
            </div>
            <div class="book-card">
              <span class="book-point">当前职业技能</span>
              ${skillRows}
            </div>
          </div>
        </div>
        <div class="modal-actions"><button class="pixel-btn" data-action="close">返回</button></div>
      </div>
    `);
  }

  function openSkillTree() {
    if (!isSystemUnlocked("skill")) {
      showToast(systemLockTip("skill", "技能树") + " 解锁");
      return;
    }
    const job = getCurrentJob();
    const skills = getCurrentJobSkills();
    const layers = [
      { title: "基础层", skills: skills.slice(0, 2) },
      { title: "进阶层", skills: skills.slice(2, 4) },
      { title: "高阶层", skills: skills.slice(4) }
    ].filter((layer) => layer.skills.length);
    const treeHtml = layers
      .map((layer) => {
        const cards = layer.skills
          .map((s) => {
            const learned = job.id === "accountant" ? state.unlockedSkills.includes(s.id) : true;
            const stateText = learned ? "已习得" : "可学习";
            const learnBtn = job.id === "accountant" && !learned
              ? `<button class="pixel-btn small" data-action="learn-skill" data-skill="${s.id}" data-from="skill-tree">学习</button>`
              : "";
            return `
              <div class="skill-tree-card ${learned ? "" : "locked"}" data-tip="${s.name}：${s.desc} · 消耗 ${s.mp} MP">
                <span class="skill-state">${stateText}</span>
                <b>${s.name}</b> · ${s.mp} MP
                <small>${s.desc}</small>
                <div class="modal-actions" style="margin-top:10px;">${learnBtn}</div>
              </div>
            `;
          })
          .join("");
        return `
          <div class="skill-tree-layer">
            <div class="skill-tree-layer-title">${layer.title}</div>
            <div class="skill-tree-cards">${cards}</div>
          </div>
        `;
      })
      .join("");
    openModal(`
      <div class="modal-box">
        <div class="modal-title">技能树 · ${job.name}</div>
        <div class="info-card">${job.subject}职业技能按层级展示。会计职业可用技能点学习；其他职业随转职自动获得。</div>
        <div class="skill-tree">${treeHtml}</div>
        <div class="modal-actions">
          <button class="pixel-btn" data-action="close">返回</button>
          <button class="pixel-btn secondary" data-action="equip">装备与职业</button>
        </div>
      </div>
    `);
  }

  function switchJob(jobId) {
    if (!state.jobs.unlocked.includes(jobId) || state.jobs.current === jobId) return;
    state.jobs.current = jobId;
    save();
    sfx("switch");
    sfx("levelup");
    showToast("切换职业：" + JOBS[jobId].name);
    if (!state.jobStoriesSeen.includes(jobId)) {
      state.jobStoriesSeen.push(jobId);
      save();
      const job = JOBS[jobId];
      openModal(`
        <div class="modal-box">
          <div class="modal-title">${job.name} · 职业试炼</div>
          <div class="modal-text">
            你转职为${job.name}，进入${job.subject}领域。<br><br>
            ${job.desc}。使用职业技能时需要回答对应科目的知识题。
          </div>
          <div class="modal-actions">
            <button class="pixel-btn" data-action="job-story-continue">开始使用</button>
          </div>
        </div>
      `);
    } else {
      openEquip();
    }
  }

  function learnSkill(skillId, from = "equip") {
    const skill = SKILLS[skillId];
    if (!skill || state.unlockedSkills.includes(skill.id)) return;
    if (state.player.skillPoints < 1) {
      showToast("技能点不足");
      return;
    }
    state.player.skillPoints -= 1;
    state.unlockedSkills.push(skill.id);
    save();
    sfx("switch");
    sfx("levelup");
    showToast("习得技能：" + skill.name);
    if (from === "skill-tree") openSkillTree();
    else openEquip();
  }

  function openShop() {
    if (!isSystemUnlocked("shop")) {
      showToast(systemLockTip("shop", "商店") + " 解锁");
      return;
    }
    const ownedWeapon = state.weapon.id === "compounding_dagger";
    const ownedArmor = state.armor.id === "audit_light_armor";
    const items = [
      { id: "hp_potion", name: "初级回复药水", desc: "恢复 30 HP", price: 20, disabled: false },
        { id: "mp_potion", name: "以太之露", desc: "恢复 30 MP", price: 15, disabled: false },
        { id: "compounding_dagger", name: "复利匕首", desc: "ATK +8", price: 120, disabled: ownedWeapon },
        { id: "audit_light_armor", name: "审铁轻甲", desc: "DEF +4", price: 150, disabled: ownedArmor },
        { id: "job_token_finance", name: "财管游侠职业凭证", desc: "解锁财管游侠", price: 200, disabled: state.jobs.unlocked.includes("finance") },
        { id: "job_token_tax", name: "税法弓手职业凭证", desc: "解锁税法弓手", price: 200, disabled: state.jobs.unlocked.includes("tax") },
        { id: "job_token_law", name: "经济法祭司职业凭证", desc: "解锁经济法祭司", price: 200, disabled: state.jobs.unlocked.includes("law") },
        { id: "job_token_strategy", name: "战略召唤师职业凭证", desc: "解锁战略召唤师", price: 200, disabled: state.jobs.unlocked.includes("strategy") }
    ];
    const rows = items
      .map(
        (item) => `
          <div class="book-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;" data-tip="${item.name}：${item.desc} · ${item.price} G">
            <div><b>${item.name}</b><br><span class="caption">${item.desc} · ${item.price} G${item.disabled ? " · 已拥有" : ""}</span></div>
            ${item.disabled ? "" : `<button class="pixel-btn small" data-action="shop-buy" data-item="${item.id}">购买</button>`}
          </div>
        `
      )
      .join("");
    openModal(`
      <div class="modal-box">
        <div class="modal-title">审明杂货铺</div>
        <div class="modal-text">当前金币：${state.player.gold} G</div>
        ${rows}
        <div class="modal-actions"><button class="pixel-btn" data-action="close">离开</button></div>
      </div>
    `);
  }

  function buyItem(itemId) {
    const prices = {
      hp_potion: 20,
      mp_potion: 15,
      compounding_dagger: 120,
      audit_light_armor: 150,
      job_token_finance: 200,
      job_token_tax: 200,
      job_token_law: 200,
      job_token_strategy: 200
    };
    const price = prices[itemId];
    if (price === undefined) return;
    if (state.player.gold < price) {
      showToast("金币不足");
      return;
    }
    state.player.gold -= price;
    if (itemId === "hp_potion") state.inventory.hpPotion = (state.inventory.hpPotion || 0) + 1;
    else if (itemId === "mp_potion") state.inventory.mpPotion = (state.inventory.mpPotion || 0) + 1;
    else if (itemId === "compounding_dagger") state.weapon = { id: "compounding_dagger", name: "复利匕首", atk: 8 };
    else if (itemId === "audit_light_armor") state.armor = { id: "audit_light_armor", name: "审铁轻甲", def: 4 };
    else if (itemId === "job_token_finance" && !state.jobs.unlocked.includes("finance")) state.jobs.unlocked.push("finance");
    else if (itemId === "job_token_tax" && !state.jobs.unlocked.includes("tax")) state.jobs.unlocked.push("tax");
    else if (itemId === "job_token_law" && !state.jobs.unlocked.includes("law")) state.jobs.unlocked.push("law");
    else if (itemId === "job_token_strategy" && !state.jobs.unlocked.includes("strategy")) state.jobs.unlocked.push("strategy");
    if (state.jobs.unlocked.length >= 6) unlockAchievement("all_jobs");
    updateTask("shop_task", 1);
    save();
    updateHUD();
    sfx("item");
    sfx("gold");
    showToast("购买成功");
    openShop();
  }

  function openCraft() {
    if (!isSystemUnlocked("craft")) {
      showToast(systemLockTip("craft", "打造") + " 解锁");
      return;
    }
    const m = state.inventory.materials;
    const recipes = [
      { id: "hp_potion_craft", name: "高级回复药水", desc: "墨渍残页 ×1 → 回复药水 ×2", price: { ink: 1 }, disabled: m.ink < 1 },
      { id: "mp_potion_craft", name: "以太药包", desc: "算盘珠 ×1 → 以太之露 ×2", price: { beads: 1 }, disabled: m.beads < 1 },
      { id: "craft_dagger", name: "复利匕首", desc: "金算石 ×2 + 墨渍残页 ×1", price: { stone: 2, ink: 1 }, disabled: state.weapon.id === "compounding_dagger" || m.stone < 2 || m.ink < 1 },
      { id: "craft_armor", name: "审铁轻甲", desc: "算盘珠 ×2 + 金算石 ×1", price: { beads: 2, stone: 1 }, disabled: state.armor.id === "audit_light_armor" || m.beads < 2 || m.stone < 1 }
    ];
    const rows = recipes
      .map(
        (r) => `
          <div class="book-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
            <div><b>${r.name}</b><br><span class="caption">${r.desc}</span></div>
            ${r.disabled ? "" : `<button class="pixel-btn small" data-action="craft-item" data-item="${r.id}">打造</button>`}
          </div>
        `
      )
      .join("");
    openModal(`
      <div class="modal-box">
        <div class="modal-title">打造工坊</div>
        <div class="modal-text">
          金算石 ×${m.stone || 0} · 墨渍残页 ×${m.ink || 0} · 算盘珠 ×${m.beads || 0} · 合并凭证 ×${m.credential || 0}
        </div>
        ${rows}
        <div class="modal-actions"><button class="pixel-btn" data-action="close">返回</button></div>
      </div>
    `);
  }

  function craftItem(itemId) {
    const recipes = {
      hp_potion_craft: { name: "高级回复药水", price: { ink: 1 } },
      mp_potion_craft: { name: "以太药包", price: { beads: 1 } },
      craft_dagger: { name: "复利匕首", price: { stone: 2, ink: 1 } },
      craft_armor: { name: "审铁轻甲", price: { beads: 2, stone: 1 } }
    };
    const recipe = recipes[itemId];
    if (!recipe) return;
    const m = state.inventory.materials;
    for (const [key, count] of Object.entries(recipe.price)) {
      if ((m[key] || 0) < count) {
        showToast("材料不足");
        return;
      }
    }
    for (const [key, count] of Object.entries(recipe.price)) m[key] -= count;
    if (itemId === "hp_potion_craft") state.inventory.hpPotion = (state.inventory.hpPotion || 0) + 2;
    else if (itemId === "mp_potion_craft") state.inventory.mpPotion = (state.inventory.mpPotion || 0) + 2;
    else if (itemId === "craft_dagger") state.weapon = { id: "compounding_dagger", name: "复利匕首", atk: 8 };
    else if (itemId === "craft_armor") state.armor = { id: "audit_light_armor", name: "审铁轻甲", def: 4 };
    updateTask("craft_task", 1);
    save();
    updateHUD();
    sfx("craft");
    sfx("levelup");
    showToast("打造成功：" + recipe.name);
    openCraft();
  }

  function openEnhance() {
    if (!isSystemUnlocked("enhance")) {
      showToast(systemLockTip("enhance", "装备强化") + " 解锁");
      return;
    }
    const m = state.inventory.materials;
    const wLevel = state.equipmentLevels.weapon || 0;
    const aLevel = state.equipmentLevels.armor || 0;
    const weaponCost = wLevel >= 5 ? null : { stone: 2 + wLevel, beads: 1, gold: 30 * (wLevel + 1) };
    const armorCost = aLevel >= 5 ? null : { beads: 2 + aLevel, ink: 1, gold: 30 * (aLevel + 1) };
    const weaponRow = weaponCost
      ? `<button class="pixel-btn small" data-action="enhance-item" data-slot="weapon">强化武器</button>`
      : `<span style="color:#2f7a35;">已满级</span>`;
    const armorRow = armorCost
      ? `<button class="pixel-btn small" data-action="enhance-item" data-slot="armor">强化防具</button>`
      : `<span style="color:#2f7a35;">已满级</span>`;
    openModal(`
      <div class="modal-box">
        <div class="modal-title">装备强化</div>
        <div class="modal-text">
          金算石 ×${m.stone || 0} · 墨渍残页 ×${m.ink || 0} · 算盘珠 ×${m.beads || 0} · 金币 ${state.player.gold}
        </div>
        <div class="book-card">
          <b>${state.weapon.name}</b> · 强化 +${wLevel}（当前 ATK ${getWeaponAtk()}）
          ${weaponCost ? `<div class="caption">消耗：金算石 ×${weaponCost.stone} · 算盘珠 ×${weaponCost.beads} · ${weaponCost.gold} G</div>` : ""}
          ${weaponRow}
        </div>
        <div class="book-card">
          <b>${state.armor.name}</b> · 强化 +${aLevel}（当前 DEF ${getArmorDef()}）
          ${armorCost ? `<div class="caption">消耗：算盘珠 ×${armorCost.beads} · 墨渍残页 ×${armorCost.ink} · ${armorCost.gold} G</div>` : ""}
          ${armorRow}
        </div>
        <div class="modal-actions"><button class="pixel-btn" data-action="close">返回</button></div>
      </div>
    `);
  }

  function enhanceItem(slot) {
    const level = state.equipmentLevels[slot] || 0;
    if (level >= 5) return;
    const m = state.inventory.materials;
    const cost = slot === "weapon"
      ? { stone: 2 + level, beads: 1, gold: 30 * (level + 1) }
      : { beads: 2 + level, ink: 1, gold: 30 * (level + 1) };
    if ((m.stone || 0) < (cost.stone || 0) || (m.beads || 0) < (cost.beads || 0) || (m.ink || 0) < (cost.ink || 0) || state.player.gold < cost.gold) {
      showToast("材料或金币不足");
      return;
    }
    if (cost.stone) m.stone -= cost.stone;
    if (cost.beads) m.beads -= cost.beads;
    if (cost.ink) m.ink -= cost.ink;
    state.player.gold -= cost.gold;
    state.equipmentLevels[slot] = level + 1;
    updateTask("enhance_task", 1);
    unlockAchievement("enhance1");
    save();
    updateHUD();
    sfx("enhance");
    sfx("levelup");
    showToast(`${slot === "weapon" ? state.weapon.name : state.armor.name} 强化至 +${level + 1}`);
    openEnhance();
  }

  function openTasks() {
    const rows = state.tasks
      .map((t) => {
        const reward = t.reward || { gold: 30, exp: 40, skillPoints: 1 };
        const pct = Math.min(100, Math.round((t.progress / t.target) * 100));
        return `
          <div class="book-card">
            <div><b>${t.done ? "✔ " : ""}${t.title}</b><span class="book-status">${t.deliverable ? "待交付" : t.done ? "已完成" : `${t.progress}/${t.target}`}</span></div>
            <div class="caption">${t.desc}</div>
            <div class="report-bar"><div style="width:${pct}%"></div></div>
            <div class="caption">奖励：${reward.gold} G · ${reward.exp} 经验 · ${reward.skillPoints} 技能点</div>
          </div>
        `;
      })
      .join("");
    openModal(`
      <div class="modal-box">
        <div class="modal-title">任务 · ${state.tasks.filter((t) => t.done).length}/${state.tasks.length}</div>
        <div class="modal-text">完成任务会获得金币、经验和技能点奖励。</div>
        ${rows}
        <div class="modal-actions"><button class="pixel-btn" data-action="close">返回</button></div>
      </div>
    `);
  }

  function unlockAchievement(id) {
    if (state.achievements.includes(id)) return;
    const a = ACHIEVEMENTS[id];
    if (!a) return;
    state.achievements.push(id);
    const r = a.reward || {};
    if (r.gold) state.player.gold += r.gold;
    if (r.exp) state.player.exp += r.exp;
    if (r.skillPoints) state.player.skillPoints += r.skillPoints;
    maybeLevelUp();
    save();
    updateHUD();
    sfx("win");
    showAchievementToast(a);
  }

  function openAchievements() {
    const rows = Object.entries(ACHIEVEMENTS)
      .map(([id, a]) => {
        const unlocked = state.achievements.includes(id);
        return `
          <div class="book-card" style="${unlocked ? "" : "opacity:0.62;"}">
            <div><b>${unlocked ? "✔ " : "🔒 "}${a.name}</b><span class="book-status">${unlocked ? "已解锁" : "未解锁"}</span></div>
            <div class="caption">${a.type}</div>
            <div class="caption">${a.desc}</div>
            <div class="caption">奖励：${a.reward.gold || 0} G / ${a.reward.exp || 0} 经验 / ${a.reward.skillPoints || 0} 技能点</div>
          </div>
        `;
      })
      .join("");
    openModal(`
      <div class="modal-box">
        <div class="modal-title">成就 · ${state.achievements.length}/${Object.keys(ACHIEVEMENTS).length}</div>
        <div class="modal-text">完成战斗、学习、探索和成长目标即可解锁奖励。</div>
        ${rows}
        <div class="modal-actions"><button class="pixel-btn" data-action="close">返回</button></div>
      </div>
    `);
  }

  function openWorldMap() {
    const regions = [
      { name: "金算原野", subject: "会计", status: "已开放 · 5个室内试炼点", color: "#d4a017", zone: "gold_field" },
      { name: "审计铁堡", subject: "审计", status: state.auditBossKilled ? "已开放 · 区域 Boss 已讨伐" : state.bossKilled ? "已开放" : "击败合并报表巨像后解锁", color: "#4169e1", zone: state.bossKilled ? "audit_tower" : null },
      { name: "资本密林", subject: "财管", status: state.capitalBossKilled ? "已开放 · 区域 Boss 已讨伐" : state.auditCleared ? "已开放" : "肃清审计铁堡后解锁", color: "#2e8b57", zone: state.auditCleared ? "capital_forest" : null },
      { name: "税率荒原", subject: "税法", status: state.taxBossKilled ? "已开放 · 区域 Boss 已讨伐" : state.capitalCleared ? "已开放" : "肃清资本密林后解锁", color: "#e4572e", zone: state.capitalCleared ? "tax_wasteland" : null },
      { name: "法条神殿", subject: "经济法", status: state.lawBossKilled ? "已开放 · 区域 Boss 已讨伐" : state.taxCleared ? "已开放" : "肃清税率荒原后解锁", color: "#6b5b95", zone: state.taxCleared ? "law_temple" : null },
      { name: "战略星塔", subject: "战略", status: state.gameCompleted ? "已通关" : state.strategyBossKilled ? "已开放 · 区域 Boss 已讨伐" : state.lawCleared ? "已开放" : "肃清法条神殿后解锁", color: "#3a8fb7", zone: state.lawCleared || state.gameCompleted ? "strategy_star" : null }
    ];
    const cards = regions
      .map(
        (r) => `
          <div class="panel-light" style="padding:12px;margin-bottom:8px;border-left:6px solid ${r.color};">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;"><b>${r.name}</b> · ${r.subject}${r.zone ? `<button class="pixel-btn small" data-action="world-zone" data-zone="${r.zone}">前往</button>` : ""}</div>
            <div class="caption">${r.status}</div>
          </div>
        `
      )
      .join("");
    openModal(`
        <div class="modal-box">
          <div class="modal-title">记账大陆 · 世界地图</div>
          <div class="modal-text">六区域对应六科，完整商业化版本将逐步开放。金算原野目前可进入商店、工坊、档案室、旧账房，以及审计、财管、税法、经济法、战略五个主题房间。</div>
          <canvas id="worldMapCanvas" class="world-map-canvas" width="840" height="260"></canvas>
          ${cards}
          <div class="modal-actions"><button class="pixel-btn" data-action="close">返回</button></div>
        </div>
      `);
    drawWorldMapCanvas();
  }

  function drawWorldMapCanvas() {
    const canvas = document.getElementById("worldMapCanvas");
    if (!canvas) return;
    const c = canvas.getContext("2d");
    const regions = [
      { name: "金算原野", color: "#d4a017", open: true },
      { name: "审计铁堡", color: "#4169e1", open: !!state.bossKilled },
      { name: "资本密林", color: "#2e8b57", open: !!state.auditCleared },
      { name: "税率荒原", color: "#e4572e", open: !!state.capitalCleared },
      { name: "法条神殿", color: "#6b5b95", open: !!state.taxCleared },
      { name: "战略星塔", color: "#3a8fb7", open: !!state.lawCleared || !!state.gameCompleted }
    ];
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = "#17130f";
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = "rgba(255, 228, 154, 0.08)";
    for (let i = 0; i < 90; i++) {
      c.fillRect((i * 97) % canvas.width, (i * 41) % canvas.height, 2, 2);
    }
    regions.forEach((r, i) => {
      const x = 24 + i * 134;
      const y = 30;
      const w = 116;
      const h = 190;
      c.fillStyle = r.open ? "rgba(24, 20, 16, 0.96)" : "rgba(24, 20, 16, 0.62)";
      c.fillRect(x, y, w, h);
      c.fillStyle = r.color;
      c.fillRect(x, y, w, 8);
      c.fillRect(x, y + 34, w, 4);
      c.fillStyle = r.open ? "#f2c95f" : "#9a8570";
      c.font = "bold 18px 'Microsoft YaHei'";
      c.textAlign = "center";
      c.fillText(r.name, x + w / 2, y + 26);
      c.font = "bold 13px 'Microsoft YaHei'";
      c.fillText(r.open ? "已开放" : "未解锁", x + w / 2, y + 64);
      c.strokeStyle = "rgba(255, 244, 214, 0.28)";
      c.lineWidth = 2;
      c.strokeRect(x + 14, y + 78, w - 28, h - 96);
      c.textAlign = "left";
    });
  }

  function openPartner() {
    if (!isSystemUnlocked("partner")) {
      showToast(systemLockTip("partner", "伙伴") + " 解锁");
      return;
    }
    const partner = state.partner;
    const moodLevel = partner.mood < 40 ? "陌生" : partner.mood < 70 ? "熟悉" : "信赖";
    const hpPct = Math.round((partner.hp / partner.maxHp) * 100);
    const expPct = Math.round((partner.exp / partner.expNext) * 100);
    openModal(`
      <div class="modal-box">
        <div class="modal-title">伙伴 · ${partner.name}</div>
        <div class="modal-text">
          记账精灵会在战斗中自动协助攻击。好感度越高，协助伤害越高。
        </div>
        <div class="report-grid">
          <div class="report-card"><div class="num">${partner.level}</div><div>等级</div></div>
          <div class="report-card"><div class="num">${partner.atk + partner.level}</div><div>攻击</div></div>
          <div class="report-card"><div class="num">${partner.mood}/100</div><div>好感 · ${moodLevel}</div></div>
        </div>
        <div class="modal-text"><b>HP</b></div>
        <div class="report-bar"><div style="width:${hpPct}%"></div></div>
        <div class="modal-text"><b>经验</b></div>
        <div class="report-bar"><div style="width:${expPct}%"></div></div>
        <div class="modal-text">技能：${partner.skill}（好感≥70 时，每场战斗首次技能答对伤害提升 30%）</div>
        <div class="modal-actions"><button class="pixel-btn" data-action="close">返回</button></div>
      </div>
    `);
  }

  function openPlan() {
    const plan = state.plan;
    const progress = Math.min(100, Math.round((state.daily.answered / Math.max(1, state.daily.target)) * 100));
    const targetBtns = [5, 10, 15, 20]
      .map((n) => `<button class="pixel-btn small ${plan.dailyTarget === n ? "" : "secondary"}" data-action="plan-target" data-target="${n}">${n}题</button>`)
      .join("");
    const subjectBtns = [
      `<button class="pixel-btn small ${plan.subjects.length === 0 ? "" : "secondary"}" data-action="plan-subject" data-subject="__all">全部科目</button>`,
      ...Object.keys(PLAN_SUBJECT_POINTS).map(
        (subject) => `<button class="pixel-btn small ${plan.subjects.includes(subject) ? "" : "secondary"}" data-action="plan-subject" data-subject="${subject}">${subject}</button>`
      )
    ].join("");
    openModal(`
      <div class="modal-box">
        <div class="modal-title">学习计划</div>
        <div class="report-grid">
          <div class="report-card"><div class="num">${state.daily.answered}/${state.daily.target}</div><div>今日进度</div></div>
          <div class="report-card"><div class="num">${progress}%</div><div>完成率</div></div>
          <div class="report-card"><div class="num">${plan.subjects.length ? plan.subjects.join("、") : "全部"}</div><div>科目偏好</div></div>
        </div>
        <div class="report-bar"><div style="width:${progress}%"></div></div>
        <div class="modal-text"><b>每日目标</b></div>
        <div class="modal-actions">${targetBtns}</div>
        <div class="modal-text"><b>科目偏好</b><br>未选择时从全部科目抽取题目。</div>
        <div class="modal-actions">${subjectBtns}</div>
        <div class="modal-actions">
          <button class="pixel-btn" data-action="challenge-start" data-mode="plan">开始今日计划</button>
          <button class="pixel-btn secondary" data-action="close">返回</button>
        </div>
      </div>
    `);
  }

  function openPointMap() {
    const sections = Object.entries(PLAN_SUBJECT_POINTS)
      .map(([subject, points]) => {
        const chips = points
          .map((point) => `<button class="pixel-btn small point-chip" data-action="point-quiz" data-point="${point}">${point}</button>`)
          .join("");
        return `
          <div class="book-card">
            <span class="book-point">${subject}</span>
            <div class="point-grid">${chips}</div>
          </div>
        `;
      })
      .join("");
    openModal(`
      <div class="modal-box">
        <div class="modal-title">考纲导航</div>
        <div class="info-card">按科目浏览 CPA 考点，点击考点可直接开始 1 道题进行针对性复习。</div>
        ${sections}
        <div class="modal-actions"><button class="pixel-btn" data-action="close">返回</button></div>
      </div>
    `);
  }

  const JOB_QUESTIONS = [
    {
      q: "你更喜欢哪种学习方式？",
      options: [
        { label: "逐笔核对分录与规则", value: "accountant,law" },
        { label: "用数字和模型做计算", value: "finance,tax" },
        { label: "检查证据、识别风险", value: "auditor" },
        { label: "从全局看趋势和决策", value: "strategy" }
      ]
    },
    {
      q: "战斗中你更倾向于？",
      options: [
        { label: "均衡攻击，稳定推进", value: "accountant" },
        { label: "高伤害输出", value: "finance,tax" },
        { label: "防御、护盾和控制", value: "auditor,law" },
        { label: "召唤与全局影响", value: "strategy" }
      ]
    },
    {
      q: "你希望职业技能偏向哪个方向？",
      options: [
        { label: "会计基础与分录连击", value: "accountant" },
        { label: "审计证据与控制测试", value: "auditor" },
        { label: "财管计算与资本预算", value: "finance" },
        { label: "税法远程与税收优惠", value: "tax" },
        { label: "经济法护盾与规则", value: "law" },
        { label: "战略决策与全局指挥", value: "strategy" }
      ]
    }
  ];

  function openJobQuiz() {
    const scores = {};
    for (const jobId of Object.keys(JOBS)) scores[jobId] = 0;
    state.jobQuiz = { idx: 0, scores };
    renderJobQuestion();
  }

  function renderJobQuestion() {
    const quiz = state.jobQuiz;
    if (!quiz) return;
    const item = JOB_QUESTIONS[quiz.idx];
    const options = item.options
      .map((opt, i) => `<button class="pixel-btn option" data-action="job-quiz-answer" data-value="${opt.value}"><span class="tag">${String.fromCharCode(65 + i)}</span>${opt.label}</button>`)
      .join("");
    openModal(`
      <div class="modal-box">
        <div class="modal-title">职业推荐 · 第 ${quiz.idx + 1}/${JOB_QUESTIONS.length} 题</div>
        <div class="info-card">${item.q}</div>
        <div class="quiz-options">${options}</div>
      </div>
    `);
  }

  function finishJobQuiz() {
    const quiz = state.jobQuiz;
    if (!quiz) return;
    const sorted = Object.entries(quiz.scores).sort((a, b) => b[1] - a[1]);
    const best = sorted[0][0];
    const job = JOBS[best];
    if (state.jobs.unlocked.includes(best)) {
      state.jobs.current = best;
      save();
    }
    openModal(`
      <div class="modal-box">
        <div class="modal-title">推荐职业 · ${job.name}</div>
        <div class="info-card">
          ${job.desc}<br><br>
          ${state.jobs.unlocked.includes(best) ? "已为你切换到该职业。" : "该职业尚未解锁，可在后续区域通过商店或剧情解锁后切换。"}
        </div>
        <div class="modal-actions">
          <button class="pixel-btn" data-action="job-recommend-continue">进入装备与技能</button>
          <button class="pixel-btn secondary" data-action="close">返回</button>
        </div>
      </div>
    `);
    state.jobQuiz = null;
  }

  function openChallengeSetup() {
    if (!isSystemUnlocked("challenge")) {
      showToast(systemLockTip("challenge", "复习挑战") + " 解锁");
      return;
    }
    openModal(`
      <div class="modal-box">
        <div class="modal-title">复习挑战</div>
        <div class="modal-text">
          完成 5 道题可获得奖励。正确率达到 80% 以上额外获得技能点。
        </div>
        <div class="modal-actions">
          <button class="pixel-btn" data-action="challenge-start" data-mode="wrong">错题专练</button>
          <button class="pixel-btn secondary" data-action="challenge-start" data-mode="weak">薄弱点专练</button>
          <button class="pixel-btn secondary" data-action="challenge-start" data-mode="mock">模拟考 5 题</button>
        </div>
        <div class="modal-actions">
          <button class="pixel-btn secondary" data-action="close">返回</button>
        </div>
      </div>
    `);
  }

  function startChallenge(mode) {
    let questions = [];
    if (mode === "wrong") {
      questions = state.wrongQuestions
        .map((id) => QUESTIONS.find((q) => q.id === id))
        .filter(Boolean)
        .slice(0, 5);
      if (!questions.length) questions = getRandomQuestions(5);
    } else if (mode === "weak") {
      const sorted = [...POINTS].sort((a, b) => (state.pointProgress[a] || 0) - (state.pointProgress[b] || 0));
      const pool = [];
      for (const point of sorted) {
        pool.push(...QUESTIONS.filter((q) => q.point === point));
        if (pool.length >= 5) break;
      }
      questions = [...pool].sort(() => Math.random() - 0.5).slice(0, 5);
      if (!questions.length) questions = getRandomQuestions(5);
    } else if (mode === "plan") {
      questions = getPlanQuestions(state.plan.dailyTarget || 5);
    } else if (mode === "smart") {
      questions = getSmartReviewQuestions(state.plan.dailyTarget || 5);
    } else {
      questions = getRandomQuestions(5);
    }
    state.challenge = { mode, questions, idx: 0, correct: 0, total: questions.length };
    askChallengeQuestion();
  }

  function askChallengeQuestion() {
    const q = state.challenge.questions[state.challenge.idx];
    state.quiz = {
      q,
      callback: (correct) => {
        if (correct) state.challenge.correct += 1;
        state.challenge.idx += 1;
        if (state.challenge.idx >= state.challenge.total) {
          endChallenge();
        } else {
          askChallengeQuestion();
        }
      }
    };
    openQuiz(q);
  }

  function endChallenge() {
    const c = state.challenge;
    const acc = Math.round((c.correct / c.total) * 100);
    state.player.gold += 20;
    state.player.exp += 10;
    let skillBonus = 0;
    if (c.correct >= Math.ceil(c.total * 0.8)) {
      state.player.skillPoints += 1;
      skillBonus = 1;
    }
    state.examHistory.push({ date: todayString(), correct: c.correct, total: c.total, acc });
    if (state.examHistory.length > 5) state.examHistory.shift();
    maybeLevelUp();
    save();
    updateHUD();
    openModal(`
      <div class="modal-box">
        <div class="modal-title">复习挑战完成</div>
        <div class="result-banner ${acc >= 80 ? "correct" : "wrong"}">正确 ${c.correct} / ${c.total} · 正确率 ${acc}%</div>
        <div class="reward-grid">
          <div class="report-card"><div class="num">20 G</div><div>金币</div></div>
          <div class="report-card"><div class="num">10</div><div>经验</div></div>
          <div class="report-card"><div class="num">${skillBonus ? "+1" : "—"}</div><div>技能点</div></div>
        </div>
        <div class="info-card">${acc >= 80 ? "正确率达到 80%，获得额外技能点。薄弱考点已同步到学习报告。" : "继续针对薄弱考点复习，下次达到 80% 可获得额外技能点。"}</div>
        <div class="modal-actions"><button class="pixel-btn" data-action="close">返回</button></div>
      </div>
    `);
    state.challenge = null;
  }

  function openSettings() {
    const s = state.settings;
    const pct = (v) => Math.round(v * 100);
    openModal(`
      <div class="modal-box">
        <div class="modal-title">设置 · 音频</div>
        <div class="modal-text">
          全局音频：${state.soundEnabled ? "开" : "关"}<br>
          音乐：${s.musicEnabled ? "开" : "关"} 路 音量 ${pct(s.musicVolume)}%<br>
          音效：${s.sfxEnabled ? "开" : "关"} 路 音量 ${pct(s.sfxVolume)}%<br>
          屏幕震动：${s.shake !== false ? "开" : "关"}<br>
          画质：${state.lowQuality ? "低（自动）" : "高（自动）"} · 存档版本：${state.saveVersion || 3}
        </div>
        <div class="modal-actions">
          <button class="pixel-btn" data-action="toggle-sound">全局音频</button>
          <button class="pixel-btn secondary" data-action="toggle-music">音乐</button>
          <button class="pixel-btn secondary" data-action="toggle-sfx">音效</button>
          <button class="pixel-btn secondary" data-action="toggle-shake">切换震动</button>
        </div>
        <div class="modal-actions">
          <button class="pixel-btn secondary" data-action="music-down">音乐-</button>
          <button class="pixel-btn secondary" data-action="music-up">音乐+</button>
          <button class="pixel-btn secondary" data-action="sfx-down">音效-</button>
          <button class="pixel-btn secondary" data-action="sfx-up">音效+</button>
        </div>
        <div class="modal-actions">
          <button class="pixel-btn secondary" data-action="preview-bgm">试听 BGM</button>
          <button class="pixel-btn secondary" data-action="test-sfx">测试音效</button>
        </div>
        <div class="modal-actions">
          <button class="pixel-btn secondary" data-action="export-save">导出存档</button>
          <button class="pixel-btn secondary" data-action="import-save">导入存档</button>
          <button class="pixel-btn secondary" data-action="reset">重置存档</button>
        </div>
        <div class="modal-actions"><button class="pixel-btn" data-action="close">返回</button></div>
      </div>
    `);
  }

  function openExportSave() {
    save();
    const json = JSON.stringify(state, null, 2);
    openModal(`
      <div class="modal-box">
        <div class="modal-title">导出存档</div>
        <div class="modal-text">以下数据包含你的完整游戏进度，请妥善保存。</div>
        <textarea id="saveExportText" class="save-textarea" readonly>${json}</textarea>
        <div class="save-hint">可将存档保存为 JSON 文件，或在其他设备导入。</div>
        <div class="modal-actions">
          <button class="pixel-btn" data-action="copy-save">复制存档</button>
          <button class="pixel-btn secondary" data-action="download-save">下载 JSON</button>
          <button class="pixel-btn secondary" data-action="settings-back">返回</button>
        </div>
      </div>
    `);
  }

  function openImportSave() {
    openModal(`
      <div class="modal-box">
        <div class="modal-title">导入存档</div>
        <div class="modal-text">粘贴此前导出的存档 JSON 数据。导入成功后会重新加载游戏。</div>
        <textarea id="saveImportText" class="save-textarea" placeholder="在此粘贴存档数据..."></textarea>
        <div class="modal-actions">
          <button class="pixel-btn" data-action="import-save-confirm">导入并覆盖</button>
          <button class="pixel-btn secondary" data-action="settings-back">取消</button>
        </div>
      </div>
    `);
  }

  function openTutorial() {
    openModal(`
      <div class="modal-box">
        <div class="modal-title">新手引导</div>
        <div class="tutorial-grid">
          <div class="tutorial-step"><span class="step-no">1</span><b>移动</b><br>WASD 或方向键</div>
          <div class="tutorial-step"><span class="step-no">2</span><b>交互</b><br>靠近 NPC、怪物、宝箱后按 E</div>
          <div class="tutorial-step"><span class="step-no">3</span><b>战斗</b><br>技能攻击触发 CPA 知识试炼</div>
          <div class="tutorial-step"><span class="step-no">4</span><b>学习</b><br>菜单可打开任务、错题本、学习报告</div>
        </div>
        <div class="info-card">存档会自动保存，也可在设置中导出/导入。常用快捷键：M 地图、Q 任务、K 技能树。<br><br>系统会随等级逐步解锁：Lv.3 技能、Lv.5 装备/商店/打造、Lv.8 伙伴、Lv.10 错题本/复习挑战。</div>
        <div class="modal-actions">
          <button class="pixel-btn" data-action="close">开始探索</button>
        </div>
      </div>
    `);
  }

  function playStory(lines, onComplete) {
    const normalized = lines.map((line) => typeof line === "string" ? { speaker: "记账大陆", text: line } : line);
    state.story = { lines: normalized, idx: 0, chars: 0, timer: null, onComplete };
    openModal(`
      <div class="modal-box">
        <div class="modal-title">记账大陆 · 剧情</div>
        <div class="story-dialog">
          <div class="story-speaker">${uiIcon("cursor")}<span id="storySpeaker">${normalized[0].speaker}</span></div>
          <div id="storyText" class="story-line"></div>
        </div>
        <div class="modal-actions">
          <button class="pixel-btn" data-action="story-next">继续</button>
        </div>
      </div>
    `);
    typeStory();
  }

  function typeStory() {
    const story = state.story;
    if (!story) return;
    const entry = story.lines[story.idx];
    const line = entry.text;
    const speakerEl = document.getElementById("storySpeaker");
    if (speakerEl) speakerEl.textContent = entry.speaker;
    const el = document.getElementById("storyText");
    if (!el) return;
    if (story.timer) clearInterval(story.timer);
    story.chars = 0;
    story.timer = setInterval(() => {
      story.chars += 1;
      el.textContent = line.slice(0, story.chars);
      if (story.chars >= line.length && story.timer) {
        clearInterval(story.timer);
        story.timer = null;
      }
    }, 28);
  }

  function storyNext() {
    const story = state.story;
    if (!story) return;
    const entry = story.lines[story.idx];
    const line = entry.text;
    const el = document.getElementById("storyText");
    if (story.chars < line.length) {
      story.chars = line.length;
      el.textContent = line;
      if (story.timer) {
        clearInterval(story.timer);
        story.timer = null;
      }
      return;
    }
    if (story.timer) {
      clearInterval(story.timer);
      story.timer = null;
    }
    story.idx += 1;
    if (story.idx >= story.lines.length) {
      const cb = story.onComplete;
      state.story = null;
      closeModal();
      if (cb) cb();
    } else {
      typeStory();
    }
  }

  function openSign(sign) {
    openModal(`
      <div class="modal-box">
        <div class="modal-title">${sign.label}</div>
        <div class="info-card">${sign.text}</div>
        <div class="modal-actions">
          <button class="pixel-btn" data-action="close">返回</button>
        </div>
      </div>
    `);
  }

  function openStone(stone) {
    sfx("book");
    openModal(`
      <div class="modal-box">
        <div class="modal-title">知识碑 · ${stone.point}</div>
        <div class="info-card">${stone.tip}</div>
        <div class="modal-actions">
          <button class="pixel-btn" data-action="stone-quiz" data-point="${stone.point}">开始知识试炼</button>
          <button class="pixel-btn secondary" data-action="close">离开</button>
        </div>
      </div>
    `);
  }

  function startBattle(monster, isBoss) {
    state.screen = "battle";
    playBgm(BGM_BATTLE);
    const regionInfo = BATTLE_REGIONS[getMonsterType(monster.id)] || BATTLE_REGIONS.paper_crane;
    state.battle = {
      monster,
      isBoss,
      region: regionInfo,
      hp: monster.hp,
      maxHp: monster.hp,
      turn: 1,
      feedback: "",
      effects: [],
      shakeUntil: 0,
      bossPhase: 1,
      phase2: false,
      phase3: false,
      partnerBlessUsed: false,
      combo: 0,
      comboActive: false,
      critFlashUntil: 0,
      phaseFlashUntil: 0,
      bossEnteredAt: isBoss ? Date.now() : 0,
      anim: {
        playerAttack: 0,
        monsterHit: 0,
        monsterAttack: 0,
        playerHit: 0
      }
    };
    hud.classList.add("hidden");
    touchControls.classList.add("hidden");
    openBattleModal();
  }

  function showTouchIfCoarse() {
    if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
      touchControls.classList.remove("hidden");
    }
  }

  function openBattleModal() {
    const b = state.battle;
    const m = b.monster;
    const hpPct = Math.max(0, Math.min(100, Math.round((b.hp / b.maxHp) * 100)));
    const maxMp = state.player.maxMp + getJobBonus("mp");
    const phaseLabel = b.isBoss
      ? b.bossPhase === 3 ? "最终阶段 · 借贷失衡" : b.bossPhase === 2 ? "阶段 2 · 报表错乱" : "阶段 1"
      : "普通遭遇";
    openModal(`
      <div class="modal-box">
        <div class="battle-panel">
          <div class="battle-head">
            <div>
              <div class="battle-title">${m.label}${b.isBoss ? " · BOSS" : ""}</div>
              <div class="battle-sub">${b.region.label} · 回合 ${b.turn} · 玩家回合 · ${phaseLabel}</div>
            </div>
            <div class="battle-tag">战斗</div>
          </div>
          <div class="battle-weak">
            <span>弱点：${m.point}</span>
            <span>攻击 ${state.player.attack + getWeaponAtk() + getJobBonus("atk")}</span>
            <span>防御 ${state.player.defense + getArmorDef() + getJobBonus("def")}</span>
          </div>
          <div class="battle-stats">
            <div class="battle-stat"><span>怪物 HP</span><b>${b.hp} / ${b.maxHp}</b></div>
            <div class="battle-stat"><span>角色 HP</span><b>${state.player.hp} / ${state.player.maxHp}</b></div>
            <div class="battle-stat"><span>角色 MP</span><b>${state.player.mp} / ${maxMp}</b></div>
            <div class="battle-stat"><span>伙伴 HP</span><b>${state.partner.hp} / ${state.partner.maxHp}</b></div>
            <div class="battle-stat"><span>伙伴好感</span><b>${state.partner.mood} / 100</b></div>
            <div class="battle-stat"><span>答题连击</span><b>${b.comboActive ? "已触发" : `${b.combo || 0} / 3`}</b></div>
          </div>
          ${b.feedback ? `<div class="feedback">${b.feedback}</div>` : ""}
          <div class="action-grid">
            ${iconBtn("攻击", "battle-attack", {}, { icon: "sword" })}
            ${iconBtn(isSystemUnlocked("skill") ? "技能" : "技能 Lv.3", "battle-skill", {}, { icon: "hammer", disabled: !isSystemUnlocked("skill") })}
            ${iconBtn("药水", "battle-item", {}, { icon: "confirm", cls: "secondary" })}
            ${iconBtn("逃跑", "battle-run", {}, { icon: "cancel", cls: "secondary" })}
          </div>
        </div>
      </div>
    `);
  }

  function openSkillSelect() {
    const skills = getCurrentJobSkills()
      .map(
        (s) => `
          <button class="pixel-btn skill-card" data-action="skill-use" data-skill="${s.id}">
            <span class="skill-head">${uiIcon("hammer")}<b>${s.name}</b><small>${s.mp} MP</small></span>
            <small>${s.desc}</small>
          </button>
        `
      )
      .join("");
    openModal(`
      <div class="modal-box">
        <div class="modal-title">选择技能</div>
        <div class="info-card">技能会触发知识试炼。答对后技能效果大幅提升，伙伴好感高时还会获得记账祝福。</div>
        <div class="skill-grid">${skills}</div>
        <div class="modal-actions">
          <button class="pixel-btn secondary" data-action="battle-cancel">返回战斗</button>
        </div>
      </div>
    `);
  }

  function openItemSelect() {
    const hp = state.inventory.hpPotion || 0;
    const mp = state.inventory.mpPotion || 0;
    openModal(`
      <div class="modal-box">
        <div class="modal-title">选择道具</div>
        <div class="info-card">在战斗中使用道具会消耗当前回合，随后怪物将发起反击。</div>
        <div class="item-count">背包：回复药水 × ${hp} · 以太之露 × ${mp}</div>
        <div class="action-grid">
          <button class="pixel-btn item-card" data-action="use-item" data-item="hp_potion">
            ${uiIcon("confirm")}<b>使用回复药水</b><small>恢复 30 HP · 当前 × ${hp}</small>
          </button>
          <button class="pixel-btn item-card secondary" data-action="use-item" data-item="mp_potion">
            ${uiIcon("confirm")}<b>使用以太之露</b><small>恢复 30 MP · 当前 × ${mp}</small>
          </button>
        </div>
        <div class="modal-actions">
          <button class="pixel-btn secondary" data-action="battle-cancel">返回战斗</button>
        </div>
      </div>
    `);
  }

  function useItem(itemId) {
    if (itemId === "hp_potion") {
      if ((state.inventory.hpPotion || 0) <= 0) {
        state.battle.feedback = "没有回复药水。";
        openBattleModal();
        return;
      }
      state.inventory.hpPotion -= 1;
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + 30);
      state.battle.feedback = "使用回复药水，恢复 30 HP。";
    } else if (itemId === "mp_potion") {
      if ((state.inventory.mpPotion || 0) <= 0) {
        state.battle.feedback = "没有以太之露。";
        openBattleModal();
        return;
      }
      state.inventory.mpPotion -= 1;
      state.player.mp = Math.min(state.player.maxMp, state.player.mp + 30);
      state.battle.feedback = "使用以太之露，恢复 30 MP。";
    }
    save();
    enemyTurn();
  }

  function selectSkill(skillId) {
    const skill = SKILLS[skillId];
    if (!skill) return;
    if (state.player.mp < skill.mp) {
      state.battle.feedback = "MP 不足，无法使用该技能。";
      openBattleModal();
      return;
    }
    state.player.mp -= skill.mp;
    state.pendingSkill = skill;
    const q = getQuestionsByPoint(skill.point, 1)[0] || getRandomQuestions(1)[0];
    state.quiz = {
      q,
      callback: (correct) => {
        const sk = state.pendingSkill;
        state.pendingSkill = null;
        if (!sk) return;
        if (sk.power === 0) {
          if (correct) {
            state.battle.combo += 1;
            const heal = Math.round(state.player.maxHp * 0.15);
            state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
            state.battle.feedback = "试算平衡成功，回复 HP " + heal;
          } else {
            state.battle.combo = 0;
            state.battle.comboActive = false;
            state.battle.feedback = "试算平衡失败，回复效果减半。";
            const heal = Math.round(state.player.maxHp * 0.07);
            state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal);
          }
          enemyTurn();
          return;
        }
        const effectiveAtk = state.player.attack + getWeaponAtk() + getJobBonus("atk");
        const wrongMult = state.battle && state.battle.phase2 ? 0.3 : 0.5;
        let base = correct ? Math.round(effectiveAtk * sk.power) : Math.max(1, Math.round(effectiveAtk * sk.power * wrongMult));
        let label = correct ? "技能弱点破解，" : "答错，技能威力下降，";
        if (correct) {
          state.battle.combo += 1;
        } else {
          state.battle.combo = 0;
          state.battle.comboActive = false;
        }
        if (correct && state.partner.mood >= 70 && state.battle && !state.battle.partnerBlessUsed) {
          base = Math.round(base * 1.3);
          state.battle.partnerBlessUsed = true;
          label = "记账祝福发动，" + label;
        }
        if (correct && state.battle.combo >= 3 && !state.battle.comboActive) {
          state.battle.comboActive = true;
          base = Math.round(base * 1.5);
          label = "答题三连击触发，" + label;
          addEffect("COMBO x3", 460, 260, "#ffd166");
        }
        applyPlayerDamage(base, label + sk.name);
      }
    };
    openQuiz(q);
  }

  function playerBattleAction(action) {
    if (action === "attack") {
      const crit = Math.random() < 0.15;
      let dmg = Math.max(1, state.player.attack + getWeaponAtk() + getJobBonus("atk") - 4 + Math.floor(Math.random() * 4));
      if (crit) dmg = Math.round(dmg * 1.5);
      applyPlayerDamage(dmg, crit ? "暴击命中" : "普通攻击命中", crit);
      if (!state.battle) return;
    } else if (action === "skill") {
      openSkillSelect();
      return;
    } else if (action === "item") {
      openItemSelect();
      return;
    } else if (action === "run") {
      if (Math.random() < 0.7) {
        showToast("成功逃跑");
        state.screen = "map";
        playZoneBgm(state.zone || "gold_field");
        delete state.battle;
        hud.classList.remove("hidden");
        showTouchIfCoarse();
        closeModal();
        return;
      }
      state.battle.feedback = "逃跑失败！";
      enemyTurn();
      return;
    }
    enemyTurn();
  }

  function applyPlayerDamage(dmg, label, critical = false) {
    dmg = Math.max(1, Math.round(dmg));
    state.battle.hp -= dmg;
    addEffect("-" + dmg, 720, 300, "#ffd166");
    state.battle.shakeUntil = Date.now() + 180;
    state.battle.anim.playerAttack = Date.now();
    state.battle.anim.monsterHit = Date.now() + 120;
    if (critical) {
      state.battle.critFlashUntil = Date.now() + 420;
      state.battle.shakeUntil = Date.now() + 260;
      addEffect("暴击", 700, 250, "#ffe066", true);
    }
    sfx("hit");
    state.battle.feedback = label + "，造成 " + dmg + " 伤害。";
    if (state.battle.hp <= 0) {
      endBattle(true);
      return;
    }
    const partnerDmg = partnerAttack();
    if (partnerDmg > 0) {
      state.battle.feedback += "<br>记账精灵协助攻击，造成 " + partnerDmg + " 伤害。";
      if (state.battle.hp <= 0) {
        endBattle(true);
        return;
      }
    }
    enemyTurn();
  }

  function partnerAttack() {
    if (!isSystemUnlocked("partner")) return 0;
    const partner = state.partner;
    const base = Math.round((partner.atk + partner.level) * (1 + partner.mood / 200) + getJobBonus("atk"));
    const dmg = Math.max(1, base - 2 + Math.floor(Math.random() * 4));
    state.battle.hp -= dmg;
    addEffect("-" + dmg, 760, 330, "#ffe9a8");
    state.battle.anim.monsterHit = Date.now();
    return dmg;
  }

  function gainPartnerExp(amount) {
    const partner = state.partner;
    partner.exp += amount;
    while (partner.exp >= partner.expNext) {
      partner.exp -= partner.expNext;
      partner.level += 1;
      partner.expNext = Math.round(50 * Math.pow(partner.level, 1.3));
      partner.maxHp += 10;
      partner.hp = partner.maxHp;
      partner.atk += 1;
      partner.mood = Math.min(100, partner.mood + 3);
      showToast("记账精灵升级 Lv." + partner.level);
    }
    save();
  }

  function enemyTurn() {
    state.battle.turn += 1;
    const bossName = state.battle.monster.id === "boss_1" ? "合并报表巨像" : state.battle.monster.label;
    if (
      state.battle.isBoss &&
      !state.battle.phase2 &&
      state.battle.hp <= state.battle.maxHp * 0.5
    ) {
      state.battle.phase2 = true;
      state.battle.bossPhase = 2;
      state.battle.phaseFlashUntil = Date.now() + 700;
      state.battle.monster.attack += 5;
      state.battle.feedback += `<br>${bossName}进入第二阶段：报表错乱！攻击力提升。`;
      sfx("wrong");
      showToast(`${bossName}进入第二阶段：报表错乱`);
    }
    if (
      state.battle.isBoss &&
      state.battle.phase2 &&
      !state.battle.phase3 &&
      state.battle.hp <= state.battle.maxHp * 0.2
    ) {
      state.battle.phase3 = true;
      state.battle.bossPhase = 3;
      state.battle.phaseFlashUntil = Date.now() + 700;
      state.battle.monster.attack += 6;
      state.battle.feedback += `<br>${bossName}进入最终阶段：借贷失衡！攻击力再次提升。`;
      sfx("wrong");
      showToast(`${bossName}进入最终阶段：借贷失衡`);
    }
    const dmg = Math.max(1, state.battle.monster.attack - state.player.defense - getArmorDef() - getJobBonus("def") + Math.floor(Math.random() * 4) - 2);
    state.player.hp -= dmg;
    addEffect("-" + dmg, 220, 360, "#ff6b6b");
    state.battle.shakeUntil = Date.now() + 180;
    state.battle.anim.monsterAttack = Date.now();
    state.battle.anim.playerHit = Date.now() + 120;
    state.battle.feedback += "<br>怪物反击，受到 " + dmg + " 伤害。";
    if (state.player.hp <= 0) {
      state.player.hp = Math.round(state.player.maxHp * 0.5);
      showToast("战斗失败，回到存档点恢复 50% HP");
      state.screen = "map";
      playZoneBgm(state.zone || "gold_field");
      delete state.battle;
      hud.classList.remove("hidden");
      showTouchIfCoarse();
      closeModal();
      save();
      return;
    }
    updateHUD();
    openBattleModal();
  }

  function endBattle(win) {
    const b = state.battle;
    if (win) {
      sfx("win");
      const p = state.player;
      state.partner.mood = Math.min(100, state.partner.mood + 4);
      gainPartnerExp(15);
      p.gold += b.monster.gold;
      p.exp += b.monster.exp;
      const drops = {
        monster_1: { stone: 1 },
        monster_2: { ink: 1 },
        monster_3: { beads: 1 },
        boss_1: { credential: 1 },
        audit_monster_1: { ink: 1 },
        audit_monster_2: { beads: 1 },
        audit_boss: { ink: 2 },
        capital_monster_1: { stone: 1 },
        capital_monster_2: { beads: 1 },
        capital_boss: { stone: 2 },
        tax_monster_1: { stone: 1 },
        tax_monster_2: { ink: 1 },
        tax_boss: { ink: 2 },
        law_monster_1: { beads: 1 },
        law_monster_2: { ink: 1 },
        law_boss: { beads: 2 },
        strategy_monster_1: { stone: 1 },
        strategy_monster_2: { beads: 1 },
        strategy_boss: { credential: 2 }
      };
      const drop = drops[b.monster.id] || {};
      const materialNames = { stone: "金算石", ink: "墨渍残页", beads: "算盘珠", credential: "合并凭证" };
      const dropText = Object.entries(drop)
        .map(([key, count]) => {
          state.inventory.materials[key] = (state.inventory.materials[key] || 0) + count;
          return `${materialNames[key]} ×${count}`;
        })
        .join("、");
      if (b.monster.id === "final_boss") {
        state.gameCompleted = true;
        state.strategyCleared = true;
        if (!state.jobs.unlocked.includes("strategy")) {
          state.jobs.unlocked.push("strategy");
          showToast("解锁新职业：战略召唤师");
        }
        unlockAchievement("final_clear");
        if (state.jobs.unlocked.length >= 6) unlockAchievement("all_jobs");
      } else if (b.monster.id === "boss_1") {
        state.bossKilled = true;
        if (!state.jobs.unlocked.includes("auditor")) {
          state.jobs.unlocked.push("auditor");
          showToast("解锁新职业：审计法师");
        }
        if (state.jobs.unlocked.length >= 6) unlockAchievement("all_jobs");
      } else if (ZONE_BOSS_STATE[b.monster.id]) {
        state[ZONE_BOSS_STATE[b.monster.id]] = true;
        activateRegionTasks(state.zone);
        updateTask(ZONE_BOSS_TASK[b.monster.id], 1);
        if (Object.values(ZONE_BOSS_STATE).every((flag) => state[flag])) unlockAchievement("all_zone_bosses");
      }
      else {
        state.monstersKilled = (state.monstersKilled || 0) + 1;
        if (!state.monstersKilledIds) state.monstersKilledIds = [];
        state.monstersKilledIds.push(b.monster.id);
        if (ZONE_MONSTER_TASK[b.monster.id]) updateTask(ZONE_MONSTER_TASK[b.monster.id], 1);
        if (["audit_monster_1", "audit_monster_2"].includes(b.monster.id)) {
          const auditKills = state.monstersKilledIds.filter((id) => ["audit_monster_1", "audit_monster_2"].includes(id));
          if (auditKills.length >= 2 && !state.auditCleared) {
            state.auditCleared = true;
            showToast("审计铁堡已肃清，资本密林入口开启");
          }
        }
        if (["capital_monster_1", "capital_monster_2"].includes(b.monster.id)) {
          const capitalKills = state.monstersKilledIds.filter((id) => ["capital_monster_1", "capital_monster_2"].includes(id));
          if (capitalKills.length >= 2 && !state.capitalCleared) {
            state.capitalCleared = true;
            showToast("资本密林已肃清，税率荒原入口开启");
          }
        }
        if (["tax_monster_1", "tax_monster_2"].includes(b.monster.id)) {
          const taxKills = state.monstersKilledIds.filter((id) => ["tax_monster_1", "tax_monster_2"].includes(id));
          if (taxKills.length >= 2 && !state.taxCleared) {
            state.taxCleared = true;
            showToast("税率荒原已肃清，法条神殿入口开启");
          }
        }
        if (["law_monster_1", "law_monster_2"].includes(b.monster.id)) {
          const lawKills = state.monstersKilledIds.filter((id) => ["law_monster_1", "law_monster_2"].includes(id));
          if (lawKills.length >= 2 && !state.lawCleared) {
            state.lawCleared = true;
            showToast("法条神殿已肃清，战略星塔入口开启");
          }
        }
        if (["strategy_monster_1", "strategy_monster_2"].includes(b.monster.id)) {
          const strategyKills = state.monstersKilledIds.filter((id) => ["strategy_monster_1", "strategy_monster_2"].includes(id));
          if (strategyKills.length >= 2 && !state.strategyCleared) {
            state.strategyCleared = true;
            showToast("战略星塔已肃清，六域失衡之主现身");
          }
        }
      }
      if (b.monster.id === "boss_1") updateTask("main", 1);
      else if (!b.isBoss) updateTask("defeat3", 1);
      if (!b.isBoss && b.monster.id === "monster_2") updateTask("defeat_ink", 1);
      if (!b.isBoss && b.monster.id === "monster_1") updateTask("defeat_crane", 1);
      unlockAchievement("first_battle");
      if ((state.monstersKilled || 0) >= 3) unlockAchievement("beat_3");
      if ((state.monstersKilled || 0) >= 10) unlockAchievement("kill10");
      if (b.monster.id === "boss_1") unlockAchievement("beat_boss");
      maybeLevelUp();
      save();
      updateHUD();
      openModal(`
        <div class="modal-box">
          <div class="modal-title">战斗胜利</div>
          <div class="result-banner correct">击败 ${b.monster.label}</div>
          <div class="reward-grid">
            <div class="report-card"><div class="num">${b.monster.exp}</div><div>经验</div></div>
            <div class="report-card"><div class="num">${b.monster.gold} G</div><div>金币</div></div>
            <div class="report-card"><div class="num">${dropText ? "获得" : "—"}</div><div>${dropText || "无掉落"}</div></div>
          </div>
          <div class="info-card">${b.monster.id === "final_boss" ? "你击败了六域失衡之主。会计、审计、财管、税法、经济法和战略六域重新平衡，记账大陆恢复了秩序。" : b.monster.id === "boss_1" ? "你击败了合并报表巨像。小分：借贷重新平衡了，谢谢你，会计勇者。<br>下一站：审计铁堡。完整区域的冒险将在后续版本解锁。" : ZONE_BOSS_STATE[b.monster.id] ? `你击败了${b.monster.label}。${REGION_BOSS_INTRO[b.monster.id]?.text || "区域秩序正在恢复。"}` : state.zone === "strategy_star" ? "战略星塔的迷雾正在消散，你已接近六域平衡。" : state.zone === "law_temple" ? "法条神殿的规则正在恢复，继续巩固经济法知识。" : state.zone === "tax_wasteland" ? "税率荒原的申报秩序正在恢复，继续掌握税法规则。" : state.zone === "capital_forest" ? "资本密林中的财务异常正在消退，继续深化财管知识。" : state.zone === "audit_tower" ? "审计铁堡的证据链正在恢复，继续检查剩余异常。" : "继续探索金算原野。"}</div>
          <div class="modal-actions">
            <button class="pixel-btn" data-action="close">返回地图</button>
          </div>
        </div>
      `);
      if (state.gameCompleted) advanceMainStory(8);
      else if (state.strategyCleared) advanceMainStory(7);
      else if (state.lawCleared) advanceMainStory(6);
      else if (state.taxCleared) advanceMainStory(5);
      else if (state.capitalCleared) advanceMainStory(4);
      else if (state.auditCleared) advanceMainStory(3);
      else if (state.bossKilled) advanceMainStory(2);
    }
    state.screen = "map";
    playZoneBgm(state.zone || "gold_field");
    delete state.battle;
    hud.classList.remove("hidden");
    showTouchIfCoarse();
  }

  function maybeLevelUp() {
    const p = state.player;
    let leveled = false;
    while (p.exp >= p.expNext) {
      leveled = true;
      p.exp -= p.expNext;
      p.level += 1;
      p.expNext = Math.round(100 * Math.pow(p.level, 1.5));
      p.maxHp += 12;
      p.maxMp += 6;
      p.attack += 3;
      p.defense += 2;
      p.skillPoints += 1;
      p.hp = p.maxHp;
      p.mp = p.maxMp;
      sfx("levelup");
      showLevelUpToast(p.level);
    }
    if (leveled) {
      notifySystemUnlocks();
      const title = getLevelTitle(p.level);
      if (title && !state.levelTitles.includes(title)) {
        state.levelTitles.push(title);
        showToast("解锁称号：" + title, 2400);
      }
      if (p.level >= 10) unlockAchievement("level10");
      if (p.level >= 20) unlockAchievement("level20");
      if (p.level >= 30) unlockAchievement("level30");
      if (p.level >= 25) unlockAchievement("level25");
      if (p.level >= 40) unlockAchievement("level40");
    }
  }

  function getLevelTitle(level) {
    if (level >= 50) return "六域宗师";
    if (level >= 40) return "注会传奇";
    if (level >= 30) return "注会贤者";
    if (level >= 20) return "科目专家";
    if (level >= 15) return "领域精英";
    if (level >= 10) return "会计新星";
    if (level >= 5) return "初级簿记";
    return "";
  }

  function notifySystemUnlocks() {
    const lv = state.player.level;
    const names = {
      skill: "技能系统",
      shop: "商店",
      equip: "装备系统",
      craft: "打造工坊",
      enhance: "装备强化",
      partner: "伙伴系统",
      book: "错题本",
      challenge: "复习挑战"
    };
    const unlocked = [];
    for (const [key, level] of Object.entries(SYSTEM_UNLOCK_LEVELS)) {
      if (lv >= level && !state.notifiedSystems.includes(key)) {
        state.notifiedSystems.push(key);
        unlocked.push(`Lv.${level} 解锁${names[key]}`);
      }
    }
    if (unlocked.length) showToast(unlocked.join(" · "), 3000);
  }

  function openQuiz(q) {
    const letters = ["A", "B", "C", "D"];
    const optionsHtml = q.options
      .map(
        (opt, i) => `
          <button class="option" data-answer="${i}">
            <span class="tag">${letters[i]}</span>
            ${opt}
          </button>
        `
      )
      .join("");
    openModal(`
      <div class="modal-box">
        <div class="modal-title">知识试炼</div>
        <div class="quiz-timer" id="quizTimer">45s</div>
        <div class="quiz-question">
          <span class="quiz-point">考点 · ${q.point}</span>
          <div class="quiz-text">${q.q}</div>
        </div>
        <div class="quiz-options">${optionsHtml}</div>
      </div>
    `);
    startQuizTimer();
  }

  function startQuizTimer() {
    const quiz = state.quiz;
    if (!quiz) return;
    if (quiz.timer) clearInterval(quiz.timer);
    quiz.timeLeft = 45;
    quiz.resolved = false;
    const el = document.getElementById("quizTimer");
    quiz.timer = setInterval(() => {
      if (!state.quiz || state.quiz !== quiz) {
        clearInterval(quiz.timer);
        return;
      }
      quiz.timeLeft -= 0.25;
      const secs = Math.max(0, Math.ceil(quiz.timeLeft));
      if (el) el.textContent = secs + "s";
      modal.classList.toggle("quiz-danger", secs <= 5);
      if (quiz.timeLeft <= 0) {
        clearInterval(quiz.timer);
        quiz.timer = null;
        if (!quiz.resolved) resolveAnswer(-1);
      }
    }, 250);
  }

  function resolveAnswer(selected) {
    const quiz = state.quiz;
    if (!quiz) return;
    if (quiz.resolved) return;
    quiz.resolved = true;
    if (quiz.timer) {
      clearInterval(quiz.timer);
      quiz.timer = null;
    }
    modal.classList.remove("quiz-danger");
    const q = quiz.q;
    const correct = selected === q.answer;
    state.answered += 1;
    state.week.answered = (state.week.answered || 0) + 1;
    state.daily.answered += 1;
    if (!state.daily.done && state.daily.answered >= state.daily.target) {
      state.daily.done = true;
      state.player.gold += 20;
      state.player.exp += 10;
      maybeLevelUp();
      showToast("今日学习目标完成！获得 20 金币、10 经验");
    }
    state.pointProgress[q.point] = (state.pointProgress[q.point] || 0) + 1;
    if (correct) state.pointCorrect[q.point] = (state.pointCorrect[q.point] || 0) + 1;
    if (correct) {
      state.correct += 1;
      state.quizStreak = (state.quizStreak || 0) + 1;
      state.week.correct = (state.week.correct || 0) + 1;
      const subject = pointSubject(q.point);
      state.week.subjects[subject] = (state.week.subjects[subject] || 0) + 1;
      state.partner.mood = Math.min(100, state.partner.mood + 3);
        gainPartnerExp(5);
        updateTask("answer10", 1);
        if (POINT_QUIZ_TASK[q.point]) updateTask(POINT_QUIZ_TASK[q.point], 1);
        if (state.correct >= 10) unlockAchievement("answer10");
        if (state.correct >= 50) unlockAchievement("answer50");
        if (state.correct >= 100) unlockAchievement("answer100");
        if (state.quizStreak >= 10) unlockAchievement("streak10");
        if (state.week.answered >= 20) unlockAchievement("weekly20");
        const coverage = Math.round((Object.keys(state.pointProgress).length / Math.max(1, POINTS.length)) * 100);
        if (coverage >= 60) unlockAchievement("coverage60");
        if (coverage >= 90) unlockAchievement("coverage90");
      const rec = state.reviewMap[q.id];
      if (rec && state.wrongQuestions.includes(q.id)) {
        rec.count += 1;
        if (rec.count >= 2) {
            state.wrongQuestions = state.wrongQuestions.filter((id) => id !== q.id);
            rec.mastered = true;
            unlockAchievement("wrong_zero");
            showToast("错题已掌握：" + q.point);
        }
      }
    } else {
      state.quizStreak = 0;
      if (!state.reviewMap[q.id]) state.reviewMap[q.id] = { count: 0, mastered: false, next: Date.now() + 86400000 };
      const rec = state.reviewMap[q.id];
      rec.count = 0;
      rec.mastered = false;
      rec.next = Date.now() + 86400000;
      if (!state.wrongQuestions.includes(q.id)) state.wrongQuestions.push(q.id);
    }
    sfx(correct ? "correct" : "wrong");
    save();

    const letters = ["A", "B", "C", "D"];
    const optionsHtml = q.options
      .map((opt, i) => {
        let cls = "option";
        if (i === q.answer) cls += " correct";
        else if (i === selected && !correct) cls += " wrong";
        const mark = i === q.answer ? "正确答案" : i === selected ? "你的选择" : "";
        return `<div class="${cls} answer-item"><span class="tag">${letters[i]}</span><span>${opt}</span><span class="answer-mark${i === selected && !correct ? " wrong-mark" : ""}">${mark}</span></div>`;
      })
      .join("");

    openModal(`
      <div class="modal-box">
        <div class="modal-title">知识试炼 · 结果</div>
        <div class="result-banner ${correct ? "correct" : "wrong"}">${correct ? "回答正确" : "回答错误"} · 已计入学习记录</div>
        <div class="answer-review">
          <div class="answer-list">${optionsHtml}</div>
          <div class="feedback-card feedback">${q.explain}</div>
        </div>
        <div class="modal-actions">
          <button class="pixel-btn" data-action="quiz-continue">继续战斗</button>
        </div>
      </div>
    `);
  }

  function continueQuiz() {
    const quiz = state.quiz;
    if (!quiz) return;
    const callback = quiz.callback;
    const answeredCorrectly = state._lastQuizCorrect;
    state.quiz = null;
    closeModal();
    if (callback) callback(answeredCorrectly);
  }

  function openBook() {
    if (!isSystemUnlocked("book")) {
      showToast(systemLockTip("book", "错题本") + " 解锁");
      return;
    }
    const wrong = state.wrongQuestions.map((id) => QUESTIONS.find((q) => q.id === id)).filter(Boolean);
    if (!wrong.length) {
      openModal(`
        <div class="modal-box">
          <div class="modal-title">错题本 · 已清零</div>
          <div class="modal-text">当前没有待复习错题。继续保持学习节奏，把每次答错都变成掌握点。</div>
          <div class="modal-actions">
            <button class="pixel-btn" data-action="challenge-start" data-mode="mock">模拟考 5 题</button>
            <button class="pixel-btn secondary" data-action="challenge-start" data-mode="smart">智能复习</button>
            <button class="pixel-btn secondary" data-action="close">返回</button>
          </div>
        </div>
      `);
      return;
    }
    const groups = {};
    wrong.forEach((q) => {
      if (!groups[q.point]) groups[q.point] = [];
      groups[q.point].push(q);
    });
    const list = Object.entries(groups)
      .map(([point, qs]) => {
        const items = qs
          .map((q) => {
            const rec = state.reviewMap[q.id] || { count: 0 };
            const status = rec.count >= 2 ? "已掌握" : `待复习 · 已复习 ${rec.count} 次`;
            return `
              <div class="book-card">
                <div><span class="book-point">${point}</span><span class="book-status">${status}</span></div>
                <div style="margin:6px 0;font-weight:900;">${q.q}</div>
                <div class="caption">${q.explain}</div>
                <div class="modal-actions">
                  <button class="pixel-btn small" data-action="review-question" data-id="${q.id}">复习本题</button>
                </div>
              </div>
            `;
          })
          .join("");
        return `<div style="margin-bottom:12px;"><b>${point}</b> · ${qs.length} 题${items}</div>`;
      })
      .join("");
    openModal(`
      <div class="modal-box">
        <div class="modal-title">错题本 · ${wrong.length} 道</div>
        <div class="modal-text">按考点分组，已掌握题目会保留解析供快速回顾。</div>
        ${list}
        <div class="modal-actions">
          <button class="pixel-btn" data-action="challenge-start" data-mode="wrong">错题专练</button>
          <button class="pixel-btn secondary" data-action="challenge-start" data-mode="smart">智能复习</button>
          <button class="pixel-btn secondary" data-action="close">返回</button>
        </div>
      </div>
    `);
  }

  function openReport() {
    const p = state.player;
    const acc = state.answered ? Math.round((state.correct / state.answered) * 100) : 0;
    const taskDone = state.tasks.filter((t) => t.done).length;
    const coverage = Math.round((Object.keys(state.pointProgress).length / POINTS.length) * 100);
    const pointAccuracy = (point) => {
      const total = state.pointProgress[point] || 0;
      if (!total) return 100;
      return Math.round(((state.pointCorrect[point] || 0) / total) * 100);
    };
    const weakPoints = POINTS
      .filter((p) => (state.pointProgress[p] || 0) > 0)
      .sort((a, b) => pointAccuracy(a) - pointAccuracy(b))
      .slice(0, 5);
    const weakCards = weakPoints.length
      ? weakPoints.map((point) => {
          const value = pointAccuracy(point);
          return `
            <div class="report-card">
              <div style="font-weight:900;">${point}</div>
              <div class="report-bar"><div style="width:${value}%"></div></div>
              <div class="caption">${value}%</div>
            </div>
          `;
        }).join("")
      : `<div class="report-card"><div class="num">—</div><div>暂无薄弱点</div></div>`;
    const historyCards = state.examHistory.length
      ? state.examHistory
          .slice(-3)
          .map((h) => `<div class="report-card"><div class="num">${h.acc}%</div><div>${h.date} · ${h.correct}/${h.total}</div></div>`)
          .join("")
      : `<div class="report-card"><div class="num">—</div><div>暂无复习挑战</div></div>`;
    const clearedZones = [state.auditCleared, state.capitalCleared, state.taxCleared, state.lawCleared, state.strategyCleared].filter(Boolean).length;
    openModal(`
      <div class="modal-box">
        <div class="modal-title">学习报告 · ${getCurrentJob().name}</div>
        <div class="modal-text">
          六域主线：${MAIN_STEP_LABELS[state.mainStep] || (state.gameCompleted ? "已通关" : "金算原野主线中")} · 称号：${getLevelTitle(p.level) || "见习勇者"} · 今日目标 ${state.daily.answered}/${state.daily.target}
        </div>
        <div class="report-grid">
          <div class="report-card"><div class="num">${p.level}</div><div>等级</div></div>
          <div class="report-card"><div class="num">${state.answered}</div><div>已答题</div></div>
          <div class="report-card"><div class="num">${acc}%</div><div>正确率</div></div>
          <div class="report-card"><div class="num">${coverage}%</div><div>考纲覆盖</div></div>
          <div class="report-card"><div class="num">${taskDone}/${state.tasks.length}</div><div>任务</div></div>
          <div class="report-card"><div class="num">${state.achievements.length}/${Object.keys(ACHIEVEMENTS).length}</div><div>成就</div></div>
        </div>
        <div class="modal-text"><b>考纲覆盖</b></div>
        <div class="report-bar"><div style="width:${coverage}%"></div></div>
        <div class="modal-text"><b>薄弱点 Top5</b></div>
        <div class="report-grid">${weakCards}</div>
        <div class="modal-text"><b>最近复习挑战</b></div>
        <div class="report-grid">${historyCards}</div>
        <div class="modal-text">
          错题：${state.wrongQuestions.length} · 普通怪：${state.monstersKilled || 0} · 区域肃清：${clearedZones} / 5 · BOSS：${state.bossKilled ? "已击败" : "未击败"}<br>
          装备：${state.weapon.name} / ${state.armor.name} · 技能点：${p.skillPoints}<br>
          材料：金算石 ×${state.inventory.materials.stone || 0} · 墨渍残页 ×${state.inventory.materials.ink || 0} · 算盘珠 ×${state.inventory.materials.beads || 0}
        </div>
        <div class="modal-actions">
          <button class="pixel-btn" data-action="close">返回</button>
          ${menuButton("打开错题本", "book", "book")}
          ${menuButton("复习挑战", "challenge", "challenge")}
          <button class="pixel-btn secondary" data-action="plan">学习计划</button>
          <button class="pixel-btn secondary" data-action="weekly-report">学习周报</button>
          <button class="pixel-btn secondary" data-action="challenge-start" data-mode="smart">智能复习</button>
          <button class="pixel-btn secondary" data-action="point-map">考纲导航</button>
        </div>
      </div>
    `);
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.round(seconds || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return h ? `${h}小时${m}分` : `${m}分钟`;
  }

  function openWeeklyReport() {
    const week = state.week;
    const acc = week.answered ? Math.round((week.correct / week.answered) * 100) : 0;
    const subjects = Object.entries(week.subjects || {}).sort((a, b) => b[1] - a[1]);
    const strong = subjects[0] ? subjects[0][0] : "暂无";
    const historyCards = state.weeklyHistory.length
      ? state.weeklyHistory.slice(0, 3).map((h) => {
          const hAcc = h.answered ? Math.round((h.correct / h.answered) * 100) : 0;
          return `<div class="report-card"><div class="num">${h.answered}</div><div>${h.weekStart} · 正确率 ${hAcc}%</div></div>`;
        }).join("")
      : `<div class="report-card"><div class="num">—</div><div>暂无历史周报</div></div>`;
    openModal(`
      <div class="modal-box">
        <div class="modal-title">学习周报</div>
        <div class="report-grid">
          <div class="report-card"><div class="num">${week.answered}</div><div>本周答题</div></div>
          <div class="report-card"><div class="num">${acc}%</div><div>本周正确率</div></div>
          <div class="report-card"><div class="num">${strong}</div><div>最强科目</div></div>
        </div>
        <div class="report-bar"><div style="width:${acc}%"></div></div>
        <div class="modal-text">周起始 ${week.weekStart} · 本周学习时长 ${formatDuration(week.playSeconds)}</div>
        <canvas id="weeklyCanvas" class="world-map-canvas" width="800" height="360"></canvas>
        <div class="modal-text"><b>最近历史</b></div>
        <div class="report-grid">${historyCards}</div>
        <div class="modal-actions">
          <button class="pixel-btn" data-action="download-weekly">下载周报</button>
          <button class="pixel-btn secondary" data-action="close">返回</button>
        </div>
      </div>
    `);
    drawWeeklyReport();
  }

  function drawWeeklyReport() {
    const canvas = document.getElementById("weeklyCanvas");
    if (!canvas) return;
    const c = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    c.clearRect(0, 0, w, h);
    c.fillStyle = "#17130f";
    c.fillRect(0, 0, w, h);
    c.fillStyle = "#6d4327";
    c.fillRect(0, 0, w, 8);
    c.fillStyle = "#f2c95f";
    c.fillRect(0, 0, 180, 8);
    c.fillStyle = "#ffe49a";
    c.font = "bold 30px 'Microsoft YaHei'";
    c.fillText("注会纪元 · 学习周报", 28, 54);
    c.fillStyle = "#d8c191";
    c.font = "bold 15px 'Microsoft YaHei'";
    c.fillText("周起始 " + state.week.weekStart, 28, 84);
    const stats = [
      { label: "答题", value: state.week.answered || 0 },
      { label: "正确率", value: state.week.answered ? Math.round((state.week.correct / state.week.answered) * 100) + "%" : "0%" },
      { label: "时长", value: formatDuration(state.week.playSeconds) }
    ];
    stats.forEach((s, i) => {
      const x = 36 + i * 190;
      c.fillStyle = "rgba(255, 244, 214, 0.08)";
      c.fillRect(x, 110, 160, 74);
      c.strokeStyle = "rgba(242, 201, 95, 0.45)";
      c.lineWidth = 2;
      c.strokeRect(x, 110, 160, 74);
      c.fillStyle = "#ffd66b";
      c.font = "bold 24px 'Microsoft YaHei'";
      c.fillText(String(s.value), x + 12, 145);
      c.fillStyle = "#d8c191";
      c.font = "bold 13px 'Microsoft YaHei'";
      c.fillText(s.label, x + 12, 170);
    });
    c.fillStyle = "#fff2d0";
    c.font = "bold 17px 'Microsoft YaHei'";
    c.fillText("科目分布", 36, 232);
    const subjects = Object.entries(state.week.subjects || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
    subjects.forEach(([name, count], i) => {
      const y = 252 + i * 38;
      c.fillStyle = "#d8c191";
      c.font = "bold 13px 'Microsoft YaHei'";
      c.fillText(name, 36, y);
      c.fillStyle = "rgba(255, 244, 214, 0.12)";
      c.fillRect(130, y - 12, 360, 10);
      c.fillStyle = "#f2c95f";
      c.fillRect(130, y - 12, Math.min(360, count * 40), 10);
      c.fillStyle = "#fff2d0";
      c.font = "bold 13px 'Microsoft YaHei'";
      c.fillText(String(count), 500, y);
    });
  }

  function openAbout() {
    openModal(`
      <div class="modal-box">
        <div class="modal-title">关于 · 注会纪元</div>
        <div class="info-card">
          <b>版本：</b>v${GAME_VERSION}<br>
          <b>构建：</b>${BUILD_LABEL}<br>
          <b>类型：</b>CPA 知识像素 RPG<br>
          <b>当前范围：</b>六区域主线、最终 Boss、战斗答题、任务、成就、学习报告、存档导入导出
        </div>
        <div class="info-card">
          正式发布前需确认素材授权，详见项目内 <b>assets/CREDITS.md</b>。当前版本为 PC Web 体验版，移动端仍在后续适配范围。
        </div>
        <div class="modal-actions">
          <button class="pixel-btn" data-action="close">返回</button>
          <button class="pixel-btn secondary" data-action="check-update">检查更新</button>
        </div>
      </div>
    `);
  }

  async function checkForUpdates() {
    try {
      const res = await fetch("version.json", { cache: "no-store" });
      if (!res.ok) throw new Error("bad response");
      const data = await res.json();
      if (data.version && data.version !== GAME_VERSION) {
        showToast("发现新版本 v" + data.version + "：" + (data.notes || "请更新到最新版本"), 3600);
      } else {
        showToast("当前已是最新版本 v" + GAME_VERSION);
      }
    } catch (e) {
      showToast("当前为本地版本，无法检查更新");
    }
  }

  function showTitle() {
    state.screen = "title";
    hud.classList.add("hidden");
    openModal(`
        <div class="modal-box" style="width:min(720px,94vw);text-align:center;">
          <div class="modal-title">注会纪元</div>
          <div class="modal-text">记账大陆 · M3 体验版 v${GAME_VERSION}</div>
          <div class="save-hint">${BUILD_LABEL}</div>
          <div class="title-subjects">
            <span class="subject-chip" style="background:#d4a017;">会计</span>
            <span class="subject-chip" style="background:#4169e1;">审计</span>
            <span class="subject-chip" style="background:#2e8b57;">财管</span>
            <span class="subject-chip" style="background:#e4572e;">税法</span>
            <span class="subject-chip" style="background:#6b5b95;">经济法</span>
            <span class="subject-chip" style="background:#3a8fb7;">战略</span>
          </div>
          <div class="modal-actions" style="justify-content:center;">
          <button class="pixel-btn" data-action="start">开始新冒险</button>
          <button class="pixel-btn secondary" data-action="continue">继续冒险</button>
          <button class="pixel-btn secondary" data-action="report">学习报告</button>
          <button class="pixel-btn secondary" data-action="toggle-sound">音效：${state.soundEnabled ? "开" : "关"}</button>
          <button class="pixel-btn secondary" data-action="about">关于</button>
        </div>
      </div>
    `);
  }

  function startGame() {
    state = defaultState();
    if (new URLSearchParams(location.search).get("unlock") === "all") state._unlockAll = true;
    ensureTaskFields();
    state.screen = "map";
    hud.classList.remove("hidden");
    showTouchIfCoarse();
    updateHUD();
    startBgm();
    playStory(
      [
        { speaker: "小分", text: "你终于来了！借贷失衡后，金算原野的知识开始扭曲。先移动几步，活动一下身体。" },
        { speaker: "审明", text: "靠近 NPC、宝箱、怪物后按 E 交互。先去找老会计，了解这条街的变化。" },
        { speaker: "老会计", text: "怪物会歪曲知识。击败它们前，先到知识碑复习“资产 = 负债 + 所有者权益”。" },
        { speaker: "小分", text: "战斗时用技能会触发知识试炼，答对技能效果更强。准备好后，去天平衡碑找合并报表巨像。" }
      ],
      () => openTutorial()
    );
  }

  function continueGame() {
    state.screen = "map";
    closeModal();
    hud.classList.remove("hidden");
    showTouchIfCoarse();
    startBgm();
    updateHUD();
  }

  function handleAction(action, dataset) {
    if (action === "start") startGame();
    else if (action === "continue") continueGame();
    else if (action === "about") openAbout();
    else if (action === "check-update") checkForUpdates();
    else if (action === "close") {
      closeModal();
      if (state.screen === "battle") openBattleModal();
    } else if (action === "learn") {
      showToast("提示：资产 = 负债 + 所有者权益");
      closeModal();
    } else if (action === "stone-quiz") {
      const q = getQuestionsByPoint(dataset.point, 1)[0];
      state.quiz = { q, callback: () => showToast("知识碑试炼完成") };
      openQuiz(q);
    } else if (action === "battle-attack") {
      playerBattleAction("attack");
    } else if (action === "battle-skill") {
      openSkillSelect();
    } else if (action === "skill-use") {
      selectSkill(dataset.skill);
    } else if (action === "battle-cancel") {
      openBattleModal();
    } else if (action === "use-item") {
      useItem(dataset.item);
    } else if (action === "shop") {
      openShop();
    } else if (action === "shop-buy") {
      buyItem(dataset.item);
    } else if (action === "learn-skill") {
      learnSkill(dataset.skill, dataset.from);
    } else if (action === "switch-job") {
      switchJob(dataset.job);
    } else if (action === "job-quiz") {
      openJobQuiz();
    } else if (action === "job-quiz-answer") {
      const quiz = state.jobQuiz;
      if (!quiz) return;
      for (const jobId of dataset.value.split(",")) {
        quiz.scores[jobId] = (quiz.scores[jobId] || 0) + 1;
      }
      quiz.idx += 1;
      if (quiz.idx >= JOB_QUESTIONS.length) finishJobQuiz();
      else renderJobQuestion();
    } else if (action === "job-recommend-continue") {
      openEquip();
    } else if (action === "job-story-continue") {
      openEquip();
    } else if (action === "battle-item") {
      playerBattleAction("item");
    } else if (action === "battle-run") {
      playerBattleAction("run");
    } else if (action === "boss-start") {
      const boss = getActiveEntities().find((e) => e.id === dataset.boss);
      if (boss) startBattle(boss, true);
    } else if (action === "enter-audit-tower") {
      changeZone("audit_tower");
    } else if (action === "quiz-continue") {
      continueQuiz();
    } else if (action === "book") {
      openBook();
    } else if (action === "menu") {
      openModal(`
        <div class="modal-box">
          <div class="modal-title">菜单</div>
          <div class="modal-actions">
            <button class="pixel-btn" data-action="close">返回游戏</button>
            <button class="pixel-btn secondary" data-action="world-map">世界地图</button>
            ${menuButton("伙伴", "partner", "partner")}
            ${menuButton("复习挑战", "challenge", "challenge")}
            <button class="pixel-btn secondary" data-action="plan">学习计划</button>
            <button class="pixel-btn secondary" data-action="weekly-report">学习周报</button>
            <button class="pixel-btn secondary" data-action="challenge-start" data-mode="smart">智能复习</button>
            <button class="pixel-btn secondary" data-action="point-map">考纲导航</button>
            <button class="pixel-btn secondary" data-action="settings">设置</button>
            <button class="pixel-btn secondary" data-action="achievements">成就</button>
            <button class="pixel-btn secondary" data-action="tasks">任务</button>
            ${menuButton("装备与技能", "equip", "equip")}
            ${menuButton("技能树", "skill-tree", "skill")}
            ${menuButton("打造", "craft", "craft")}
            ${menuButton("错题本", "book", "book")}
            <button class="pixel-btn secondary" data-action="job-quiz">职业推荐</button>
            <button class="pixel-btn secondary" data-action="report">学习报告</button>
            <button class="pixel-btn secondary" data-action="toggle-sound">音效：${state.soundEnabled ? "开" : "关"}</button>
            <button class="pixel-btn secondary" data-action="title">返回标题</button>
          </div>
        </div>
      `);
    } else if (action === "report") {
      openReport();
    } else if (action === "tasks") {
      openTasks();
    } else if (action === "equip") {
      openEquip();
    } else if (action === "skill-tree") {
      openSkillTree();
    } else if (action === "craft") {
      openCraft();
    } else if (action === "craft-item") {
      craftItem(dataset.item);
    } else if (action === "enhance") {
      openEnhance();
    } else if (action === "enhance-item") {
      enhanceItem(dataset.slot);
    } else if (action === "achievements") {
      openAchievements();
    } else if (action === "world-map") {
      openWorldMap();
    } else if (action === "world-zone") {
      changeZone(dataset.zone);
    } else if (action === "partner") {
      openPartner();
    } else if (action === "title") {
      save();
      showTitle();
    } else if (action === "toggle-sound") {
      state.soundEnabled = !state.soundEnabled;
      state.settings.musicEnabled = state.soundEnabled;
      state.settings.sfxEnabled = state.soundEnabled;
      save();
      if (state.soundEnabled) {
        if (state.screen === "battle") playBgm(BGM_BATTLE);
        else startBgm();
      } else {
        stopBgm();
      }
      sfx(state.soundEnabled ? "click" : "click");
      showToast(state.soundEnabled ? "音效已开启" : "音效已关闭");
      if (state.screen === "title") showTitle();
      else openSettings();
    } else if (action === "toggle-music") {
      state.settings.musicEnabled = !state.settings.musicEnabled;
      save();
      if (state.settings.musicEnabled) {
        if (state.screen === "battle") playBgm(BGM_BATTLE);
        else playZoneBgm(state.zone || "gold_field");
      } else {
        stopBgm();
      }
      sfx("switch");
      openSettings();
    } else if (action === "toggle-sfx") {
      state.settings.sfxEnabled = !state.settings.sfxEnabled;
      save();
      sfx("switch");
      openSettings();
    } else if (action === "music-down") {
      state.settings.musicVolume = Math.max(0, Math.round((state.settings.musicVolume - 0.1) * 10) / 10);
      save();
      playZoneBgm(state.zone || "gold_field");
      sfx("click");
      openSettings();
    } else if (action === "music-up") {
      state.settings.musicVolume = Math.min(1, Math.round((state.settings.musicVolume + 0.1) * 10) / 10);
      save();
      playZoneBgm(state.zone || "gold_field");
      sfx("click");
      openSettings();
    } else if (action === "sfx-down") {
      state.settings.sfxVolume = Math.max(0, Math.round((state.settings.sfxVolume - 0.1) * 10) / 10);
      save();
      sfx("click");
      openSettings();
    } else if (action === "sfx-up") {
      state.settings.sfxVolume = Math.min(1, Math.round((state.settings.sfxVolume + 0.1) * 10) / 10);
      save();
      sfx("click");
      openSettings();
    } else if (action === "preview-bgm") {
      playZoneBgm(state.zone || "gold_field");
      showToast("正在播放当前区域 BGM");
      openSettings();
    } else if (action === "test-sfx") {
      sfx("hit");
      sfx("correct");
      showToast("音效测试");
      openSettings();
    } else if (action === "toggle-shake") {
      state.settings.shake = state.settings.shake === false;
      save();
      showToast(state.settings.shake ? "屏幕震动已开启" : "屏幕震动已关闭");
      openSettings();
    } else if (action === "volume-down") {
      state.settings.volume = Math.max(0, Math.round((state.settings.volume - 0.1) * 10) / 10);
      save();
      sfx("click");
      openSettings();
    } else if (action === "volume-up") {
      state.settings.volume = Math.min(1, Math.round((state.settings.volume + 0.1) * 10) / 10);
      save();
      sfx("click");
      openSettings();
    } else if (action === "settings") {
      openSettings();
    } else if (action === "settings-back") {
      openSettings();
    } else if (action === "challenge") {
      openChallengeSetup();
    } else if (action === "challenge-start") {
      startChallenge(dataset.mode);
    } else if (action === "plan") {
      openPlan();
    } else if (action === "point-map") {
      openPointMap();
    } else if (action === "point-quiz") {
      const q = getQuestionsByPoint(dataset.point, 1)[0];
      if (q) {
        state.quiz = { q, callback: () => showToast("考点复习完成：" + dataset.point) };
        openQuiz(q);
      }
    } else if (action === "weekly-report") {
      openWeeklyReport();
    } else if (action === "download-weekly") {
      const canvas = document.getElementById("weeklyCanvas");
      if (!canvas) return;
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "cpa_rpg_weekly_report.png";
      a.click();
      showToast("学习周报已下载");
    } else if (action === "plan-target") {
      state.plan.dailyTarget = Number(dataset.target) || 5;
      state.daily.target = state.plan.dailyTarget;
      save();
      sfx("click");
      openPlan();
    } else if (action === "plan-subject") {
      if (dataset.subject === "__all") {
        state.plan.subjects = [];
      } else if (state.plan.subjects.includes(dataset.subject)) {
        state.plan.subjects = state.plan.subjects.filter((s) => s !== dataset.subject);
      } else {
        state.plan.subjects.push(dataset.subject);
      }
      save();
      sfx("click");
      openPlan();
    } else if (action === "review-question") {
      const q = QUESTIONS.find((item) => item.id === Number(dataset.id));
      if (q) {
        state.quiz = { q, callback: () => showToast("复习完成，继续巩固") };
        openQuiz(q);
      }
    } else if (action === "tutorial") {
      openTutorial();
    } else if (action === "story-next") {
      storyNext();
    } else if (action === "deliver-task") {
      deliverTask(dataset.task);
    } else if (action === "npc-return") {
      const npc = getActiveEntities().find((e) => e.id === dataset.npc);
      if (npc) openNpcDialog(npc);
    } else if (action === "export-save") {
      openExportSave();
    } else if (action === "copy-save") {
      const text = document.getElementById("saveExportText")?.value;
      if (!text) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => showToast("存档已复制")).catch(() => showToast("复制失败，请手动复制"));
      } else {
        const area = document.getElementById("saveExportText");
        area.select();
        document.execCommand("copy");
        showToast("存档已复制");
      }
    } else if (action === "download-save") {
      const text = document.getElementById("saveExportText")?.value;
      if (!text) return;
      const blob = new Blob([text], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "cpa_rpg_save.json";
      a.click();
      URL.revokeObjectURL(a.href);
      showToast("存档已下载");
    } else if (action === "import-save") {
      openImportSave();
    } else if (action === "import-save-confirm") {
      const raw = document.getElementById("saveImportText")?.value.trim();
      if (!raw) {
        showToast("请先粘贴存档数据");
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") throw new Error("invalid");
        localStorage.setItem(SAVE_KEY, raw);
        showToast("导入成功，正在重载");
        setTimeout(() => location.reload(), 400);
      } catch (e) {
        showToast("导入失败：存档格式不正确");
      }
    } else if (action === "reset") {
      resetSave();
      showTitle();
    }
  }

  function bindEvents() {
    document.addEventListener("keydown", (e) => {
      keys[e.key] = true;
      const key = e.key.toLowerCase();
      const inField = document.activeElement && /^(INPUT|TEXTAREA)$/i.test(document.activeElement.tagName);
      if (inField) return;
      if ((key === "e") && state.screen === "map" && modal.classList.contains("hidden")) {
        tryInteract();
      }
      if (modal.classList.contains("hidden")) {
        if (state.screen === "map") {
          if (key === "i" || key === "c") openEquip();
          else if (key === "m") openWorldMap();
          else if (key === "q") openTasks();
          else if (key === "k") openSkillTree();
          else if (key === "p") openPlan();
        }
      } else if (e.code === "Space" || key === " ") {
        const storyNext = modal.querySelector('[data-action="story-next"]');
        const quizContinue = modal.querySelector('[data-action="quiz-continue"]');
        if (storyNext) storyNext.click();
        else if (quizContinue) quizContinue.click();
        else if (state.screen === "title" && modal.querySelector('[data-action="start"]')) modal.querySelector('[data-action="start"]').click();
        e.preventDefault();
      }
    });
    document.addEventListener("keyup", (e) => {
      keys[e.key] = false;
    });
    modal.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === "quiz-continue") {
        state._lastQuizCorrect = state._lastQuizCorrect;
      }
      handleAction(action, btn.dataset);
    });
    modal.addEventListener("mouseover", (e) => {
      const tipTarget = e.target.closest("[data-tip]");
      if (tipTarget) showTooltip(tipTarget.dataset.tip, e.clientX, e.clientY);
    });
    modal.addEventListener("mousemove", (e) => {
      if (!tooltip.classList.contains("hidden")) moveTooltip(e.clientX, e.clientY);
    });
    modal.addEventListener("mouseout", (e) => {
      if (!e.relatedTarget || !modal.contains(e.relatedTarget)) hideTooltip();
    });
    modal.addEventListener("click", (e) => {
      const answerBtn = e.target.closest("[data-answer]");
      if (!answerBtn || !state.quiz) return;
      state._lastQuizCorrect = Number(answerBtn.dataset.answer) === state.quiz.q.answer;
      resolveAnswer(Number(answerBtn.dataset.answer));
    });
    document.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => handleAction(btn.dataset.action, btn.dataset));
    });
    document.querySelectorAll("[data-touch]").forEach((btn) => {
      const dir = btn.dataset.touch;
      const set = (v) => (touch[dir] = v);
      btn.addEventListener("pointerdown", () => set(true));
      btn.addEventListener("pointerup", () => set(false));
      btn.addEventListener("pointerleave", () => set(false));
    });
    document.getElementById("touchInteract").addEventListener("click", () => {
      tryInteract();
    });
    canvas.addEventListener("click", (e) => {
      if (state.screen !== "map") return;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) * W) / rect.width;
      const y = ((e.clientY - rect.top) * H) / rect.height;
      let best = null;
      let bestDist = 80;
      getActiveEntities().forEach((entity) => {
        if (entity.type === "chest" && state.openedChests.includes(entity.id)) return;
        if (entity.type === "monster" && (state.monstersKilledIds || []).includes(entity.id)) return;
        if (entity.type === "boss" && (!isBossUnlocked(entity) || isBossDefeated(entity))) return;
        const d = Math.hypot(entity.x + 16 - x, entity.y + 20 - y);
        if (d < bestDist) {
          bestDist = d;
          best = entity;
        }
      });
      if (best) {
        interact(best);
      } else {
        state.player.moveTarget = { x, y };
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (state.screen !== "map" || !modal.classList.contains("hidden")) {
        hideTooltip();
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) * W) / rect.width;
      const y = ((e.clientY - rect.top) * H) / rect.height;
      let best = null;
      let bestDist = 70;
      getActiveEntities().forEach((entity) => {
        if (entity.type === "chest" && state.openedChests.includes(entity.id)) return;
        if (entity.type === "monster" && (state.monstersKilledIds || []).includes(entity.id)) return;
        if (entity.type === "boss" && (!isBossUnlocked(entity) || isBossDefeated(entity))) return;
        const d = Math.hypot(entity.x + 16 - x, entity.y + 20 - y);
        if (d < bestDist) {
          bestDist = d;
          best = entity;
        }
      });
      if (best) showTooltip(entityTooltip(best), e.clientX, e.clientY);
      else hideTooltip();
    });
    canvas.addEventListener("pointerleave", hideTooltip);
  }

  function loop(t) {
    const dt = Math.min(0.05, (t - lastTime) / 1000 || 0.016);
    lastTime = t;
    if (state.screen === "map") updateMap(dt);
    if (state.screen === "map" || state.screen === "battle") state.week.playSeconds = (state.week.playSeconds || 0) + dt;
    render();
    requestAnimationFrame(loop);
  }

  window.addEventListener("error", (e) => {
    document.body.dataset.errors = (document.body.dataset.errors ? Number(document.body.dataset.errors) + 1 : 1).toString();
    document.body.dataset.errorMessage = e.message || "unknown";
  });

  async function init() {
    document.body.dataset.sunnyside = "loading";
    try {
      await loadAssets();
      loadingPanel.classList.add("hidden");
      bindEvents();
      const params = new URLSearchParams(location.search);
      const autoStart = params.get("autostart") === "map";
      const unlockAll = params.get("unlock") === "all";
      if (autoStart) {
        state = defaultState();
        state._unlockAll = unlockAll;
        ensureTaskFields();
        state.screen = "map";
        continueGame();
      } else if (params.get("autostart") === "battle") {
        state = defaultState();
        state._unlockAll = unlockAll;
        ensureTaskFields();
        state.screen = "map";
        continueGame();
        const monster = entities.find((e) => e.type === "monster");
        if (monster) startBattle(monster, false);
      } else if (params.get("autostart") === "room") {
        state = defaultState();
        state._unlockAll = unlockAll;
        ensureTaskFields();
        state.screen = "map";
        state.room = "shop";
        state.player.x = 300;
        state.player.y = 320;
        continueGame();
      } else if (state.screen === "map") {
        state._unlockAll = unlockAll;
        continueGame();
      } else {
        showTitle();
      }
      updateHUD();
      requestAnimationFrame(loop);
    } catch (err) {
      document.body.dataset.sunnyside = "fail";
      document.body.dataset.errorMessage = err.message;
      openModal(`
        <div class="modal-box">
          <div class="modal-title">资源加载失败</div>
          <div class="modal-text">${err.message}</div>
        </div>
      `);
    }
  }

  window.__game = {
    get state() {
      return state;
    },
    skills: ALL_SKILLS,
    jobs: JOBS,
    entities,
    auditEntities: AUDIT_ENTITIES,
    capitalEntities: CAPITAL_ENTITIES,
    taxEntities: TAX_ENTITIES,
    lawEntities: LAW_ENTITIES,
    strategyEntities: STRATEGY_ENTITIES,
    startGame,
    continueGame,
    interact,
    playerBattleAction,
    resolveAnswer,
    maybeLevelUp,
    openBook,
    openReport,
    openTasks,
    openAchievements,
    openEquip,
    openSkillTree,
    openCraft,
    openEnhance,
    openPartner,
    openChallengeSetup,
    openPlan,
    openWeeklyReport,
    openPointMap,
    openJobQuiz,
    advanceMainStory,
    activateRegionTasks,
    openSettings,
    startChallenge,
    switchJob,
    closeModal,
    quiz: () => state.quiz,
    battle: () => state.battle
  };

  init();
})();
