    const CALENDAR_DATA = window.CALENDAR_DATA || { events: [], recurring: [], sources: [], watchlist: [] };
    const EVENTS = CALENDAR_DATA.events || [];
    const RECURRING = CALENDAR_DATA.recurring || [];
    const SOURCES = CALENDAR_DATA.sources || [];
    const WATCHLIST = CALENDAR_DATA.watchlist || [];
    const LATEST_CHANGES = CALENDAR_DATA.latestChanges || null;
    const RANGE_END = '2026-12-31';
    const DATA_START = '2026-06-08';
    const TODAY = clampIso(londonToday(), DATA_START, RANGE_END);
    const RANGE_START = TODAY;
    const STORAGE_KEY = 'surbiton-calendar-state-v4';
    const FAVORITES_KEY = 'surbiton-calendar-favorites-v1';
    const HIDDEN_KEY = 'surbiton-calendar-hidden-v1';
    const FEEDBACK_KEY = 'surbiton-calendar-feedback-v1';
    const URL_STATE_KEYS = ['view', 'q', 'datePreset', 'quick', 'area', 'category', 'tier', 'type', 'cost', 'status', 'source', 'quality', 'sort', 'from', 'to', 'compact', 'ongoingDaily'];
    const BANK_HOLIDAYS = new Set(['2026-08-31', '2026-12-25', '2026-12-28']);

    const defaultState = {
      view: 'best',
      q: '',
      datePreset: 'upcoming',
      quick: '',
      area: '',
      category: '',
      tier: '',
      type: '',
      cost: '',
      status: '',
      source: '',
      quality: '',
      sort: 'dateAsc',
      from: '',
      to: '',
      compact: false,
      ongoingDaily: false
    };

    const state = { ...defaultState };
    const personal = {
      favorites: new Set(),
      hidden: new Set(),
      feedback: []
    };
    let pendingFeedbackId = null;

    const el = (id) => document.getElementById(id);
    const esc = (value) => String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

    const normalize = (value) => String(value ?? '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '');

    const pad = (n) => String(n).padStart(2, '0');

    function londonToday() {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/London',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
    }

    function clampIso(value, min, max) {
      if (value < min) return min;
      if (value > max) return max;
      return value;
    }

    function addDays(iso, days) {
      const d = parseIso(iso);
      d.setDate(d.getDate() + days);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }

    function parseIso(iso) {
      if (!iso) return null;
      const [y, m, d] = iso.split('-').map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    }

    function fmtDate(iso, compact = false) {
      const d = parseIso(iso);
      if (!d) return iso || '';
      return new Intl.DateTimeFormat('en-GB', {
        weekday: compact ? 'short' : 'long',
        day: 'numeric',
        month: compact ? 'short' : 'long',
        year: 'numeric'
      }).format(d);
    }

    function fmtDateShort(iso) {
      const d = parseIso(iso);
      if (!d) return iso || '';
      return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
    }

    function nextWeekendRange() {
      const d = parseIso(TODAY);
      const daysUntilSaturday = (6 - d.getDay() + 7) % 7;
      const from = addDays(TODAY, daysUntilSaturday);
      const to = addDays(from, 1);
      return { from, to, label: `${fmtDateShort(from)}-${fmtDateShort(to)}` };
    }

    function dateSpan(item) {
      if (item.endDate && item.endDate !== item.date) return `${fmtDateShort(item.date)} – ${fmtDateShort(item.endDate)}`;
      return fmtDateShort(item.date);
    }

    function endDate(item) {
      return item.endDate || item.date;
    }

    function daysUntil(iso) {
      const target = parseIso(iso);
      const today = parseIso(TODAY);
      if (!target || !today) return 999;
      return Math.round((target - today) / 86400000);
    }

    function activeInRange(item, from, to) {
      if (!item.date) return true;
      return endDate(item) >= from && item.date <= to;
    }

    function activeOnDay(item, iso) {
      if (!item.date) return false;
      return item.date <= iso && endDate(item) >= iso;
    }

    function eventHaystack(e) {
      return normalize([
        e.searchText,
        e.title,
        e.venue,
        e.area,
        e.category,
        e.type,
        e.cost,
        e.tier,
        e.description,
        e.source,
        e.confidence
      ].filter(Boolean).join(' '));
    }

    function isFreeEvent(e) {
      return /(^|[^a-z])free([^a-z]|$)/.test(eventHaystack(e)) || normalize(e.cost) === 'free';
    }

    function isMusicEvent(e) {
      return /(music|concert|choir|choral|jazz|band|gig|open mic|singalong|singers|folk|trad|irish|bandstand|recital|theatre|comedy|performance|dance|shakespeare|opera|acoustic)/.test(eventHaystack(e));
    }

    function isFamilyEvent(e) {
      return /(kid|kids|child|children|family|toddler|baby|under-5|under 5|rhyme|story|play|school|pta|lego|junior|youth|relaxed|sensory)/.test(eventHaystack(e));
    }

    function isToddlerAgeFit(e) {
      const text = eventHaystack(e);
      if (/(lego robotics|yu-?gi-?oh|trading-card|trading card|coding club|robotics club)/.test(text)) return false;
      if (/(ages?\s*(6\+|7\+|8\+|10\+|8\s*-\s*12|6\s*-\s*12)|\b8\s*-\s*12\b|\b6\s*-\s*12\b)/.test(text)) return false;
      if (/(teen|14\+)/.test(text) && isFamilyEvent(e)) return false;
      if (/(6-18 months|6 to 18 months|under 18 months)/.test(text)) return false;
      return true;
    }

    function isOutdoorEvent(e) {
      return /(park|garden|outdoor|open air|bandstand|trail|river|thames|market|fair|festival|carnival|mural|street art|miniature railway)/.test(eventHaystack(e));
    }

    function isCoreEvent(e) {
      return /(core|surbiton|berrylands|tolworth)/.test(normalize(`${e.tier} ${e.area}`));
    }

    function isDaytimeEvent(e) {
      const timeText = String(e.time || '');
      if (/check|var(y|ies)|tbc|not stated|multiple performances/i.test(timeText)) return false;
      const start = parseClock(timeText) || parseClock(e.startTime);
      if (!start) return /all day|daytime|morning|afternoon/i.test(e.time || e.description || '');
      return start < '18:00';
    }

    function isWeekendOrBankHoliday(e) {
      if (!e.date) return false;
      if (BANK_HOLIDAYS.has(e.date)) return true;
      const d = parseIso(e.date);
      return d ? d.getDay() === 0 || d.getDay() === 6 : false;
    }

    function isWeekdayDaytimeEvent(e) {
      if (!e.date || !isDaytimeEvent(e)) return false;
      const d = parseIso(e.date);
      return d ? d.getDay() >= 1 && d.getDay() <= 5 && !BANK_HOLIDAYS.has(e.date) : false;
    }

    function isTheatreEvent(e) {
      return /(theatre|play|shakespeare|comedy|performance|dance|opera|musical|rose theatre|polka|national theatre|cornerhouse|landmark)/.test(eventHaystack(e));
    }

    function isFolkTradEvent(e) {
      return /(folk|trad|irish|scottish|ceilidh|ceili|cajun|zydeco|old-time|old time|honky|swing|jazz|bluegrass|skiffle|fiddle|session)/.test(eventHaystack(e));
    }

    function isEasyLocalEvent(e) {
      const text = eventHaystack(e);
      return isCoreEvent(e) || /(kingston|hampton court|molesey|thames ditton|long ditton|new malden|wimbledon|morden|waterloo|south bank|southbank)/.test(text);
    }

    function isDestinationEvent(e) {
      const text = eventHaystack(e);
      return /(outer|destination|high-value|high value|easy train|waterloo|south bank|southbank|wimbledon|morden|richmond|kew|national theatre|southbank centre|polka|hampton court)/.test(text) && !isCoreEvent(e);
    }

    function needsBooking(e) {
      return /(book|booking|ticket|tickets|pre-book|prebook|register|reservation|spaces limited|paid)/.test(eventHaystack(e));
    }

    function extractPrice(value) {
      const match = String(value || '').replace(/GBP/ig, '£').match(/(?:£|gbp\s*)(\d+(?:\.\d{1,2})?)/i);
      return match ? Number(match[1]) : null;
    }

    function travelBucket(e) {
      const text = eventHaystack(e);
      if (isCoreEvent(e)) return 'Walkable / very local';
      if (/kingston|thames ditton|long ditton|hampton court|molesey|wimbledon|morden/.test(text)) return 'Easy local trip';
      if (/waterloo|south bank|southbank|london/.test(text)) return 'Easy by train';
      return e.tier || 'Check route';
    }

    function eventFacts(e) {
      const text = eventHaystack(e);
      const toddlerFriendly = isToddlerAgeFit(e) && (Boolean(e.toddlerFriendly) || /(toddler|baby|under-5|under 5|rhyme|story|sensory|soft play|0-5|0 to 5|ages? 0|ages? 2|ages? 3|family)/.test(text));
      const indoorOutdoor = e.indoorOutdoor || (isOutdoorEvent(e) ? 'Outdoor / open-air' : /theatre|library|museum|gallery|church|hall|pub|cafe|centre|indoor/.test(text) ? 'Indoor / venue-based' : '');
      return {
        ageRange: e.ageRange || (toddlerFriendly ? 'Useful for younger children / families' : isFamilyEvent(e) ? 'Family-friendly' : ''),
        bookingRequired: e.bookingRequired || (needsBooking(e) ? 'Check booking / tickets' : isFreeEvent(e) ? 'No ticket flagged' : ''),
        priceMin: e.priceMin ?? extractPrice(e.cost),
        indoorOutdoor,
        rainSafe: e.rainSafe ?? (indoorOutdoor.startsWith('Indoor') ? true : ''),
        toddlerFriendly,
        accessibility: e.accessibility || (/relaxed|accessible|wheelchair|sensory/.test(text) ? 'Accessibility-friendly wording in listing' : ''),
        travelBucket: e.travelBucket || travelBucket(e),
        sourceLastChecked: e.sourceLastChecked || CALENDAR_DATA.meta?.updated || '',
        mapQuery: e.mapQuery || [e.venue, e.area, 'UK'].filter(Boolean).join(', ')
      };
    }

    function eventScore(e) {
      let score = 0;
      const soon = daysUntil(e.date);
      if (soon >= 0 && soon <= 7) score += 2;
      else if (soon <= 21) score += 1;
      if (isCoreEvent(e)) score += 2;
      if (isFamilyEvent(e)) score += 2;
      if (isMusicEvent(e)) score += 2;
      if (isOutdoorEvent(e)) score += 1;
      if (isFreeEvent(e)) score += 1;
      if (isDaytimeEvent(e)) score += 1;
      if (normalize(e.confidence).startsWith('high')) score += 1;
      if (e.verify) score -= 2;
      if (e.pastArchive) score -= 5;
      return score;
    }

    function daySpan(e) {
      if (!e.date || !e.endDate || e.endDate === e.date) return 1;
      const start = parseIso(e.date);
      const end = parseIso(e.endDate);
      if (!start || !end) return 1;
      return Math.max(1, Math.round((end - start) / 86400000) + 1);
    }

    function isLongRun(e) {
      return daySpan(e) > 7;
    }

    function comparePlannerItems(a, b) {
      const aLong = isLongRun(a) ? 1 : 0;
      const bLong = isLongRun(b) ? 1 : 0;
      if (aLong !== bLong) return aLong - bLong;
      return (a.sortKey || '').localeCompare(b.sortKey || '') || eventScore(b) - eventScore(a);
    }

    function isBestBet(e) {
      if (!isToddlerAgeFit(e) && isFamilyEvent(e)) return false;
      return eventScore(e) >= 5 || Boolean(e.toddlerFriendly) || (isCoreEvent(e) && (isFreeEvent(e) || isMusicEvent(e) || isFamilyEvent(e)));
    }

    function isFavorite(id) {
      return personal.favorites.has(id);
    }

    function isHidden(id) {
      return personal.hidden.has(id);
    }

    function feedbackFor(id) {
      return personal.feedback.find(item => item.id === id && item.action === 'exclude') || null;
    }

    function isRejected(id) {
      return Boolean(feedbackFor(id));
    }

    function positiveFeedbackFor(id) {
      return personal.feedback.find(item => item.id === id && item.action === 'include') || null;
    }

    function rowFeedbackObject(event, action, note = '') {
      return {
        action,
        id: event.id,
        title: event.title || '',
        venue: event.venue || '',
        area: event.area || '',
        category: event.category || '',
        type: event.type || '',
        tier: event.tier || '',
        date: event.date || '',
        source: event.source || '',
        url: event.url || '',
        note,
        createdAt: new Date().toISOString()
      };
    }

    function persistPersonal() {
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify([...personal.favorites]));
        localStorage.setItem(HIDDEN_KEY, JSON.stringify([...personal.hidden]));
        localStorage.setItem(FEEDBACK_KEY, JSON.stringify(personal.feedback));
      } catch (e) {}
    }

    function toggleFavorite(id) {
      if (personal.favorites.has(id)) personal.favorites.delete(id);
      else personal.favorites.add(id);
      persistPersonal();
      render();
      toast(personal.favorites.has(id) ? 'Added to favourites' : 'Removed from favourites');
    }

    function toggleHidden(id) {
      if (personal.hidden.has(id)) personal.hidden.delete(id);
      else personal.hidden.add(id);
      persistPersonal();
      render();
      toast(personal.hidden.has(id) ? 'Hidden from normal views' : 'Restored');
    }

    function openFeedback(id) {
      const event = EVENTS.find(item => item.id === id);
      if (!event) return;
      pendingFeedbackId = id;
      const existing = feedbackFor(id);
      el('feedbackSubtitle').textContent = `${event.title}${event.venue ? ' - ' + event.venue : ''}`;
      el('feedbackNote').value = existing?.note || '';
      el('feedbackDialog').showModal();
      el('feedbackNote').focus();
    }

    function saveFeedbackNote() {
      const event = EVENTS.find(item => item.id === pendingFeedbackId);
      if (!event) return;
      const note = el('feedbackNote').value.trim();
      personal.feedback = personal.feedback.filter(item => item.id !== event.id);
      personal.feedback.unshift(rowFeedbackObject(event, 'exclude', note));
      personal.hidden.add(event.id);
      pendingFeedbackId = null;
      persistPersonal();
      render();
      toast('Saved as not for us');
    }

    function savePositiveFeedback(id) {
      const event = EVENTS.find(item => item.id === id);
      if (!event) return;
      personal.feedback = personal.feedback.filter(item => !(item.id === event.id && item.action === 'include'));
      personal.feedback.unshift(rowFeedbackObject(event, 'include', 'More like this'));
      persistPersonal();
      render();
      toast('Saved: more like this');
    }

    function removeFeedback(id) {
      personal.feedback = personal.feedback.filter(item => item.id !== id);
      personal.hidden.delete(id);
      persistPersonal();
      render();
      toast('Feedback removed');
    }

    function feedbackPayload() {
      return {
        updated: new Date().toISOString(),
        calendarFeedback: personal.feedback,
        gigFeedback: []
      };
    }

    function downloadJson(value, filename) {
      const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    function exportFeedback() {
      downloadJson(feedbackPayload(), 'user-feedback.json');
      toast('Feedback file exported');
    }

    function clearHiddenRows() {
      personal.hidden.clear();
      persistPersonal();
      if (state.quick === 'hidden') state.quick = '';
      syncControls();
      render();
      toast('Hidden rows restored');
    }

    function mapLink(e, label = 'Map') {
      const facts = eventFacts(e);
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(facts.mapQuery)}`;
      return `<a class="btn small" href="${esc(url)}" target="_blank" rel="noreferrer">${esc(label)}</a>`;
    }

    function getRange() {
      if (state.datePreset === 'upcoming') return { from: TODAY, to: RANGE_END, label: `upcoming from ${fmtDateShort(TODAY)}` };
      if (state.datePreset === 'today') return { from: TODAY, to: TODAY, label: 'today' };
      if (state.datePreset === 'tomorrow') {
        const tomorrow = addDays(TODAY, 1);
        return { from: tomorrow, to: tomorrow, label: 'tomorrow' };
      }
      if (state.datePreset === 'next7') return { from: TODAY, to: addDays(TODAY, 6), label: 'next 7 days' };
      if (state.datePreset === 'may') return { from: RANGE_START, to: RANGE_END, label: `from ${fmtDateShort(RANGE_START)}` };
      if (state.datePreset === 'june') return { from: clampIso('2026-06-01', RANGE_START, RANGE_END), to: '2026-06-30', label: 'June 2026' };
      if (state.datePreset === 'summer') return { from: '2026-07-01', to: '2026-08-31', label: 'July-August 2026' };
      if (state.datePreset === 'autumn') return { from: '2026-09-01', to: '2026-11-30', label: 'September-November 2026' };
      if (state.datePreset === 'december') return { from: '2026-12-01', to: '2026-12-31', label: 'December 2026' };
      if (state.datePreset === 'weekend') return nextWeekendRange();
      if (state.datePreset === 'custom') {
        const from = state.from || RANGE_START;
        const to = state.to || RANGE_END;
        return { from, to, label: `${from} to ${to}` };
      }
      return { from: RANGE_START, to: RANGE_END, label: `${fmtDateShort(RANGE_START)}-31 Dec 2026` };
    }

    function uniqueValues(field, includeRecurring = false) {
      const values = new Set();
      EVENTS.forEach(e => { if (e[field]) values.add(e[field]); });
      if (includeRecurring) {
        RECURRING.forEach(r => { if (r[field]) values.add(r[field]); });
      }
      return [...values].sort((a,b) => a.localeCompare(b, 'en-GB', { sensitivity: 'base' }));
    }

    function fillSelect(id, values, label, blankLabel = null) {
      const select = el(id);
      const current = select.value;
      select.innerHTML = `<option value="">${esc(label)}</option>` + values.map(v => {
        const value = v === '' ? '__blank__' : v;
        const text = v === '' ? (blankLabel || '(blank / not stated)') : v;
        return `<option value="${esc(value)}">${esc(text)}</option>`;
      }).join('');
      if ([...select.options].some(o => o.value === current)) select.value = current;
    }

    function initFilters() {
      fillSelect('areaFilter', uniqueValues('area', true), 'All areas');
      fillSelect('categoryFilter', uniqueValues('category', true), 'All categories');
      fillSelect('tierFilter', uniqueValues('tier'), 'All nearness tiers');
      fillSelect('typeFilter', uniqueValues('type'), 'All types');
      const costs = uniqueValues('cost').filter(v => v);
      fillSelect('costFilter', costs, 'All costs');
      fillSelect('statusFilter', uniqueValues('status'), 'All statuses');
      fillSelect('sourceFilter', uniqueValues('source', true), 'All sources');
    }

    function matchesMode(e, mode) {
      const previous = state.quick;
      state.quick = mode;
      const result = matchesThemeEvent(e);
      state.quick = previous;
      return result;
    }

    function matchesThemeEvent(e) {
      if (!state.quick) return true;
      const h = eventHaystack(e);
      const cat = normalize(e.category + ' ' + e.type + ' ' + e.title + ' ' + e.venue + ' ' + e.description);
      const musicFields = normalize(e.category + ' ' + e.type + ' ' + e.title + ' ' + e.venue);
      const isMusic = /(music|concert|choir|choral|jazz|band|gig|open mic|singalong|singers|folk|trad|irish|bandstand|recital)/.test(musicFields);
      const isDaytime = isDaytimeEvent(e);
      const isFree = /(^|[^a-z])free([^a-z]|$)/.test(h) || normalize(e.cost) === 'free';
      if (state.quick === 'best') return isBestBet(e);
      if (state.quick === 'favorites') return isFavorite(e.id);
      if (state.quick === 'hidden') return isHidden(e.id) || isRejected(e.id);
      if (state.quick === 'nannyWeekday') return isToddlerAgeFit(e) && isWeekdayDaytimeEvent(e) && isEasyLocalEvent(e) && /(kid|kids|child|children|family|toddler|baby|under-5|under 5|rhyme|story|craft|play|sensory|duplo|puppet|polka|library|trail|nature|rewilding|miniature railway|soft play)/.test(h);
      if (state.quick === 'familyWeekend') return isToddlerAgeFit(e) && isWeekendOrBankHoliday(e) && (isFamilyEvent(e) || isOutdoorEvent(e) || (isMusicEvent(e) && isDaytime) || /festival|fair|market|railway|hampton court/.test(cat));
      if (state.quick === 'dateNight') return !isFamilyEvent(e) && !isWeekdayDaytimeEvent(e) && (isMusicEvent(e) || isTheatreEvent(e) || isFolkTradEvent(e));
      if (state.quick === 'easyLocal') return isEasyLocalEvent(e);
      if (state.quick === 'destination') return isDestinationEvent(e) && isToddlerAgeFit(e) && (isFamilyEvent(e) || isMusicEvent(e) || isTheatreEvent(e) || isOutdoorEvent(e) || isBestBet(e));
      if (state.quick === 'daytimeMusic') return isMusic && (isDaytime || isFree);
      if (state.quick === 'music') return /(music|concert|choir|choral|jazz|band|gig|open mic|sing|singers|theatre|comedy|performance|dance|shakespeare|opera|acoustic|dj|club night|ram jam|bandstand)/.test(cat);
      if (state.quick === 'parks') return /(park|parks|garden|gardens|bandstand|recreation ground|open air|outdoor|green|common|meadow|river|thames|canbury|claremont|fairfield|richmond|hampton court|chestnut|miniature railway|carnival|walk)/.test(cat);
      if (state.quick === 'churches') return /(church|saint|st\.|st |all saints|st mark|st andrew|chapel|hall|community space|community centre|centre|village hall|queen mary hall|vera fletcher|vital village|mercer close|hook centre|library)/.test(cat);
      if (state.quick === 'markets') return /(market|farmers|fair|fete|festival|carnival|open studios|craft|bazaar|food festival|summer fair|open day)/.test(cat);
      if (state.quick === 'kids') return isToddlerAgeFit(e) && /(kid|kids|child|children|family|toddler|baby|stay ?& ?play|sensory|school|pta|summer fair|story)/.test(cat);
      if (state.quick === 'clubs') return /(club|class|weekly|monthly|quiz|bridge|dance|yoga|karate|running|ramblers|stitch|society|meet|open mic|dungeons|board game|workshop)/.test(cat);
      if (state.quick === 'free') return /(^|[^a-z])free([^a-z]|$)/.test(h) || normalize(e.cost) === 'free';
      if (state.quick === 'verify') return e.verify;
      return true;
    }

    function matchesThemeRecurring(r) {
      if (!state.quick) return true;
      const h = normalize(r.searchText);
      if (['best', 'favorites', 'hidden', 'nannyWeekday', 'familyWeekend', 'dateNight', 'easyLocal', 'destination'].includes(state.quick)) return false;
      if (state.quick === 'daytimeMusic') {
        const isMusic = /(music|concert|choir|choral|jazz|band|open mic|singalong|singers|folk|trad|irish|bandstand|recital)/.test(h);
        const isDaytime = /\b(0?[8-9]|1[0-7])[:.][0-5][0-9]\b/.test(h);
        const isFree = /(^|[^a-z])free([^a-z]|$)/.test(h);
        return isMusic && (isDaytime || isFree);
      }
      if (state.quick === 'music') return /(music|concert|choir|jazz|band|open mic|sing|dance|performance|ram jam|bandstand)/.test(h);
      if (state.quick === 'parks') return /(park|garden|bandstand|outdoor|thames|ramblers|walk|miniature railway)/.test(h);
      if (state.quick === 'churches') return /(church|hall|community|centre|village|library|vital village|vera fletcher|st mark|st george|all saints)/.test(h);
      if (state.quick === 'markets') return /(market|fair|fete|festival|carnival|school)/.test(h);
      if (state.quick === 'kids') return /(kid|child|family|toddler|baby|sensory|school|pta|youth)/.test(h);
      if (state.quick === 'clubs') return true;
      if (state.quick === 'free') return /(^|[^a-z])free([^a-z]|$)/.test(h);
      if (state.quick === 'verify') return r.verify;
      return true;
    }

    function matchesQuality(e) {
      const c = normalize(e.confidence);
      if (!state.quality) return true;
      if (state.quality === 'high') return c.startsWith('high') && !e.verify;
      if (state.quality === 'verify') return e.verify;
      if (state.quality === 'archive') return e.pastArchive;
      return true;
    }

    function matchesQualityRecurring(r) {
      const c = normalize(r.confidence);
      if (!state.quality) return true;
      if (state.quality === 'high') return c.startsWith('high') && !r.verify;
      if (state.quality === 'verify') return r.verify;
      if (state.quality === 'archive') return false;
      return true;
    }

    function filteredEvents(options = {}) {
      const range = getRange();
      const q = normalize(state.q.trim());
      let rows = EVENTS.filter(e => {
        if (!activeInRange(e, range.from, range.to)) return false;
        if (state.quick !== 'hidden' && (isHidden(e.id) || isRejected(e.id))) return false;
        if (state.quick === 'hidden' && !isHidden(e.id) && !isRejected(e.id)) return false;
        if (q && !eventHaystack(e).includes(q)) return false;
        if (state.area && e.area !== state.area) return false;
        if (state.category && e.category !== state.category) return false;
        if (state.tier && e.tier !== state.tier) return false;
        if (state.type && e.type !== state.type) return false;
        if (state.cost && e.cost !== state.cost) return false;
        if (state.status && e.status !== state.status) return false;
        if (state.source && e.source !== state.source) return false;
        if (!matchesQuality(e)) return false;
        if (!options.ignoreQuick && !matchesThemeEvent(e)) return false;
        return true;
      });
      return sortEvents(rows);
    }

    function filteredRecurring() {
      const q = normalize(state.q.trim());
      return RECURRING.filter(r => {
        if (q && !normalize(r.searchText).includes(q)) return false;
        if (state.area && r.area !== state.area) return false;
        if (state.category && r.category !== state.category) return false;
        if (state.source && r.source !== state.source) return false;
        if (!matchesQualityRecurring(r)) return false;
        if (!matchesThemeRecurring(r)) return false;
        return true;
      }).sort((a,b) => {
        if (state.sort === 'venue') return (a.venue || '').localeCompare(b.venue || '', 'en-GB');
        if (state.sort === 'area') return (a.area || '').localeCompare(b.area || '', 'en-GB');
        if (state.sort === 'category') return (a.category || '').localeCompare(b.category || '', 'en-GB');
        return (a.name || '').localeCompare(b.name || '', 'en-GB');
      });
    }

    function sortEvents(rows) {
      const copy = [...rows];
      const cmpText = (field) => (a,b) => (a[field] || '').localeCompare(b[field] || '', 'en-GB', { sensitivity: 'base' });
      if (state.sort === 'dateDesc') copy.sort((a,b) => (b.sortKey || '').localeCompare(a.sortKey || ''));
      else if (state.sort === 'title') copy.sort(cmpText('title'));
      else if (state.sort === 'venue') copy.sort(cmpText('venue'));
      else if (state.sort === 'area') copy.sort(cmpText('area'));
      else if (state.sort === 'category') copy.sort(cmpText('category'));
      else copy.sort((a,b) => (a.sortKey || '').localeCompare(b.sortKey || ''));
      return copy;
    }

    function eventBadges(e) {
      const badges = [];
      const facts = eventFacts(e);
      if (e.time) badges.push(`<span class="badge">${esc(e.time)}</span>`);
      if (e.area) badges.push(`<span class="badge">${esc(e.area)}</span>`);
      if (e.tier) {
        const cls = normalize(e.tier).includes('core') ? 'core' : normalize(e.tier).includes('nearby') ? 'nearby' : 'wider';
        badges.push(`<span class="badge ${cls}">${esc(e.tier)}</span>`);
      }
      if (e.category) badges.push(`<span class="badge">${esc(e.category)}</span>`);
      if (e.type) badges.push(`<span class="badge">${esc(e.type)}</span>`);
      if (e.cost) badges.push(`<span class="badge ${normalize(e.cost).includes('free') ? 'free' : ''}">${esc(e.cost)}</span>`);
      if (facts.toddlerFriendly) badges.push('<span class="badge family">young-kid useful</span>');
      if (facts.indoorOutdoor) badges.push(`<span class="badge">${esc(facts.indoorOutdoor)}</span>`);
      if (e.verify) badges.push(`<span class="badge verify">verify</span>`);
      if (e.pastArchive) badges.push(`<span class="badge archive">archive</span>`);
      return badges.join('');
    }

    function recBadges(r) {
      const badges = [];
      if (r.area) badges.push(`<span class="badge">${esc(r.area)}</span>`);
      if (r.category) badges.push(`<span class="badge">${esc(r.category)}</span>`);
      if (r.verify) badges.push(`<span class="badge verify">verify</span>`);
      return badges.join('');
    }

    function sourceLink(label, url) {
      if (!url) return esc(label || 'Source');
      return `<a class="source-link" href="${esc(url)}" target="_blank" rel="noreferrer">${esc(label || 'Source')}</a>`;
    }

    function addCalendarButton(e, label = '+ Cal') {
      return `<button class="btn small" type="button" data-add-event="${esc(e.id)}">${esc(label)}</button>`;
    }

    function googleCalendarButton(e, label = 'Google') {
      return `<button class="btn small" type="button" data-google-event="${esc(e.id)}">${esc(label)}</button>`;
    }

    function personalButtons(e) {
      const favLabel = isFavorite(e.id) ? 'Unstar' : 'Star';
      const hideLabel = isHidden(e.id) ? 'Restore' : 'Hide';
      const rejected = isRejected(e.id);
      const liked = positiveFeedbackFor(e.id);
      return `
        <button class="btn small icon-btn ${isFavorite(e.id) ? 'active' : ''}" type="button" data-favorite-event="${esc(e.id)}" aria-pressed="${isFavorite(e.id)}">${favLabel}</button>
        <button class="btn small good ${liked ? 'active' : ''}" type="button" data-like-event="${esc(e.id)}">${liked ? 'More like this saved' : 'More like this'}</button>
        <button class="btn small icon-btn" type="button" data-hide-event="${esc(e.id)}">${hideLabel}</button>
        <button class="btn small ${rejected ? 'danger active' : 'danger'}" type="button" data-reject-event="${esc(e.id)}">${rejected ? 'Edit skip' : 'Not for us'}</button>
      `;
    }

    function eventCard(e) {
      const feedback = feedbackFor(e.id);
      return `
        <article class="event-card ${e.verify ? 'verify-border' : ''} ${e.pastArchive ? 'archive-border' : ''} ${isFavorite(e.id) ? 'favorite-border' : ''} ${(isHidden(e.id) || feedback) ? 'hidden-border' : ''}">
          <button class="event-title" type="button" data-open-event="${esc(e.id)}">${esc(e.title)}</button>
          <div class="meta">${esc(dateSpan(e))}${e.venue ? ` · ${esc(e.venue)}` : ''}</div>
          <div class="badges">${eventBadges(e)}</div>
          ${e.description ? `<div class="desc">${esc(e.description)}</div>` : ''}
          ${feedback?.note ? `<div class="feedback-note"><strong>Skip reason:</strong> ${esc(feedback.note)}</div>` : ''}
          <div class="card-foot">
            <div class="mini muted">${esc(e.confidence || '')}</div>
            <div class="event-actions">
              ${personalButtons(e)}
              ${addCalendarButton(e)}
              ${googleCalendarButton(e)}
              ${mapLink(e)}
              <div>${sourceLink(e.source, e.url)}</div>
            </div>
          </div>
        </article>
      `;
    }

    function reasonLabel(e) {
      if (isFamilyEvent(e) && isDaytimeEvent(e)) return 'kid-friendly daytime';
      if (isWeekendOrBankHoliday(e) && isOutdoorEvent(e)) return 'weekend outdoor option';
      if (isMusicEvent(e) && isDaytimeEvent(e)) return 'daytime music';
      if (isTheatreEvent(e)) return 'theatre / performance';
      if (isFolkTradEvent(e)) return 'folk / trad fit';
      if (isFreeEvent(e)) return 'free / low friction';
      if (isDestinationEvent(e)) return 'destination pick';
      return 'local lead';
    }

    function compactEventCard(e) {
      const facts = eventFacts(e);
      return `
        <article class="mini-event ${e.verify ? 'verify-border' : ''}">
          <button class="mini-title" type="button" data-open-event="${esc(e.id)}">${esc(e.title)}</button>
          <div class="mini-line">${esc(dateSpan(e))}${e.time ? ` - ${esc(e.time)}` : ''}</div>
          <div class="mini-line">${esc(e.venue || e.area || '')}</div>
          <div class="mini-tags">
            <span>${esc(reasonLabel(e))}</span>
            <span>${esc(facts.travelBucket || e.tier || 'check route')}</span>
            ${e.cost ? `<span>${esc(e.cost)}</span>` : ''}
          </div>
          <div class="mini-actions">
            ${googleCalendarButton(e, 'Google')}
            ${addCalendarButton(e, 'ICS')}
            <button class="btn small good ${positiveFeedbackFor(e.id) ? 'active' : ''}" type="button" data-like-event="${esc(e.id)}">More like this</button>
            <button class="btn small danger" type="button" data-reject-event="${esc(e.id)}">Not for us</button>
          </div>
        </article>
      `;
    }

    function recCard(r) {
      return `
        <article class="rec-card ${r.verify ? 'verify-border' : ''}">
          <button class="rec-title" type="button" data-open-rec="${esc(r.id)}">${esc(r.name)}</button>
          <div class="meta">${esc(r.pattern || '')}${r.venue ? ` · ${esc(r.venue)}` : ''}</div>
          <div class="badges">${recBadges(r)}</div>
          ${r.dates ? `<div class="desc"><strong>Season dates:</strong> ${esc(r.dates)}</div>` : ''}
          <div class="card-foot">
            <div class="mini muted">${esc(r.confidence || '')}</div>
            <div>${sourceLink(r.source, r.url)}</div>
          </div>
        </article>
      `;
    }

    function groupKey(e) {
      if (e.date < RANGE_START && endDate(e) >= RANGE_START) return TODAY;
      return e.date || 'no-date';
    }

    function groupLabel(key) {
      if (key === 'no-date') return 'No date';
      return fmtDate(key);
    }

    function uniqueRows(rows) {
      const seen = new Set();
      return rows.filter((row) => {
        if (seen.has(row.id)) return false;
        seen.add(row.id);
        return true;
      });
    }

    function renderBestSection(title, detail, rows, limit = 6) {
      const items = uniqueRows(rows).sort((a, b) => eventScore(b) - eventScore(a) || (a.sortKey || '').localeCompare(b.sortKey || '')).slice(0, limit);
      if (!items.length) return '';
      return `
        <section class="best-section">
          <div class="section-title">
            <div>
              <h2>${esc(title)}</h2>
              <div class="muted mini">${esc(detail)}</div>
            </div>
            <span class="badge">${items.length}</span>
          </div>
          <div class="cards">${items.map(eventCard).join('')}</div>
        </section>
      `;
    }

    function renderBest(rows) {
      const weekend = nextWeekendRange();
      const soon = uniqueRows(rows.filter(e => e.date >= TODAY && e.date <= addDays(TODAY, 7)))
        .sort(comparePlannerItems)
        .slice(0, 7);
      const lanes = [
        {
          mode: 'nannyWeekday',
          title: 'Weekday toddler / nanny',
          detail: 'Daytime, low-friction things that could work with childcare.',
          rows: rows.filter(e => matchesMode(e, 'nannyWeekday')),
          limit: 5
        },
        {
          mode: 'familyWeekend',
          title: 'Family weekend',
          detail: `Weekends, bank holidays and easy family days out. Next weekend: ${weekend.label}.`,
          rows: rows.filter(e => matchesMode(e, 'familyWeekend')),
          limit: 6
        },
        {
          mode: 'daytimeMusic',
          title: 'Daytime music',
          detail: 'Rose Cafe, bandstands, lunchtime concerts and family-plausible live music.',
          rows: rows.filter(e => matchesMode(e, 'daytimeMusic')),
          limit: 5
        },
        {
          mode: 'dateNight',
          title: 'Worth childcare',
          detail: 'Evening music, theatre and performance with enough pull for a night out.',
          rows: rows.filter(e => matchesMode(e, 'dateNight')),
          limit: 5
        },
        {
          mode: 'destination',
          title: 'Bigger days out',
          detail: 'Waterloo, Wimbledon, Hampton Court, Kew and further rows only when they look worth it.',
          rows: rows.filter(e => matchesMode(e, 'destination')),
          limit: 5
        }
      ];
      el('bestView').innerHTML = `
        <section class="planner-board">
          <div class="planner-intro">
            <div>
              <h2>What is actually worth thinking about?</h2>
              <div class="muted">The raw calendar is still here, but this is the working view: nearby gets a lower threshold; further out has to justify the trip.</div>
            </div>
            <button class="btn primary" type="button" data-quick="familyWeekend" data-view="agenda">Open weekend agenda</button>
          </div>
          <div class="planner-layout">
            <aside class="next-rail">
              <div class="rail-title">Next 7 days</div>
              ${soon.length ? soon.map(compactEventCard).join('') : '<div class="empty">Nothing in the next 7 days matches this view.</div>'}
            </aside>
            <div class="lane-grid">
              ${lanes.map(lane => renderPlannerLane(lane)).join('')}
            </div>
          </div>
        </section>
      `;
    }

    function renderPlannerLane(lane) {
      const items = uniqueRows(lane.rows)
        .sort(comparePlannerItems)
        .slice(0, lane.limit);
      return `
        <section class="planner-lane">
          <div class="lane-head">
            <div>
              <h3>${esc(lane.title)}</h3>
              <p>${esc(lane.detail)}</p>
            </div>
            <span class="lane-count">${lane.rows.length}</span>
          </div>
          <div class="lane-events">${items.length ? items.map(compactEventCard).join('') : '<div class="empty">No matches right now.</div>'}</div>
          <button class="lane-open" type="button" data-lane-open="${esc(lane.mode)}">Open all ${esc(lane.title.toLowerCase())}</button>
        </section>
      `;
    }

    function renderAgenda(rows) {
      if (!rows.length) {
        el('agendaView').innerHTML = `<div class="empty">No dated events match the current filters.</div>`;
        return;
      }
      const hiddenTools = state.quick === 'hidden'
        ? `<div class="section-title"><div><h2>Hidden / not for us</h2><div class="muted mini">Rows hidden on this browser, plus rows with skip feedback for future updates.</div></div><div class="event-actions"><button class="btn" type="button" data-export-feedback>Export feedback</button><button class="btn" type="button" data-clear-hidden>Restore all hidden</button></div></div>`
        : '';
      const groups = new Map();
      rows.forEach(e => {
        const key = groupKey(e);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(e);
      });
      const html = [...groups.entries()].map(([key, items]) => `
        <section class="date-group">
          <div class="date-heading">
            <span class="date-chip">${esc(groupLabel(key))}</span>
            <span class="group-count">${items.length} item${items.length === 1 ? '' : 's'}</span>
          </div>
          <div class="cards">${items.map(eventCard).join('')}</div>
        </section>
      `).join('');
      el('agendaView').innerHTML = hiddenTools + html;
    }

    function renderCalendar(rows) {
      const firstMonth = parseIso(RANGE_START).getMonth() + 1;
      const months = Array.from({ length: 13 - firstMonth }, (_, i) => {
        const month = firstMonth + i;
        return { year: 2026, month, name: new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(2026, month - 1, 1)) };
      });
      el('calendarView').innerHTML = `
        <div class="section-title">
          <div>
            <h2>Calendar view</h2>
            <div class="muted mini">Multi-day events are shown on their start date. Events already running at the start of a month appear on the 1st; turn on the multi-day toggle to repeat them every active day.</div>
          </div>
        </div>
        <div class="calendar-wrap">
          ${months.map(m => renderMonth(m, rows)).join('')}
        </div>
      `;
    }

    function renderMonth(m, rows) {
      const first = new Date(m.year, m.month - 1, 1);
      const daysInMonth = new Date(m.year, m.month, 0).getDate();
      const offset = (first.getDay() + 6) % 7;
      const monthStart = `${m.year}-${pad(m.month)}-01`;
      const monthEnd = `${m.year}-${pad(m.month)}-${pad(daysInMonth)}`;
      const monthCount = rows.filter(e => activeInRange(e, monthStart, monthEnd)).length;
      const blanks = Array.from({ length: offset }, () => `<div class="day-cell blank" aria-hidden="true"></div>`).join('');
      const days = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const iso = `${m.year}-${pad(m.month)}-${pad(day)}`;
        const dayEvents = rows.filter(e => {
          if (state.ongoingDaily) return activeOnDay(e, iso);
          if (e.date === iso) return true;
          if (day === 1 && e.date < monthStart && endDate(e) >= monthStart) return true;
          return false;
        }).sort((a,b) => (a.sortKey || '').localeCompare(b.sortKey || ''));
        const visible = dayEvents.slice(0, 4);
        const more = dayEvents.length > visible.length ? `<div class="cal-more">+${dayEvents.length - visible.length} more</div>` : '';
        return `
          <div class="day-cell ${iso === TODAY ? 'today' : ''}">
            <div class="day-num">${day}</div>
            ${visible.map(e => `<button class="cal-event" type="button" data-open-event="${esc(e.id)}">${esc(e.time ? e.time + ' · ' : '')}${esc(e.title)}</button>`).join('')}
            ${more}
          </div>
        `;
      }).join('');
      return `
        <section class="month-card">
          <div class="month-title">
            <h3>${esc(m.name)}</h3>
            <span class="badge">${monthCount} active item${monthCount === 1 ? '' : 's'}</span>
          </div>
          <div class="weekdays">
            <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
          </div>
          <div class="month-grid">${blanks}${days}</div>
        </section>
      `;
    }

    function renderTable(rows) {
      if (!rows.length) {
        el('tableView').innerHTML = `<div class="empty">No rows match the current filters.</div>`;
        return;
      }
      el('tableView').innerHTML = `
        <div class="section-title">
          <div>
            <h2>Table view</h2>
            <div class="muted mini">Best for scanning, auditing and copying individual source links.</div>
          </div>
        </div>
        <div class="table-shell">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Time</th><th>Event</th><th>Venue</th><th>Area</th><th>Category</th><th>Type</th><th>Tier</th><th>Cost</th><th>Calendar</th><th>Source</th><th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(e => `
                <tr>
                  <td>${esc(dateSpan(e))}</td>
                  <td>${esc(e.time)}</td>
                  <td><button class="row-title-button" type="button" data-open-event="${esc(e.id)}">${esc(e.title)}</button></td>
                  <td>${esc(e.venue)}</td>
                  <td>${esc(e.area)}</td>
                  <td>${esc(e.category)}</td>
                  <td>${esc(e.type)}</td>
                  <td>${esc(e.tier)}</td>
                  <td>${esc(e.cost)}</td>
                  <td>${addCalendarButton(e)} ${googleCalendarButton(e)}</td>
                  <td>${sourceLink(e.source, e.url)}</td>
                  <td>${esc(e.confidence)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    function renderVenues(rows) {
      if (!rows.length) {
        el('venuesView').innerHTML = `<div class="empty">No venues match the current filters.</div>`;
        return;
      }
      const byVenue = new Map();
      rows.forEach(e => {
        const key = e.venue || '(venue not stated)';
        if (!byVenue.has(key)) byVenue.set(key, []);
        byVenue.get(key).push(e);
      });
      const groups = [...byVenue.entries()].sort((a,b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
      el('venuesView').innerHTML = `
        <div class="section-title">
          <div>
            <h2>Venues & spaces</h2>
            <div class="muted mini">Filtered rows grouped by pub, park, church, hall, gallery, library, market street or other space.</div>
          </div>
        </div>
        <div class="venue-list">
          ${groups.map(([venue, items], index) => {
            const area = items.find(i => i.area)?.area || '';
            return `
              <article class="venue-card">
                <details ${index < 8 ? 'open' : ''}>
                  <summary>${esc(venue)} <span class="badge">${items.length}</span></summary>
                  <div class="meta">${esc(area)}${area ? ' · ' : ''}${[...new Set(items.map(i => i.category).filter(Boolean))].slice(0,4).map(esc).join(' · ')}</div>
                  <ul class="venue-events">
                    ${items.slice(0, 30).map(e => `
                      <li>
                        <button class="row-title-button" type="button" data-open-event="${esc(e.id)}">${esc(e.title)}</button>
                        <div class="mini muted">${esc(dateSpan(e))}${e.time ? ` · ${esc(e.time)}` : ''}</div>
                      </li>
                    `).join('')}
                    ${items.length > 30 ? `<li class="mini muted">+${items.length - 30} more rows at this venue; narrow filters to inspect.</li>` : ''}
                  </ul>
                </details>
              </article>
            `;
          }).join('')}
        </div>
      `;
    }

    function renderRecurring(rows) {
      if (!rows.length) {
        el('recurringView').innerHTML = `<div class="empty">No recurring clubs/classes match the current filters.</div>`;
        return;
      }
      el('recurringView').innerHTML = `
        <div class="section-title">
          <div>
            <h2>Recurring clubs, classes & regular meets</h2>
            <div class="muted mini">These are not always single dated rows; many need a date-by-date publishing check before being added to a public calendar.</div>
          </div>
          <span class="badge">${rows.length} recurring item${rows.length === 1 ? '' : 's'}</span>
        </div>
        <div class="rec-grid">${rows.map(recCard).join('')}</div>
      `;
    }

    function renderSources() {
      const sourceHtml = SOURCES.map(s => `
        <article class="source-card">
          <h3>${esc(s.name || 'Source')}</h3>
          ${s.url ? `<div>${sourceLink('Open source', s.url)}</div>` : ''}
          ${s.notes ? `<p class="muted mini">${esc(s.notes)}</p>` : ''}
        </article>
      `).join('');

      const watchHtml = WATCHLIST.map(item => {
        const entries = Object.entries(item).filter(([k,v]) => v);
        const title = entries[0]?.[1] || 'Watchlist item';
        return `
          <div class="watch-item">
            <strong>${esc(title)}</strong>
            <div class="mini muted">
              ${entries.slice(1).map(([k,v]) => `<span><strong>${esc(k)}:</strong> ${esc(v)}</span>`).join(' · ')}
            </div>
          </div>
        `;
      }).join('');

      const latestHtml = LATEST_CHANGES ? `
        <section class="latest-changes">
          <div class="section-title">
            <div>
              <h2>Latest update</h2>
              <div class="muted mini">${esc(LATEST_CHANGES.generatedAt || '')}</div>
            </div>
          </div>
          <div class="watch-item">
            <strong>${esc(LATEST_CHANGES.summary || 'Calendar updated')}</strong>
            <div class="mini muted">
              <span><strong>Added:</strong> ${esc((LATEST_CHANGES.added || []).length)}</span> -
              <span><strong>Updated:</strong> ${esc((LATEST_CHANGES.updated || []).length)}</span> -
              <span><strong>Removed:</strong> ${esc((LATEST_CHANGES.removed || []).length)}</span>
            </div>
            ${(LATEST_CHANGES.added || []).slice(0, 8).map(item => `<div class="mini">${esc(item)}</div>`).join('')}
          </div>
        </section>
      ` : '';

      const feedbackHtml = personal.feedback.length ? personal.feedback.map(item => `
        <div class="watch-item">
          <strong>${esc(item.action === 'include' ? 'More like this' : 'Not for us')}: ${esc(item.title || item.id)}</strong>
          <div class="mini muted">${esc([item.date, item.venue, item.area, item.category].filter(Boolean).join(' - '))}</div>
          ${item.note ? `<div class="mini">${esc(item.note)}</div>` : ''}
          <button class="btn small" type="button" data-remove-feedback="${esc(item.id)}">Remove feedback</button>
        </div>
      `).join('') : '<div class="empty">No skip feedback saved in this browser yet.</div>';

      el('sourcesView').innerHTML = `
        <div class="section-title">
          <div>
            <h2>Sources & gaps</h2>
            <div class="muted mini">Useful for maintaining the community calendar and identifying places that need periodic manual checking.</div>
          </div>
        </div>
        ${latestHtml}
        <section class="feedback-panel">
          <div class="section-title">
            <div>
              <h2>Feedback for updater</h2>
              <div class="muted mini">Use Not for us on an event, then export this file as updater/user-feedback.json before a manual or scheduled update.</div>
            </div>
            <button class="btn" type="button" data-export-feedback>Export feedback JSON</button>
          </div>
          <div class="watchlist">${feedbackHtml}</div>
        </section>
        <h3>Source list</h3>
        <div class="sources-grid">${sourceHtml}</div>
        <h3 style="margin-top:22px;">Watchlist / known gaps</h3>
        <div class="watchlist">${watchHtml || '<div class="empty">No watchlist rows found.</div>'}</div>
      `;
    }

    function renderStats(rows, recRows) {
      const venues = new Set(rows.map(e => e.venue).filter(Boolean)).size;
      const areas = new Set(rows.map(e => e.area).filter(Boolean)).size;
      const verify = rows.filter(e => e.verify).length + recRows.filter(r => r.verify).length;
      const free = rows.filter(e => /(^|[^a-z])free([^a-z]|$)/.test(normalize(e.cost + ' ' + e.description))).length;
      el('stats').innerHTML = `
        <div class="stat-card"><span class="stat-num">${rows.length}</span><div class="stat-label">dated rows shown</div></div>
        <div class="stat-card"><span class="stat-num">${recRows.length}</span><div class="stat-label">recurring / club rows shown</div></div>
        <div class="stat-card"><span class="stat-num">${venues}</span><div class="stat-label">venues / spaces in current filter</div></div>
        <div class="stat-card"><span class="stat-num">${areas}</span><div class="stat-label">areas in current filter</div></div>
        <div class="stat-card"><span class="stat-num">${verify}</span><div class="stat-label">verify / inferred / TBC flags</div></div>
      `;
      const range = getRange();
      const filters = [];
      if (state.q) filters.push(`search “${state.q}”`);
      if (state.quick) filters.push(el('quickFilter').selectedOptions[0].textContent);
      if (state.area) filters.push(state.area);
      if (state.category) filters.push(state.category);
      if (state.tier) filters.push(state.tier);
      if (state.source) filters.push(state.source);
      if (state.quality) filters.push(el('qualityFilter').selectedOptions[0].textContent);
      el('activeSummary').innerHTML = `<strong>Showing:</strong> ${esc(range.label)}${filters.length ? ' · ' + filters.map(esc).join(' · ') : ''}`;
    }

    function openEvent(id) {
      const e = EVENTS.find(item => item.id === id);
      if (!e) return;
      const facts = eventFacts(e);
      el('detailContent').innerHTML = `
        <div class="modal-head">
          <h2 class="modal-title" id="detailTitle">${esc(e.title)}</h2>
          <div class="badges">${eventBadges(e)}</div>
          <div class="modal-actions">
            ${personalButtons(e)}
            ${googleCalendarButton(e, 'Open in Google Calendar')}
            ${addCalendarButton(e, 'Download .ics')}
            ${mapLink(e, 'Open map')}
          </div>
        </div>
        <div class="modal-body">
          ${e.description ? `<p>${esc(e.description)}</p>` : ''}
          <dl class="modal-grid">
            <dt>Date</dt><dd>${esc(dateSpan(e))}</dd>
            <dt>Time</dt><dd>${esc(e.time || 'Not stated')}</dd>
            <dt>Venue</dt><dd>${esc(e.venue || 'Not stated')}</dd>
            <dt>Area</dt><dd>${esc(e.area || 'Not stated')}</dd>
            <dt>Category</dt><dd>${esc(e.category || 'Not stated')}</dd>
            <dt>Type</dt><dd>${esc(e.type || 'Not stated')}</dd>
            <dt>Cost</dt><dd>${esc(e.cost || 'Not stated')}</dd>
            <dt>Nearness</dt><dd>${esc(e.tier || 'Not stated')}</dd>
            <dt>Travel</dt><dd>${esc(facts.travelBucket || 'Check route')}</dd>
            <dt>Age guidance</dt><dd>${esc(facts.ageRange || 'Not stated')}</dd>
            <dt>Booking</dt><dd>${esc(facts.bookingRequired || 'Not stated')}</dd>
            <dt>Weather</dt><dd>${esc(facts.rainSafe === true ? 'Rain-safe / indoors' : facts.indoorOutdoor || 'Not stated')}</dd>
            <dt>Accessibility</dt><dd>${esc(facts.accessibility || 'Not stated')}</dd>
            <dt>Status</dt><dd>${esc(e.status || 'Not stated')}</dd>
            <dt>Confidence</dt><dd>${esc(e.confidence || 'Not stated')}</dd>
            <dt>Source</dt><dd>${sourceLink(e.source || 'Source', e.url)}</dd>
          </dl>
          <div class="mini muted">Dataset row: Calendar row ${esc(e.row)} · ID ${esc(e.id)}</div>
        </div>
      `;
      el('detailDialog').showModal();
    }

    function openRecurring(id) {
      const r = RECURRING.find(item => item.id === id);
      if (!r) return;
      el('detailContent').innerHTML = `
        <div class="modal-head">
          <h2 class="modal-title" id="detailTitle">${esc(r.name)}</h2>
          <div class="badges">${recBadges(r)}</div>
        </div>
        <div class="modal-body">
          <dl class="modal-grid">
            <dt>Pattern</dt><dd>${esc(r.pattern || 'Not stated')}</dd>
            <dt>Venue</dt><dd>${esc(r.venue || 'Not stated')}</dd>
            <dt>Area</dt><dd>${esc(r.area || 'Not stated')}</dd>
            <dt>Category</dt><dd>${esc(r.category || 'Not stated')}</dd>
            <dt>Season dates</dt><dd>${esc(r.dates || 'Not stated')}</dd>
            <dt>Confidence</dt><dd>${esc(r.confidence || 'Not stated')}</dd>
            <dt>Source</dt><dd>${sourceLink(r.source || 'Source', r.url)}</dd>
          </dl>
          <div class="mini muted">Dataset row: Recurring & Clubs row ${esc(r.row)} · ID ${esc(r.id)}</div>
        </div>
      `;
      el('detailDialog').showModal();
    }

    function render() {
      const rows = filteredEvents();
      const boardRows = state.view === 'best' ? filteredEvents({ ignoreQuick: true }) : rows;
      const recRows = filteredRecurring();
      renderStats(rows, recRows);
      renderBest(boardRows);
      renderAgenda(rows);
      renderCalendar(rows);
      renderTable(rows);
      renderVenues(rows);
      renderRecurring(recRows);
      renderSources();

      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      el(`${state.view}View`).classList.add('active');
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === state.view));
      document.body.classList.toggle('compact', state.compact);
      el('compactBtn').textContent = state.compact ? 'Comfortable' : 'Compact';
      const hiddenCount = new Set([...personal.hidden, ...personal.feedback.filter(item => item.action === 'exclude').map(item => item.id)]).size;
      el('hiddenBtn').textContent = hiddenCount ? `Hidden (${hiddenCount})` : 'Hidden';
      const personalSummary = [];
      if (personal.favorites.size) personalSummary.push(`${personal.favorites.size} favourite${personal.favorites.size === 1 ? '' : 's'}`);
      if (personal.hidden.size) personalSummary.push(`${personal.hidden.size} hidden`);
      const likeCount = personal.feedback.filter(item => item.action === 'include').length;
      const skipCount = personal.feedback.filter(item => item.action === 'exclude').length;
      if (likeCount) personalSummary.push(`${likeCount} more-like-this signal${likeCount === 1 ? '' : 's'}`);
      if (skipCount) personalSummary.push(`${skipCount} not-for-us note${skipCount === 1 ? '' : 's'}`);
      el('personalSummary').innerHTML = personalSummary.length ? personalSummary.map(esc).join(' - ') : 'Tip: star likely plans, mark noise as not for us, then export feedback before the next update.';
      saveState();
      updateUrlFromState();
    }

    function syncControls() {
      el('searchBox').value = state.q;
      el('datePreset').value = state.datePreset;
      el('quickFilter').value = state.quick;
      el('areaFilter').value = state.area;
      el('categoryFilter').value = state.category;
      el('tierFilter').value = state.tier;
      el('typeFilter').value = state.type;
      el('costFilter').value = state.cost;
      el('statusFilter').value = state.status;
      el('sourceFilter').value = state.source;
      el('qualityFilter').value = state.quality;
      el('sortSelect').value = state.sort;
      el('fromDate').min = TODAY;
      el('toDate').min = TODAY;
      el('fromDate').value = state.from;
      el('toDate').value = state.to;
      el('ongoingDaily').checked = state.ongoingDaily;
    }

    function saveState() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {}
    }

    function setFromStoredList(set, value) {
      set.clear();
      if (!Array.isArray(value)) return;
      value.filter(Boolean).forEach((id) => set.add(String(id)));
    }

    function loadPersonal() {
      try {
        setFromStoredList(personal.favorites, JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'));
        setFromStoredList(personal.hidden, JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]'));
        const feedback = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]');
        personal.feedback = Array.isArray(feedback) ? feedback.filter(item => item && item.id) : [];
      } catch (e) {}
    }

    function applyUrlState() {
      const params = new URLSearchParams(window.location.search);
      for (const key of URL_STATE_KEYS) {
        if (!params.has(key)) continue;
        const value = params.get(key);
        state[key] = typeof defaultState[key] === 'boolean' ? value === '1' : value;
      }
      if (!document.getElementById(`${state.view}View`)) state.view = 'agenda';
    }

    function updateUrlFromState() {
      if (!window.history?.replaceState) return;
      const params = new URLSearchParams();
      for (const key of URL_STATE_KEYS) {
        const value = state[key];
        if (value === defaultState[key] || value === '' || value == null) continue;
        params.set(key, typeof value === 'boolean' ? (value ? '1' : '0') : value);
      }
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash || ''}`;
      if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== next) {
        window.history.replaceState(null, '', next);
      }
    }

    async function shareCurrentView() {
      updateUrlFromState();
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast('Share link copied');
      } catch (e) {
        toast('Copy the URL from the address bar');
      }
    }

    function loadState() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        Object.assign(state, saved);
        if (state.datePreset === 'may') state.datePreset = 'upcoming';
        if (state.to && state.to < TODAY) state.to = RANGE_END;
        if (state.from && state.from < TODAY) state.from = TODAY;
        if (state.datePreset === 'custom' && state.to && state.to < TODAY) {
          state.datePreset = 'upcoming';
          state.from = '';
          state.to = '';
        }
      } catch (e) {}
      applyUrlState();
    }

    function resetFilters() {
      Object.assign(state, defaultState);
      syncControls();
      render();
    }

    function currentRowsForExport() {
      if (state.view === 'recurring') return { kind: 'recurring', rows: filteredRecurring() };
      if (state.view === 'best') return { kind: 'events', rows: filteredEvents().filter(isBestBet) };
      return { kind: 'events', rows: filteredEvents() };
    }

    function icsEscape(value) {
      return String(value ?? '')
        .replaceAll('\\', '\\\\')
        .replaceAll('\r\n', '\n')
        .replaceAll('\r', '\n')
        .replaceAll('\n', '\\n')
        .replaceAll(';', '\\;')
        .replaceAll(',', '\\,');
    }

    function compactIcsDate(iso) {
      return String(iso || '').replaceAll('-', '');
    }

    function parseClock(value) {
      const match = String(value || '').match(/\b(\d{1,2})[:.](\d{2})\b/);
      if (!match) return null;
      const hour = Math.min(Number(match[1]), 23);
      const minute = Math.min(Number(match[2]), 59);
      return `${pad(hour)}:${pad(minute)}`;
    }

    function clockToIcs(iso, clock) {
      return `${compactIcsDate(iso)}T${clock.replace(':', '')}00`;
    }

    function addMinutesToClockDate(iso, clock, minutes) {
      const d = parseIso(iso);
      const [hour, minute] = clock.split(':').map(Number);
      d.setHours(hour, minute + minutes, 0, 0);
      return {
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        clock: `${pad(d.getHours())}:${pad(d.getMinutes())}`
      };
    }

    function eventTimeRange(e) {
      const time = String(e.time || '');
      if (!e.date || /all day/i.test(time)) return { allDay: true };
      const start = parseClock(e.startTime) || parseClock(time);
      if (!start) return { allDay: true };
      const range = time.match(/\b(\d{1,2}[:.]\d{2})\s*(?:-|to|\u2013|\u2014)\s*(\d{1,2}[:.]\d{2})\b/i);
      const parsedEnd = range ? parseClock(range[2]) : null;
      const fallback = addMinutesToClockDate(e.date, start, 60);
      return {
        allDay: false,
        start,
        end: parsedEnd || fallback.clock,
        endDate: parsedEnd ? (e.endDate || e.date) : fallback.date
      };
    }

    function eventToIcs(e, stamp) {
      const lines = [
        'BEGIN:VEVENT',
        `UID:${icsEscape(e.id || `${e.date}-${e.title}`)}@surbiton-local-events`,
        `DTSTAMP:${stamp}`,
        `SUMMARY:${icsEscape(e.title || 'Local event')}`
      ];
      const range = eventTimeRange(e);
      if (range.allDay) {
        lines.push(`DTSTART;VALUE=DATE:${compactIcsDate(e.date)}`);
        lines.push(`DTEND;VALUE=DATE:${compactIcsDate(addDays(e.endDate || e.date, 1))}`);
      } else {
        lines.push(`DTSTART;TZID=Europe/London:${clockToIcs(e.date, range.start)}`);
        lines.push(`DTEND;TZID=Europe/London:${clockToIcs(range.endDate, range.end)}`);
      }
      if (e.venue) lines.push(`LOCATION:${icsEscape([e.venue, e.area].filter(Boolean).join(', '))}`);
      const description = [
        e.description,
        e.cost ? `Cost: ${e.cost}` : '',
        e.confidence ? `Confidence: ${e.confidence}` : '',
        e.url ? `Source: ${e.url}` : ''
      ].filter(Boolean).join('\n');
      if (description) lines.push(`DESCRIPTION:${icsEscape(description)}`);
      if (e.url) lines.push(`URL:${icsEscape(e.url)}`);
      lines.push('END:VEVENT');
      return lines.join('\r\n');
    }

    function downloadIcs(rows, filename) {
      if (!rows.length) {
        toast('No dated events to export');
        return;
      }
      const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Surbiton Local Events//Calendar//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Surbiton local events',
        ...rows.map(e => eventToIcs(e, stamp)),
        'END:VCALENDAR'
      ].join('\r\n');
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast(rows.length === 1 ? 'Calendar file downloaded' : `${rows.length} events exported`);
    }

    function safeFilename(value) {
      return String(value || 'event')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 70) || 'event';
    }

    function addEventToCalendar(id) {
      const event = EVENTS.find(item => item.id === id);
      if (!event) return;
      downloadIcs([event], `${event.date || 'event'}-${safeFilename(event.title)}.ics`);
    }

    function exportIcs() {
      downloadIcs(filteredEvents(), `surbiton-events-${TODAY}.ics`);
    }

    function googleDateRange(e) {
      const range = eventTimeRange(e);
      if (range.allDay) {
        return `${compactIcsDate(e.date)}/${compactIcsDate(addDays(e.endDate || e.date, 1))}`;
      }
      return `${clockToIcs(e.date, range.start)}/${clockToIcs(range.endDate, range.end)}`;
    }

    function googleCalendarUrl(e) {
      const details = [
        e.description,
        e.cost ? `Cost: ${e.cost}` : '',
        e.confidence ? `Confidence: ${e.confidence}` : '',
        e.url ? `Source: ${e.url}` : ''
      ].filter(Boolean).join('\n\n');
      const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: e.title || 'Local event',
        dates: googleDateRange(e),
        ctz: 'Europe/London',
        details,
        location: [e.venue, e.area].filter(Boolean).join(', ')
      });
      return `https://calendar.google.com/calendar/render?${params.toString()}`;
    }

    function openGoogleCalendar(id) {
      const event = EVENTS.find(item => item.id === id);
      if (!event) return;
      window.open(googleCalendarUrl(event), '_blank', 'noopener,noreferrer');
      toast('Opening Google Calendar');
    }

    function toCsvValue(value) {
      const s = String(value ?? '');
      return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
    }

    function exportCsv() {
      const { kind, rows } = currentRowsForExport();
      let headers, csvRows;
      if (kind === 'recurring') {
        headers = ['Name', 'Pattern', 'Venue', 'Area', 'Category', 'Season dates', 'Source', 'URL', 'Confidence'];
        csvRows = rows.map(r => [r.name, r.pattern, r.venue, r.area, r.category, r.dates, r.source, r.url, r.confidence]);
      } else {
        headers = ['Date', 'End Date', 'Time', 'Event', 'Venue', 'Area', 'Category', 'Type', 'Cost', 'Nearness tier', 'Travel', 'Age guidance', 'Booking', 'Indoor/outdoor', 'Rain safe', 'Description', 'Source', 'URL', 'Confidence', 'Status'];
        csvRows = rows.map(e => {
          const facts = eventFacts(e);
          return [e.date, e.endDate, e.time, e.title, e.venue, e.area, e.category, e.type, e.cost, e.tier, facts.travelBucket, facts.ageRange, facts.bookingRequired, facts.indoorOutdoor, facts.rainSafe, e.description, e.source, e.url, e.confidence, e.status];
        });
      }
      const csv = [headers, ...csvRows].map(row => row.map(toCsvValue).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = kind === 'recurring' ? 'surbiton-recurring-filtered.csv' : 'surbiton-events-filtered.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast('CSV exported');
    }

    async function copyFilteredList() {
      const { kind, rows } = currentRowsForExport();
      let text;
      if (kind === 'recurring') {
        text = rows.map(r => `${r.name} — ${r.pattern}${r.venue ? ' — ' + r.venue : ''}${r.url ? ' — ' + r.url : ''}`).join('\n');
      } else {
        text = rows.map(e => `${dateSpan(e)}${e.time ? ' ' + e.time : ''} — ${e.title}${e.venue ? ' — ' + e.venue : ''}${e.url ? ' — ' + e.url : ''}`).join('\n');
      }
      try {
        await navigator.clipboard.writeText(text);
        toast(`Copied ${rows.length} ${kind === 'recurring' ? 'recurring rows' : 'events'}`);
      } catch (e) {
        toast('Copy failed in this browser');
      }
    }

    function toast(message) {
      const t = el('toast');
      t.textContent = message;
      t.classList.add('show');
      window.setTimeout(() => t.classList.remove('show'), 1800);
    }

    function wireEvents() {
      el('searchBox').addEventListener('input', e => { state.q = e.target.value; render(); });
      el('datePreset').addEventListener('change', e => { state.datePreset = e.target.value; render(); });
      el('quickFilter').addEventListener('change', e => { state.quick = e.target.value; render(); });
      el('areaFilter').addEventListener('change', e => { state.area = e.target.value; render(); });
      el('categoryFilter').addEventListener('change', e => { state.category = e.target.value; render(); });
      el('tierFilter').addEventListener('change', e => { state.tier = e.target.value; render(); });
      el('typeFilter').addEventListener('change', e => { state.type = e.target.value; render(); });
      el('costFilter').addEventListener('change', e => { state.cost = e.target.value; render(); });
      el('statusFilter').addEventListener('change', e => { state.status = e.target.value; render(); });
      el('sourceFilter').addEventListener('change', e => { state.source = e.target.value; render(); });
      el('qualityFilter').addEventListener('change', e => { state.quality = e.target.value; render(); });
      el('sortSelect').addEventListener('change', e => { state.sort = e.target.value; render(); });
      el('fromDate').addEventListener('change', e => { state.from = e.target.value; state.datePreset = 'custom'; syncControls(); render(); });
      el('toDate').addEventListener('change', e => { state.to = e.target.value; state.datePreset = 'custom'; syncControls(); render(); });
      el('ongoingDaily').addEventListener('change', e => { state.ongoingDaily = e.target.checked; render(); });
      el('resetBtn').addEventListener('click', resetFilters);
      el('hiddenBtn').addEventListener('click', () => {
        const hiddenCount = new Set([...personal.hidden, ...personal.feedback.filter(item => item.action === 'exclude').map(item => item.id)]).size;
        if (!hiddenCount) {
          toast('No hidden rows');
          return;
        }
        state.quick = state.quick === 'hidden' ? '' : 'hidden';
        state.view = 'agenda';
        syncControls();
        render();
      });
      el('compactBtn').addEventListener('click', () => { state.compact = !state.compact; render(); });
      el('icsBtn').addEventListener('click', exportIcs);
      el('csvBtn').addEventListener('click', exportCsv);
      el('copyBtn').addEventListener('click', copyFilteredList);
      el('shareBtn').addEventListener('click', shareCurrentView);
      el('feedbackBtn').addEventListener('click', () => {
        state.view = 'sources';
        syncControls();
        render();
        document.getElementById('sourcesView').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      el('printBtn').addEventListener('click', () => window.print());

      document.querySelectorAll('.quick-chip').forEach(button => {
        button.addEventListener('click', () => {
          if (button.dataset.preset) state.datePreset = button.dataset.preset;
          if (button.dataset.quick !== undefined) state.quick = button.dataset.quick;
          if (button.dataset.view) state.view = button.dataset.view;
          syncControls();
          render();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });

      document.querySelectorAll('.tab').forEach(button => {
        button.addEventListener('click', () => {
          state.view = button.dataset.view;
          if (state.view === 'best' && !state.quick) state.quick = 'best';
          if (state.view !== 'best' && state.quick === 'best') state.quick = '';
          syncControls();
          render();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });

      document.addEventListener('click', (e) => {
        const favoriteButton = e.target.closest('[data-favorite-event]');
        if (favoriteButton) {
          e.preventDefault();
          e.stopPropagation();
          toggleFavorite(favoriteButton.dataset.favoriteEvent);
          return;
        }
        const hideButton = e.target.closest('[data-hide-event]');
        if (hideButton) {
          e.preventDefault();
          e.stopPropagation();
          toggleHidden(hideButton.dataset.hideEvent);
          return;
        }
        const rejectButton = e.target.closest('[data-reject-event]');
        if (rejectButton) {
          e.preventDefault();
          e.stopPropagation();
          openFeedback(rejectButton.dataset.rejectEvent);
          return;
        }
        const likeButton = e.target.closest('[data-like-event]');
        if (likeButton) {
          e.preventDefault();
          e.stopPropagation();
          savePositiveFeedback(likeButton.dataset.likeEvent);
          return;
        }
        const exportFeedbackButton = e.target.closest('[data-export-feedback]');
        if (exportFeedbackButton) {
          e.preventDefault();
          exportFeedback();
          return;
        }
        const removeFeedbackButton = e.target.closest('[data-remove-feedback]');
        if (removeFeedbackButton) {
          e.preventDefault();
          removeFeedback(removeFeedbackButton.dataset.removeFeedback);
          return;
        }
        const laneButton = e.target.closest('[data-lane-open]');
        if (laneButton) {
          e.preventDefault();
          state.quick = laneButton.dataset.laneOpen;
          state.view = 'agenda';
          syncControls();
          render();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        const clearHiddenButton = e.target.closest('[data-clear-hidden]');
        if (clearHiddenButton) {
          e.preventDefault();
          clearHiddenRows();
          return;
        }
        const googleButton = e.target.closest('[data-google-event]');
        if (googleButton) {
          e.preventDefault();
          e.stopPropagation();
          openGoogleCalendar(googleButton.dataset.googleEvent);
          return;
        }
        const addButton = e.target.closest('[data-add-event]');
        if (addButton) {
          e.preventDefault();
          e.stopPropagation();
          addEventToCalendar(addButton.dataset.addEvent);
          return;
        }
        const eventButton = e.target.closest('[data-open-event]');
        if (eventButton) openEvent(eventButton.dataset.openEvent);
        const recButton = e.target.closest('[data-open-rec]');
        if (recButton) openRecurring(recButton.dataset.openRec);
      });

      el('modalClose').addEventListener('click', () => el('detailDialog').close());
      el('feedbackClose').addEventListener('click', () => el('feedbackDialog').close());
      el('cancelFeedbackBtn').addEventListener('click', () => el('feedbackDialog').close());
      el('feedbackForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveFeedbackNote();
        el('feedbackDialog').close();
      });
      el('detailDialog').addEventListener('click', (e) => {
        const rect = el('detailDialog').getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
          el('detailDialog').close();
        }
      });

      window.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT') {
          e.preventDefault();
          el('searchBox').focus();
        }
      });
    }
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    initFilters();
    loadPersonal();
    loadState();
    syncControls();
    wireEvents();
    render();
