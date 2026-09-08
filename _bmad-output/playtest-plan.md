# Plano de Playtest: Tríade 1.0.0 — Spawn Direcional + Pistas + Onboarding + Feel

**Versão**: 1.0.0 (tríade 1.0.0, Expo 57, tabuleiro RN Skia)
**Criado em**: 2026-09-04
**Data(s) da(s) sessão(ões)**: A definir — semana de 2026-09-08

---

## Visão geral

### Objetivo

Validar quatro pontos que testes automatizados não conseguem capturar no build jogável atual:
1. **Spawn direcional (12-1)** — o jogador consegue ler "onde a próxima peça cai" a partir da direção do swipe? O spawn na borda oposta parece controlável vs aleatório?
2. **Duas Pistas (Epic 3)** — o jogador entende Clean vs Acelerada, memória de pista, trocar-de-pista-começa-jogo-novo, leaderboards por pista?
3. **Onboarding (Epic 5)** — o tutorial de 3 movimentos guiados ensina 1+2 e depois a regra de uma casa? A tela de tom é pulável/clara? Veterans pulam sem atrito?
4. **Feel (Epic 8)** — o merge grande aterrissa como evento físico (haptics/punch/shake/bullet-time/SFX) sem quebrar legibilidade nem sensação de 60fps? O Reduced Motion degrada com graça?

Decisões que isso informa: ship/no-ship do override do Epic 12 (spawn direcional substitui o GDD aleatório-uniforme), ajuste de copy do lane-select, gating do tutorial, tuning do FeelPreset, calibração da curva de spawn por playtest.

### Informações do build

- **Versão**: tríade 1.0.0
- **Plataforma**: iOS (build de dev Expo / simulador + dispositivo físico se disponível)
- **Conteúdo**: Engine TS como fonte única da verdade, tabuleiro 4×4 Skia, Adaptive Spawn + posicionamento direcional (candidatos na borda oposta das linhas movidas, 1 draw na escolha da célula, orçamento de 3 draws no move efetivo), Lane Select (Clean Pura / Acelerada Com ajuda), best + leaderboards por pista, tutorial 3 movimentos, tela de tom, ajuda contextual na primeira sessão da Acelerada, i18n PT/EN, Game Feel Suite (haptics escalado 3/leve 6/médio 12+/pesado, punch, shake direcional 2/5ms teto 8ms, bullet-time ~200ms só em novo recorde da sessão, preset Reduced Motion, SFX via expo-audio), overlay de Game Over com stats imediatos
- **Issues conhecidos**: DWs abertos — boardSize clampa pra 0 em janela degenerada, sem baseline de fps on-device ainda, evidência AC-4/AC-5 de render só manual, Epic 12 ainda fora do epics.md/GDD (texto aleatório-uniforme sobrescrito por esta story)

### Critérios de sucesso

- 4/5 participantes articulam a regra do spawn sem indução ("cai no lado oposto de onde arrastei") após 2 partidas
- 5/5 escolhem a pista certa pra sua intenção e preveem a consequência de trocar de pista
- Primeiro merge ≤20s, primeiro game over ≤3min na primeira sessão (north-star do GDD)
- Zero bloqueadores críticos; momentos de feel avaliados como positivos sem queixa de motion

---

## Participantes

### Perfil-alvo

- **Tipo de jogador**: misto — 2 Achievers (integridade de score), 2 Beginners (assistência), 1 Genre Veteran (Threes/2048, jogo rápido, pula tutorial)
- **Experiência no gênero**: pelo menos 2 unfamiliar, pelo menos 1 veteran
- **Faixa etária**: n/a
- **Outros critérios**: time interno; 1 participante com Reduced Motion ligado, 1 com som desligado, 1 PT + 1 EN

### Recrutamento

- **Quantidade**: 5 internos
- **Origem**: interno (time + times adjacentes)
- **Compensação**: n/a

---

## Estrutura da sessão

### Pré-sessão (15 minutos)

