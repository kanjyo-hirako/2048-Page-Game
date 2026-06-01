// ==================== Tile ====================
function Tile(position, value) {
    this.x = position.x;
    this.y = position.y;
    this.value = value || 2;
    this.previousPosition = null;
    this.mergedFrom = null;
}

Tile.prototype.savePosition = function () {
    this.previousPosition = { x: this.x, y: this.y };
};

Tile.prototype.updatePosition = function (position) {
    this.x = position.x;
    this.y = position.y;
};

Tile.prototype.serialize = function () {
    return { position: { x: this.x, y: this.y }, value: this.value };
};

// ==================== Grid ====================
function Grid(size, previousState) {
    this.size = size;
    this.cells = previousState ? this.fromState(previousState) : this.empty();
}

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

Grid.prototype.fromState = function (state) {
    var cells = [];
    for (var x = 0; x < this.size; x++) {
        var row = cells[x] = [];
        for (var y = 0; y < this.size; y++) {
            var tile = state[x][y];
            row.push(tile ? new Tile(tile.position, tile.value) : null);
        }
    }
    return cells;
};

Grid.prototype.randomAvailableCell = function () {
    var cells = this.availableCells();
    if (cells.length) {
        return cells[Math.floor(Math.random() * cells.length)];
    }
};

Grid.prototype.availableCells = function () {
    var cells = [];
    this.eachCell(function (x, y, tile) {
        if (!tile) cells.push({ x: x, y: y });
    });
    return cells;
};

Grid.prototype.eachCell = function (callback) {
    for (var x = 0; x < this.size; x++) {
        for (var y = 0; y < this.size; y++) {
            callback(x, y, this.cells[x][y]);
        }
    }
};

Grid.prototype.cellsAvailable = function () {
    return !!this.availableCells().length;
};

Grid.prototype.cellAvailable = function (cell) {
    return !this.cellOccupied(cell);
};

Grid.prototype.cellOccupied = function (cell) {
    return !!this.cellContent(cell);
};

Grid.prototype.cellContent = function (cell) {
    if (this.withinBounds(cell)) {
        return this.cells[cell.x][cell.y];
    }
    return null;
};

Grid.prototype.insertTile = function (tile) {
    this.cells[tile.x][tile.y] = tile;
};

Grid.prototype.removeTile = function (tile) {
    this.cells[tile.x][tile.y] = null;
};

Grid.prototype.withinBounds = function (position) {
    return position.x >= 0 && position.x < this.size &&
           position.y >= 0 && position.y < this.size;
};

Grid.prototype.serialize = function () {
    var cellState = [];
    for (var x = 0; x < this.size; x++) {
        var row = cellState[x] = [];
        for (var y = 0; y < this.size; y++) {
            row.push(this.cells[x][y] ? this.cells[x][y].serialize() : null);
        }
    }
    return { size: this.size, cells: cellState };
};

Grid.prototype.maxTileValue = function () {
    var max = 0;
    this.eachCell(function (x, y, tile) {
        if (tile && tile.value > max) max = tile.value;
    });
    return max;
};

// ==================== HTML Actuator ====================
function HTMLActuator() {
    this.tileContainer = document.getElementById("tile-container");
    this.scoreContainer = document.getElementById("current-score");
    this.bestContainer = document.getElementById("best-score");
    this.messageContainer = document.getElementById("game-message");
    this.messageText = document.getElementById("message-text");
    this.score = 0;
}

HTMLActuator.prototype.actuate = function (grid, metadata) {
    var self = this;
    window.requestAnimationFrame(function () {
        self.clearContainer(self.tileContainer);
        grid.cells.forEach(function (column) {
            column.forEach(function (cell) {
                if (cell) self.addTile(cell);
            });
        });
        self.updateScore(metadata.score);
        self.bestContainer.textContent = grid.maxTileValue();
        if (metadata.terminated) {
            if (metadata.over) {
                self.message(false);
            } else if (metadata.won) {
                self.message(true);
            }
        }
    });
};

HTMLActuator.prototype.continueGame = function () {
    this.clearMessage();
};

HTMLActuator.prototype.clearContainer = function (container) {
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
};

