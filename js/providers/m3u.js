/*
 * FONTE: Listas M3U (TV ao vivo, Filmes, Séries, Esportes...)
 * Lê uma ou mais listas .m3u (arquivo local da pasta listas/ ou URL)
 * e mostra uma fileira por "group-title".
 *
 * Cada ABA do topo é um bloco em config.json > providers com "type": "m3u":
 *   "filmes": { "type": "m3u", "enabled": true, "name": "Filmes", "live": false,
 *               "lists": [ { "name": "Meus filmes", "url": "listas/filmes.m3u" } ] }
 *   live: true  (padrão) = canal ao vivo: logo no cartão, toca direto no clique.
 *   live: false = filme/episódio: pôster no cartão e tela de detalhes antes de tocar.
 * A aba "m3u" (TV ao vivo) já vem pronta; as outras são criadas por M3U.registerFromConfig().
 *
 * Atributos opcionais na linha #EXTINF: tvg-logo (logo/pôster),
 * group-title (fileira), tvg-description (sinopse, só em live:false).
 */
var M3U = (function () {
  function attr(line, name) {
    var m = line.match(new RegExp(name + '="([^"]*)"', 'i'));
    return m ? m[1].trim() : '';
  }

  // Converte o texto de um .m3u em itens { title, group, logo, description, url }.
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
          logo: attr(line, 'tvg-logo'),
          description: attr(line, 'tvg-description')
        };
      } else if (line.indexOf('#EXTGRP:') === 0) {
        if (cur && !cur.group) cur.group = line.slice(8).trim();
      } else if (line.charAt(0) !== '#') {
        if (/^https?:\/\//i.test(line)) {
          cur = cur || {};
          out.push({
            title: cur.title || 'Item ' + (out.length + 1),
            group: cur.group || listName,
            logo: cur.logo || '',
            description: cur.description || '',
            url: line
          });
        }
        cur = null;
      }
    }
    return out;
  }

  function create(id, defaultName) {
    var cache = null; // [{ list, channels: [...] }]

    function cfg() { return Fontes.config(id); }
    function lists() { return cfg().lists || []; }
    function live() { return cfg().live !== false; }

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
        if (!ok.length) throw new Error('nenhuma lista pôde ser carregada');
        cache = ok;
        return ok;
      });
    }

    function toItem(ch, listName, idx) {
      var isLive = live();
      return {
        id: id + ':' + listName + ':' + idx,
        title: ch.title,
        image: ch.logo,
        backdrop: ch.logo,
        logo: isLive,
        meta: isLive ? 'Ao vivo • ' + ch.group : ch.group,
        overview: ch.description || (isLive ? 'Lista: ' + listName : ''),
        playable: true,
        playDirect: isLive,
        playLabel: isLive ? 'Assistir ao vivo' : 'Assistir',
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

    var files = function () { return lists().map(function (l) { return l.url; }).join(', '); };

    return {
      id: id,
      get name() { return cfg().name || defaultName || id; },
      get setupHint() { return 'Nenhuma lista ligada em "' + this.name + '". Cadastre uma em config.json (providers.' + id + '.lists) ou pela engrenagem no topo.'; },
      get emptyHint() { return 'A aba "' + this.name + '" ainda está vazia. Adicione itens em ' + files() + ' (formato explicado em listas/minha-lista.m3u).'; },

      isConfigured: function () { return lists().length > 0; },

      reset: function () { cache = null; },

      getRows: function () {
        return load().then(function (data) {
          var rows = [], byGroup = {};
          allItems(data).forEach(function (item) {
            var g = item.raw.group;
            if (!byGroup[g]) { byGroup[g] = { title: g, items: [], wide: live() }; rows.push(byGroup[g]); }
            byGroup[g].items.push(item);
          });
          return rows;
        });
      },

      search: function (q) {
        q = q.toLowerCase();
        return load().then(function (data) {
          return allItems(data).filter(function (item) {
            return item.title.toLowerCase().indexOf(q) !== -1 || item.raw.group.toLowerCase().indexOf(q) !== -1;
          });
        });
      },

      getStream: function (item) {
        return Promise.resolve({ type: 'video', url: item.raw.url });
      }
    };
  }

  // Cria as abas extras declaradas em config.json (type: "m3u"). Chamado pelo app ao iniciar.
  function registerFromConfig() {
    var provs = CONFIG.providers || {};
    var known = {};
    Fontes.registered().forEach(function (p) { known[p.id] = true; });
    for (var id in provs) {
      if (provs.hasOwnProperty(id) && provs[id] && provs[id].type === 'm3u' && !known[id]) {
        Fontes.register(create(id, id));
      }
    }
  }

  // A aba padrão "TV ao vivo".
  Fontes.register(create('m3u', 'TV ao vivo'));

  return { create: create, parse: parse, registerFromConfig: registerFromConfig };
})();
