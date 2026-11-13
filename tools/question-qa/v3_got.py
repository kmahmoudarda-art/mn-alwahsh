# Game of Thrones v3: previous 72 + ~110 questions built from English Wikipedia's episode list
# (titles, directors, writers) and the character list (actors, fates), plus house seats/sigils.
import random
ns={}; exec(open('v2_got.py',encoding='utf8').read(),ns)
CAT=ns['CAT']; TABLE=ns['TABLE']
base={k:list(v) for k,v in ns['T'].items()}
SEAS=["الموسم الأول","الموسم الثاني","الموسم الثالث","الموسم الرابع","الموسم الخامس","الموسم السادس","الموسم السابع","الموسم الثامن"]
EP={ # (season, number): (title, director, writers)
(1,1):("Winter Is Coming","Tim Van Patten","DB"),(1,2):("The Kingsroad","Tim Van Patten","DB"),(1,3):("Lord Snow","Brian Kirk","DB"),
(1,4):("Cripples, Bastards, and Broken Things","Brian Kirk","Cogman"),(1,5):("The Wolf and the Lion","Brian Kirk","DB"),
(1,7):("You Win or You Die","Daniel Minahan","DB"),(1,8):("The Pointy End","Daniel Minahan","Martin"),(1,9):("Baelor","Alan Taylor","DB"),(1,10):("Fire and Blood","Alan Taylor","DB"),
(2,1):("The North Remembers","Alan Taylor","DB"),(2,3):("What Is Dead May Never Die","Alik Sakharov","Cogman"),(2,4):("Garden of Bones","David Petrarca","Vanessa Taylor"),
(2,6):("The Old Gods and the New","David Nutter","Vanessa Taylor"),(2,9):("Blackwater","Neil Marshall","Martin"),(2,10):("Valar Morghulis","Alan Taylor","DB"),
(3,1):("Valar Dohaeris","Daniel Minahan","DB"),(3,3):("Walk of Punishment","David Benioff","DB"),(3,5):("Kissed by Fire","Alex Graves","Cogman"),
(3,7):("The Bear and the Maiden Fair","Michelle MacLaren","Martin"),(3,8):("Second Sons","Michelle MacLaren","DB"),(3,9):("The Rains of Castamere","David Nutter","DB"),(3,10):("Mhysa","David Nutter","DB"),
(4,2):("The Lion and the Rose","Alex Graves","Martin"),(4,3):("Breaker of Chains","Alex Graves","DB"),(4,4):("Oathkeeper","Michelle MacLaren","Cogman"),
(4,6):("The Laws of Gods and Men","Alik Sakharov","Cogman"),(4,8):("The Mountain and the Viper","Alex Graves","DB"),(4,9):("The Watchers on the Wall","Neil Marshall","DB"),(4,10):("The Children","Alex Graves","DB"),
(5,1):("The Wars to Come","Michael Slovis","DB"),(5,3):("High Sparrow","Mark Mylod","DB"),(5,5):("Kill the Boy","Jeremy Podeswa","Cogman"),(5,6):("Unbowed, Unbent, Unbroken","Jeremy Podeswa","Cogman"),
(5,7):("The Gift","Miguel Sapochnik","DB"),(5,8):("Hardhome","Miguel Sapochnik","DB"),(5,9):("The Dance of Dragons","David Nutter","DB"),(5,10):("Mother's Mercy","David Nutter","DB"),
(6,1):("The Red Woman","Jeremy Podeswa","DB"),(6,2):("Home","Jeremy Podeswa","Hill"),(6,3):("Oathbreaker","Daniel Sackheim","DB"),(6,5):("The Door","Jack Bender","DB"),
(6,6):("Blood of My Blood","Jack Bender","Cogman"),(6,7):("The Broken Man","Mark Mylod","Cogman"),(6,8):("No One","Mark Mylod","DB"),(6,9):("Battle of the Bastards","Miguel Sapochnik","DB"),(6,10):("The Winds of Winter","Miguel Sapochnik","DB"),
(7,1):("Dragonstone","Jeremy Podeswa","DB"),(7,2):("Stormborn","Mark Mylod","Cogman"),(7,3):("The Queen's Justice","Mark Mylod","DB"),(7,4):("The Spoils of War","Matt Shakman","DB"),
(7,5):("Eastwatch","Matt Shakman","Hill"),(7,6):("Beyond the Wall","Alan Taylor","DB"),(7,7):("The Dragon and the Wolf","Jeremy Podeswa","DB"),
(8,1):("Winterfell","David Nutter","Hill"),(8,2):("A Knight of the Seven Kingdoms","David Nutter","Cogman"),(8,3):("The Long Night","Miguel Sapochnik","DB"),(8,4):("The Last of the Starks","David Nutter","DB"),
(8,5):("The Bells","Miguel Sapochnik","DB"),(8,6):("The Iron Throne","David Benioff & D. B. Weiss","DB"),
}
DIR_AR={"Brian Kirk":"براين كيرك","Daniel Minahan":"دانيال مينهان","Alan Taylor":"آلان تيلور","Alik Sakharov":"أليك ساخاروف","David Petrarca":"ديفيد بيتراركا",
"David Nutter":"ديفيد ناتر","Neil Marshall":"نيل مارشال","Alex Graves":"أليكس غريفز","Michelle MacLaren":"ميشيل ماكلارين","Michael Slovis":"مايكل سلوفيس",
"Mark Mylod":"مارك ميلود","Jeremy Podeswa":"جيريمي بوديسوا","Miguel Sapochnik":"ميغيل ساباتشنيك","Daniel Sackheim":"دانيال ساكهايم","Jack Bender":"جاك بندر","Matt Shakman":"مات شاكمان","David Benioff":"ديفيد بينيوف"}
exec(open('validate.py').read())
rnd=random.Random(11)
def mk(q,ans,pool,tries=300):
    pool=list(pool)
    for _ in range(tries):
        rnd.shuffle(pool); o=[ans]+pool[:3]
        if not problems(q,o): return (q,o)
    return None
