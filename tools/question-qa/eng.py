import random
RE=random.Random(4)
V=[("Generous","كريم"),("Brave","شجاع"),("Honest","صادق"),("Lazy","كسول"),("Angry","غاضب"),("Polite","مهذب"),("Clever","ذكي"),("Patient","صبور"),("Proud","فخور"),("Shy","خجول"),
("Rare","نادر"),("Ancient","قديم"),("Huge","ضخم"),("Narrow","ضيق"),("Wealthy","ثري"),("Fragile","هش"),("Silent","صامت"),("Empty","فارغ"),("Bitter","مُر"),("Dangerous","خطير"),
("Library","مكتبة"),("Kitchen","مطبخ"),("Bridge","جسر"),("Island","جزيرة"),("Desert","صحراء"),("Mountain","جبل"),("Village","قرية"),("Harbor","ميناء"),("Castle","قلعة"),("Market","سوق"),
("Butterfly","فراشة"),("Eagle","نسر"),("Turtle","سلحفاة"),("Rabbit","أرنب"),("Wolf","ذئب"),("Camel","جمل"),("Dolphin","دلفين"),("Spider","عنكبوت"),("Bee","نحلة"),("Owl","بومة"),
("Borrow","يستعير"),("Forgive","يسامح"),("Celebrate","يحتفل"),("Whisper","يهمس"),("Destroy","يدمر"),("Explain","يشرح"),("Remember","يتذكر"),("Arrive","يصل"),("Choose","يختار"),("Climb","يتسلق")]
ANT=[("Hot","Cold"),("Big","Small"),("Fast","Slow"),("Happy","Sad"),("Early","Late"),("Heavy","Light"),("Rich","Poor"),("Strong","Weak"),("Begin","End"),("Win","Lose"),("Buy","Sell"),("Open","Close"),("Ask","Answer"),("Push","Pull"),("Dark","Bright")]
PAST=[("Go","Went"),("Eat","Ate"),("See","Saw"),("Write","Wrote"),("Buy","Bought"),("Think","Thought"),("Swim","Swam"),("Drink","Drank"),("Fly","Flew"),("Teach","Taught"),("Catch","Caught"),("Speak","Spoke"),("Take","Took"),("Bring","Brought"),("Run","Ran")]
def eng_qs():
    out=[]; ar=[a for _,a in V]; en=[e for e,_ in V]
    def o(a,pool):
        c=[x for x in pool if x!=a]; RE.shuffle(c); return [a]+c[:3]
    for e,a in V:
        out.append((f"ما معنى كلمة \"{e}\" بالعربية؟",o(a,ar)))
        out.append((f"ما الكلمة الإنجليزية التي تعني «{a}»؟",o(e,en)))
    allw=[x for p in ANT for x in p]
    for a,b in ANT: out.append((f"ما عكس كلمة \"{a}\" في الإنجليزية؟",o(b,[x for x in allw if x!=a])))
    pv=[p for _,p in PAST]
    for v,p in PAST: out.append((f"ما صيغة الماضي للفعل \"{v}\"؟",o(p,pv+[v+"ed" for v,_ in PAST])))
    return out
