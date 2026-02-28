import os
import re
import json

root = '/Users/wickymahato/Desktop/student activity/student-activity-tracker/apps/docs'

all_files: list[str] = []
for dp, _, fs in os.walk(root):
    if '/node_modules' in dp or '/.next' in dp or '/test-results' in dp:
        continue
    for f in fs:
        if f.endswith(('.ts', '.tsx')):
            all_files.append(os.path.join(dp, f))

imp_re = re.compile(r"import\s+(?:type\s+)?(?:[^'\"]+?from\s+)?['\"]([^'\"]+)['\"]")
imports: dict[str, list[str]] = {}
for p in all_files:
    with open(p, 'r', encoding='utf-8', errors='ignore') as fh:
        imports[p] = imp_re.findall(fh.read())

file_set = set(all_files)

def resolve(src: str, spec: str):
    candidates: list[str] = []
    if spec.startswith('@/'):
        base = os.path.join(root, spec[2:])
        candidates = [base, base + '.ts', base + '.tsx', os.path.join(base, 'index.ts'), os.path.join(base, 'index.tsx')]
    elif spec.startswith('./') or spec.startswith('../'):
        base = os.path.normpath(os.path.join(os.path.dirname(src), spec))
        candidates = [base, base + '.ts', base + '.tsx', os.path.join(base, 'index.ts'), os.path.join(base, 'index.tsx')]
    else:
        return None
    for candidate in candidates:
        if candidate in file_set:
            return candidate
    return None

edges: list[tuple[str, str]] = []
broken: list[tuple[str, str]] = []
for src, specs in imports.items():
    for spec in specs:
        if spec.startswith('@/') or spec.startswith('./') or spec.startswith('../'):
            dst = resolve(src, spec)
            if dst:
                edges.append((src, dst))
            else:
                broken.append((os.path.relpath(src, root), spec))

rev = {p: 0 for p in all_files}
for src, dst in edges:
    rev[dst] += 1

component_files = [p for p in all_files if '/components/' in p]
dead_components = [
    os.path.relpath(p, root)
    for p in component_files
    if rev[p] == 0 and not os.path.relpath(p, root).startswith('components/ui/')
]

graph = {p: [] for p in all_files}
for src, dst in edges:
    graph[src].append(dst)

seen: dict[str, int] = {}
stack: list[str] = []
cycles: list[list[str]] = []

def dfs(node: str):
    seen[node] = 1
    stack.append(node)
    for child in graph[node]:
        state = seen.get(child, 0)
        if state == 0:
            dfs(child)
        elif state == 1 and child in stack:
            idx = stack.index(child)
            cycles.append(stack[idx:] + [child])
    stack.pop()
    seen[node] = 2

for node in all_files:
    if seen.get(node, 0) == 0:
        dfs(node)

unique_cycles: list[list[str]] = []
cycle_signatures = set()
for cycle in cycles:
    signature = tuple(sorted(set(cycle)))
    if len(signature) < 2 or signature in cycle_signatures:
        continue
    cycle_signatures.add(signature)
    unique_cycles.append([os.path.relpath(p, root) for p in cycle])

report = {
    'total_ts_files': len(all_files),
    'total_component_files': len(component_files),
    'broken_count': len(broken),
    'broken_local_imports': broken,
    'dead_count': len(dead_components),
    'dead_components': dead_components,
    'cycle_count': len(unique_cycles),
    'cycles': unique_cycles,
    'top_imported_components': sorted([(rev[p], os.path.relpath(p, root)) for p in component_files], reverse=True),
}

output_file = os.path.join(root, 'audit_dependency_report.json')
with open(output_file, 'w', encoding='utf-8') as fh:
    json.dump(report, fh, indent=2)

print(output_file)
