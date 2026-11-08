exec(open('audit.py').read())
import time,os
def replace_invalid(t,c,newqs,target=180):
    col='questions' if t=='kids' else 'question'
    rows=live(t,c)
    os.makedirs('backups',exist_ok=True); json.dump(rows,open(f"backups/{t}_{c}_full_{int(time.time())}.json",'w'),ensure_ascii=False)
    valid=[];invalid=[]
    for r in rows:
        q=as_q(r,col)
        (valid if q and not problems(*q) else invalid).append(r)
    existing={_n(str(r.get(col))).strip() for r in valid}
    pool=[(q,o) for q,o in newqs if not problems(q,o) and _n(q).strip() not in existing]
    # dedupe pool
    seen=set(); p2=[]
    for q,o in pool:
        k=_n(q).strip()
        if k not in seen: seen.add(k); p2.append((q,o))
    need=max(0,target-len(valid))
    if len(p2)<need: print(f"  partial {c}: need {need}, have {len(p2)}")
    add=p2[:need]
    # per-tier target counts
    from collections import Counter
    vc=Counter(int(r['points']) for r in valid); tiers=[200,400,600]
    per={p:max(0,target//3-vc[p]) for p in tiers}
    tmpl=dict(rows[0]) if rows else {}
    ins=[];i=0
    for p in tiers:
        for _ in range(per[p]):
            if i>=len(add): break
            q,o=add[i]; i+=1
            r=dict(tmpl); r.update({col:q,'option_a':o[0],'option_b':o[1],'option_c':o[2],'option_d':o[3],'correct_answer':'A','points':p,'used':False})
            if 'report_count' in r: r['report_count']=0
            if 'image_url' in r: r['image_url']=None
            if 'id' in r: r.pop('id')
            ins.append(r)
    while i<len(add):
        q,o=add[i]; i+=1
        r=dict(tmpl); r.update({col:q,'option_a':o[0],'option_b':o[1],'option_c':o[2],'option_d':o[3],'correct_answer':'A','points':600,'used':False})
        if 'report_count' in r: r['report_count']=0
        if 'image_url' in r: r['image_url']=None
        r.pop('id',None); ins.append(r)
    # delete invalid rows individually by question text + option_a
    deficit=max(0,target-len(rows))
    ndel=max(0,len(ins)-deficit)
    for r in invalid[:ndel]:
        req('DELETE',f"{urllib.parse.quote(t)}?category=eq.{urllib.parse.quote(c)}&{col}=eq.{urllib.parse.quote(str(r.get(col)))}&option_a=eq.{urllib.parse.quote(str(r.get('option_a')))}")
    if ins: req('POST',urllib.parse.quote(t),ins)
    after=live(t,c)
    print(f"{c}: valid_kept={len(valid)} deleted={len(invalid)} added={len(ins)} now={len(after)}")