1. **Boas-vindas (5 min)**
   - Apresente-se e apresente o time
   - Explique o que vão fazer
   - Enfatize: "Estamos testando o jogo, não você"

2. **Consentimento e setup (5 min)**
   - Consentimento de gravação: sim/não (perguntar)
   - NDA: não (interno)
   - Coletar info demográfica: auto-ID de tipo de jogador
   - Preferências de hardware: portrait primeiro, depois landscape; dispositivo designado

3. **Instruções (5 min)**
   - "Jogue como você normalmente jogaria"
   - "Pense em voz alta se ficar confortável"
   - "Pode perguntar a qualquer hora"
   - "Pode parar a qualquer momento"

### Sessão de jogo (60 minutos)

#### Jogo livre vs tarefas guiadas

- [x] Jogo livre — deixar o jogador explorar naturalmente (partida 1, sem prompts)
- [x] Tarefas guiadas — cenários específicos (partidas 2-3)

Tarefas guiadas:
1. Começar na pista padrão → jogar até game over → restart 1-tap
2. Trocar de pista (confirmar aviso de jogo novo) → jogar Acelerada → disparar prompts de undo/hint/continue
3. Caminho veteran: pular tutorial por completo → sessão rápida
4. Participante Reduced Motion: ativar preset → repetir um merge grande

#### Áreas de foco

1. Spawn direcional 12-1 — previsibilidade, legibilidade da borda oposta, confiança vs caos
2. Lane Select + Lane Wall — compreensão, default memorizado, separação de leaderboards
3. Tutorial 3 movimentos + tela de tom + ajuda contextual — ensina 1+2, regra de uma casa, pulabilidade
4. Feel suite — escala háptica, punch, direção do shake, raridade do bullet-time, acoplamento do SFX

#### Limiar de intervenção

Intervenha apenas quando:

- [x] Bug crítico impede progresso
- [x] Jogador genuinamente angustiado
- [x] Tempo da sessão estourando
- [x] Jogador pede ajuda explicitamente
- Anote toda vontade de ajudar como finding mesmo quando não intervier

### Pós-sessão (15 minutos)

#### Reações imediatas

1. "Qual foi sua impressão geral do jogo?"
2. "Que momento mais se destacou?"
3. "Jogaria de novo? Por quê?"

#### Perguntas específicas

1. Spawn: "Onde as peças novas apareceram? Deu pra prever? Pareceu justo?"
2. Pistas: "Qual a diferença entre Pura e Com ajuda? Pra onde vai seu score quando troca? O que acontece quando troca no meio da partida?"
3. Onboarding: "O que os 3 primeiros movimentos te ensinaram? Algo confuso? (Veterans: foi fácil pular?)"
4. Feel: "Descreva o maior merge — o que sentiu/ouviu/viu? Muito, pouco? (Reduced Motion: o que restou?)"

#### Feedback aberto

1. "Tem algo que você gostaria que o jogo tivesse?"
2. "Mais alguma coisa pra compartilhar?"
3. "Perguntas pra gente?"

---

## Guia de observação

### O que observar

| Sinal          | Exemplos                                  | Ação                    |
| -------------- | ----------------------------------------- | ----------------------- |
| **Confusão**   | Pausa, circula, relê                      | Anotar local, duração   |
| **Frustração** | Suspiro, tentativas repetidas, desistir   | Anotar causa, frequência|
| **Engajamento**| Inclina pra frente, exclama, "só mais uma"| Anotar feature          |
| **Tédio**      | Olha celular, apressa, desengaja          | Anotar quando cai       |
| **Descoberta** | "Ah!", testa coisas                       | Anotar gatilho          |

Lentes de foco:
- Spawn: olho pisca pra borda oposta após swipe? Linguagem de surpresa vs antecipação?
- Pistas: hesita no Lane Select? Toca no outro card no meio da partida apesar do aviso de rodapé?
- Tutorial: pula texto de ajuda? Erra o merge 1+2 de primeira? Precisa repetir?
- Feel: sobressalto/sorriso no merge pesado? Queixa de shake/flash? Perde o bullet-time?