X={200:[],400:[],600:[]}
# A) director of a notable episode
DIR_EPS=[(1,3),(1,9),(2,9),(3,9),(4,2),(4,8),(4,9),(5,8),(5,9),(6,5),(6,9),(6,10),(7,4),(7,6),(8,3),(8,5),(3,7),(5,7),(4,10),(2,6),(1,7),(7,3),(8,4),(3,10),(6,1)]
for k in DIR_EPS:
    t,d,w=EP[k]
    if d not in DIR_AR: continue
    r=mk(f"من أخرج حلقة «{t}»؟",DIR_AR[d],[v for n,v in DIR_AR.items() if n!=d])
    if r: X[600 if k[0]<=2 or k[1] in (1,3,7) else 400].append(r)
# B) season of an episode
for k in [(1,9),(1,10),(2,9),(3,9),(4,2),(4,8),(4,9),(5,8),(6,5),(6,9),(6,10),(7,7),(7,6),(8,3),(8,5),(8,6),(5,10),(3,10),(2,10),(4,10),(6,2),(7,4),(1,1),(5,6)]:
    t=EP[k][0]; correct=SEAS[k[0]-1]
    d=[s for s in SEAS if s!=correct]; rnd.shuffle(d)
    X[400 if k[0] in (1,2,3,4) else 600].append((f"في أي موسم عُرضت حلقة «{t}»؟",[correct]+d[:3]))
# C) Martin wrote four episodes
MARTIN=[EP[k][0] for k,v in EP.items() if v[2]=="Martin"]
others=[v[0] for k,v in EP.items() if v[2]!="Martin"]
for m in MARTIN:
    q=f"من كتب سيناريو حلقة «{m}»؟"
    X[600].append((q,["جورج مارتن","براين كوغمان","دايف هيل","فانيسا تايلور"]))
