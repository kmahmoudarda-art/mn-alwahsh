exec(open('validate.py').read()); exec(open('replace.py').read())
TBL={"جميل و هناء":"Fam","سياحة و سفر":"Fam","معلومات عامة":"Fam","عادات غريبة":"Fam","الغاز محيرة":"Fam","لمن الاغنية":"kids","Dubai Bling":"kids","فنانون عرب":"Fanan","أعلام العالم":"Flags","فلسفة":"falsafa"}
def apply_fixes(FIX):
    bad=[(k,problems(*v)) for k,v in FIX.items() if problems(*v)]
    if bad: print('BAD',bad); return
    n=0
    for (cat,oldq),(q,o) in FIX.items():
        t=TBL.get(cat,'Sin-Jim1'); col='questions' if t=='kids' else 'question'
        r=req('PATCH',f"{urllib.parse.quote(t)}?category=eq.{urllib.parse.quote(cat)}&{col}=eq.{urllib.parse.quote(oldq)}",{col:q,'option_a':o[0],'option_b':o[1],'option_c':o[2],'option_d':o[3],'correct_answer':'A'})
        n+=len(r)
        if not r: print('nomatch',cat,oldq)
    print('patched',n)