### Métricas a coletar

- [x] Tempo até o primeiro merge (meta ~20s)
- [x] Tempo até o primeiro game over (meta ≤3min primeira sessão)
- [x] Taxa de conclusão do tutorial + taxa de skip (veterans)
- [x] Compreensão de pistas (quiz pós-sessão: 3/3 corretas)
- [x] Precisão de previsão de spawn (perguntar antes de 5 spawns: acertou a borda?)
- [x] Restarts por sessão, continues/undos usados (Acelerada)
- [x] Duração da sessão, taxa de conclusão, sentimento (1-5)

---

## Template de anotação

```
Participante: ___  Data: ___  Observador: ___
Pista: ___  Idioma: PT/EN  Reduced Motion: S/N  Build: 1.0.0

HORA | LOCAL | OBSERVAÇÃO | REAÇÃO | NOTAS
-----|-------|------------|--------|------
     |       |            |        |
     |       |            |        |
     |       |            |        |

Previsões de spawn (5): ___/5 borda correta
Quiz de pistas: ___/3 | Tutorial: concluído/pulado | Primeiro merge @ ___s | Game over @ ___s

Momentos-chave:
1.
2.
3.

Impressão geral:

```

---

## Papéis do time

| Papel              | Responsabilidades                    | Responsável |
| ------------------ | ------------------------------------ | ----------- |
| **Facilitador**    | Boas-vindas, instruções, entrevista  | Eduardo / A definir |
| **Anotador**       | Observações, timestamps              | A definir |
| **Suporte técnico**| Build, gravação, troubleshooting     | A definir |

---

## Logística

### Equipamento

- [ ] Build instalado e testado (simulador iOS + 1 dispositivo físico se possível)
- [ ] Dispositivo com portrait + landscape
- [ ] Equipamento de gravação (se consentido)
- [ ] Termos de consentimento
- [ ] Templates de observação (impressos)
- [ ] Compensação (n/a interno)

### Ambiente

- [ ] Espaço quieto, privado
- [ ] Assentos confortáveis
- [ ] Água/snacks disponíveis
- [ ] Relógio/timer visível

---

## Processo pós-playtest

### No mesmo dia

- [ ] Debrief rápido do time (15 min)
- [ ] Consolidar notas brutas
- [ ] Sinalizar issues críticos

### Em até 48h

- [ ] Sintetizar findings (padrões em ≥2 participantes)
- [ ] Severidade: Crítico (bloqueia progresso) / Maior (impacta experiência) / Menor (manejável)
- [ ] Escrever relatório

### Entrega do relatório

- **Prazo**: +2 dias após última sessão
- **Distribuição**: time
- **Formato**: `_bmad-output/playtest-report.md` usando o template abaixo

#### Template de relatório

```markdown
## Relatório de Playtest: Tríade 1.0.0 interno

### Resumo
- Participantes: 5 | Taxa de conclusão: % | Sentimento: positivo/misto/negativo

### Principais achados
1. {Achado com evidência — ex. 3/5 leram spawn como aleatório em swipes verticais}
2. {Achado com evidência}

### Recomendações
| Issue | Severidade | Recomendação | Prioridade |
| ----- | ---------- | ------------ | ---------- |
|       |            |              | P0-P3      |

### Quotes
> "{quote}" - Participante N

### Próximos passos
1. {ex. adicionar hint animado na borda oposta; atualizar epics.md Epic 12 + nota de override do GDD}
2. {ex. tunar shakeMs do FeelPreset; corrigir DW-xxx}
```

---

## Notas

- Spawn direcional sobrescreve o texto aleatório-uniforme do GDD — não "corrija" pra aleatório se jogadores relatarem surpresa; corrija legibilidade.
- Mantenha a pista Clean pura: sem indicador de teto / aviso de stuck mesmo se observadores quiserem ajudar.
- Reduced Motion mantém haptics+som — nunca desligue esses nesse preset.
