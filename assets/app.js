(() => {
  const DATA = window.CALENDAR_DATA || {};
  const EVENTS = DATA.events || [];
  const SOURCES = DATA.sources || [];
  const WATCHLIST = DATA.watchlist || [];
  const LATEST = DATA.latestChanges || null;
  const RANGE_END = '2026-12-31';
  const STORAGE_KEY = 'surbiton-calendar-state-v5';
  const OLD_STORAGE_KEY = 'surbiton-calendar-state-v4';
  const FAVORITES_KEY = 'surbiton-calendar-favorites-v1';
  const ARCHIVE_KEY = 'surbiton-calendar-hidden-v1';
  const FEEDBACK_KEY = 'surbiton-calendar-feedback-v1';
  const BANK_HOLIDAYS = new Set(['2026-08-31', '2026-12-25', '2026-12-28']);

  const LENSES = [
    { id: 'home', label: 'Best next', help: 'A short, opinionated list.' },
    { id: 'weekday', label: 'Weekday kid', help: 'Daytime things for nanny/toddler.' },
    { id: 'weekend', label: 'Weekend family', help: 'Weekends and bank holidays.' },
    { id: 'music', label: 'Daytime music', help: 'Free and easy music.' },
    { id: 'date', label: 'Date night', help: 'Worth arranging childcare.' },
    { id: 'saved', label: 'Saved', help: 'Things you starred.' },
    { id: 'archive', label: 'Archive', help: 'Hidden this time only.' }
  ];

  const state = {
    lens: 'home',
    q: '',
    range: 'next30'
  };

  const personal = {
    saved: new Set(),
    archived: new Set(),
    feedback: []
  };

  let pendingFeedbackId = null;

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
  const normalize = (value) => String(value ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
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

  const TODAY = clampIso(londonToday(), DATA.meta?.dateBasis || '2026-08-28', RANGE_END);

  function parseIso(iso) {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    return y && m && d ? new Date(y, m - 1, d) : null;
  }

  function addDays(iso, days) {
    const d = parseIso(iso);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function fmtDate(iso) {
    const d = parseIso(iso);
    return d ? new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(d) : iso || '';
  }

  function fmtLongDate(iso) {
    const d = parseIso(iso);
    return d ? new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(d) : iso || '';
  }

  function endDate(event) {
    return event.endDate || event.date || '';
  }

  function parseClock(value) {
    const match = String(value || '').match(/\b(\d{1,2})[:.](\d{2})\b/);
    if (!match) return null;
    return `${pad(Math.min(Number(match[1]), 23))}:${pad(Math.min(Number(match[2]), 59))}`;
  }

  function dateSpan(event) {
    if (event.endDate && event.endDate !== event.date) return `${fmtDate(event.date)} - ${fmtDate(event.endDate)}`;
    return fmtDate(event.date);
  }

  function hay(event) {
    return normalize([
      event.searchText,
      event.title,
      event.venue,
      event.area,
      event.category,
      event.type,
      event.cost,
      event.tier,
      event.description,
      event.source
    ].filter(Boolean).join(' '));
  }

  function rawHay(event) {
    return normalize([
      event.title,
      event.venue,
      event.area,
      event.category,
      event.type,
      event.cost,
      event.tier,
      event.description,
      event.source
    ].filter(Boolean).join(' '));
  }

  function isFree(event) {
    return /(^|[^a-z])free([^a-z]|$)/.test(hay(event)) || normalize(event.cost) === 'free';
  }

  function isFamily(event) {
    return /(kid|kids|child|children|family|toddler|baby|under-5|under 5|rhyme|story|playgroup|soft play|\bplay\b|sensory|puppet|polka|library|trail)/.test(rawHay(event));
  }

  function isToddlerFit(event) {
    const text = hay(event);
    if (/(lego robotics|yu-?gi-?oh|trading-card|trading card|coding club|robotics club)/.test(text)) return false;
    if (/(ages?\s*(6\+|7\+|8\+|10\+|8\s*-\s*12|6\s*-\s*12)|\b8\s*-\s*12\b|\b6\s*-\s*12\b)/.test(text)) return false;
    if (/(6-18 months|6 to 18 months|under 18 months)/.test(text)) return false;
    return true;
  }

  function isMusic(event) {
    return /(music|concert|choir|choral|jazz|band|gig|singalong|folk|trad|irish|bandstand|recital|opera|chamber|classical|swing|ceilidh|dance)/.test(hay(event));
  }

  function isTheatre(event) {
    return /(theatre|\bplay\b|shakespeare|performance|comedy|opera|musical|rose theatre|polka|national theatre|landmark)/.test(hay(event));
  }

  function isOutdoor(event) {
    return /(park|garden|outdoor|open air|bandstand|trail|market|fair|festival|railway|hampton court|river|thames)/.test(hay(event));
  }

  function isEasy(event) {
    return /(core|surbiton|berrylands|tolworth|kingston|hampton court|thames ditton|long ditton|molesey|wimbledon|morden|waterloo|south bank|southbank)/.test(hay(event));
  }

  function isDaytime(event) {
    const timeText = String(event.time || '');
    if (/check|var(y|ies)|tbc|not stated|multiple performances/i.test(timeText)) return false;
    const start = parseClock(timeText) || parseClock(event.startTime);
    if (!start) return /all day|daytime|morning|afternoon/i.test(`${event.time || ''} ${event.description || ''}`);
    return start < '18:00';
  }

  function isEvening(event) {
    const start = parseClock(event.time) || parseClock(event.startTime);
    return start ? start >= '18:00' : /evening|night|19:|20:|21:/.test(hay(event));
  }

  function isWeekend(event) {
    if (!event.date) return false;
    if (BANK_HOLIDAYS.has(event.date)) return true;
    const d = parseIso(event.date);
    return d ? d.getDay() === 0 || d.getDay() === 6 : false;
  }

  function daysUntil(iso) {
    const a = parseIso(TODAY);
    const b = parseIso(iso);
    return a && b ? Math.round((b - a) / 86400000) : 999;
  }

  function isLongRun(event) {
    if (!event.endDate || event.endDate === event.date) return false;
    return daysUntil(event.endDate) - daysUntil(event.date) > 7;
  }

  function score(event) {
    let value = 0;
    const soon = daysUntil(event.date);
    if (soon >= 0 && soon <= 7) value += 4;
    else if (soon >= 0 && soon <= 30) value += 2;
    if (isEasy(event)) value += 2;
    if (isFamily(event) && isToddlerFit(event)) value += 2;
    if (isMusic(event) || isTheatre(event)) value += 2;
    if (isOutdoor(event)) value += 1;
    if (isFree(event)) value += 1;
    if (isDaytime(event)) value += 1;
    if (isLongRun(event)) value -= 2;
    if (event.verify) value -= 2;
    return value;
  }

  function isSaved(id) {
    return personal.saved.has(id);
  }

  function isArchived(id) {
    return personal.archived.has(id);
  }

  function feedbackFor(id, action = 'exclude') {
    return personal.feedback.find(item => item.id === id && item.action === action) || null;
  }

  function isSkipped(id) {
    return Boolean(feedbackFor(id, 'exclude'));
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...personal.saved]));
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify([...personal.archived]));
      localStorage.setItem(FEEDBACK_KEY, JSON.stringify(personal.feedback));
    } catch {}
  }

  function load() {
    try {
      const savedState = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(OLD_STORAGE_KEY) || '{}');
      if (savedState.q) state.q = savedState.q;
      if (savedState.range) state.range = savedState.range;
      if (savedState.datePreset) state.range = mapOldRange(savedState.datePreset);
      if (savedState.lens) state.lens = savedState.lens;
      if (savedState.view === 'archived' || savedState.quick === 'hidden') state.lens = 'archive';
      if (savedState.quick && ['nannyWeekday','familyWeekend','daytimeMusic','dateNight','favorites'].includes(savedState.quick)) {
        state.lens = {
          nannyWeekday: 'weekday',
          familyWeekend: 'weekend',
          daytimeMusic: 'music',
          dateNight: 'date',
          favorites: 'saved'
        }[savedState.quick];
      }
    } catch {}
    try { personal.saved = new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]').map(String)); } catch {}
    try { personal.archived = new Set(JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]').map(String)); } catch {}
    try {
      const feedback = JSON.parse(localStorage.getItem(FEEDBACK_KEY) || '[]');
      personal.feedback = Array.isArray(feedback) ? feedback.filter(item => item && item.id) : [];
    } catch {}
  }

  function mapOldRange(value) {
    if (value === 'next7' || value === 'today' || value === 'tomorrow' || value === 'weekend') return value;
    if (value === 'all' || value === 'december' || value === 'autumn') return 'all';
    return 'next30';
  }

  function rangeBounds() {
    if (state.range === 'next7') return { from: TODAY, to: addDays(TODAY, 7), label: 'next 7 days' };
    if (state.range === 'next90') return { from: TODAY, to: addDays(TODAY, 90), label: 'next 3 months' };
    if (state.range === 'weekend') {
      const d = parseIso(TODAY);
      const offset = (6 - d.getDay() + 7) % 7;
      const from = addDays(TODAY, offset);
      return { from, to: addDays(from, 1), label: `this weekend (${fmtDate(from)} - ${fmtDate(addDays(from, 1))})` };
    }
    if (state.range === 'all') return { from: TODAY, to: RANGE_END, label: 'through end of year' };
    return { from: TODAY, to: addDays(TODAY, 30), label: 'next 30 days' };
  }

  function inRange(event) {
    const r = rangeBounds();
    return endDate(event) >= r.from && event.date <= r.to;
  }

  function lensMatch(event) {
    if (state.lens === 'sources') return false;
    if (state.lens === 'archive') return isArchived(event.id) && !isSkipped(event.id);
    if (state.lens === 'skips') return isSkipped(event.id);
    if (state.lens !== 'archive' && state.lens !== 'skips' && (isArchived(event.id) || isSkipped(event.id))) return false;
    if (state.lens === 'saved') return isSaved(event.id);
    if (state.lens === 'weekday') return isToddlerFit(event) && !isWeekend(event) && isDaytime(event) && isEasy(event) && isFamily(event);
    if (state.lens === 'weekend') return isToddlerFit(event) && isWeekend(event) && (isFamily(event) || isOutdoor(event) || (isMusic(event) && isDaytime(event)));
    if (state.lens === 'music') return isDaytime(event) && (isMusic(event) || isTheatre(event));
    if (state.lens === 'date') return isEvening(event) && !isFamily(event) && (isMusic(event) || isTheatre(event));
    if (state.lens === 'home') return score(event) >= 5;
    return true;
  }

  function matchesSearch(event) {
    if (!state.q.trim()) return true;
    return hay(event).includes(normalize(state.q));
  }

  function currentRows() {
    return EVENTS
      .filter(event => endDate(event) >= TODAY)
      .filter(inRange)
      .filter(matchesSearch)
      .filter(lensMatch)
      .sort((a, b) => {
        const longDelta = Number(isLongRun(a)) - Number(isLongRun(b));
        if (state.lens === 'home' && longDelta) return longDelta;
        return (a.sortKey || `${a.date} ${a.time || ''}`).localeCompare(b.sortKey || `${b.date} ${b.time || ''}`) || score(b) - score(a);
      });
  }

  function groupedRows(rows) {
    const groups = new Map();
    for (const event of rows) {
      const key = groupName(event);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(event);
    }
    return groups;
  }

  function groupName(event) {
    if (event.date < TODAY && endDate(event) >= TODAY) return 'Already running';
    const diff = daysUntil(event.date);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff <= 7) return 'Next 7 days';
    const d = parseIso(event.date);
    return d ? new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(d) : 'Later';
  }

  function eventTags(event) {
    const tags = [];
    if (isFamily(event) && isToddlerFit(event)) tags.push('toddler-fit');
    if (isWeekend(event)) tags.push('weekend');
    if (isDaytime(event)) tags.push('daytime');
    if (isMusic(event)) tags.push('music');
    if (isTheatre(event)) tags.push('theatre');
    if (isFree(event)) tags.push('free');
    if (event.verify) tags.push('verify');
    if (event.tier) tags.push(event.tier);
    return tags.slice(0, 5);
  }

  function eventCard(event) {
    const skipped = feedbackFor(event.id, 'exclude');
    const liked = feedbackFor(event.id, 'include');
    const archiveLabel = isArchived(event.id) ? 'Unarchive' : 'Archive';
    const saveLabel = isSaved(event.id) ? 'Saved' : 'Save';
    return `
      <article class="event-card ${skipped ? 'is-muted' : ''} ${isArchived(event.id) ? 'is-archived' : ''}">
        <div class="date-block">
          <strong>${esc(dateSpan(event))}</strong>
          <span>${esc(event.time || 'Time not listed')}</span>
        </div>
        <div class="event-main">
          <button class="title-button" type="button" data-open="${esc(event.id)}">${esc(event.title || 'Untitled event')}</button>
          <div class="event-meta">${esc([event.venue, event.area].filter(Boolean).join(', '))}</div>
          ${event.description ? `<p>${esc(event.description)}</p>` : ''}
          ${skipped?.note ? `<p class="feedback-note"><strong>Skip reason:</strong> ${esc(skipped.note)}</p>` : ''}
          <div class="tag-row">${eventTags(event).map(tag => `<span>${esc(tag)}</span>`).join('')}</div>
          <div class="action-row">
            <a class="btn small primary" target="_blank" rel="noopener" href="${esc(googleUrl(event))}">Google</a>
            <button class="btn small ${isSaved(event.id) ? 'active' : ''}" type="button" data-save="${esc(event.id)}">${saveLabel}</button>
            <button class="btn small" type="button" data-archive="${esc(event.id)}">${archiveLabel}</button>
            <details class="tune-menu">
              <summary>Tune</summary>
              <button class="btn small good ${liked ? 'active' : ''}" type="button" data-like="${esc(event.id)}">${liked ? 'More like this saved' : 'More like this'}</button>
              <button class="btn small danger ${skipped ? 'active' : ''}" type="button" data-skip="${esc(event.id)}">${skipped ? 'Edit not for us' : 'Not for us'}</button>
            </details>
          </div>
        </div>
      </article>
    `;
  }

  function renderEvents() {
    const rows = currentRows();
    const lens = LENSES.find(item => item.id === state.lens) || LENSES[0];
    if (state.lens === 'sources') {
      renderSources();
      return;
    }
    if (!rows.length) {
      $('content').innerHTML = `
        <section class="empty-state">
          <h2>${esc(lens.label)}</h2>
          <p>No matching events. Try a wider range or another lens.</p>
        </section>
      `;
      return;
    }
    const limit = state.lens === 'home' ? 24 : rows.length;
    const shown = rows.slice(0, limit);
    const extra = rows.length - shown.length;
    const groups = groupedRows(shown);
    $('content').innerHTML = `
      <section class="section-head">
        <div>
          <h2>${esc(lens.label)}</h2>
          <p>${esc(lens.help)}</p>
        </div>
        ${state.lens === 'archive' && rows.length ? '<button class="btn" type="button" data-unarchive-all>Unarchive all</button>' : ''}
        ${state.lens === 'skips' ? '<button class="btn" type="button" data-export-feedback>Export feedback</button>' : ''}
      </section>
      ${[...groups.entries()].map(([name, items]) => `
        <section class="event-group">
          <h3>${esc(name)}</h3>
          <div class="event-list">${items.map(eventCard).join('')}</div>
        </section>
      `).join('')}
      ${extra > 0 ? `<button class="btn load-more" type="button" data-range-all>Show all ${rows.length}</button>` : ''}
    `;
  }

  function renderSources() {
    const feedback = personal.feedback;
    $('content').innerHTML = `
      <section class="section-head">
        <div>
          <h2>Sources and update notes</h2>
          <p>Maintenance view. Archive is local-only; More like this and Not for us are exported for future updates.</p>
        </div>
        <button class="btn primary" type="button" data-export-feedback>Export feedback</button>
      </section>
      ${LATEST ? `
        <section class="plain-section">
          <h3>Latest update</h3>
          <p><strong>${esc(LATEST.summary || 'Updated')}</strong></p>
          <p class="muted">${esc(LATEST.generatedAt || '')}</p>
          <p>${esc((LATEST.updated || []).join(' '))}</p>
        </section>
      ` : ''}
      <section class="plain-section">
        <h3>Feedback saved in this browser</h3>
        ${feedback.length ? feedback.map(item => `
          <div class="source-row">
            <strong>${esc(item.action === 'include' ? 'More like this' : 'Not for us')}: ${esc(item.title || item.id)}</strong>
            <span>${esc([item.date, item.venue, item.note].filter(Boolean).join(' - '))}</span>
            <button class="btn small" type="button" data-remove-feedback="${esc(item.id)}">Remove</button>
          </div>
        `).join('') : '<p class="muted">No feedback saved.</p>'}
      </section>
      <section class="plain-section">
        <h3>Watchlist</h3>
        ${WATCHLIST.slice(0, 30).map(item => `<div class="source-row"><strong>${esc(Object.values(item)[0] || 'Watch item')}</strong><span>${esc(Object.entries(item).slice(1).map(([k,v]) => `${k}: ${v}`).join(' - '))}</span></div>`).join('') || '<p class="muted">No watchlist rows.</p>'}
      </section>
      <section class="plain-section">
        <h3>Sources</h3>
        ${SOURCES.map(source => `<div class="source-row"><strong>${source.url ? `<a href="${esc(source.url)}" target="_blank" rel="noopener">${esc(source.name || source.source || 'Source')}</a>` : esc(source.name || source.source || 'Source')}</strong><span>${esc(source.notes || source.category || '')}</span></div>`).join('')}
      </section>
    `;
  }

  function renderTabs() {
    $('lensTabs').innerHTML = LENSES.map(lens => `
      <button class="lens ${state.lens === lens.id ? 'active' : ''}" type="button" data-lens="${esc(lens.id)}">
        <strong>${esc(lens.label)}</strong>
        <span>${esc(lens.help)}</span>
      </button>
    `).join('');
  }

  function renderStatus() {
    const rows = currentRows();
    const saved = personal.saved.size;
    const archived = [...personal.archived].filter(id => !isSkipped(id)).length;
    const likes = personal.feedback.filter(item => item.action === 'include').length;
    const skips = personal.feedback.filter(item => item.action === 'exclude').length;
    const parts = [
      `Updated ${DATA.meta?.dateBasis || DATA.meta?.updated || 'recently'}`,
      `${rows.length} matches`,
      `${EVENTS.filter(event => endDate(event) >= TODAY).length} upcoming`,
      `${rangeBounds().label}`
    ];
    const personalBits = [
      saved ? `${saved} saved` : '',
      archived ? `${archived} archived` : '',
      likes ? `${likes} liked` : '',
      skips ? `${skips} skipped` : ''
    ].filter(Boolean);
    $('statusStrip').innerHTML = `
      <div>${parts.map(esc).join(' / ')}</div>
      <div class="status-actions">
        <span>${personalBits.length ? personalBits.map(esc).join(' / ') : 'Archive hides this instance. Not for us trains future updates.'}</span>
        <button class="btn small" type="button" data-lens="${state.lens === 'sources' ? 'home' : 'sources'}">${state.lens === 'sources' ? 'Back to planner' : 'Sources + feedback'}</button>
      </div>
    `;
  }

  function render() {
    renderTabs();
    $('searchBox').value = state.q;
    $('dateRange').value = state.range;
    renderStatus();
    renderEvents();
    persist();
  }

  function feedbackObject(event, action, note = '') {
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

  function toggleSave(id) {
    if (personal.saved.has(id)) personal.saved.delete(id);
    else personal.saved.add(id);
    render();
    toast(personal.saved.has(id) ? 'Saved' : 'Removed from saved');
  }

  function toggleArchive(id) {
    if (personal.archived.has(id)) personal.archived.delete(id);
    else personal.archived.add(id);
    render();
    toast(personal.archived.has(id) ? 'Archived' : 'Unarchived');
  }

  function saveLike(id) {
    const event = EVENTS.find(item => item.id === id);
    if (!event) return;
    personal.feedback = personal.feedback.filter(item => !(item.id === id && item.action === 'include'));
    personal.feedback.unshift(feedbackObject(event, 'include', 'More like this'));
    render();
    toast('Saved: more like this');
  }

  function openFeedback(id) {
    const event = EVENTS.find(item => item.id === id);
    if (!event) return;
    pendingFeedbackId = id;
    $('feedbackSubtitle').textContent = [event.title, event.venue].filter(Boolean).join(' - ');
    $('feedbackNote').value = feedbackFor(id, 'exclude')?.note || '';
    $('feedbackDialog').showModal();
    $('feedbackNote').focus();
  }

  function saveSkip() {
    const event = EVENTS.find(item => item.id === pendingFeedbackId);
    if (!event) return;
    personal.feedback = personal.feedback.filter(item => item.id !== event.id);
    personal.feedback.unshift(feedbackObject(event, 'exclude', $('feedbackNote').value.trim()));
    pendingFeedbackId = null;
    render();
    toast('Saved as not for us');
  }

  function removeFeedback(id) {
    personal.feedback = personal.feedback.filter(item => item.id !== id);
    render();
    toast('Feedback removed');
  }

  function unarchiveAll() {
    personal.archived.clear();
    render();
    toast('Archive cleared');
  }

  function exportFeedback() {
    const blob = new Blob([`${JSON.stringify({
      updated: new Date().toISOString(),
      calendarFeedback: personal.feedback,
      gigFeedback: []
    }, null, 2)}\n`], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, 'user-feedback.json');
    toast('Feedback exported');
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function icsEscape(value) {
    return String(value ?? '').replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(';', '\\;').replaceAll(',', '\\,');
  }

  function compactDate(iso) {
    return String(iso || '').replaceAll('-', '');
  }

  function addMinutes(iso, clock, minutes) {
    const [y, m, d] = iso.split('-').map(Number);
    const [h, min] = clock.split(':').map(Number);
    const date = new Date(y, m - 1, d, h, min + minutes);
    return {
      date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      clock: `${pad(date.getHours())}:${pad(date.getMinutes())}`
    };
  }

  function googleDateRange(event) {
    const start = parseClock(event.time) || parseClock(event.startTime);
    if (!start || /check|var(y|ies)|tbc|not stated|multiple/i.test(event.time || '')) {
      return `${compactDate(event.date)}/${compactDate(addDays(event.endDate || event.date, 1))}`;
    }
    const end = addMinutes(event.date, start, 90);
    return `${compactDate(event.date)}T${start.replace(':', '')}00/${compactDate(end.date)}T${end.clock.replace(':', '')}00`;
  }

  function googleUrl(event) {
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title || 'Local event',
      dates: googleDateRange(event),
      ctz: 'Europe/London',
      details: [event.description, event.cost ? `Cost: ${event.cost}` : '', event.url ? `Source: ${event.url}` : ''].filter(Boolean).join('\n\n'),
      location: [event.venue, event.area].filter(Boolean).join(', ')
    });
    return `https://calendar.google.com/calendar/render?${params}`;
  }

  function eventIcs(event) {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//local-events//family-calendar//EN',
      'BEGIN:VEVENT',
      `UID:${icsEscape(event.id)}@local-events`,
      `DTSTAMP:${stamp}`,
      `SUMMARY:${icsEscape(event.title || 'Local event')}`
    ];
    const start = parseClock(event.time) || parseClock(event.startTime);
    if (!start || /check|var(y|ies)|tbc|not stated|multiple/i.test(event.time || '')) {
      lines.push(`DTSTART;VALUE=DATE:${compactDate(event.date)}`);
      lines.push(`DTEND;VALUE=DATE:${compactDate(addDays(event.endDate || event.date, 1))}`);
    } else {
      const end = addMinutes(event.date, start, 90);
      lines.push(`DTSTART;TZID=Europe/London:${compactDate(event.date)}T${start.replace(':', '')}00`);
      lines.push(`DTEND;TZID=Europe/London:${compactDate(end.date)}T${end.clock.replace(':', '')}00`);
    }
    if (event.venue || event.area) lines.push(`LOCATION:${icsEscape([event.venue, event.area].filter(Boolean).join(', '))}`);
    if (event.description || event.url) lines.push(`DESCRIPTION:${icsEscape([event.description, event.url].filter(Boolean).join('\n'))}`);
    if (event.url) lines.push(`URL:${icsEscape(event.url)}`);
    lines.push('END:VEVENT', 'END:VCALENDAR');
    return lines.join('\r\n');
  }

  function openDetail(id) {
    const event = EVENTS.find(item => item.id === id);
    if (!event) return;
    $('detailContent').innerHTML = `
      <div class="modal-head">
        <h2 id="detailTitle">${esc(event.title || 'Event')}</h2>
        <p class="muted">${esc(dateSpan(event))}${event.time ? ` / ${esc(event.time)}` : ''}</p>
      </div>
      <dl class="detail-grid">
        <dt>Place</dt><dd>${esc([event.venue, event.area].filter(Boolean).join(', ') || 'Not listed')}</dd>
        <dt>Cost</dt><dd>${esc(event.cost || 'Not listed')}</dd>
        <dt>Kind</dt><dd>${esc([event.category, event.type].filter(Boolean).join(' / ') || 'Not listed')}</dd>
        <dt>Travel</dt><dd>${esc(event.travelBucket || event.tier || 'Check route')}</dd>
        <dt>Source</dt><dd>${event.url ? `<a href="${esc(event.url)}" target="_blank" rel="noopener">${esc(event.source || 'Open source')}</a>` : esc(event.source || 'Not listed')}</dd>
      </dl>
      ${event.description ? `<p>${esc(event.description)}</p>` : ''}
      <div class="modal-actions">
        <a class="btn primary" target="_blank" rel="noopener" href="${esc(googleUrl(event))}">Open in Google Calendar</a>
        <button class="btn" type="button" data-download-ics="${esc(event.id)}">Download ICS</button>
      </div>
    `;
    $('detailDialog').showModal();
  }

  function downloadIcs(id) {
    const event = EVENTS.find(item => item.id === id);
    if (!event) return;
    const blob = new Blob([eventIcs(event)], { type: 'text/calendar;charset=utf-8' });
    downloadBlob(blob, `${event.date || 'event'}-${(event.title || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}.ics`);
  }

  function toast(message) {
    $('toast').textContent = message;
    $('toast').classList.add('show');
    window.setTimeout(() => $('toast').classList.remove('show'), 1700);
  }

  function wire() {
    $('searchBox').addEventListener('input', (event) => {
      state.q = event.target.value;
      render();
    });
    $('dateRange').addEventListener('change', (event) => {
      state.range = event.target.value;
      render();
    });
    $('modalClose').addEventListener('click', () => $('detailDialog').close());
    $('feedbackClose').addEventListener('click', () => $('feedbackDialog').close());
    $('cancelFeedbackBtn').addEventListener('click', () => $('feedbackDialog').close());
    $('feedbackForm').addEventListener('submit', (event) => {
      event.preventDefault();
      saveSkip();
      $('feedbackDialog').close();
    });
    document.addEventListener('click', (event) => {
      const lens = event.target.closest('[data-lens]');
      if (lens) {
        state.lens = lens.dataset.lens;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const open = event.target.closest('[data-open]');
      if (open) return openDetail(open.dataset.open);
      const save = event.target.closest('[data-save]');
      if (save) return toggleSave(save.dataset.save);
      const archive = event.target.closest('[data-archive]');
      if (archive) return toggleArchive(archive.dataset.archive);
      const like = event.target.closest('[data-like]');
      if (like) return saveLike(like.dataset.like);
      const skip = event.target.closest('[data-skip]');
      if (skip) return openFeedback(skip.dataset.skip);
      const remove = event.target.closest('[data-remove-feedback]');
      if (remove) return removeFeedback(remove.dataset.removeFeedback);
      const exportButton = event.target.closest('[data-export-feedback]');
      if (exportButton) return exportFeedback();
      const unarchive = event.target.closest('[data-unarchive-all]');
      if (unarchive) return unarchiveAll();
      const all = event.target.closest('[data-range-all]');
      if (all) {
        state.range = 'all';
        render();
      }
      const ics = event.target.closest('[data-download-ics]');
      if (ics) return downloadIcs(ics.dataset.downloadIcs);
    });
  }

  load();
  wire();
  render();
})();
