exec(open('audit.py').read())
EASY=set("مصر السعودية الإمارات قطر الكويت الأردن العراق سوريا لبنان المغرب الجزائر تونس فرنسا ألمانيا إيطاليا إسبانيا بريطانيا أمريكا الصين اليابان روسيا البرازيل الأرجنتين الهند تركيا كندا أستراليا البرتغال اليونان القاهرة الرياض أبوظبي الدوحة عمّان بغداد دمشق بيروت الرباط باريس برلين روما مدريد لندن واشنطن بكين طوكيو موسكو أنقرة اليورو الدولار الين الجنيه الريال الدرهم الدينار الليرة".split())
MID=set("البحرين عُمان اليمن ليبيا السودان إيران باكستان إندونيسيا ماليزيا تايلاند كوريا هولندا بلجيكا سويسرا النمسا السويد النرويج الدنمارك بولندا المكسيك تشيلي كولومبيا نيجيريا كينيا جنوب أفريقيا أيرلندا فنلندا المنامة مسقط صنعاء طرابلس الخرطوم طهران إسلام آباد جاكرتا كوالالمبور بانكوك سول أمستردام بروكسل برن فيينا ستوكهولم أوسلو كوبنهاغن وارسو مكسيكو سانتياغو بوغوتا نيروبي دبلن هلسنكي أثينا لشبونة الروبية الفرنك الكرونة البيزو الروبل اليوان".split())
def score(q,o):
    s=_n(q+' '+o[0])
    toks=set(_n(q).split())|set(_n(o[0]).split())
    E={_n(x).strip() for x in EASY}; M={_n(x).strip() for x in MID}
    if toks & E: return 0
    if toks & M: return 1
    # numeric distance heuristic: years older -> harder
    import re
    ys=[int(y) for y in re.findall(r'\b(1[0-9]{3}|20[0-9]{2})\b',q)]
    if ys: return 0 if max(ys)>=2015 else (1 if max(ys)>=1990 else 2)
    if len(q)<35: return 0
    if len(q)<60: return 1
    return 2
def retier(t,c):
    col='questions' if t=='kids' else 'question'
    rows=live(t,c); n=len(rows)
    sc=sorted(rows,key=lambda r:(score(str(r.get(col)),[str(r.get('option_a'))]),len(str(r.get(col)))))
    k=n//3; plan=[]
    for i,r in enumerate(sc): plan.append((r,200 if i<k else (400 if i<2*k else 600)))
    ch=0
    for r,p in plan:
        if int(r['points'])!=p:
            req('PATCH',f"{urllib.parse.quote(t)}?category=eq.{urllib.parse.quote(c)}&{col}=eq.{urllib.parse.quote(str(r.get(col)))}&option_a=eq.{urllib.parse.quote(str(r.get('option_a')))}",{'points':p}); ch+=1
    print(c,'rows',n,'moved',ch)
