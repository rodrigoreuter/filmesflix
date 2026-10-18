/*
 * ============================================================
 *  REGISTRO DE FONTES (providers)
 * ============================================================
 *  Toda fonte de conteúdo é um objeto que segue este contrato:
 *
 *  {
 *    id:   'minhafonte',          // mesmo nome usado em CONFIG.providers
 *    name: 'Minha Fonte',         // texto da aba no topo do app
 *
 *    isConfigured: function () -> boolean
 *        // retorne false se faltar chave/URL (o app mostra setupHint)
 *    setupHint: 'texto de ajuda',  // opcional
 *
 *    getRows: function () -> Promise<Row[]>
 *        // Row  = { title: 'Populares', items: Item[] }
 *
 *    search: function (texto) -> Promise<Item[]>        (opcional)
 *    getChildren: function (item) -> Promise<Item[]>    (opcional: episódios, pastas...)
 *
 *    getStream: function (item) -> Promise<Stream>
 *        // Stream = { type: 'video', url: 'https://...mp4 | .m3u8',
 *        //            subtitles: [{ label, lang, url(.vtt) }] }   // opcional
 *        //       ou { type: 'youtube', videoId: 'abc123' }
 *  }
 *
 *  Item = {
 *    id, title, image (pôster), backdrop (imagem larga),
 *    overview (sinopse), meta (ex.: "2024 • 2h 10min"),
 *    playable: true/false,     // mostra o botão Assistir
 *    playLabel: 'Assistir',    // texto do botão (ex.: 'Trailer')
 *    hasChildren: true/false,  // abre lista de episódios via getChildren
 *    childrenLabel: 'Episódios',
 *    raw: {...}                // dados originais, para a própria fonte usar
 *  }
 *
 *  Para registrar: Fontes.register({ ...objeto acima... });
 * ============================================================
 */
var Fontes = (function () {
  var list = [];

  function config(id) {
    return (CONFIG.providers && CONFIG.providers[id]) || {};
  }

  function register(provider) {
    if (!provider || !provider.id || !provider.getRows || !provider.getStream) {
      throw new Error('Fonte inválida: precisa de id, getRows e getStream');
    }
    list.push(provider);
  }

  function all() {
    return list.filter(function (p) { return config(p.id).enabled; });
  }

  function get(id) {
    var enabled = all();
    for (var i = 0; i < enabled.length; i++) {
      if (enabled[i].id === id) return enabled[i];
    }
    return enabled[0] || null;
  }

  function registered() { return list.slice(); }

  return { register: register, all: all, get: get, config: config, registered: registered };
})();
