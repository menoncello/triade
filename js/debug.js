(function () {
  'use strict';

  var entries = [];
  var panel = null;
  var list = null;
  var visible = false;

  function boardToString(board) {
    return board.map(function (row) {
      return row.map(function (v) {
        return v === null ? '.' : String(v);
      }).map(function (s) {
        while (s.length < 4) s = ' ' + s;
        return s;
      }).join(' ');
    }).join('\n');
  }

  function traceSummary(trace) {
    var parts = [];
    for (var i = 0; i < trace.length; i++) {
      var t = trace[i];
      if (t.spawned) {
        parts.push('spawn ' + t.value + ' @' + t.to[0] + ',' + t.to[1]);
      } else if (t.from.length === 2) {
        parts.push(
          t.value + ' = ' +
          t.from[0][0] + ',' + t.from[0][1] + ' + ' +
          t.from[1][0] + ',' + t.from[1][1] +
          ' -> ' + t.to[0] + ',' + t.to[1]
        );
      }
    }
    return parts.length ? parts.join('\n') : '(none)';
  }

  function log(type, title, detail) {
    var time = new Date().toLocaleTimeString();
    var entry = { time: time, type: type, title: title, detail: detail };
    entries.push(entry);

    if (window.console) {
      console.log('[' + time + '] ' + type.toUpperCase() + ': ' + title);
      if (detail) console.log(detail);
    }

    if (panel) {
      var item = document.createElement('div');
      item.className = 'dbg-entry dbg-' + type;

      var head = document.createElement('div');
      head.className = 'dbg-head';
      head.textContent = '[' + time + '] ' + title;
      item.appendChild(head);

      if (detail) {
        var pre = document.createElement('pre');
        pre.className = 'dbg-detail';
        pre.textContent = detail;
        item.appendChild(pre);
      }

      list.appendChild(item);
      list.scrollTop = list.scrollHeight;
    }
  }

  function createPanel() {
    var btn = document.createElement('button');
    btn.id = 'dbg-toggle';
    btn.textContent = 'Debug';
    btn.addEventListener('click', toggle);
    document.body.appendChild(btn);

    panel = document.createElement('div');
    panel.id = 'dbg-panel';
    panel.hidden = true;

    var bar = document.createElement('div');
    bar.className = 'dbg-bar';

    var clear = document.createElement('button');
    clear.className = 'dbg-clear';
    clear.textContent = 'Clear';
    clear.addEventListener('click', function () {
      entries.length = 0;
      list.innerHTML = '';
    });

    var close = document.createElement('button');
    close.className = 'dbg-clear';
    close.textContent = 'Close';
    close.addEventListener('click', toggle);

    bar.appendChild(clear);
    bar.appendChild(close);
    panel.appendChild(bar);

    list = document.createElement('div');
    list.className = 'dbg-list';
    panel.appendChild(list);

    document.body.appendChild(panel);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'd' || e.key === 'D') toggle();
    });
  }

  function toggle() {
    visible = !visible;
    if (!panel) createPanel();
    panel.hidden = !visible;
    if (visible) list.scrollTop = list.scrollHeight;
  }

  window.ThreeDebug = {
    log: log,
    boardToString: boardToString,
    traceSummary: traceSummary,
    toggle: toggle
  };
})();
