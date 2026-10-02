const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const waveValue = document.getElementById("waveValue");
const hpValue = document.getElementById("hpValue");
const xpValue = document.getElementById("xpValue");
const jobValue = document.getElementById("jobValue");
const bankValue = document.getElementById("bankValue");
const skillLevelValue = document.getElementById("skillLevelValue");
const skillShop = document.getElementById("skillShop");
const overlay = document.getElementById("overlay");

const jobs = {
  knight: {
    name: "Knight",
    color: "#f9c74f",
    speed: 3.6,
    hp: 150,
    damage: 18,
    description: "방패와 검으로 전면을 지키는 전사",
    skills: [
      { key: "Z", name: "Shield Bash", type: "melee", damage: 30, range: 120, radius: 58, cooldown: 2.8, color: "#f9c74f" },
      { key: "X", name: "Flame Slash", type: "projectile", damage: 26, speed: 8, radius: 12, cooldown: 4.3, color: "#ff7a59" },
      { key: "C", name: "Earth Stomp", type: "aoe", damage: 34, radius: 110, cooldown: 6.3, color: "#7dd3fc" },
      { key: "V", name: "Blade Storm", type: "cone", damage: 42, range: 150, radius: 48, cooldown: 8.2, color: "#fbbf24" }
    ]
  },
  mage: {
    name: "Mage",
    color: "#7dd3fc",
    speed: 3.3,
    hp: 120,
    damage: 16,
    description: "강력한 마법을 구사하는 주문사",
    skills: [
      { key: "Z", name: "Fireball", type: "projectile", damage: 28, speed: 8.5, radius: 12, cooldown: 3.3, color: "#fb7185" },
      { key: "X", name: "Frost Nova", type: "aoe", damage: 31, radius: 130, cooldown: 5.5, color: "#a5b4fc" },
      { key: "C", name: "Arcane Beam", type: "beam", damage: 36, range: 220, cooldown: 6.3, color: "#c084fc" },
      { key: "V", name: "Meteor", type: "meteor", damage: 54, radius: 70, cooldown: 9.2, color: "#f59e0b" }
    ]
  },
  ranger: {
    name: "Ranger",
    color: "#86efac",
    speed: 3.8,
    hp: 125,
    damage: 17,
    description: "정밀한 사격으로 적을 제압하는 궁수",
    skills: [
      { key: "Z", name: "Rapid Shot", type: "projectile", damage: 25, speed: 9, radius: 10, cooldown: 2.7, color: "#4ade80" },
      { key: "X", name: "Piercing Arrow", type: "projectile", damage: 33, speed: 9.5, radius: 12, cooldown: 4.2, color: "#86efac" },
      { key: "C", name: "Snare Trap", type: "aoe", damage: 29, radius: 120, cooldown: 5.7, color: "#facc15" },
      { key: "V", name: "Rain of Arrows", type: "rain", damage: 40, radius: 72, cooldown: 8.5, color: "#34d399" }
    ]
  },
  rogue: {
    name: "Rogue",
    color: "#c4b5fd",
    speed: 4.2,
    hp: 110,
    damage: 19,
    description: "신속하게 움직이며 약점을 노리는 암살자",
    skills: [
      { key: "Z", name: "Shadow Slash", type: "melee", damage: 27, range: 110, radius: 52, cooldown: 2.5, color: "#c084fc" },
      { key: "X", name: "Blink Step", type: "dash", damage: 18, range: 110, cooldown: 4.5, color: "#a78bfa" },
      { key: "C", name: "Poison Dart", type: "projectile", damage: 30, speed: 8.8, radius: 11, cooldown: 4.5, color: "#4ade80" },
      { key: "V", name: "Night Burst", type: "aoe", damage: 45, radius: 125, cooldown: 8.3, color: "#f472b6" }
    ]
  }
};

const keyState = {};
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

