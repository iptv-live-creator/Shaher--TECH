import sys,json,re
from pathlib import Path
root=Path(sys.argv[1]);m=json.loads(Path(sys.argv[2]).read_text())
for slug,t in m.items():
 p=root/(slug+'.html')
 if not p.exists():raise SystemExit('Missing route HTML with host-specific metadata: '+str(p))
 s=p.read_text()
 s,n=re.subn(r'<section aria-label="Active tool".*?</section>',lambda _:t['html'],s,flags=re.S)
 if n!=1:raise SystemExit('Expected one tool view: '+str(p))
 s=s.replace('<body>','<body class="tool-open">')
 p.write_text(s)
