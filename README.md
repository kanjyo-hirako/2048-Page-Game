# 2048 网页小游戏

一款基于纯前端技术实现的 2048 网页小游戏，支持用户登录、游戏记录持久化、实时计时等功能。无需后端服务，开箱即用。

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

## 功能特性

- **经典 2048 玩法** — 4x4 网格，滑动合并方块，支持键盘方向键 / WASD / 触摸滑动
- **用户系统** — 用户名 + 密码登录注册，数据通过 localStorage 持久化
- **游戏记录** — 自动记录每局得分、对局时长、对局时间，支持查看历史记录
- **实时计时** — 游戏过程中实时显示对局用时，结束时自动停止
- **当前最高方块** — 顶部栏实时显示棋盘上最大方块数值
- **响应式设计** — 适配桌面端与移动端，自动调整网格尺寸
- **白色 + 绿色主题** — 简洁清爽的视觉风格，方块使用绿色渐变配色
- **Game Over 弹窗** — 游戏结束时显示提示，支持一键重新开始

## 项目结构

```
2048-Page-Game/
├── index.html          # 主页面（HTML 结构）
├── style.css           # 样式文件（布局、配色、动画、响应式）
├── game.js             # 游戏逻辑（全部核心代码）
├── 2048.html           # 单文件版本（CSS/JS 内联，方便分享）
├── CLAUDE.md           # 项目需求文档
└── .gitignore          # Git 忽略规则
```

| 文件 | 说明 |
|------|------|
| `index.html` | 页面骨架，包含三个屏幕（首页 / 登录 / 游戏）和历史记录面板 |
| `style.css` | 白色 + 绿色主题样式，含方块颜色、滑动动画、响应式断点 |
| `game.js` | 全部游戏逻辑：网格、方块、输入、渲染、用户管理、存储 |
| `2048.html` | 将 CSS 和 JS 内联的单文件版本，分享时只需发送此文件 |

## 快速开始

```bash
# 方式一：分文件版本
# 直接用浏览器打开 index.html

# 方式二：单文件版本（适合分享）
# 直接用浏览器打开 2048.html
```

无需安装任何依赖，无需启动服务器。

## 核心代码解析

### 1. 网格系统（Grid）

网格是 4x4 的二维数组，每个格子存放一个 `Tile` 对象或 `null`。

```javascript
function Grid(size, previousState) {
    this.size = size;
    this.cells = previousState ? this.fromState(previousState) : this.empty();
}

// 创建空网格
Grid.prototype.empty = function () {
    var cells = [];
    for (var x = 0; x < this.size; x++) {
        var row = cells[x] = [];
        for (var y = 0; y < this.size; y++) {
            row.push(null);
        }
    }
    return cells;
};

// 获取当前棋盘最大方块值
Grid.prototype.maxTileValue = function () {
    var max = 0;
    this.eachCell(function (x, y, tile) {
        if (tile && tile.value > max) max = tile.value;
    });
    return max;
};
```

### 2. 方块对象（Tile）

每个方块记录当前位置、数值，以及动画所需的历史位置和合并信息。

```javascript
function Tile(position, value) {
    this.x = position.x;
    this.y = position.y;
    this.value = value || 2;
    this.previousPosition = null;   // 用于滑动动画：移动前的位置
    this.mergedFrom = null;         // 用于合并动画：记录合并来源
}
```

### 3. 核心移动逻辑（GameManager.move）

这是整个游戏的核心算法。每次操作按方向遍历网格，计算每个方块的最远可达位置，判断是否发生合并。

```javascript
GameManager.prototype.move = function (direction) {
    if (this.isGameTerminated()) return;

    var vector     = this.getVector(direction);        // 方向向量
    var traversals = this.buildTraversals(vector);      // 遍历顺序
    var moved      = false;

    this.prepareTiles();

    traversals.x.forEach(function (x) {
        traversals.y.forEach(function (y) {
            var cell = { x: x, y: y };
            var tile = self.grid.cellContent(cell);

            if (tile) {
                var positions = self.findFarthestPosition(cell, vector);
                var next = self.grid.cellContent(positions.next);

                // 判断是否可以合并（数值相同且目标未被合并过）
                if (next && next.value === tile.value && !next.mergedFrom) {
                    var merged = new Tile(positions.next, tile.value * 2);
                    merged.mergedFrom = [tile, next];

                    self.grid.insertTile(merged);
                    self.grid.removeTile(tile);
                    tile.updatePosition(positions.next);

                    self.score += merged.value;
                    if (merged.value === 2048) self.won = true;
                } else {
                    self.moveTile(tile, positions.farthest);
                }

                if (!self.positionsEqual(cell, tile)) moved = true;
            }
        });
    });

    if (moved) {
        this.addRandomTile();                  // 移动后随机生成新方块
        if (!this.movesAvailable()) this.over = true;
        this.actuate();
    }
};

// 查找最远可达位置
GameManager.prototype.findFarthestPosition = function (cell, vector) {
    var previous;
    do {
        previous = cell;
        cell = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.grid.withinBounds(cell) && this.grid.cellAvailable(cell));
    return { farthest: previous, next: cell };
};

// 方向向量映射
GameManager.prototype.getVector = function (direction) {
    var map = {
        0: { x: 0,  y: -1 },   // 上
        1: { x: 1,  y: 0 },    // 右
        2: { x: 0,  y: 1 },    // 下
        3: { x: -1, y: 0 }     // 左
    };
    return map[direction];
};
```

### 4. 游戏结束判断

当棋盘满了且没有任何相邻方块可以合并时，游戏结束。