let player = null;
let enemies = [];
let projectiles = [];
let xpOrbs = [];
let effects = [];
let state = {
  selectedClass: "knight",
  currentWave: 1,
  waveTransition: false,
  waveTimer: 0,
  gameOver: false
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalize(x, y) {
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

function getSelectedJob() {
  return jobs[state.selectedClass];
}

function setSelectedJob(jobId) {
  state.selectedClass = jobId;
  document.querySelectorAll(".job-card").forEach((button) => {
    button.classList.toggle("selected", button.dataset.job === jobId);
  });
  startGame();
}

function startGame() {
  const job = getSelectedJob();
  const base = jobs[state.selectedClass];

  player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 18,
    speed: base.speed,
    color: base.color,
    hp: base.hp,
    maxHp: base.hp,
    damage: base.damage,
    facing: { x: 1, y: 0 },
    attackCooldown: 0,
    dashCooldown: 0,
    dashTimer: 0,
    dashVector: { x: 0, y: 0 },
    lastMove: { x: 1, y: 0 },
    dashHold: 0,
    lastDashDir: null,
    xpBank: 0,
    skillLevels: { Z: 0, X: 0, C: 0, V: 0 },
    skills: base.skills.map((skill) => ({ ...skill, cooldownLeft: 0 }))
  };

  enemies = [];
  projectiles = [];
  xpOrbs = [];
  effects = [];
  state.currentWave = 1;
  state.waveTransition = false;
  state.waveTimer = 0;
  state.gameOver = false;

  overlay.classList.add("hidden");
  jobValue.textContent = job.name;
  spawnWave();
  updateHud();
}

function updateHud() {
  const job = getSelectedJob();
  waveValue.textContent = String(state.currentWave);
  hpValue.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
  xpValue.textContent = String(player.xpBank);
  jobValue.textContent = job.name;
  bankValue.textContent = String(player.xpBank);
  const totalSkillLevel = Object.values(player.skillLevels).reduce((sum, value) => sum + value, 0);
  skillLevelValue.textContent = String(totalSkillLevel);

  skillShop.innerHTML = "";
  player.skills.forEach((skill) => {
    const btn = document.createElement("button");
    const level = player.skillLevels[skill.key] || 0;
    const cost = 20 + level * 18;
    btn.className = "skill-btn";
    btn.textContent = `${skill.key} ${skill.name} Lv.${level} (cost ${cost})`;
    btn.disabled = player.xpBank < cost && !state.gameOver;
    btn.addEventListener("click", () => buySkillUpgrade(skill.key));
    skillShop.appendChild(btn);
  });
}

function buySkillUpgrade(key) {
  const skill = player.skills.find((item) => item.key === key);
  if (!skill) return;
  const level = player.skillLevels[key] || 0;
  const cost = 20 + level * 18;

  if (player.xpBank < cost) {
    return;
  }

  player.xpBank -= cost;
  player.skillLevels[key] = level + 1;
  updateHud();
}

function buyUpgrade(type) {
  const costs = {
    hp: 25,
    damage: 28,
    speed: 24
  };

  const cost = costs[type];
  if (player.xpBank < cost) return;

  player.xpBank -= cost;

  if (type === "hp") {
    player.maxHp += 18;
    player.hp = player.maxHp;
  } else if (type === "damage") {
    player.damage += 4;
  } else if (type === "speed") {
    player.speed += 0.28;
  }

  updateHud();
}

document.querySelectorAll(".upgrade-btn").forEach((button) => {
  button.addEventListener("click", () => {
    buyUpgrade(button.dataset.upgrade);
  });
});

document.querySelectorAll(".job-card").forEach((button) => {
  button.addEventListener("click", () => {
    setSelectedJob(button.dataset.job);
  });
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
    event.preventDefault();
  }

  if (["z", "x", "c", "v", " "].includes(key) || event.code === "Space") {
    event.preventDefault();
  }

  if (event.code === "Space") {
    keyState["space"] = true;
    if (!state.gameOver) {
      attack();
    }
    return;
  }

  if (key === "z" || key === "x" || key === "c" || key === "v") {
    keyState[key] = true;
    if (!state.gameOver) {
      useSkill(key.toUpperCase());
    }
    return;
  }

  if (key === "arrowup") keyState.arrowup = true;
  if (key === "arrowdown") keyState.arrowdown = true;
  if (key === "arrowleft") keyState.arrowleft = true;
  if (key === "arrowright") keyState.arrowright = true;
  if (key === "w") keyState.w = true;
  if (key === "a") keyState.a = true;
  if (key === "s") keyState.s = true;
  if (key === "d") keyState.d = true;

  if (event.key.toLowerCase() === "r" && state.gameOver) {
    startGame();
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  if (event.code === "Space") {
    keyState["space"] = false;
    return;
  }

  if (key === "z") keyState.z = false;
  if (key === "x") keyState.x = false;
  if (key === "c") keyState.c = false;
  if (key === "v") keyState.v = false;
  if (key === "arrowup") keyState.arrowup = false;
  if (key === "arrowdown") keyState.arrowdown = false;
  if (key === "arrowleft") keyState.arrowleft = false;
  if (key === "arrowright") keyState.arrowright = false;
  if (key === "w") keyState.w = false;
  if (key === "a") keyState.a = false;
  if (key === "s") keyState.s = false;
  if (key === "d") keyState.d = false;
});

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
  mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
});