HTMLActuator.prototype.addTile = function (tile) {
    var self = this;
    var wrapper = document.createElement("div");
    var inner = document.createElement("div");
    var position = tile.previousPosition || { x: tile.x, y: tile.y };
    var positionClass = this.positionClass(position);

    var classes = ["tile", "tile-" + tile.value, positionClass];
    if (tile.value > 2048) classes.push("tile-super");

    this.applyClasses(wrapper, classes);
    inner.classList.add("tile-inner");
    inner.textContent = tile.value;

    if (tile.previousPosition) {
        window.requestAnimationFrame(function () {
            classes[2] = self.positionClass({ x: tile.x, y: tile.y });
            self.applyClasses(wrapper, classes);
        });
    } else if (tile.mergedFrom) {
        classes.push("tile-merged");
        this.applyClasses(wrapper, classes);
        tile.mergedFrom.forEach(function (merged) {
            self.addTile(merged);
        });
    } else {
        classes.push("tile-new");
        this.applyClasses(wrapper, classes);
    }

    wrapper.appendChild(inner);
    this.tileContainer.appendChild(wrapper);
};

HTMLActuator.prototype.applyClasses = function (element, classes) {
    element.setAttribute("class", classes.join(" "));
};

HTMLActuator.prototype.normalizePosition = function (position) {
    return { x: position.x + 1, y: position.y + 1 };
};

HTMLActuator.prototype.positionClass = function (position) {
    position = this.normalizePosition(position);
    return "tile-position-" + position.x + "-" + position.y;
};

HTMLActuator.prototype.updateScore = function (score) {
    var difference = score - this.score;
    this.score = score;
    this.scoreContainer.textContent = this.score;

    if (difference > 0) {
        var addition = document.createElement("div");
        addition.classList.add("score-addition");
        addition.textContent = "+" + difference;
        this.scoreContainer.parentElement.style.position = "relative";
        this.scoreContainer.parentElement.appendChild(addition);
    }
};

HTMLActuator.prototype.message = function (won) {
    var type = won ? "game-won" : "game-over";
    var text = won ? "你赢了!" : "Game Over!";
    this.messageContainer.classList.add(type);
    this.messageText.textContent = text;
};

HTMLActuator.prototype.clearMessage = function () {
    this.messageContainer.classList.remove("game-won", "game-over");
};

// ==================== Input Manager ====================
function InputManager() {
    this.events = {};
    this.eventTouchstart = "touchstart";
    this.eventTouchmove = "touchmove";
    this.eventTouchend = "touchend";
    this.listen();
}

InputManager.prototype.on = function (event, callback) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(callback);
};

InputManager.prototype.emit = function (event, data) {
    var callbacks = this.events[event];
    if (callbacks) {
        callbacks.forEach(function (callback) { callback(data); });
    }
};

