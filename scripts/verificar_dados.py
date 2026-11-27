"""Independent check: compares the site's JSON against SIDRA's classic API (apisidra), not the v3 API the ETL uses."""
import json, sys, time, urllib.request, random
ROOT = sys.argv[1]
def load(p): return json.load(open(f"{ROOT}/web/public/data/{p}", encoding="utf-8"))
def sidra(path):
    for a in range(4):
        try:
            req = urllib.request.Request("https://apisidra.ibge.gov.br/values/" + path, headers={"User-Agent": "verify"})
            return json.load(urllib.request.urlopen(req, timeout=120))[1:]
        except Exception as e:
            time.sleep(3 * (a + 1)); err = e
    raise err
def num(v):
    try: return float(v)
    except: return None

cat = load("catalog.json"); ufs = load("ufs.json")
sig = {u["id"]: u["sigla"] for u in ufs}
# Classification filters as used by the ETL, rewritten in apisidra syntax.
CLS = {
 "analfabetismo": "c2/6794/c58/2795", "anos-estudo": "c2/6794/c58/108866", "desocupacao": "", "subutilizacao": "",
 "informalidade": "", "rendimento-trabalho": "c2/6794", "rendimento-per-capita": "c1019/49243", "gini": "",
 "populacao": "", "internet": "c1/6795/c688/48534", "alfabetizacao": "c2/6794/c58/95253/c2661/32776/c1/6795",
 "idade-mediana": "c2661/32776/c1/6795", "densidade": "",
}
VAR = {"analfabetismo":10267,"anos-estudo":3593,"desocupacao":4099,"subutilizacao":4118,"informalidade":12466,"rendimento-trabalho":5933,
 "rendimento-per-capita":10816,"gini":10681,"populacao":9324,"internet":9784,"alfabetizacao":2513,"idade-mediana":10613,"densidade":614}
total = mism = 0
report = []
for ind in cat["indicators"]:
    iid = ind["id"]; d = load(f"indicators/{iid}.json"); t = ind["source"]["table"]
    # latest period with data + one older period
    idxs = [i for i, _ in enumerate(d["periods"]) if d["series"]["BR"][i] is not None]
    picks = sorted({idxs[-1], idxs[0], idxs[len(idxs)//2]})
    for i in picks:
        pid = d["periods"][i]["id"]
        if iid in VAR:
            rows = sidra(f"t/{t}/n1/all/n3/all/v/{VAR[iid]}/p/{pid}/{CLS[iid]}".rstrip("/"))
            got = {("BR" if r["NC"] == "1" else sig[r["D1C"]]): num(r["V"]) for r in rows}
        else:  # ratio indicators: recompute from raw household counts
            spec = {"esgoto": ("c11558", ["46290"], "46292"), "agua": ("c301", ["31471"], "72053"), "lixo": ("c67", ["72120", "72121"], "10972")}[iid]
            cats = ",".join(spec[1] + [spec[2]])
            rows = sidra(f"t/{t}/n1/all/n3/all/v/381/p/{pid}/{spec[0]}/{cats}/c2661/32776/c1/6795")
            acc = {}
            for r in rows:
                k = "BR" if r["NC"] == "1" else sig[r["D1C"]]
                catcode = r["D4C"] if r["D4C"] in spec[1] + [spec[2]] else r.get("D5C")
                acc.setdefault(k, {})[catcode] = num(r["V"])
            got = {k: round(sum(v[c] for c in spec[1]) / v[spec[2]] * 100, 1) for k, v in acc.items()}
        for k, mine in d["series"].items():
            mine = mine[i]; theirs = got.get(k)
            total += 1
            if mine is None and theirs is None: continue
            if mine is None or theirs is None or abs(mine - theirs) > 1e-6:
                mism += 1; report.append(f"  DIVERGE {iid} {pid} {k}: site={mine} sidra={theirs}")
    print(f"{iid:24s} tabela {t:5d}  períodos checados {[d['periods'][i]['label'] for i in picks]}", flush=True)

# Municipal: random sample of 40 municípios per Censo indicator
mun = load("municipios.json")
random.seed(42)
sample = random.sample([m[0] for m in mun if m[0] != "5101837"], 40) + ["3550308", "3304557", "1302603", "5300108"]
for iid in ["alfabetizacao", "idade-mediana", "densidade", "esgoto", "agua", "lixo"]:
    mine = load(f"mun/{iid}.json")["values"]; t = next(i for i in cat["indicators"] if i["id"] == iid)["source"]["table"]
    codes = ",".join(sample)
    if iid in VAR:
        rows = sidra(f"t/{t}/n6/{codes}/v/{VAR[iid]}/p/2022/{CLS[iid]}".rstrip("/"))
        got = {r["D1C"]: num(r["V"]) for r in rows}
    else:
        spec = {"esgoto": ("c11558", ["46290"], "46292"), "agua": ("c301", ["31471"], "72053"), "lixo": ("c67", ["72120", "72121"], "10972")}[iid]
        rows = sidra(f"t/{t}/n6/{codes}/v/381/p/2022/{spec[0]}/{','.join(spec[1] + [spec[2]])}/c2661/32776/c1/6795")
        acc = {}
        for r in rows:
            catcode = r["D4C"] if r["D4C"] in spec[1] + [spec[2]] else r.get("D5C")
            acc.setdefault(r["D1C"], {})[catcode] = num(r["V"])
        got = {k: (round(sum(v[c] or 0 for c in spec[1]) / v[spec[2]] * 100, 1) if v.get(spec[2]) else None) for k, v in acc.items()}
    for c in sample:
        total += 1
        if mine.get(c) != got.get(c) and not (mine.get(c) is not None and got.get(c) is not None and abs(mine[c] - got[c]) < 1e-6):
            mism += 1; report.append(f"  DIVERGE mun {iid} {c}: site={mine.get(c)} sidra={got.get(c)}")
    print(f"{iid:24s} municípios: {len(sample)} checados", flush=True)

print(f"\nTOTAL comparado: {total} valores · divergências: {mism}")
print("\n".join(report[:40]))
