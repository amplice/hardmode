# Gig-radar method log

A running record of which discovery methods/sources each run tried, what produced gigs, and
what to try differently next time. Newest entries at the top.

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