# D) event -> episode title
EV=[("ما اسم الحلقة التي أُعدم فيها نيد ستارك؟","Baelor"),("ما اسم الحلقة التي وقع فيها العرس الأحمر؟","The Rains of Castamere"),
("ما اسم حلقة العرس الأرجواني التي مات فيها جوفري؟","The Lion and the Rose"),("ما اسم الحلقة التي قُتل فيها أوبرين مارتل؟","The Mountain and the Viper"),
("ما اسم حلقة معركة هاردهوم؟","Hardhome"),("ما اسم حلقة معركة الأوغاد بين جون ورامزي؟","Battle of the Bastards"),
("ما اسم الحلقة التي فجّرت فيها سيرسي الكنيسة بالنار البرية؟","The Winds of Winter"),("ما اسم الحلقة التي حاصر فيها ستانيس كينغز لاندينغ؟","Blackwater"),
("ما اسم حلقة المعركة الكبرى ضد جيش الموتى في وينترفيل؟","The Long Night"),("ما اسم الحلقة التي أُحرقت فيها كينغز لاندينغ؟","The Bells"),
("ما اسم الحلقة الأخيرة من المسلسل؟","The Iron Throne"),("ما اسم الحلقة التي ماتت فيها شخصية هودور؟","The Door"),
("ما اسم الحلقة التي عاد فيها جون سنو إلى الحياة؟","Home"),("ما اسم الحلقة الأخيرة من الموسم الأول؟","Fire and Blood"),
("ما اسم الحلقة الأخيرة من الموسم الثاني؟","Valar Morghulis"),("ما اسم الحلقة الأخيرة من الموسم الثالث؟","Mhysa"),
("ما اسم الحلقة الأخيرة من الموسم الرابع؟","The Children"),("ما اسم الحلقة الأخيرة من الموسم الخامس؟","Mother's Mercy"),
("ما اسم الحلقة الأخيرة من الموسم السابع؟","The Dragon and the Wolf"),("ما اسم الحلقة الأولى من المسلسل؟","Winter Is Coming"),
("ما اسم الحلقة الأولى من الموسم الثامن؟","Winterfell"),("ما اسم الحلقة الأولى من الموسم السابع؟","Dragonstone"),
]
alltitles=[v[0] for v in EP.values()]
for q,ans in EV:
    r=mk(q,ans,[t for t in alltitles if t!=ans])
    if r: X[400 if ("الأخيرة" in q or "الأولى" in q) else 600].append(r)
    else: print('SKIP',q)
