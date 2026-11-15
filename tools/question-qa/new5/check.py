"""usage: python3 new5/check.py new5/FILE.py  -> reports valid count (run from tools/question-qa)"""
import sys
exec(open('validate.py').read())
ns={}; exec(open(sys.argv[1],encoding='utf-8').read(),ns)
seen=set(); good=0
for q,o in ns['LIST']:
    k=_n(q).strip(); p=problems(q,o)
    if k in seen: print('DUP',q[:50]); continue
    seen.add(k)
    if p: print('INVALID',q[:60],'->',p[0]); continue
    good+=1
print(f'valid {good} of {len(ns["LIST"])}')
