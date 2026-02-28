import re
import json
from pathlib import Path

root = Path('/Users/wickymahato/Desktop/student activity/student-activity-tracker/apps/docs')
comp_root = root / 'components'
ignored_parts = {'.next', 'node_modules', '.turbo', 'test-results'}


def should_include(path: Path) -> bool:
    return path.is_file() and not any(part in ignored_parts for part in path.parts)


all_files = sorted([p for p in comp_root.rglob('*') if should_include(p) and p.suffix in {'.ts', '.tsx'}])
workspace_files = [
    p
    for p in root.rglob('*')
    if should_include(p) and p.suffix in {'.ts', '.tsx', '.js', '.jsx', '.mdx'}
]
contents = {p: p.read_text(encoding='utf-8', errors='ignore') for p in workspace_files}

usage_map = {}
for comp in all_files:
    rel = comp.relative_to(root).as_posix()
    stem = rel[:-4] if rel.endswith('.tsx') else rel[:-3]
    alias = '@/' + stem
    refs = []
    for file_path, txt in contents.items():
        if file_path == comp:
            continue
        if alias in txt:
            refs.append(file_path.relative_to(root).as_posix())
            continue
        name = comp.stem
        if re.search(r"from\s+['\"][^'\"]*" + re.escape(name) + r"['\"]", txt):
            refs.append(file_path.relative_to(root).as_posix())
    usage_map[rel] = sorted(set(refs))

rows = []
for comp in all_files:
    rel = comp.relative_to(root).as_posix()
    txt = comp.read_text(encoding='utf-8', errors='ignore')
    exports = []
    exports += ['default:' + m.group(1) for m in re.finditer(r'export\s+default\s+function\s+([A-Za-z0-9_]+)', txt)]
    exports += ['default:' + m.group(1) for m in re.finditer(r'export\s+default\s+([A-Za-z0-9_]+);', txt)]
    exports += [m.group(1) for m in re.finditer(r'export\s+function\s+([A-Za-z0-9_]+)', txt)]
    exports += [m.group(1) for m in re.finditer(r'export\s+const\s+([A-Za-z0-9_]+)', txt)]
    if not exports and 'export default' in txt:
        exports = ['default:anonymous']

    props_hints = []
    for m in re.finditer(r'function\s+([A-Za-z0-9_]+)\s*\(([^\)]*)\)', txt):
        sig = m.group(2).strip()
        if sig and len(sig) < 180 and (m.group(1)[0].isupper() or m.group(1).endswith('Page')):
            props_hints.append(sig)
    for m in re.finditer(r'const\s+([A-Za-z0-9_]+)\s*=\s*\(([^\)]*)\)\s*=>', txt):
        sig = m.group(2).strip()
        if sig and len(sig) < 180 and m.group(1)[0].isupper():
            props_hints.append(sig)

    side = []
    checks = [
        ('network', r'fetch\(|axios|use[A-Za-z0-9_]+(Query|Mutation)\(|XMLHttpRequest|navigator\.sendBeacon'),
        ('timer', r'setInterval\(|setTimeout\('),
        ('listener', r'addEventListener\(|removeEventListener\('),
        ('router', r'useRouter\(|router\.(push|replace|prefetch)|redirect\('),
        ('localStorage', r'localStorage\.'),
        ('notification', r'Notification|toast\.|Toaster|serviceWorker|pushManager'),
    ]
    for name, pat in checks:
        if re.search(pat, txt):
            side.append(name)

    rows.append(
        {
            'file': rel,
            'exports': sorted(set(exports)),
            'propsHints': sorted(set(props_hints))[:3],
            'useClient': ('"use client"' in txt or "'use client'" in txt),
            'sideEffects': side,
            'useEffectCount': len(re.findall(r'\buseEffect\s*\(', txt)),
            'usageCount': len(usage_map[rel]),
            'usedBy': usage_map[rel][:12],
        }
    )

out = root / 'tests' / '_component_audit.json'
out.write_text(json.dumps(rows, indent=2), encoding='utf-8')
print(f'components={len(rows)}')
unused = [r['file'] for r in rows if r['usageCount'] == 0]
print(f'unused={len(unused)}')
for name in unused[:60]:
    print(name)
print(f'out={out}')
