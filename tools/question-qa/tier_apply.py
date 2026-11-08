"""usage: python3 tier_apply.py NN   (NN = category number, e.g. 07)
Reads tier_work/cat_NN.json (dump) and tier_work/out_NN.json = {"easy":[idx..],"hard":[idx..]}.
Every index not in easy/hard is medium. Refuses unless each tier holds 28%-38% of the rows."""
import sys,json,urllib.parse
exec(open('replace.py').read())
nn=sys.argv[1]
d=json.load(open(f'tier_work/cat_{nn}.json')); o=json.load(open(f'tier_work/out_{nn}.json'))
rows=d['rows']; c=d['category']; n=len(rows)
easy=set(o.get('easy',[])); hard=set(o.get('hard',[]))
valid={r['i'] for r in rows}
if easy&hard: sys.exit('REFUSED: an index is in both easy and hard')
if not (easy|hard)<=valid: sys.exit('REFUSED: unknown index '+str(sorted((easy|hard)-valid)[:5]))
ne,nh=len(easy),len(hard); nm=n-ne-nh
for name,k in (('easy',ne),('medium',nm),('hard',nh)):
    if not (0.28*n<=k<=0.38*n): sys.exit(f'REFUSED: {name} has {k} of {n} ({k/n:.0%}); each tier must be 28-38%')
json.dump(rows,open(f'tier_work/prev_{nn}.json','w'),ensure_ascii=False)
ch=0
for r in rows:
    new='200' if r['i'] in easy else ('600' if r['i'] in hard else '400')
    if r['pts']!=new:
        req('PATCH',f"Sin-Jim1?category=eq.{urllib.parse.quote(c)}&question=eq.{urllib.parse.quote(r['qkey'])}&option_a=eq.{urllib.parse.quote(r['akey'])}",{'points':new}); ch+=1
print(f'APPLIED {c}: {ne} easy / {nm} medium / {nh} hard, {ch} rows changed')
