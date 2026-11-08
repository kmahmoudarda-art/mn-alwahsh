exec(open('audit.py').read())
import random
RD=random.Random(99)
def dist_fix_cat(t,c,dry=True):
    col='questions' if t=='kids' else 'question'
    rows=live(t,c)
    qs=[(r,as_q(r,col)) for r in rows]
    pool=[q[1][0] for r,q in qs if q]+[o for r,q in qs if q for o in q[1][1:]]
    pool=list(dict.fromkeys(p for p in pool if p))
    fixes=[]
    for r,q in qs:
        if not q: continue
        pr=problems(*q)
        if not pr or any('unequal' not in p for p in pr): continue
        a=q[1][0]; n=len(a.split())
        keep=[o for o in q[1][1:] if len(o.split())==n and _n(o).strip()!=_n(a).strip()]
        cand=[p for p in pool if len(p.split())==n and _n(p).strip()!=_n(a).strip() and p not in keep]
        RD.shuffle(cand)
        new=[a]+keep+cand[:3-len(keep)]
        if len(new)==4 and not problems(q[0],new): fixes.append((r,q,new))
    if not dry:
        for r,q,new in fixes:
            req('PATCH',f"{urllib.parse.quote(t)}?category=eq.{urllib.parse.quote(c)}&{col}=eq.{urllib.parse.quote(q[0])}&option_a=eq.{urllib.parse.quote(str(r['option_a']))}",
                {'option_a':new[0],'option_b':new[1],'option_c':new[2],'option_d':new[3],'correct_answer':'A'})
    return fixes
def dist_fix_homog(t,c,dry=True,key=lambda r,q:q[0]):
    col='questions' if t=='kids' else 'question'
    rows=live(t,c); qs=[(r,as_q(r,col)) for r in rows]
    from collections import defaultdict
    pools=defaultdict(list)
    for r,q in qs:
        if q: pools[key(r,q)].append(q[1][0])
    fixes=[]
    for r,q in qs:
        if not q: continue
        pr=problems(*q)
        if not pr or any('unequal' not in p and 'duplicate' not in p for p in pr): continue
        a=q[1][0]; n=len(a.split())
        pool=list(dict.fromkeys(p for p in pools[key(r,q)] if len(p.split())==n and _n(p).strip()!=_n(a).strip()))
        keep=[o for o in q[1][1:] if len(o.split())==n and _n(o).strip()!=_n(a).strip()]
        keep=list(dict.fromkeys(keep))
        cand=[p for p in pool if p not in keep]; RD.shuffle(cand)
        new=[a]+keep+cand[:3-len(keep)]
        if len(new)==4 and not problems(q[0],new): fixes.append((r,q,new))
    if not dry:
        for r,q,new in fixes:
            req('PATCH',f"{urllib.parse.quote(t)}?category=eq.{urllib.parse.quote(c)}&{col}=eq.{urllib.parse.quote(q[0])}&option_a=eq.{urllib.parse.quote(str(r['option_a']))}&option_b=eq.{urllib.parse.quote(str(r['option_b']))}",
                {'option_a':new[0],'option_b':new[1],'option_c':new[2],'option_d':new[3],'correct_answer':'A'})
    return fixes