```javascript
GameManager.prototype.movesAvailable = function () {
    return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

GameManager.prototype.tileMatchesAvailable = function () {
    for (var x = 0; x < this.size; x++) {
        for (var y = 0; y < this.size; y++) {
            var tile = this.grid.cellContent({ x: x, y: y });
            if (tile) {
                for (var d = 0; d < 4; d++) {
                    var vector = this.getVector(d);
                    var cell   = { x: x + vector.x, y: y + vector.y };
                    var other  = this.grid.cellContent(cell);
                    if (other && other.value === tile.value) return true;
                }
            }
        }
    }
    return false;
};
```

### 5. 方块渲染与动画（HTMLActuator）

通过 CSS 类名驱动方块的移动、出现、合并动画。每次渲染时清除容器并重建所有方块 DOM。

```javascript
HTMLActuator.prototype.addTile = function (tile) {
    var wrapper = document.createElement("div");
    var inner   = document.createElement("div");
    var position = tile.previousPosition || { x: tile.x, y: tile.y };
    var classes  = ["tile", "tile-" + tile.value, this.positionClass(position)];

    if (tile.value > 2048) classes.push("tile-super");
    this.applyClasses(wrapper, classes);

    inner.classList.add("tile-inner");
    inner.textContent = tile.value;

    if (tile.previousPosition) {
        // 已有方块移动：先渲染在旧位置，下一帧更新到新位置（触发 CSS transition）
        var self = this;
        window.requestAnimationFrame(function () {
            classes[2] = self.positionClass({ x: tile.x, y: tile.y });
            self.applyClasses(wrapper, classes);
        });
    } else if (tile.mergedFrom) {
        // 合并产生的方块：添加 pop 动画，并递归渲染来源方块
        classes.push("tile-merged");
        this.applyClasses(wrapper, classes);
        tile.mergedFrom.forEach(function (m) { self.addTile(m); });
    } else {
        // 新生成的方块：添加出现动画
        classes.push("tile-new");
        this.applyClasses(wrapper, classes);
    }

    wrapper.appendChild(inner);
    this.tileContainer.appendChild(wrapper);
};
```

对应的 CSS 动画：

```css
/* 方块滑动 */
.tile {
    transition: transform 100ms ease-in-out;
}

/* 新方块出现 */
.tile-new .tile-inner {
    animation: appear 200ms ease 100ms both;
}

/* 合并弹跳 */
.tile-merged .tile-inner {
    animation: pop 200ms ease 100ms both;
}

@keyframes appear {
    0%   { opacity: 0; transform: scale(0); }
    100% { opacity: 1; transform: scale(1); }
}

@keyframes pop {
    0%   { transform: scale(0); }
    50%  { transform: scale(1.2); }
    100% { transform: scale(1); }
}
```

### 6. 输入管理（键盘 + 触摸）

同时支持键盘方向键、WASD 和移动端触摸滑动。

```javascript
InputManager.prototype.listen = function () {
    var map = {
        38: 0, 39: 1, 40: 2, 37: 3,   // 方向键
        87: 0, 68: 1, 83: 2, 65: 3    // WASD
    };

    // 键盘事件
    document.addEventListener("keydown", function (event) {
        var mapped = map[event.which];
        if (mapped !== undefined) {
            event.preventDefault();
            self.emit("move", mapped);
        }
    });

    // 触摸滑动
    gameContainer.addEventListener("touchend", function (event) {
        var dx = event.changedTouches[0].clientX - touchStartClientX;
        var dy = event.changedTouches[0].clientY - touchStartClientY;
        if (Math.max(Math.abs(dx), Math.abs(dy)) > 10) {
            self.emit("move", Math.abs(dx) > Math.abs(dy)
                ? (dx > 0 ? 1 : 3)
                : (dy > 0 ? 2 : 0));
        }
    });
};
```

### 7. 用户系统与数据持久化

通过 localStorage 实现用户注册登录和游戏数据存储，无需后端。

```javascript
function StorageManager() {
    this.userKey    = "2048_currentUser";
    this.usersKey   = "2048_users";
}

// 登录/注册流程
StorageManager.prototype.getUsers = function () {
    var data = localStorage.getItem(this.usersKey);
    return data ? JSON.parse(data) : {};
};

// 存储结构：
// "2048_users"              -> { "alice": "123456", "bob": "abc" }
// "2048_currentUser"        -> "alice"
// "2048_users_alice"        -> { history: [...], bestScore: 8192 }
// "2048_users_alice_gameState" -> { grid, score, over, won, keepPlaying }
```

### 8. 屏幕切换与游戏生命周期

单页应用通过 CSS 类名控制三个屏幕的显隐切换。

```javascript
app.showScreen = function (screenId) {
    document.querySelectorAll(".screen").forEach(function (s) {
        s.classList.remove("active");
    });
    document.getElementById(screenId).classList.add("active");
};

// 流程：首页(点击) -> 登录(提交) -> 游戏(登出) -> 首页
```

## 技术实现要点

| 模块 | 实现方式 |
|------|---------|
| 方块移动动画 | CSS `transform` + `transition`，通过 `requestAnimationFrame` 在两帧之间切换位置类名 |
| 合并动画 | CSS `@keyframes pop`，仅对 `mergedFrom` 不为 null 的方块生效 |
| 新方块动画 | CSS `@keyframes appear`，通过 `tile-new` 类名触发 |
| 游戏状态持久化 | localStorage 存储 JSON 序列化的网格状态，页面刷新后自动恢复 |
| 触摸滑动检测 | `touchstart` / `touchend` 坐标差值，阈值 > 10px |
| 响应式布局 | CSS `@media (max-width: 520px)` 切换网格尺寸（500px -> 300px） |

## 浏览器兼容性

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+
- 移动端浏览器（iOS Safari / Android Chrome）

## License

MIT