function attack() {
  if (!player || state.gameOver) return;
  if (player.attackCooldown > 0) return;

  player.attackCooldown = 0.38;

  const angle = Math.atan2(mouseY - player.y, mouseX - player.x) || 0;
  const swingRange = 95;
  const centerX = player.x + Math.cos(angle) * swingRange * 0.7;
  const centerY = player.y + Math.sin(angle) * swingRange * 0.7;

  effects.push({
    type: "slash",
    x: centerX,
    y: centerY,
    radius: 62,
    color: "rgba(255,255,255,0.25)",
    life: 0.12,
    angle
  });

  enemies.forEach((enemy) => {
    const dist = distance(enemy.x, enemy.y, centerX, centerY);
    if (dist < enemy.radius + 28) {
      damageEnemy(enemy, player.damage, 0.5, angle);
    }
  });
}

function useSkill(key) {
  if (!player || state.gameOver) return;
  const skill = player.skills.find((item) => item.key === key);
  if (!skill) return;
  if (skill.cooldownLeft > 0) return;

  const level = player.skillLevels[key] || 0;
  const powerBonus = level * 6;
  const damage = skill.damage + powerBonus;
  const angle = Math.atan2(mouseY - player.y, mouseX - player.x) || 0;

  if (skill.type === "melee") {
    const centerX = player.x + Math.cos(angle) * skill.range * 0.7;
    const centerY = player.y + Math.sin(angle) * skill.range * 0.7;
    effects.push({ type: "ring", x: centerX, y: centerY, radius: skill.radius, color: skill.color, life: 0.22 });

    enemies.forEach((enemy) => {
      const dist = distance(enemy.x, enemy.y, centerX, centerY);
      if (dist < enemy.radius + skill.radius) {
        damageEnemy(enemy, damage, 0.6, angle);
      }
    });
  }

  if (skill.type === "projectile") {
    const dir = normalize(mouseX - player.x, mouseY - player.y);
    projectiles.push({
      x: player.x,
      y: player.y,
      dx: dir.x,
      dy: dir.y,
      radius: skill.radius,
      speed: skill.speed + level * 0.6,
      damage,
      life: 2.4,
      color: skill.color,
      from: "player"
    });
  }

  if (skill.type === "aoe") {
    effects.push({ type: "burst", x: player.x, y: player.y, radius: skill.radius, color: skill.color, life: 0.35 });
    enemies.forEach((enemy) => {
      const dist = distance(enemy.x, enemy.y, player.x, player.y);
      if (dist < skill.radius + enemy.radius) {
        damageEnemy(enemy, damage, 0.8, angle);
      }
    });
  }

  if (skill.type === "cone") {
    const range = skill.range || 150;
    const cx = player.x + Math.cos(angle) * range * 0.7;
    const cy = player.y + Math.sin(angle) * range * 0.7;
    effects.push({ type: "cone", x: cx, y: cy, radius: skill.radius, color: skill.color, life: 0.18, angle });

    enemies.forEach((enemy) => {
      const dist = distance(enemy.x, enemy.y, player.x, player.y);
      const enemyAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
      const angleDiff = Math.abs(Math.atan2(Math.sin(angle - enemyAngle), Math.cos(angle - enemyAngle)));
      if (dist < range && angleDiff < 0.8) {
        damageEnemy(enemy, damage, 1.0, angle);
      }
    });
  }

  if (skill.type === "beam") {
    const endX = player.x + Math.cos(angle) * 220;
    const endY = player.y + Math.sin(angle) * 220;
    effects.push({ type: "beam", x: endX, y: endY, radius: 12, color: skill.color, life: 0.18, angle });

    enemies.forEach((enemy) => {
      const distToLine = Math.abs((enemy.y - player.y) * Math.cos(angle) - (enemy.x - player.x) * Math.sin(angle));
      const distToPlayer = distance(enemy.x, enemy.y, player.x, player.y);
      if (distToLine < 18 && distToPlayer < 220) {
        damageEnemy(enemy, damage, 0.7, angle);
      }
    });
  }

  if (skill.type === "meteor") {
    const targetX = mouseX;
    const targetY = mouseY;
    effects.push({ type: "meteor", x: targetX, y: targetY, radius: 90, color: skill.color, life: 0.35 });
    enemies.forEach((enemy) => {
      const dist = distance(enemy.x, enemy.y, targetX, targetY);
      if (dist < 90 + enemy.radius) {
        damageEnemy(enemy, damage, 1.1, angle);
      }
    });
  }

  if (skill.type === "rain") {
    const count = 6 + level;
    for (let i = 0; i < count; i += 1) {
      const rndX = mouseX + randRange(-120, 120);
      const rndY = mouseY + randRange(-120, 120);
      effects.push({ type: "spark", x: rndX, y: rndY, radius: 16, color: skill.color, life: 0.2 });
      enemies.forEach((enemy) => {
        const dist = distance(enemy.x, enemy.y, rndX, rndY);
        if (dist < 32 + enemy.radius) {
          damageEnemy(enemy, damage / 2, 0.6, angle);
        }
      });
    }
  }

  if (skill.type === "dash") {
    const dir = normalize(mouseX - player.x, mouseY - player.y);
    player.dashCooldown = 1.7;
    player.dashTimer = 0.18;
    player.dashVector = { x: dir.x * 10, y: dir.y * 10 };
    player.x += dir.x * 30;
    player.y += dir.y * 30;
    player.x = clamp(player.x, 18, canvas.width - 18);
    player.y = clamp(player.y, 18, canvas.height - 18);
  }

  skill.cooldownLeft = skill.cooldown * (1 - Math.min(level * 0.06, 0.28));
  updateHud();
}

