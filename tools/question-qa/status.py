exec(open('audit.py').read())
def status(t,c):
    col='questions' if t=='kids' else 'question'
    rows=live(t,c); v=sum(1 for r in rows if as_q(r,col) and not problems(*as_q(r,col)))
    return len(rows),v
