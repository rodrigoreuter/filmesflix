/*
 * Navegação espacial: move o foco com as setas do controle remoto
 * para o elemento ".focusable" mais próximo na direção pressionada.
 * Só considera elementos da camada (".layer") visível mais ao topo.
 * Também funciona com o ponteiro do Magic Remote (passar o mouse foca).
 */
var KEYS = {
  LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13,
  BACK: 461, BACKSPACE: 8, ESC: 27,
  PLAY: 415, PAUSE: 19, PLAY_PAUSE: 10252, STOP: 413, REWIND: 412, FAST_FORWARD: 417
};

var Nav = (function () {
  var current = null;
  var onFocusCb = null;

  function activeLayer() {
    var layers = document.querySelectorAll('.layer');
    for (var i = layers.length - 1; i >= 0; i--) {
      if (!hasClass(layers[i], 'hidden')) return layers[i];
    }
    return document.body;
  }

  function hasClass(el, c) { return (' ' + el.className + ' ').indexOf(' ' + c + ' ') !== -1; }
  function addClass(el, c) { if (!hasClass(el, c)) el.className += ' ' + c; }
  function removeClass(el, c) { el.className = (' ' + el.className + ' ').replace(' ' + c + ' ', ' ').replace(/^\s+|\s+$/g, ''); }

  function closest(el, cls) {
    while (el && el.nodeType === 1) {
      if (hasClass(el, cls)) return el;
      el = el.parentNode;
    }
    return null;
  }

  // Rola a fileira (horizontal) e a lista (vertical) para o item aparecer.
  function ensureVisible(el) {
    var pad = 60;
    var track = closest(el, 'row-track');
    if (track) {
      var tr = track.getBoundingClientRect(), er = el.getBoundingClientRect();
      if (er.right > tr.right - pad) track.scrollLeft += er.right - tr.right + pad;
      else if (er.left < tr.left + pad) track.scrollLeft -= tr.left + pad - er.left;
    }
    var scroller = closest(el, 'v-scroll');
    if (scroller) {
      var row = closest(el, 'row') || el;
      var sr = scroller.getBoundingClientRect(), rr = row.getBoundingClientRect();
      if (rr.bottom > sr.bottom) scroller.scrollTop += rr.bottom - sr.bottom + 20;
      else if (rr.top < sr.top) scroller.scrollTop -= sr.top - rr.top + 20;
    }
  }

  function focus(el, fromPointer) {
    if (!el) return;
    if (current && current !== el) removeClass(current, 'focused');
    current = el;
    addClass(el, 'focused');
    if (el.tagName === 'INPUT') {
      el.focus();
    } else if (document.activeElement && document.activeElement.tagName === 'INPUT') {
      document.activeElement.blur();
    }
    if (!fromPointer) ensureVisible(el);
    if (onFocusCb) onFocusCb(el);
  }

  function visible(el) {
    if (el.offsetParent === null) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function candidates() {
    var nodes = activeLayer().querySelectorAll('.focusable');
    var out = [];
    for (var i = 0; i < nodes.length; i++) if (visible(nodes[i])) out.push(nodes[i]);
    return out;
  }

  function move(dir) {
    var list = candidates();
    if (!current || !visible(current) || list.indexOf(current) === -1) {
      focus(list[0]);
      return;
    }
    var r = current.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var best = null, bestScore = Infinity;

    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el === current) continue;
      var c = el.getBoundingClientRect();
      var ex = c.left + c.width / 2, ey = c.top + c.height / 2;
      var score;
      if (dir === 'right' && c.left >= r.right - 4) score = (c.left - r.right) + Math.abs(ey - cy) * 4;
      else if (dir === 'left' && c.right <= r.left + 4) score = (r.left - c.right) + Math.abs(ey - cy) * 4;
      else if (dir === 'down' && c.top >= r.bottom - 4) score = (c.top - r.bottom) * 2 + Math.abs(ex - cx);
      else if (dir === 'up' && c.bottom <= r.top + 4) score = (r.top - c.bottom) * 2 + Math.abs(ex - cx);
      else continue;
      if (score < bestScore) { bestScore = score; best = el; }
    }
    if (best) focus(best);
  }

  function handleKey(e) {
    var k = e.keyCode;
    var inInput = current && current.tagName === 'INPUT';
    // Dentro do campo de busca, as setas laterais movem o cursor; só saem nas pontas do texto.
    var atStart = inInput && current.selectionStart === 0;
    var atEnd = inInput && current.selectionEnd === current.value.length;
    if (k === KEYS.LEFT && (!inInput || atStart)) { move('left'); return true; }
    if (k === KEYS.RIGHT && (!inInput || atEnd)) { move('right'); return true; }
    if (k === KEYS.UP) { move('up'); return true; }
    if (k === KEYS.DOWN) { move('down'); return true; }
    if (k === KEYS.ENTER && current && !inInput) { current.click(); return true; }
    return false;
  }

  function focusFirst(container) {
    var root = container || activeLayer();
    var nodes = root.querySelectorAll('.focusable');
    for (var i = 0; i < nodes.length; i++) {
      if (visible(nodes[i])) { focus(nodes[i]); return; }
    }
  }

  document.addEventListener('mouseover', function (e) {
    var el = closest(e.target, 'focusable');
    if (el && el !== current && activeLayer().contains(el)) focus(el, true);
  });

  return {
    focus: focus,
    focusFirst: focusFirst,
    move: move,
    handleKey: handleKey,
    current: function () { return current; },
    onFocus: function (cb) { onFocusCb = cb; },
    hasClass: hasClass, addClass: addClass, removeClass: removeClass
  };
})();
