# Gig-radar method log

A running record of which discovery methods/sources each run tried, what produced gigs, and
what to try differently next time. Newest entries at the top.

---

## 2026-08-18 — eighth self-update run

**Housekeeping:** removed 106 finished gigs (through 17 Aug). Added 46 gigs (31 confirmed,
15 verify) → 224 total; watchlist 64 → 62 after promoting/removing the resolved TJ Johnson and
Gabriel's Wharf leads. Corrected the area on all 14 retained Oriole rows from its old Smithfield
location to the current Covent Garden site. Metadata moved to 2026-08-18.

**Methods tried (standard refresh plus three rotated discovery angles):**
- *Rolling primary venue feeds (24 adds)*: Nightjar's Squarespace JSON now runs densely through
  27 Sep, yielding 15 genuinely vintage/NO/swing dates; borderline boogie, jump-R&B and NOLA-
  funk rows remain `verify`. Oriole yielded Dom Pipkin 1 Sep and Alex Bryson 2 Sep, then stays
  mostly Latin/global through its current horizon. Jamboree pagination now reaches 11 pages:
  added the 19 Aug TJ Johnson return, next Cable Street instance, Harry Evans lunch, Prospective
  Collective, Windy City Weatherbirds, Harvard Squares Halloween dance and Natty Congeroo.
  Cable Street is posted weekly through 7 Jan 2027, but only its next instance was added to avoid
  flooding the radar.
- *NEW REGIONAL TRAD-CLUB ANGLE (7 adds)*: Runnymede Jazz Club's own Addlestone programme is a
  strong recurring source and publishes named monthly traditional-jazz bands through Mar 2027.
  All seven future dates are reachable from Surbiton in roughly 45–55 minutes and carry explicit
  travel/booking notes. Added the club to `keyVenues` and a dedicated search query.
