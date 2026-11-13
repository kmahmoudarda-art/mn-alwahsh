exec(open('retier.py').read())
def fast_retier(t,c):
    col='questions' if t=='kids' else 'question'
    rows=live(t,c); n=len(rows)
    if not rows or 'id' not in rows[0]: return retier(t,c)
    sc=sorted(rows,key=lambda r:(score(str(r.get(col)),[str(r.get('option_a'))]),len(str(r.get(col)))))
    k=n//3; tiers={200:[],400:[],600:[]}
    for i,r in enumerate(sc):
        p=200 if i<k else (400 if i<2*k else 600)
        if int(r['points'])!=p: tiers[p].append(r['id'])
    ch=0
    for p,ids in tiers.items():
        for i in range(0,len(ids),100):
            chunk=ids[i:i+100]
            req('PATCH',f"{urllib.parse.quote(t)}?id=in.({','.join(map(str,chunk))})",{'points':str(p)}); ch+=len(chunk)
    print(c,'rows',n,'moved',ch)
