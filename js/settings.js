/*
 * Tela de Configurações (ícone de engrenagem no topo).
 * Liga/desliga fontes, escolhe a aba inicial e gerencia listas de canais.
 * As escolhas ficam salvas NESTE aparelho (localStorage) e valem por cima
 * de js/config.js e config.json.
 */
var Settings = (function () {
  var KEY = 'filmesflix.prefs';
  var prefs = load();
  var baseLists = null; // listas vindas de config.js/config.json, antes das preferências
  var base = null;      // valores originais de enabled/defaultProvider (para "Restaurar padrão")
  var onCloseCb = null;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* sem armazenamento: vale só nesta sessão */ }
  }
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // Aplica as preferências salvas sobre o CONFIG (chamado ao iniciar e após cada mudança).
  function apply() {
    var provs = CONFIG.providers || (CONFIG.providers = {});
    if (!base) {
      base = { defaultProvider: CONFIG.defaultProvider, enabled: {} };
      Fontes.registered().forEach(function (p) { base.enabled[p.id] = !!(provs[p.id] && provs[p.id].enabled); });
    }
    for (var b in base.enabled) {
      if (base.enabled.hasOwnProperty(b)) (provs[b] || (provs[b] = {})).enabled = base.enabled[b];
    }
    CONFIG.defaultProvider = base.defaultProvider;
    var on = prefs.enabled || {};
    for (var id in on) {
      if (on.hasOwnProperty(id)) (provs[id] || (provs[id] = {})).enabled = on[id];
    }
    if (prefs.defaultProvider) CONFIG.defaultProvider = prefs.defaultProvider;

    var m3u = provs.m3u || (provs.m3u = {});
    if (!baseLists) baseLists = (m3u.lists || []).slice();
    var hidden = prefs.hiddenLists || [];
    m3u.lists = baseLists.concat(prefs.extraLists || []).filter(function (l) {
      return hidden.indexOf(l.url) === -1;
    });

    Fontes.registered().forEach(function (p) { if (p.reset) p.reset(); });
  }

  function isOn(id) { return !!Fontes.config(id).enabled; }

  /* ---------- Tela ---------- */
  function item(label, value, onClick, extraCls) {
    var b = el('button', 'setting focusable' + (extraCls ? ' ' + extraCls : ''));
    b.appendChild(el('span', 'setting-label', label));
    if (value !== undefined) b.appendChild(el('span', 'setting-value', value));
    b.onclick = onClick;
    return b;
  }

  function section(box, title, hint) {
    box.appendChild(el('h2', 'settings-section', title));
    if (hint) box.appendChild(el('p', 'settings-hint', hint));
  }

  function render(focusKey) {
    var box = $('settings-body');
    box.innerHTML = '';

    section(box, 'Fontes que aparecem', 'Desligue o que não quer ver nas abas do topo.');
    Fontes.registered().forEach(function (p) {
      var b = item(p.name, isOn(p.id) ? 'Ligada' : 'Desligada', function () {
        prefs.enabled = prefs.enabled || {};
        prefs.enabled[p.id] = !isOn(p.id);
        if (!prefs.enabled[p.id] && prefs.defaultProvider === p.id) delete prefs.defaultProvider;
        changed('src-' + p.id);
      }, isOn(p.id) ? 'on' : 'off');
      b._key = 'src-' + p.id;
      box.appendChild(b);
    });

    var enabled = Fontes.all();
    if (enabled.length) {
      var cur = Fontes.get(CONFIG.defaultProvider);
      var start = item('Abrir ao iniciar', cur ? cur.name : '-', function () {
        var i = enabled.indexOf(Fontes.get(CONFIG.defaultProvider));
        prefs.defaultProvider = enabled[(i + 1) % enabled.length].id;
        changed('start');
      });
      start._key = 'start';
      box.appendChild(start);
    }

    section(box, 'Listas de canais (TV ao vivo)', 'Desligue listas que não quer ver ou adicione uma pelo endereço (https://...m3u).');
    var hidden = prefs.hiddenLists || [];
    var extras = prefs.extraLists || [];
    baseLists.concat(extras).forEach(function (l) {
      var shown = hidden.indexOf(l.url) === -1;
      var line = el('div', 'setting-line');
      var b = item(l.name || l.url, shown ? 'Ligada' : 'Desligada', function () {
        var h = prefs.hiddenLists = prefs.hiddenLists || [];
        var i = h.indexOf(l.url);
        if (i === -1) h.push(l.url); else h.splice(i, 1);
        changed('list-' + l.url);
      }, shown ? 'on' : 'off');
      b._key = 'list-' + l.url;
      line.appendChild(b);
      if (extras.indexOf(l) !== -1) {
        var rm = el('button', 'setting small focusable', 'Remover');
        rm.onclick = function () {
          prefs.extraLists.splice(prefs.extraLists.indexOf(l), 1);
          changed('add-url');
        };
        line.appendChild(rm);
      }
      box.appendChild(line);
    });

    var addLine = el('div', 'setting-line');
    var input = el('input', 'setting-input focusable');
    input.type = 'text';
    input.placeholder = 'Endereço da lista: https://...m3u';
    input._key = 'add-url';
    var add = el('button', 'setting small focusable', 'Adicionar');
    function doAdd() {
      var url = input.value.replace(/^\s+|\s+$/g, '');
      if (!/^https?:\/\/.+/i.test(url)) { input.value = ''; input.placeholder = 'Digite um endereço começando com https://'; return; }
      var name = decodeURIComponent(url.split('?')[0].split('/').pop() || 'Lista').replace(/\.m3u8?$/i, '');
      prefs.extraLists = (prefs.extraLists || []).concat([{ name: name, url: url }]);
      changed('add-url');
    }
    add.onclick = doAdd;
    input.addEventListener('keydown', function (e) { if (e.keyCode === KEYS.ENTER) { doAdd(); e.preventDefault(); } });
    addLine.appendChild(input);
    addLine.appendChild(add);
    box.appendChild(addLine);

    section(box, 'Outros');
    var reset = item('Restaurar padrão', undefined, function () {
      prefs = {};
      changed();
    });
    reset._key = 'reset';
    box.appendChild(reset);
    var close_ = item('Voltar', undefined, close);
    close_._key = 'close';
    box.appendChild(close_);

    var target = null, nodes = box.querySelectorAll('.focusable');
    for (var i = 0; i < nodes.length && focusKey; i++) if (nodes[i]._key === focusKey) target = nodes[i];
    if (target) Nav.focus(target); else Nav.focusFirst(box);
  }

  function changed(focusKey) {
    save();
    apply();
    render(focusKey);
  }

  function open(onClose) {
    onCloseCb = onClose;
    Nav.removeClass($('settings'), 'hidden');
    $('settings-body').scrollTop = 0;
    render();
  }

  function close() {
    Nav.addClass($('settings'), 'hidden');
    if (onCloseCb) onCloseCb();
  }

  function isOpen() { return !Nav.hasClass($('settings'), 'hidden'); }

  return { apply: apply, open: open, close: close, isOpen: isOpen };
})();