# E) actors / fates / dates (English Wikipedia, characters + series pages)
FACT=[
(200,"من الممثل الذي جسّد شخصية روبرت باراثيون؟",["مارك أدي","شون بين","ستيفن ديلان","تشارلز دانس"]),
(200,"من الممثل الذي جسّد شخصية نيد ستارك؟",["شون بين","مارك أدي","ريتشارد ماديسون","إيان غلين"]),
(200,"من الممثلة التي جسّدت شخصية كاتلين ستارك؟",["ميشيل فيرلي","لينا هيدي","صوفي تيرنر","ميزي ويليامز"]),
(200,"من الممثل الذي جسّد شخصية روب ستارك؟",["ريتشارد ماديسون","كيت هارينغتون","ألفي ألين","هاري لويد"]),
(400,"من الممثل الذي جسّد شخصية ثيون غريجوي؟",["ألفي ألين","هاري لويد","ريتشارد ماديسون","بيتر دينكلاج"]),
(400,"من الممثل الذي جسّد شخصية فيسيريس تارغاريان؟",["هاري لويد","ألفي ألين","كيت هارينغتون","إيان غلين"]),
(400,"من الممثل الذي جسّد شخصية جورا مورمونت؟",["إيان غلين","شون بين","هاري لويد","ألفي ألين"]),
(400,"من الممثل الذي جسّد شخصية ستانيس باراثيون؟",["ستيفن ديلان","مارك أدي","إيان غلين","كونليث هيل"]),
(400,"من الممثل الذي جسّد شخصية ملك الدوثراكي خال دروغو؟",["جيسون موموا","كيت هارينغتون","بيدرو باسكال","روري ماكان"]),
(400,"من الممثل الذي جسّد شخصية ساندور كليغان الملقب بالكلب؟",["روري ماكان","جيروم فلين","جيسون موموا","كونليث هيل"]),
(400,"من الممثل الذي جسّد شخصية العصفور الأعلى؟",["جوناثان برايس","شون بين","مارك أدي","إيان غلين"]),
(200,"كيف مات فيسيريس تارغاريان؟",["بالذهب المصهور","بسيف مسلول","بسم قاتل","بنار برية"]),
(400,"كيف مات روب ستارك في العرس الأحمر؟",["طعنه روز بولتون","شنقه ولدر فراي","سمّه جوفري","أحرقته سيرسي"]),
(400,"ما الذي تسبب في مقتل الملك روبرت؟",["خنزير بري","سم سيرسي","سيف جايمي","شنق نيد"]),
(400,"من قتل ثيون غريجوي أثناء دفاعه عن وينترفيل؟",["ملك الليل","رامزي بولتون","جون سنو","سيرسي لانستر"]),
(400,"كيف مات جورا مورمونت؟",["دفاعاً عن دينيريس","في العرس الأحمر","في معركة الأوغاد","في الجدار العظيم"]),
(400,"كيف مات جايمي لانستر؟",["مع أخته سيرسي","في العرس الأحمر","في معركة هاردهوم","في معركة الأوغاد"]),
(400,"أي عائلة حكمت ويستروس قبل أن يستولي باراثيون على العرش؟",["آل تارغاريان","آل لانستر","آل ستارك","آل تايريل"]),
(600,"في أي شهر عُرض الموسم السابع؟",["يوليو","أبريل","مارس","أغسطس"]),
(600,"في أي شهر عُرضت الحلقة الأولى من الموسم الثامن؟",["أبريل","يوليو","مارس","يونيو"]),
(600,"في أي عام عُرضت الحلقة الأخيرة من المسلسل؟",["2019","2017","2018","2020"]),
(600,"في أي عام عُرض الموسم السادس؟",["2016","2014","2015","2017"]),
(600,"كم عدد حلقات الموسم السابع؟",["7","10","6","8"]),
(600,"كم عدد حلقات الموسم الثامن؟",["6","7","10","8"]),
(400,"كم عدد حلقات كل موسم من المواسم الستة الأولى؟",["10","8","12","7"]),
(400,"في أي مدينة تقع استوديوهات التصوير الرئيسية في إيرلندا الشمالية؟",["بلفاست","دبلن","كورك","غلاسكو"]),
(600,"في أي بلد صُوّرت مشاهد وراء الجدار الجليدية؟",["أيسلندا","المغرب","كرواتيا","مالطا"]),
(600,"في أي مدينة مغربية صُوّرت مشاهد أستابور؟",["الصويرة","فاس","طنجة","مراكش"]),
]
for t,q,o in FACT:
    X[t].append((q,o))
