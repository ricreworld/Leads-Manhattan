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
      const name=x.field_establishment||x.field_title||"FSIS recall";
      if(excl(name))return;
      const reason=(x.field_recall_reason||"")+" "+(x.field_title||"");
      const hot=DESTROY.test(reason);
      const base={source:"USDA FSIS",name,date:(x.field_recall_date||"").slice(0,10),cls:x.field_recall_classification||"",hot,url:"https://www.fsis.usda.gov/recalls",desc:(x.field_title||"").slice(0,200)};
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
    (Array.isArray(j)?j:[]).slice(0,30).forEach(x=>{
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
      pushLead("ny",{source:"NY Spill DB",name:x.facility_name||x.locality||"Spill site",location:`${x.locality||""}, ${x.county} Co.`,date:(x.spill_date||"").slice(0,10),hot:SPILL.test(mat),pfas,volUnknown:!hasQty,desc:`${mat} — ${hasQty?(x.quantity+" "+(x.units||"")):"quantity not reported, call to confirm scale"}. ${x.contributing_factor||""}`});
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
      pushLead("ny",{source:"NYSDEC",name,location:`${x.address1||x.address||""}, ${x.locality||""} (${x.county} Co.)`,cls:"Class 02 — active",pfas,hot:pfas,registry:true,lat:parseFloat(x.latitude)||null,lon:parseFloat(x.longitude)||null,desc:(x.program_type||"State remediation")+(pfas?" — PFAS/AFFF flagged, verify":"")});
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
        pushLead(terr,{source:"NJDEP KCS",name,location:`${a.ADDRESS||""}, ${a.MUNICIPALITY||""} (${a.COUNTY||""} Co.)`,pfas,hot:pfas,registry:true,lat:parseFloat(a.LATITUDE||a.Y)||null,lon:parseFloat(a.LONGITUDE||a.X)||null,desc:(a.STATUS||"Known contaminated site")+(pfas?" — PFAS/AFFF flagged, verify":"")});
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
      pushLead(terr,{source:"NJDEP IEC",name,location:`${a.ADDRESS||a.STREET||""}, ${muni} (${cty} Co.)`,cls:"Immediate Environmental Concern",hot:true,pfas,lat:parseFloat(a.LATITUDE||a.LAT||a.Y)||null,lon:parseFloat(a.LONGITUDE||a.LONG||a.X)||null,desc:"PRIORITY remediation — immediate environmental concern. Urgent contaminated-soil and remediation-waste cleanout."+(pfas?" PFAS/AFFF flagged, verify.":"")+" Call responsible party or LSRP early."});
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
      pushLead("ct",{source:"CT DEEP Sites",name,location:((x.case_address||"").replace(/,?\s*US$/,""))+" ("+(x.official_town||"")+", CT)",cls:prog.slice(0,30),pfas,hot:pfas,registry:true,lat:parseFloat(x.site_id_latitude)||null,lon:parseFloat(x.site_id_longitude)||null,desc:prog+" · "+(x.case_status||"Open")+(pfas?" — PFAS/AFFF, verify":"")});
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
          pushLead("ma",{source:"MassDEP 21E",name,location:(a.ADDRESS||a.Address||"")+", "+town+" (MA)",pfas,hot:pfas,registry:true,lat:g.y||null,lon:g.x||null,desc:(a.STATUS||a.Status||"MGL c.21E tier-classified site")+(pfas?" — PFAS-flagged":"")});
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
        pushLead(terr,{source:"EPA TRI",name,location:`${f.city_name||f.CITY_NAME||""}, ${cty||st}`,cls:"TRI reporter",registry:true,desc:"Already generating and paying for industrial waste disposal — ZWTL conversion conversation."});
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
      pushLead("ny",{source:"NYSDEC Title V",name,location:`${x.facility_city||x.city||""}, ${cty} Co.`,cls:"Title V air permit",registry:true,desc:"Emits regulated hazardous air pollutants under Title V — heavy industrial, generates profiled/RCRA waste. Routing + ZWTL target. Qualify streams, volume, current vendor."});
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
      pushLead("ny",{source:"NYC DOB",name:oname,location:`${x.house_no||""} ${x.street_name||""}, ${x.borough||""}`,date:(x.issued_date||"").slice(0,10),cls:"Demolition permit",hot:true,desc:"Full demolition permitted — contaminated soil, asbestos abatement waste, and industrial cleanout streams incoming."});
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
      pushLead("ny",{source:"FDNY",name:pu.slice(0,60),location:`${x.borough_desc||x.borough||""}`,date:(x.incident_date_time||"").slice(0,10),cls:"Commercial fire",hot:true,desc:(it||"Structure fire")+" at commercial property — fire/smoke/water-damaged inventory needs certified destruction for insurance."});
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
      pushLead("ny",{source:"NYSDEC CBS",name,location:`${x.locality||x.city||""}, ${x.county} Co.`,cls:"Chemical bulk storage",registry:true,desc:"Registered chemical bulk storage facility — standing profiled-waste and RCRA routing prospect."});
    });
  }catch(e){ out.errors.push("NYSDEC CBS: "+e.message); }
  for(const [terr,courts,loc] of [["ny","nysb+nyeb","SDNY/EDNY"],["nnj","njb","D.N.J."],["snj","njb","D.N.J."],["ct","ctb","D. Conn."],["ma","mab","D. Mass."]]){
    try{
      const j = await get(`https://www.courtlistener.com/api/rest/v4/search/?type=r&q=chapter&court=${courts}&order_by=dateFiled+desc`);
      let n=0;
      ((j&&j.results)||[]).forEach(x=>{
        const name=x.caseName||x.case_name||"";
        if(!name||n>=12)return; n++;
        pushLead(terr,{source:"Bankruptcy Ct",name:name.slice(0,80),location:loc,date:(x.dateFiled||x.date_filed||"").slice(0,10),cls:"Filing",desc:"Recent bankruptcy filing — if distributor/retailer/manufacturer, liquidated inventory may need certified brand-protection destruction. Verify entity type."});
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

(async ()=>{
  await Promise.all([fdaScans(), fsisScan(), cpscScan(), spillScan(), remediationScans(), complyScans(), eventsScans(), zwtlScan(), bidScans()]);
  const sortHot=(a,b)=>((b.hot?1:0)-(a.hot?1:0))||String(b.date||"").localeCompare(String(a.date||""));
  TERRS.forEach(t=>{ out.territories[t].leads.sort(sortHot); });
  fs.writeFileSync("leads.json", JSON.stringify(out));
  const counts=TERRS.map(t=>t+":"+out.territories[t].leads.length+" leads/"+out.territories[t].bids.length+" bids").join(", ");
  console.log("Wrote leads.json —", counts, "| Errors:", out.errors.length ? out.errors.join(" | ") : "none");
})();
