/* Kimchi — Cloudflare D1 sync client
   Injected by functions/_middleware.js so the existing calculator can stay intact. */
(function () {
  'use strict';

  var API = '/api/sync';
  var syncing = false;
  var queued = false;
  var cloudReady = false;

  function state() {
    return {
      batches: Array.isArray(window.batches) ? window.batches : [],
      inkopItems: Array.isArray(window.inkopItems) ? window.inkopItems : [],
      savedRecipes: Array.isArray(window.savedRecipes) ? window.savedRecipes : []
    };
  }

  function localStateEmpty(s) {
    return !s.batches.length && !s.inkopItems.length && !s.savedRecipes.length;
  }

  function localPersist() {
    try {
      localStorage.setItem('kimchi_batches', JSON.stringify(window.batches || []));
      localStorage.setItem('kimchi_inkop', JSON.stringify(window.inkopItems || []));
      localStorage.setItem('kimchi_saved_recipes', JSON.stringify(window.savedRecipes || []));
    } catch (_) {}
  }

  function toast(text, ok) {
    var old = document.getElementById('cloudSyncToast');
    if (old) old.remove();
    var el = document.createElement('div');
    el.id = 'cloudSyncToast';
    el.textContent = text;
    el.style.cssText = 'position:fixed;left:50%;bottom:calc(64px + env(safe-area-inset-bottom) + 12px);transform:translateX(-50%);z-index:9999;background:' + (ok ? '#2a7a48' : '#a01e14') + ';color:#fff;padding:9px 14px;border-radius:10px;font:600 13px DM Sans,sans-serif;box-shadow:0 5px 25px rgba(0,0,0,.18);pointer-events:none;transition:opacity .25s';
    document.body.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 300); }, 2200);
  }

  async function pullCloud() {
    try {
      var res = await fetch(API, { credentials: 'include', cache: 'no-store' });
      if (res.status === 401) {
        toast('Logga in med Cloudflare Access för molnsparning', false);
        return;
      }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var body = await res.json();
      var local = state();

      if (body.state && !localStateEmpty(body.state)) {
        window.batches = Array.isArray(body.state.batches) ? body.state.batches : [];
        window.inkopItems = Array.isArray(body.state.inkopItems) ? body.state.inkopItems : [];
        window.savedRecipes = Array.isArray(body.state.savedRecipes) ? body.state.savedRecipes : [];
        localPersist();
      } else if (!body.state && !localStateEmpty(local)) {
        await pushCloud(local);
      }

      if (typeof window.renderBatches === 'function') window.renderBatches();
      if (typeof window.renderInkop === 'function') window.renderInkop();
      if (typeof window.renderStats === 'function') window.renderStats();
      if (typeof window.renderSavedRecipes === 'function') window.renderSavedRecipes();
      cloudReady = true;

      var banner = document.getElementById('syncBanner');
      if (banner) {
        var txt = document.getElementById('syncBannerText');
        if (txt) txt.textContent = '☁ Synkat med Cloudflare';
        banner.className = 'sync-banner visible';
        setTimeout(function () { banner.className = 'sync-banner'; }, 2500);
      }
    } catch (e) {
      console.warn('Kimchi cloud sync:', e);
    }
  }

  async function pushCloud(s) {
    var res = await fetch(API, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ state: s })
    });
    if (res.status === 401) {
      toast('Cloudflare Access krävs för molnsparning', false);
      return false;
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return true;
  }

  function queueSync() {
    if (!cloudReady) return;
    queued = true;
    clearTimeout(queueSync.timer);
    queueSync.timer = setTimeout(runSync, 350);
  }

  async function runSync() {
    if (syncing) return;
    if (!queued) return;
    queued = false;
    syncing = true;
    try { await pushCloud(state()); }
    catch (e) { console.warn('Kimchi cloud sync:', e); queued = true; }
    finally { syncing = false; }
  }

  // Wrap the existing local persistence functions. Existing UI behaviour is preserved.
  function wrap(name) {
    var original = window[name];
    if (typeof original !== 'function') return;
    window[name] = function () {
      var result = original.apply(this, arguments);
      queueSync();
      return result;
    };
  }

  wrap('saveBatches');
  wrap('saveInkop');
  wrap('persistSavedRecipes');

  // Small cloud status indicator in the Praktiskt footer.
  var style = document.createElement('style');
  style.textContent = '#cloudSyncToast{font-family:DM Sans,sans-serif}.cloud-status{font-size:.7rem;color:var(--green);margin-top:.35rem;text-align:center}';
  document.head.appendChild(style);

  window.kimchiCloudSync = {
    sync: function () { queued = true; runSync(); },
    pull: pullCloud,
    push: function () { return pushCloud(state()); }
  };

  // Run after the existing inline application script has initialized its state.
  pullCloud();
})();
