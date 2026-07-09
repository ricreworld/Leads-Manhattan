// Reworld Market Watch — overnight scanner (runs on GitHub's servers, no browser limits).
// Ported from the old ny/nj scanner to the five-territory build:
//   ny (Ricardo) · nnj (Doug) · snj (Howard) · ct / ma (Dan)
// Writes leads.json:
//   { generated, territories: { <terr>: { leads:[], bids:[] } }, errors: [] }
// The page also still reads the old { ny:{short,long,comply,events}, nj:{...}, zwtl } shape.
const fs = require("fs");

const NY_COUNTIES = ["NEW YORK","KINGS","QUEENS","BRONX","RICHMOND","NASSAU","SUFFOLK","WESTCHESTER"];
const NNJ_COUNTIES = ["BERGEN","ESSEX","HUDSON","PASSAIC","UNION","MORRIS"];
const SNJ_COUNTIES = ["ATLANTIC","BURLINGTON","CAMDEN","CAPE MAY","CUMBERLAND","GLOUCESTER","HUNTERDON","MERCER","MIDDLESEX","MONMOUTH","OCEAN","SALEM","SOMERSET","SUSSEX","WARREN"];
const NY_CITY_HINTS = ["NEW YORK","BROOKLYN","QUEENS","BRONX","STATEN ISLAND","LONG ISLAND CITY","MASPETH","RIDGEWOOD","JAMAICA","FLUSHING","COLLEGE POINT","ASTORIA","WESTBURY","HEMPSTEAD","MELVILLE","HAUPPAUGE","RONKONKOMA","FARMINGDALE","AMITYVILLE","BAY SHORE","HOLBROOK","BOHEMIA","HOLTSVILLE","GARDEN CITY","MINEOLA","SYOSSET","PLAINVIEW","COMMACK","SMITHTOWN","ISLANDIA","EDGEWOOD","BRENTWOOD","DEER PARK","COPIAGUE","LINDENHURST","BABYLON","HICKSVILLE","BETHPAGE","OYSTER BAY","GLEN COVE","PORT WASHINGTON","VALLEY STREAM","FREEPORT","ROCKVILLE CENTRE","HUNTINGTON","RIVERHEAD","ISLIP","CENTRAL ISLIP","PATCHOGUE","BELLPORT","YAPHANK","MEDFORD","SHIRLEY","CALVERTON","KINGS PARK","ST JAMES","PORT JEFFERSON","SELDEN","CENTEREACH","LAKE GROVE","WYANDANCH","NORTH BABYLON","WEST BABYLON","GREAT NECK","NEW HYDE PARK","LEVITTOWN","MASSAPEQUA","SEAFORD","WANTAGH","UNIONDALE","ELMONT","INWOOD","OCEANSIDE","LYNBROOK","CARLE PLACE","JERICHO","WOODBURY","WHITE PLAINS","YONKERS","TARRYTOWN","NEW ROCHELLE","MOUNT VERNON","PEEKSKILL","OSSINING","PORT CHESTER","RYE","SCARSDALE","HARRISON","PURCHASE","ELMSFORD","HAWTHORNE","VALHALLA","MAMARONECK","LARCHMONT","DOBBS FERRY","IRVINGTON","ARDSLEY","HARTSDALE","YORKTOWN","CROTON","BRIARCLIFF","PLEASANTVILLE","CHAPPAQUA","ARMONK","BEDFORD","KATONAH","MOUNT KISCO","SOMERS","THORNWOOD","BRONXVILLE","TUCKAHOE","EASTCHESTER","PELHAM","SLEEPY HOLLOW"];
const NNJ_CITY_HINTS = ["NEWARK","JERSEY CITY","PATERSON","ELIZABETH","UNION CITY","UNION","BAYONNE","HOBOKEN","KEARNY","HARRISON","NORTH BERGEN","SECAUCUS","WEEHAWKEN","WEST NEW YORK","CLIFTON","PASSAIC","WAYNE","TOTOWA","HACKENSACK","TEANECK","ENGLEWOOD","FORT LEE","FAIR LAWN","PARAMUS","RIDGEFIELD","MOONACHIE","CARLSTADT","LYNDHURST","RUTHERFORD","SADDLE BROOK","MAHWAH","RAMSEY","LODI","GARFIELD","MORRISTOWN","PARSIPPANY","DOVER","ROCKAWAY","DENVILLE","RANDOLPH","FLORHAM PARK","MADISON","EAST HANOVER","WHIPPANY","PINE BROOK","FAIRFIELD","MONTVILLE","BOONTON","LINDEN","RAHWAY","CRANFORD","WESTFIELD","SPRINGFIELD","KENILWORTH","ROSELLE","HILLSIDE","IRVINGTON","ORANGE","EAST ORANGE","WEST ORANGE","LIVINGSTON","MILLBURN","MAPLEWOOD","BLOOMFIELD","MONTCLAIR","NUTLEY","BELLEVILLE","VERONA","CEDAR GROVE","CALDWELL"];

const EXCLUDED = []; // no exclusions
const DESTROY = /listeria|salmonella|e\.? ?coli|contaminat|adulterat|foreign material|undeclared|mold|toxic|super ?potent|sub ?potent|failed dissolution|microbial|glass|metal|plastic fragment|penicillin|cross.?contact|cgmp|out of specification|degrad|impurit|nitrosamine/i;
const LABEL_ONLY = /label|misbrand only|missing warning statement/i;
const SPILL = /pfas|pfoa|pfos|afff|\bfoam\b|firefighting|solvent|acid|caustic|chemical|hazardous|drum|transformer|pcb|unknown chemical|laboratory|pharma/i;
function likelyAFFF(name){ return /fire district|firematic|fire department|fire training|fire academy|fire school|drill school|air national guard|\bANG base\b|air force base|\bAFB\b|naval weapons|naval air|\bNWIRP\b|naval station|air ?field|airport|coast guard station|firefighting|fire rescue/i.test(name||""); }

// ---- DROP RAW SEWAGE / WASTEWATER: Reworld doesn't service it, so it never hits the board.
const SEWAGE = /raw sewage|sewage|sanitary waste|septic|wastewater treatment plant|\bwwtp\b|publicly owned treatment|\bpotw\b|biosolid|sludge from sewage|municipal wastewater/i;
function isSewage(txt){ return SEWAGE.test(txt||""); }

// ---- SMALL-OPERATOR JUNK FILTER (retail / real estate that can't be real volume)
const SMALL_OPERATOR = /\bcleaners?\b|dry clean|laundr|\brealty\b|real estate|\bproperties\b|\bcollision\b|auto body|body shop|\bnail\b|\bsalon\b|\bdeli\b|\brestaurant\b|barber|\bspa\b/i;
function looksSmallRetail(name){ return SMALL_OPERATOR.test(name||""); }

// ---- INVASIVE SPECIES: invasive plant biomass must be hauled & destroyed
// (can't compost knotweed/phragmites — seeds & rhizomes survive). APHIS note in card text.
const INVASIVE = /japanese knotweed|knotweed|reynoutria|fallopia|polygonum cuspidatum|phragmites|common reed|water chestnut|trapa natans|mile-a-minute|persicaria perfoliata|tree-of-heaven|tree of heaven|ailanthus|purple loosestrife|lythrum|oriental bittersweet|asiatic bittersweet|celastrus|mugwort|multiflora rose|porcelain berry|japanese stiltgrass|stiltgrass|invasive species|invasive plant|invasive vegetation/i;
const APHIS_SPECIES = /mile-a-minute|persicaria perfoliata|water chestnut|trapa natans/i;
function invasiveNote(txt){
  if(!INVASIVE.test(txt||"")) return "";
  const aphis = APHIS_SPECIES.test(txt||"") ? " APHIS-SENSITIVE (mile-a-minute/water chestnut) — check interstate rules, default in-state disposal." : "";
  return " INVASIVE PLANT BIOMASS — must be hauled & destroyed (can't compost). Route Hempstead or partner, NEVER Babylon (APHIS)."+aphis;
}

