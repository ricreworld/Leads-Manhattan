# CONTEXT: Reworld Market Watch

## Purpose
A live daily prospecting tool. Four sales reps use it to discover environmental opportunities in their territory, evaluate them against Reworld's routing and service fit, and push qualified leads into Salesforce to chase.

The site pulls from live public databases (federal recall feeds, state contamination registries, environmental bid boards) and scores each hit against Reworld's business rules.

---

## Users and Territories

| Rep | Territory | Home Facilities |
|---|---|---|
| Ricardo Salce | New York (NYC, Nassau, Suffolk, Westchester) | Hempstead, Babylon, Huntington |
| Doug Bourd | North Jersey (Bergen, Essex, Hudson, Passaic, Union, Morris) | Essex, Union |
| Howard Edison | South Jersey (Camden, Trenton, Vineland, Cape May region) | Camden, Union |
| Dan Patrola | Connecticut and Massachusetts | SECONN, Bristol, SEMASS, Haverhill |

---

## Workflow
1. **Scan** the site for new opportunities in the rep's territory
2. **Evaluate** the lead using the details and the score
3. **Qualify** — decide it fits Reworld and hits the deal threshold
4. **Migrate** to Salesforce as an opportunity
5. **Chase** — the rep works it in the CRM

---

## Data Sources to Scan

### Recall Data
- FDA enforcement: food, drug, device (ongoing only, Class I and II)
- USDA food recalls
- USDA APHIS (Animal and Plant Health Inspection Service) — regulated garbage and plant material recalls, bird flu detections and facility actions
- Raw material recalls (pharma inputs, supplement ingredients, cosmetics inputs, food ingredients)

### Environmental Bids
- Invasive species eradication and management contracts (state DEC, forestry, agriculture, parks)
- Environmental remediation RFPs (PFAS cleanup, contaminated soil, water treatment)
- Government cleanup contracts and landfill closure bids
- Any environmental contract where Reworld services apply

### Contamination and Compliance
- EPA ECHO (Enforcement and Compliance History Online)
- NJDEP Known Contaminated Sites (all NJ regions)
- CT DEEP contaminated site registry
- MassDEP C21e ArcGIS
- PFAS site data and drinking water violations

### Waste Streams
- Manufacturing waste requiring incineration
- Lab pack bids (hazardous and non-hazardous)
- Contaminated soil (petroleum, PFAS)
- Any waste type banned from landfill

---

## Lead Scoring

