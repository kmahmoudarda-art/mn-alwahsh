import random
R=random.Random(2026)
def opts(ans,cands):
    out=[ans]
    for c in cands:
        if c not in out and len(out)<4: out.append(c)
    k=1
    while len(out)<4:
        for c in (ans+k,ans-k):
            if c not in out and len(out)<4 and (c>=0 or ans<0): out.append(c)
        k+=1
    return [str(x) for x in out]
def uniq(gen,n):
    seen=set();res=[];tries=0
    while len(res)<n and tries<20000:
        tries+=1
        q,o=gen()
        if q in seen: continue
        seen.add(q);res.append((q,o))
    return res
# ---------------- MATH ----------------
def m200():
    t=R.choice(['add','sub','mul','div','half'])
    if t=='add': a,b=R.randint(15,89),R.randint(12,79); s=a+b; return f"كم يساوي {a} + {b}؟",opts(s,[s+10,s-10,s+1])
    if t=='sub': a,b=R.randint(50,99),R.randint(12,48); s=a-b; return f"كم يساوي {a} − {b}؟",opts(s,[s+10,s-10,s-1])
    if t=='mul': a,b=R.randint(3,12),R.randint(3,12); s=a*b; return f"كم يساوي {a} × {b}؟",opts(s,[s+a,s-b,s+b])
    if t=='div': b=R.randint(3,12); s=R.randint(3,12); a=b*s; return f"كم يساوي {a} ÷ {b}؟",opts(s,[s+1,s-1,s+2])
    a=R.randrange(40,400,2); s=a//2; return f"كم يساوي نصف {a}؟",opts(s,[s+10,s-10,s+5])
