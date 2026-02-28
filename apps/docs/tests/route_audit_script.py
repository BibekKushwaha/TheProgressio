import re
import json
from pathlib import Path

root = Path('/Users/wickymahato/Desktop/student activity/student-activity-tracker/apps/docs')
app_root = root / 'app'

route_files = sorted([p for p in app_root.rglob('*') if p.is_file() and p.suffix in {'.ts', '.tsx', '.mdx'}])

records = []
for path in route_files:
    rel = path.relative_to(root).as_posix()
    txt = path.read_text(encoding='utf-8', errors='ignore')
    imports = re.findall(r"import\s+(?:type\s+)?(?:[^'\"]+?)\s+from\s+['\"]([^'\"]+)['\"]", txt)
    component_imports = [i for i in imports if i.startswith('@/components/')]
    store_imports = [i for i in imports if i.startswith('@repo/store')]
    local_imports = [i for i in imports if i.startswith('@/') and not i.startswith('@/components/')]
    has_client = ('"use client"' in txt) or ("'use client'" in txt)
    effects = {
        'queryMutationHooks': sorted(set(re.findall(r'\buse[A-Za-z0-9_]+(?:Query|Mutation)\b', txt))),
        'storeHooks': sorted(set(re.findall(r'\buseApp(?:Dispatch|Selector)\b', txt))),
        'routerUsage': bool(re.search(r'useRouter\(|usePathname\(|useSearchParams\(|redirect\(', txt)),
        'localStorage': 'localStorage.' in txt,
        'fetch': bool(re.search(r'fetch\(', txt)),
        'useEffect': txt.count('useEffect('),
    }
    records.append({
        'file': rel,
        'kind': path.name,
        'isClient': has_client,
        'componentImports': component_imports,
        'storeImports': store_imports,
        'otherAliasImports': local_imports,
        'effects': effects,
    })

out = root / 'tests' / '_route_audit.json'
out.write_text(json.dumps(records, indent=2), encoding='utf-8')
print(f'routes={len(records)}')
print(f'out={out}')
