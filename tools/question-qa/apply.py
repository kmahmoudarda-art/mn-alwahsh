import json,urllib.request,urllib.parse
BASE='https://cqqeyvhofbnvjemoihca.supabase.co/rest/v1/'
H={'apikey':'proxy-injected','Content-Type':'application/json','Prefer':'return=representation'}
def patch(table,old,new,qcol='question'):
  f=f"category=eq.{urllib.parse.quote(old['category'])}&points=eq.{old['points']}&{qcol}=eq.{urllib.parse.quote(old[qcol])}"
  req=urllib.request.Request(BASE+urllib.parse.quote(table)+'?'+f,data=json.dumps(new).encode(),method='PATCH',headers=H)
  with urllib.request.urlopen(req) as r: return json.load(r)
