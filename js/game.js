(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.ThreeGame = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SIZE = 4;

  function emptyBoard() {
    var b = [];
    for (var r = 0; r < SIZE; r++) {
      var row = [];
      for (var c = 0; c < SIZE; c++) row.push(null);
      b.push(row);
    }
    return b;
  }

  // Merge predicate: (a===1 && b===2) || (b===1 && a===2) || (a>=3 && a===b)
  function canMerge(a, b) {
    return (a === 1 && b === 2) || (b === 1 && a === 2) || (a >= 3 && a === b);
  }

  function mergeValue(a, b) {
    return a <= 2 ? 3 : a * 2;
  }

  function pickIndex(len, rng) {
    var idx = Math.floor(rng() * len);
    if (idx < 0) idx = 0;
    if (idx >= len) idx = len - 1;
    return idx;
  }

  function weightedValue(rng) {
    rng = rng || Math.random;
    var roll = rng();
    if (roll < 0.4) return 1;
    if (roll < 0.8) return 2;
    return 3;
  }

  // Collects each line (row or column) of the board as full 4-cell arrays
  // ordered front-to-back in the swipe direction: index 0 is the edge the
  // tiles move toward, index 3 is the trailing edge.
  function movementLines(board, dir) {
    var lines = [];
    var r, c;
    if (dir === 'left' || dir === 'right') {
      for (r = 0; r < SIZE; r++) {
        var row = [];
        for (c = 0; c < SIZE; c++) row.push({ v: board[r][c], r: r, c: c });
        if (dir === 'right') row.reverse();
        lines.push(row);
      }
    } else {
      for (c = 0; c < SIZE; c++) {
        var col = [];
        for (r = 0; r < SIZE; r++) col.push({ v: board[r][c], r: r, c: c });
        if (dir === 'down') col.reverse();
        lines.push(col);
      }
    }
    return lines;
  }

  // Each tile moves AT MOST ONE CELL toward index 0 (the wall). Processing is
  // front-to-back so tiles behave simultaneously: a tile advances into an
  // empty cell, merges with a compatible tile in the cell ahead, or stays put
  // when blocked. No compaction, no cascading merges: a tile created by a
  // merge never moves again in the same swipe.
  function shiftLine(line) {
    var out = line.map(function (cell) {
      return cell.v === null
        ? { v: null, from: [] }
        : { v: cell.v, from: [[cell.r, cell.c]] };
    });
    var score = 0;

    for (var i = 0; i < SIZE; i++) {
      var t = line[i];
      if (t.v === null) continue;
      if (i === 0) continue; // at the wall: stays

      var dest = i - 1;
      if (out[dest].v === null) {
        // advance one cell into the vacated space
        out[dest].v = t.v;
        out[dest].from = [[t.r, t.c]];
        out[i].v = null;
        out[i].from = [];
      } else if (canMerge(out[dest].v, t.v)) {
        var merged = mergeValue(out[dest].v, t.v);
        out[dest].v = merged;
        out[dest].from = [out[dest].from[0], [t.r, t.c]];
        score += merged;
        out[i].v = null;
        out[i].from = [];
      }
      // else: blocked by a non-compatible tile, stays
    }

    return { line: out, score: score };
  }

  function boardFromLines(lines, dir) {
    var board = emptyBoard();
    var trace = [];
    for (var i = 0; i < SIZE; i++) {
      for (var k = 0; k < SIZE; k++) {
        var item = lines[i][k];
        if (item.v === null) continue;
        var r, c;
        if (dir === 'left') {
          r = i; c = k;
        } else if (dir === 'right') {
          r = i; c = SIZE - 1 - k;
        } else if (dir === 'up') {
          r = k; c = i;
        } else {
          r = SIZE - 1 - k; c = i;
        }
        board[r][c] = item.v;
        trace.push({
          value: item.v,
          to: [r, c],
          from: item.from,
          spawned: false
        });
      }
    }
    return { board: board, trace: trace };
  }

  function boardsEqual(a, b) {
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (a[r][c] !== b[r][c]) return false;
      }
    }
    return true;
  }

  // Spawns one weighted tile in a uniformly random empty cell. Returns the
  // new board plus the spawned cell so callers can animate it.
  function spawnTile(board, rng) {
    rng = rng || Math.random;
    var empty = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        if (board[r][c] === null) empty.push([r, c]);
      }
    }
    if (empty.length === 0) return { board: board, cell: null, value: null };
    var cell = empty[pickIndex(empty.length, rng)];
    var value = weightedValue(rng);
    board[cell[0]][cell[1]] = value;
    return { board: board, cell: cell, value: value };
  }

  function newGame(rng) {
    rng = rng || Math.random;
    var board = emptyBoard();
    var empty = [];
    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) empty.push([r, c]);
    }
    for (var i = 0; i < 9; i++) {
      var cell = empty.splice(pickIndex(empty.length, rng), 1)[0];
      board[cell[0]][cell[1]] = weightedValue(rng);
    }
    return board;
  }

  function move(board, dir, rng) {
    rng = rng || Math.random;
    var lines = movementLines(board, dir);
    var shifted = [];
    var score = 0;
    for (var i = 0; i < lines.length; i++) {
      var res = shiftLine(lines[i]);
      shifted.push(res.line);
      score += res.score;
    }
    var built = boardFromLines(shifted, dir);
    var newBoard = built.board;
    var trace = built.trace;
    var moved = !boardsEqual(board, newBoard);
    if (moved) {
      var spawn = spawnTile(newBoard, rng);
      if (spawn.cell) {
        trace.push({
          value: spawn.value,
          to: spawn.cell,
          from: [],
          spawned: true
        });
      }
    }
    return { board: newBoard, score: score, moved: moved, trace: trace };
  }

  function isGameOver(board) {
    var r, c;
    for (r = 0; r < SIZE; r++) {
      for (c = 0; c < SIZE; c++) {
        if (board[r][c] === null) return false;
      }
    }
    for (r = 0; r < SIZE; r++) {
      for (c = 0; c < SIZE; c++) {
        var v = board[r][c];
        if (c + 1 < SIZE && canMerge(v, board[r][c + 1])) return false;
        if (r + 1 < SIZE && canMerge(v, board[r + 1][c])) return false;
      }
    }
    return true;
  }

  return {
    SIZE: SIZE,
    canMerge: canMerge,
    mergeValue: mergeValue,
    newGame: newGame,
    move: move,
    spawnTile: spawnTile,
    weightedValue: weightedValue,
    isGameOver: isGameOver
  };
});
