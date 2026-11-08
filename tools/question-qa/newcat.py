exec(open('validate.py').read()); exec(open('replace.py').read())
def insert_new(cat,L,table='Sin-Jim1'):
    seen=set(); Q=[]
    for q,o in L:
        k=_n(q).strip()
        if k in seen or problems(q,o): continue
        seen.add(k); Q.append((q,o))
    Q=Q[:180]
    ex=req('GET',f"{urllib.parse.quote(table)}?select=question&category=eq.{urllib.parse.quote(cat)}&limit=1")
    if ex: print(cat,'already exists — skipping insert'); return
    rows=[]
    for i,(q,o) in enumerate(Q):
        p=(200,400,600)[i%3]
        rows.append({'category':cat,'points':p,'slot':'A' if (i//3)%2==0 else 'B','question':q,'option_a':o[0],'option_b':o[1],'option_c':o[2],'option_d':o[3],'correct_answer':'A','used':False,'report_count':0})
    for i in range(0,len(rows),200): req('POST',urllib.parse.quote(table),rows[i:i+200])
    print(cat,'inserted',len(rows))
