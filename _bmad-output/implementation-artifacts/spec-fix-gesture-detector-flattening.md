---
title: 'Fix GestureDetector view-flattening warning'
type: 'bugfix'
created: '2026-09-02'
status: 'done'
route: 'one-shot'
---

# Fix GestureDetector view-flattening warning

## Intent

**Problem:** Ao abrir o app no iPhone o LogBox mostra `[react-native-gesture-handler] GestureDetector has received a child that may get view-flattened` — `App.tsx:962` passa `<GameBoard>` direto como filho de `<GestureDetector>`, e o Fabric pode flattenar views sem `collapsable={false}`, fazendo o gesto falhar intermitentemente.

**Approach:** Envolver o filho do `GestureDetector` em `<View collapsable={false}>` com o mesmo `boardSize` para garantir que o host view não seja otimizado para fora da hierarquia, preservando a área de gesto e eliminando o warning sem alterar layout ou lógica de swipe.

## Suggested Review Order

- Corrige o warning envolvendo GameBoard em View não-colapsável dentro do GestureDetector
  [`App.tsx:962`](../../triade/App.tsx#L962)

- Preserva boardWrap como container externo, inner View replica boardSize para hit-area exata
  [`App.tsx:963`](../../triade/App.tsx#L963)
