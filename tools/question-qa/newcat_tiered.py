"""Create a NEW category with exactly 30 easy (200) / 30 medium (400) / 30 hard (600) questions.
usage (from tools/question-qa):  python3 newcat_tiered.py FILE.py CATEGORY [--dry]
FILE.py must define EASY, MEDIUM, HARD: lists of (question, [correct, wrong, wrong, wrong]).
Refuses unless every tier has exactly 30 valid, distinct questions and the category does not exist yet."""
import sys,urllib.parse
exec(open('validate.py').read()); exec(open('replace.py').read())
file,cat=sys.argv[1],sys.argv[2]; dry='--dry' in sys.argv
ns={}; exec(open(file,encoding='utf-8').read(),ns)
tiers=[('EASY',200),('MEDIUM',400),('HARD',600)]
seen=set(); rows=[]; ok=True
for name,pts in tiers:
    good=[]
    for q,o in ns.get(name,[]):
        k=_n(q).strip(); p=problems(q,o)
        if k in seen: print(f'  duplicate dropped: {q[:50]}'); continue
        if p: print(f'  INVALID [{name}] {q[:55]} -> {p[0][:40]}'); continue
        seen.add(k); good.append((q,o))
    print(f'{name}: {len(good)} valid of {len(ns.get(name,[]))}')
    if len(good)<30: ok=False
    for j,(q,o) in enumerate(good[:30]):
        rows.append({'category':cat,'points':pts,'slot':'A' if j%2==0 else 'B','question':q,'option_a':o[0],'option_b':o[1],'option_c':o[2],'option_d':o[3],'correct_answer':'A','used':False,'report_count':0})
if not ok: sys.exit('REFUSED: need exactly 30 valid distinct questions in each tier (invalid ones are listed above)')
ex=req('GET',f"Sin-Jim1?select=question&category=eq.{urllib.parse.quote(cat)}&limit=1")
if ex: sys.exit(f'REFUSED: category {cat} already exists')
if dry: sys.exit(f'DRY RUN OK: would insert {len(rows)} rows into {cat}')
req('POST','Sin-Jim1',rows)
print(f'INSERTED {len(rows)} rows into {cat} (30/30/30)')
