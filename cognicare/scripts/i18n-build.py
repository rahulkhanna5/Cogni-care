# Builds src/i18n/catalog.data.ts from the translation tables in i18n-tables/.
# Each table row is (exact English on screen, Hindi, Punjabi); TT rows are
# patterns with {0}, {1}. Run: python3 scripts/i18n-build.py src/i18n/catalog.data.ts
import json, sys, importlib.util, os
S = os.path.dirname(os.path.abspath(__file__))
rows, tmpl = [], []
for f in sorted(os.listdir(os.path.join(S, 'i18n-tables'))):
    spec = importlib.util.spec_from_file_location(f[:-3], os.path.join(S, 'i18n-tables', f))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    rows += getattr(m, 'T', []); tmpl += getattr(m, 'TT', [])
hi, pa, seen = {}, {}, {}
dups = 0
for en, h, p in rows:
    if en in hi:
        if hi[en] != h: dups += 1
        continue
    hi[en], pa[en] = h, p
th, tp, tseen = [], [], set()
for en, h, p in tmpl:
    if en in tseen: continue
    tseen.add(en); th.append([en, h]); tp.append([en, p])
out = sys.argv[1]
def js(o): return json.dumps(o, ensure_ascii=False, indent=2)
with open(out, 'w') as fh:
    fh.write("/* eslint-disable */\n// GENERATED from the translation tables — edit the tables, not this file.\n")
    fh.write("// Keys are the exact English shown on screen; {0}, {1}… are filled-in values.\n\n")
    fh.write("export const EXACT_HI: Record<string, string> = " + js(hi) + ";\n\n")
    fh.write("export const EXACT_PA: Record<string, string> = " + js(pa) + ";\n\n")
    fh.write("export const TEMPLATES_HI: [string, string][] = " + js(th) + ";\n\n")
    fh.write("export const TEMPLATES_PA: [string, string][] = " + js(tp) + ";\n")
print(len(hi), 'exact,', len(th), 'templates,', dups, 'conflicting duplicates ignored')
