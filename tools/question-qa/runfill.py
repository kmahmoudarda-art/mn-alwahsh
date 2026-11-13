exec(open('validate.py').read()); exec(open('replace.py').read()); exec(open('fill.py').read())
def run(cat, L, drop=()):
    L=[(q,o) for q,o in L if not any(d in q for d in drop)]
    ex=[set(_n(r['question']).split()) for r in live('Sin-Jim1',cat)]
    def near(q):
        a=set(_n(q).split())
        return any(len(a&b)/max(1,len(a|b))>0.7 for b in ex)
    L=[(q,o) for q,o in L if not near(q)]
    replace_invalid('Sin-Jim1',cat,L)
    rows=live('Sin-Jim1',cat)
    v=sum(1 for r in rows if as_q(r,'question') and not problems(*as_q(r,'question')))
    print(cat,len(rows),v)
