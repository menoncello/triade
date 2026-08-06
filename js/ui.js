(function () {
  'use strict';

  var game = window.ThreeGame;
  var SIZE = game.SIZE;
  var BEST_KEY = 'three_best';
  var SWIPE_THRESHOLD = 20;

  var boardEl = document.getElementById('board');
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var overlayEl = document.getElementById('overlay');
  var finalScoreEl = document.getElementById('final-score');
  var finalBestEl = document.getElementById('final-best');
  var playAgainBtn = document.getElementById('play-again');

  var board = null;
  var score = 0;
  var best = loadBest();
  var gameOver = false;
  var tileEls = new Map();

  function loadBest() {
    try {
      var v = parseInt(localStorage.getItem(BEST_KEY), 10);
      return isNaN(v) || v < 0 ? 0 : v;
    } catch (e) {
      return 0;
    }
  }

  function saveBest() {
    try {
      localStorage.setItem(BEST_KEY, String(best));
    } catch (e) {}
  }

  function buildCells() {
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var cell = document.createElement('div');
        cell.className = 'cell';
        positionEl(cell, r, c);
        boardEl.appendChild(cell);
      }
    }
  }

  function positionEl(el, r, c) {
    el.style.left = c * 25 + 1 + '%';
    el.style.top = r * 25 + 1 + '%';
  }

  function tileClass(v) {
    if (v === 1) return 'tile-1';
    if (v === 2) return 'tile-2';
    if (v <= 768) return 'tile-' + v;
    return 'tile-big';
  }

  function createTile(v) {
    var el = document.createElement('div');
    var text = document.createElement('span');
    text.className = 'tile-text';
    el.appendChild(text);
    boardEl.appendChild(el);
    setTileValue(el, v);
    return el;
  }

  function setTileValue(el, v) {
    var text = el.querySelector('.tile-text');
    text.textContent = String(v);
    text.className = 'tile-text';
    var digits = String(v).length;
    if (digits >= 6) text.classList.add('tile-text-xxs');
    else if (digits >= 4) text.classList.add('tile-text-xs');
    else if (digits === 3) text.classList.add('tile-text-sm');
  }

  function renderBoard(trace) {
    var newMap = new Map();
    var slides = [];
    var vanish = [];

    for (var i = 0; i < trace.length; i++) {
      var entry = trace[i];
      var toR = entry.to[0];
      var toC = entry.to[1];

      var el;
      var cls = 'tile ' + tileClass(entry.value);
      var slide = null;

      if (entry.spawned) {
        el = createTile(entry.value);
        cls += ' tile-spawn';
        positionEl(el, toR, toC);
      } else {
        var src = entry.from[0];
        var srcKey = src[0] + ',' + src[1];
        el = tileEls.get(srcKey);
        if (!el) el = createTile(entry.value);

        if (entry.from.length === 2) {
          cls += ' tile-merge';
          // Slide the merge partner into the merged tile's position, then remove it.
          var src2 = entry.from[1];
          var el2 = tileEls.get(src2[0] + ',' + src2[1]);
          if (el2) {
            positionEl(el2, src2[0], src2[1]);
            vanish.push({ el: el2, toR: toR, toC: toC });
          }
        }

        if (src[0] !== toR || src[1] !== toC) {
          positionEl(el, src[0], src[1]);
          slide = { el: el, toR: toR, toC: toC };
        } else {
          positionEl(el, toR, toC);
        }
      }

      el.className = cls;
      setTileValue(el, entry.value);
      if (slide) slides.push(slide);
      newMap.set(toR + ',' + toC, el);
    }

    var animated = new Set();
    for (var s of slides) animated.add(s.el);
    for (var v of vanish) animated.add(v.el);

    for (var pair of tileEls) {
      if (!newMap.has(pair[0]) && !animated.has(pair[1])) pair[1].remove();
    }

    tileEls = newMap;

    if (slides.length || vanish.length) {
      // Force the browser to commit the source positions before transitioning.
      void boardEl.offsetHeight;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          for (var s of slides) positionEl(s.el, s.toR, s.toC);
          for (var v of vanish) positionEl(v.el, v.toR, v.toC);
        });
      });
      if (vanish.length) {
        setTimeout(function () {
          for (var v of vanish) v.el.remove();
        }, 160);
      }
    }
  }

  function updateScore() {
    scoreEl.textContent = String(score);
    if (score > best) {
      best = score;
      saveBest();
    }
    bestEl.textContent = String(best);
  }

  function showGameOver() {
    finalScoreEl.textContent = String(score);
    finalBestEl.textContent = 'Best: ' + best;
    overlayEl.hidden = false;
    window.ThreeDebug.log('over', 'game over', 'FINAL BOARD:\n' + debugBoard(board) + '\nscore ' + score);
  }

  function hideGameOver() {
    overlayEl.hidden = true;
  }

  function doMove(dir) {
    if (gameOver) return;
    var before = board.map(function (row) { return row.slice(); });
    var res = game.move(board, dir);
    if (!res.moved) {
      debug('move', 'swipe ' + dir + ' (noop - board unchanged)', before, null, null, 0);
      return;
    }
    board = res.board;
    score += res.score;
    renderBoard(res.trace);
    updateScore();
    if (game.isGameOver(board)) {
      gameOver = true;
      setTimeout(showGameOver, 250);
    }
    debug('move', 'swipe ' + dir, before, board, res.trace, res.score);
  }

  function debug(kind, title, before, after, trace, gained) {
    var lines = [];
    if (before) {
      lines.push('BEFORE:\n' + debugBoard(before));
      if (after) lines.push('AFTER:\n' + debugBoard(after));
    }
    if (typeof gained === 'number') lines.push('score +' + gained + ' (total ' + score + ')');
    if (trace && trace.length) lines.push('TRACE:\n' + debugTrace(trace));
    var detail = lines.join('\n\n');
    window.ThreeDebug.log(kind, title, detail);
  }

  function debugBoard(b) {
    return b.map(function (row) {
      return row.map(function (v) {
        return v === null ? '.' : String(v);
      }).map(function (s) {
        while (s.length < 4) s = ' ' + s;
        return s;
      }).join(' ');
    }).join('\n');
  }

  function debugTrace(trace) {
    return trace.map(function (t) {
      if (t.spawned) return 'spawn ' + t.value + ' -> ' + t.to.join(',');
      if (t.from.length === 2) {
        return t.value + ' from (' + t.from[0].join(',') + ')+(' + t.from[1].join(',') + ') -> ' + t.to.join(',');
      }
      return t.value + ' from (' + t.from[0].join(',') + ') -> ' + t.to.join(',');
    }).join('\n');
  }

  function startNewGame() {
    board = game.newGame();
    score = 0;
    gameOver = false;
    for (var pair of tileEls) pair[1].remove();
    tileEls = new Map();

    var trace = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (board[r][c] !== null) {
          trace.push({ value: board[r][c], to: [r, c], from: [], spawned: true });
        }
      }
    }
    renderBoard(trace);
    updateScore();
    hideGameOver();
    window.ThreeDebug.log('new', 'new game', 'INITIAL BOARD:\n' + debugBoard(board));
  }

  // Input: pointer swipe (tracks a single pointer; capture so releases
  // outside the board still register)
  var startX = 0;
  var startY = 0;
  var tracking = false;
  var activePointer = null;

  function endSwipe(x, y) {
    tracking = false;
    activePointer = null;
    var dx = x - startX;
    var dy = y - startY;
    var ax = Math.abs(dx);
    var ay = Math.abs(dy);
    if (Math.max(ax, ay) < SWIPE_THRESHOLD) return;
    var dir;
    if (ax > ay) dir = dx > 0 ? 'right' : 'left';
    else dir = dy > 0 ? 'down' : 'up';
    doMove(dir);
  }

  boardEl.addEventListener('pointerdown', function (e) {
    if (tracking) return;
    tracking = true;
    activePointer = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    try {
      boardEl.setPointerCapture(e.pointerId);
    } catch (err) {}
  });

  boardEl.addEventListener('pointerup', function (e) {
    if (!tracking || e.pointerId !== activePointer) return;
    endSwipe(e.clientX, e.clientY);
  });

  boardEl.addEventListener('pointercancel', function (e) {
    if (e.pointerId === activePointer) {
      tracking = false;
      activePointer = null;
    }
  });

  boardEl.addEventListener('lostpointercapture', function (e) {
    if (e.pointerId === activePointer) {
      tracking = false;
      activePointer = null;
    }
  });

  // Safety net: if pointer capture failed and the pointer was released
  // outside the board, no pointerup fires on boardEl — reset here so the
  // board never deadlocks into ignoring all future swipes.
  window.addEventListener('pointerup', function () {
    tracking = false;
    activePointer = null;
  });

  // Input: arrow keys
  document.addEventListener('keydown', function (e) {
    var dir = null;
    if (e.key === 'ArrowLeft') dir = 'left';
    else if (e.key === 'ArrowRight') dir = 'right';
    else if (e.key === 'ArrowUp') dir = 'up';
    else if (e.key === 'ArrowDown') dir = 'down';
    if (!dir) return;
    e.preventDefault();
    doMove(dir);
  });

  playAgainBtn.addEventListener('click', startNewGame);

  buildCells();
  startNewGame();
})();
