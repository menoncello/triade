---
project_name: '3-clone'
user_name: 'Eduardo'
date: '2026-08-07'
sections_completed: ['technology_stack', 'engine_rules', 'performance', 'code_organization', 'testing', 'platform_build', 'critical_rules']
status: 'complete'
rule_count: 47
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing game code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Engine de jogo:** custom (vanilla JS) em `js/game.js` — motor puro de regras, UMD export (`window.ThreeGame` no browser, `module.exports` no Node). Nenhum engine de terceiros.
- **Linguagem:** browser scripts em ES5 (`var`, IIFEs, globals compartilhados) — **sem `import`/`export`** nos arquivos do browser. `const`/arrow só em `test/` e `scripts/`. ES5 é consequência do zero-build + UMD dual-env, não preferência estética.
- **Runtimes:** browser moderno com suporte a Service Worker + **Node 18+** (testes `node:test` e geração de ícones).
- **Sem `package.json`, zero dependências, sem build step** — fronteira rígida; não adicionar npm packages nem bundler.
- **PWA:** Service Worker (`sw.js`, prefixo de cache `three-`, atual `three-v4`), Web Manifest (`display: standalone`), ícones PNG auto-gerados.
- **Asset generation:** `scripts/make-icons.js` (zero-dep, usa `zlib` do Node) — única ferramenta de geração; **sem assets de CDN externo**.
- **Persistência:** `localStorage['three_best']` (sempre com try/catch — storage pode falhar).
- **Testes:** `node:test` built-in — rodar com `node --test` (sem argumento de diretório; `node --test test/` falha no Node 26+).
- **Ordem de load no browser:** `js/game.js → js/debug.js → js/ui.js` (ordem física no HTML; `ui.js` depende de `window.ThreeGame` e `window.ThreeDebug` já definidos).

## Critical Implementation Rules

### Engine-Specific Rules

- Regras de merge vivem **apenas** em `js/game.js` (`canMerge`, `mergeValue`, `shiftLine`); `ui.js` nunca duplica lógica de jogo.
- Merge predicate: `(a===1 && b===2) || (b===1 && a===2) || (a>=3 && a===b)`. Merge value: `a <= 2 ? 3 : a*2` — 1+2=3; iguais ≥3 dobram (3+3=6, 6+6=12…); **nunca** 1+1 ou 2+2.
- **Merge-once / one-cell (identidade do jogo):** cada tile move no máximo 1 célula por swipe; tile recém-criado por merge fica travado (não re-merge no mesmo swipe). `[3,3,3,3] → [6,3,3,_]`; `[1,2,3,_] → [3,3,_,_]`.
- **NÃO refatore `shiftLine` com lógica de compactação estilo 2048** (`filter`+`concat`) — ele é front-to-back com semântica simultânea; compactação quebra o merge-once e os testes de trace.
- **Spawn só após movimento efetivo:** `move()` compara boards (`boardsEqual`); noop não spawna, não pontua, não consome turno. Spawn ponderado 40/40/20 (1/2/3) em célula vazia uniforme.
- `move()` retorna `{ board, score, moved, trace }` — contrato lógica↔UI. **O trace é assertável** (`{ value, to:[r,c], from:[[r,c]...], spawned }`): mudanças em `move()` devem preservar o trace exato, não só o board final.
- UI renderiza 100% a partir do trace (sem heurística de matching); duplo `requestAnimationFrame` para commit de posição antes da transição.
- **Aleatoriedade só via parâmetro `rng` injetável** (fallback `Math.random`) em `newGame`, `move`, `spawnTile` — novo caminho aleatório sem injetar `rng` quebra os testes determinísticos.
- Score incrementa pelo valor do tile mergeado.
- `isGameOver` deve reusar **exatamente o mesmo** merge predicate do movimento (nunca "otimizar" para só igualdade — perderia as adjacências 1-2).
- Peso de spawn (40/40/20) e contagem inicial (9 tiles) são **Ask First** — decisões de design/calibração, não tweak de implementação.

### Performance Rules

- Sem frame budget rígido (4x4, ~160ms de animação). A "performance" que importa é **correção visual e ausência de vazamento DOM** — não micro-otimização de loop.
- **`tileEls` (Map key `"r,c"`) sem vazamento:** todo tile renderizado vem do trace; todo elemento órfão precisa sair do Map **e** do DOM (senão acumula tile invisível a cada move).
- **Animação = duplo `requestAnimationFrame`** (força commit da posição de origem antes de transicionar; sem isso o tile teleporta). **`setTimeout` (160ms) é só para remover os tiles de merge (vanish)** — não inverter os dois.
- **`move()` retorna board novo por design** (imutabilidade leve) — não "otimizar" para mutação in-place; é contrato para `boardsEqual`, trace e testabilidade.
- Slide tile `z-index:1`, spawn `z-index:0` — não inverter (senão o spawn cobre o deslize).
- Mudanças em `renderBoard`/CSS de tile exigem **check manual no browser** (animações não são cobertas por `node --test`).

### Code Organization Rules