InputManager.prototype.listen = function () {
    var self = this;

    var map = {
        38: 0, 39: 1, 40: 2, 37: 3,  // Arrow keys
        87: 0, 68: 1, 83: 2, 65: 3   // WASD
    };

    document.addEventListener("keydown", function (event) {
        var modifiers = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
        var mapped = map[event.which];
        if (!modifiers && mapped !== undefined) {
            event.preventDefault();
            self.emit("move", mapped);
        }
        if (!modifiers && event.which === 82) { // R key
            self.emit("restart");
        }
    });

    // Swipe
    var touchStartClientX, touchStartClientY;
    var gameContainer = document.getElementById("game-container");

    gameContainer.addEventListener(this.eventTouchstart, function (event) {
        if (event.touches.length > 1) return;
        touchStartClientX = event.touches[0].clientX;
        touchStartClientY = event.touches[0].clientY;
        event.preventDefault();
    });

    gameContainer.addEventListener(this.eventTouchmove, function (event) {
        event.preventDefault();
    });

    gameContainer.addEventListener(this.eventTouchend, function (event) {
        if (event.touches.length > 0) return;
        var dx = event.changedTouches[0].clientX - touchStartClientX;
        var dy = event.changedTouches[0].clientY - touchStartClientY;
        var absDx = Math.abs(dx);
        var absDy = Math.abs(dy);
        if (Math.max(absDx, absDy) > 10) {
            self.emit("move", absDx > absDy ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
        }
    });
};

// ==================== Game Manager ====================
function GameManager(size, inputManager, actuator) {
    this.size = size;
    this.inputManager = inputManager;
    this.actuator = actuator;
    this.startTiles = 2;

    this.inputManager.on("move", this.move.bind(this));
    this.inputManager.on("restart", this.restart.bind(this));

    this.setup();
}

GameManager.prototype.restart = function () {
    this.actuator.continueGame();
    this.setup();
};

GameManager.prototype.isGameTerminated = function () {
    return this.over || (this.won && !this.keepPlaying);
};

GameManager.prototype.setup = function () {
    var previousState = app.storage.getGameState();
    if (previousState) {
        this.grid = new Grid(previousState.grid.size, previousState.grid.cells);
        this.score = previousState.score;
        this.over = previousState.over;
        this.won = previousState.won;
        this.keepPlaying = previousState.keepPlaying;
    } else {
        this.grid = new Grid(this.size);
        this.score = 0;
        this.over = false;
        this.won = false;
        this.keepPlaying = false;
        this.addStartTiles();
    }
    this.actuate();
};

GameManager.prototype.addStartTiles = function () {
    for (var i = 0; i < this.startTiles; i++) {
        this.addRandomTile();
    }
};

GameManager.prototype.addRandomTile = function () {
    if (this.grid.cellsAvailable()) {
        var value = Math.random() < 0.9 ? 2 : 4;
        var tile = new Tile(this.grid.randomAvailableCell(), value);
        this.grid.insertTile(tile);
    }
};

GameManager.prototype.actuate = function () {
    var best = app.storage.getBestScore();
    if (best < this.score) {
        app.storage.setBestScore(this.score);
    }

    if (this.over) {
        app.storage.clearGameState();
        app.recordGame(this.score);
    } else {
        app.storage.setGameState(this.serialize());
    }

    this.actuator.actuate(this.grid, {
        score: this.score,
        over: this.over,
        won: this.won,
        bestScore: app.storage.getBestScore(),
        terminated: this.isGameTerminated()
    });
};

GameManager.prototype.serialize = function () {
    return {
        grid: this.grid.serialize(),
        score: this.score,
        over: this.over,
        won: this.won,
        keepPlaying: this.keepPlaying
    };
};

GameManager.prototype.prepareTiles = function () {
    this.grid.eachCell(function (x, y, tile) {
        if (tile) {
            tile.mergedFrom = null;
            tile.savePosition();
        }
    });
};

GameManager.prototype.moveTile = function (tile, cell) {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
};

GameManager.prototype.move = function (direction) {
    var self = this;
    if (this.isGameTerminated()) return;

    var cell, tile;
    var vector = this.getVector(direction);
    var traversals = this.buildTraversals(vector);
    var moved = false;

    this.prepareTiles();

    traversals.x.forEach(function (x) {
        traversals.y.forEach(function (y) {
            cell = { x: x, y: y };
            tile = self.grid.cellContent(cell);

            if (tile) {
                var positions = self.findFarthestPosition(cell, vector);
                var next = self.grid.cellContent(positions.next);

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

                if (!self.positionsEqual(cell, tile)) {
                    moved = true;
                }
            }
        });
    });

    if (moved) {
        this.addRandomTile();
        if (!this.movesAvailable()) {
            this.over = true;
        }
        this.actuate();
    }
};

GameManager.prototype.getVector = function (direction) {
    var map = {
        0: { x: 0, y: -1 },
        1: { x: 1, y: 0 },
        2: { x: 0, y: 1 },
        3: { x: -1, y: 0 }
    };
    return map[direction];
};

GameManager.prototype.buildTraversals = function (vector) {
    var traversals = { x: [], y: [] };
    for (var pos = 0; pos < this.size; pos++) {
        traversals.x.push(pos);
        traversals.y.push(pos);
    }
    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();
    return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
    var previous;
    do {
        previous = cell;
        cell = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.grid.withinBounds(cell) && this.grid.cellAvailable(cell));
    return { farthest: previous, next: cell };
};

GameManager.prototype.movesAvailable = function () {
    return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

GameManager.prototype.tileMatchesAvailable = function () {
    var self = this;
    for (var x = 0; x < this.size; x++) {
        for (var y = 0; y < this.size; y++) {
            var tile = this.grid.cellContent({ x: x, y: y });
            if (tile) {
                for (var d = 0; d < 4; d++) {
                    var vector = self.getVector(d);
                    var cell = { x: x + vector.x, y: y + vector.y };
                    var other = self.grid.cellContent(cell);
                    if (other && other.value === tile.value) return true;
                }
            }
        }
    }
    return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
    return first.x === second.x && first.y === second.y;
};

// ==================== Storage Manager ====================
function StorageManager() {
    this.userKey = "2048_currentUser";
    this.usersKey = "2048_users";
    this.gameStateKey = "2048_gameState";
    this.bestScoreKey = "2048_bestScore";
}

StorageManager.prototype.getCurrentUser = function () {
    return localStorage.getItem(this.userKey);
};

StorageManager.prototype.setCurrentUser = function (username) {
    localStorage.setItem(this.userKey, username);
};

StorageManager.prototype.clearCurrentUser = function () {
    localStorage.removeItem(this.userKey);
};

StorageManager.prototype.getUsers = function () {
    var data = localStorage.getItem(this.usersKey);
    return data ? JSON.parse(data) : {};
};

StorageManager.prototype.saveUsers = function (users) {
    localStorage.setItem(this.usersKey, JSON.stringify(users));
};

StorageManager.prototype.getUserKey = function () {
    var user = this.getCurrentUser();
    return user ? this.usersKey + "_" + user : null;
};

StorageManager.prototype.getUserData = function () {
    var key = this.getUserKey();
    if (!key) return null;
    var data = localStorage.getItem(key);
    return data ? JSON.parse(data) : { history: [], bestScore: 0 };
};

StorageManager.prototype.saveUserData = function (data) {
    var key = this.getUserKey();
    if (key) localStorage.setItem(key, JSON.stringify(data));
};

StorageManager.prototype.getBestScore = function () {
    var key = this.getUserKey();
    if (!key) return 0;
    var data = this.getUserData();
    return data ? (data.bestScore || 0) : 0;
};

StorageManager.prototype.setBestScore = function (score) {
    var data = this.getUserData();
    if (data) {
        data.bestScore = score;
        this.saveUserData(data);
    }
};

StorageManager.prototype.getGameState = function () {
    var key = this.getUserKey();
    if (!key) return null;
    var stateJSON = localStorage.getItem(key + "_gameState");
    return stateJSON ? JSON.parse(stateJSON) : null;
};

StorageManager.prototype.setGameState = function (gameState) {
    var key = this.getUserKey();
    if (key) localStorage.setItem(key + "_gameState", JSON.stringify(gameState));
};

StorageManager.prototype.clearGameState = function () {
    var key = this.getUserKey();
    if (key) localStorage.removeItem(key + "_gameState");
};

StorageManager.prototype.addHistory = function (record) {
    var data = this.getUserData();
    if (!data) return;
    if (!data.history) data.history = [];
    data.history.unshift(record);
    if (data.history.length > 50) data.history = data.history.slice(0, 50);
    this.saveUserData(data);
};

StorageManager.prototype.getHistory = function () {
    var data = this.getUserData();
    return data ? (data.history || []) : [];
};

// ==================== App Controller ====================
var app = {
    storage: new StorageManager(),
    gameManager: null,
    inputManager: null,
    actuator: null,
    timerInterval: null,
    gameStartTime: null,
    gameElapsed: 0
};

// Screen switching
app.showScreen = function (screenId) {
    document.querySelectorAll(".screen").forEach(function (s) {
        s.classList.remove("active");
    });
    document.getElementById(screenId).classList.add("active");
};

// Format time as MM:SS
app.formatTime = function (seconds) {
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
};

// Format date
app.formatDate = function (timestamp) {
    var d = new Date(timestamp);
    var year = d.getFullYear();
    var month = (d.getMonth() + 1 < 10 ? "0" : "") + (d.getMonth() + 1);
    var day = (d.getDate() < 10 ? "0" : "") + d.getDate();
    var hour = (d.getHours() < 10 ? "0" : "") + d.getHours();
    var min = (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
    return year + "-" + month + "-" + day + " " + hour + ":" + min;
};

// Format duration
app.formatDuration = function (seconds) {
    if (seconds < 60) return seconds + "秒";
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    if (m < 60) return m + "分" + (s > 0 ? s + "秒" : "");
    var h = Math.floor(m / 60);
    m = m % 60;
    return h + "时" + m + "分";
};

// Timer
app.startTimer = function () {
    app.gameStartTime = Date.now();
    app.gameElapsed = 0;
    var timerEl = document.getElementById("game-timer");
    timerEl.textContent = "00:00";
    clearInterval(app.timerInterval);
    app.timerInterval = setInterval(function () {
        app.gameElapsed = Math.floor((Date.now() - app.gameStartTime) / 1000);
        timerEl.textContent = app.formatTime(app.gameElapsed);
    }, 1000);
};

app.stopTimer = function () {
    clearInterval(app.timerInterval);
};

// Record game result
app.recordGame = function (score) {
    if (score <= 0) return;
    app.stopTimer();
    var record = {
        score: score,
        duration: app.gameElapsed,
        timestamp: Date.now()
    };
    app.storage.addHistory(record);
};

// Render history panel
app.renderHistory = function () {
    var history = app.storage.getHistory();
    var body = document.getElementById("history-body");

    if (!history.length) {
        body.innerHTML = '<div class="history-empty">暂无记录</div>';
        return;
    }

    var bestScore = 0;
    history.forEach(function (r) {
        if (r.score > bestScore) bestScore = r.score;
    });

    var html = "";
    history.forEach(function (record, index) {
        var badge = record.score === bestScore ? '<span class="history-best-badge">最高</span>' : '';
        html += '<div class="history-item">' +
            '<div class="history-score">' + record.score + badge + '</div>' +
            '<div class="history-meta">' +
                '<div>时长: ' + app.formatDuration(record.duration) + '</div>' +
                '<div>' + app.formatDate(record.timestamp) + '</div>' +
            '</div>' +
        '</div>';
    });
    body.innerHTML = html;
};

// Landing page tile animation
app.initLandingTiles = function () {
    var container = document.getElementById("landing-tiles");
    container.innerHTML = "";
    var positions = [
        { x: 0, y: 0, value: 2 },
        { x: 1, y: 1, value: 4 },
        { x: 2, y: 2, value: 8 },
        { x: 3, y: 3, value: 2 },
        { x: 0, y: 3, value: 4 },
        { x: 3, y: 0, value: 2 }
    ];
    positions.forEach(function (p, i) {
        var tile = document.createElement("div");
        tile.className = "tile tile-" + p.value + " tile-position-" + (p.x + 1) + "-" + (p.y + 1) + " tile-new";
        tile.style.animationDelay = (i * 100) + "ms";
        var inner = document.createElement("div");
        inner.className = "tile-inner";
        inner.textContent = p.value;
        tile.appendChild(inner);
        container.appendChild(tile);
    });
};

// Initialize game
app.initGame = function () {
    app.actuator = new HTMLActuator();
    app.inputManager = new InputManager();
    app.gameManager = new GameManager(4, app.inputManager, app.actuator);

    // Update best score display
    document.getElementById("best-score").textContent = app.storage.getBestScore();
    app.startTimer();
};

// ==================== Event Listeners ====================
document.addEventListener("DOMContentLoaded", function () {
    // Check if user already logged in
    var currentUser = app.storage.getCurrentUser();
    if (currentUser) {
        app.showScreen("screen-game");
        app.initGame();
    } else {
        app.initLandingTiles();
        app.showScreen("screen-landing");
    }

    // Landing -> Login
    document.getElementById("screen-landing").addEventListener("click", function () {
        app.showScreen("screen-login");
        document.getElementById("username").focus();
    });

    // Login form
    document.getElementById("login-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var username = document.getElementById("username").value.trim();
        var password = document.getElementById("password").value;
        var errorEl = document.getElementById("login-error");

        if (!username || !password) {
            errorEl.textContent = "请输入用户名和密码";
            return;
        }
        if (username.length < 2) {
            errorEl.textContent = "用户名至少2个字符";
            return;
        }
        if (password.length < 3) {
            errorEl.textContent = "密码至少3个字符";
            return;
        }

        var users = app.storage.getUsers();
        if (users[username]) {
            // Existing user - check password
            if (users[username] !== password) {
                errorEl.textContent = "密码错误";
                return;
            }
        } else {
            // New user - register
            users[username] = password;
            app.storage.saveUsers(users);
        }

        app.storage.setCurrentUser(username);
        errorEl.textContent = "";
        app.showScreen("screen-game");
        app.initGame();
    });

    // New game button
    document.getElementById("btn-new-game").addEventListener("click", function () {
        app.storage.clearGameState();
        app.stopTimer();
        app.actuator.clearMessage();
        app.gameManager.setup();
        app.startTimer();
    });

    // Keep playing (after winning)
    document.getElementById("btn-keep-playing").addEventListener("click", function () {
        app.gameManager.keepPlaying = true;
        app.actuator.continueGame();
    });

    // Retry button (in game over message)
    document.getElementById("btn-retry").addEventListener("click", function () {
        app.storage.clearGameState();
        app.stopTimer();
        app.actuator.clearMessage();
        app.gameManager.setup();
        app.startTimer();
    });

    // History button
    document.getElementById("btn-history").addEventListener("click", function () {
        app.renderHistory();
        document.getElementById("history-overlay").classList.remove("hidden");
    });

    // Close history
    document.getElementById("btn-close-history").addEventListener("click", function () {
        document.getElementById("history-overlay").classList.add("hidden");
    });
    document.getElementById("history-overlay").addEventListener("click", function (e) {
        if (e.target === this) {
            this.classList.add("hidden");
        }
    });

    // Logout
    document.getElementById("btn-logout").addEventListener("click", function () {
        app.stopTimer();
        app.storage.clearCurrentUser();
        app.initLandingTiles();
        app.showScreen("screen-landing");
    });
});
