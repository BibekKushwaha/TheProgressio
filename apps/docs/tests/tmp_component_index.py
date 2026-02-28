import os
import re
import json

root = '/Users/wickymahato/Desktop/student activity/student-activity-tracker/apps/docs'

# collect files
files = []
for dp, _, fs in os.walk(os.path.join(root, 'components')):
    if '/node_modules' in dp or '/.next' in dp:
        continue
    for f in fs:
        if f.endswith(('.ts', '.tsx')):
            files.append(os.path.join(dp, f))

all_ts = []
for dp, _, fs in os.walk(root):
    if '/node_modules' in dp or '/.next' in dp or '/test-results' in dp:
        continue
    for f in fs:
        if f.endswith(('.ts', '.tsx')):
            all_ts.append(os.path.join(dp, f))

import_re = re.compile(r"import\s+(?:type\s+)?(?:[^'\"]+?from\s+)?['\"]([^'\"]+)['\"]")
export_named_re = re.compile(r"export\s+function\s+([A-Za-z0-9_]+)\s*\((.*?)\)", re.S)
export_const_re = re.compile(r"export\s+const\s+([A-Za-z0-9_]+)\s*=\s*\((.*?)\)\s*=>", re.S)
export_default_fn_re = re.compile(r"export\s+default\s+function\s+([A-Za-z0-9_]+)?\s*\((.*?)\)", re.S)

side_effect_markers = [
    ('useEffect', 'react-effect'),
    ('setInterval(', 'timer'),
    ('setTimeout(', 'timer'),
    ('window.', 'browser-global'),
    ('document.', 'browser-global'),
    ('localStorage', 'localStorage'),
    ('sessionStorage', 'sessionStorage'),
    ('router.push(', 'navigation'),
    ('router.replace(', 'navigation'),
    ('fetch(', 'fetch'),
    ('useGet', 'rtk-query-read'),
    ('useCreate', 'rtk-query-write'),
    ('useUpdate', 'rtk-query-write'),
    ('useDelete', 'rtk-query-write'),
    ('useToggle', 'rtk-query-write'),
    ('toast', 'toast'),
    ('Notification', 'notification-api'),
]

file_set = set(all_ts)

def resolve(src: str, spec: str):
    if not (spec.startswith('@/') or spec.startswith('./') or spec.startswith('../')):
        return None
    if spec.startswith('@/'):
        base = os.path.join(root, spec[2:])
    else:
        base = os.path.normpath(os.path.join(os.path.dirname(src), spec))
    candidates = [base, base + '.ts', base + '.tsx', os.path.join(base, 'index.ts'), os.path.join(base, 'index.tsx')]
    for candidate in candidates:
        if candidate in file_set:
            return candidate
    return None

# reverse import map
rev: dict[str, list[str]] = {p: [] for p in all_ts}
for src in all_ts:
    with open(src, 'r', encoding='utf-8', errors='ignore') as fh:
        txt = fh.read()
    for spec in import_re.findall(txt):
        dst = resolve(src, spec)
        if dst:
            rev[dst].append(src)

rows = []
for path in sorted(files):
    with open(path, 'r', encoding='utf-8', errors='ignore') as fh:
        txt = fh.read()

    exports = []
    for m in export_named_re.finditer(txt):
        exports.append({'name': m.group(1), 'params': ' '.join(m.group(2).split())[:220], 'kind': 'function'})
    for m in export_const_re.finditer(txt):
        exports.append({'name': m.group(1), 'params': ' '.join(m.group(2).split())[:220], 'kind': 'const-fn'})
    for m in export_default_fn_re.finditer(txt):
        name = m.group(1) or 'default'
        exports.append({'name': name, 'params': ' '.join(m.group(2).split())[:220], 'kind': 'default-function'})

    side_effects = []
    for needle, label in side_effect_markers:
        if needle in txt:
            side_effects.append(label)

    imported_by = sorted(set(os.path.relpath(p, root) for p in rev.get(path, [])))

    rows.append({
        'file': os.path.relpath(path, root),
        'exports': exports,
        'importedByCount': len(imported_by),
        'importedBy': imported_by[:20],
        'hasUseClient': "'use client'" in txt or '"use client"' in txt,
        'sideEffects': sorted(set(side_effects)),
        'usesStoreHooks': '@repo/store' in txt,
    })

out = os.path.join(root, 'component_index_report.json')
with open(out, 'w', encoding='utf-8') as fh:
    json.dump(rows, fh, indent=2)
print(out)
