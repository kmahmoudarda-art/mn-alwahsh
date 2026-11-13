# "خمن اللاعب": three previous clubs + current/last club -> name the player.
import random
exec(open('validate.py').read()); _problems=problems
ns={}; exec(open('v2_player_data.py',encoding='utf8').read(),ns); K=ns['K']; P=ns['P']
CAT="خمن اللاعب"; TABLE="Sin-Jim1"
def club_names(c): return [K[k] for k in c.split()]
def build():
    rnd=random.Random(2026)
    careers={n:club_names(c) for n,t,a,c in P}
    T={200:[],400:[],600:[]}
    for n,t,act,c in P:
        cl=careers[n]
        # collapse consecutive duplicates
        seq=[x for i,x in enumerate(cl) if i==0 or x!=cl[i-1]]
        shown=seq[-4:]; prev,last=shown[:3],shown[3]
        if len(shown)<4: continue
        tail="، وهو يلعب حالياً في" if act else "، وأنهى مسيرته في"
        q=f"لاعب مرّ بهذه الأندية بالترتيب: {' ← '.join(prev)}{tail} {last}. من هو؟"
        pool=[m for m,_,a2,_ in P if m!=n]
        rnd.shuffle(pool)
        ok=[]
        for m in pool:
            if len(set(shown)&set(careers[m]))>=3: continue
            ok.append(m)
        # prefer same active status & similar word count
        same=[m for m in ok if next(a for x,_,a,_ in P if x==m)==act]
        cand=same+[m for m in ok if m not in same]
        wc=len(n.split())
        near=[m for m in cand if abs(len(m.split())-wc)<=1]
        best=None
        for i in range(60):
            rnd.shuffle(near)
            pick=near[:3]
            if len(pick)<3: break
            if not _problems(q,[n]+pick): best=pick; break
        if best is None: print('SKIP',n); continue
        T[t].append((q,[n]+best))
    return T
T=build()
if __name__=="__main__":
    exec(open('validate.py').read())
    print({k:len(v) for k,v in T.items()})
    for p,L in T.items():
        for q,o in L:
            pr=problems(q,o)
            if pr: print(p,q[:50],o,pr)
    for q,o in T[200][:3]: print(q,o)