function damageEnemy(enemy, amount, knockbackValue, direction) {
  if (enemy.invulnerable) return;

  enemy.hp -= amount;
  enemy.hitFlash = 0.12;
  enemy.knockbackX = Math.cos(direction) * knockbackValue * 9;
  enemy.knockbackY = Math.sin(direction) * knockbackValue * 9;

  if (enemy.hp <= 0) {
    killEnemy(enemy);
  }
}

function killEnemy(enemy) {
  enemies = enemies.filter((item) => item !== enemy);
  xpOrbs.push({ x: enemy.x, y: enemy.y, radius: 7, amount: enemy.xpValue, life: 8 });

  if (enemies.length === 0 && !state.waveTransition) {
    state.waveTransition = true;
    state.waveTimer = 0.8;
  }
}

function spawnEnemy(type = "normal", waveLevel = state.currentWave) {
  const side = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;

  if (side === 0) {
    x = randRange(0, canvas.width);
    y = -30;
  } else if (side === 1) {
    x = canvas.width + 30;
    y = randRange(0, canvas.height);
  } else if (side === 2) {
    x = randRange(0, canvas.width);
    y = canvas.height + 30;
  } else {
    x = -30;
    y = randRange(0, canvas.height);
  }

  const isBoss = type === "boss";
  const isElite = type === "elite";

  const baseHp = isBoss ? 280 + waveLevel * 72 : isElite ? 110 + waveLevel * 18 : 40 + waveLevel * 10;
  const speed = isBoss ? 1.25 + waveLevel * 0.06 : isElite ? 1.7 + waveLevel * 0.08 : 1.15 + waveLevel * 0.08;
  const damage = isBoss ? 16 + waveLevel * 2 : isElite ? 10 + waveLevel : 6 + waveLevel;
  const radius = isBoss ? 28 : isElite ? 18 : 14;
  const xpValue = isBoss ? 80 + waveLevel * 24 : isElite ? 28 + waveLevel * 6 : 12 + waveLevel * 4;

  enemies.push({
    x,
    y,
    radius,
    hp: baseHp,
    maxHp: baseHp,
    speed,
    damage,
    xpValue,
    color: isBoss ? "#f97316" : isElite ? "#e879f9" : "#ef4444",
    hitFlash: 0,
    attackCooldown: randRange(0.6, 1.3),
    knockbackX: 0,
    knockbackY: 0,
    isBoss,
    isElite
  });
}

