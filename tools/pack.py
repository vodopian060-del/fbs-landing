#!/usr/bin/env python3
"""Собирает index.html из src/ (обратная операция к tools/unpack.py).

Заменяет в index.html только блоки __bundler/template и __bundler/manifest;
загрузчик и остальная обёртка не трогаются. Round-trip unpack→pack без правок
даёт побайтово идентичный index.html.
"""
import base64, gzip, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, 'index.html')
SRC = os.path.join(ROOT, 'src')
ASSETS = os.path.join(SRC, 'assets')


def encode_template(html):
    # Экранируем '/' только в '</': иначе '</script>' внутри JSON-строки
    # оборвёт <script type="__bundler/template">. Так же делает Claude Design.
    return json.dumps(html, ensure_ascii=False).replace('</', '<\\u002F')


def decode(entry):
    raw = base64.b64decode(entry['data'])
    return gzip.decompress(raw) if entry.get('compressed') else raw


def replace_block(src, name, payload):
    pat = r'(<script type="__bundler/%s">\s*)(.*?)(\s*</script>)' % re.escape(name)
    new, n = re.subn(pat, lambda m: m.group(1) + payload + m.group(3), src, count=1, flags=re.S)
    if n != 1:
        sys.exit('блок __bundler/%s не найден' % name)
    return new


def main():
    src = open(INDEX, encoding='utf-8').read()
    template = open(os.path.join(SRC, 'template.html'), encoding='utf-8').read()
    src = replace_block(src, 'template', encode_template(template))

    meta = json.load(open(os.path.join(ASSETS, 'manifest.json'), encoding='utf-8'))
    old = json.loads(re.search(r'<script type="__bundler/manifest">\s*(.*?)\s*</script>', src, re.S).group(1))
    manifest = {}
    for uuid, m in meta.items():
        raw = open(os.path.join(ASSETS, uuid + '.' + m['ext']), 'rb').read()
        prev = old.get(uuid)
        if prev and prev['mime'] == m['mime'] and bool(prev.get('compressed')) == m['compressed'] \
                and decode(prev) == raw:
            data = prev['data']  # ресурс не менялся — оставляем исходные байты, чтобы diff был чистым
        else:
            data = base64.b64encode(gzip.compress(raw, mtime=0) if m['compressed'] else raw).decode('ascii')
        manifest[uuid] = {'mime': m['mime'], 'compressed': m['compressed'], 'data': data}
    src = replace_block(src, 'manifest', json.dumps(manifest, ensure_ascii=False, separators=(',', ':')))

    open(INDEX, 'w', encoding='utf-8').write(src)
    print('index.html собран: %d байт' % len(src.encode('utf-8')))


if __name__ == '__main__':
    main()
