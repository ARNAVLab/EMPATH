"""Statistics for Studies 2, 3 and the Study 0 rerun. Run from the repo root: python3 scripts/study_stats.py"""
import json,glob,statistics as st,random,collections,sys
def runs(d,cond,topic): return [json.load(open(f)) for f in sorted(glob.glob(f"results/{d}/*_{cond}_{topic}_g*.json"))]
def moved(d,track="beliefData"):
    side={c["name"]:c["opinion_strength"] for c in d["characters"]}
    return st.mean(abs(d[track][k][-1]["y"]-side[k]) for k in side)
def spread(d,track="beliefData"): return st.pstdev([v[-1]["y"] for v in d[track].values()])
def polar(d):  # mean |final belief|
    return st.mean(abs(v[-1]["y"]) for v in d["beliefData"].values())
def perm(a,b,n=50000):
    obs=abs(st.mean(a)-st.mean(b)); pool=a+b; c=0; random.seed(7)
    for _ in range(n):
        random.shuffle(pool); c+= abs(st.mean(pool[:len(a)])-st.mean(pool[len(a):]))>=obs-1e-12
    return c/n
def ci(x):
    random.seed(3); bs=sorted(st.mean(random.choices(x,k=len(x))) for _ in range(5000)); return bs[125],bs[4875]
S="db-uso"
print("=== STUDY 2 (emotion only), belief-based ===")
for topic in ("debatable","universal"):
    b=runs("study2",f"eo-off-description-calm-{S}",topic); base=[moved(d) for d in b]; lo,hi=ci(base)
    print(f"{topic}: OFF n={len(b)} moved {st.mean(base):.2f} [{lo:.2f},{hi:.2f}] spread {st.mean(map(spread,b)):.2f} |final| {st.mean(map(polar,b)):.2f} judge-moved {st.mean(moved(d,'chartData') for d in b):.2f}")
    for k in ("on-description-angry","frozen-description-angry","on-description-excited","frozen-description-excited","on-label-angry","frozen-label-angry"):
        r=runs("study2",f"eo-{k}-{S}",topic)
        if not r: continue
        m=[moved(d) for d in r]; lo,hi=ci(m)
        chk=[(e["label"]==e.get("expressed")) for d in r for x in d["messages"] if (e:=x.get("emotion")) and e.get("expressed")]
        sp=[spread(d) for d in r]
        print(f"   {k:27s} n={len(m):2d} moved {st.mean(m):.2f} [{lo:.2f},{hi:.2f}] p={perm(base[:],m[:]):.4f} | spread {st.mean(sp):.2f} p={perm([spread(d) for d in b],sp):.4f} | judge-moved {st.mean(moved(d,'chartData') for d in r):.2f} | check {sum(chk)/len(chk):.0%}")
print("\n=== by regulation and side (UBI), moved ===")
for k in ("off-description-calm","on-description-angry","frozen-description-angry","on-description-excited","frozen-description-excited"):
    mv=collections.defaultdict(list)
    for d in runs("study2",f"eo-{k}-{S}","debatable"):
        for c in d["characters"]:
            x=abs(d["beliefData"][c["name"]][-1]["y"]-c["opinion_strength"])
            mv["reg-"+c["regulation"]].append(x); mv["pro" if c["opinion_strength"]>0 else "anti"].append(x)
    print(f"  {k:27s}", {a:round(st.mean(v),2) for a,v in sorted(mv.items())})
print("\n=== emotion dynamics in ON cells (UBI): intensity by regulation, label shares ===")
for k in ("on-description-angry","on-description-excited"):
    inten=collections.defaultdict(list); lab=collections.Counter()
    for d in runs("study2",f"eo-{k}-{S}","debatable"):
        reg={c["name"]:c["regulation"] for c in d["characters"]}
        for x in d["messages"]:
            e=x.get("emotion")
            if e: inten[reg[x["role"]]].append(e["intensity"]); lab[e["label"]]+=1
    tot=sum(lab.values()); print(f"  {k}: intensity", {a:round(st.mean(v),2) for a,v in inten.items()}, "labels", {a:f"{b/tot:.0%}" for a,b in lab.most_common()})
TIER={}
for t,ms in {"HighlyRigid":"INTJ ENTJ ISTJ ESTJ","ModRigid":"ENFJ ISFJ ISTP ESTP","ModFlexible":"INFJ INTP ESFJ ISFP","HighlyFlexible":"ENFP ENTP INFP ESFP"}.items():
    for m in ms.split(): TIER[m]=t
print("\n=== STUDY 3 (personality + emotion, UBI, same 8 groups) ===")
cells={k:runs("study3",f"pe-{k}-{S}","debatable") for k in ("off-description-calm","on-description-calm","on-description-angry")}
for k,r in cells.items():
    r.sort(key=lambda d:d["meta"]["run_index"])
    m=[moved(d) for d in r]; chk=[(e["label"]==e.get("expressed")) for d in r for x in d["messages"] if (e:=x.get("emotion")) and e.get("expressed")]
    print(f"  {k:22s} n={len(r)} moved {st.mean(m):.2f} per-group {[round(x,2) for x in m]} spread {st.mean(map(spread,r)):.2f} |final| {st.mean(map(polar,r)):.2f}"+(f" check {sum(chk)/len(chk):.0%}" if chk else ""))
base=[moved(d) for d in cells["off-description-calm"]]
for k in ("on-description-calm","on-description-angry"):
    m=[moved(d) for d in cells[k]]; diffs=[a-b for a,b in zip(m,base)]
    # paired sign-flip test
    random.seed(5); obs=abs(st.mean(diffs)); c=sum(abs(st.mean([x*random.choice((1,-1)) for x in diffs]))>=obs-1e-12 for _ in range(50000))/50000
    print(f"  paired {k} - off: mean diff {st.mean(diffs):+.2f}, sign-flip p={c:.3f}")
print("  by tier (moved):")
for k,r in cells.items():
    mv=collections.defaultdict(list)
    for d in r:
        for c in d["characters"]:
            mv[TIER.get(c["personality"],"?")].append(abs(d["beliefData"][c["name"]][-1]["y"]-c["opinion_strength"]))
    print(f"    {k:22s}", {a:(round(st.mean(v),2),len(v)) for a,v in sorted(mv.items())})
print("  groups:", [d["meta"]["group"] for d in cells["off-description-calm"]])
print("\n=== STUDY 0 rerun at 32k (original prompt, judge opinion) vs old ===")
for name,dr in (("old default ctx","study0"),("32k","study0_32k")):
    for topic in ("universal","debatable","controversial"):
        r=[json.load(open(f)) for f in sorted(glob.glob(f"results/{dr}/*baseline_{topic}_g*.json"))]
        if not r: continue
        fin=[v[-1]["y"] for d in r for v in d["chartData"].values()]
        hold=[]; 
        for d in r:
            side={c["name"]:c["opinion_strength"] for c in d["characters"]}
            ms=[x for x in d["messages"] if x.get("role") and x.get("values",{}).get("opinion") is not None]
            hold+= [ (x["values"]["opinion"]*side[x["role"]]>0) for x in ms[:4]]
        words=st.mean(len(str(x.get("content","")).split()) for d in r for x in d["messages"] if x.get("role"))
        print(f"  {name:15s} {topic:13s} n={len(r)} final mean {st.mean(fin):+.2f} spread {st.mean(st.pstdev([v[-1]['y'] for v in d['chartData'].values()]) for d in r):.2f} r1-side-held {sum(hold)/len(hold):.0%} words/msg {words:.0f} ctx {r[0]['meta'].get('context_length')}")
