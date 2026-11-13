"""Figures for the three studies. Run from the repo root: python3 scripts/make_figures.py"""
import json,glob,statistics as st,random,collections
import os
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
OUT="docs/figures"  # run from the repo root
SURF="#fcfcfb"; INK="#0b0b0b"; SEC="#52514e"; MUTED="#898781"; GRID="#e1e0d9"; AXIS="#c3c2b7"
os.makedirs(OUT, exist_ok=True)
C=["#2a78d6","#eb6834","#1baf7a"]
plt.rcParams.update({"font.family":"DejaVu Sans","font.size":9,"axes.edgecolor":AXIS,"axes.labelcolor":SEC,"xtick.color":SEC,"ytick.color":SEC,"text.color":INK,"figure.facecolor":SURF,"axes.facecolor":SURF,"savefig.facecolor":SURF})
def clean(ax,grid="y"):
    for s in ("top","right"): ax.spines[s].set_visible(False)
    ax.spines["left"].set_color(AXIS); ax.spines["bottom"].set_color(AXIS)
    ax.grid(axis=grid,color=GRID,lw=0.8); ax.set_axisbelow(True); ax.tick_params(length=0)
# ---------- Fig 1: Study 1
rows=[json.loads(l) for f in glob.glob("results/study1/*.jsonl") for l in open(f) if l.strip()]
emos=["anger","anxiety","enthusiasm","calm"]; fmts=["description","label","vad"]; names={"description":"Description","label":"Label + intensity","vad":"VAD numbers"}
fig,ax=plt.subplots(figsize=(6.6,3.4)); w=0.24
for i,f in enumerate(fmts):
    vals=[]
    for e in emos:
        r=[x for x in rows if x["format"]==f and x["target_label"]==e]; vals.append(100*sum(x["expressed"]==e for x in r)/len(r))
    xs=[j+(i-1)*(w+0.02) for j in range(len(emos))]
    ax.bar(xs,vals,width=w,color=C[i],label=names[f],edgecolor=SURF,linewidth=1.5)
    for x,v in zip(xs,vals): ax.text(x,v+1.5,f"{v:.0f}",ha="center",va="bottom",fontsize=8,color=SEC)
ax.set_xticks(range(len(emos))); ax.set_xticklabels([e.capitalize() for e in emos]); ax.set_ylim(0,100); ax.set_ylabel("Replies showing the set emotion (%)")
ax.set_title("Study 1: which prompt format gets the emotion across",loc="left",fontsize=10.5,fontweight="bold")
ax.legend(frameon=False,ncol=3,loc="upper right",fontsize=8.5,handlelength=1.2,columnspacing=1.2); clean(ax)
fig.tight_layout(); fig.savefig(f"{OUT}/fig1_study1_formats.png",dpi=200); plt.close(fig)
# ---------- Fig 2: Study 2
def runs(cond,topic): return [json.load(open(f)) for f in sorted(glob.glob(f"results/study2/*_{cond}_{topic}_g*.json"))]
def moved(d):
    side={c["name"]:c["opinion_strength"] for c in d["characters"]}
    return st.mean(abs(d["beliefData"][k][-1]["y"]-side[k]) for k in side)
def ci(x):
    random.seed(3); bs=sorted(st.mean(random.choices(x,k=len(x))) for _ in range(5000)); return bs[125],bs[4875]
