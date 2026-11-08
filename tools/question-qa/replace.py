import json,urllib.request,urllib.parse,os,time
BASE='https://cqqeyvhofbnvjemoihca.supabase.co/rest/v1/'
H={'apikey':'proxy-injected','Content-Type':'application/json','Prefer':'return=representation'}
def req(method,path,body=None):
  rq=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,method=method,headers=H)
  with urllib.request.urlopen(rq) as r: return json.load(r)
def replace_tier(table,category,points,newqs,qcol='question'):
  f=f"category=eq.{urllib.parse.quote(category)}&points=eq.{points}"
  old=req('GET',f"{urllib.parse.quote(table)}?select=*&{f}")
  os.makedirs('backups',exist_ok=True)
  json.dump(old,open(f"backups/{table}_{category}_{points}_{int(time.time())}.json",'w'),ensure_ascii=False)
  assert len(old)==len(newqs),(category,points,len(old),len(newqs))
  rows=[]
  for o,(q,opts) in zip(sorted(old,key=lambda r:str(r.get('slot'))),newqs):
    r=dict(o); r.update({qcol:q,'option_a':opts[0],'option_b':opts[1],'option_c':opts[2],'option_d':opts[3],'correct_answer':'A'})
    if 'report_count' in r: r['report_count']=0
    rows.append(r)
  req('DELETE',f"{urllib.parse.quote(table)}?{f}")
  ins=req('POST',urllib.parse.quote(table),rows)
  return len(old),len(ins)
def replace_flex(table,category,points,newqs,qcol='question'):
  f=f"category=eq.{urllib.parse.quote(category)}&points=eq.{points}"
  old=req('GET',f"{urllib.parse.quote(table)}?select=*&{f}")
  os.makedirs('backups',exist_ok=True)
  json.dump(old,open(f"backups/{table}_{category}_{points}_{int(time.time())}.json",'w'),ensure_ascii=False)
  tmpl=dict(old[0]); rows=[]
  slots=[o.get('slot') for o in old] or ['A']
  for i,(q,opts) in enumerate(newqs):
    r=dict(tmpl); r.update({qcol:q,'option_a':opts[0],'option_b':opts[1],'option_c':opts[2],'option_d':opts[3],'correct_answer':'A','used':tmpl.get('used') if isinstance(tmpl.get('used'),str) else False})
    if 'slot' in r: r['slot']=slots[i%len(slots)]
    if 'report_count' in r: r['report_count']=0
    if 'image_url' in r: r['image_url']=None
    rows.append(r)
  req('DELETE',f"{urllib.parse.quote(table)}?{f}")
  return len(old),len(req('POST',urllib.parse.quote(table),rows))
