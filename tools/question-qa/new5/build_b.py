keys=['fawazeer','ramadan','econ','geoq','behavior']
for k in keys:
    out={}
    for t,n in (('easy','EASY'),('med','MEDIUM'),('hard','HARD')):
        l=[]
        for suffix in ('_b',''):   # new batch first, then leftovers from batch 1 that were not inserted
            ns={}; exec(open(f'new5/{k}_{t}{suffix}.py',encoding='utf-8').read(),ns); l+=ns['LIST']
        out[n]=l
    with open(f'new5/more_{k}.py','w',encoding='utf-8') as f:
        for n,l in out.items(): f.write(f'{n}={l!r}\n')
    print(k,{n:len(l) for n,l in out.items()})