S="db-uso"
conds=[("No emotion","eo-off-description-calm"),("Anger, changing","eo-on-description-angry"),("Anger, held constant","eo-frozen-description-angry"),("Excitement, changing","eo-on-description-excited"),("Excitement, held constant","eo-frozen-description-excited"),("Anger (plain label), changing","eo-on-label-angry"),("Anger (plain label), held constant","eo-frozen-label-angry")]
fig,axes=plt.subplots(1,2,figsize=(8.6,3.5),sharey=True)
for ax,(topic,title) in zip(axes,[("debatable","Charged topic (UBI)"),("universal","Neutral topic (food gives energy)")]):
    ys=[];
    for i,(nm,c) in enumerate(conds):
        r=runs(f"{c}-{S}",topic)
        y=len(conds)-1-i
        if not r: continue
        m=[moved(d) for d in r]; lo,hi=ci(m); mu=st.mean(m)
        col=MUTED if i==0 else C[0]
        ax.plot([lo,hi],[y,y],color=col,lw=2,solid_capstyle="round"); ax.plot([mu],[y],"o",color=col,ms=7,mec=SURF,mew=1.5)
        ax.text(min(hi+0.04,1.02),y,f"{mu:.2f}",va="center",fontsize=8,color=SEC)
        if i==0: ax.axvline(mu,color=AXIS,lw=1,ls=(0,(3,3)),zorder=0)
    ax.set_xlim(-0.03,1.15); ax.set_ylim(-0.6,len(conds)-0.4); ax.set_title(title,loc="left",fontsize=9.5,color=SEC); ax.set_xlabel("Opinion movement (0 = nobody moves)")
    clean(ax,"x")
axes[0].set_yticks(range(len(conds))); axes[0].set_yticklabels([c[0] for c in conds][::-1])
fig.suptitle("Study 2: emotion keeps agents from changing their minds",x=0.01,ha="left",fontsize=10.5,fontweight="bold")
fig.text(0.01,0.005,"Dots are means over debates (12 per condition; 8 for plain-label rows), bars are 95% bootstrap intervals. Dashed line marks the no-emotion mean.",fontsize=7,color=MUTED)
fig.tight_layout(rect=(0,0.03,1,0.95)); fig.savefig(f"{OUT}/fig2_study2_movement.png",dpi=200); plt.close(fig)
# ---------- Fig 3: Study 3
TIER={}
for t,ms in {"Highly rigid":"INTJ ENTJ ISTJ ESTJ","Moderately rigid":"ENFJ ISFJ ISTP ESTP","Moderately flexible":"INFJ INTP ESFJ ISFP","Highly flexible":"ENFP ENTP INFP ESFP"}.items():
    for m in ms.split(): TIER[m]=t
tiers=["Highly rigid","Moderately rigid","Moderately flexible","Highly flexible"]
cells=[("No emotion","pe-off-description-calm"),("Emotion on, starts calm","pe-on-description-calm"),("Emotion on, starts angry","pe-on-description-angry")]
fig,ax=plt.subplots(figsize=(6.6,3.4))
for i,(nm,c) in enumerate(cells):
    mv=collections.defaultdict(list)
    for f in glob.glob(f"results/study3/*_{c}-{S}_debatable_g*.json"):
        d=json.load(open(f))
        for ch in d["characters"]: mv[TIER[ch["personality"]]].append(abs(d["beliefData"][ch["name"]][-1]["y"]-ch["opinion_strength"]))
    vals=[st.mean(mv[t]) for t in tiers]; xs=[j+(i-1)*(w+0.02) for j in range(len(tiers))]
    ax.bar(xs,vals,width=w,color=C[i],label=nm,edgecolor=SURF,linewidth=1.5)
    for x,v in zip(xs,vals): ax.text(x,v+0.02,f"{v:.2f}",ha="center",va="bottom",fontsize=7.5,color=SEC)
ax.set_xticks(range(len(tiers))); ax.set_xticklabels(tiers); ax.set_ylim(0,1.4); ax.set_ylabel("Average opinion movement per agent")
ax.set_title("Study 3: with personalities, the personality type decides who moves",loc="left",fontsize=10.5,fontweight="bold")
ax.legend(frameon=False,ncol=3,loc="upper left",fontsize=8.5,handlelength=1.2,columnspacing=1.2); clean(ax)
fig.tight_layout(); fig.savefig(f"{OUT}/fig3_study3_tiers.png",dpi=200); plt.close(fig)
print("ok")