- *NEW PRIMARY ARTIST-DIARY ANGLE (9 adds)*: Doolally Tap's official diary exposed seven exact
  dates (Sidcup, Gabriel's Wharf and monthly Ivy House Sundays) that aggregators missed. Green
  Note's primary page supplied Joe Mansfield & the Temperance Two (old-time, 18 Sep, £14), and
  Dom Glynn's EPK plus the Hootananny/Songkick listing confirmed the 10 Sep classic-country/
  honky-tonk album show. Added Doolally's diary as a recurring source.
- *NEW LOCAL DANCE-CALENDAR CROSS-CHECK (2 resolved leads, 1 add)*: SwingdanceUK named Doolally
  Tap and exact set times for the free Gabriel's Wharf festival, resolving its watchlist entry.
  Swing Patrol's current calendar confirms the 17 Oct Performance Ball has live music from
  21:30 (band still TBA), so it joins the already-held TBA Christmas live-band dance with an
  explicit artist label rather than an invented name.
- *Ticketing/standard-query sweep (5 adds)*: a fresh Toulouse Lautrec DICE venue query found two
  separate John 'Papa' Gros shows (verify: NOLA lineage but funk/soul-leaning), two Robin Nolan
  Trio manouche shows and the 14 Nov Fidelio Hot Club matinee. The standard genre/search-query
  sweep otherwise mostly returned stale pages, modern jazz, chart/cosmic country, crooner shows
  or bluegrass-mixed festivals; those were excluded.

**Refreshed but dark / deliberately excluded:**
- Fighting Cocks through Oct remains rock/punk/indie/metal/open-mic only: zero roots/trad rows.
  Jazz Guide's Epsom, Old Barn, Pump House, Amersham and Spice diaries have not extended beyond
  the dates already held; Riverhead still publishes no new date. Plaquemine is unchanged and
  still ends 23 Aug even when fetched through the required trailing-slash redirect.
- EFG London Jazz Festival has not yet released the next wave (due 19 Aug); no new trad/manouche
  strand beyond held rows. Fidelio's own diary still has no post-10-Aug residency date. The 100
  Club, Bull's Head, Cecil Sharp House/EFDSS, What's Cookin', Vortex and Ronnie Scott's checks
  produced no clean new target-genre booking this run.
- Excluded on genre: King Harvest (bluegrass/newgrass-led), Garrett T. Capps (cosmic/modern
  country-rock), Shane Hampsheir/crooner nights, modern EFG bookings, Latin/global Oriole nights,
  and every current Fighting Cocks booking.

**Next time:**
- Hit EFG wave 4 after 19 Aug and Soho Jazz Festival after its late-Aug line-up reveal; cherry-
  pick only trad/hot/manouche strands.
- Re-scrape Nightjar beyond 27 Sep, Oriole after 7 Oct, Plaquemine beyond 23 Aug, and the Jazz
  Guide clubs for Oct/Nov roll-forwards. Recheck What's Cookin' autumn TBC slots.
- Resolve the band names for Swing Patrol's 17 Oct Performance Ball and 19 Dec Christmas Party;
  check Runnymede's booking line for public admission prices without guessing them.

---

## 2026-07-25 — seventh self-update run

**Housekeeping:** removed 15 finished gigs (22–24 Jul). Added 32 gigs (7 confirmed, 25 verify)
→ 284 total; watchlist 62 → 64 (+Jazzbourne venue watch, +Remi Harris London-date watch).
Validate clean first pass. Upgrades/downgrades: Cambridge Lindy Exchange verify→confirmed
(bands now announced: Swing Shouters FR, Harry Evans & His Flying Squirrels, Django's Tiger;
tickets on sale 1 Aug); The Hum 28 Jul confirmed→verify — a second Eventbrite listing for the
series shows the occurrence as CANCELLED (residency may be wobbling before its 8 Sep end).

**Methods tried (4 parallel research clusters; new angles in caps):**
- *Rolling-window re-scrape (the run's haul — 30 of the 32 adds)*: PLAQUEMINE REFRESH LANDED —
  12 adds through the new 23 Aug horizon. ROOT CAUSE of the "overdue" refresh found: the page
  301s to /live-music-islington/ (trailing slash) and un-redirected fetches get an EMPTY BODY —
  always curl -L. Structural: Sat brunch provisionally hands from Dai Price to "Ewan Bleach?"
  (venue's own question mark — 3 brunches added verify) from 8 Aug. Oriole extended 5→29 Sep
  (11 adds incl. Boneshaker 4 Sep, Pipkin 9 Sep, Al Dunn 16 Sep; Oct STILL missing; holes 17,
  22–25, 30 Sep). Nightjar: 27 Jul + 4/19/22 Aug filled (4 adds); 2 + 29 Aug persistently dark,
  Sep still only 1/2/11. Jamboree horizon now 22 Dec: Cajun Après-Midi monthly through 12 Dec,
  Cable St still stops 24 Sep, Prospective still stops 30 Aug, TJ Johnson 29 Jul is a lone
  one-off; only new add Steven Paris Agreement 8 Aug (mixed bill, verify). What's Cookin':
  AUGUST IS A FULL BREAK (nothing 29 Jul–2 Sep) but a strong autumn country strand — JOHN
  MILLER & HIS COUNTRY CASUALS + Grace Under Fire 14 Oct (run's best add, pure honky tonk,
  confirmed) + Bard Edrington V 21 Oct (old-time-leaning, verify).
- *Suburban circuit (Jazz Guide)*: ZERO new rows — every diary already fully tracked (good
  sign the 3-day cadence covers it). Horizons: Epsom → 12 Oct (Paula Jackman named — already
  ours), Old Barn Hall/Pump House/Amersham/Spice unchanged (27 Sep / 24 Sep / 30 Sep / 28 Sep);
  Riverhead + Colchester nothing new; 46 Club residency unchanged; Spice 17 Aug is a diary gap.
  National listing re-crawl: all in-range finds already ours.
- *Swing/gypsy API sweep*: mostly confirmations — Morocco Bound Sep dates, Beaverwood Jive
  Aces, Dukes rows all already tracked. Net 3 adds via DICE: Summer Camargo Trio TL 16 Aug
  (verify), Biscuit Town TL 26 Sep (second date beside our 28 Nov), John "Papa" Gros Piano
  Smithfield 26 Sep (funk-lean, verify — NB near-dup trap: quoted nickname 'John "Papa" Gros'
  dodged a plain grep; dedup on date+venue). Bishopsgate Spektrix: Horsfall 20 Nov + 19 Dec
  STILL not on sale; Swing Den 7 Aug/4 Sep remain excluded (DJ-only per prior call). 100 Club:
  Sep window rendering but zero in-genre yet. Ronnie's date-less pages (Holborn, Diplock):
  still empty JSON-LD event arrays. Eventbrite structural: organiser pages now roll recurring
  series into ONE card — read series end-dates from the event page's embedded dates.
- *NEW ANGLES*: RON'S HONKY TONK WIX warmupData CRACKED — full event list with ISO dates; the
  "+4 more" on cards is guest AVATARS, not hidden dates, recurrence arrays empty → 28 Aug
  really is their only 2026 night. WEGOTTICKETS VENUE/PROMOTER PAGES server-rendered
  (/JamboreeVenue, /f/NNNNN) — search still broken; WebSearch site:wegottickets.com for entry
  points; added to sources. CHOBHAM FESTIVAL full programme checked: the 3 Oct supper is its
  ONLY jazz (rest classical/bells/morris). CLX bands announced (see above). JAZZBOURNE
  discovered (speakeasy swing bar, New Cross) — swing socials are jukebox-only but venue books
  live jazz → watchlist. Lamb Surbiton: still DARK (Googlebot-UA IG returns shell; newest
  indexed post 28 Mar; Lemonrock 0 gigs; side-find: last-Wednesday Irish folk jam, out of
  genre). Artist sweep all negative: Rob Heron (Barry only), Hot Sardines (no UK tour), George
  & his New Heartaches (Munich only), Kansas Smitty's (site JS-walled).

**What stayed dark / next time:**
- Nightjar 2 + 29 Aug and Sep-beyond-11th; Oriole October; Jamboree Sep Prospective + Oct
  Cable Street/Bleach lunches; Plaquemine past 23 Aug (~10 Aug refresh due; includes 28 Aug
  Ten Bells last-Friday check).
- The Hum: verify whether 28 Jul actually ran (cancellation flag) — if the residency is dying
  early, note it; autumn renewal check late Aug regardless.
- EFG LJF wave 4 lands 19 Aug (full programme 16 Sep); SwingdanceUK 40th tickets 1 Sep;
  Bishopsgate autumn instances; Fidelio after 10 Aug (Grimshaw guide still silent); Jazz Guide
  Oct+ diaries land late Aug (Old Barn Hall, Spice, Pump House, Amersham, Riverhead).
- Lamb/Boaters: all technical angles now exhausted — remaining idea: poll Lemonrock + a
  weekend WebSearch for "Lamb Surbiton" IG posts each Fri–Sat run.
- Jazzbourne live-band nights (new venue watch); CLX ticket on-sale 1 Aug (band details may
  firm up); What's Cookin' Sep midweek TBC slots.

---

## 2026-07-22 — sixth self-update run

**Housekeeping:** removed 12 finished gigs (19–21 Jul) plus 1 mis-filed row — the 10 Oct Cadogan
"DFTC Swing Orchestra" is actually **'Voices of Soul' (excluded)** per Cadogan's own series page;
last run's note trusted the band's live-dates table. Added 39 gigs (10 confirmed, 29 verify)
→ 267 total; watchlist 60 → 62 (+4 new, −2 promoted). Validate clean first pass.
Promotions from watchlist: Chobham Jazz Supper 3 Oct (detail page proves trad/swing/Songbook) and
Goodman 1938 Carnegie recreation 24 Jan 2027 (now on sale; 2027 rows have the Pokey precedent).
Deliberately NOT promoted, matching prior curator calls: Jive Aces Petworth 24 Jul (transport),
Jazz Noël Wilton's 27 Nov (modern-leaning), Emma Smith/Natalie Williams/Shane Hampsheir Ronnie's
vocal nights (crooner rule).

**Methods tried (4 parallel research clusters; new angles in caps):**
- *Rolling-window re-scrape*: Plaquemine's expected refresh has NOT landed (page unchanged, ends
  2 Aug — hit FIRST next run); brunch roll-forwards added (1/2 Aug). Nightjar filled 7 of 9 dark
  Aug dates — 4 in-genre adds (Pinstripe Suit 15, Bubu Otis 16, Bandini 26, Ben Martyn 31 Aug)
  + first Oct date (Dom Durner 10 Oct, already ours); 2 + 29 Aug still dark; STRUCTURAL:
  **Nightjar and Oriole both answer Squarespace ?format=json** (full feeds, no HTML scraping).
  Oriole new: Ben Martyn 5/26 Aug, Bubu Otis 6 Aug, Alex Bryson 11 Aug (listings stop at 5 Sep —
  Oct overdue). Jamboree paginates to ?pno=8 (horizon 21 Nov): no Sep Prospective, no Oct Cable
  Street/Bleach lunches — weekly-residency next-instance rows re-listed (Cable St 30 Jul,
  Prospective 2 Aug, Hum 28 Jul). TL via DICE: Dom Pipkin & The Ikos 27 Aug added (funk-lean,
  verify). Hum series still dies 8 Sep (organiser page is JS — only series start/end readable).
  Vout-O-Reenees warmupData: 1 event, out-of-genre. Ram Jam JSON: zero in-genre through Dec.
  Dukes WP API: only the 29 Jul jam + Breann Young. Zedel: STILL broken — stop checking weekly.
- *Suburban circuit (Jazz Guide)*: September diaries landed — Old Barn Hall 4 Sun adds (6/13/20/27),
  Pump House 4 Thu adds (Rudeforth 3, Owls 10, Raineys 17, Bronxville 24 Sep) + missed Saxorama
  30 Jul (flagged last run, never listed — now fixed), Spice of Life 3 strong lunches (HOT FINGERS
  14 Sep, McQuaid/Hemstock 21 Sep, Cable Street Rag Band 28 Sep; 31 Aug + 7 Sep are modern — out).
  National-listing finds: Chobham supper 3 Oct, Pete Allen Falkland 48th-anniv 24 Oct. Epsom is
  monthly (10 Aug/14 Sep/12 Oct — no 27 Jul). 46 Club weekly residency re-confirmed (no rows kept,
  as before). BULL'S HEAD DOMAIN FIX: thebullshead.com dead → thebullsheadbarnes.com (tickets
  subdomain); diary still zero trad. Fighting Cocks through Dec: zero qualifying, again.
- *Swing/gypsy sweep*: Ronnie's crawl (pages 1–14, JSON-LD only): NEW Francesca Tandoi stride trio
  10 Aug (confirmed) + Mackenzie/Stanley 3 Sep, Jamie Safir 14 Sep (verify); Giacomo Smith 10 Sep /
  Nora Germain 22 Sep / Harry Allen 15 Sep were already ours. DICE venue sweeps: **David Hermlin
  Trio (Berlin swing revival) Jamboree 15 Nov** — run's best one-off; Morocco Bound already fully
  tracked. Boisdale diary: Long Lost Frets Dec dates match our row; Big Easy Christmas Lunch
  12 Dec CW added. Eventbrite keywords: JiveMeToTheMoon live-band dance Walthamstow 4 Sep. 100 CLUB
  TRAP: slug date-suffixes lie (roots-of-the-king '-09-26' = 16 Aug — page date wins). Halibuts
  pages 1–6 re-crawl: nothing new beyond the above (jazz tag too noisy to crawl, ~131 events/day).
- *NEW ANGLES*: **SWINGPLANIT** (swing-festival calendar) — Cambridge Lindy Exchange 30 Oct–1 Nov
  ('5 parties with live bands') added; Hep to the Hive Manchester → watchlist. **BISHOPSGATE
  SPEKTRIX API** (system.spektrix.com/bishopsgateinstitute/api/v3/events) — authoritative for
  Swing Live: 2026 run ends 18 Sep, NO October edition, Horsfall 20 Nov + 19 Dec not on sale yet.
  **UKJN REST sweep caught EFG LJF WAVE 3** (21 Jul article): Spirit of Django (Martin Taylor/Guy
  Barker) 19 Nov Smith Square Hall added confirmed; Ella & Louis 22 Nov = our existing Cadogan row;
  Muireann Bradley 13 Nov → watchlist. Artist pages: Ags Connolly Golden Hinde 10 Jan 2027 added.
  Songkick exact-ID sweep: Rob Heron (Barry only), Kitty Daisy & Lewis (EU only), C.W. Stoneking
  (AUS) — nothing. Time Out genre pages: DEAD (404/mainstream — don't re-add). Instagram via
  r.jina.ai: login-walled — Lamb (lambsurbiton.co.uk confirms Sunday sessions, no names) and
  Boaters stay dark. EFDSS API: nothing new in-genre (ceilidhs only). FOAOTMAD: Cock Tavern
  exceptions already ours; Prince of Wales Feathers fortnightly still date-less.

**What stayed dark / next time:**
- PLAQUEMINE ROSTER (ends 2 Aug, refresh days overdue) — first stop next run. Nightjar 2 + 29 Aug,
  Sep past 11th; Oriole October; Jamboree Sep Prospective / Oct Cable Street + Bleach lunches.
- EFG LJF wave 4 lands 19 Aug, full programme 16 Sep — sweep UKJN + efglondonjazzfestival.org.uk.
- SwingdanceUK 40th tickets on sale 1 Sep; Bishopsgate autumn instances via the Spektrix API;
  Fidelio after 10 Aug; The Hum renewal (late Aug); Amersham October; Jazz Guide Oct+ diaries.
- Lamb/Boaters: all Instagram angles now dead (r.jina.ai login-walled too) — next idea: poll
  Google/Bing index of instagram.com/p/ URLs on Fri–Sat for same-week Sunday announcements.
- Ron's Honky Tonk '+4 more' dates hidden behind JS on the event-list page; Cambridge Lindy
  Exchange band names; Chobham Festival may add more jazz suppers (festival.chobham.org).

---

## 2026-07-19 — fifth self-update run

**Housekeeping:** removed 21 finished gigs (13–18 Jul). Added 77 gigs (37 confirmed, 40 verify)
→ 241 total; +8 watchlist rows → 60; validate clean first pass. Residency roll-forwards restored
(Hum Tuesday 21 Jul, Cable Street 23 Jul, Prospective 26 Jul, Plaquemine brunches 25/26 Jul).
Fixes: Ray Gelato Ronnie's row corrected to a 19–22 Dec residency (23 Dec unconfirmed); Boheme
Hot Club got its 20:30 time via DICE; La Bouche 19 Sep note now carries both show times.

**Methods tried (4 parallel research clusters; new angles in caps):**
- *Rolling-window re-scrape*: ORIOLE BAR'S OWN /oriole-music PAGE SCRAPED FOR THE FIRST TIME —
  the run's richest single source (12 adds: Giacomo Smith's Club Royale 23 Jul, Pipkin/Dunn
  weekday piano nights, Boneshaker Trio 7 Aug, Fezzes, Aisha Khan 15 Aug; covers ~3 months with
  fixed weekday cover prices). Nightjar Aug gaps part-filled (6 adds; dark: 2, 12, 15–16, 19, 22,
  26, 29, 31 Aug; Sep so far 1/2/11). Jamboree: TJ Johnson residency CONFIRMED pausing after
  29 Jul (he pops up at Nightjar 5 Aug); Prospective has no Sep dates; Cajun Après-Midi DEC
  instance published (12 Dec); Thumping Tommys 26 Jul one-off; no Ewan Bleach Oct lunches yet.
  Plaquemine roster refresh NOT yet published (still ends 2 Aug — re-scrape early next week).
  Zedel event system still broken; TL first-Tuesday NO jams mined through Nov (1 Sep/6 Oct/3 Nov).
  Dukes API, Ram Jam JSON, Vout-O-Reenees warmupData, Boaters feed: all nothing new in-genre.
- *Swing/gypsy circuit*: Halibuts pages 8–17 (EXHAUSTED at late Dec; Sinatra-musical/Boisdale
  crooner noise heavy): Judy Carmichael stride nights at Crazy Coqs 2–3 Oct (Zedel listings flow
  via Halibuts while their site is broken), Ray Gelato 100 Club 3 Oct + Ronnie's residency nights
  20–22 Dec, Swingtones + Satin Dollz at the Pheasantry, Ewan Bleach headlining HOXTON HALL
  24 Oct (£32.50; their ticketsolve 403s — Halibuts detail pages carry date AND price), Fabulous
  Lounge Swingers 12 Dec, Jazz Noël artsdepot 19 Dec, Jamie Safir Ronnie's lunch residency
  2–23 Dec. DFTC official page: NEW Cadogan 10 Oct (Get Downs 13 Oct → watchlist, soul-leaning;
  '18 Dec Bath' in our notes was wrong — it's Oxford, Bath is 8 Dec). Jive Aces: JiveSwing fest
  Watford 26 Jul, Eastbourne 9 Aug, Scotney Castle 14 Aug, Gilwell Park 27 Aug. EMMA SMITH
  Ronnie's 30–31 Aug held back under the crooner rule (→ watchlist), matching the Tony Bennett
  skip (also re-skipped: TL 24 Sep). Artist-site rot logged: raygelato.com/gigs 404,
  tjjohnsonmusic.com dead redirect, gypsydynamite.com DNS-dead, ewanbleach.com stale.
- *Suburban circuit (Jazz Guide)*: diaries rolled forward as hoped — Amersham through 30 Sep
  (5 adds + a previously missed 29 Jul row that was already ours), Epsom 14 Sep + 12 Oct,
  Riverhead 16 Aug Doolally Tap, Spice of Life 24/31 Aug (10 Aug lunch is modern jazz — out),
  Pump House 30 Jul + 13 Aug (sax-repertoire nights, verify). NEW VENUES: ONGAR JAZZ CLUB (Essex
  Fridays booking manouche/swing — Djangoliers 9 Oct) and COLCHESTER JC (Sarah Spencer 26 Jul);
  Falkland CC Newbury Sunday trad residency added as a borderline day-trip. EAST GRINSTEAD
  day-split solved: Sat 15 Aug is the trad day (Sussex Stompers/Jive Aces/Django Chutney free
  street trail) — own row added. PARSING TRAP found: the national listing interleaves Premium
  cards with rows — naive scraping fabricates phantom venue pairings, and WebFetch summaries
  invent weekdays; parse raw HTML, h4 rows separately from card__title. Winning Post venue page
  now 404s (gigs persist in the national listing). EFDSS API: nothing new; Fighting Cocks: zero
  qualifying again; Bull's Head: nothing (24 Oct 'ELLA' is a tribute-framed night — skipped).
- *NEW ANGLES*: DICE API CRACKED — api.dice.fm/unified_search takes unauthenticated POSTs;
  venue-name queries sweep whole programmes (prices in pence). Yielded the MOROCCO BOUND 'Jazz
  Manouche' series (bookshop bars, Wandsworth + Bermondsey — Wandsworth is Surbiton-side; 4 adds)
  and Pokey LaFarge at Islington Assembly Hall 12 MAR 2027 (first 2027 row). FOAOTMAD SESSION
  LIST — first old-time fixtures ever: Cock Tavern slow jam (explicit dates 26 Jul, 9+23 Aug),
  Lucas Arms + Biddle Brothers recurrences (verify). What's Cookin' myth busted: OWN SITE carries
  listings (Dom Glynn 22 Jul, Geraint Watkins 29 Jul added; 25 Jul still TBC). UK cajun/zydeco
  infrastructure confirmed dead (webfeet stub, zydeco.org.uk DNS gone, Cajun Barn dormant,
  Gloucester fest is a January thing). Songkick artist sweep low-yield (Rob Heron: still no
  London; search JS-walled — need exact IDs). Bandsintown REST API now auth-denies: DEAD.
  GOOGLEBOT-UA IG-CAPTION TRICK NO LONGER WORKS (captions gone from served HTML; FB pages empty)
  — Lamb Surbiton (handle is @lamb_surbiton) and Boaters stay dark, need a new technique.
  Rhythm Riot 2026 moved to Great Yarmouth 8–12 Oct (→ watchlist, far + partial fit); Hep Cats
  Holiday domain lapsed.

**What stayed dark / next time:**
- Plaquemine roster past 2 Aug (refresh imminent — hit it first next run); Nightjar's remaining
  Aug dark dates + Sep beyond 11th; Jamboree Prospective Sep dates, Cable Street Oct dates and
  Ewan Bleach Oct lunch instances; Fidelio after 10 Aug; The Hum autumn renewal (late Aug).
- The Lamb + Boaters: social gap reopened now Googlebot-UA captions are dead — try fresh
  Google-indexed instagram.com/p/ URLs or another approach.
- Jazz Guide Oct+ diaries land late Aug/Sep; EFG LJF trad-strand programme; Soho Jazz Festival
  line-up (late Aug); SwingdanceUK 40th-anniversary tickets on sale 1 Sep; Bishopsgate Swing Live
  October edition (check bishopsgate.org.uk directly — swingpatrol.co.uk served stale content);
  A Swingin' Sunday at Jamboree next edition (Eventbrite); Dukes of Highgate after 11 Sep.
- Ronnie's date-less show pages (Holborn, Diplock; Shirt Tail slug now 404s); 100 Club own page
  only renders through Aug — use Halibuts for its Oct–Dec strand.

---

## 2026-07-13 — fourth self-update run

**Housekeeping:** removed 20 finished gigs (10–12 Jul weekend). Added 35 gigs (21 confirmed,
14 verify) → 185 total; +3 watchlist rows → 52. Note refreshes: Cable Street residency extended
to 24 Sep; TJ Johnson Jamboree row flagged "no Aug dates re-confirmed 13 Jul".

**Methods tried (4 parallel research clusters; new angles in caps):**
- *Rolling-window re-scrape*: Nightjar's AUGUST GAP HAS FILLED (4–30 Aug published) — 9 adds
  (Fallen Heroes Qt 7 Aug, Lapazoos 27 Aug, Pipkin×3 etc.); remaining Aug blanks are unpublished
  nights. Jamboree now paginates to early Dec (?pno=1..9): Cable Street extended 10/17/24 Sep,
  Cajun Après-Midi venue-confirmed monthly through 14 NOV (12 Sep/10 Oct/14 Nov added), NEW EWAN
  BLEACH & THE FLEETING PARADISE ORCHESTRA Sunday-lunch big band 6 + 20 Sep (UKJN says 1st/3rd-
  Sunday residency, 10-piece late-20s/30s repertoire for dancers). TJ Johnson Wednesdays: STILL
  no Aug dates (last 29 Jul — pausing). Plaquemine roster unchanged (still ends 2 Aug). Zedel
  event system still broken; Diplock 14 Jul visible only via IG embed.
- *Gypsy-jazz + swing circuit*: HALIBUTS PAGINATION CRACKED (?page=N steps week-by-week; crawled
  pages 1–10 ≈ 2.5 months) — the run's richest vein: SWING COMMANDERS (WESTERN SWING!) Pheasantry
  4 Sep, Gypsy Dynamite at Oriole Bar 30 Jul + TL 15 Oct, Ray Gelato Soul Mama 28 Aug, Jive Aces
  Pheasantry 13 Sep, Blue Harlem 18 Sep, Phil Doleman (skiffle/jug) Green Note 4 Sep, TJ Johnson
  Ronnie's lunch 16 Aug, plus verify-grade big-band items (Syd Lawrence 5 Sep, Hugo Jennings
  8 Sep, New Foxtrot Serenaders Carshalton 6 Sep). THE PHEASANTRY added as a keyVenue (steady
  vintage strand; its own site is JWT-walled — read it via Halibuts). Swing Patrol: NEW Bishopsgate
  Swing Live CHRISTMAS PARTY 19 Dec (band TBA); no October edition exists (probe URLs 404).
  Fidelio: nothing after 10 Aug yet. The Hum: still ends 8 Sep, not renewed. TL crooner-adjacent
  Robin Phillips shows: NKC 23 Jul added verify, Tony Bennett 24 Sep skipped (crooner).
- *EVENTBRITE KEYWORD SEARCH (new angle — productive)*: /d/united-kingdom--london/<keyword>/
  pages read via plain fetch; best keywords gypsy jazz / trad jazz / honky tonk / swing dance
  live band / cajun. Finds: Charles Morris Jazzmen free gin-distillery trad 12 Sep, Charlie &
  Blue Ray vintage swing Camden 26 Sep (verify), cross-confirms of Dylan Earl/Elise Roth/Hum.
  SEE TICKETS + TICKETSOURCE = CONFIRMED DEAD (bot-block / JS-only, params ignored) — don't retry.
  Songkick works only with exact artist IDs (search-first, then fetch). Artist sweep: Rob Heron
  (western swing) has NO London dates (→ watchlist); Hot Sardines album but no UK dates (→
  watchlist); Sierra Ferrell/C.W. Stoneking London dates already past. UKJN WP API SLUG TRICK:
  /wp-json/wp/v2/posts?slug=<slug> returns full 403-walled articles (source of the Bleach lead).
- *SW-locals social-gap attack (0 gigs but 3 structural cracks)*: BOATERS API FOUND — real
  endpoint is www.boaterskingston.com/api/events/geteventfeed/5755 (recovered from a webpack
  chunk; direct services.greeneking.co.uk paths 404) — clean JSON but only corporate/garden
  events; Sunday-jazz line-ups are genuinely unpublished. VOUT-O-REENEES CRACKED — Wix Events
  warmupData JSON embedded in /events HTML (only upcoming item out-of-genre; Cat's Pajamas-type
  bookings are ad hoc, re-scrape each run). GOOGLEBOT-UA now reads FACEBOOK PAGES (2–3.7MB
  GraphQL payloads with post text + timestamps, no login wall) and IG POST URLs (embedded
  caption JSON + related-posts timeline — got July Lamb captions far beyond Google's index).
  Lamb verdict: forward line-ups don't exist publicly; acts named same-day (poll a recent IG
  post URL Fri–Sun to catch 'this Sunday' pre-announcements). Fighting Cocks re-checked through
  Dec: still zero qualifying. Ram Jam JSON re-pulled: nothing new in-genre. Excellar's new 'Ex
  Cellar Jazz 2026' residency (18 Sep–11 Dec) is contemporary/funk — out, but guests TBA.

**What stayed dark / next time:**
- Jamboree TJ Johnson Aug residency (pausing?); Plaquemine roster refresh (~20 Jul); Nightjar's
  remaining Aug blanks (fill ~2 weeks out); Fidelio dates after 10 Aug; The Hum autumn renewal
  (late Aug); Zedel event system; Ronnie's null-JSON-LD shows (Stompers/Holborn/Diplock).
- Ewan Bleach residency: check Jamboree for Oct 1st/3rd-Sunday instances next month; Oriole
  Bar's own listings page not yet scraped directly — do it next run.
- Boaters/Lamb: poll the geteventfeed endpoint + weekend IG-post checks; both remain line-up dark.
- Jazz Guide Sep+ diaries land late Aug (Old Barn Hall, Epsom, Spice of Life, Pump House,
  Amersham, Riverhead, 46 Club); Soho Jazz Festival line-up late Aug; EFG LJF trad strand;
  Twinwood day-splits; Dukes of Highgate Oct+ (WP API says nothing booked after 11 Sep).

---

## 2026-07-10 — third self-update run

**Housekeeping:** removed 7 finished gigs (7–9 Jul). Added 45 gigs (~20 confirmed, ~25 verify)
→ 170 total, validate clean every pass. Upgrades: Ten Bells 31 Jul verify→confirmed (firmly back
on Plaquemine's roster); Swing Den 18 Sep contradiction RESOLVED and upgraded (see below); Dukes
Sunday Service 12 Jul time corrected 15:00→17:00 per the venue's own events API.

**Methods tried (5 parallel research clusters; new angles in caps):**
- *Rolling-window re-scrape*: Jamboree's diary now runs ~8 weeks (?pno=2..6) — 8 Aug Cajun
  Après-Midi confirmed, Cable Street Thursdays confirmed weekly through 3 Sep, Prospective
  Collective Sundays through 30 Aug, plus a strongly on-brief honky-tonk one-off (DYLAN EARL BAND
  + Dom Glynn w/ two-step lessons, 19 Aug). NB: TJ Johnson's Wednesday residency shows NO August
  dates — break or unposted, re-check. Nightjar's "MAZZA" IDENTIFIED via web search: NO R&B
  repertoire (Fats Domino/Smiley Lewis/Dr John), blues-leaning — added 21 Jul + 18 Aug as verify.
  Plaquemine's roster stretched to 4 weeks (7 adds; residency patterns confirmed). Zedel's event
  system still broken (same banner).
- *Gypsy-jazz cluster*: The Hum's series JSON endDate = 2026-09-08 — NOT renewed yet, re-check
  late Aug. Toulouse Lautrec pages 2–5: only new in-genre item is Rockin'em Trio 9 Aug (verify —
  R'n'R-leaning). SWING DEN CONTRADICTION RESOLVED: 18 Sep is "Bishopsgate Swing Live!", Swing
  Patrol's separate monthly LIVE-BAND series (URL pattern /events/{slug}/DD-MM-YYYY/) — Viellefon
  18 Sep + PETE HORSFALL 20 NOV both on sale; the DJ-only Swing Den first-Fridays were excluded.
  Ronnie's Stompers/Holborn/Diplock pages now emit JSON-LD skeletons with null dates — still
  nothing on sale. Vout-O-Reenees: nothing in-genre dated.
- *Suburban trad circuit (The Jazz Guide)*: full venue-index sweep (?start=N pagination, 11
  pages, ~85 venues). Old Barn Hall diary mined through 30 Aug (6 adds), Pump House + Amersham
  standouts added — CORRECTION: NO Bump (29 Jul), Louisiana Rhythm Kings (12 Aug) and NO
  Wanderers (19 Aug) are AMERSHAM Wednesdays, not Pump House as last run's peek said. NEW VENUES:
  46 CLUB UXBRIDGE (weekly Thu NO residency) and RIVERHEAD JC SEVENOAKS (Sun afternoons, Hugh
  Crozier 19 Jul). Diaries are rolling ~4–7 week windows — Sep+ lands late Aug.
- *SOCIAL-GAP CRACK (new angle, the run's structural win)*: two techniques work — (1)
  PLATFORM-NATIVE JSON: Squarespace ?format=json (Ram Jam full 135-event calendar; Betsey
  Trotwood) and open WordPress tribe/events REST APIs (Dukes of Highgate — proved nothing booked
  after 11 Sep through Jun 2027); (2) GOOGLEBOT-UA FETCH of Google-indexed instagram.com/p/ URLs
  returns full captions (date-check them — one caption proved to be Oct 2025). Editorial results:
  COME DOWN AND MEET THE FOLKS IS DORMANT (moved to the Betsey Trotwood years ago; last edition
  26 Oct 2025 — our watchlist had the wrong venue and phantom 3rd-Sunday dates, now fixed); FILE
  GUMBO CONFIRMED DEAD (frozen at a cancelled 13 Mar 2020 event); Ram Jam's "Speakeasy Party"
  brand has vanished (Sunday jazz jam added instead). Failures: IG mirrors all dead/403,
  mbasic/m.facebook login-walled, archive.org 429'd all session, Boaters' Greene King events API
  found in page source (venueId 5755) but every path guess 404s.
- *Fresh aggregators*: THE JAZZ GUIDE'S NATIONAL /gigs-and-events/ LISTING (server-rendered,
  ?start=N) is the best new aggregator — most of this run's trad adds. WILTON'S MUSIC HALL
  per-event pages are server-rendered (Tricity Vogue swing 11 Nov). CADOGAN'S JAZZ REPERTORY
  COMPANY series page: 1956 Jazz Jubilee 27 Sep, Ella & Louis 22 Nov (+ Goodman Carnegie Jan
  2027 → watchlist). SWINGLAND live-band socials (A-Train w/ Rhythm Kitchen 20 Jul). Artist
  pages: DFTC regional day-trips (Brighton 20 Sep, Bedford 16 Oct, Oxford 18 Dec, Cambridge
  21 Dec), New River Dixielanders free St Albans park gig 26 Jul, Jive Aces Southend 18 Jul.
  TWINWOOD FESTIVAL 28–31 Aug (UK's flagship vintage-swing fest) added as a day-trippable
  main-list row. UK Jazz News: use the WP REST API (/wp-json/wp/v2/posts?search=) — index is JS.
  Dead ends: DICE browse (JS-only), allevents.in (Cloudflare 403), Skiddle eventcodes filter
  ignored server-side, Half Moon Putney (all tribute/rock beyond the known Eskimo Brothers).

**What stayed dark / next time:**
- Jamboree TJ Johnson Aug dates; The Hum autumn renewal (check late Aug); Fidelio Hot Club after
  10 Aug (Grimshaw's guide); Ronnie's null-JSON-LD shows; Nightjar's unpublished 1–16 Aug nights
  (fill ~2 weeks out); Plaquemine next roster (~24 Jul).
- Jazz Guide Sep+ diaries land late Aug (Old Barn Hall, Epsom, Spice of Life, Pump House,
  Amersham); mine Riverhead + 46 Club diaries each run.
- Dukes Oct–Dec: poll the WP API; Lamb Surbiton + Boaters still the last uncracked locals (try
  Greene King API path variants; Googlebot-UA IG captions once Google indexes new posts).
- Zedel event system (broken since early Jul); EFG LJF trad-strand programme; Soho Jazz Festival
  line-up (late Aug); Twinwood day-splits (which days are swing vs 50s jive/soul).

---

## 2026-07-07 — second self-update run

**Housekeeping:** removed 8 finished gigs (Maverick to 5 Jul; the 4–5 Jul Nightjar/Green Note/
Plaquemine/Jamboree rows). Added 61 gigs (~22 confirmed, ~39 verify) → 132 total, validate clean
first pass. Upgraded to confirmed: Ags Connolly Winchester 10 Sep (artist's own shows page),
La Bouche Manouche 19 Sep (venue event card), Excellar 31 Oct (blog post — it's the KINGSTON
branch, 38 Market Place, not Surbiton). Ten Bells 31 Jul re-flagged: no longer on Plaquemine's page.

**Methods tried (5 parallel research clusters; new angles in caps):**
- *Rolling-window re-scrape* (Nightjar, Plaquemine, Jamboree, Boisdale, Zedel): JAMBOREE'S OWN
  /upcoming-events/ PAGINATION (?pno=2..4) was the run's richest vein — weekly Wed TJ Johnson +
  Sun Prospective Collective free swing afternoons, weekly Thu Cable Street Rag Band swing dance,
  monthly 2nd-Sat **Cajun Après-Midi** (London's only regular cajun slot now that the Harrison jam
  is dead), Elise Roth 19 Jul, Bosko Baker jug/roots 22 Jul. Nightjar diary now reaches ~10 Oct
  with gaps (8 adds); unidentified act "MAZZA" 21 Jul/18 Aug — classify next run. Boisdale's full
  diary (486 items) yields to Chrome-UA curl: mostly out-of-genre, but de Graaf 11 Nov + a Dec
  Long Lost Frets gypsy-swing lunch residency found. Zedel event system still broken (banner).
- *Gypsy-jazz cluster*: TOULOUSE LAUTREC CALENDAR PAGINATION (?query-e166816d-page=2..5) unlocks
  the diary through Dec — Boheme Hot Club 5 Sep (new band), Biscuit Town 28 Nov, monthly NO jam
  dates. The Hum's Eventbrite JSON-LD proves the Tuesday manouche night runs weekly to 8 Sep
  (series end — watch renewal). Artist gig guides again outperformed venues: benoitviellefon.com
  gave Bishopsgate Swing Den 18 Sep + Eastbourne/Hove day-trips. harrydiplock.com is DNS-dead.
- *Trad/swing cluster*: THE JAZZ GUIDE (thejazzguide.co.uk) is the run's biggest structural find —
  fully dated diaries for the suburban trad-club circuit: **Epsom Hot Jazz Club** (Mon afternoons,
  short hop from Surbiton), **Old Barn Hall Bookham** (Sun lunches), Pump House Watford, Amersham
  JC, Spice of Life Mon lunches. RONNIE SCOTT'S FULL FIND-A-SHOW CRAWL via Chrome-UA curl (20
  pages, 219 shows): TJ Johnson 16 Aug, Giacomo Smith 10 Sep, Nora Germain 22 Sep, Ray Gelato
  19–23 Dec; per-show JSON-LD proves Shirt Tail Stompers + Matt Holborn + Diplock shows have NO
  dates on sale (empty arrays — not a scraping failure). jiveaces.org/tour fully dated (4 adds
  incl. a new 100 Club Sunday-jive strand). SwingdanceUK added its 40th-anniversary party 5 Dec.
- *Country/cajun/old-time cluster*: EFDSS SPEKTRIX /instances ENDPOINT gave exact Nov/Dec
  Barndance dates (14 Nov, 12 Dec — band TBA, kept verify). agsconnolly.com (Chrome-UA) confirmed
  Winchester + a NEW Dave Sutherland album launch w/ Ags at Blackheath Halls 17 Oct. Ron's Honky
  Tonk "Fri 3 Oct" RESOLVED: stale 2025 event (list mixes past/upcoming) — never publish it.
  Green Note cherry-picks: Tim Penn 22 Aug, Whippoorwills 5 Sep, Square Peg 12 Sep, Dale Storr
  26 Sep, TJ Johnson Trio 14 Nov. Harrison cajun jam confirmed OFF the 2026 calendar.
- *SW-locals + ticketing sweeps*: Sierra Ferrell TONIGHT at O2 Forum (Ticketmaster). Ealing Blues
  Festival 2 Aug has Kitty, Daisy & Lewis on the Hokum Stage. Fighting Cocks re-checked through
  2027: still zero qualifying. WeGotTickets search confirmed broken (ignores query params);
  Bandsintown now 403s even with Chrome UA.

**What stayed dark / next time:**
- Social-only gap unchanged: The Lamb Surbiton (Songkick 0 upcoming), Boaters Kingston per-Sunday
  line-ups (jazzinlondon.live DNS-dead, venue site JS-only), Dukes of Highgate Oct+, Shirt Tail
  Stompers, CDMTF (site refuses connections AND archive.org unreachable this run — 19 Jul is the
  next 3rd Sunday).
- Pizza Express Live is client-rendered with a JWT-protected API — only known-slug event pages
  render; need slug guesses or a different angle.
- Jamboree pagination beyond ?pno=4 (Aug+ diary incl. the expected 8 Aug Cajun Après-Midi) and
  Nightjar's "MAZZA" — pick up on the next run, along with the Plaquemine mid-July refresh.
- The Hum series renewal after 8 Sep; Ronnie's empty-JSON-LD shows (Stompers/Holborn/Diplock);
  Swing Den 18 Sep vs Bishopsgate's "season ends 4 Sep" contradiction — re-confirm.

---

## 2026-07-04 — first self-update run

**Housekeeping:** removed 2 finished gigs (Rose's Pawn Shop 1 Jul, Tim Penn @ Nightjar 3 Jul);
kept Maverick (runs to 5 Jul). Added 40 gigs (28 confirmed, 12 verify) → 79 total, validate clean.

**Methods tried (5 parallel research clusters):**
- *Near-term venue re-scrape* (Nightjar, Crazy Coqs, Boisdale, 100 Club): Nightjar's July diary
  was the single richest source (8 adds) and even had far-out one-offs (11 Sep, 10 Oct — added as
  verify since that's beyond its usual 2-week window). 100 Club listings URL moved to
  /100club-events/ (old one 404s). Zedel's event system is publicly broken (banner on site).
- *Gypsy-jazz cluster*: NEW ANGLE that paid off — **artist gig guides over venue calendars**.
  Sol Grimshaw's site (solgrimshaw.com/events-1) yielded fully-dated Fidelio Hot Club residency
  dates + a Bechet tribute + cross-confirmed Harry Diplock at Crazy Coqs 14 Jul. Green Note's
  production pages gave the monthly Django Reinhardt Sessions. La Bouche Manouche 19 Sep now
  corroborated on Toulouse Lautrec's own event page (year still unprinted — kept verify).
- *Cajun/old-time cluster*: NEW ANGLE — **EFDSS Spektrix API** (sales.efdss.org/efdss/api/v3/events)
  bypasses the 403-ing HTML; full Jul–Dec feed has NO cajun/old-time beyond the Barndance series.
  Plaquemine Lock now publishes a rolling ~2-week roster (3 adds incl. cajun/zydeco Geraint
  Watkins) — treat like Nightjar, re-scrape fortnightly. File Gumbo effectively dead (site frozen
  2020, absent from EFDSS feed); Harrison cajun jam has no 2026 instances — both likely dormant.
- *Honky-tonk/country cluster*: What's Cookin' finally produced a squarely-on-brief bill
  (Longshore Drifters 16 Sep). Ron's Honky Tonk has MOVED from Water Rats to Fabal Beerhall,
  Bermondsey (28 Aug added; their "Friday, October 3" listing fails the weekday check — held back).
  Dukes of Highgate calendar exposes nothing past 11 Sep to scrapers.
- *SW-London locals + ticketing sweeps*: Ram Jam Records calendar (NOT the Grey Horse's own empty
  events page) got Tim Penn & The Second Line in Kingston 11 Jul — best home-turf add. Eventbrite
  organiser pages work well: The Hum (Stoke Newington) is an emerging gypsy-jazz hub with a free
  weekly Tuesday manouche night (added) + Gypsy Jazz Icons series. Fighting Cocks full diary
  re-checked: 100% rock/tribute, zero qualifying. WeGotTickets search params ignored by fetch;
  TicketSource results all out-of-London; Skiddle genre search JS-rendered — ticketing sweeps
  were largely a bust except Eventbrite.

**What stayed dark / next time:**
- Vortex "Gypsy Jazz Monthly": series page is a 2014–2019 archive and Jul–Sep calendar has no
  gypsy night — residency may be dormant; re-check monthly.
- Ronnie Scott's still 403s (Shirt Tail Stompers Sundays + Matt Holborn "Giants of Jazz Violin"
  unresolvable) — try a browser-UA fetch or Google cache next run.
- Boisdale needed a browser-UA request to get past 403 — worth wiring into future scrapes.
- Social-only gap unchanged (The Lamb Surbiton, File Gumbo Facebook, Dukes of Highgate Oct+ via
  Instagram). Come Down and Meet the Folks' site refuses connections — try archive.org next run.
- Nightjar/Plaquemine Lock rolling windows mean the Aug diary lands mid-July — the next scheduled
  run should re-scrape both first.

---

## 2026-07-01 — initial build

**What this run did:** Built the gig-radar (schema, generator, page, validator, self-update
prompt/prefs/sources, twice-weekly scheduled task) and seeded it with an initial research pass.

**Discovery methods tried (parallel fan-out):**
- Gypsy jazz cluster: Le QuecumBar, Toulouse Lautrec, Vout-O-Reenees, Gypsy Jazz Agenda.
- Hot/trad/KC-swing cluster: Kansas Smitty's, Nightjar, The 100 Club, Crazy Coqs, Wilton's.
- Cajun/zydeco/old-time/jug/skiffle: Cecil Sharp House (EFDSS), London cajun bands.
- Western swing/honky-tonk/old-school country: What's Cookin', Green Note, Slaughtered Lamb,
  Come Down and Meet the Folks.
- SW London proximity: Fighting Cocks (roots only), Bull's Head Barnes, Eel Pie, local jazz.
- Festivals/aggregators within ~90 min: Maverick, East Grinstead Jazz Fest, EFG London Jazz
  Festival, Soho Jazz Festival, plus Songkick/Bandsintown/DICE/Skiddle/Ents24.

**Confirmed within the Jul–Dec 2026 window (highlights):**
- East Grinstead Jazz Festival (14–17 Aug) — genuine New Orleans/trad strand, ~1h train.
- EFG London Jazz Festival (13–22 Nov) — reliably carries gypsy/trad/hot strands.
- Maverick Festival (3–5 Jul, Suffolk) — trad-leaning americana, but overnight/camping.

**What stayed dark / to try next time:**
- Several strong genre festivals fall OUTSIDE Jul–Dec 2026 (Gloucester Cajun & Zydeco = Jan,
  London Gypsy Jazz Festival at Toulouse Lautrec = Apr) — surface these on the winter/spring run.
- Le QuecumBar and Toulouse Lautrec publish rolling calendars; confirm individual near-term
  dates each run rather than relying on the residency being "ongoing".
- Social-only venue nights (Instagram/Facebook) not yet cracked programmatically — same gap as
  the main calendar (see main method-log). Try public page endpoints / ticketing back-doors.
- Cecil Sharp House cajun/old-time dance dates worth a direct what's-on scrape each run.
