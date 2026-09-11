# fbs-landing
Лендинг: блоки ФБС по ГОСТ 13579-2018 оптом — Неруд-Логистик

Публикуется на GitHub Pages: https://vodopian060-del.github.io/fbs-landing/

## Как устроено

`index.html` — самораспаковывающийся бандл Claude Design: страница и все ресурсы
(React, шрифты, логотип, карта) упакованы внутрь одного файла. **Руками его не править.**

Исходники лежат в `src/`:

- `src/template.html` — разметка страницы и логика калькулятора (`<script type="text/x-dc">` в конце файла);
- `src/assets/*.js` — компоненты (в т.ч. `e4a930c8-….js` — карта России);
- `src/assets/manifest.json` — служебные данные ресурсов.

## Правка и сборка

```bash
python3 tools/unpack.py   # index.html → src/   (нужно один раз или после правок в Claude Design)
# ... правим src/template.html ...
python3 tools/pack.py     # src/ → index.html
```

`pack.py` меняет в `index.html` только блоки шаблона и ресурсов; загрузчик не трогает.
Неизменённые ресурсы копируются байт в байт, так что diff в git остаётся чистым.

Заглушки, которые нужно заменить на реальные значения, собраны в объекте `CONFIG`
в начале скрипта `src/template.html` и помечены `TODO`.