def m400():
    t=R.choice(['pct','mul2','eq','sq','sum3'])
    if t=='pct':
        p=R.choice([10,20,25,50,75,5]); n=R.choice([40,60,80,120,160,200,240,300,400,500]); s=n*p//100
        if n*p%100: return m400()
        return f"كم يساوي {p}% من {n}؟",opts(s,[s*2,s+10,s//2 if s//2!=s else s+5])
    if t=='mul2': a,b=R.randint(12,49),R.randint(3,9); s=a*b; return f"كم يساوي {a} × {b}؟",opts(s,[s+b,s-b,s+10])
    if t=='eq': x=R.randint(3,15); a=R.randint(2,9); b=R.randint(1,20); return f"إذا كان {a}س + {b} = {a*x+b}، فكم قيمة س؟",opts(x,[x+1,x-1,x+2])
    if t=='sq': a=R.randint(11,20); s=a*a; return f"كم يساوي {a} × {a}؟",opts(s,[s+a,s-a,s+10])
    a,b,c=R.randint(20,99),R.randint(20,99),R.randint(20,99); s=a+b+c; return f"كم يساوي {a} + {b} + {c}؟",opts(s,[s+10,s-10,s+1])
def m600():
    t=R.choice(['frac','pct2','two','avg','disc','sqrt'])
    if t=='frac':
        d=R.choice([3,4,5,6,8]); nu=R.randint(2,d-1); n=d*R.randint(6,30); s=n*nu//d
        return f"كم يساوي {nu}/{d} من {n}؟",opts(s,[n//d,s+n//d,s-n//d])
    if t=='pct2':
        p=R.choice([15,35,45,12,30,40]); n=R.choice([60,80,120,140,160,200,240,300,360]); s=n*p/100
        if s!=int(s): return m600()
        s=int(s); return f"كم يساوي {p}% من {n}؟",opts(s,[s+6,s-6,s+12])
    if t=='two': a,b,c=R.randint(4,12),R.randint(4,12),R.randint(10,60); s=a*b-c; return f"كم يساوي {a} × {b} − {c}؟",opts(s,[a*(b-c) if a*(b-c)>0 else s+10,s+10,s-10])
    if t=='avg':
        xs=[R.randint(10,60) for _ in range(4)]; r=sum(xs)%4; xs[0]+= (4-r)%4; s=sum(xs)//4
        return f"ما متوسط الأعداد {xs[0]} و{xs[1]} و{xs[2]} و{xs[3]}؟",opts(s,[s+2,s-2,s+4])
    if t=='disc':
        p=R.choice([10,20,25,30]); n=R.choice([80,120,160,200,240,300,400]); s=n-n*p//100
        if n*p%100: return m600()
        return f"قميص سعره {n} درهم وعليه خصم {p}%، كم سعره بعد الخصم؟",opts(s,[n*p//100,s+10,s-10])
    a=R.randint(13,25); return f"ما الجذر التربيعي للعدد {a*a}؟",opts(a,[a+1,a-1,a+2])
MATH={200:uniq(m200,60),400:uniq(m400,60),600:uniq(m600,60)}
# ---------------- IQ (sequences & logic) ----------------
def seq_q(s,ans,cands): return "ما العدد التالي في السلسلة: "+"، ".join(map(str,s))+"، ؟",opts(ans,cands)
def iq200():
    t=R.choice(['ar','ar','geo2','desc'])
    if t=='ar': a,d=R.randint(1,30),R.randint(2,9); s=[a+d*i for i in range(5)]; n=a+5*d; return seq_q(s,n,[n+d,n-1,n+1])
    if t=='desc': a,d=R.randint(60,99),R.randint(3,9); s=[a-d*i for i in range(5)]; n=a-5*d; return seq_q(s,n,[n-d,n+1,n-1])
    a=R.randint(1,5); s=[a*2**i for i in range(5)]; n=a*32; return seq_q(s,n,[n-a*2,n+a*16,n+a*8])
def iq400():
    t=R.choice(['sq','geo3','alt','inc'])
    if t=='sq': k=R.randint(1,5); s=[(k+i)**2 for i in range(5)]; n=(k+5)**2; return seq_q(s,n,[n+1,n-(k+5),n+2*(k+5)])
    if t=='geo3': a=R.randint(1,3); s=[a*3**i for i in range(4)]; n=a*81; return seq_q(s,n,[a*54,a*72,a*90])
    if t=='alt': a,b,d=R.randint(1,9),R.randint(20,40),R.randint(2,5); s=[a,b,a+d,b+d,a+2*d,b+2*d]; n=a+3*d; return seq_q(s,n,[b+3*d,n+d,n-1])
    a=R.randint(1,10); s=[a];
    for i in range(1,5): s.append(s[-1]+i*2)
    n=s[-1]+10; return seq_q(s,n,[n-2,n+2,n+4])
def iq600():
    t=R.choice(['fib','x2p1','cube','mul_inc','diffsq'])
    if t=='fib': a,b=R.randint(1,5),R.randint(2,7); s=[a,b]
    if t=='fib':
        for _ in range(4): s.append(s[-1]+s[-2])
        n=s[-1]+s[-2]; return seq_q(s,n,[n+1,n-s[-3],s[-1]*2])
    if t=='x2p1': a=R.randint(1,12); s=[a]
    if t=='x2p1':
        for _ in range(4): s.append(s[-1]*2+1)
        n=s[-1]*2+1; return seq_q(s,n,[s[-1]*2,n+2,n-2])
    if t=='cube': k=R.randint(1,7); s=[(k+i)**3 for i in range(4)]; n=(k+4)**3; return seq_q(s,n,[(k+4)**2*(k+3),n+k+4,n-10])
    if t=='mul_inc': a=R.randint(1,6); s=[a]
    if t=='mul_inc':
        for i in range(2,6): s.append(s[-1]*i)
        n=s[-1]*6; return seq_q(s,n,[s[-1]*5,n+s[-1],n-s[-1]])
    a=R.randint(1,9); s=[a]
    for i in range(1,5): s.append(s[-1]+i*i)
    n=s[-1]+25; return seq_q(s,n,[n-9,n+11,n+1])
IQ={200:uniq(iq200,60),400:uniq(iq400,60),600:uniq(iq600,60)}
# ---------------- PUZZLES (word problems) ----------------
DAYS=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
NAMES=['أحمد','سارة','خالد','ليلى','عمر','نور','يوسف','مريم','علي','هدى']
def p200():
    t=R.choice(['day','legs','age1','change'])
    if t=='day':
        d=R.randrange(7); n=R.choice([3,4,5,9,10,11,12,15]); a=DAYS[(d+n)%7]
        o=[a,DAYS[(d+n+1)%7],DAYS[(d+n-1)%7],DAYS[(d+n+2)%7]]
        return f"إذا كان اليوم {DAYS[d]}، فأي يوم سيكون بعد {n} أيام؟",o
    if t=='legs': c,h=R.randint(2,9),R.randint(2,9); s=c*4+h*2; return f"في مزرعة {c} أبقار و{h} دجاجات، كم رِجلاً عندها جميعاً؟",opts(s,[s+2,s-2,(c+h)*4])
    if t=='age1': n=R.choice(NAMES); a=R.randint(8,20); y=R.randint(4,12); return f"عمر {n} الآن {a} سنة، كم سيكون عمره بعد {y} سنوات مضاعفاً؟",opts((a+y)*2,[a*2+y,(a+y)*2+2,(a+y)*2-2])
    p,q=R.randint(3,9)*5,R.choice([50,100]); return f"اشتريت أغراضاً بـ{q-p} درهماً ودفعت {q}، كم الباقي؟",opts(p,[p+5,p-5,p+10])
def p400():
    t=R.choice(['agesum','hand','ratio','clockh','pages'])
    if t=='agesum':
        k=R.choice([2,3]); y=R.randint(5,15); s=(k+1)*y
        return f"عمر الأب {k} أضعاف عمر ابنه، ومجموع عمريهما {s} سنة. كم عمر الابن؟",opts(y,[y+5,y-2,s//2])
    if t=='hand': n=R.randint(5,12); s=n*(n-1)//2; return f"في غرفة {n} أشخاص، صافح كل شخص الجميع مرة واحدة. كم مصافحة حدثت؟",opts(s,[n*n-n,n*(n+1)//2,s+n])
    if t=='ratio': a,b=R.randint(1,4),R.randint(2,5); k=R.randint(3,9); tot=(a+b)*k
    if t=='ratio':
        if a==b: return p400()
        return f"وُزّعت {tot} حبة حلوى بين ولدين بنسبة {a}:{b}. كم أخذ صاحب النصيب الأكبر؟",opts(max(a,b)*k,[tot//2,min(a,b)*k,max(a,b)*k+k])
    if t=='clockh': h=R.randint(1,11); return f"كم درجة الزاوية بين عقربي الساعة عند الساعة {h}:00 تماماً؟",opts(min(h,12-h)*30,[min(h,12-h)*30+30,360-min(h,12-h)*30 if min(h,12-h)*30!=180 else 90,min(h,12-h)*30-30 if h not in (1,11) else 15])
    p=R.randint(4,15); d=R.randint(8,30); return f"يقرأ طالب {p} صفحات كل يوم، كم يوماً يحتاج لإنهاء كتاب من {p*d} صفحة؟",opts(d,[d+2,d-2,d+5])
def p600():
    t=R.choice(['bat','work','clockm','headslegs','train'])
    if t=='bat':
        c=R.choice([5,10,15,20,25]); d=R.choice([100,50,200]); tot=2*c+d
        return f"مضرب وكرة سعرهما معاً {tot} فلساً، والمضرب أغلى من الكرة بـ{d} فلس. كم سعر الكرة؟",opts(c,[tot-d,c*2,c+5])
    if t=='work':
        a,b=R.choice([(3,6),(4,12),(6,3),(10,15),(12,6),(20,30),(6,12)]); s=a*b//(a+b)
        if a*b%(a+b): return p600()
        return f"عامل ينجز عملاً في {a} ساعات، وآخر في {b} ساعات. كم ساعة يحتاجان معاً؟",opts(s,[(a+b)//2,s+1,abs(a-b) if abs(a-b)!=s else s+2])
    if t=='clockm':
        h=R.randint(1,11); m=R.choice([30]); ang=abs(30*h-5.5*m); ang=min(ang,360-ang)
        if ang!=int(ang): return p600()
        ang=int(ang); return f"كم درجة الزاوية بين عقربي الساعة عند الساعة {h}:{m:02d}؟",opts(ang,[ang+15,abs(30*h-180) if abs(30*h-180)!=ang else ang+30,ang-15 if ang>15 else ang+45])
    if t=='headslegs':
        c,h=R.randint(3,12),R.randint(3,12); return f"في حظيرة دجاج وأرانب، عدد الرؤوس {c+h} وعدد الأرجل {4*c+2*h}. كم أرنباً فيها؟",opts(c,[h,c+1,c-1])
    v=R.choice([60,80,90,120]); tm=R.choice([30,45,90,15]); s=v*tm//60
    if v*tm%60: return p600()
    return f"قطار يسير بسرعة {v} كم/ساعة، كم كيلومتراً يقطع في {tm} دقيقة؟",opts(s,[v,s+10,s-10 if s>10 else s+20])
PZ={200:uniq(p200,60),400:uniq(p400,60),600:uniq(p600,60)}