// ---- WASTE STREAM CLASSIFIER: stamps each lead with one stream label (streams.js taxonomy).
function classifyStream(txt){
  const t = (txt||"").toLowerCase();
  if(INVASIVE.test(t)) return "Invasive Plant Biomass";
  if(/pfas|pfoa|pfos|afff|perfluor|firefighting foam/.test(t)) return "PFAS / AFFF";
  if(/contaminated soil|\bsoil\b|demolition|asbestos|excavat|dredge|idw|remediation waste/.test(t)) return "Contaminated Soil";
  if(/fuel oil|petroleum|\bdro\b|\bpah\b|oily|oil lagoon|diesel|gasoline|used oil/.test(t)) return "Oily Debris / Petroleum";
  if(/recall|expired|adulterat|undeclared|listeria|salmonella|consumer product|foreign material/.test(t)) return "Expired Consumer Goods";
  if(/pharma|drug|narcotic|controlled substance|otc|tablet|capsule|secure destruction|cgmp/.test(t)) return "Pharma / Secure Destruction";
  if(/solvent|acid|caustic|chemical bulk|reagent|laboratory|lab pack|corrosive|d001|ignitable|reactive/.test(t)) return "Chemical / Solvent";
  if(/rcra|hazardous.?waste|generator|violation/.test(t)) return "RCRA Hazardous (unspecified)";
  return "Other";
}

