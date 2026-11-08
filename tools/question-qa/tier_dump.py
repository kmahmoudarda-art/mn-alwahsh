import json,urllib.parse
exec(open('validate.py').read()); exec(open('replace.py').read()); exec(open('fill.py').read())
rows=[];off=0
while True:
    r=req('GET',f"Sin-Jim1?select=category&offset={off}&limit=1000&order=category")
    rows+=r
    if len(r)<1000: break
    off+=1000
cats=sorted({r['category'] for r in rows if r['category']}-{'حمو بيكا','سبيستون'})
meta=[]
for i,c in enumerate(cats):
    L=live('Sin-Jim1',c)
    L.sort(key=lambda r:(str(r['question']),str(r['option_a'])))
    out=[]
    for j,r in enumerate(L):
        q=as_q(r,'question')
        if not q: continue
        out.append({'i':j,'q':q[0],'a':q[1][0],'wrong':q[1][1:],'pts':str(r['points']),'qkey':r['question'],'akey':str(r['option_a'])})
    json.dump({'category':c,'rows':out},open(f'tier_work/cat_{i:02d}.json','w'),ensure_ascii=False)
    meta.append((i,c,len(out)))
json.dump(meta,open('tier_work/index.json','w'),ensure_ascii=False)
print(len(meta),'categories,',sum(m[2] for m in meta),'questions')
