#!/usr/bin/env bash
# ==============================================================================
# EVA 4D — Universal Matrix Head & Master Control Deck Launcher
# ==============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/eva-face" && pwd)"
MODE="${1:-terminal}"

case "$MODE" in
  terminal|cli|term|t)
    echo "[*] Запуск Универсальной 4D Матричной Головы Евы в терминале..."
    echo "[*] Управление: мышь (взгляд), клик+drag (вращение с пружинным возвратом в центр)"
    echo "[*] Клавиши:"
    echo "    [m / пробел] - Открыть / закрыть центр управления Евой"
    echo "    [1] Phosphor Green  [2] Vector Hologram (Eco 60 FPS)  [3] Electra Cyan"
    echo "    [4] Solar Amber     [5] Rain Cascade                  [6] Solid HD (▀)"
    echo "    [7] Cyber Wireframe [v/tab] Режим отображения         [r] Центровка"
    echo "    [q] Выход"
    cd "$DIR"
    exec npx tsx src/terminal.ts
    ;;

  phosphor|eva|1)
    echo "[*] Запуск Евы в 4D состоянии: [1] Phosphor Green (Матричный Люминофор 520nm)..."
    cd "$DIR"
    exec npx tsx src/terminal.ts phosphor
    ;;

  hologram|eco|2)
    echo "[*] Запуск Евы в 4D состоянии: [2] Vector Hologram (60 FPS Eco Режим)..."
    cd "$DIR"
    exec npx tsx src/terminal.ts hologram
    ;;

  electra|neo|3)
    echo "[*] Запуск Евы в 4D состоянии: [3] Electra Cyan (Высоковольтный Циан #00f0ff)..."
    cd "$DIR"
    exec npx tsx src/terminal.ts electra
    ;;

  solar|adam|4)
    echo "[*] Запуск Евы в 4D состоянии: [4] Solar Amber (Кибернетическое Золото #ffb400)..."
    cd "$DIR"
    exec npx tsx src/terminal.ts solar
    ;;

  cascade|rain|5)
    echo "[*] Запуск Евы в 4D состоянии: [5] Rain Cascade (Матричный Ливень Кода)..."
    cd "$DIR"
    exec npx tsx src/terminal.ts cascade
    ;;

  solid|hd|6)
    echo "[*] Запуск Евы в 4D состоянии: [6] Solid HD Blocks (Субпиксельный TrueColor ▀)..."
    cd "$DIR"
    exec npx tsx src/terminal.ts solid
    ;;

  wireframe|wire|7)
    echo "[*] Запуск Евы в 4D состоянии: [7] Cyber Wireframe (Векторный Каркас Нейросети)..."
    cd "$DIR"
    exec npx tsx src/terminal.ts wireframe
    ;;

  ascii|retro|8)
    echo "[*] Запуск Станции 08: Classic Retro ASCII Stencil..."
    cd "$DIR"
    exec npx tsx src/multihead_terminal.ts
    ;;

  web|browser|gui|w)
    echo "[*] Единая веб-станция Евы (одна страница, 1 кнопка управления, 7 4D обликов):"
    echo "    -> https://evabot.online/face/"
    echo "    -> Локально: http://127.0.0.1:8093/"
    if which xdg-open >/dev/null 2>&1; then
      xdg-open "https://evabot.online/face/" >/dev/null 2>&1 || true
    fi
    ;;

  deck|list)
    echo "=================================================================="
    echo "  EVA 4D MATRIX // ЕДИНЫЙ ЦЕНТР УПРАВЛЕНИЯ & 7 СОСТОЯНИЙ"
    echo "=================================================================="
    echo "  [1] ./eva-face.sh phosphor  - [1] Phosphor Green (Матричный люминофор)"
    echo "  [2] ./eva-face.sh hologram  - [2] Vector Hologram (Eco 60 FPS сканлайны)"
    echo "  [3] ./eva-face.sh electra   - [3] Electra Cyan (Циановый код #00f0ff)"
    echo "  [4] ./eva-face.sh solar     - [4] Solar Amber (Янтарное кибер-золото)"
    echo "  [5] ./eva-face.sh cascade   - [5] Rain Cascade (Плотный ливень кода)"
    echo "  [6] ./eva-face.sh solid     - [6] Solid HD Blocks (TrueColor полублоки)"
    echo "  [7] ./eva-face.sh wireframe - [7] Cyber Wireframe (Векторная сетка)"
    echo "  [w] ./eva-face.sh web       - Открыть единую Web-страницу (1 кнопка)"
    echo "=================================================================="
    ;;

  live)
    echo "[*] Студия Eva Live (Лицо + Голос + Трансляция):"
    echo "    -> https://evabot.online/live/"
    if which xdg-open >/dev/null 2>&1; then
      xdg-open "https://evabot.online/live/" >/dev/null 2>&1 || true
    fi
    ;;

  meet)
    shift || true
    MEET_URL="${1:-https://meet.google.com/new}"
    echo "[*] Запуск подключения Евы к Google Meet: $MEET_URL"
    exec /home/evabot/Desktop/eva-meet.sh "$MEET_URL"
    ;;

  *)
    echo "Использование: ./eva-face.sh [terminal|phosphor|hologram|electra|solar|cascade|solid|wireframe|web|deck|meet]"
    echo "  ./eva-face.sh terminal   - Запуск 4D матрицы в консоли с меню [m] и мышью"
    echo "  ./eva-face.sh web        - Открыть единую веб-станцию (https://evabot.online/face/)"
    echo "  ./eva-face.sh phosphor   - [1] Phosphor Green"
    echo "  ./eva-face.sh hologram   - [2] Vector Hologram (Eco 60 FPS)"
    echo "  ./eva-face.sh electra    - [3] Electra Cyan"
    echo "  ./eva-face.sh solar      - [4] Solar Amber"
    echo "  ./eva-face.sh cascade    - [5] Rain Cascade"
    echo "  ./eva-face.sh solid      - [6] Solid HD Blocks"
    echo "  ./eva-face.sh wireframe  - [7] Cyber Wireframe"
    echo "  ./eva-face.sh meet       - Подключить к Google Meet"
    ;;
esac
