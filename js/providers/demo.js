/*
 * FONTE: Demo
 * Filmes abertos da Blender Foundation (licença Creative Commons) e
 * streams públicos de teste HLS. Não precisa de chave: serve para testar
 * o app e como exemplo mais simples de fonte.
 */
(function () {
  var WIKI = 'https://upload.wikimedia.org/wikipedia/commons/';
  var POSTERS = {
    bbb: WIKI + 'c/c5/Big_buck_bunny_poster_big.jpg',
    sintel: WIKI + '8/8f/Sintel_poster.jpg',
    tos: WIKI + '7/70/Tos-poster.png',
    ed: WIKI + '0/0c/ElephantsDreamPoster.jpg'
  };

  var FILMES = [
    {
      id: 'bbb', title: 'Big Buck Bunny', image: POSTERS.bbb, backdrop: POSTERS.bbb,
      meta: '2008 • 10 min • Animação', overview: 'Um coelho gigante e gentil decide dar o troco em três roedores que vivem infernizando a floresta.',
      url: 'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4'
    },
    {
      id: 'sintel', title: 'Sintel', image: POSTERS.sintel, backdrop: POSTERS.sintel,
      meta: '2010 • 15 min • Fantasia', overview: 'Uma jovem atravessa terras perigosas em busca do filhote de dragão que criou.',
      url: 'https://archive.org/download/Sintel/sintel-2048-stereo_512kb.mp4'
    },
    {
      id: 'ed', title: 'Elephants Dream', image: POSTERS.ed, backdrop: POSTERS.ed,
      meta: '2006 • 11 min • Ficção', overview: 'Dois personagens exploram uma máquina surreal e infinita, cada um enxergando-a de um jeito.',
      url: 'https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4'
    }
  ];

  var TESTES = [
    {
      id: 'hls-bbb', title: 'Big Buck Bunny (HLS)', image: POSTERS.bbb, backdrop: POSTERS.bbb,
      meta: 'Stream de teste .m3u8', overview: 'Stream HLS público da Mux, útil para testar qualidade adaptativa.',
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
    },
    {
      id: 'hls-tos', title: 'Tears of Steel (HLS)', image: POSTERS.tos, backdrop: POSTERS.tos,
      meta: '2012 • Stream de teste .m3u8', overview: 'Curta de ficção científica da Blender, servido em HLS pela Unified Streaming.',
      url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8'
    },
    {
      id: 'sintel-trailer', title: 'Sintel (trailer MP4)', image: POSTERS.sintel, backdrop: POSTERS.sintel,
      meta: 'Arquivo MP4 direto', overview: 'Trailer oficial servido pelo site da Blender.',
      url: 'https://download.blender.org/durian/trailer/sintel_trailer-720p.mp4'
    }
  ];

  function toItem(f) {
    return {
      id: f.id, title: f.title, image: f.image, backdrop: f.backdrop,
      meta: f.meta, overview: f.overview, playable: true, raw: f
    };
  }

  Fontes.register({
    id: 'demo',
    name: 'Demo',

    isConfigured: function () { return true; },

    getRows: function () {
      return Promise.resolve([
        { title: 'Filmes abertos da Blender', items: FILMES.map(toItem) },
        { title: 'Streams de teste', items: TESTES.map(toItem) }
      ]);
    },

    search: function (q) {
      q = q.toLowerCase();
      return Promise.resolve(FILMES.concat(TESTES).filter(function (f) {
        return f.title.toLowerCase().indexOf(q) !== -1;
      }).map(toItem));
    },

    getStream: function (item) {
      return Promise.resolve({ type: 'video', url: item.raw.url });
    }
  });
})();
