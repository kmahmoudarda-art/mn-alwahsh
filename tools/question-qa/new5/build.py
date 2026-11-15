keys=['fawazeer','ramadan','econ','geoq','behavior']
for k in keys:
    out={}
    for t,n in (('easy','EASY'),('med','MEDIUM'),('hard','HARD')):
        ns={}; exec(open(f'new5/{k}_{t}.py',encoding='utf-8').read(),ns); out[n]=ns['LIST']
    with open(f'new5/final_{k}.py','w',encoding='utf-8') as f:
        for n,l in out.items(): f.write(f'{n}={l!r}\n')
    print(k,{n:len(l) for n,l in out.items()})
