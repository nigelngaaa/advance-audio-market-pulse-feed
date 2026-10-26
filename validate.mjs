import fs from "node:fs";
import assert from "node:assert/strict";
const filename=process.argv[2]||"feed.json";
const raw=fs.readFileSync(filename,"utf8");assert(Buffer.byteLength(raw)<=1000000);
const d=JSON.parse(raw);
const keys=(o,expected)=>assert.deepEqual(Object.keys(o).sort(),expected.split(" ").sort(),"Unexpected or missing fields");
const string=(s,max=4000)=>assert(typeof s==="string"&&s.length<=max);
const date=s=>assert(typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s).toISOString().slice(0,10)===s);
const instant=s=>assert(typeof s==="string"&&/T.*(?:Z|[+-]\d\d:\d\d)$/.test(s)&&Number.isFinite(Date.parse(s)));
const sources=rows=>{assert(Array.isArray(rows)&&rows.length<=10);for(const s of rows){keys(s,"label url");string(s.label,200);string(s.url,2000);const u=new URL(s.url);assert(s.label.length&&u.protocol==="https:"&&!u.username&&!u.password&&u.hostname.includes(".")&&!/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname));}};
keys(d,"schemaVersion generatedAt status periodStart periodEnd nextRefreshAt coverage items metrics actions limitations");
assert.equal(d.schemaVersion,1);instant(d.generatedAt);instant(d.nextRefreshAt);date(d.periodStart);date(d.periodEnd);
assert(d.periodStart<=d.periodEnd&&Date.parse(d.generatedAt)<=Date.now()+300000&&Date.parse(d.nextRefreshAt)>Date.parse(d.generatedAt));
assert(["baseline","partial","complete"].includes(d.status));
const brands=["KEF","Sonos","Bowers & Wilkins","Klipsch","Focal","Monitor Audio","Martin Logan","JBL","Arcam","Hegel","Eversolo","WiiM","NAD","Marantz","Denon","Cambridge Audio","Moon Audio","Aurender","Linn","Wilson Audio","Gryphon Audio","Dan D'Agostino","Boulder","Magico","Estelon","Marten","YG Acoustics","Vivid Audio","AudioQuest"];
assert(d.coverage.length<=100);assert.equal(new Set(d.coverage.map(r=>r.brand)).size,d.coverage.length);
for(const b of brands)assert(d.coverage.some(r=>r.brand===b),`Missing ${b}`);
for(const r of d.coverage){keys(r,"brand category status checkedAt note sources");string(r.brand,100);string(r.category,100);string(r.note);sources(r.sources);assert(["pending","checked","unavailable"].includes(r.status));if(r.checkedAt!==null)date(r.checkedAt);if(r.status==="checked")assert(r.checkedAt&&r.sources.length);if(d.status==="complete")assert.equal(r.status,"checked");}
assert(d.items.length<=200);assert.equal(new Set(d.items.map(r=>r.id)).size,d.items.length);
for(const r of d.items){keys(r,"id brand title summary implication kind publicationDate checkedAt sources");for(const k of ["id","brand","title","summary","implication"])string(r[k],["id","brand"].includes(k)?100:4000);assert(/^[a-z0-9-]+$/.test(r.id));assert(["development","context"].includes(r.kind));date(r.checkedAt);sources(r.sources);assert(r.sources.length);if(r.publicationDate!==null)date(r.publicationDate);if(r.kind==="development")assert(r.publicationDate&&r.publicationDate>=d.periodStart&&r.publicationDate<=d.periodEnd);}
assert(d.metrics.length<=30);
for(const m of d.metrics){keys(m,"id name value period publishedAt checkedAt note sources");for(const k of ["id","name","period","note"])string(m[k],k==="id"?100:4000);sources(m.sources);if(m.publishedAt!==null)date(m.publishedAt);if(m.checkedAt!==null)date(m.checkedAt);if(m.value!==null){string(m.value,100);assert(m.sources.length&&m.publishedAt&&m.checkedAt);}}
assert(d.actions.length<=40);
for(const a of d.actions){keys(a,"id title detail brand sourceIds");for(const k of ["id","title","detail","brand"])string(a[k],["id","brand"].includes(k)?100:4000);assert(a.sourceIds.length>=1&&a.sourceIds.length<=20);for(const id of a.sourceIds)assert(d.items.some(i=>i.id===id));}
assert(d.limitations.length<=30);d.limitations.forEach(s=>string(s));
console.log(`Valid schema v1: ${d.coverage.length} brands, ${d.items.length} source-backed items; ${d.status}.`);
