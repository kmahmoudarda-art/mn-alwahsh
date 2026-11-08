exec(open('audit.py').read())
import re
def autofix(q,opts):
    o=[x.strip() for x in opts]
    for _ in range(2):
        f=[x.split() for x in o]
        if all(len(w)>1 for w in f) and len({w[0] for w in f})==1: o=[" ".join(w[1:]) for w in f]
    qs={_stem(w) for w in _n(q).split() if len(_stem(w))>=3}
    aw=o[0].split()
    if len(aw)>1:
        keep=[w for w in aw if _stem(_n(w).strip()) not in qs]
        if keep and len(keep)<len(aw): o[0]=" ".join(keep)
    return q,o