- **Responsabilidade = camada:** regra de jogo vai em `js/game.js`; pixel/input em `js/ui.js`; dev aid em `js/debug.js`. A separação game.js↔ui.js é a base do UMD e da testabilidade — se duvida onde colocar, pergunte.
- Estrutura de raiz: `index.html` (shell), `css/`, `js/`, `icons/`, `test/`, `scripts/` (ferramentas Node).
- **Naming como sinalização:** classes/fábricas públicas PascalCase (`ThreeGame`, `ThreeDebug`); funções camelCase; constantes UPPER_SNAKE (`SIZE`, `BEST_KEY`, `SWIPE_THRESHOLD`); arquivos snake_case.
- Board como array 2D `board[r][c]` de `null` | valor; posições como `[r, c]`; direções como strings `'left'|'right'|'up'|'down'`.
- Comentários mínimos; **sem emojis** em código/comentários.
- **`ThreeDebug` (debug.js) shipa em produção** como playtest aid (decisão documentada) — não remover; `ui.js` chama `window.ThreeDebug` em `doMove` (remover quebraria silenciosamente).
- Referência canônica de padrões: `docs/` (architecture, component-inventory, development-guide) e `_bmad-output/planning-artifacts/architectures/architecture-3-clone-2026-08-07/game-architecture.md` — consulte antes de adivinhar convenções.

### Testing Rules

- Runner: `node:test` built-in + `node:assert` — comando exato **`node --test`** (sem argumento de diretório; `node --test test/` falha no Node 26+). Nenhum framework externo.
- Testes de regras em `test/game.test.js`, requerendo `../js/game.js` via CommonJS (UMD export).
- **Determinismo obrigatório:** injetar fake RNG (`rngOf(...)` — valores sequenciais, depois `0.5`) para spawns e weighted values. **Nunca `Math.random` em teste.**
- **Use os helpers existentes** (`emptyBoard()`, `staticBoard(row)` isola a linha com `[3,6,12,24]` imóvel nas demais, `boardWith(matrix)`) — não invente fixtures paralelas.
- Cobrir a matriz I/O completa: merges (1+2 nas duas ordens, **1+1 e 2+2 não merge** — erro comum de quem vem do 2048, iguais ≥3), one-cell movement, noop sem spawn, game-over (vazio, 1-2 linha/coluna, iguais ≥3), spawn-once, e **asserções de trace** (merge sources, spawn flags, noop sem spawn).
- Mudança em merge/spawn/game-over **exige** teste novo ou estendido — suíte deve ficar passando (26+ testes).
- Escopo dos testes = I/O matrix do engine. UI, service worker e manifest são **validação manual no browser** — não automatizar com framework (fronteira zero-dep).

### Platform & Build Rules

- Alvo: mobile-first PWA + desktop (teclado). Sem backend, sem API, sem contas.
- **Zero-build é o pilar:** sem bundler, TypeScript ou build step — o browser consome os arquivos fonte direto na ordem física do HTML (`game.js → debug.js → ui.js`).
- Service worker exige **HTTPS ou `localhost`** (`python3 -m http.server` / `npx serve`); `file://` não ativa SW.
- **`CACHE_NAME` (prefixo `three-`) é o canário de deploy:** bump obrigatório a cada mudança no app shell; `activate` só limpa caches `three-*` (nunca o de outra app).
- SW resiliente: install **per-file com gate de shell completo** antes de `skipWaiting()` (não usar `cache.addAll` — um único miss abortaria); fetch cache-first com fallback offline como **503 Response — nunca `respondWith(undefined)`**.
- **Input único:** touch swipe (Pointer Events com `setPointerCapture` + safety nets `pointercancel`/`lostpointercapture`/window `pointerup`) e setas do teclado passam pelo **mesmo** `doMove(dir)` — nunca duplicar caminho de input (regras idênticas por contrato).
- Viewport `user-scalable=no` + `maximum-scale=1.0` bloqueia zoom — **tradeoff a11y consciente** (deferred work); não "consertar" sem consultar.
- Requisitos de runtime: browser moderno com SW support; Node 18+ apenas para testes e geração de ícones.

### Critical Don't-Miss Rules

- **NUNCA** implementar regra de jogo fora de `js/game.js` (nem em `ui.js`, nem em helper "mais limpo") — regra duplicada vira duas fontes de verdade e o teste para de proteger.
- **NUNCA** quebrar o UMD export de `game.js` — é o que mantém `node --test` rodando.
- **NUNCA** adicionar dependência npm, CDN externo ou build step — fronteira rígida.
- **NUNCA** usar regras estilo 2048: 2+2=4, compactação total, re-merge em cascata, merge de 1+1/2+2.
- **NUNCA** usar `Math.random` onde `rng` é injetável — quebra o determinismo da suíte.
- **NUNCA** mutar board in-place em `move()` — board novo alimenta `boardsEqual`, trace e imutabilidade leve.
- **NUNCA** usar `cache.addAll` no install nem `respondWith(undefined)` no fetch — SW é anti-fragilidade por design.
- **NUNCA** remover `window.ThreeDebug` — é playtest aid deliberado que shipa em produção; `ui.js` depende dele (crash silencioso).
- **NUNCA** "consertar" a11y (`user-scalable`) ou calibração (pesos/spawn/tiles iniciais) sem Ask First — são decisões de design documentadas.
- **Ask First:** contagem inicial de tiles (9), pesos de spawn (40/40/20), features fora do MVP (undo, som, daily challenge).
- **Deferred (revisar antes):** acessibilidade do grid (role=grid sem gridcell semantics), zoom bloqueado.
- Game-over só dispara com `isGameOver` true; overlay usa `setTimeout(250)` pós-move — não alterar timing sem necessidade.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any game code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**

- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

Last Updated: 2026-08-07