const TERRS = ["ny","nnj","snj","ct","ma"];
const out = { generated: new Date().toISOString(), territories: {}, errors: [] };
TERRS.forEach(t => out.territories[t] = { leads: [], bids: [] });
const unent = v => String(v==null?"":v).replace(/&amp;/g,"&").replace(/&#0?39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,"<").replace(/&gt;/g,">");
const excl = n => EXCLUDED.some(e => (n||"").toUpperCase().includes(e));

// push helper: stamps stream + drops sewage before anything lands on the board
function pushLead(terr, rec){
  const blob = `${rec.name||""} ${rec.cls||""} ${rec.desc||""}`;
  if(isSewage(blob)) return; // sewage never hits the board
  rec.stream = rec.stream || classifyStream(blob);
  const iNote = invasiveNote(blob);
  if(iNote){ rec.hot = true; rec.invasive = true; rec.desc = (rec.desc||"") + iNote; }
  out.territories[terr].leads.push(rec);
}
function pushBid(terr, rec){ rec.stream = "Government Bid"; out.territories[terr].bids.push(rec); }

function bigEnough(q){
  if(!q) return true;
  const t=String(q).toLowerCase();
  const m=t.match(/([\d,.]+)/);
  if(!m) return true;
  const n=parseFloat(m[1].replace(/,/g,""));
  if(!isFinite(n)) return true;
  if(/ton|pallet|truckload|drum|tote|supersack/.test(t)) return true;
  if(/\blb|pound/.test(t)) return n>=500;
  if(/\bkg|kilo/.test(t)) return n>=227;
  if(/gallon|\bgal\b/.test(t)) return n>=60;
  if(/case|carton|box/.test(t)) return n>=100;
  if(/bottle|unit|piece|jar|tube|bag|pack|each|count|vial|blister/.test(t)) return n>=1000;
  return true;
}
const hintMatch = (city,hints) => (city||"")==="" || hints.some(h=>(city||"").toUpperCase().includes(h));

async function get(url, opts={}){
  let lastErr;
  for(let attempt=0; attempt<3; attempt++){
    try{
      const r = await fetch(url, { headers: { "User-Agent": "market-watch-scan/2.0" }, ...opts });
      if(!r.ok) throw new Error(url.split("/")[2]+" HTTP "+r.status);
      return await r.json();
    }catch(e){ lastErr=e; if(attempt<2) await new Promise(res=>setTimeout(res,1500*(attempt+1))); }
  }
  throw lastErr;
}
async function getText(url){
  let lastErr;
  for(let attempt=0; attempt<3; attempt++){
    try{
      const r = await fetch(url, { headers: { "User-Agent": "market-watch-scan/2.0" } });
      if(!r.ok) throw new Error(url.split("/")[2]+" HTTP "+r.status);
      return await r.text();
    }catch(e){ lastErr=e; if(attempt<2) await new Promise(res=>setTimeout(res,1500*(attempt+1))); }
  }
  throw lastErr;
}

/* ---------------- recalls ---------------- */
const FDA_SPLIT = [
  ["ny","NY", city=>hintMatch(city,NY_CITY_HINTS)],
  ["nnj","NJ", city=>hintMatch(city,NNJ_CITY_HINTS)],
  ["snj","NJ", city=>!hintMatch(city,NNJ_CITY_HINTS)],   // NJ minus the six north counties' cities
  ["ct","CT", null],
  ["ma","MA", null]
];
async function fdaScans(){
  for(const st of ["NY","NJ","CT","MA"]){
    for(const ep of ["food","drug","device"]){
      try{
        const j = await get(`https://api.fda.gov/${ep}/enforcement.json?search=state:%22${st}%22+AND+status:%22Ongoing%22&sort=report_date:desc&limit=60`);
        const seenR=new Set();
        (j.results||[]).forEach(x=>{
          if((x.state||"").toUpperCase()!==st || excl(x.recalling_firm))return;
          const rkey=(x.recalling_firm||"")+"|"+(x.recall_initiation_date||"")+"|"+(x.reason_for_recall||"").slice(0,60);
          if(seenR.has(rkey))return; seenR.add(rkey);
          const reason=x.reason_for_recall||"";
          const hot=DESTROY.test(reason)&&!LABEL_ONLY.test(reason);
          if(x.classification==="Class III")return;
          if(x.classification==="Class II"&&!hot)return;
          if(!bigEnough(x.product_quantity))return;
          const hasQty=!!(x.product_quantity&&String(x.product_quantity).trim());
          const rec={source:"FDA "+ep,name:x.recalling_firm,location:`${x.city}, ${x.state}`,
            date:(x.recall_initiation_date||"").replace(/(\d{4})(\d{2})(\d{2})/,"$1-$2-$3"),cls:x.classification,hot,volUnknown:!hasQty,
            url:x.recall_number?`https://api.fda.gov/${ep}/enforcement.json?search=recall_number:%22${encodeURIComponent(x.recall_number)}%22`:undefined,
            desc:reason.slice(0,200)+(hasQty?` — Qty: ${String(x.product_quantity).slice(0,70)}`:" — no quantity listed, call to confirm scale")};
          FDA_SPLIT.forEach(([terr,state,cityOK])=>{
            if(state!==st)return;
            if(cityOK&&!cityOK(x.city))return;
            pushLead(terr,{...rec});
          });
        });
      }catch(e){ out.errors.push("FDA "+ep+" "+st+": "+e.message); }
    }
  }
}
async function fsisScan(){
  try{
    const j = await get("https://www.fsis.usda.gov/fsis/api/recall/v/1");
    const arr = Array.isArray(j)?j:(j.results||[]);
    arr.slice(0,200).forEach(x=>{
      const states=(x.field_states||"")+"";
      let name=x.field_establishment||x.field_title||"FSIS recall";
      if(Array.isArray(name))name=name[0]||unent(x.field_title||"")||"FSIS recall";
      name=unent(name);
      if(excl(name))return;
      const reason=(x.field_recall_reason||"")+" "+(x.field_title||"");
      const hot=DESTROY.test(reason);
      const base={source:"USDA FSIS",name,date:(x.field_recall_date||"").slice(0,10),cls:x.field_recall_classification||"",hot,url:"https://www.fsis.usda.gov/recalls",desc:unent(x.field_title||"").slice(0,200)};
      if(/New York/i.test(states))pushLead("ny",{...base,location:"NY distribution"});
      if(/New Jersey/i.test(states)){pushLead("nnj",{...base,location:"NJ distribution"});pushLead("snj",{...base,location:"NJ distribution"});}
      if(/Connecticut/i.test(states))pushLead("ct",{...base,location:"CT distribution"});
      if(/Massachusetts/i.test(states))pushLead("ma",{...base,location:"MA distribution"});
    });
  }catch(e){ out.errors.push("FSIS: "+e.message); }
}
async function cpscScan(){
  try{
    const since=new Date(Date.now()-30*864e5).toISOString().slice(0,10);
    const j = await get(`https://www.saferproducts.gov/RestWebServices/Recall?format=json&RecallDateStart=${since}`);
    (Array.isArray(j)?j:[]).slice(0,10).forEach(x=>{
      const name=(x.Manufacturers&&x.Manufacturers[0]&&x.Manufacturers[0].Name)||(x.Products&&x.Products[0]&&x.Products[0].Name)||"CPSC recall";
      if(excl(name))return;
      const hazard=(x.Hazards&&x.Hazards[0]&&x.Hazards[0].Name)||"";
      const rec={source:"CPSC",name,location:"national — verify warehouse in territory",date:(x.RecallDate||"").slice(0,10),cls:hazard.slice(0,40),hot:false,url:x.URL||undefined,desc:((x.Products&&x.Products[0]&&x.Products[0].Name)||"").slice(0,180)};
      TERRS.forEach(t=>pushLead(t,{...rec}));
    });
  }catch(e){ out.errors.push("CPSC: "+e.message); }
}

/* ---------------- spills & remediation registries ---------------- */
async function spillScan(){
  try{
    const since=new Date(Date.now()-21*864e5).toISOString().slice(0,10);
    const where=encodeURIComponent(`spill_date>'${since}' AND upper(county) in ('NEW YORK','KINGS','QUEENS','BRONX','RICHMOND','NASSAU','SUFFOLK','WESTCHESTER')`);
    const j = await get(`https://data.ny.gov/resource/u44d-k5fk.json?$where=${where}&$order=:id DESC&$limit=400`);
    j.forEach(x=>{
      const mat=x.material_name||"";
      if(!SPILL.test(mat)&&parseFloat(x.quantity||0)<300)return;
      const pfas=/pfas|pfoa|pfos|afff|\bfoam\b/i.test(mat);
      const qn=parseFloat(x.quantity||"0");
      if(!pfas&&(!isFinite(qn)||qn<60))return;
      if(excl(x.facility_name))return;
      const hasQty=!!(x.quantity&&parseFloat(x.quantity)>0);
      pushLead("ny",{source:"NY Spill DB",name:x.facility_name||x.locality||"Spill site",url:"https://data.ny.gov/Energy-Environment/Spill-Incidents/u44d-k5fk",location:`${x.locality||""}, ${x.county} Co.`,date:(x.spill_date||"").slice(0,10),hot:SPILL.test(mat),pfas,volUnknown:!hasQty,desc:`${mat} — ${hasQty?(x.quantity+" "+(x.units||"")):"quantity not reported, call to confirm scale"}. ${x.contributing_factor||""}`});
    });
  }catch(e){ out.errors.push("NY spills: "+e.message); }
}
async function remediationScans(){
  // NYSDEC class 02
  try{
    const j = await get(`https://data.ny.gov/resource/c6ci-rzpg.json?$where=siteclass='02'&$limit=8000`);
    const seen=new Set();
    (Array.isArray(j)?j:[]).forEach(x=>{
      const cty=(x.county||"").toUpperCase();
      if(!NY_COUNTIES.some(c=>cty.includes(c)))return;
      const name=x.program_facility_name||x.sitename||"Remediation site";
      if(excl(name)||seen.has(name))return; seen.add(name);
      const blob=JSON.stringify(x);
      const pfas=/pfas|pfoa|pfos|perfluor/i.test(blob)||likelyAFFF(name);
      pushLead("ny",{source:"NYSDEC",name,url:"https://data.ny.gov/Energy-Environment/Environmental-Remediation-Sites/c6ci-rzpg",location:`${x.address1||x.address||""}, ${x.locality||""} (${x.county} Co.)`,cls:"Class 02 — active",pfas,hot:pfas,registry:true,lat:parseFloat(x.latitude)||null,lon:parseFloat(x.longitude)||null,desc:(x.program_type||"State remediation")+(pfas?" — PFAS/AFFF flagged, verify":"")});
    });
  }catch(e){ out.errors.push("NYSDEC: "+e.message); }
  // NJDEP KCS — north and south splits
  for(const [terr,counties] of [["nnj",NNJ_COUNTIES],["snj",SNJ_COUNTIES]]){
    try{
      const where=encodeURIComponent("UPPER(COUNTY) IN ("+counties.map(c=>"'"+c+"'").join(",")+")");
      const j = await get(`https://mapsdep.nj.gov/arcgis/rest/services/Features/Environmental_NJEMS/MapServer/0/query?where=${where}&outFields=*&f=json&resultRecordCount=200`);
      let n=0;
      (j.features||[]).forEach(f=>{
        const a=f.attributes||{};
        const name=a.PI_NAME||a.SITE_NAME||"Contaminated site";
        if(excl(name)||n>=60)return; n++;
        const blob=JSON.stringify(a);
        const pfas=/pfas|pfoa|pfos|perfluor/i.test(blob)||likelyAFFF(name);
        pushLead(terr,{source:"NJDEP KCS",name,url:"https://www.nj.gov/dep/srp/kcsnj/",location:`${a.ADDRESS||""}, ${a.MUNICIPALITY||""} (${a.COUNTY||""} Co.)`,pfas,hot:pfas,registry:true,lat:parseFloat(a.LATITUDE||a.Y)||null,lon:parseFloat(a.LONGITUDE||a.X)||null,desc:(a.STATUS||"Known contaminated site")+(pfas?" — PFAS/AFFF flagged, verify":"")});
      });
    }catch(e){ out.errors.push("NJDEP KCS "+terr+": "+e.message); }
  }
  // NJDEP IEC (priority) — split by county
  try{
    const j = await get(`https://njwebmap.state.nj.us/arcgis/rest/services/Features/Environmental_NJEMS/MapServer/20/query?where=1%3D1&outFields=*&f=json&resultRecordCount=1000`);
    const NJC=[...NNJ_COUNTIES,...SNJ_COUNTIES];
    let n=0;const seen=new Set();
    (j.features||[]).forEach(f=>{
      const a=f.attributes||{};
      let cty="";
      for(const k in a){ const U=(a[k]==null?"":String(a[k])).trim().toUpperCase(); if(NJC.includes(U)){cty=U;break;} }
      if(!cty)return;
      const terr=NNJ_COUNTIES.includes(cty)?"nnj":"snj";
      const name=a.CASE_NAME||a.CASENAME||a.PI_NAME||a.SITE_NAME||a.PREF_NAME||a.NAME||"IEC site";
      const muni=a.MUNICIPALITY||a.MUNI||a.CITY||"";
      if(excl(name))return;
      const dk=(name+"|"+muni+"|"+cty).toUpperCase(); if(seen.has(dk))return; seen.add(dk);
      if(n>=60)return; n++;
      const blob=JSON.stringify(a);
      const pfas=/pfas|pfoa|pfos|perfluor|afff/i.test(blob)||likelyAFFF(name);
      pushLead(terr,{source:"NJDEP IEC",name,url:"https://www.nj.gov/dep/srp/kcsnj/",location:`${a.ADDRESS||a.STREET||""}, ${muni} (${cty} Co.)`,cls:"Immediate Environmental Concern",hot:true,pfas,lat:parseFloat(a.LATITUDE||a.LAT||a.Y)||null,lon:parseFloat(a.LONGITUDE||a.LONG||a.X)||null,desc:"PRIORITY remediation — immediate environmental concern. Urgent contaminated-soil and remediation-waste cleanout."+(pfas?" PFAS/AFFF flagged, verify.":"")+" Call responsible party or LSRP early."});
    });
  }catch(e){ out.errors.push("NJ IEC: "+e.message); }
  // CT DEEP open remediation cases
  try{
    const progs=["RCRA Corrective Action","Release-Based","State Remediation","Brownfield - BRRP","Significant Environmental Hazard (SEH)","Federal Remediation - CERCLA Superfund-NPL","Enforcement"];
    const where=encodeURIComponent("case_status='Open' AND case_program in("+progs.map(p=>"'"+p.replace(/'/g,"''")+"'").join(",")+")");
    const j = await get("https://data.ct.gov/resource/xcxg-6jqp.json?$where="+where+"&$order=case_number DESC&$limit=400");
    const seen=new Set();let n=0;
    (Array.isArray(j)?j:[]).forEach(x=>{
      const name=(x.case_name||"CT site").toString().replace(/ LUST$/i,"").trim();
      const dk=(name+"|"+(x.official_town||"")).toUpperCase(); if(seen.has(dk)||n>=80)return; seen.add(dk); n++;
      const prog=x.case_program||"";
      const pfas=/pfas|pfoa|pfos|perfluor|afff/i.test(name+" "+prog)||likelyAFFF(name);
      pushLead("ct",{source:"CT DEEP Sites",name,url:"https://data.ct.gov/Environment-and-Natural-Resources/Contaminated-or-Potentially-Contaminated-Sites-Lis/xcxg-6jqp",location:((x.case_address||"").replace(/,?\s*US$/,""))+" ("+(x.official_town||"")+", CT)",cls:prog.slice(0,30),pfas,hot:pfas,registry:true,lat:parseFloat(x.site_id_latitude)||null,lon:parseFloat(x.site_id_longitude)||null,desc:prog+" · "+(x.case_status||"Open")+(pfas?" — PFAS/AFFF, verify":"")});
    });
  }catch(e){ out.errors.push("CT DEEP: "+e.message); }
  // MassDEP C21e
  try{
    const hosts=["https://arcgisserver.digital.mass.gov/arcgisserver/rest/services/AGOL/C21e/MapServer/0/query","https://gisprpxy.itd.state.ma.us/arcgisserver/rest/services/AGOL/C21e/MapServer/0/query"];
    let done=false,lastErr;
    for(const base of hosts){
      if(done)break;
      try{
        const j = await get(base+"?where=1%3D1&outFields=*&outSR=4326&f=json&resultRecordCount=1500");
        if(j.error||!j.features)throw new Error((j.error&&j.error.message)||"no features");
        const seen=new Set();let n=0;
        j.features.forEach(f=>{
          const a=f.attributes||{},name=(a.NAME||a.Name||a.SITE_NAME||"MA 21E site").toString().trim();
          const town=a.TOWN||a.Town||a.MUNICIPALITY||"";
          const dk=(name+"|"+town).toUpperCase(); if(seen.has(dk)||n>=80)return; seen.add(dk); n++;
          const blob=JSON.stringify(a).toLowerCase();
          const pfas=/pfas|pfoa|pfos|perfluor|afff/.test(blob)||likelyAFFF(name);
          const g=f.geometry||{};
          pushLead("ma",{source:"MassDEP 21E",name,url:"https://eeaonline.eea.state.ma.us/portal#!/search/wastesite",location:(a.ADDRESS||a.Address||"")+", "+town+" (MA)",pfas,hot:pfas,registry:true,lat:g.y||null,lon:g.x||null,desc:(a.STATUS||a.Status||"MGL c.21E tier-classified site")+(pfas?" — PFAS-flagged":"")});
        });
        done=true;
      }catch(e){ lastErr=e; }
    }
    if(!done)out.errors.push("MassDEP C21e: "+((lastErr&&lastErr.message)||"both hosts failed"));
  }catch(e){ out.errors.push("MassDEP C21e: "+e.message); }
}

/* ---------------- compliance (LQG generators + TRI + Title V) ----------------
   NOTE: RCRA violators feed (ECHO p_qiv) intentionally REMOVED — no size code,
   floods the board with dry cleaners / realty LLCs. Generator feed below is
   filtered to LQG + big-blank only. */
async function complyScans(){
  const CFG=[["ny","NY",NY_COUNTIES],["nnj","NJ",NNJ_COUNTIES],["snj","NJ",SNJ_COUNTIES],["ct","CT",null],["ma","MA",null]];
  for(const [terr,st,counties] of CFG){
    try{
      const gj = await get(`https://echodata.epa.gov/echo/rcra_rest_services.get_facilities?output=JSON&p_st=${st}&p_act=Y&responseset=1000`);
      let gfac=(gj.Results&&gj.Results.Facilities)||[];
      const gqid=gj.Results&&gj.Results.QueryID;
      if((!gfac||!gfac.length)&&gqid){
        const gjq=await get(`https://echodata.epa.gov/echo/rcra_rest_services.get_qid?output=JSON&qid=${gqid}&responseset=800&pageno=1`);
        gfac=(gjq.Results&&gjq.Results.Facilities)||[];
      }
      const gseen=new Set(); let gn=0;
      gfac.forEach(f=>{
        const cty=(f.RCRACounty||f.CountyName||"").toUpperCase();
        if(counties&&!counties.some(c=>cty.includes(c)))return;
        const name=f.RCRAName||f.FacName||"Facility";
        if(excl(name))return;
        const uni=((f.RCRAUniverse||f.UniverseRecord||f.HreportUniverseRecord||f.RCRAGenStatus||f.GeneratorStatus||f.FedGeneratorStatus||f.RCRAFederalGeneratorStatus||f.FacFederalGeneratorStatus||"")+"").toUpperCase();
        const isLQG=/LQG|LARGE QUANTITY/.test(uni);
        const isSmall=/SQG|VSQG|CESQG|SMALL QUANTITY|VERY SMALL/.test(uni);
        if(isSmall) return;                          // confirmed small → drop
        if(!isLQG && looksSmallRetail(name)) return; // blank + retail/RE → drop
        const dk=(name+"|"+(f.RCRACity||f.FacCity||"")).toUpperCase(); if(gseen.has(dk))return; gseen.add(dk);
        if(gn>=40)return; gn++;
        pushLead(terr,{source:"EPA RCRA",name,location:`${f.RCRACity||f.FacCity||""}, ${cty||st}`,cls:isLQG?"Large Quantity Generator":"Hazardous waste generator",hot:isLQG,registry:true,
          lat:parseFloat(f.FacLat||f.RCRALat)||null,lon:parseFloat(f.FacLong||f.RCRALong)||null,
          url:(f.RegistryID||f.RegistryId)?`https://echo.epa.gov/detailed-facility-report?fid=${f.RegistryID||f.RegistryId}`:undefined,
          desc:(isLQG?"LARGE QUANTITY GENERATOR — 1+ ton hazardous waste per month. ":"RCRA-registered hazardous waste generator. ")+"Routing/brokering prospect. Qualify streams, volume, current vendor, contract renewal."});
      });
    }catch(e){ out.errors.push("RCRAgen "+terr+": "+e.message); }
    try{
      const j = await get(`https://data.epa.gov/efservice/tri_facility/state_abbr/${st}/rows/0:400/JSON`);
      let n=0;
      (Array.isArray(j)?j:[]).forEach(f=>{
        const cty=(f.county_name||f.COUNTY_NAME||"").toUpperCase();
        if(counties&&!counties.some(c=>cty.includes(c)))return;
        const name=f.facility_name||f.FACILITY_NAME||"";
        if(!name||excl(name)||n>=25)return; n++;
        pushLead(terr,{source:"EPA TRI",name,url:"https://enviro.epa.gov/envirofacts/tri/search",location:`${f.city_name||f.CITY_NAME||""}, ${cty||st}`,cls:"TRI reporter",registry:true,desc:"Already generating and paying for industrial waste disposal — ZWTL conversion conversation."});
      });
    }catch(e){ out.errors.push("TRI "+terr+": "+e.message); }
  }
  // NYSDEC Title V (NY only)
  try{
    const j = await get(`https://data.ny.gov/resource/4ry5-tfin.json?$limit=5000`);
    let n=0;const seen=new Set();
    (Array.isArray(j)?j:[]).forEach(x=>{
      const cty=(x.county||x.county_name||x.facility_county||"").toUpperCase();
      if(!NY_COUNTIES.some(c=>cty.includes(c)))return;
      const name=x.facility_name||x.facility||x.site_name||x.name||"";
      if(!name||excl(name))return;
      const dk=name.toUpperCase(); if(seen.has(dk))return; seen.add(dk);
      if(n>=30)return; n++;
      pushLead("ny",{source:"NYSDEC Title V",name,url:"https://data.ny.gov/Energy-Environment/Title-V-Emissions-Inventory-Beginning-2010/4ry5-tfin",location:`${x.facility_city||x.city||""}, ${cty} Co.`,cls:"Title V air permit",registry:true,desc:"Emits regulated hazardous air pollutants under Title V — heavy industrial, generates profiled/RCRA waste. Routing + ZWTL target. Qualify streams, volume, current vendor."});
    });
  }catch(e){ out.errors.push("Title V: "+e.message); }
}

/* ---------------- events (demolitions, fires, bulk storage, bankruptcies) ---------------- */
async function eventsScans(){
  const since=new Date(Date.now()-30*864e5).toISOString().slice(0,10);
  try{
    const j = await get(`https://data.cityofnewyork.us/resource/rbx6-tga4.json?$where=issued_date>'${since}'&$order=issued_date DESC&$limit=1000`);
    let n=0;
    (Array.isArray(j)?j:[]).forEach(x=>{
      const wt=(x.work_type||x.job_type||"").toUpperCase();
      if(!/DEMOLITION|\bDM\b/.test(wt)||n>=20)return;
      const oname=[x.owner_business_name,x.applicant_business_name].find(v=>v&&!/not applicable|n\/a/i.test(v))||`${x.house_no||""} ${x.street_name||""}`.trim()||"Demolition site";
      n++;
      pushLead("ny",{source:"NYC DOB",name:oname,url:"https://data.cityofnewyork.us/Housing-Development/DOB-Permit-Issuance/rbx6-tga4",location:`${x.house_no||""} ${x.street_name||""}, ${x.borough||""}`,date:(x.issued_date||"").slice(0,10),cls:"Demolition permit",hot:true,desc:"Full demolition permitted — contaminated soil, asbestos abatement waste, and industrial cleanout streams incoming."});
    });
  }catch(e){ out.errors.push("NYC DOB: "+e.message); }
  try{
    const j = await get(`https://data.cityofnewyork.us/resource/tm6d-hbzd.json?$where=incident_date_time>'${since}'&$order=incident_date_time DESC&$limit=2000`);
    let n=0;
    (Array.isArray(j)?j:[]).forEach(x=>{
      const it=(x.incident_type_desc||"");
      const pu=(x.property_use_desc||"").toUpperCase();
      if(!/^1/.test(x.incident_type||"")&&!/FIRE/i.test(it))return;
      if(!/WAREHOUSE|STORAGE|MANUFACT|MERCANTILE|BUSINESS|INDUSTR|FOOD|LABORATOR/.test(pu)||n>=15)return;
      n++;
      pushLead("ny",{source:"FDNY",name:pu.slice(0,60),url:"https://data.cityofnewyork.us/Public-Safety/Incidents-Responded-to-by-Fire-Companies/tm6d-hbzd",location:`${x.borough_desc||x.borough||""}`,date:(x.incident_date_time||"").slice(0,10),cls:"Commercial fire",hot:true,desc:(it||"Structure fire")+" at commercial property — fire/smoke/water-damaged inventory needs certified destruction for insurance."});
    });
  }catch(e){ out.errors.push("FDNY: "+e.message); }
  try{
    const j = await get(`https://data.ny.gov/resource/pteg-c78n.json?$limit=5000`);
    let n=0;const seen=new Set();
    (Array.isArray(j)?j:[]).forEach(x=>{
      const cty=(x.county||x.county_name||"").toUpperCase();
      if(!NY_COUNTIES.some(c=>cty.includes(c)))return;
      const name=x.facility_name||x.site_name||x.name||"";
      if(!name||seen.has(name)||n>=20)return;
      seen.add(name);n++;
      pushLead("ny",{source:"NYSDEC CBS",name,url:"https://data.ny.gov/Energy-Environment/Chemical-Bulk-Storage-CBS-Facilities/pteg-c78n",location:`${x.locality||x.city||""}, ${x.county} Co.`,cls:"Chemical bulk storage",registry:true,desc:"Registered chemical bulk storage facility — standing profiled-waste and RCRA routing prospect."});
    });
  }catch(e){ out.errors.push("NYSDEC CBS: "+e.message); }
  for(const [terr,courts,loc] of [["ny","nysb+nyeb","SDNY/EDNY"],["nnj","njb","D.N.J."],["snj","njb","D.N.J."],["ct","ctb","D. Conn."],["ma","mab","D. Mass."]]){
    try{
      const j = await get(`https://www.courtlistener.com/api/rest/v4/search/?type=r&q=chapter&court=${courts}&order_by=dateFiled+desc`);
      let n=0;
      const BIZ=/\b(LLC|L\.L\.C|INC|CORP|CO\.|LTD|LP|LLP|COMPANY|ENTERPRISES?|GROUP|HOLDINGS?|INDUSTR|MANUFACTUR|FOODS?|PHARMA|LABS?|LABORATOR|DISTRIBUT|LOGISTICS|SUPPLY|PRODUCTS?|BRANDS?|RETAIL|STORES?|MARKET)\b/i;
      ((j&&j.results)||[]).forEach(x=>{
        const name=x.caseName||x.case_name||"";
        if(!name||n>=12)return;
        if(!BIZ.test(name))return;   // personal consumer filings are not prospects
        n++;
        pushLead(terr,{source:"Bankruptcy Ct",name:name.slice(0,80),url:"https://www.courtlistener.com/?type=r&q=chapter&order_by=dateFiled+desc",location:loc,date:(x.dateFiled||x.date_filed||"").slice(0,10),cls:"Filing",desc:"Recent bankruptcy filing — if distributor/retailer/manufacturer, liquidated inventory may need certified brand-protection destruction. Verify entity type."});
      });
    }catch(e){ out.errors.push("Bankruptcy "+terr+": "+e.message); }
  }
}

/* ---------------- ZWTL — SEC EDGAR full-text search ---------------- */
async function zwtlScan(){
  try{
    const since = new Date(Date.now()-90*864e5).toISOString().slice(0,10);
    const today = new Date().toISOString().slice(0,10);
    const q = encodeURIComponent('"zero waste to landfill"');
    const url = `https://efts.sec.gov/LATEST/search-index?q=${q}&forms=10-K,8-K&startdt=${since}&enddt=${today}`;
    const j = await get(url, { headers: { "User-Agent": "Reworld Market Watch rsalce@reworldwaste.com" } });
    const hits = (j && (j.hits && j.hits.hits)) || j.filings || [];
    let n = 0;
    hits.forEach(h=>{
      if(n>=20) return;
      const src = h._source || h;
      const names = src.display_names || src.displayNames || [];
      const name = (Array.isArray(names) ? names[0] : names) || src.company_name || src.entityName || "Public company (name unavailable — check filing)";
      const formType = src.formType || src.form_type || "SEC filing";
      const filedAt = (src.file_date || src.filedAt || src.filed_date || "").slice(0,10);
      const accessionNo = (src.adsh || src.accessionNo || h._id || "").replace(/[^0-9-]/g,"");
      const cik = (Array.isArray(src.ciks) ? src.ciks[0] : src.cik || "").replace(/^0+/,"");
      const filingUrl = accessionNo && cik
        ? `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNo.replace(/-/g,"")}/${accessionNo}-index.htm`
        : "https://www.sec.gov/cgi-bin/browse-edgar";
      n++;
      const rec={source:"SEC EDGAR", name: name.replace(/\s*\(CIK[^)]*\)/i,""), location:"national — verify facility in territory", date: filedAt, cls: formType, url: filingUrl, stream:"ZWTL Conversion", zwtl:true, desc:"Public filing mentions \"zero waste to landfill\" — could be a live commitment or generic ESG language. Pull up the filing before treating as a lead; cross-check whether they have a facility in territory."};
      TERRS.forEach(t=>pushLead(t,{...rec}));
    });
  }catch(e){ out.errors.push("SEC EDGAR ZWTL: "+e.message); }
}

/* ---------------- environmental bids (server-side — CORS-blocked in the browser) ---------------- */
async function bidScans(){
  // NY State Contract Reporter → ny
  try{
    const html=await getText("https://www.nyscr.ny.gov/Ads/Search");
    const text=html.replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ");
    const blocks=text.split(/Title:/i).slice(1);
    const counties=["Nassau","Suffolk","Westchester","Queens","Brooklyn","Bronx","Manhattan","Staten Island","New York, NY","New York City"];
    let n=0;
    blocks.forEach(b=>{
      if(n>=25)return;
      const cat=(b.match(/Category:\s*([^|]+?)\s*(?:Location:|Issue date:|Due date:|CR#|$)/i)||[])[1];
      if(!cat||!/environmental/i.test(cat))return;
      const loc=(b.match(/Location:\s*([^|]+?)\s*(?:Issue date:|Due date:|Category:|$)/i)||[])[1]||"";
      if(!counties.some(c=>loc.includes(c)))return;
      const title=(b.match(/^\s*([^|]+?)\s*(?:CR#|Agency:|Note:)/i)||[])[1]||"Environmental bid — see listing";
      const agency=(b.match(/Agency:\s*([^|]+?)\s*(?:Division:|Issue date:|Due date:|Location:|Category:|$)/i)||[])[1]||"";
      const due=(b.match(/Due date:\s*([^|]+?)\s*(?:Location:|Category:|$)/i)||[])[1]||"";
      const crNum=(b.match(/CR#:?\s*([A-Za-z0-9-]+)/i)||[])[1]||"";
      n++;
      pushBid("ny",{source:"NYS Contract Reporter",name:title.trim(),location:loc.trim(),date:due.trim(),cls:"Environmental",bid:true,desc:`Open bid from ${agency.trim()||"a NY agency"} — CR# ${crNum||"see listing"}. Listing is public; full bid document requires a free NYSCR account.`,url:"https://www.nyscr.ny.gov/Ads/Search"});
    });
  }catch(e){ out.errors.push("NYSCR bids: "+e.message); }
  // NJSTART → nnj + snj
  try{
    const html=await getText("https://www.njstart.gov/bso/view/search/external/advancedSearchBid.xhtml?openBids=true");
    const text=html.replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ");
    const rowRe=/(\d{2}[A-Z]{3}\d{5})\s+\1\s+(.*?)\s+(T\d{4}\s*-\s*.*?)\s+(\d{2}\/\d{2}\/\d{4})/g;
    let m,n=0;
    while((m=rowRe.exec(text))&&n<25){
      const desc=(m[3]||"").trim();
      const orgBuyer=(m[2]||"").trim();
      if(!/environmental|hazardous|remediation|contaminat|waste|pfas|asbestos|air quality|water|sewer|clean energy|conservation|recycl/i.test(desc))continue;
      n++;
      const rec={source:"NJSTART",name:desc.slice(0,90),location:orgBuyer.slice(0,60),date:m[4],cls:"Environmental",bid:true,desc:`Solicitation ${m[1]} — ${orgBuyer.slice(0,80)}. Listing is public; full bid document requires a free NJSTART account.`,url:"https://www.njstart.gov/bso/view/search/external/advancedSearchBid.xhtml?openBids=true"};
      pushBid("nnj",{...rec}); pushBid("snj",{...rec});
    }
  }catch(e){ out.errors.push("NJSTART bids: "+e.message); }
}


/* ---------------- NEW SOURCES (docs/SOURCES.md wiring, 2026-07-09) ---------------- */

// APHIS HPAI detections — poultry flocks + mammals/livestock. Depopulation/disposal events.
async function hpaiScan(){
  const PAGES=[
    ["https://www.aphis.usda.gov/livestock-poultry-disease/avian/avian-influenza/hpai-detections/commercial-backyard-flocks","flocks"],
    ["https://www.aphis.usda.gov/livestock-poultry-disease/avian/avian-influenza/hpai-detections/mammals","mammals/livestock"]
  ];
  const STATES=[["New York",["ny"]],["New Jersey",["nnj","snj"]],["Connecticut",["ct"]],["Massachusetts",["ma"]]];
  for(const [pageUrl,kind] of PAGES){
    try{
      let rows=[],got="";
      // known published CSVs first, then any CSV linked from the page, then the page text itself
      const CSV_CANDIDATES=[
        "https://www.aphis.usda.gov/sites/default/files/commercial-backyard-flocks.csv",
        "https://www.aphis.usda.gov/sites/default/files/hpai-mammals.csv",
        "https://www.aphis.usda.gov/sites/default/files/hpai-livestock-detections.csv"
      ];
      for(const cu of CSV_CANDIDATES){
        if(got)break;
        try{const csv=await getText(cu);if(csv&&csv.includes(",")&&csv.length>200){rows=csv.split(/\r?\n/);got=cu}}catch(e){}
      }
      const html=got?"":await getText(pageUrl);
      if(!got){
        const csvHref=(html.match(/href="([^"]+\.csv[^"]*)"/i)||[])[1];
        if(csvHref){
          const csvUrl=csvHref.startsWith("http")?csvHref:new URL(csvHref,pageUrl).href;
          const csv=await getText(csvUrl);rows=csv.split(/\r?\n/);got=csvUrl;
        }else{
          rows=html.replace(/<[^>]+>/g,"|").split(/\n|\|{2,}/);
        }
      }
      let anyStateRows=0;
      for(const row of rows){if(/New York|New Jersey|Connecticut|Massachusetts|Ohio|Iowa|California|Texas|Wisconsin|Minnesota/.test(row))anyStateRows++;}
      const since=Date.now()-60*864e5;
      let n=0;
      for(const row of rows){
        for(const [stName,terrs] of STATES){
          if(!row.includes(stName))continue;
          const dm=row.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})|(\d{4}-\d{2}-\d{2})/);
          const dt=dm?new Date(dm[0]):null;
          if(dt&&isFinite(+dt)&&+dt<since)continue;
          if(n>=20)break;
          n++;
          const county=(row.match(new RegExp(stName+"[^a-zA-Z]*([A-Za-z .]{3,30}?)\\s*(County|Co\\.|,)","i"))||[])[1]||"";
          for(const t of terrs)pushLead(t,{source:"APHIS HPAI",name:("HPAI detection — "+(county?county+" County, ":"")+stName).slice(0,80),
            location:(county?county+" County, ":"")+stName,date:dt&&isFinite(+dt)?dt.toISOString().slice(0,10):"",
            cls:"HPAI "+kind,hot:true,aphis:true,url:pageUrl,
            desc:"Confirmed HPAI detection ("+kind+") — depopulation and carcass/litter disposal event. APHIS-regulated material: route per facility APHIS rules (never Babylon). Row: "+row.replace(/\s+/g," ").trim().slice(0,140)});
        }
      }
      if(!n)out.errors.push("APHIS HPAI "+kind+": fetched "+(got?("CSV "+got.split("/").pop()):"page")+", "+(anyStateRows?("no NY/NJ/CT/MA detections in the last 60 days ("+anyStateRows+" rows in other states — real absence, not an error)"):"no state rows recognized — format changed"));
    }catch(e){ out.errors.push("APHIS HPAI "+kind+": "+e.message); }
  }
}

// SAM.gov federal opportunities — needs free API key as Actions secret SAM_API_KEY (rotate every 90 days).
async function samScan(){
  const key=process.env.SAM_API_KEY;
  if(!key){ out.errors.push("SAM.gov: SAM_API_KEY not set — create a free key at sam.gov (Account Details) and add it as a repo Actions secret"); return; }
  const fmt=d=>{const p=n=>String(n).padStart(2,"0");return p(d.getMonth()+1)+"/"+p(d.getDate())+"/"+d.getFullYear()};
  const to=new Date(),from=new Date(Date.now()-30*864e5);
  const CFG=[["NY",["ny"]],["NJ",["nnj","snj"]],["CT",["ct"]],["MA",["ma"]]];
  for(const [st,terrs] of CFG){
    try{
      const u=`https://api.sam.gov/opportunities/v2/search?api_key=${encodeURIComponent(key)}&postedFrom=${encodeURIComponent(fmt(from))}&postedTo=${encodeURIComponent(fmt(to))}&state=${st}&ncode=562910&limit=40`;
      const j=await get(u);
      let n=0;
      ((j&&j.opportunitiesData)||[]).forEach(o=>{
        if(n>=15)return;n++;
        const rec={source:"SAM.gov",name:(o.title||"Federal solicitation").slice(0,90),
          location:((o.placeOfPerformance&&o.placeOfPerformance.city&&o.placeOfPerformance.city.name)||"")+", "+st,
          date:(o.postedDate||"").slice(0,10),cls:(o.type||"Solicitation").slice(0,30),bid:true,
          url:o.uiLink||("https://sam.gov/opp/"+(o.noticeId||"")),
          desc:("Federal environmental remediation opportunity ("+(o.solicitationNumber||o.noticeId||"")+") — "+(o.fullParentPathName||"")).slice(0,220)};
        terrs.forEach(t=>pushBid(t,{...rec}));
      });
    }catch(e){ out.errors.push("SAM.gov "+st+": "+e.message); }
  }
}

// CTsource / Proactis WebProcure public bid board (CT state solicitations).
async function ctsourceScan(){
  try{
    const html=await getText("https://webprocure.proactiscloud.com/wp-web-public/");
    const text=html.replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ");
    if(text.trim().length<1500){ out.errors.push("CTsource: WebProcure board looks JS-rendered — needs a headless/API route; investigate network calls"); return; }
    const chunks=text.split(/(?=Solicitation|RFP|Invitation to Bid|ITB|RFQ)/i).slice(0,200);
    let n=0;
    for(const c of chunks){
      if(n>=20)break;
      if(!/environmental|hazardous|remediation|contaminat|waste|pfas|asbestos|landfill|recycl|water treatment/i.test(c))continue;
      n++;
      pushBid("ct",{source:"CTsource",name:c.trim().slice(0,90),location:"State of Connecticut",cls:"Environmental",bid:true,
        url:"https://webprocure.proactiscloud.com/wp-web-public/",
        desc:c.trim().slice(0,200)+" — public board, no account needed to view."});
    }
    if(!n)out.errors.push("CTsource: board fetched, 0 environmental matches this pass");
  }catch(e){ out.errors.push("CTsource: "+e.message); }
}

// COMMBUYS public bid search (MA state + municipal). Same BuySpeed/bso family as NJSTART.
async function commbuysScan(){
  try{
    const html=await getText("https://www.commbuys.com/bso/view/search/external/advancedSearchBid.xhtml?openBids=true");
    const text=html.replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ");
    const rowRe=/(BD-\d{2}-[A-Z0-9-]+)\s+(.{10,160}?)\s+(\d{2}\/\d{2}\/\d{4})/g;
    let m,n=0;
    while((m=rowRe.exec(text))&&n<20){
      const desc=(m[2]||"").trim();
      if(!/environmental|hazardous|remediation|contaminat|waste|pfas|asbestos|landfill|recycl|water/i.test(desc))continue;
      n++;
      pushBid("ma",{source:"COMMBUYS",name:desc.slice(0,90),location:"Massachusetts",date:m[3],cls:"Environmental",bid:true,
        url:"https://www.commbuys.com/bso/view/search/external/advancedSearchBid.xhtml?openBids=true",
        desc:"Solicitation "+m[1]+" — "+desc.slice(0,160)+". Public listing; documents free on COMMBUYS."});
    }
    if(!n)out.errors.push("COMMBUYS: page fetched, 0 environmental bid rows matched — verify row regex against live HTML");
  }catch(e){ out.errors.push("COMMBUYS: "+e.message); }
}

// NY iMapInvasives occurrences via GBIF (no login; Darwin Core publication path).
async function invasiveScan(){
  try{
    const ds=await get("https://api.gbif.org/v1/dataset/search?q=iMapInvasives&limit=5");
    const hit=((ds&&ds.results)||[]).find(d=>/imap\s?invasives/i.test(d.title||""));
    const yr=new Date().getFullYear();
    let j;
    if(hit){
      j=await get(`https://api.gbif.org/v1/occurrence/search?datasetKey=${hit.key}&stateProvince=New%20York&year=${yr-1},${yr}&limit=120`);
    }else{
      // fallback: query priority species directly (any GBIF publisher, NY, last 2 years)
      const SPECIES=["Reynoutria japonica","Trapa natans","Persicaria perfoliata","Ailanthus altissima","Celastrus orbiculatus"];
      const merged=[];
      for(const sp of SPECIES){
        try{
          const r=await get(`https://api.gbif.org/v1/occurrence/search?scientificName=${encodeURIComponent(sp)}&stateProvince=New%20York&country=US&year=${yr-1},${yr}&limit=40`);
          merged.push(...((r&&r.results)||[]));
        }catch(e){}
      }
      j={results:merged};
    }
    const seen=new Set();let n=0;
    ((j&&j.results)||[]).forEach(o=>{
      const sp=o.vernacularName||o.species||o.scientificName||"";
      if(!INVASIVE.test(sp))return;
      const loc=[o.county,o.locality].filter(Boolean).join(", ");
      const dk=(sp+"|"+(o.county||"")).toUpperCase();
      if(seen.has(dk)||n>=15)return;seen.add(dk);n++;
      pushLead("ny",{source:"iMapInvasives (GBIF)",name:(sp+" — "+(o.county||"NY")).slice(0,80),
        location:loc||"New York",date:(o.eventDate||"").slice(0,10),cls:"Invasive detection",
        lat:o.decimalLatitude||null,lon:o.decimalLongitude||null,
        url:"https://www.nyimapinvasives.org/",
        desc:"Recorded invasive occurrence — eradication/management work generates regulated plant biomass."});
    });
    if(!n)out.errors.push("iMapInvasives: "+(hit?("dataset "+hit.key):"species fallback")+" queried, 0 recent NY priority-species occurrences matched");
  }catch(e){ out.errors.push("iMapInvasives: "+e.message); }
}

// Connecticut UST/LUST registry (Socrata) — petroleum tank sites → contaminated soil / oily debris.
async function ctUstScan(){
  try{
    const j=await get("https://data.ct.gov/resource/utni-rddb.json?$limit=300");
    if(!Array.isArray(j))throw new Error("bad response");
    const pick=(o,cands)=>{for(const c of cands){for(const k of Object.keys(o)){const lk=k.toLowerCase();if(lk.includes(c)&&!lk.includes("id")&&!lk.includes("number"))return o[k]}}return""};
    const seen=new Set();let n=0;
    j.forEach(x=>{
      let name=pick(x,["facility_name","site_name","owner_name","name"]);
      const fid=pick(x,["facility_id","site_id","id"]);
      if(!name||/^[\d-]+$/.test(String(name).trim()))name="";
      const town=pick(x,["town","city","municipality"]);
      const addr=pick(x,["address","street","location"]);
      if(!name)name=[addr,town].filter(Boolean).join(", ")||("UST facility "+(fid||""));
      if(excl(name))return;
      const status=(pick(x,["tank_status","status"])+"").toLowerCase();
      if(/removed|closed|permanently/i.test(status))return;   // keep active/temporarily-closed tanks
      const dk=(name+"|"+town).toUpperCase();
      if(seen.has(dk)||n>=40)return;seen.add(dk);n++;
      pushLead("ct",{source:"CT UST Registry",name:String(name).slice(0,90),
        location:[addr,town].filter(Boolean).join(", ")+" (CT)",cls:"Underground storage tank",registry:true,
        url:"https://data.ct.gov/Environment-and-Natural-Resources/Underground-Storage-Tanks-USTs-Facility-and-Tank-D/utni-rddb",
        desc:"Registered UST facility"+(status?" ("+status+")":"")+" — petroleum tank site: closure/removal, oily debris, and contaminated-soil prospect."});
    });
    if(!n)out.errors.push("CT UST: dataset fetched, 0 rows passed filters — verify field names");
  }catch(e){ out.errors.push("CT UST: "+e.message); }
}

/* ---------------- authority bid boards (PANYNJ + counterparts) ---------------- */
// Quasi-public authorities are exempt from the state portals the tool already scrapes
// (NYSCR, NJSTART, CTsource, COMMBUYS) — their refuse/remediation contracts appear
// only on their own boards. Shared tolerant parser: anchors first, stripped lines as fallback.

// Streams an authority would bid out that route to a Reworld line
const BOARD_KEY=/refuse|garbage|trash|recycl|waste|dispos|remediat|environment|hazard|pfas|asbestos|contaminat|sludge|demoli|abatement|scrap|debris|deic|glycol|triturat|sanitary sewer|soil/i;
// Several authority sites (Akamai on panynj.gov, WAFs elsewhere) 403 the default library UA
const BOARD_HDRS={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36","Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8","Accept-Language":"en-US,en;q=0.9"};
async function fetchBoard(u){
  let lastErr;
  for(let a=0;a<3;a++){
    try{ const r=await fetch(u,{headers:BOARD_HDRS}); if(!r.ok)throw new Error(u.split("/")[2]+" HTTP "+r.status); return await r.text(); }
    catch(e){ lastErr=e; if(a<2)await new Promise(res=>setTimeout(res,1500*(a+1))); }
  }
  throw lastErr;
}
function parseBoard(html, pageUrl){
  // Pass 1: anchors — solicitations link to a PDF ad or detail page
  const items=[];
  const aRe=/<a\b[^>]*href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while((m=aRe.exec(html))){
    const txt=unent(m[2].replace(/<[^>]+>/g," ")).replace(/\s+/g," ").trim();
    if(txt.length<25||!BOARD_KEY.test(txt))continue;
    let href=m[1]; try{ href=href.startsWith("http")?href:new URL(href,pageUrl).href; }catch(e){ href=pageUrl; }
    const after=unent(html.slice(aRe.lastIndex,aRe.lastIndex+400).split(/<a\b/i)[0].replace(/<[^>]+>/g," ")).replace(/\s+/g," ");
    const due=(after.match(/(?:due|opening|receipt|closing)[^0-9]{0,40}(\d{1,2}\/\d{1,2}\/\d{2,4})/i)||[])[1]||(after.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)||[])[1]||"";
    const num=(txt.match(/#\s*([A-Z]{0,6}[-\d]{4,12})\b/)||after.match(/(?:#|No\.?|Number)\s*:?\s*([A-Z]{0,6}[-\d]{4,12})\b/i)||[])[1]||"";
    items.push({txt,href,due,num});
  }
  // Pass 2 fallback: stripped-text lines, in case the board isn't anchor-per-solicitation
  if(!items.length){
    const lines=unent(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi," ").replace(/<[^>]+>/g,"\n")).split(/\n+/).map(s=>s.replace(/\s+/g," ").trim());
    for(const ln of lines){
      if(ln.length<30||ln.length>220||!BOARD_KEY.test(ln))continue;
      if(/cookie|privacy|copyright|newsletter|subscribe/i.test(ln))continue;
      items.push({txt:ln,href:pageUrl,due:(ln.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)||[])[1]||"",num:(ln.match(/#\s*([A-Z]{0,6}[-\d]{4,12})\b/)||[])[1]||""});
    }
  }
  return items;
}

// Port Authority of NY & NJ — Solicitations Advertised boards (JFK/LGA/EWR/ports).
// This is where "Refuse Removal, Disposal and Recycling Service For John F. Kennedy
// International Airport - Two (2) Year Contract" and its siblings are posted.
// Bids themselves run through the PA's Bonfire portal (panynj.bonfirehub.com), which is
// Cloudflare-walled — the advertised-solicitations pages on panynj.gov are the scrape target.
async function paBidsScan(){
  const BASE="https://www.panynj.gov";
  const PAGES=[
    ["/port-authority/en/business-opportunities/solicitations-advertisements/goods-services.html","Goods & Services"],
    ["/port-authority/en/business-opportunities/solicitations-advertisements/Construction.html","Construction"],
    ["/port-authority/en/business-opportunities/solicitations-advertisements/professional-services.html","Professional Services"]
  ];
  const NJ_HINT=/newark|elizabeth|jersey city|hoboken|bayonne|teterboro|\bewr\b|port newark|goethals|bayway|new jersey|\bnj\b/i;
  const NY_HINT=/\bjfk\b|kennedy|\blga\b|laguardia|stewart|manhattan|world trade|\bwtc\b|brooklyn|staten island|queens|bathgate|new york|\bny\b/i;
  const seen=new Set(); let total=0, failed=0;
  for(const [path,board] of PAGES){
    try{
      const items=parseBoard(await fetchBoard(BASE+path), BASE+path);
      let n=0;
      for(const it of items){
        if(total>=25)break;
        const dk=it.txt.toUpperCase().slice(0,80);
        if(seen.has(dk))continue;
        seen.add(dk); total++; n++;
        const nj=NJ_HINT.test(it.txt), ny=NY_HINT.test(it.txt);
        const terrs=nj&&!ny?["nnj"]:ny&&!nj?["ny"]:["ny","nnj"];   // bi-state agency: unhinted ads show on both boards
        const rec={source:"Port Authority NY & NJ",name:it.txt.slice(0,110),
          location:nj&&!ny?"PA facilities — NJ side":ny&&!nj?"PA facilities — NY side":"Port Authority (bi-state)",
          date:it.due,cls:board,bid:true,url:it.href,
          desc:("PANYNJ advertised solicitation"+(it.num?" #"+it.num:"")+" — "+board+" board. Listing is public; bidding runs through the PA Bonfire portal (panynj.bonfirehub.com), free vendor registration.").slice(0,230)};
        terrs.forEach(t=>pushBid(t,{...rec}));
      }
      if(!n)out.errors.push("PANYNJ "+board+": page fetched, 0 refuse/environmental matches this pass");
    }catch(e){ failed++; out.errors.push("PANYNJ "+board+": "+e.message); }
  }
  if(failed===PAGES.length)out.errors.push("PANYNJ: all three boards unreachable — if errors are HTTP 403, Akamai is rejecting the runner; manual fallback is https://panynj.bonfirehub.com/portal/?tab=openOpportunities");
}

// PANYNJ counterparts for the other territories — same shared parser, fixed routing.
async function authorityBidsScan(){
  const BOARDS=[
    // South Jersey: Camden-based bi-state authority (bridges + PATCO transit)
    {url:"https://www.drpa.org/procurement/current-purchases-and-bids.asp",src:"DRPA / PATCO",terrs:["snj"],loc:"DRPA — Camden bridges & PATCO",note:"Bi-state authority (NJ/PA), absent from NJSTART."},
    // South Jersey: marine terminals at Camden, Paulsboro, Salem
    {url:"https://southjerseyport.com/bids/",src:"South Jersey Ports",terrs:["snj"],loc:"SJPC — Camden/Paulsboro/Salem terminals",note:"Port corporation board, absent from NJSTART."},
    // South Jersey: Atlantic City Intl Airport + AC Expressway
    {url:"https://www.sjta.com/sjta/bids_intro.asp",src:"SJTA",terrs:["snj"],loc:"Atlantic City Airport & Expressway",note:"Submissions run through Bid Express (free registration)."},
    // Connecticut: Bradley Intl + the five state GA airports
    {url:"https://ctairports.org/economic-development/procurement/",src:"CT Airport Authority",terrs:["ct"],loc:"Bradley Intl + CT GA airports",note:"Quasi-public authority, posts on its own board (ProcureWare for documents), not CTsource."},
    // Massachusetts: Logan, Worcester, Hanscom, Port of Boston — two boards
    {url:"https://www.massport.com/business-with-massport/goods-and-services/rfps/",src:"Massport",terrs:["ma"],loc:"Logan / Worcester / Port of Boston",note:"Independent authority, not on COMMBUYS. Submissions via Bid Express (free registration)."},
    {url:"https://www.massport.com/logan-airport/opportunities/capital-bids/",src:"Massport Capital",terrs:["ma"],loc:"Massport construction projects",note:"Capital/construction board. Submissions via Bid Express (free registration)."}
  ];
  await Promise.all(BOARDS.map(async b=>{
    try{
      const items=parseBoard(await fetchBoard(b.url), b.url);
      const seen=new Set(); let n=0;
      for(const it of items){
        if(n>=10)break;
        const dk=it.txt.toUpperCase().slice(0,80);
        if(seen.has(dk))continue;
        seen.add(dk); n++;
        const rec={source:b.src,name:it.txt.slice(0,110),location:b.loc,date:it.due,cls:"Authority solicitation",bid:true,url:it.href,
          desc:(b.src+" solicitation"+(it.num?" #"+it.num:"")+" — "+b.note).slice(0,230)};
        b.terrs.forEach(t=>pushBid(t,{...rec}));
      }
      if(!n)out.errors.push(b.src+": board fetched, 0 refuse/environmental matches this pass");
    }catch(e){ out.errors.push(b.src+": "+e.message); }
  }));
}

(async ()=>{
  await Promise.all([fdaScans(), fsisScan(), cpscScan(), spillScan(), remediationScans(), complyScans(), eventsScans(), zwtlScan(), bidScans(), hpaiScan(), samScan(), ctsourceScan(), commbuysScan(), invasiveScan(), ctUstScan(), paBidsScan(), authorityBidsScan()]);
  const sortHot=(a,b)=>((b.hot?1:0)-(a.hot?1:0))||String(b.date||"").localeCompare(String(a.date||""));
  TERRS.forEach(t=>{ out.territories[t].leads.sort(sortHot); });
  fs.writeFileSync("leads.json", JSON.stringify(out));
  const counts=TERRS.map(t=>t+":"+out.territories[t].leads.length+" leads/"+out.territories[t].bids.length+" bids").join(", ");
  console.log("Wrote leads.json —", counts, "| Errors:", out.errors.length ? out.errors.join(" | ") : "none");
})();
