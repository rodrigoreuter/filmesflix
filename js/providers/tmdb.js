/*
 * FONTE: TMDB (The Movie Database)
 * Catálogo de filmes e séries + trailers oficiais do YouTube.
 * Documentação: https://developer.themoviedb.org/reference/intro/getting-started
 * Configure a chave em js/config.js > providers.tmdb.apiKey
 */
(function () {
  var API = 'https://api.themoviedb.org/3';
  var IMG = 'https://image.tmdb.org/t/p/';

  function cfg() { return Fontes.config('tmdb'); }

  // Aceita a chave v3 (32 caracteres) ou o token v4 (JWT longo).
  function call(path, params) {
    var c = cfg();
    params = params || {};
    params.language = params.language || c.language || 'pt-BR';
    var headers = {};
    if (c.apiKey.length > 40) {
      headers.Authorization = 'Bearer ' + c.apiKey;
    } else {
      params.api_key = c.apiKey;
    }
    return Http.getJSON(API + path + Http.qs(params), headers);
  }

  function toItem(r, forcedType) {
    var type = forcedType || r.media_type || (r.title ? 'movie' : 'tv');
    var date = r.release_date || r.first_air_date || '';
    var meta = [];
    if (date) meta.push(date.substr(0, 4));
    meta.push(type === 'tv' ? 'Série' : 'Filme');
    if (r.vote_average) meta.push('★ ' + r.vote_average.toFixed(1));
    return {
      id: type + ':' + r.id,
      title: r.title || r.name,
      image: r.poster_path ? IMG + 'w342' + r.poster_path : '',
      backdrop: r.backdrop_path ? IMG + 'w1280' + r.backdrop_path : '',
      overview: r.overview || 'Sem sinopse em português.',
      meta: meta.join(' • '),
      playable: true,
      playLabel: 'Ver trailer',
      raw: { id: r.id, type: type }
    };
  }

  function list(path, type, params) {
    return call(path, params).then(function (data) {
      return (data.results || []).map(function (r) { return toItem(r, type); });
    });
  }

  function findTrailer(type, id, language) {
    return call('/' + type + '/' + id + '/videos', { language: language }).then(function (data) {
      var vids = (data.results || []).filter(function (v) { return v.site === 'YouTube'; });
      var trailer = vids.filter(function (v) { return v.type === 'Trailer'; })[0] || vids[0];
      return trailer ? trailer.key : null;
    });
  }

  Fontes.register({
    id: 'tmdb',
    name: 'TMDB',
    setupHint: 'Coloque sua chave grátis do TMDB em js/config.js (providers.tmdb.apiKey). Crie em themoviedb.org > Configurações > API.',

    isConfigured: function () { return !!cfg().apiKey; },

    getRows: function () {
      var region = cfg().region || 'BR';
      return Promise.all([
        list('/trending/movie/week', 'movie'),
        list('/movie/popular', 'movie', { region: region }),
        list('/movie/top_rated', 'movie', { region: region }),
        list('/trending/tv/week', 'tv'),
        list('/tv/top_rated', 'tv')
      ]).then(function (r) {
        return [
          { title: 'Filmes em alta na semana', items: r[0] },
          { title: 'Filmes populares', items: r[1] },
          { title: 'Filmes mais bem avaliados', items: r[2] },
          { title: 'Séries em alta', items: r[3] },
          { title: 'Séries mais bem avaliadas', items: r[4] }
        ];
      });
    },

    search: function (q) {
      return call('/search/multi', { query: q }).then(function (data) {
        return (data.results || []).filter(function (r) {
          return r.media_type === 'movie' || r.media_type === 'tv';
        }).map(function (r) { return toItem(r); });
      });
    },

    // Procura trailer no idioma configurado; se não houver, tenta em inglês.
    getStream: function (item) {
      var t = item.raw.type, id = item.raw.id;
      return findTrailer(t, id).then(function (key) {
        return key || findTrailer(t, id, 'en-US');
      }).then(function (key) {
        if (!key) throw new Error('Nenhum trailer disponível para este título.');
        return { type: 'youtube', videoId: key };
      });
    }
  });
})();
