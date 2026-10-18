/*
 * FONTE: Listas M3U (TV ao vivo)
 * Lê uma ou mais listas .m3u (arquivo local da pasta listas/ ou URL)
 * e mostra uma fileira por "group-title". As listas ficam em
 * js/config.js > providers.m3u.lists; para adicionar a sua, crie um .m3u
 * em listas/ e cadastre lá (exemplo pronto: listas/minha-lista.m3u).
 */
(function () {
  var ID = 'm3u';
  var cache = null; // [{ list, channels: [...] }]

  function cfg() { return Fontes.config(ID); }
  function lists() { return cfg().lists || []; }

  function attr(line, name) {
    var m = line.match(new RegExp(name + '="([^"]*)"', 'i'));
    return m ? m[1].trim() : '';
  }

  // Converte o texto de um .m3u em canais { title, group, logo, url }.
  function parse(text, listName) {
    var lines = text.split(/\r?\n/), out = [], cur = null;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      if (line.indexOf('#EXTINF') === 0) {
        var comma = line.lastIndexOf(',');
        cur = {
          title: comma !== -1 ? line.slice(comma + 1).trim() : '',
          group: attr(line, 'group-title'),
          logo: attr(line, 'tvg-logo')
        };
      } else if (line.indexOf('#EXTGRP:') === 0) {
        if (cur && !cur.group) cur.group = line.slice(8).trim();
      } else if (line.charAt(0) !== '#') {
        if (/^https?:\/\//i.test(line)) {
          cur = cur || {};
          out.push({
            title: cur.title || 'Canal ' + (out.length + 1),
            group: cur.group || listName,
            logo: cur.logo || '',
            url: line
          });
        }
        cur = null;
      }
    }
    return out;
  }

  function load() {
    if (cache) return Promise.resolve(cache);
    return Promise.all(lists().map(function (l) {
      return Http.request('GET', l.url).then(function (text) {
        return { list: l, channels: parse(text, l.name || l.url) };
      }, function (err) {
        console.warn('Lista M3U "' + (l.name || l.url) + '" não carregou: ' + err.message);
        return null;
      });
    })).then(function (res) {
      var ok = res.filter(function (r) { return r; });
      if (!ok.length) throw new Error('nenhuma lista M3U pôde ser carregada');
      cache = ok;
      return ok;
    });
  }

  function toItem(ch, listName, idx) {
    return {
      id: listName + ':' + idx,
      title: ch.title,
      image: ch.logo,
      backdrop: ch.logo,
      logo: true,
      meta: 'Ao vivo • ' + ch.group,
      overview: 'Lista: ' + listName,
      playable: true,
      playLabel: 'Assistir ao vivo',
      raw: ch
    };
  }

  function allItems(data) {
    var items = [];
    data.forEach(function (d) {
      var name = d.list.name || d.list.url;
      d.channels.forEach(function (ch, i) { items.push(toItem(ch, name, i)); });
    });
    return items;
  }

  Fontes.register({
    id: ID,
    get name() { return cfg().name || 'TV ao vivo'; },
    setupHint: 'Nenhuma lista de canais ligada. Abra as Configurações (engrenagem no topo) para ligar ou adicionar uma.',

    isConfigured: function () { return lists().length > 0; },

    reset: function () { cache = null; },

    getRows: function () {
      return load().then(function (data) {
        var rows = [], byGroup = {};
        allItems(data).forEach(function (item) {
          var g = item.raw.group;
          if (!byGroup[g]) { byGroup[g] = { title: g, items: [], wide: true }; rows.push(byGroup[g]); }
          byGroup[g].items.push(item);
        });
        return rows;
      });
    },

    search: function (q) {
      q = q.toLowerCase();
      return load().then(function (data) {
        return allItems(data).filter(function (item) {
          return item.title.toLowerCase().indexOf(q) !== -1;
        });
      });
    },

    getStream: function (item) {
      return Promise.resolve({ type: 'video', url: item.raw.url });
    }
  });
})();