### Hot Signals (weight the score up)
- **PFAS** — any concentration, any stream (Reworld's new PFOS capability handles full scope)
- **Zero-Waste-to-Landfill** interest or program
- **Pharmaceutical recall** — secure destruction opportunity
- **Raw material recall** — destruction opportunity
- **Manufacturer** with waste streams that can't land in a landfill
- **Any industry with an active ESG or sustainability program**
- **Proximity** to a Reworld facility in the rep's territory

### Recency
- Fresh opportunities score highest
- Anything expired drops off the board

### Quantity Rules
- Unknown quantity: keep and call to confirm
- Under 1 ton: skip unless it's 20+ fifty-five-gallon drums
- Target deal value: $10,000+ annual

### Customer Type Fit
Any manufacturer with landfill-banned waste. Especially:
- Pharmaceutical, OTC, supplements
- Cosmetics and personal care
- Food and beverage
- Chemical and industrial
- Healthcare

---

## Reworld Service Lines (Match Leads Against These)

| Service | What It Solves | Ideal Lead Signal |
|---|---|---|
| **ReDirect360** | Zero-Waste-to-Landfill diversion, resource recovery | Manufacturer with landfill-banned waste, ESG program, sustainability targets |
| **ReAssure** | PFAS destruction at 1,100°C+, 99%+ efficiency, chain of custody | PFAS site, AFFF, biosolids, contaminated water, PFAS-containing products |
| **Secure Destruction** | Witnessed, documented destruction with COD | Pharma recall, controlled substances, confidential materials, electronic media, evidence |
| **Lab Packing / Hazmat Routing** | RCRA characterization, small-quantity chemical disposal | Chemical manufacturer, research lab, medical lab |
| **ReKiln** | Convert combustible waste to engineered fuel | High-BTU industrial waste streams |
| **ReDrop** | Wastewater treatment with activated carbon | PFAS-contaminated water, AFFF sites, leachate |
| **ReMove** | Waste logistics, pickup, consolidation, reverse distribution | Multi-site operators, coverage gaps |
| **ReCredit** | Voluntary RECs and carbon offsets | Companies with Scope 2 or 3 targets |

---

## Reworld Facilities (For Routing Decisions)

### New York
**Hempstead TTF** — 600 Merchants Concourse, Westbury, NY 11590
Merchant. 2,700 TPD, 80 MW. Non-haz pharma, personal care, industrial, controlled substances, APHIS garbage, on/off-spec used oil debris. Liquids under 55 gallons. No steel drums, no RCRA, no e-waste, no medical. Van trailer M-F 8am-2pm on the hour. NYSDEC Part 364 permit required.

**Babylon TTF** — 125 Gleam Street, West Babylon, NY 11704
Merchant. 750 TPD, 17 MW. Pharma, controlled substances, witnessed destruction, electronic media, evidence, used oil debris. Hard no on APHIS garbage or plant material. No RCRA, no steel drums, no supersacks, no totes. Liquids under 55 gallons. Hours 7am-3pm.

**Huntington TTF** — 99 Town Line Road, East Northport, NY 11731
Merchant. 750 TPD, 24 MW. Powders, controlled substances, industrial, non-haz commercial, pharma, personal care, on-spec used oil debris, BUD waters (with NYSDEC approval). Liquids under 55 gallons. Hours M-F 7am-4pm, Sat 7am-1pm.

### New Jersey
**Essex TTF** — 183 Raymond Blvd, Newark, NJ 07105
Merchant. 2,286 TPD, 66 MW. Pharma (non-DEA), personal care, industrial waste, APHIS garbage. No asbestos, no dry pesticides, no contaminated soil, no hazardous waste, no forklift offloads, no palletized. Liquids under 1 gallon per container. Hours M-F 9am-3pm.

**Union TTF** — 1499 Route 1 North, Rahway, NJ 07065
Merchant. 1,440 TPD, 42 MW. MSW, pharma (non-DEA), personal care, industrial, on-spec used oil debris, APHIS garbage. Consumer packaged liquids under 20 gallons. Van trailer M-F 6am-2pm.

**Camden TTF** — 600 Morgan Street, Camden, NJ 08104
Merchant. 1,200 TPD, 30 MW. Pharma (non-DEA), commodity, industrial waste, APHIS garbage. Forklift offloads require pre-approval. Police destructions before noon. Hours M-F 7am-3pm.

### Connecticut
**SECONN TTF** — 132 Route 12, Preston, CT 06365
Merchant. 17 MW. Pharma (non-DEA), personal care, bulk liquid tankers, consumer packaged liquids, industrial, on-spec used oil debris, APHIS garbage. Self-dump M-F 7am-10pm, Sat 7am-noon. Van trailer M-F 7:30am-6pm on the hour and half hour.

**Bristol TTF** — 170 Enterprise Drive, Bristol, CT 06010
Merchant. Connecticut regional capacity.

### Massachusetts
**SEMASS TTF** — 141 Cranberry Highway, West Wareham, MA 02576
Merchant. Serves 40+ communities across Cape Cod, southeastern MA, Boston metro. Pharma, industrial, personal care.

**Haverhill TTF** — 100 Recovery Way, Haverhill, MA 01835
Merchant. Pharma, industrial waste, LDI (liquid direct injection) capability.

### Pennsylvania (Reference — Adjacent Capacity)
- **Plymouth TTF** — 1155 Conshohocken Road, Conshohocken, PA 19428
- **Delaware Valley TTF** — 10 Highland Ave, Chester, PA 19013 (rotary combustor, 90 MW)
- **Lancaster TTF** — 1911 River Road, Bainbridge, PA 17502
- **York TTF** — 2651 Blackbridge Road, York, PA 17406
- **Harrisburg TTF** — 1670 South 19th Street, Harrisburg, PA 17104
- **Myerstown Service Center** — 343 King Street, Myerstown, PA 17067 (container shredding, liquid solidification, lab packing, hazmat 10-day transit, RCRA prep)

---

## UI Requirements

### Search and Filter
- Search by company name, city, industry, waste type
- Filter by territory (NY, N-NJ, S-NJ, CT, MA)
- Filter by hot signal (PFAS, pharma recall, ZWTL, hazmat, APHIS, invasive species, environmental bid)
- Filter by recency (7 days, 30 days, all)
- Filter by deal value ($10K+, $50K+, $100K+)

### Lead Card
Each lead shows:
- Company name, city, industry
- Source (FDA, USDA, NJDEP, EPA, etc.) and report date
- Waste type, quantity if known
- Estimated deal value
- Score (0-100) with color code (hot/warm/cool)
- Nearest Reworld facility and haul distance
- Rep notes field
- Follow-up date with due/overdue flag
- Status toggles (called, qualified, dead)

### Quick Action Buttons on Each Lead
- **Google** — search the company
- **LinkedIn** — search the company or contact
- **Google Maps** — map the facility
- **Call** — pull up phone number search
- **Email** — pre-filled draft

### Map View
- Plot opportunities on a map
- Overlay Reworld facility locations
- Show territory boundaries
- Color-code by signal type
- Show haul distance to nearest facility

### Sort Controls
- Hottest (score high to low)
- Newest (report date)
- Nearest (distance to rep's primary facility)
- Largest (volume or deal value)

### Scan Status Panel
- Last refresh time per data source
- Health indicator (green/yellow/red)
- Manual refresh button

---

## Qualification Rules (Migrate to Salesforce)

A lead moves to Salesforce when all three are true:
1. Estimated deal value is $10,000 or more annual
2. Waste type and volume fit a Reworld facility in the rep's territory
3. There is an actionable contact (company, location, reachable industry role)

Hold (don't migrate yet) if:
- Quantity is unknown — call first
- Wrong territory — flag to the correct rep
- Waste type doesn't fit — note reason, hold

Dismiss if:
- Expired or stale (>90 days) with no active signal
- Under 1 ton and no compliance or reputation angle
- Known competitor or non-prospect

---

## Constraints
- FDA recall scans: ongoing recalls only, exclude Class III unless high volume or heat signal
- PFAS: no PPB threshold. New PFOS capability accepts full-scale PFAS at any concentration. No verification gate before quoting.
- Branding: use "ReAssure" for PFAS destruction until Communications confirms full transition to "ReSolve"
- Respect state privacy laws — no publishing of PII on facility operators
