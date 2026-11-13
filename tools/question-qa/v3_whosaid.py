# Who Said GOT v3: v2 set (53) + quotes whose speaker is given by at least one published quote list
# (Reedsy, Wiki of Thrones, Daily Dot, IBTimes, Winter Is Coming, GameRant, Portalist, Newsweek, Purewow)
# and matches the show. Only verified attributions are used, so the category stops short of 180.
import random
exec(open('validate.py').read())
ns={}; exec(open('v2_whosaid.py',encoding='utf8').read(),ns)
CAT=ns['CAT']; TABLE=ns['TABLE']; Q=ns['Q']
base={k:list(v) for k,v in ns['T'].items()}
POOL=["Tyrion Lannister","Cersei Lannister","Jaime Lannister","Tywin Lannister","Ned Stark","Robb Stark","Jon Snow","Sansa Stark","Arya Stark","Bran Stark",
"Daenerys Targaryen","Jorah Mormont","Petyr Baelish","Lord Varys","Olenna Tyrell","Margaery Tyrell","Stannis Baratheon","Robert Baratheon","Joffrey Baratheon",
"Davos Seaworth","Samwell Tarly","Maester Aemon","Ramsay Bolton","Roose Bolton","Oberyn Martell","Ellaria Sand","Yara Greyjoy","Theon Greyjoy","Euron Greyjoy",
"Missandei","Grey Worm","Daario Naharis","Lyanna Mormont","Sandor Clegane","Jaqen H'ghar","Syrio Forel","Gilly","Ygritte","Tormund Giantsbane","Brienne Tarth","Qyburn","Melisandre"]
rnd=random.Random(3)
def mk(q,ans):
    d=[p for p in POOL if p!=ans]
    for _ in range(400):
        rnd.shuffle(d); o=[ans]+d[:3]
        if not problems(q,o): return (q,o)
    return None
NEW=[
(200,"The next time you raise a hand to me will be the last time you have hands.","Daenerys Targaryen"),
(200,"You love your children. It's your one redeeming quality. That and your cheekbones.","Tyrion Lannister"),
(200,"I have a tender spot in my heart for cripples, bastards, and broken things.","Tyrion Lannister"),
(200,"I am Daenerys Stormborn of the blood of old Valyria and I will take what is mine, with fire and blood I will take it.","Daenerys Targaryen"),
(200,"If you ever call me 'Sister' again, I'll have you strangled in your sleep.","Cersei Lannister"),
(200,"The lords of Westeros are sheep. Are you a sheep? No, you're a dragon. Be a dragon.","Olenna Tyrell"),
(200,"Tell them the North remembers. Tell them winter came for House Frey.","Arya Stark"),
(200,"A lion doesn't concern himself with the opinions of a sheep.","Tywin Lannister"),
(200,"A wise man once said a true history of the world is a history of great conversations in elegant rooms.","Tyrion Lannister"),
(200,"All my life men like you have sneered at me. And all my life I've been knocking men like you into the dust.","Brienne Tarth"),
(400,"I will hurt you for this. A day will come when you think yourself safe and happy.","Tyrion Lannister"),
(400,"I did not do it. I did not kill Joffrey, but I wish that I had.","Tyrion Lannister"),
(400,"No need to seize the last word, Lord Baelish. I will assume it was something clever.","Sansa Stark"),
(400,"By what right does the wolf judge the lion?","Jaime Lannister"),
(400,"I thought if I could make something so good, so pure, maybe I'm not a monster.","Cersei Lannister"),
(400,"There's no justice in the world, not unless we make it. You loved your family. Avenge them.","Petyr Baelish"),
(400,"The gods have no mercy. That's why they're gods.","Cersei Lannister"),
(400,"It's the family name that lives on. It's all that lives on.","Tywin Lannister"),
(400,"It is rare to meet a Lannister who shares my enthusiasm for dead Lannisters.","Oberyn Martell"),
(400,"It's easy to confuse what is with what ought to be, especially when what is has worked out in your favor.","Tyrion Lannister"),
(400,"I'm not a politician, I'm a queen.","Daenerys Targaryen"),
(400,"I will answer injustice with justice.","Daenerys Targaryen"),
(400,"You will find little joy in your command. But, with luck, you'll find the strength to do what needs to be done.","Maester Aemon"),
(400,"I should wear the armor, and you the gown.","Cersei Lannister"),
(400,"No. I want to be the Queen.","Margaery Tyrell"),
(400,"I'm tired of reading about the achievements of better men.","Samwell Tarly"),
(400,"What is dead may never die. But kill the bastards anyway.","Yara Greyjoy"),
(400,"The true enemy won't wait out the storm. He brings the storm.","Jon Snow"),
(400,"I am Sansa Stark of Winterfell. This is my home, and you can't frighten me.","Sansa Stark"),
(400,"Thank you for all your many lessons, Lord Baelish. I will never forget them.","Sansa Stark"),
(400,"My name is Reek.","Theon Greyjoy"),
(400,"There is no word for 'thank you' in Dothraki.","Jorah Mormont"),
(400,"There is a beast in every man, and it stirs when you put a sword in his hand.","Jorah Mormont"),
(400,"A man has no name.","Jaqen H'ghar"),
(400,"I thought you might still be rowing.","Davos Seaworth"),
(400,"Good. Now go fail again.","Davos Seaworth"),
(600,"There's a war coming, Ned. I don't know when, I don't know who we'll be fighting, but it's coming.","Robert Baratheon"),
(600,"Disappeared? What, in a puff of smoke?","Tyrion Lannister"),
(600,"Don't fight for your king and don't fight for his kingdoms! Don't fight for honor, don't fight for glory.","Tyrion Lannister"),
(600,"Lady Stark. You may survive us yet.","Tyrion Lannister"),
(600,"You stand in the presence of Daenerys Stormborn of House Targaryen, rightful heir to the Iron Throne.","Missandei"),
(600,"He's never been a bastard. He's the heir to the Iron Throne.","Bran Stark"),
(600,"You love her. You really do love her. You poor fool. She'll be the end of you.","Olenna Tyrell"),
(600,"She was nothing like me. No meanness, no jealousy, just good.","Cersei Lannister"),
(600,"You are my weakness.","Grey Worm"),
(600,"They cheated at dice. Or maybe I cheated? Someone cheated.","Euron Greyjoy"),
(600,"I serve my queen because I want to serve my queen. Because I believe in her.","Missandei"),
(600,"Hush Hodor, no more Hodoring.","Bran Stark"),
(600,"Winter is here.","Sansa Stark"),
(600,"We have won the Great War. Now, we will win the last war.","Daenerys Targaryen"),
(600,"I wonder if you're the worst person I've ever met.","Olenna Tyrell"),
(600,"I may be small, Lord Glover, and I might be a girl, but I am every bit as much a Northerner as you.","Lyanna Mormont"),
]
T={t:list(v) for t,v in base.items()}
have={q for L in T.values() for q,_ in L}
for t,quote,sp in NEW:
    q=Q(quote)
    if q in have: continue
    r=mk(q,sp)
    if r: T[t].append(r); have.add(q)
    else: print('SKIP',quote[:40])
if __name__=="__main__":
    n=0
    for t,L in T.items():
        for q,o in L:
            n+=1
            pr=problems(q,o)
            if pr: print(t,q[:50],o,pr)
    print(n,{t:len(L) for t,L in T.items()})
