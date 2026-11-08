import json,time,os,sys
exec(open('fast_retier.py').read())
from collections import defaultdict,Counter
os.makedirs('backups',exist_ok=True)
SKIP={'حمو بيكا'}
def cats():
    rows=[];off=0
    while True:
        r=req('GET',f"Sin-Jim1?select=category&offset={off}&limit=1000&order=category")
        rows+=r
        if len(r)<1000: break
        off+=1000
    return sorted({r['category'] for r in rows if r['category']})
def finalize(c):
    L=live('Sin-Jim1',c)
    bad=[r for r in L if not(as_q(r,'question') and not problems(*as_q(r,'question')))]
    v=len(L)-len(bad)
    if v<160: return ('short',c,v)
    if bad:
        json.dump(bad,open(f"backups/final_removed_{c}_{int(time.time())}.json",'w'),ensure_ascii=False)
        if 'id' in bad[0]:
            ids=[r['id'] for r in bad]
            for i in range(0,len(ids),100):
                req('DELETE',f"Sin-Jim1?id=in.({','.join(map(str,ids[i:i+100]))})")
        else:
            for r in bad: req('DELETE',f"Sin-Jim1?category=eq.{urllib.parse.quote(c)}&question=eq.{urllib.parse.quote(str(r['question']))}&option_a=eq.{urllib.parse.quote(str(r['option_a']))}")
    L=live('Sin-Jim1',c); t=Counter(str(r['points']) for r in L)
    if max(t.values())-min(t.get(k,0) for k in ('200','400','600'))>max(6,len(L)//10): fast_retier('Sin-Jim1',c)
    L=live('Sin-Jim1',c); t=Counter(str(r['points']) for r in L)
    return ('ready',c,len(L),dict(t))
