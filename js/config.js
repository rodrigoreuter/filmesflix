/*
 * ============================================================
 *  CONFIGURAÇÃO DO FILMESFLIX
 * ============================================================
 *  Aqui você liga/desliga fontes e coloca as chaves de API.
 *  Cada chave dentro de "providers" corresponde ao "id" de um
 *  arquivo em js/providers/. Para criar uma fonte nova, veja
 *  o arquivo FONTES.md na raiz do projeto.
 *
 *  Obs.: o código usa JavaScript "antigo" (ES5: var, function)
 *  de propósito, para rodar em TVs LG com webOS 3.x em diante.
 * ============================================================
 */
var CONFIG = {
  // Endereço do app publicado no GitHub Pages. Quando o app instalado na TV
  // abre e há internet, ele vai para este endereço; assim tudo o que você
  // muda no GitHub aparece na TV sem reinstalar. Deixe '' para desligar.
  hostedUrl: 'https://rodrigoreuter.github.io/filmesflix/',

  // Configuração editável pelo navegador (no GitHub). O que estiver lá
  // substitui os valores deste arquivo. Veja config.json na raiz.
  remoteConfig: 'config.json',

  // Fonte aberta ao iniciar o app (id da fonte)
  defaultProvider: 'demo',

  providers: {
    // Filmes abertos (Creative Commons) e streams de teste. Não precisa de chave.
    demo: {
      enabled: true
    },

    // Catálogo do TMDB + trailers do YouTube.
    // Crie uma conta grátis em https://www.themoviedb.org/settings/api
    // e cole a "Chave da API" (v3) OU o "Token de leitura" (v4).
    tmdb: {
      enabled: true,
      apiKey: '7afd89ea23f7f696430097df8f6f74f8',
      language: 'pt-BR',
      region: 'BR'
    },

    // Sua própria biblioteca de vídeos via servidor Jellyfin (https://jellyfin.org).
    // serverUrl: endereço do servidor na sua rede (ex.: http://192.168.0.10:8096)
    // apiKey:    Painel do Jellyfin > Chaves de API > "+"
    // userId:    Painel > Usuários > clique no usuário; o id aparece na URL (userId=...)
    jellyfin: {
      enabled: false,
      serverUrl: 'http://192.168.0.10:8096',
      apiKey: '',
      userId: ''
    },

    // TV ao vivo a partir de listas .m3u. Cada lista vira fileiras (uma por group-title).
    // url: arquivo da pasta listas/ (vai junto no app) ou um endereço https://...
    // SUAS LISTAS: edite listas/minha-lista.m3u ou crie outro .m3u e adicione aqui.
    // Para checar quais canais estão no ar: npm run validar-listas
    m3u: {
      enabled: true,
      name: 'TV ao vivo',
      lists: [
        { name: 'Canais abertos', url: 'listas/canais-legais.m3u' },
        { name: 'Minha lista', url: 'listas/minha-lista.m3u' }
        // { name: 'Outra lista', url: 'listas/outra.m3u' },
      ]
    }

    // NOVA FONTE: adicione um bloco aqui, ex.:
    // minhafonte: { enabled: true, baseUrl: 'https://...', apiKey: '' }
  }
};
