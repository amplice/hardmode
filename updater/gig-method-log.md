# Gig-radar method log

A running record of which discovery methods/sources each run tried, what produced gigs, and
what to try differently next time. Newest entries at the top.

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
