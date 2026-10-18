/*
 * Player de vídeo.
 *  - type 'video':   <video> nativo. A TV LG toca MP4 e HLS (.m3u8) direto.
 *                    No PC, se o navegador não tocar .m3u8, carrega o hls.js.
 *  - type 'youtube': incorpora o player do YouTube (trailers do TMDB).
 */
var Player = (function () {
  var HLS_JS = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js';
  var video, ui, open = false, hls = null, hideTimer = null, onCloseCb = null;

  function $(id) { return document.getElementById(id); }

  function fmt(s) {
    if (!isFinite(s)) return '00:00';
    s = Math.floor(s);
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    var mm = (m < 10 ? '0' : '') + m, ss = (sec < 10 ? '0' : '') + sec;
    return h ? h + ':' + mm + ':' + ss : mm + ':' + ss;
  }

  function showUI() {
    Nav.removeClass(ui, 'faded');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(function () { if (!video.paused) Nav.addClass(ui, 'faded'); }, 4000);
  }

  function spinner(on) { (on ? Nav.removeClass : Nav.addClass)($('player-spinner'), 'hidden'); }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = function () { reject(new Error('Não foi possível carregar ' + src)); };
      document.head.appendChild(s);
    });
  }

  function playVideo(stream) {
    var isHls = /\.m3u8(\?|$)/i.test(stream.url);
    var nativeHls = video.canPlayType('application/vnd.apple.mpegurl') !== '';

    // Legendas .vtt opcionais vindas da fonte
    var subs = stream.subtitles || [];
    for (var i = 0; i < subs.length; i++) {
      var t = document.createElement('track');
      t.kind = 'subtitles'; t.label = subs[i].label; t.srclang = subs[i].lang || 'pt'; t.src = subs[i].url;
      if (i === 0) t['default'] = true;
      video.appendChild(t);
    }

    if (isHls && !nativeHls) {
      return (window.Hls ? Promise.resolve() : loadScript(HLS_JS)).then(function () {
        if (!window.Hls.isSupported()) throw new Error('Este navegador não suporta HLS.');
        hls = new window.Hls();
        hls.on(window.Hls.Events.ERROR, function (ev, data) {
          if (data.fatal) fail(new Error('Erro no stream HLS (' + data.details + ')'));
        });
        hls.loadSource(stream.url);
        hls.attachMedia(video);
        video.play();
      });
    }
    video.src = stream.url;
    video.play();
    return Promise.resolve();
  }

  function playYoutube(stream) {
    Nav.addClass(video, 'hidden');
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube.com/embed/' + stream.videoId + '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
    f.setAttribute('allow', 'autoplay; encrypted-media; fullscreen');
    f.setAttribute('allowfullscreen', '');
    $('yt-holder').appendChild(f);
    Nav.addClass(ui, 'faded');
    spinner(false);
    // Mantém o foco no app para a tecla Voltar continuar funcionando
    setTimeout(function () { window.focus(); }, 500);
    return Promise.resolve();
  }

  function fail(err) {
    if (onCloseCb) onCloseCb(err);
    close(true);
  }

  function start(stream, title, onClose) {
    onCloseCb = onClose || null;
    open = true;
    $('player-title').textContent = title || '';
    Nav.removeClass($('player'), 'hidden');
    Nav.removeClass(video, 'hidden');
    spinner(true);
    showUI();
    var p = stream.type === 'youtube' ? playYoutube(stream) : playVideo(stream);
    p['catch'](fail);
  }

  function close(silent) {
    if (!open) return;
    open = false;
    clearTimeout(hideTimer);
    if (hls) { hls.destroy(); hls = null; }
    video.pause();
    video.removeAttribute('src');
    while (video.firstChild) video.removeChild(video.firstChild);
    video.load();
    $('yt-holder').innerHTML = '';
    spinner(false);
    Nav.addClass($('player'), 'hidden');
    if (!silent && onCloseCb) onCloseCb(null);
  }

  function seek(delta) {
    if (!isFinite(video.duration)) return;
    video.currentTime = Math.max(0, Math.min(video.duration - 1, video.currentTime + delta));
    showUI();
  }

  function toggle() {
    if (video.paused) video.play(); else video.pause();
    showUI();
  }

  function handleKey(e) {
    var k = e.keyCode;
    if (k === KEYS.BACK || k === KEYS.BACKSPACE || k === KEYS.ESC || k === KEYS.STOP) { close(); return true; }
    if (k === KEYS.ENTER || k === KEYS.PLAY_PAUSE) { toggle(); return true; }
    if (k === KEYS.PLAY) { video.play(); showUI(); return true; }
    if (k === KEYS.PAUSE) { video.pause(); showUI(); return true; }
    if (k === KEYS.LEFT || k === KEYS.REWIND) { seek(-10); return true; }
    if (k === KEYS.RIGHT || k === KEYS.FAST_FORWARD) { seek(30); return true; }
    if (k === KEYS.UP || k === KEYS.DOWN) { showUI(); return true; }
    return false;
  }

  function init() {
    video = $('video');
    ui = $('player-ui');
    video.addEventListener('timeupdate', function () {
      var d = video.duration || 0;
      $('player-progress').style.width = (d ? (video.currentTime / d) * 100 : 0) + '%';
      $('player-time').textContent = fmt(video.currentTime) + ' / ' + fmt(d);
    });
    video.addEventListener('waiting', function () { spinner(true); });
    video.addEventListener('playing', function () { spinner(false); showUI(); });
    video.addEventListener('pause', function () { showUI(); });
    video.addEventListener('ended', function () { close(); });
    video.addEventListener('error', function () {
      if (open && !hls && video.getAttribute('src')) fail(new Error('Não foi possível reproduzir este vídeo (formato ou endereço inválido).'));
    });
    $('player').addEventListener('click', toggle);
  }

  return { init: init, start: start, close: close, handleKey: handleKey, isOpen: function () { return open; } };
})();
