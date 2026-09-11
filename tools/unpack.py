#!/usr/bin/env python3
"""Распаковывает бандл Claude Design (index.html) в редактируемые исходники.

index.html → src/template.html   (страница: разметка + логика калькулятора)
           → src/assets/<uuid>.<ext>  (ресурсы из манифеста: JS, шрифты, картинки)
           → src/assets/manifest.json (mime/compressed для каждого ресурса)

Править нужно src/template.html и src/assets/*.js, затем tools/pack.py.
"""
import base64, gzip, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, 'index.html')
SRC = os.path.join(ROOT, 'src')
ASSETS = os.path.join(SRC, 'assets')

EXT = {'text/javascript': 'js', 'application/javascript': 'js', 'image/png': 'png',
       'font/woff2': 'woff2', 'image/svg+xml': 'svg', 'image/jpeg': 'jpg'}


def block(src, name):
    m = re.search(r'<script type="__bundler/%s">\s*(.*?)\s*</script>' % re.escape(name), src, re.S)
    if not m:
        sys.exit('блок __bundler/%s не найден' % name)
    return m.group(1)


def main():
    src = open(INDEX, encoding='utf-8').read()
    os.makedirs(ASSETS, exist_ok=True)

    template = json.loads(block(src, 'template'))
    open(os.path.join(SRC, 'template.html'), 'w', encoding='utf-8').write(template)

    manifest = json.loads(block(src, 'manifest'))
    meta = {}
    for uuid, entry in manifest.items():
        raw = base64.b64decode(entry['data'])
        if entry.get('compressed'):
            raw = gzip.decompress(raw)
        ext = EXT.get(entry['mime'], 'bin')
        open(os.path.join(ASSETS, uuid + '.' + ext), 'wb').write(raw)
        meta[uuid] = {'mime': entry['mime'], 'compressed': bool(entry.get('compressed')), 'ext': ext}
    json.dump(meta, open(os.path.join(ASSETS, 'manifest.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=2)
    print('template.html + %d ресурсов → %s' % (len(meta), SRC))


if __name__ == '__main__':
    main()
