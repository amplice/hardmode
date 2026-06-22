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
