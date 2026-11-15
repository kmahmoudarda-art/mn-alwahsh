"""Top up an EXISTING category from 30 to 60 per tier (200/400/600).
usage (from tools/question-qa): python3 append_tiered.py FILE.py CATEGORY [--dry]
FILE.py defines EASY, MEDIUM, HARD (lists of (question,[correct,wrong,wrong,wrong])).
Each tier is topped up to exactly 60 rows in the DB; refuses if it cannot reach 60 valid, distinct new questions."""
import sys,urllib.parse
exec(open('validate.py').read()); exec(open('replace.py').read())
file,cat=sys.argv[1],sys.argv[2]; dry='--dry' in sys.argv; TARGET=60
ns={}; exec(open(file,encoding='utf-8').read(),ns)
old=req('GET',f"Sin-Jim1?select=question,points,slot&category=eq.{urllib.parse.quote(cat)}&limit=2000")
seen={_n(r['question']).strip() for r in old}
rows=[]; ok=True
for name,pts in [('EASY',200),('MEDIUM',400),('HARD',600)]:
    have=[r for r in old if str(r['points'])==str(pts)]; need=TARGET-len(have)
    good=[]
    for q,o in ns.get(name,[]):
        k=_n(q).strip(); p=problems(q,o)
        if k in seen: print(f'  duplicate dropped: {q[:50]}'); continue
        if p: print(f'  INVALID [{name}] {q[:55]} -> {p[0][:40]}'); continue
        seen.add(k); good.append((q,o))
    print(f'{name}: have {len(have)}, need {need}, new valid {len(good)}')
    if len(good)<need: ok=False
    start=sum(1 for r in have if r['slot']=='A')-sum(1 for r in have if r['slot']=='B')
    for j,(q,o) in enumerate(good[:need]):
        rows.append({'category':cat,'points':pts,'slot':'B' if (j+(1 if start>0 else 0))%2==0 else 'A','question':q,'option_a':o[0],'option_b':o[1],'option_c':o[2],'option_d':o[3],'correct_answer':'A','used':False,'report_count':0})
if not ok: sys.exit('REFUSED: not enough valid distinct new questions in a tier')
if dry: sys.exit(f'DRY RUN OK: would insert {len(rows)} rows into {cat}')
req('POST','Sin-Jim1',rows)
print(f'INSERTED {len(rows)} rows into {cat}')
