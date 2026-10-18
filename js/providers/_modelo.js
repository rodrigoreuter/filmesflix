/*
 * ============================================================
 *  MODELO DE FONTE: copie este arquivo para criar uma fonte nova
 * ============================================================
 *  Este exemplo lê um catálogo em JSON hospedado em qualquer lugar
 *  (GitHub, seu servidor, Jellyfin, etc.) no formato:
 *
 *  {
 *    "rows": [
 *      { "title": "Meus vídeos", "items": [
 *          { "id": "1", "title": "Viagem 2024", "image": "https://.../capa.jpg",
 *            "overview": "Descrição", "url": "https://.../video.mp4" }
 *      ]}
 *    ]
 *  }
 *
 *  Passos (detalhes em FONTES.md):
 *   1. Copie para js/providers/minhafonte.js e troque 'modelo' pelo seu id.
 *   2. Em js/config.js adicione:  minhafonte: { enabled: true, catalogUrl: 'https://...' }
 *   3. Em index.html adicione:    <script src="js/providers/minhafonte.js"></script>
 * ============================================================
 */
(function () {
  var ID = 'modelo';

  function cfg() { return Fontes.config(ID); }

  var cache = null;
  function load() {
    if (cache) return Promise.resolve(cache);
    return Http.getJSON(cfg().catalogUrl).then(function (data) {
      cache = data;
      return data;
    });
  }

  // Converte o formato da SUA API para o formato que o app entende (Item).
  function toItem(raw) {
    return {
      id: raw.id,
      title: raw.title,
      image: raw.image,
      backdrop: raw.backdrop || raw.image,
      overview: raw.overview || '',
      meta: raw.meta || '',
      playable: !!raw.url,
      raw: raw
    };
  }

  Fontes.register({
    id: ID,
    name: 'Meu catálogo',
    setupHint: 'Defina catalogUrl em js/config.js (providers.' + ID + ').',

    isConfigured: function () { return !!cfg().catalogUrl; },

    getRows: function () {
      return load().then(function (data) {
        return (data.rows || []).map(function (row) {
          return { title: row.title, items: (row.items || []).map(toItem) };
        });
      });
    },

    search: function (q) {
      q = q.toLowerCase();
      return load().then(function (data) {
        var out = [];
        (data.rows || []).forEach(function (row) {
          (row.items || []).forEach(function (it) {
            if (it.title.toLowerCase().indexOf(q) !== -1) out.push(toItem(it));
          });
        });
        return out;
      });
    },

    // AQUI você devolve o endereço do vídeo (.mp4 ou .m3u8) para o player.
    getStream: function (item) {
      return Promise.resolve({ type: 'video', url: item.raw.url });
    }
  });
})();
