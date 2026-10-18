/*
 * App principal: monta abas de fontes, fileiras, detalhes e busca.
 * Não sabe nada sobre APIs específicas — conversa só com o contrato
 * descrito em js/providers/registry.js.
 */
(function () {
  var state = { provider: null, detailsItem: null, searching: false, lastBack: 0 };

  function $(id) { return document.getElementById(id); }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // Ajusta o tamanho base para a resolução real (1280x720, 1920x1080...)
  function scaleUI() {
    document.documentElement.style.fontSize = (window.innerWidth / 1920 * 16) + 'px';
  }

  var toastTimer = null;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    Nav.removeClass(t, 'hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { Nav.addClass(t, 'hidden'); }, 4000);
  }

  function showMessage(msg) {
    $('rows').innerHTML = '';
    $('message').textContent = msg;
    Nav.removeClass($('message'), 'hidden');
  }

  // O fundo do destaque é uma imagem grande: só troca quando o foco "para"
  // por um instante, senão a TV engasga ao segurar a seta.
  var heroTimer = null, heroImg = null;
  function setHero(item) {
    if (!item) return;
    clearTimeout(heroTimer);
    heroTimer = setTimeout(function () {
      $('hero-title').textContent = item.title || '';
      $('hero-meta').textContent = item.meta || '';
      $('hero-overview').textContent = item.overview || '';
      var img = item.logo ? '' : (item.backdrop || item.image || '');
      if (img === heroImg) return;
      heroImg = img;
      $('hero-bg').style.backgroundImage = img ? 'url("' + img + '")' : 'none';
    }, 180);
  }

  /* ---------- Abas de fontes ---------- */
  function renderTabs() {
    var tabs = $('tabs');
    tabs.innerHTML = '';
    Fontes.all().forEach(function (p) {
      var b = el('button', 'tab focusable', p.name);
      if (state.provider && state.provider.id === p.id) b.className += ' active';
      b.onclick = function () { selectProvider(p.id); };
      tabs.appendChild(b);
    });
  }

  function selectProvider(id) {
    var p = Fontes.get(id);
    if (!p) { state.provider = null; renderTabs(); showMessage('Nenhuma fonte ligada. Abra as Configurações (engrenagem no topo).'); Nav.focus($('settings-btn')); return; }
    state.provider = p;
    state.searching = false;
    $('search-input').value = '';
    renderTabs();
    Nav.addClass($('message'), 'hidden');

    if (!p.isConfigured()) {
      showMessage(p.setupHint || 'Esta fonte precisa ser configurada em js/config.js.');
      setHero({ title: p.name, overview: '', meta: 'Fonte não configurada' });
      Nav.focusFirst($('tabs'));
      return;
    }

    $('rows').innerHTML = '<div class="loading">Carregando ' + p.name + '...</div>';
    p.getRows().then(function (rows) {
      if (state.provider !== p) return;
      renderRows(rows);
    }, function (err) {
      showMessage('Erro ao carregar "' + p.name + '": ' + err.message);
      Nav.focusFirst($('tabs'));
    });
  }

  /* ---------- Fileiras e cartões ---------- */
  function makeCard(item, wide) {
    var c = el('div', 'card focusable' + (wide ? ' wide' : '') + (item.logo ? ' logo' : ''));
    var src = wide ? (item.backdrop || item.image) : (item.image || item.backdrop);
    if (src) {
      var img = el('img');
      img.src = src;
      img.onerror = function () { img.parentNode && img.parentNode.replaceChild(el('div', 'placeholder', item.title), img); };
      c.appendChild(img);
    } else {
      c.appendChild(el('div', 'placeholder', item.title));
    }
    c.appendChild(el('div', 'card-label', item.title));
    c._item = item;
    // playDirect: abre o vídeo no clique (canais ao vivo), sem passar pela tela de detalhes.
    c.onclick = function () { item.playDirect ? play_(item) : openDetails(item); };
    return c;
  }

  function renderRows(rows) {
    var box = $('rows');
    box.innerHTML = '';
    box.scrollTop = 0;
    var count = 0;
    rows.forEach(function (row) {
      if (!row.items || !row.items.length) return;
      var section = el('section', 'row');
      section.appendChild(el('h2', 'row-title', row.title));
      var track = el('div', 'row-track');
      row.items.forEach(function (item) { track.appendChild(makeCard(item, row.wide)); });
      section.appendChild(track);
      box.appendChild(section);
      count++;
    });
    if (!count) { showMessage('Nada encontrado.'); Nav.focusFirst($('tabs')); return; }
    Nav.focusFirst(box);
  }

  /* ---------- Busca ---------- */
  function doSearch(q) {
    var p = state.provider;
    q = (q || '').replace(/^\s+|\s+$/g, '');
    if (!q || !p) return;
    if (!p.search) { toast('A fonte "' + p.name + '" não tem busca.'); return; }
    state.searching = true;
    Nav.addClass($('message'), 'hidden');
    $('rows').innerHTML = '<div class="loading">Buscando "' + q + '"...</div>';
    p.search(q).then(function (items) {
      renderRows([{ title: 'Resultados para "' + q + '"', items: items }]);
    }, function (err) { showMessage('Erro na busca: ' + err.message); });
  }

  /* ---------- Detalhes ---------- */
  function openDetails(item) {
    state.detailsItem = item;
    var img = item.logo ? '' : (item.backdrop || item.image);
    $('details-bg').style.backgroundImage = img ? 'url("' + img + '")' : 'none';
    $('details-title').textContent = item.title || '';
    $('details-meta').textContent = item.meta || '';
    $('details-overview').textContent = item.overview || '';

    var actions = $('details-actions');
    actions.innerHTML = '';
    if (item.playable !== false) {
      var play = el('button', 'btn primary focusable', '▶  ' + (item.playLabel || 'Assistir'));
      play.onclick = function () { play_(item); };
      actions.appendChild(play);
    }
    var back = el('button', 'btn focusable', 'Voltar');
    back.onclick = closeDetails;
    actions.appendChild(back);

    var childBox = $('details-children'), track = $('details-children-track');
    track.innerHTML = '';
    Nav.addClass(childBox, 'hidden');
    Nav.removeClass($('details'), 'hidden');
    Nav.focusFirst($('details'));

    if (item.hasChildren && state.provider.getChildren) {
      $('details-children-title').textContent = 'Carregando ' + (item.childrenLabel || 'itens').toLowerCase() + '...';
      Nav.removeClass(childBox, 'hidden');
      state.provider.getChildren(item).then(function (children) {
        if (state.detailsItem !== item) return;
        $('details-children-title').textContent = item.childrenLabel || 'Itens';
        children.forEach(function (ch) {
          var card = makeCard(ch, true);
          card.onclick = function () { ch.hasChildren ? openDetails(ch) : play_(ch); };
          track.appendChild(card);
        });
        if (item.playable === false) Nav.focusFirst(track);
      }, function (err) {
        $('details-children-title').textContent = 'Erro: ' + err.message;
      });
    }
  }

  function closeDetails() {
    state.detailsItem = null;
    Nav.addClass($('details'), 'hidden');
    Nav.focusFirst($('rows'));
  }

  /* ---------- Reprodução ---------- */
  function play_(item) {
    var p = state.provider;
    var returnFocus = Nav.current();
    toast('Abrindo ' + item.title + '...');
    p.getStream(item).then(function (stream) {
      Nav.addClass($('toast'), 'hidden');
      Player.start(stream, item.title, function (err) {
        if (err) toast(err.message);
        if (returnFocus) Nav.focus(returnFocus);
      });
    }, function (err) { toast(err.message); });
  }

  /* ---------- Tecla Voltar ---------- */
  function back() {
    if (Settings.isOpen()) { Settings.close(); return; }
    if (!Nav.hasClass($('details'), 'hidden')) { closeDetails(); return; }
    if (state.searching) { selectProvider(state.provider.id); return; }
    var now = Date.now();
    if (now - state.lastBack < 2000) { window.close(); return; }
    state.lastBack = now;
    toast('Pressione Voltar novamente para sair');
  }

  /* ---------- Inicialização ---------- */
  function init() {
    scaleUI();
    window.addEventListener('resize', scaleUI);
    Player.init();

    Nav.onFocus(function (node) {
      if (node._item && Nav.hasClass($('details'), 'hidden')) setHero(node._item);
    });

    $('settings-btn').onclick = function () {
      Settings.open(function () {
        var cur = state.provider && Fontes.get(state.provider.id);
        selectProvider(cur && cur.id === state.provider.id ? cur.id : CONFIG.defaultProvider);
      });
    };

    $('search-input').addEventListener('keydown', function (e) {
      if (e.keyCode === KEYS.ENTER) { doSearch(this.value); e.preventDefault(); }
    });

    document.addEventListener('keydown', function (e) {
      var handled;
      if (Player.isOpen()) {
        handled = Player.handleKey(e);
      } else if (e.keyCode === KEYS.BACK || e.keyCode === KEYS.ESC ||
                 (e.keyCode === KEYS.BACKSPACE && document.activeElement.tagName !== 'INPUT')) {
        back();
        handled = true;
      } else {
        handled = Nav.handleKey(e);
      }
      if (handled) e.preventDefault();
    });

    selectProvider(CONFIG.defaultProvider);
  }

  /* ---------- Atualização pela internet ---------- */
  // Na TV (file://), se o app hospedado responder, abre ele no lugar da cópia local.
  function goHosted() {
    var url = CONFIG.hostedUrl;
    if (location.protocol !== 'file:' || !url) return Promise.resolve();
    return Http.request('GET', url + 'config.json?t=' + Date.now(), { timeout: 5000 }).then(function () {
      location.replace(url);
      return new Promise(function () {}); // para aqui; a página vai trocar
    }, function () { /* sem internet: segue com a cópia instalada */ });
  }

  // Junta config.json (editável no GitHub) por cima do CONFIG de js/config.js.
  function merge(dst, src) {
    for (var k in src) {
      if (!src.hasOwnProperty(k) || k.charAt(0) === '_') continue;
      var v = src[k];
      if (v && typeof v === 'object' && !(v instanceof Array) && dst[k] && typeof dst[k] === 'object') merge(dst[k], v);
      else dst[k] = v;
    }
  }

  function loadRemoteConfig() {
    if (!CONFIG.remoteConfig) return Promise.resolve();
    return Http.getJSON(CONFIG.remoteConfig + '?t=' + Date.now()).then(function (remote) {
      merge(CONFIG, remote);
    }, function (err) { console.warn('config.json não carregou: ' + err.message); });
  }

  function boot() {
    goHosted().then(loadRemoteConfig).then(function () { Settings.apply(); init(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