# F) houses: seats, sigils, words (canon; seats/sigils confirmed on the show)
HOUSE=[
(200,"ما شعار آل غريجوي؟",["الكراكن","الذئب","الأسد","التنين"]),
(400,"ما شعار آل تايريل؟",["الوردة","الذئب","الأسد","التنين"]),
(400,"ما اسم مقر آل مارتل؟",["سنسبير","هايغاردن","وينترفيل","رايفررن"]),
(400,"ما اسم مقر آل غريجوي؟",["بايك","سنسبير","هايغاردن","رايفررن"]),
(400,"ما اسم مقر آل تولي؟",["رايفررن","بايك","سنسبير","هايغاردن"]),
(400,"ما شعار آل تولي؟",["السمكة","الوردة","الذئب","الصقر"]),
(400,"ما شعار آل مارتل؟",["الشمس والرمح","الذئب الرمادي","الأسد الذهبي","الصقر الأزرق"]),
(400,"ما اسم مقر آل آرن؟",["العش","بايك","سنسبير","رايفررن"]),
(400,"ما شعار آل مورمونت؟",["الدب","الذئب","الأسد","الصقر"]),
(600,"ما اسم مقر آل باراثيون الأصلي؟",["نهاية العاصفة","جزيرة التنين","هايغاردن","وينترفيل"]),
(600,"ما اسم مقر آل بولتون؟",["الرعب","وينترفيل","رايفررن","بايك"]),
(600,"ما شعار آل بولتون؟",["الرجل المسلوخ","الذئب الرمادي","الوردة الذهبية","الدب الأسود"]),
(600,"ما شعار آل فراي؟",["البرجان","الدب","السمكة","الصقر"]),
(600,"ما شعار آل تارلي؟",["الصياد","الدب","الصقر","الذئب"]),
(400,"ما اسم تنين دينيريس الذي سُمّي تيمناً بزوجها الراحل؟",["دروغون","ريغال","فيسيريون","بالاريون"]),
(400,"ما اسم تنين دينيريس الذي سُمّي تيمناً بأخيها؟",["فيسيريون","دروغون","ريغال","بالاريون"]),
(400,"ما اسم تنين دينيريس الذي سُمّي تيمناً بأخي دينيريس الراحل رايغار؟",["ريغال","دروغون","فيسيريون","بالاريون"]),
(200,"ما اسم ذئب سانسا ستارك؟",["ليدي","الشبح","الرياح","الصيف"]),
(400,"ما اسم ذئب بران ستارك؟",["الصيف","الشبح","ليدي","الظل"]),
(400,"ما اسم ذئب ريكون ستارك؟",["شاغيدوغ","الصيف","ليدي","الشبح"]),
(400,"ما اسم سيف آل تارلي؟",["هارتسبين","الفجر","المخلب","الإبرة"]),
(600,"ما اسم سيف آل دايون الأسطوري؟",["الفجر","الجليد","المخلب","الإبرة"]),
]
for t,q,o in HOUSE: X[t].append((q,o))
T={}
for t in (200,400,600):
    seen=set(); out=[]
    for q,o in base[t]+X[t]:
        if q in seen: continue
        seen.add(q); out.append((q,o))
    T[t]=out
# rebalance tiers to 60/60/60 (easy = famous events, main-cast actors, wolves/dragons; trim weakest director/season-of items)
allq=[(q,o,t) for t in (200,400,600) for q,o in T[t]]
EASY_KEYS=['أُعدم فيها نيد','العرس الأحمر','العرس الأرجواني','المسلسل؟','الكنيسة بالنار','أُحرقت فيها','ما اسم ذئب','تنين دينيريس','ما اسم الحلقة الأخيرة من الموسم الأول','الموسم الثاني؟','جسّد شخصية روبرت','جسّد شخصية روب','ثيون غريجوي؟','جسّد شخصية نيد','كاتلين','الحلقة الأولى من الموسم الثامن','الحلقة الأولى من الموسم السابع','كيف مات جايمي','كيف مات جورا','من قتل ثيون','ما شعار آل مارتل','ما شعار آل تايريل','ما اسم مقر آل مارتل','ما اسم مقر آل تولي','ما شعار آل تولي','ما شعار آل مورمونت','هاردهوم','الأوغاد','هودور','عاد فيها جون','أوبرين مارتل؟','ستانيس كينغز','ما الذي تسبب','ما اسم مقر آل غريجوي','ما اسم مقر آل آرن']
def easy(q): return any(k in q for k in EASY_KEYS)
E=[(q,o) for q,o,t in allq if t==200 or easy(q)]
rest=[(q,o,t) for q,o,t in allq if not (t==200 or easy(q))]
DROP_FIRST=['من أخرج حلقة','في أي موسم عُرضت']
rest.sort(key=lambda x:(any(k in x[0] for k in DROP_FIRST),),reverse=False)
M=[(q,o) for q,o,t in rest if t==400]; H=[(q,o) for q,o,t in rest if t==600]
import random as _r
_r.Random(5).shuffle(E)
extraE=E[60:]; E=E[:60]
M=M+extraE
# move surplus from hardest bucket up if needed
total=len(E)+len(M)+len(H)
while len(M)>60 and len(H)<60: H.append(M.pop())
while len(H)>60: H.pop()
while len(M)>60: M.pop()
T={200:E,400:M,600:H}
if __name__=="__main__":
    exec(open('validate.py').read())
    n=0
    for t,L in T.items():
        for q,o in L:
            n+=1
            pr=problems(q,o)
            if pr: print(t,q,o,pr)
    print(n,{t:len(L) for t,L in T.items()})
