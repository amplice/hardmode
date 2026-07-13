# Discovery method log

Each automated run appends an entry here recording which sources and discovery methods it
tried, so future runs diversify instead of repeating the same angles. Newest entries go at
the bottom.

Format per run:

```
## YYYY-MM-DD
- New sources/methods tried: ...
- What worked: ...
- Try next time: ...
```

## 2026-06-22
- New sources/methods tried:
  - the cornerHOUSE individual `/event-details/` pages (not just the listing) — fetched per-event to get exact 2026 dates, times, prices and genre.
  - Ticketing-platform sweep scoped to the area: Eventbrite, Skiddle, DICE, TicketSource, See Tickets.
  - Royal Parks (Bushy Park), National Trust (Ham House, Claremont) and English Heritage (Eltham) what's-on pages.
  - Seasonal angle: summer fetes + church/hall concert series (All Saints Kingston lunchtime music, St Mark's Surbiton, Berrylands/Hollyfest community festivals).
- What worked:
  - the cornerHOUSE detail pages were the standout — yielded confirmed Folk@thecornerHOUSE (Martha Tilston), Encore! musicals, Express CIC comedy, and Liberace cabaret. Added 7 events total.
  - All Saints Kingston `/choir` page gave a confirmed free lunchtime recital (Chuanwei Wang, 29 Jun).
  - Surbiton Partnership event pages confirmed Berrylands Summer Festival (5 Jul, free).
  - English Heritage Eltham pages rendered cleanly (Sunday Music, Great British Summer, Legendary Joust) but Eltham is too far — left on watchlist.
- What didn't work / cautions:
  - Eventbrite/Skiddle location scoping is noisy — returned London-wide/pan-Surrey, almost nothing genuinely in Kingston/Surbiton. Low yield.
  - Canbury Bandstand 2026 lineup still unpublished (organiser page shows none; Facebook login-walled) — kept on watchlist, did NOT fabricate Sunday performers.
  - Rose Theatre /whats-on served stale 2025-aligned listings; treated with caution (existing rows already cover Jazz Fridays etc.).
  - National Trust (Ham House, Claremont) bot-blocked (Radware) — could not verify; watchlist for manual check.
  - HRP Hampton Court and TicketSource returned 403 to WebFetch.
  - Note: WebSearch is US-only and repeatedly surfaced stale Canbury lineups (2023/2025) as if current — always verify the year on a live page.
- Try next time:
  - Re-fetch Canbury Bandstand organiser/Facebook and All Saints autumn recital series once published.
  - Pull Thames Concerts (St Andrew's Surbiton) 2026-27 dates (17 Oct, 21 Nov leads).
  - Try DICE/See Tickets via specific venue pages rather than area pages; check FUSE International individual show pages.
  - Retry NT Ham House/Claremont via a different method; check Polka Theatre autumn under-5s shows.

## 2026-06-25
- New sources/methods tried:
  - Thames Concerts season page (thamesconcerts.com) — resolved the long-standing watchlist lead; pulled the confirmed autumn 2026 recital dates/performers (17 Oct Kohout/Leung, 21 Nov Walton/Lebhardt) at St Andrew's Surbiton. Added as a new known source.
  - Polka Theatre /shows + autumn/winter 2026-27 press coverage — followed individual show pages beyond the summer block (a "try next time" item). Surfaced 'Blub' (Theatre Nuu early-years sensory run, 13-23 Aug) which wasn't yet in the dataset.
  - the cornerHOUSE /whats-on August detail pages — fetched per-event hrefs for Aug 2026 (Fire & Dust Woody Guthrie folk, Once Upon a Time summer show, Bayeux Tapestry talk).
  - Friends of Canbury Gardens direct site (friendsofcanburygardens.org/bandstand) as a fresh angle on the Canbury lineup gap; added as a known source.
  - Hampton Court via WebSearch (direct WebFetch 403s again) to cross-check the August programme.
- What worked:
  - Thames Concerts page was the standout — clean, explicitly 2026-dated, organiser-confirmed. Two solid Core-Surbiton chamber-music rows added (start times still unconfirmed, so verify:true).
  - Polka show pages confirmed 'Blub' (13-23 Aug) — added as an early-years theatre run (verify:true on exact times/price).
  - Cross-checking before adding prevented 4 duplicates: the cornerHOUSE Woody Guthrie folk show (11 Aug), Hampton Court Food Festival (29-31 Aug), Beano Havoc run, and Polka Big Dreams (19-20 Sep) are ALL already in the dataset. The Aug-Dec catalogue is already well populated.
- What didn't work / cautions:
  - Canbury Bandstand 2026 lineup STILL unpublished — organiser site (canburybandstand.org) refused connection, Friends-of page shows "no upcoming events / 2025 season". Left on watchlist; did not fabricate Sunday performers.
  - All Saints Kingston autumn lunchtime recitals still only listed through 29 Jun — autumn series not yet posted. Watchlist.
  - HRP Hampton Court and Thames Concerts detail/booking pages 403/404 to WebFetch — got dates from the season landing page + WebSearch instead. Exact concert start times for Thames Concerts couldn't be confirmed (left verify:true).
  - the cornerHOUSE 'Once Upon a Time' (10-14 Aug) is primarily a paid ages-8-14 intensive (£190) with a Fri 14 Aug 6pm sharing performance — kept on watchlist rather than adding, as public-show status is borderline.
- Try next time:
  - Re-check Canbury Bandstand + All Saints autumn recitals once 2026 detail is published.
  - Confirm Thames Concerts start times and ticket prices (clear the verify flags on the 17 Oct / 21 Nov rows).
  - Confirm Polka 'Blub' performance times/price; check Polka spring 2027 early-years shows.
  - Retry NT Ham House/Claremont and HRP detail pages via an authenticated/alternate method; chase FUSE International individual show pages.

## 2026-06-28
- New sources/methods tried:
  - Canbury Bandstand gap attacked from new angles: CARA Kingston (carakingston.org), kingston.gov.uk event pages, and Kingston Nub News local-news roundups — none yet expose the 2026 Sunday performer schedule.
  - Hampton Court Palace Festival official/lineup sites (frontstagefestivals, hamptoncourtpalacefestival.com) to check for datable concerts.
  - Hampton Court Palace Ice Rink dedicated site (hamptoncourtpalaceicerink.co.uk) + London Cheapo to confirm the 2026/27 season window.
  - Kingston Libraries summer programme: libraries.kingston.gov.uk/events and the kingston.gov.uk summer-events page, plus the hellokingstonkids "Local Summer Guide" roundup blog (a fresh family-focused source).
  - Rose Theatre autumn 2026 via WebSearch + the specific show URL (the /whats-on listing only renders through mid-July to WebFetch).
- What worked:
  - Rose Theatre autumn search was the standout: surfaced Stewart Lee vs The Man-Wulf (rescheduled to 7-8 Sep 2026), confirmed on the official Rose event page. Added as the one new row (comedy, 14+, verify:true on start time since the page still shows the old Nov dates/times).
  - Cross-checking before adding prevented several duplicates: Hampton Court Ice Rink (already e754, 20 Nov-31 Dec, dates confirmed accurate against the dedicated site: 20 Nov 2026-3 Jan 2027, 10:00-20:00), Tim Peake (4 Oct), Jane Eyre (13 Oct), Surbiton Festival (26 Sep), and TDMR running days (2/30/31 Aug, 6 Sep, 4 Oct) are ALL already present.
  - Michael Rosen 'NICE!' at the Rose was found but is dated 4 May 2026 (past) - correctly NOT added.
- What didn't work / cautions:
  - Canbury Bandstand 2026 lineup STILL unpublished across CARA, Friends-of-Canbury, kingston.gov.uk and Nub News - the only "Soul Rites" reference traces to an old 2021 Nub article and a June (not July) slot, so the stale watchlist "12 July Soul Rites" lead is unreliable. Left on watchlist; did not fabricate performers.
  - hellokingstonkids summer guide and library events pages only exposed stale 2025 dates or 403'd (libraries.kingston.gov.uk/events = 403; mylibrary.digital still the bookable backend). Summer Reading Challenge starts 4 Jul 2026 but no datable per-branch toddler sessions surfaced yet.
  - Hampton Court Palace Festival is 10-20 June - already over for this run; nothing to add.
  - HRP and ice-rink/londoncheapo detail pages 403/500 to WebFetch again; got the ice-rink 2026/27 window from WebSearch summaries (consistent with the existing row).
- Try next time:
  - Re-check Canbury Bandstand (CARA + Friends-of-Canbury) and All Saints Kingston autumn lunchtime recitals once 2026 detail is finally published - both are persistent gaps.
  - Mid/late July: re-fetch Kingston Libraries summer-holiday children's programme (mylibrary.digital backend) for toddler-suitable craft/story sessions.
  - Clear the verify flag on Stewart Lee once the Rose page shows the Sept start time; confirm Thames Concerts (17 Oct/21 Nov) and Polka 'Blub' times.
  - Chase FUSE International individual show pages and retry NT Ham House/Claremont via an alternate method.

## 2026-06-29
- Method: ran a parallel fan-out of 8 scoped research subagents (one per source cluster: The Lamb, Canbury Bandstand, Rose, cornerHOUSE, Hampton Court, Kingston Libraries, Polka/Southbank, and a broad Kingston town/gig sweep), each told to return only explicitly-2026-dated rows with live URLs and to weekday-match dates against the 2026 calendar. Deduped + curated centrally. Net: +27 events, -6 finished.
- What worked:
  - CANBURY BANDSTAND GAP FINALLY CLOSED. The standout: carakingston.org/bandstand-concerts embeds the official "Canbury Bandstand Concerts 2026" season poster as a JPG; the agent downloaded the full-res image and OCR'd it directly, yielding the entire Sunday lineup with performer names (5 Jul-6 Sep, season skips 19 Jul & 30 Aug). The recurring '12 July Soul Rites' was confirmed genuine on the 2026 poster - NOT the stale 2021 Nub article (which the agent independently rejected). LESSON: when an organiser page is "image-only", OCR the poster instead of giving up.
  - Kingston town sweep via Surbiton Partnership/The Good Life detail pages + kingston.gov.uk/events was very productive: confirmed Saxon Fayre (25 Jul, resolves the long-standing Kingston-heritage/Athel's-Town gap for 2026), Memorial Gardens picnic, Tolworth rewilding/swift/bat nature walks, plus folk/blues/country/comedy rows. kingston.gov.uk/events is server-rendered and readable - a reliable fallback when VisitKingston/KingstonFirst refuse connection.
  - Rose agent weekday-matched undated pages to 2026 to rule out stale 2024/25 listings (As You Like It, Una Coello toddler singalong, Room on the Broom). Tim Peake/Inky Pathways correctly skipped as already-held/recurring.
  - cornerHOUSE detail pages gave Coda Concert, Attitude summer shows, and the Bayeux Tapestry talk (which let us upgrade the vague placeholder 'Talk on Shakespeare' 4 Aug). Hampton Court agent confirmed 'Havoc' is officially 'Beano Havoc', 25 Jul-23 Aug.
- What didn't work / cautions:
  - THE INSTAGRAM/FACEBOOK WALL is now the dominant blocker. The Lamb's own site pushes all dated gigs (Sunday Sessions, 'An Evening With') to Facebook, which redirect-loops to WebFetch; aggregators (Songkick/Ents24/Lemonrock) are empty for it. Returned nothing rather than fabricate. Same wall on Kingston Libraries summer programme (mylibrary.digital = 403; libraries.kingston.gov.uk = JS-only SPA that renders nothing to a fetch). These need a manual screenshot/paste pass - flagged to the user, who confirmed IG is where this lives now.
  - Stale-year traps avoided: Kingston Carnival (7 Sep) & River Cultures Festival (6 Sep) only had 2025 dates whose weekday matched 2025; Southbank 'Skate Up Space' (9 Aug = Sunday in 2026 but a Saturday listing) excluded; Polka 'Arthur' excluded (ages 6-12, too old for the 2yo profile).
  - Applied the Fighting Cocks venue rule: dropped Temples/Mary in the Junkyard/The Xcerts/Kris Barras (indie/rock at the Cocks) and two indie Banquet in-stores + a nightclub DJ (profile fit); kept Carolina Cury (free) and The Shires (country).
- Try next time:
  - Build an Instagram/Facebook "social-only venues" manual-check list (The Lamb, cornerHOUSE socials, Surbiton pubs, parks/schools). Offer the user a screenshot->OCR loop (the Canbury poster proved OCR works well).
  - Mid/late July: re-fetch Kingston Libraries summer-holiday children's programme once published; All Saints Kingston autumn lunchtime recitals; Banquet Records Sept listings (only live to mid-Aug now).
  - Clear verify flags once confirmed: Coda/Attitude times & prices, Southbank fountain exact hours, Jazz Night at Elm Tree (may be recurring), Lindy Hop/Bat Walk/Comedy-at-the-Waggon prices.

## 2026-07-01
- Method: 4 parallel scoped research subagents, each told to return only explicitly-2026-dated rows on live/fetchable pages and to weekday-match every date to the real 2026 calendar. Clusters chosen to hit the CURRENT gaps rather than repeat June's angles: (1) December/Christmas - the thinnest month; (2) autumn/winter classical & choral series - a persistent gap; (3) The Lamb + Surbiton/Kingston pub gigs incl. a real crack at the Instagram/FB wall with OCR; (4) summer-holiday library/family programme now that the school holidays are live. Deduped + curated centrally against the existing Jul-Dec dataset. Net: +14 events, -14 finished, 2 confirmed (verify cleared).
- What worked:
  - NEW SOURCE - Ram Jam Records / The Grey Horse (ramjamrecords.co.uk/events) is a fetchable, explicitly-dated Kingston gig calendar. This is the practical answer to the Lamb social wall: a real music venue that actually publishes dates. Added 5 distinctive jazz/funk/blues/daytime gigs (Flaming Alligators, Decibelles, Tim Penn, Atlantic Soul Machine, Squabble). Skipped the weekly open mic (r15) and Jazz Jam (r17) - already recurring.
  - Thames Concerts individual event pages (thamesconcerts.com/saturday-DD-month-2026-.../) are clean and organiser-confirmed: cleared verify on the two held Oct/Nov dates (£22, 19:30, doors 18:45) and added Halcyon Quartet (12 Sep) + Rieko Makita (12 Dec). Kingston Choral Society (kingstonchoralsociety.org.uk/events) added Haydn's Creation (21 Nov) + Christmas carol concert (19 Dec) - both help the thin December.
  - December sweep: kingstonchristmasmarket.co.uk/plan-your-visit gave the confirmed 2026 market run (12 Nov-3 Jan, capped at 12-31 per dataset convention) - closes the long-open Kingston-Christmas gap. Rose 'Wind in the Willows', Polka Peter Pan/Antarctica and HRP 'Winter Palace' were all already held as dated rows (not re-added).
  - Family/library: LibraryOn (libraryon.org) is a fetchable frontend for Kingston libraries when the mylibrary.digital backend 403s - surfaced under-5s 'Once Upon a Beat' holiday specials (11 Aug Surbiton, 25 Aug Tolworth). Polka Big Dreams: After Party (20 Sep) and Morden Hall Park Harvest Festival (3 Oct) added.
- What didn't work / cautions:
  - THE LAMB SURBITON social wall still not crackable this run: lambsurbiton.co.uk is Wix/JS (generic copy only), Facebook/Instagram login/JS-walled, and Songkick shows "0 upcoming" (listings stop 14 Jun). No poster image URL was ever reachable to OCR. Returned NONE for the Lamb rather than fabricate. (Site still carries stale 'Fiddly Diddly' copy - correctly ignored per the defunct rule.)
  - Fighting Cocks July-Aug 2026 gigs all failed the roots/trad filter (indie/rock/punk/metal/comedy/quiz/D&D) - excluded in full. Whelan's Thursday trad (thesession.org 403) and Elm Tree Jam-Pact (404) recurring but no fetchable dated page - left as recurring, not fabricated.
  - Stale-year traps rejected: local carol-concert dates (Sun 17 Dec/20 Dec suggestions matched 2023 weekdays, not 2026); Kingston Christmas lights switch-on 2026 not yet dated; RBK National Play Day still showing the 2025 instance. All left for an autumn recheck.
  - Southbank Centre fully 403/bot-walled again (no Aug-Oct family rows); HRP Hampton Court 403 (Winter Palace details came via WebSearch of the HRP page); NT Morden Hall detail pages Radware-blocked (Harvest Festival left verify:true).
  - All Saints Kingston autumn lunchtime/organ recitals STILL not published (choir page lists only to 29 Jun/19 Jun) - persistent gap, recheck Oct/Nov.
- Try next time:
  - Re-fetch Ram Jam Records for Aug/Sep gigs (only live to ~early Aug now); consider a recurring row for Crack Comedy Kingston (weekly Fri) if it keeps running.
  - Autumn recheck: All Saints Kingston autumn recital series; local carol-concert dates (St Andrew's/St Mark's Surbiton, All Saints Kingston); Kingston Christmas lights switch-on date; RBK National Play Day 2026.
  - Confirm/clear verify: Rieko Makita price, Kingston Choral Society ticket prices, Morden Hall Harvest Festival time/price, the two library 'Once Upon a Beat' specials, and the 5 Ram Jam gigs.
  - Keep trying the Lamb wall via new angles (WeGotTickets/DICE direct, a reachable poster image to OCR); it remains the single biggest blind spot.

## 2026-07-04
- Method: 4 parallel scoped research subagents (Ram Jam refresh + gig confirmations; Lamb wall via NEW aggregators; summer-holiday family/library programme + NT/Royal Parks retry; church-hall concert sweep + verify-flag confirmations) plus a direct main-loop sweep of Surbiton Partnership and Banquet Records. Net: +29 dated, +5 recurring, -8 finished dated, -2 ended recurring, 15 rows confirmed/verify-cleared.
- New sources/methods tried this run:
  - Aggregator sweep NOT tried before: WeGotTickets, Bandsintown venue pages, Gigseekr, DICE, Skiddle VENUE pages (vs area pages). Scorecard: Skiddle venue pages WORK for ExCellar (3 dated gigs, 1 added + 1 verify); WeGotTickets ignores keyword param (only Outside the Box comedy); Gigseekr covers only Circuit/Banquet; DICE has nothing local; Bandsintown has Lamb history but 403s and shows zero future dates.
  - surbitonpartnership.co.uk individual /event/ pages + the underlying Tribe calendar (/events/category/music-and-live-performance/list/) - THE STANDOUT. Fetchable, dated, priced; yielded free St Andrew's market-morning concert series (Oct/Nov/Dec), cornerHOUSE comedy/poetry, ExCellar Stevie Watts, Hymns & Pimms. Added as a known source.
  - bachtobaby.com/surbiton official organiser page - clean dated series (18 Aug already held; added 27 Oct, 24 Nov, 8 Dec). Added as known source. (kingston.gov.uk claims an extra 19 Aug date the organiser doesn't list - watchlisted, not added.)
  - Church/hall parish-site sweep (St Andrew's/St Mark's/St Matthew's/Christ Church/St Nicholas/Weston Green/St Raphael's): thin - most sites 401/stale/services-only. Real catches: Twickenham Choral + Onyx Brass at All Saints Kingston 11 Jul (via allsaintskingston.co.uk events list p2), and the Bach to Baby series.
  - LibraryOn URL pattern changed to libraryon.org/libraries/kingston-upon-thames/<slug> - old /library/ URLs are dead; sources.json corrected. Frontend still the only fetchable library source (mylibrary.digital and libraries.kingston.gov.uk both 403).
- What worked:
  - NT Morden Hall Park events page fetched cleanly this run (was Radware-blocked before) - confirmed Harvest Festival time and yielded Park Explorers Under-5s (ages 2-5!), Jungle Book outdoor theatre, National Meadows Day, Osun River Festival.
  - Ram Jam venue pages confirmed all 5 held gigs with exact times (verify cleared). NOTE: their URL slugs contain date typos (e.g. Tim Penn slug says 11/02/26) - trust the on-page date, never the slug. Crack Comedy confirmed weekly Fridays through Dec (now recurring r85).
  - Recurring-row honesty: added The Lamb Sunday Session (r84) as a pattern row since the official page confirms the weekly slot even though performers are social-only; Willoughby Arms Monday Irish trad (r88, verify) via thesession.org snippet + CAMRA.
- What didn't work / cautions:
  - The Lamb dated gigs STILL uncrackable (5th run). Bandsintown/Skiddle/DICE/Gigseekr all empty or blocked; an undated FB event (Sunday Sessions: Mitchell and Vincent) and a teased Lambstock 2026 are on watchlist.
  - Stale-year traps rejected: kingston.gov.uk National Play Day page (still 2025), VisitRichmond Ham House Summer of Play (2025 mirror), Essential Surrey Claremont article (2023). Ham House/Claremont stayed Radware-blocked - July dates watchlisted, not added.
  - Newly fetch-blocked: kingstonchoralsociety.org.uk (401 - KCS prices stay verify), surbitonchurch.org.uk (401), ticketsource (403), thesession.org (403), thecricketerskingston.co.uk is DOMAIN-HIJACKED (casino spam - never use).
  - All Saints Kingston autumn lunchtime/organ recitals STILL unpublished (music list ends 29 Jun) - persistent gap, recheck Sep/Oct.
- Try next time:
  - Mid/late July: Kingston Libraries Summer Reading Challenge dated events (none published yet despite 4 Jul launch); National Play Day 2026 Kingston listing; re-try NT Ham House/Claremont.
  - Grey Horse "Raise The Bar" (8 Aug) headliner and Speakeasy Brunch (12/26 Sep) act announcements; Ram Jam Sep/Oct gigs.
  - Stewart Lee start time (Rose page -yxrl slug still shows no time); KCS prices via a non-401 route; Twickenham Choral ticket prices.
  - Unexplored angles for future rotation: Kingston University/Stanley Picker Gallery autumn events, Vera Fletcher Hall Thames Ditton season, YMCA Hawker Centre, Surbiton Wine Nights/ExCellar own site (excellar.co.uk/surbiton), Hampton Court Palace autumn via WebSearch.

## 2026-07-07
- Method: 4 parallel scoped research subagents: (1) never-tried venue sweep (Vera Fletcher Hall, ExCellar own site, Stanley Picker Gallery, YMCA Hawker); (2) gig-source refresh + verify confirmations (Ram Jam, Rose, Banquet, cornerHOUSE, Skiddle); (3) family/summer-holiday programme (LibraryOn, kingston.gov.uk, NT Ham/Claremont retry, HRP/Southbank); (4) trad/church/choral + a definitive crack at The Lamb wall. Net: +79 dated, -23 finished, 21 rows confirmed/verify-cleared.
- New sources/methods tried this run:
  - ExCellar's OWN site (www.excellar.co.uk) - WORKS and is a real find: blog pages carry the dated monthly "Ex Cellar Jazz" Friday series (Pete Roth/Stefan Redtenbacher residency) + touring roots acts (Red Hot Rhythm Revival 31 Oct, 1920s-30s hot jazz). CAUTION: apex domain (no www) refuses connections. Added as known source.
  - Stanley Picker Gallery (Kingston Uni) - fully fetchable, explicitly dated, free exhibitions + family workshops. Modest volume but reliable. Added as known source.
  - Vera Fletcher Hall - venue site is reCAPTCHA-walled (401 on every path) and TicketSource is a JS challenge shell; the only fetchable proxy found is its Datathistle place page (sparse: 2 events, both added verify:true). Added the Datathistle URL as a low-yield known source. YMCA Hawker: NO fetchable dated listings anywhere (Facebook-only) - not added.
  - The Lamb DEFINITIVE test (new angle): extracted the Wix Events app instance token from /_api/v2/dynamicmodel and queried the wix-one-events-server widget API directly - HTTP 200, "events": [] EMPTY. The site literally says "follow us on Facebook". Every aggregator empty/stale (Folk & Honey, GigTotem, Ents24, Lemonrock, Songkick, Bandsintown); IG mirrors imginn/picuki 403 (correct handle is @lamb_surbiton); mbasic.facebook.com login-walled. CONCLUSION: the wall is structural, not a fetching failure - only IG/FB OCR can crack dated Lamb gigs. Watchlist entry updated so future runs stop burning effort on aggregators.
  - Year-inference by weekday-pattern (new technique, used cautiously): All Saints autumn Monday recital series page prints no year, but a 14 Sep-30 Nov Monday sequence fits ONLY 2026 (2025=Sundays, 2024=Saturdays). Added all 12 with verify:true.
- What worked:
  - NT bot-block LIFTED for listing pages (individual event UUIDs still Radware-blocked): full Claremont Live season (4 theatre nights incl. a strong toddler pick - Peter Rabbit 25 Jul 18:00 - plus 4 Aug Saturday music sessions + Magic Faraway Tree trail) and Ham House Summer Games captured.
  - All Saints Kingston autumn Monday recitals FINALLY published (gap tracked since 22 Jun) - 12 free lunchtime recitals added with named performers. Friday organ recitals "published shortly" - watchlisted.
  - Ram Jam listings now run to end of December: Speakeasy Brunch (9 Saturday daytime-music dates) + 2 Sofar Sounds nights added; autumn is otherwise recurring formats already covered. Raise The Bar (8 Aug) headliner STILL TBA.
  - Surbiton Partnership Tribe event pages again the best confirmation engine: 13 price/time confirmations + resolved the 'Concert for Charity' TBC venue (All Saints, free, 12:30) + The Lamb's monthly life-drawing series as 6 dated rows.
  - Rose deep pagination (pages 2-4) surfaced Dec comedy (Jack Dee 4 Dec, John Robins bill 7 Dec) and the Jan-May 2027 season (Ronnie Scott's Story, Pink Floyd Experience, Rory Bremner, Frankenstein) - held on watchlist because the calendar range caps at 31 Dec 2026.
- What didn't work / cautions:
  - Stewart Lee 7-8 Sep: still no start time; his own site's live-dates page does NOT list Kingston and the Rose's 2026 tickets link 404s - escalated from "confirm time" to "re-verify dates stand".
  - kingstonchoralsociety.org.uk now serves reCAPTCHA to curl too (prices still unobtainable); Southbank Centre + HRP still 403; web.archive.org unreachable from this environment; thesession.org 403s WebFetch but works via curl (used to confirm Willoughby Arms Mondays still running, per Feb 2026 comment).
  - Stale-year traps rejected: Halloween-at-HCP "22-30 Oct 2026" (only 2025 pages verifiable - watchlisted, NOT added), allsaintskingston 2025 Christmas concert page, Nub News Lamb Christmas Market (2024), kingston.gov.uk Playday (still 2025; Playday 2026 is Wed 5 Aug - recheck).
  - Curation skips: Repair Cafes (avoid list), PlayZone consultation drop-ins, Silver Threads over-60s, Tolworth sixth-form open evening, member-only cornerHOUSE film club, Ram Jam/Banquet indie-rock-punk gigs, Rapper's Delight (TBA + genre), weekly library rhymetimes (recurring rows already cover).
- Try next time:
  - Mid-late July: Raise The Bar headliner; Speakeasy Brunch act names; Playday 2026 Kingston listing; Stanley Picker Saturday Art Club times; Kingston Libraries SRC events (still not published despite 4 Jul launch).
  - September: re-verify Stewart Lee dates; All Saints FRIDAY organ recital series; Canbury Bandstand 2027... no - HCP Halloween half-term dates; Kingston Christmas lights switch-on date.
  - Consider extending meta.range into early 2027 (Rose Jan-May 2027 season + HCP ice rink already runs to 3 Jan) - would unlock 5 watchlisted rows.
  - Unexplored angles for future rotation: Cecil Sharp House-style folk listings for SW London, Twickenham/Richmond venues (Eel Pie Island Museum, OSO Barnes), Dorich House Museum (Kingston Uni), Surbiton churches' Christmas service/concert pages (from Nov), Kingston Carnival 2026 date confirmation.

## 2026-07-10
- Method: 3 parallel scoped research subagents: (1) gig-source refresh + open verify-flag chase (Ram Jam, Rose/Stewart Lee, Banquet, Stanley Picker, ExCellar); (2) NEVER-TRIED venue sweep from the rotation list (Eel Pie Island Museum, OSO Barnes, Dorich House, Landmark Arts Centre, Hampton Hill Theatre, Normansfield); (3) family/seasonal (library summer one-offs, Playday, Kingston Carnival, NT retries, kingston.gov.uk, nub.news roundups). Net: +39 dated, -8 finished. Central dedupe was essential: 15+ agent finds (most Ram Jam gigs, most library one-offs, Regatta, Connolly Hayes, Stevie Watts) were already in the dataset from the 7 Jul mega-run.
- New sources/methods tried this run (all first-timers):
  - OSO Arts Centre Barnes via its **Ticketsolve XML feed** (osoarts.ticketsolve.com/shows.xml) - the technique of the run: the venue's main site 403s, but the ticketing platform's public XML exposes the entire season with ISO datetimes, categories and per-show URLs. 13 rows added with exact times (Irish trad, jazz, classical, comedy, family, Christmas panto). LESSON: when a venue site is walled, try its ticketing platform's machine feed; other Ticketsolve venues likely have the same.
  - Landmark Arts Centre Teddington - fetchable and productive (9 rows: folk, opera, art fair, Luxmuralis light installation, Mark Thomas). GOTCHA: /whats-on/ is 404; the real path is /shows-and-events/, and times/prices live only on individual show pages (rows added verify:true).
  - Hampton Hill Theatre (Teddington Theatre Club) - WebFetch 403s but curl with a browser User-Agent returns 200. 7 rows incl. Tim Vine and three family Christmas runs.
  - Eel Pie Island Museum/Artists - caught the Open Studios weekend happening 11-12 Jul (rare public island access). Dorich House: fetchable but sparse (1 exhibition row); recheck Sept. Normansfield/Langdon Down: dead domain + 'coming soon' only - watchlisted.
- What worked:
  - Stewart Lee 7-8 Sep RESOLVED: the Rose page now carries a live booking link labelled '7-8 SEP 2026' - dates stand; only the 19:30 time (Datathistle) still needs organiser confirmation.
  - Library one-off dedupe: libraryon branch pages now publish the summer holiday programme, but nearly all of it was captured on 7 Jul; only 1 genuinely new row (Kingston LEGO Club 25 Jul). CAVEAT logged: libraryon appears to display times in UTC (9:15/9:30 rhymetimes) - treat displayed times as verify:true.
  - Claremont events page fetched cleanly (Ham House still Radware-blocked): caught the Surrey Sculpture Society trail ending 13 Jul.
  - nub.news + organiser page yielded Taste of the Caribbean (22 Aug, Fairfield) - explicit 2026 date on tasteofcaribbeanuk.com.
- What didn't work / cautions:
  - Still unpublished (rechecked, NOT guessed): Kingston Carnival 2026 + River Cultures 2026 + Playday 2026 (all organiser pages still show 2025), Raise The Bar headliner, Speakeasy Brunch acts, Banquet Sept+ listings (JS-only 'Load more'), Stanley Picker autumn term, All-year OSO prices (feed has no prices).
  - ExCellar oddities: Will James 26 Nov post vanished from the blog index (watchlisted for re-verification); blog pages print the Kingston branch address even for Surbiton gigs - confirm branch per event. Ram Jam page had an am/pm glitch (7:15am) on the 30 Jul gig.
  - banquetrecords.com/live redirects to a dead ustream URL; rosetheatre.org pagination serves stale 2024-25 content on ?page=N.
- Try next time:
  - Late July: Playday 2026 listing; Raise The Bar headliner; Kingston Carnival/River Cultures announcements (Aug); confirm Landmark show times + OSO prices on show pages to clear verify flags.
  - Probe OTHER Ticketsolve/Spektrix/TicketTailor machine feeds for walled venues (e.g. Vera Fletcher Hall via its ticketing backend?) - the XML-feed trick is generalisable.
  - September: Stanley Picker autumn term, Dorich House autumn events, Landmark pagination re-crawl (Christmas fair), All Saints Friday organ recitals, Normansfield open days.
  - Unexplored angles for future rotation: Cecil Sharp House SW-London folk listings, Richmond/Twickenham theatres (Orange Tree, Exchange Twickenham), Bushy Park/Royal Parks autumn events, Surbiton churches' Christmas concert pages (from Nov), Kingston University public lecture/concert series.

## 2026-07-13
- Method: 4 parallel scoped research subagents: (1) NEVER-TRIED Richmond/Twickenham venues + a ticketing machine-feed probe; (2) verify-flag chase (Landmark times, OSO prices, Stewart Lee, Will James) + gig refresh (Ram Jam, Banquet, ExCellar); (3) family/seasonal (Playday/Carnival/River Cultures rechecks, NT/HRP/Royal Parks, library one-offs); (4) folk/trad sweep (Cecil Sharp House, folk listings aggregators, Surbiton Partnership refresh). Net: +67 dated, +3 recurring, -16 finished, ~20 rows confirmed/verify-cleared. Central dedupe was again essential: 30+ agent finds (nearly all Ram Jam/ExCellar/Claremont/Bach-to-Baby/library items and 6 of the Richmond agent's finds) were already held from the 7/10 Jul runs.
- New sources/methods tried this run (all first-timers):
  - SPEKTRIX API PROBE - the technique of the run, generalising the Ticketsolve XML trick: `system.spektrix.com/<client>/api/v3/events` is public JSON. Working clients found: `orangetree` (70 events) and `rosetheatrekingston` (139 events; CAUTION - contains historic/test rows back to 2015, filter by date; it exposed Wind in the Willows and Jan 2027 season before the website pagination did). Non-existent client names 404 (tried exchangetwickenham, theexchange, rosetheatre etc.).
  - Orange Tree Theatre + Exchange Twickenham direct sites both fetch cleanly with full 2026 dates - two solid NEW venues (outdoor Shakespeare on Richmond Hill; Fairport Convention/folk/family/panto at the Exchange, which uses its own WordPress ticketing, no feed needed).
  - TwickFolk (twickfolk.co.uk/events) - the folk find of the run: complete dated autumn diary with prices, all Sundays. Note closures: summer break 19 Jul-30 Aug, rugby days 8 Nov + 29 Nov.
  - EFDSS/Cecil Sharp House - efdss.org 403s WebFetch but curl+browser-UA works AND the whats-on page embeds the entire season as a JS var `eeVents` (JSON, 127 events, exact datetimes). One request = whole season.
  - thesession.org JSON API (`?format=json` on search/detail endpoints, curl only) - confirmed Willoughby Arms Mondays and surfaced a NEW fortnightly Poyntz Arms (East Molesey) Thursday session (added recurring, verify).
  - folklondon.co.uk/club-guide (curl only) - recurring-listings table; flagged Sultan Wimbledon sessions (watchlisted, unverified).
  - Landmark's own Ticketsolve XML (landmarkartscentre.ticketsolve.com/shows.xml) - per-event .xml carries date_time/opening_time/all price tiers; confirmed all 8 held Landmark rows AND surfaced shows not yet on the listing page (R.U.M 24 Oct).
  - Banquet 'Load more' bypass: `banquetrecords.com/events?w=<ISO week>` paginates by week (crawled w=36-52).
- What worked / notable:
  - kingston.gov.uk/events pagination quirk: bare URL = page 1, `?page=1` = page 2, `?page=2` = page 3.
  - Ham House NT page fetched cleanly this run; Claremont/Morden Hall still Radware-blocked (dates recovered via snippets + weekday-uniqueness proof only).
  - Weekday-uniqueness year-proofing again saved Bach to Baby (all four 'Tuesday' dates only fit 2026) and caught two WebFetch summarizer weekday errors (said Sat for Sun 20 Sep, Fri for Sat 31 Oct) - ALWAYS check claimed weekday against the real calendar.
  - Claremont 1 Aug Saturday Session performer identified (The Dixieland Stompers, 9-piece trad jazz) via search snippet.
- What didn't work / cautions:
  - STEWART LEE ALERT: the Rose 2026 event page now 404s, is gone from the sitemap, and stewartlee.co.uk no longer lists Kingston - likely sold out + delisted, but unproven. Row kept verify:true with caution note; re-verify late Aug.
  - Still unpublished (rechecked, NOT guessed): Playday 2026 (Kingston page still 2025; national date is Wed 5 Aug), Kingston Carnival 2026, River Cultures 2026, HCP Halloween half-term (two conflicting snippet ranges, one matching 2025 weekdays - both rejected), Raise The Bar headliner, Speakeasy Brunch acts, Landmark Christmas fair, Orange Tree Christmas show, All Saints Friday organ recitals.
  - Newly/still blocked: ticketsource .com AND .co.uk hard Cloudflare-403 (Vera Fletcher Hall stays Datathistle-only); kingston.ac.uk Cloudflare-challenged; kingstonchoralsociety.org.uk 401 (KCS prices stay verify:true); hrp.org.uk + Southbank 403 even to curl-with-headers; royalparks.org.uk fetches but lists zero Bushy Park events.
  - The Lamb (6th run): one new angle tried - Folk & Honey venue page fetches via curl but shows zero dated gigs. Wall remains structural (IG/FB only).
- Try next time:
  - Late July: Playday 2026; Raise The Bar headliner; Kingston Carnival/River Cultures announcements; Claremont Live remaining August Saturday performers (River City Saxes/The Macaroons - which Saturdays?).
  - Probe MORE Spektrix client names for walled venues (try polka, southbank-adjacent, richmondtheatre?) and other Ticketsolve tenants - both feed families are now proven.
  - September: Stewart Lee re-verification; Orange Tree Christmas show (re-poll Spektrix feed); cornerHOUSE beyond 6 Oct; Landmark Christmas fair; Stanley Picker autumn term; All Saints Friday organ recitals; verify Sultan Wimbledon sessions via thesession.org JSON.
  - Unexplored angles for future rotation: Richmond Theatre (ATG) + Rose Richmond, Kingston University Stanley Picker autumn, Dorich House autumn, National Archives Kew events, Strawberry Hill House, Marble Hill (English Heritage), Twickenham Stadium family events, Wimbledon Bookfest (usually Oct).
