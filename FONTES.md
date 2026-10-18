# Como trocar ou adicionar fontes (APIs)

O app nunca chama uma API diretamente. A interface (`app.js`, `player.js`) só conversa com **fontes** (providers), e cada fonte é um arquivo em `js/providers/`. Para trocar de API, crie uma fonte nova e ligue ela. O resto do app continua igual.

```
index.html ──► js/config.js            ← liga/desliga fontes, chaves e URLs
           ──► js/providers/registry.js ← contrato que toda fonte segue
           ──► js/providers/*.js        ← uma fonte por arquivo
           ──► js/app.js / player.js    ← interface (não precisa mexer)
```

## Onde fica cada coisa

| O que você quer fazer | Arquivo | Onde |
|---|---|---|
| Ligar/desligar uma fonte | `js/config.js` | `enabled: true/false` |
| Colocar chave de API / URL do servidor | `js/config.js` | bloco da fonte em `providers` |
| Escolher a fonte que abre primeiro | `js/config.js` | `defaultProvider` |
| Mudar quais fileiras aparecem | `js/providers/<fonte>.js` | função `getRows` |
| Mudar de onde vem o vídeo | `js/providers/<fonte>.js` | função `getStream` |
| Criar uma fonte nova | copie `js/providers/_modelo.js` | veja o passo a passo abaixo |
| Carregar o arquivo da fonte nova | `index.html` | bloco "3) Registro de fontes" |

## Passo a passo: nova fonte

1. **Copie o modelo**
   `js/providers/_modelo.js` → `js/providers/minhafonte.js` e troque `var ID = 'modelo'` por `var ID = 'minhafonte'`.

2. **Configure** em `js/config.js`, dentro de `providers`:
   ```js
   minhafonte: { enabled: true, catalogUrl: 'https://meusite.com/catalogo.json' }
   ```

3. **Carregue o arquivo** em `index.html`, junto dos outros providers:
   ```html
   <script src="js/providers/minhafonte.js"></script>
   ```

4. **Adapte as 3 funções principais** para a sua API:
   - `getRows()` busca listas e devolve `[{ title, items: [Item] }]`
   - `search(texto)` devolve `[Item]` (opcional)
   - `getStream(item)` devolve `{ type: 'video', url }` (MP4 ou HLS `.m3u8`) ou `{ type: 'youtube', videoId }`

   Se a fonte tiver séries/pastas, marque `hasChildren: true` no item e implemente `getChildren(item)`.

5. Teste no PC (`npm start`) e depois instale na TV (veja o README).

## Contrato resumido

```js
Fontes.register({
  id: 'minhafonte',
  name: 'Nome da aba',
  isConfigured: function () { return true; },
  getRows:   function ()     { return Promise.resolve([{ title: 'Fileira', items: [] }]); },
  search:    function (q)    { return Promise.resolve([]); },          // opcional
  getChildren: function (it) { return Promise.resolve([]); },          // opcional
  getStream: function (it)   { return Promise.resolve({ type: 'video', url: '...' }); }
});
```

Item: `{ id, title, image, backdrop, overview, meta, playable, playLabel, hasChildren, childrenLabel, raw }`.
A descrição de cada campo está no topo de `js/providers/registry.js`.

## Dicas

- **JavaScript antigo:** use `var` e `function` (nada de `=>`, `let`, `async/await` ou crases), porque TVs com webOS 3/4 não entendem a sintaxe nova.
- **Requisições:** use `Http.getJSON(url, headers)` em vez de `fetch` (que não existe em TVs antigas).
- **CORS:** no PC o navegador bloqueia APIs sem CORS. Na TV o app roda localmente e costuma funcionar. Teste nos dois.
- **Formatos:** a TV toca MP4 (H.264/H.265) e HLS nativamente. MKV depende do modelo, então o Jellyfin já transcodifica para HLS.
- **Ideias de fontes legais:** seu servidor Jellyfin/Plex/Emby, vídeos seus em um bucket/NAS, acervo de domínio público do Internet Archive (API `archive.org/advancedsearch.php`), canais oficiais que publicam HLS aberto, ou a API oficial de algum serviço que você assina.

## TV ao vivo (listas M3U)

A fonte `m3u` (`js/providers/m3u.js`) lê listas `.m3u` e mostra uma fileira por `group-title`.

- **Lista inicial:** `listas/canais-legais.m3u`, só canais gratuitos servidos pelo próprio canal (TV Câmara, TV Cultura, Rede Minas, France 24, Al Jazeera, NHK, ABC/CBS News, RTP).
- **Suas listas:** edite `listas/minha-lista.m3u` (tem o formato explicado no topo) ou crie outro `.m3u` em `listas/` e cadastre em `js/config.js` > `providers.m3u.lists`. Também aceita URL `https://...` de uma lista hospedada.
- **Validar:** `npm run validar-listas` testa todos os canais das listas (`node tools/validar-listas.js arquivo.m3u` para um só). Com `--salvar`, grava `<nome>.online.m3u` só com os canais que estão no ar.

Use apenas streams que você tem direito de assistir.

## Abas próprias (Filmes, Séries, Esportes...)

Cada aba do topo pode ler as suas próprias listas `.m3u`. Para criar uma, adicione um bloco em `config.json` > `providers` com `"type": "m3u"`:

```json
"novelas": {
  "type": "m3u",
  "enabled": true,
  "name": "Novelas",
  "live": false,
  "lists": [ { "name": "Novelas", "url": "listas/novelas.m3u" } ]
}
```

- `live: true` (padrão): canais ao vivo, cartão com logo, toca direto no clique.
- `live: false`: filmes/episódios, cartão com pôster e tela de detalhes antes de tocar. Use `tvg-description="..."` na linha `#EXTINF` para a sinopse.
- Em séries, use o nome da série como `group-title`: cada série vira uma fileira e cada item é um episódio.
- Capas e logos: salve em `listas/capas/` ou `listas/logos/` e aponte o `tvg-logo` para lá.
