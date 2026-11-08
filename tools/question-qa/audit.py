import json,glob,collections,urllib.parse
exec(open('validate.py').read()); exec(open('replace.py').read())
def live(table,cat):
    rows=[];off=0
    while True:
        r=req('GET',f"{urllib.parse.quote(table)}?select=*&category=eq.{urllib.parse.quote(cat)}&offset={off}&limit=1000")
        rows+=r
        if len(r)<1000: break
        off+=1000
    return rows
def as_q(r,qcol):
    ks=['option_a','option_b','option_c','option_d']; ca=(r.get('correct_answer') or 'A').strip().upper()
    if ca not in 'ABCD' or not ca: return None
    i='ABCD'.index(ca); opts=[str(r.get(k) or '').strip() for k in ks]
    return (str(r.get(qcol) or '').strip(), [opts[i]]+[o for j,o in enumerate(opts) if j!=i])