function spawnWave() {
  const bossWave = state.currentWave % 4 === 0;
  const enemyCount = bossWave ? 1 : 4 + state.currentWave * 2;

  for (let i = 0; i < enemyCount; i += 1) {
    const type = bossWave ? "boss" : i % 5 === 0 ? "elite" : "normal";
    spawnEnemy(type, state.currentWave);
  }
}

function nextWave() {
  state.currentWave += 1;
  state.waveTransition = false;
  spawnWave();
  updateHud();
}

function updatePlayer(dt) {
  if (!player || state.gameOver) return;

  const moveX = (keyState.d || keyState.arrowright ? 1 : 0) - (keyState.a || keyState.arrowleft ? 1 : 0);
  const moveY = (keyState.s || keyState.arrowdown ? 1 : 0) - (keyState.w || keyState.arrowup ? 1 : 0);

  if (moveX || moveY) {
    const dir = normalize(moveX, moveY);
    if (player.lastDashDir && Math.abs(dir.x - player.lastDashDir.x) < 0.02 && Math.abs(dir.y - player.lastDashDir.y) < 0.02) {
      player.dashHold += dt;
    } else {
      player.lastDashDir = dir;
      player.dashHold = 0;
    }

    if (player.dashHold > 0.2 && player.dashCooldown <= 0) {
      player.dashCooldown = 1.7;
      player.dashTimer = 0.2;
      player.dashVector = { x: dir.x * 17, y: dir.y * 17 };
      player.dashHold = 0;
    }

    player.lastMove = { x: dir.x, y: dir.y };
    player.facing = { x: dir.x, y: dir.y };
  } else {
    player.dashHold = 0;
    player.lastDashDir = null;
  }

  if (player.dashTimer > 0) {
    player.x += player.dashVector.x * dt * 60;
    player.y += player.dashVector.y * dt * 60;
    player.dashTimer -= dt;
  } else {
    player.x += moveX * player.speed * dt * 60;
    player.y += moveY * player.speed * dt * 60;
  }

  player.x = clamp(player.x, player.radius, canvas.width - player.radius);
  player.y = clamp(player.y, player.radius, canvas.height - player.radius);

  if (player.attackCooldown > 0) {
    player.attackCooldown -= dt;
  }

  if (player.dashCooldown > 0) {
    player.dashCooldown -= dt;
  }

  const lookDir = normalize(mouseX - player.x, mouseY - player.y);
  player.facing = { x: lookDir.x, y: lookDir.y };

  player.skills.forEach((skill) => {
    if (skill.cooldownLeft > 0) {
      skill.cooldownLeft -= dt;
    }
  });
}

function updateEnemies(dt) {
  enemies.forEach((enemy) => {
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.attackCooldown -= dt;
    enemy.knockbackX *= 0.9;
    enemy.knockbackY *= 0.9;

    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;

    enemy.x += (nx * enemy.speed * 60 * dt) + enemy.knockbackX;
    enemy.y += (ny * enemy.speed * 60 * dt) + enemy.knockbackY;

    if (dist < enemy.radius + player.radius + 6 && enemy.attackCooldown <= 0) {
      player.hp -= enemy.damage;
      enemy.attackCooldown = 0.9;
      if (player.hp <= 0) {
        player.hp = 0;
        state.gameOver = true;
        overlay.classList.remove("hidden");
      }
    }
  });
}

function updateProjectiles(dt) {
  projectiles.forEach((projectile) => {
    projectile.x += projectile.dx * projectile.speed * 60 * dt;
    projectile.y += projectile.dy * projectile.speed * 60 * dt;
    projectile.life -= dt;

    enemies.forEach((enemy) => {
      if (distance(projectile.x, projectile.y, enemy.x, enemy.y) < projectile.radius + enemy.radius) {
        damageEnemy(enemy, projectile.damage, 0.8, Math.atan2(projectile.dy, projectile.dx));
        projectile.life = 0;
      }
    });
  });

  projectiles = projectiles.filter((projectile) => projectile.life > 0 && projectile.x > -50 && projectile.x < canvas.width + 50 && projectile.y > -50 && projectile.y < canvas.height + 50);
}

