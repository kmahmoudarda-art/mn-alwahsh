import json,urllib.parse,os,time
exec(open('validate.py').read()); exec(open('replace.py').read())
def load(f):
    ns={}; exec(open(f,encoding='utf8').read(),ns); return ns
def rows_from(ns,tmpl,qcol):
    out=[]; i=0
    for pts in (200,400,600):
        for k,(q,o) in enumerate(ns['T'][pts]):
            assert not problems(q,o),(q,problems(q,o))
            r=dict(tmpl); r.pop('id',None)
            r.update({'category':ns['CAT'],'points':pts if isinstance(tmpl['points'],int) else str(pts),'slot':'A' if k%2==0 else 'B',
                      qcol:q,'option_a':o[0],'option_b':o[1],'option_c':o[2],'option_d':o[3],'correct_answer':'A'})
            if 'report_count' in r: r['report_count']=0
            if 'image_url' in r: r['image_url']=None
            out.append(r)
    return out
def backup(name,rows):
    os.makedirs('backups',exist_ok=True)
    json.dump(rows,open(f'backups/{name}_{int(time.time())}.json','w'),ensure_ascii=False)
def replace_category(f,old_cat=None,table=None):
    ns=load(f); t=table or ns['TABLE']; qcol='questions' if t=='kids' else 'question'
    cat=old_cat or ns['CAT']; q=urllib.parse.quote
    old=req('GET',f"{q(t)}?select=*&category=eq.{q(cat)}&limit=1000")
    tmpl=dict(old[0]) if old else None
    if tmpl is None:
        tmpl=dict(req('GET',f"{q(t)}?select=*&limit=1")[0])
    new=rows_from(ns,tmpl,qcol)
    backup(f"{t}_{cat}",old)
    if old: req('DELETE',f"{q(t)}?category=eq.{q(cat)}")
    ins=req('POST',q(t),new)
    print(cat,'old',len(old),'new',len(ins))
if __name__=='__main__':
    import sys
    replace_category('v2_babhara.py')
    replace_category('v2_got.py')
    replace_category('v2_whosaid.py')
    replace_category('v2_riddles.py')
