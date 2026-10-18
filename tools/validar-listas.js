#!/usr/bin/env node
/*
 * Valida listas .m3u: testa se cada canal responde e se o stream é válido.
 *
 *   npm run validar-listas                     -> testa todas as listas de listas/
 *   node tools/validar-listas.js arquivo.m3u   -> testa só os arquivos indicados
 *   ... --salvar                               -> grava <nome>.online.m3u só com os canais no ar
 *
 * Roda no PC (Node 18+), não vai para a TV. Sem dependências.
 */
var fs = require('fs');
var path = require('path');

var TIMEOUT_MS = 8000;
var PARALELO = 8;
var UA = 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0 Safari/537.36';

var args = process.argv.slice(2);
var salvar = args.indexOf('--salvar') !== -1;
var arquivos = args.filter(function (a) { return a.indexOf('--') !== 0; });
if (!arquivos.length) {
  var dir = path.join(__dirname, '..', 'listas');
  arquivos = fs.readdirSync(dir)
    .filter(function (f) { return /\.m3u8?$/i.test(f) && !/\.online\.m3u8?$/i.test(f); })
    .map(function (f) { return path.join(dir, f); });
}

// Nome do canal = texto depois da vírgula que vem após os atributos (key="valor").
// Assim vírgulas no nome ou em tvg-description="..." não quebram o título.
function titleOf(line) {
  var rest = line.replace(/^#EXTINF:\s*-?[\d.]+/i, '').replace(/\s*[\w-]+="[^"]*"/g, '');
  var c = rest.indexOf(',');
  return c !== -1 ? rest.slice(c + 1).trim() : '';
}

// Separa a lista em blocos: linhas de cabeçalho (#EXTINF, #EXTVLCOPT...) + URL.
function blocos(texto) {
  var linhas = texto.split(/\r?\n/), out = [], atual = [];
  linhas.forEach(function (l) {
    var t = l.trim();
    if (!t || /^#EXTM3U/i.test(t)) return;
    if (t.charAt(0) === '#') {
      if (/^#EXT/i.test(t)) atual.push(l);
      return;
    }
    var info = atual.filter(function (x) { return /^#EXTINF/i.test(x.trim()); })[0] || '';
    out.push({ linhas: atual.concat([l]), url: t, nome: (info && titleOf(info.trim())) || t });
    atual = [];
  });
  return out;
}

function testar(url) {
  var ctrl = new AbortController();
  var timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
  return fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: ctrl.signal })
    .then(function (res) {
      if (!res.ok) { res.body && res.body.cancel(); return 'HTTP ' + res.status; }
      var tipo = res.headers.get('content-type') || '';
      if (/\.m3u8(\?|$)/i.test(url) || /mpegurl/i.test(tipo)) {
        return res.text().then(function (t) {
          if (!/#EXTM3U/.test(t)) return 'não é uma playlist HLS';
          // Lista "master": confere também uma das qualidades (muitos canais bloqueiam por região só nessa etapa).
          if (/#EXT-X-STREAM-INF/.test(t)) {
            var variante = t.split(/\r?\n/).filter(function (l) { return l && l.charAt(0) !== '#'; })[0];
            if (variante) {
              return testar(new URL(variante.trim(), res.url).href).then(function (e) { return e ? 'qualidades indisponíveis (' + e + '), talvez bloqueio por região' : null; });
            }
          }
          return null;
        });
      }
      res.body && res.body.cancel();
      return /video|audio|octet-stream|mp2t/i.test(tipo) || !tipo ? null : 'tipo inesperado: ' + tipo;
    })
    .catch(function (e) { return e.name === 'AbortError' ? 'tempo esgotado' : (e.cause && e.cause.code) || e.message; })
    .then(function (erro) { clearTimeout(timer); return erro; });
}

function emLotes(itens, fn) {
  var i = 0, res = new Array(itens.length);
  function worker() {
    if (i >= itens.length) return Promise.resolve();
    var n = i++;
    return fn(itens[n]).then(function (r) { res[n] = r; return worker(); });
  }
  var ws = [];
  for (var k = 0; k < Math.min(PARALELO, itens.length); k++) ws.push(worker());
  return Promise.all(ws).then(function () { return res; });
}

(async function () {
  var falhou = 0;
  for (var a = 0; a < arquivos.length; a++) {
    var arq = arquivos[a];
    var lista = blocos(fs.readFileSync(arq, 'utf8'));
    console.log('\n== ' + path.basename(arq) + ' (' + lista.length + ' canais)');
    var erros = await emLotes(lista, function (b) { return testar(b.url); });
    var online = [];
    lista.forEach(function (b, i) {
      if (erros[i]) { falhou++; console.log('  [FORA]  ' + b.nome + '  (' + erros[i] + ')'); }
      else { online.push(b); console.log('  [OK]    ' + b.nome); }
    });
    console.log('  -> ' + online.length + '/' + lista.length + ' no ar');
    if (salvar) {
      var destino = arq.replace(/\.m3u8?$/i, '.online.m3u');
      var corpo = ['#EXTM3U'].concat(online.map(function (b) { return b.linhas.join('\n'); })).join('\n') + '\n';
      fs.writeFileSync(destino, corpo);
      console.log('  -> salvo em ' + destino);
    }
  }
  process.exitCode = falhou ? 1 : 0;
})();
