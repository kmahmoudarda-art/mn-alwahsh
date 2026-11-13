"""Build a picture-quiz category from a list file, using free images from Wikimedia Commons.

usage (from tools/question-qa):
  python3 build_pics.py landmarks|paintings [--insert]

Reads pics/landmarks_list.txt or pics/paintings_list.txt (sections ## EASY / ## MEDIUM / ## HARD,
lines: EnglishWikipediaTitle|arabic name|group|country-or-artist-in-arabic).
For every item it asks Wikidata for the item's image (P18), reads the file's license from Commons,
keeps only free licenses (public domain / CC0 / CC BY / CC BY-SA), checks the 500px thumbnail loads,
then picks 60 per tier and builds questions. Without --insert it only reports (dry run).
Rows go into the `Fam` table (the game reads image_url from there). Credits for every image are
written to pics/credits_<name>.json (CC BY / CC BY-SA need attribution)."""
import sys,re,json,time,random,urllib.parse,urllib.request
exec(open('validate.py').read()); exec(open('replace.py').read())
KIND=sys.argv[1]; INSERT='--insert' in sys.argv
CFG={'landmarks':dict(file='pics/landmarks_list.txt',cat='معالم العالم',q_name='ما اسم هذا المعلم؟',q_alt='في أي دولة يقع هذا المعلم؟'),
     'paintings':dict(file='pics/paintings_list.txt',cat='لوحات مشهورة',q_name='ما اسم هذه اللوحة؟',q_alt='من رسم هذه اللوحة؟')}[KIND]
for a_ in sys.argv:
    if a_.startswith('--list='): CFG['file']=a_[7:]
PER_TIER=int(next((a_[6:] for a_ in sys.argv if a_.startswith('--per=')),60)); UA={'User-Agent':'mnalwahsh-quiz-tools/1.0 (admin; image build)'}
def call(url):
    for i in range(8):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(url,headers=UA),timeout=40))
        except urllib.error.HTTPError as e:
            if e.code==429: time.sleep(6*(i+1)); continue
            raise
    raise RuntimeError('rate limited: '+url[:80])
# ---------- 1. parse the list ----------
items=[]; tier=None
for line in open(CFG['file'],encoding='utf-8').read().splitlines():
    line=line.strip()
    m=re.match(r'^##\s*(EASY|MEDIUM|HARD)',line)
    if m: tier=m.group(1); continue
    p=[x.strip() for x in line.split('|')]
    if tier and len(p)>=4 and p[0] and not line.startswith('#'): items.append(dict(tier=tier,title=p[0],ar=p[1],group=p[2],extra=p[3]))
seen=set(); uniq=[]
for it in items:
    k=it['title'].lower()
    if k in seen: continue
    seen.add(k); uniq.append(it)
items=uniq
print('items in list:',len(items),{t:sum(1 for i in items if i['tier']==t) for t in('EASY','MEDIUM','HARD')})
# ---------- 1b. resolve redirects / normalise titles on English Wikipedia ----------
def chunks(a,n): return [a[i:i+n] for i in range(0,len(a),n)]
canon={}
for ch in chunks([i['title'] for i in items],30):
    d=call("https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&titles="+urllib.parse.quote('|'.join(ch)))
    q=d.get('query',{}); norm={n['from']:n['to'] for n in q.get('normalized',[])}; red={r['from']:r['to'] for r in q.get('redirects',[])}
    for t in ch:
        x=norm.get(t,t); canon[t]=red.get(x,x)
    time.sleep(3)
for it in items: it['wtitle']=canon.get(it['title'],it['title'])
changed=sum(1 for it in items if it['wtitle']!=it['title'])
print('titles resolved through Wikipedia redirects:',changed)
# ---------- 2. Wikidata image (P18) ----------
def chunks(a,n): return [a[i:i+n] for i in range(0,len(a),n)]
bytitle={}
for ch in chunks(sorted({i['wtitle'] for i in items}),40):
    d=call("https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|sitelinks&sitefilter=enwiki&sites=enwiki&titles="+urllib.parse.quote('|'.join(ch)))
    for e in d.get('entities',{}).values():
        sl=e.get('sitelinks',{}).get('enwiki',{}).get('title')
        cl=e.get('claims',{}).get('P18',[])
        if sl and cl:
            pref=[c for c in cl if c.get('rank')=='preferred'] or cl
            bytitle[sl.replace('_',' ').lower()]=pref[0]['mainsnak']['datavalue']['value']
    time.sleep(2.5)
for it in items: it['file']=bytitle.get(it['wtitle'].replace('_',' ').lower())
# ---------- 3. Commons license + thumbnail ----------
info={}
files=sorted({i['file'] for i in items if i['file']})
for ch in chunks(files,40):
    d=call("https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=500&titles="+urllib.parse.quote('|'.join('File:'+f for f in ch)))
    for p in d['query']['pages'].values():
        ii=(p.get('imageinfo') or [None])[0]
        if not ii: continue
        em=ii.get('extmetadata',{}); g=lambda k:re.sub('<[^>]+>','',em.get(k,{}).get('value','')).strip()
        info[p['title'][5:].replace('_',' ')]=dict(thumb=ii.get('thumburl'),w=ii.get('width'),h=ii.get('height'),mime=ii.get('mime'),license=g('LicenseShortName'),artist=g('Artist')[:90],page=ii.get('descriptionurl'))
    time.sleep(2.5)
