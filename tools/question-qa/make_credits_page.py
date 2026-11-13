"""Builds mn-alwahsh-updated/public/image-credits.html from pics/credits_*.json (real builds only).
Lists every picture that needs attribution (CC BY / CC BY-SA) plus public-domain ones, with author,
license and a link to the original file page on Wikimedia Commons."""
import json,glob,html,os
rows=[]
for f in sorted(glob.glob('pics/credits_*.json')):
    if f.endswith('_test.json'): continue
    for c in json.load(open(f,encoding='utf-8')): rows.append(c)
rows.sort(key=lambda c:(not c['needs_attribution'],c['title'].lower()))
def line(c):
    return ('<tr><td>%s</td><td>%s</td><td>%s</td><td><a href="%s" target="_blank" rel="noopener">Wikimedia Commons</a></td></tr>'
        %(html.escape(c['title']),html.escape(c['artist'] or '—'),html.escape(c['license']),html.escape(c['page'] or '#')))
doc='''<!doctype html><html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Image credits - Mn Alwahsh</title>
<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;line-height:1.5;color:#111}
table{border-collapse:collapse;width:100%%;font-size:14px}td,th{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}
h1{font-size:22px}small{color:#555}</style></head><body>
<h1>Image credits</h1>
<p>Pictures in the landmark and painting categories come from Wikimedia Commons and are used under the licenses shown
(public domain, CC0, CC BY and CC BY-SA). Each entry links to the original file, author and license terms.</p>
<table><tr><th>Subject</th><th>Author / source</th><th>License</th><th>Original</th></tr>
%s</table><p><small>%d images.</small></p></body></html>''' % ('\n'.join(line(c) for c in rows),len(rows))
open('../../mn-alwahsh-updated/public/image-credits.html','w',encoding='utf-8').write(doc)
print('credits page written:',len(rows),'images')