function updateXP(dt) {
  xpOrbs.forEach((orb) => {
    orb.life -= dt;
    const dist = distance(orb.x, orb.y, player.x, player.y);
    if (dist < 28) {
      player.xpBank += orb.amount;
      orb.life = -1;
    }
  });

  xpOrbs = xpOrbs.filter((orb) => orb.life > 0);
}

function updateEffects(dt) {
  effects.forEach((effect) => {
    effect.life -= dt;
  });
  effects = effects.filter((effect) => effect.life > 0);
}

function updateState(dt) {
  if (state.gameOver) return;

  updatePlayer(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateXP(dt);
  updateEffects(dt);

  if (state.waveTransition) {
    state.waveTimer -= dt;
    if (state.waveTimer <= 0) {
      nextWave();
    }
  }

  if (player.hp > player.maxHp) {
    player.hp = player.maxHp;
  }

  updateHud();
}

function drawBackground() {
  ctx.fillStyle = "#0b1020";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
  ctx.lineWidth = 1;

  for (let x = 0; x < canvas.width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y < canvas.height; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawPlayer() {
  ctx.fillStyle = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  const aimX = player.x + player.facing.x * 22;
  const aimY = player.y + player.facing.y * 22;
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(aimX, aimY);
  ctx.stroke();

  const barWidth = 50;
  const hpRatio = clamp(player.hp / player.maxHp, 0, 1);
  ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
  ctx.fillRect(player.x - barWidth / 2, player.y - 34, barWidth, 6);
  ctx.fillStyle = "#34d399";
  ctx.fillRect(player.x - barWidth / 2, player.y - 34, barWidth * hpRatio, 6);
}

function drawEnemy(enemy) {
  ctx.fillStyle = enemy.hitFlash > 0 ? "#fff" : enemy.color;
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
  ctx.fill();

  const hpRatio = clamp(enemy.hp / enemy.maxHp, 0, 1);
  ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
  ctx.fillRect(enemy.x - 24, enemy.y - enemy.radius - 12, 48, 5);
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(enemy.x - 24, enemy.y - enemy.radius - 12, 48 * hpRatio, 5);
}

function drawProjectiles() {
  projectiles.forEach((projectile) => {
    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawXP() {
  xpOrbs.forEach((orb) => {
    ctx.fillStyle = "#a7f3d0";
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#134e4a";
    ctx.font = "11px sans-serif";
    ctx.fillText("+" + orb.amount, orb.x - 8, orb.y + 4);
  });
}

function drawEffects() {
  effects.forEach((effect) => {
    ctx.fillStyle = effect.color;
    ctx.strokeStyle = effect.color;
    ctx.beginPath();

    if (effect.type === "slash" || effect.type === "ring" || effect.type === "burst") {
      ctx.arc(effect.x, effect.y, effect.radius * (1.0 - effect.life * 1.2), 0, Math.PI * 2);
      ctx.fill();
    }

    if (effect.type === "cone") {
      const radius = effect.radius * (1.0 - effect.life * 1.2);
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.arc(player.x, player.y, radius, effect.angle - 0.8, effect.angle + 0.8);
      ctx.closePath();
      ctx.fill();
    }

    if (effect.type === "beam") {
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(player.x + Math.cos(effect.angle) * 220, player.y + Math.sin(effect.angle) * 220);
      ctx.stroke();
    }

    if (effect.type === "meteor") {
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius * (1.0 - effect.life * 1.4), 0, Math.PI * 2);
      ctx.fill();
    }

    if (effect.type === "spark") {
      ctx.beginPath();
      ctx.arc(effect.x, effect.y, effect.radius * (1.0 - effect.life * 1.3), 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawWaveText() {
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`Wave ${state.currentWave}`, canvas.width / 2, 42);
  ctx.textAlign = "left";
}

function render() {
  drawBackground();
  drawXP();
  drawProjectiles();
  drawEffects();
  enemies.forEach(drawEnemy);
  drawPlayer();
  drawWaveText();
}

let lastTime = 0;
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
  lastTime = timestamp;

  updateState(dt);
  render();
  requestAnimationFrame(gameLoop);
}

startGame();
requestAnimationFrame(gameLoop);

