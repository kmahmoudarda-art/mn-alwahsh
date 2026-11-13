import random
random.seed(6)
def P(s): return [(p[0],p[1:]) for p in ([x.strip() for x in l.split('|')] for l in s.strip().splitlines()) if len(p)==5]
def wc(s): return len(s.split())
def build(items,pools):
    out=[]
    for q,c,pool in items:
        cand=[x for x in pools[pool] if x!=c]
        n=wc(c)
        same=[x for x in cand if wc(x)==n]
        less=[x for x in cand if wc(x)==n-1]
        more=[x for x in cand if wc(x)==n+1]
        random.shuffle(same);random.shuffle(less);random.shuffle(more)
        d=same[:3]
        if len(d)<3: d+=less[:3-len(d)]
        if len(d)<3: d+=more[:3-len(d)]
        if len(d)==3: out.append((q,[c]+d))
    return out
POOLS={
'ly2':'فتحي قورة,سمير محجوب,حسين السيد,محمد حمزة,نزار قباني,كامل الشناوي,صلاح جاهين,محسن الخياط,مصطفى الضمراني',
'ly3':'محمد علي أحمد,مرسي جميل عزيز,صلاح عبد الصبور,خالد بن سعود,محمود عبد الحي,عبد الرحمن الأبنودي,أحمد شفيق كامل,عبد الفتاح مصطفى',
'co':'علي فراج,محمد الموجي,منير مراد,كمال الطويل,بليغ حمدي,محمد عبد الوهاب,عبد الحليم نويرة,عبد العظيم محمد',
'dir':'إبراهيم عمارة,حلمي حليم,حلمي رفلة,هنري بركات,محمد كريم,صلاح أبو سيف,فطين عبد الوهاب,عاطف سالم,حسن الإمام,حسين كمال',
'yr':'1953,1954,1955,1956,1957,1958,1959,1960,1961,1962,1963,1964,1965,1966,1967,1968,1969,1970',
}
POOLS={k:v.split(',') for k,v in POOLS.items()}
POOLS['ly']=POOLS['ly2']+POOLS['ly3']
