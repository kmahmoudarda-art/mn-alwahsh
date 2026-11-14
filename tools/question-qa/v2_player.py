# "خمن اللاعب": three previous clubs + current/last club -> name the player.
import random
exec(open('validate.py').read()); _problems=problems
ns={}; exec(open('v2_player_data.py',encoding='utf8').read(),ns); K=ns['K']; P=ns['P']
CAT="خمن اللاعب"; TABLE="Sin-Jim1"
def club_names(c): return [K[k] for k in c.split()]
EASY=set('كريستيانو رونالدو|نيمار|إيرلينغ هالاند|روبرت ليفاندوفسكي|محمد صلاح|كيفن دي بروين|لوكا مودريتش|سون هيونغ مين|زلاتان إبراهيموفيتش|تييري هنري|ديفيد بيكهام|لويس فيغو|أندريا بيرلو|رونالدو نازاريو|زين الدين زيدان|واين روني|آريين روبن|كاكا|ديدييه دروغبا|جانلويجي بوفون|سيرجيو أغويرو|ساديو ماني|نغولو كانتي|أشرف حكيمي|تيبو كورتوا|لويس سواريز|أنخيل دي ماريا|أنطوان غريزمان|فيرجيل فان دايك|سيرجيو راموس|مسعود أوزيل|روبن فان بيرسي|تشابي ألونسو|سيسك فابريغاس|ديفيد فيا|فرناندو توريس|فرانك لامبارد|مايكل أوين|إدينسون كافاني|فيكتور أوسيمين|ليروي ساني|رافائيل فاران|ماتيو كوفاتشيتش|هاكان تشالهان أوغلو|إدين دجيكو|راؤول غونزاليس|ميروسلاف كلوزه|ديفيد لويز|دييغو مارادونا|روبرتو باجيو|رود خوليت|يوهان كرويف|فرانتس بكنباور|ماركو ماتيرازي|لوتار ماتيوس|باولو روسي|هنريك مخيتاريان|برونو فرنانديز|عثمان ديمبيلي|بيبي'.split('|'))
HARD=set('باتريك كلويفرت|كلود ماكيليلي|مارسيل ديسايي|كلارنس سيدورف|نوانكو كانو|أليساندرو نيستا|روي كوستا|ريكاردو كارفاليو|إستيبان كامبياسو|بابلو سابالتا|هيديتوشي ناكاتا|فيرناندو يورينتي|جوليو باتيستا|خافيير سافيولا|إيفر بانيغا|ديميتري باييت|دييغو فورلان|ماركو فيراتي|إيسكو|بليز ماتويدي|جو هارت|غاري كاهيل|ماكسويل|جيلبرتو سيلفا|ديكو|إيمانويل بوتي|خافيير باستوري|آردا توران|ميراليم بيانيتش|إيفان راكيتيتش|ماريو غوميز|فيسلي شنايدر|كلاس يان هونتيلار|ديرك كاوت|يان فيرتونخن|ألكسندر كولاروف|مروان فلايني|دانيال ستوريدج|ميكيل أرتيتا|ممفيس ديباي|إيفان بيريشيتش|كيفن غاميرو|هكان شوكور|أندريا بارزالي|توبي ألدرفيريلد|ماريك هامشيك|إيميل هيسكي|يوهان كاباي|راميريز|جورجي هاجي|دافور شوكر|غايزكا مينديتا|يوري دجوركاييف|كريستيان بانوتشي|سينيشا ميهايلوفيتش|مانيش|جانلوكا باليوكا|يون دال توماسون|كريستيان فييري|يآب ستام|إيفان ثامورانو|روبير بيريس|لوكاس بودولسكي'.split('|'))
def build():
    rnd=random.Random(2026)
    careers={n:club_names(c) for n,t,a,c in P}
    T={200:[],400:[],600:[]}
    for n,t,act,c in P:
        t=200 if n in EASY else (600 if n in HARD else 400)
        cl=careers[n]
        # collapse consecutive duplicates
        seq=[x for i,x in enumerate(cl) if i==0 or x!=cl[i-1]]
        shown=seq[-4:]; prev,last=shown[:3],shown[3]
        if len(shown)<4: continue
        tail="، وهو يلعب حالياً في" if act else "، وأنهى مسيرته في"
        q=f"لاعب مرّ بهذه الأندية بالترتيب: {' ← '.join(prev)}{tail} {last}. من هو؟"
        pool=[m for m,_,a2,_ in P if m!=n]
        rnd.shuffle(pool)
        ok=[]
        for m in pool:
            if len(set(shown)&set(careers[m]))>=3: continue
            ok.append(m)
        # prefer same active status & similar word count
        same=[m for m in ok if next(a for x,_,a,_ in P if x==m)==act]
        cand=same+[m for m in ok if m not in same]
        wc=len(n.split())
        near=[m for m in cand if abs(len(m.split())-wc)<=1]
        best=None
        for i in range(60):
            rnd.shuffle(near)
            pick=near[:3]
            if len(pick)<3: break
            if not _problems(q,[n]+pick): best=pick; break
        if best is None: print('SKIP',n); continue
        T[t].append((q,[n]+best))
    return T
T=build()
if __name__=="__main__":
    exec(open('validate.py').read())
    print({k:len(v) for k,v in T.items()})
    for p,L in T.items():
        for q,o in L:
            pr=problems(q,o)
            if pr: print(p,q[:50],o,pr)
    for q,o in T[200][:3]: print(q,o)
