# FilmesFlix: app para LG Smart TV (webOS)

App no estilo Netflix, feito para ser usado com o controle remoto, com **fontes de conteúdo plugáveis**:

| Fonte | O que faz | Precisa de |
|---|---|---|
| **Demo** | Filmes abertos da Blender + streams de teste HLS | nada |
| **TMDB** | Catálogo de filmes/séries + trailers oficiais (YouTube) | chave grátis do TMDB |
| **Minha biblioteca** | Seus próprios vídeos via servidor Jellyfin | Jellyfin instalado no PC/NAS |

Para trocar ou adicionar fontes, veja **[FONTES.md](FONTES.md)**.

## Estrutura

```
appinfo.json            metadados do app webOS (id, nome, ícones)
index.html              telas: início, detalhes, player
css/style.css           visual (layout 1920x1080, escala automática)
js/config.js            ★ chaves de API e fontes ativas
js/http.js              requisições (XHR, compatível com TVs antigas)
js/providers/           ★ uma fonte por arquivo (+ _modelo.js para copiar)
js/spatial.js           navegação pelas setas do controle / Magic Remote
js/player.js            player MP4/HLS e YouTube
js/app.js               lógica das telas
```

## 1. Testar no PC

```bash
npm start
```
Abra http://localhost:5500. Use as **setas**, **Enter** (OK) e **Esc** (Voltar).

## 2. Configurar as fontes

Edite `js/config.js`:
- **TMDB:** crie uma conta em themoviedb.org, vá em *Configurações → API*, copie a chave e cole em `tmdb.apiKey`.
- **Jellyfin:** preencha `serverUrl` (ex.: `http://192.168.0.10:8096`), `apiKey` (*Painel → Chaves de API*) e `userId`, e mude `enabled` para `true`.

## 3. Instalar na TV LG

### 3.1 Preparar a TV (uma vez)
1. Crie uma conta em https://webostv.developer.lge.com e faça login na TV com a mesma conta LG.
2. Na **LG Content Store** da TV, instale o app **Developer Mode**.
3. Abra o Developer Mode, faça login, ative **Dev Mode Status** e depois **Key Server**. A TV reinicia.
4. Anote o **IP** e a **passphrase** que aparecem no app Developer Mode.

> A sessão de desenvolvedor expira depois de algum tempo. Abra o app Developer Mode e clique em **Extend** para renovar. Se expirar, os apps instalados assim são removidos.

### 3.2 Instalar as ferramentas no PC (uma vez)
```bash
npm install -g @webos-tools/cli
```
```bash
ares-setup-device
```
Escolha **add**, nome `tv`, IP da TV, porta `9922`, usuário `prisoner`. Depois busque a chave:
```bash
ares-novacom --device tv --getkey
```
Digite a passphrase mostrada na TV.

### 3.3 Empacotar e instalar
```bash
npm run package
```
```bash
npm run install-tv
```
```bash
npm run launch-tv
```
O app **FilmesFlix** aparece na barra de apps da TV. Depois de alterar o código, rode os três comandos de novo.

Para depurar na TV (console, erros, rede):
```bash
npm run debug-tv
```

## Controles

| Tecla | Ação |
|---|---|
| Setas | navegar |
| OK | abrir / pausar |
| ◀ ▶ (no player) | voltar 10s / avançar 30s |
| Voltar | fechar tela / sair do player (2× na tela inicial sai do app) |
| Magic Remote | apontar e clicar também funciona |

## Compatibilidade

O código usa JavaScript ES5 e não tem etapa de build, então roda no **webOS 3.0+** (TVs de 2016 em diante). Trailers do YouTube dependem do navegador da TV aceitar o player incorporado; se algum trailer não abrir, é limitação do modelo.

## Atualizar a TV sem reinstalar (GitHub Pages)

O app fica publicado em `https://rodrigoreuter.github.io/filmesflix/`. O app instalado na TV, ao abrir com internet, vai para esse endereço (sem internet, usa a cópia instalada). Então:

- **Listas e configuração:** edite `config.json` e os arquivos de `listas/` direto no GitHub (ícone de lápis) e salve. Em cerca de 1 minuto a TV recebe, na próxima vez que você abrir o app.
- **Código novo** (fontes, telas): faça `git push`; a TV também recebe sozinha.
- Só precisa reinstalar na TV se mudar `appinfo.json`, ícones ou o próprio `hostedUrl`.
- Atenção: o repositório é público. Não coloque chaves privadas em `config.json`.

## Testar listas pelo navegador

Abra **https://rodrigoreuter.github.io/filmesflix/testar.html**, cole uma lista (ou o endereço dela, ou um link de canal) e clique em **Testar**. A página abre cada vídeo, mostra a resolução (720p/1080p/4K) e baixa um `.m3u` só com os que funcionam.

Atalho para testar uma lista do app: `testar.html?lista=listas/esportes.m3u`.
