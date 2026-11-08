import re
def _n(s): return re.sub(r'[ً-ْـ"«»؟?(),.:\-–]',' ',str(s or '')).replace('أ','ا').replace('إ','ا').replace('آ','ا').replace('ة','ه').replace('ى','ي').lower()
def _stem(w): return re.sub(r'^(وال|بال|لل|ال|و|ب)','',w)[:4]
def problems(q, opts):
    """opts[0] is the correct answer. Returns list of rule violations."""
    p=[]
    if len(opts)!=4 or any(not str(o).strip() for o in opts): p.append('empty option')
    if len({_n(o).strip() for o in opts})<4: p.append('duplicate options')
    if len({len(str(o).split()) for o in opts})>1: p.append('unequal word count')
    qs={_stem(w) for w in _n(q).split() if len(_stem(w))>=3}
    for w in _n(opts[0]).split():
        s=_stem(w)
        if len(s)>=3 and s in qs and not all(s in {_stem(x) for x in _n(o).split()} for o in opts[1:]):
            p.append(f'answer word "{w}" is in the question but not in every option')
    return p
