class Game2048 {
    constructor(gridSize = 4) {
        this.gridSize = gridSize;
        this.grid = [];
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
        this.over = false;
        this.won = false;
        this.keepPlaying = false;

        this.tileContainer = document.getElementById('tile-container');
        this.scoreDisplay = document.getElementById('score');
        this.bestScoreDisplay = document.getElementById('best-score');
        this.messageContainer = document.getElementById('game-message');

        this.setup();
    }

    setup() {
        for (let i = 0; i < this.gridSize; i++) {
            this.grid[i] = new Array(this.gridSize).fill(null);
        }
        this.bestScoreDisplay.textContent = this.bestScore;
        this.addStartTiles();
        this.render();
        this.listen();
    }

    addStartTiles() {
        this.addRandomTile();
        this.addRandomTile();
    }

    addRandomTile() {
        const emptyCells = [];
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (!this.grid[r][c]) emptyCells.push({ r, c });
            }
        }
        if (emptyCells.length > 0) {
            const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const value = Math.random() < 0.9 ? 2 : 4;
            this.grid[r][c] = {
                value, r, c,
                mergedFrom: null,
                id: Math.random().toString(36).substr(2, 9)
            };
        }
    }

    move(direction) {
        if (this.over) return;
        let moved = false;
        const vector = this.getVector(direction);
        const traversals = this.buildTraversals(vector);
        this.prepareGrid();

        traversals.x.forEach(x => {
            traversals.y.forEach(y => {
                const tile = this.grid[y][x];
                if (tile) {
                    const positions = this.findFarthestPosition({ r: y, c: x }, vector);
                    const next = this.grid[positions.next.r]?.[positions.next.c];

                    if (next && next.value === tile.value && !next.mergedFrom) {
                        const merged = {
                            value: tile.value * 2,
                            r: positions.next.r,
                            c: positions.next.c,
                            mergedFrom: [tile, next],
                            id: Math.random().toString(36).substr(2, 9)
                        };
                        this.grid[merged.r][merged.c] = merged;
                        this.grid[y][x] = null;
                        this.score += merged.value;
                        if (merged.value === 2048) this.won = true;
                        moved = true;
                    } else if (positions.farthest.r !== y || positions.farthest.c !== x) {
                        this.grid[positions.farthest.r][positions.farthest.c] = {
                            ...tile, r: positions.farthest.r, c: positions.farthest.c
                        };
                        this.grid[y][x] = null;
                        moved = true;
                    }
                }
            });
        });

        if (moved) {
            this.addRandomTile();
            if (!this.movesAvailable()) this.over = true;
            this.render();
        }
    }

    getVector(direction) {
        const map = { 0: { r: -1, c: 0 }, 1: { r: 0, c: 1 }, 2: { r: 1, c: 0 }, 3: { r: 0, c: -1 } };
        return map[direction];
    }

    buildTraversals(vector) {
        const traversals = { x: [], y: [] };
        for (let pos = 0; pos < this.gridSize; pos++) {
            traversals.x.push(pos);
            traversals.y.push(pos);
        }
        if (vector.c === 1) traversals.x.reverse();
        if (vector.r === 1) traversals.y.reverse();
        return traversals;
    }

    findFarthestPosition(cell, vector) {
        let previous;
        let current = cell;
        do {
            previous = current;
            current = { r: previous.r + vector.r, c: previous.c + vector.c };
        } while (
            current.r >= 0 && current.r < this.gridSize &&
            current.c >= 0 && current.c < this.gridSize &&
            !this.grid[current.r][current.c]
        );
        return { farthest: previous, next: current };
    }

    movesAvailable() {
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (!this.grid[r][c]) return true;
                for (let dir = 0; dir < 4; dir++) {
                    const vector = this.getVector(dir);
                    const neighbor = this.grid[r + vector.r]?.[c + vector.c];
                    if (neighbor && neighbor.value === this.grid[r][c].value) return true;
                }
            }
        }
        return false;
    }

    prepareGrid() {
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c]) this.grid[r][c].mergedFrom = null;
            }
        }
    }

    render() {
        this.tileContainer.innerHTML = '';
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const tile = this.grid[r][c];
                if (tile) this.drawTile(tile);
            }
        }
        this.scoreDisplay.textContent = this.score;
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('bestScore', this.bestScore);
            this.bestScoreDisplay.textContent = this.bestScore;
        }
        if (this.over) this.showMessage('Game Over!');
        else if (this.won && !this.keepPlaying) this.showMessage('Você Venceu!');
        else this.messageContainer.classList.add('hidden');
    }

    drawTile(tile) {
        const element = document.createElement('div');
        element.className = `tile position-${tile.c}-${tile.r} tile-${tile.value <= 2048 ? tile.value : 'super'}`;
        element.textContent = tile.value;
        if (tile.mergedFrom) element.classList.add('merged');
        else element.classList.add('new');
        this.tileContainer.appendChild(element);
    }

    showMessage(text) {
        const p = this.messageContainer.querySelector('p');
        p.textContent = text;
        this.messageContainer.classList.remove('hidden');
        this.messageContainer.querySelector('.keep-playing-button').style.display = (this.won && !this.over) ? 'block' : 'none';
    }

    restart() { this.score = 0; this.over = false; this.won = false; this.keepPlaying = false; this.setup(); }

    listen() {
        document.addEventListener('keydown', (e) => {
            const map = { 'ArrowUp': 0, 'w': 0, 'ArrowRight': 1, 'd': 1, 'ArrowDown': 2, 's': 2, 'ArrowLeft': 3, 'a': 3 };
            if (map[e.key] !== undefined) { e.preventDefault(); this.move(map[e.key]); }
        });
        document.getElementById('restart-btn').onclick = () => this.restart();
        this.messageContainer.querySelector('.retry-button').onclick = () => this.restart();
        this.messageContainer.querySelector('.keep-playing-button').onclick = () => { this.keepPlaying = true; this.render(); };

        let touchStartClientX, touchStartClientY;
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) return;
            touchStartClientX = e.touches[0].clientX;
            touchStartClientY = e.touches[0].clientY;
        });
        document.addEventListener('touchend', (e) => {
            if (e.touches.length > 0) return;
            const dx = e.changedTouches[0].clientX - touchStartClientX;
            const dy = e.changedTouches[0].clientY - touchStartClientY;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);
            if (Math.max(absDx, absDy) > 10) this.move(absDx > absDy ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
        });
    }
}

window.addEventListener('DOMContentLoaded', () => { new Game2048(); });