def clean_url(u):
    u=re.sub(r'^https://thumb\.wikimedia\.org/','https://upload.wikimedia.org/',u or '')
    return u.split('?')[0]
def lic_class(l):
    L=l.lower()
    if 'public domain' in L or L.startswith('pd') or 'cc0' in L or 'cc-zero' in L: return 'free'
    if re.match(r'^cc[ -]by(?![ -]nc)(?![ -]nd)',L): return 'attribution'
    return None
drop={'no image on Wikidata':0,'not on Commons':0,'license not free':0,'too small / odd shape / not jpg-png':0,'thumbnail did not load':0}
good=[]
for it in items:
    f=it['file']
    if not f: drop['no image on Wikidata']+=1; continue
    ii=info.get(f.replace('_',' '))
    if not ii: drop['not on Commons']+=1; continue
    lc=lic_class(ii['license'])
    if not lc: drop['license not free']+=1; continue
    if ii['mime'] not in('image/jpeg','image/png') or (ii['w'] or 0)<500 or not (0.45<=(ii['w']/max(ii['h'],1))<=2.6): drop['too small / odd shape / not jpg-png']+=1; continue
    ii['thumb']=clean_url(ii['thumb']); it['img']=ii; it['lic']=lc; good.append(it)
# ---------- 4. check the thumbnails really load; one image per file ----------
usedfile=set(); ok=[]
for it in good:
    if it['file'] in usedfile: continue
    try:
        r=urllib.request.urlopen(urllib.request.Request(it['img']['thumb'],method='HEAD',headers=UA),timeout=25); st=r.status
    except urllib.error.HTTPError as e: st=e.code
    except Exception: st=0
    if st!=200: drop['thumbnail did not load']+=1; continue
    usedfile.add(it['file']); ok.append(it); time.sleep(0.25)
print('usable images:',len(ok),{t:sum(1 for i in ok if i['tier']==t) for t in('EASY','MEDIUM','HARD')})
print('dropped:',drop)
# ---------- 5. questions ----------
pool=items   # distractors come from the whole list (names only)
rnd=random.Random(20261113)
def make(it,idx):
    use_alt = (idx%4==3)
    ans = it['extra'] if use_alt else it['ar']
    field = (lambda x:x['extra']) if use_alt else (lambda x:x['ar'])
    q = CFG['q_alt'] if use_alt else CFG['q_name']
    same=[x for x in pool if x is not it and field(x)!=ans and (x['group']==it['group'])]
    other=[x for x in pool if x is not it and field(x)!=ans and (x['group']!=it['group'])]
    for _ in range(400):
        base = same if (it['tier']!='EASY' and len(same)>=3) else other if len(other)>=3 else same+other
        # medium: mix; hard: all similar; easy: all different
        d = rnd.sample(base,3) if it['tier']!='MEDIUM' else rnd.sample(same,min(2,len(same)))+rnd.sample(other,3-min(2,len(same)))
        names=[field(x) for x in d]
        if len(set(names+[ans]))<4: continue
        if problems(q,[ans]+names): continue
        return q,[ans]+names
    return None
rows=[]; short=[]
for tname,pts in (('EASY',200),('MEDIUM',400),('HARD',600)):
    cand=[i for i in ok if i['tier']==tname]; made=[]
    for it in cand:
        r=make(it,len(made))
        if r: made.append((it,r))
        if len(made)==PER_TIER: break
    if len(made)<PER_TIER: short.append((tname,len(made)))
    for j,(it,(q,opts)) in enumerate(made):
        rows.append({'category':CFG['cat'],'points':pts,'slot':'A' if j%2==0 else 'B','question':q,'option_a':opts[0],'option_b':opts[1],'option_c':opts[2],'option_d':opts[3],'correct_answer':'A','used':False,'image_url':it['img']['thumb'],'report_count':0,'_credit':dict(title=it['title'],file=it['file'],license=it['img']['license'],artist=it['img']['artist'],page=it['img']['page'],needs_attribution=(it['lic']=='attribution'))})
print('questions built:',len(rows),{p:sum(1 for r in rows if r['points']==p) for p in(200,400,600)})
if short: print('SHORT TIERS (need more list items):',short)
na=sum(1 for r in rows if r['_credit']['needs_attribution'])
print(f'images needing attribution (CC BY / BY-SA): {na} of {len(rows)}')
TAG=KIND+('_test' if '--list=' in ' '.join(sys.argv) else '')
json.dump([r['_credit'] for r in rows],open(f"pics/credits_{TAG}.json",'w'),ensure_ascii=False,indent=1)
json.dump(rows,open(f"pics/preview_{TAG}.json",'w'),ensure_ascii=False)
if not INSERT or short: sys.exit('DRY RUN: nothing inserted' if not INSERT else 'REFUSED: every tier needs exactly 60')
for t in ('Fam','Sin-Jim1'):
    if req('GET',f"{urllib.parse.quote(t)}?select=question&category=eq.{urllib.parse.quote(CFG['cat'])}&limit=1"): sys.exit('REFUSED: category already exists in '+t)
out=[{k:v for k,v in r.items() if k!='_credit'} for r in rows]
for i in range(0,len(out),90): req('POST','Fam',out[i:i+90])
print(f"INSERTED {len(out)} rows into Fam / {CFG['cat']}")
