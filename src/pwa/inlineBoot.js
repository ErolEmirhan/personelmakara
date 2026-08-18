/**
 * index.html'e inline enjekte edilir — hiçbir modül yüklenmeden ÖNCE çalışır.
 * ASSETS listesi build sırasında vite plugin tarafından enjekte edilir.
 */
(function makaraInlineBoot() {
  var ASSETS = __MAKARA_ASSETS_JSON__;

  function getBasePath() {
    var baseTag = document.querySelector('base');
    var base = (baseTag && baseTag.getAttribute('href')) || '/';
    if (base.charAt(0) !== '/') {
      try {
        base = new URL(base, location.href).pathname;
      } catch (e) {
        base = '/';
      }
    }
    if (base.charAt(base.length - 1) !== '/') base += '/';
    return base;
  }

  function buildUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    var base = getBasePath();
    if (path.charAt(0) === '/') return location.origin + path;
    return location.origin + base + path.replace(/^\.\//, '');
  }

  function readLocalBuildVersion() {
    var meta = document.querySelector('meta[name="makara-build"]');
    return meta ? meta.getAttribute('content') : null;
  }

  function parseRemoteBuildVersion(html) {
    var match = html.match(/name=["']makara-build["']\s+content=["']([^"']+)["']/i);
    return match ? match[1] : null;
  }

  function redirectToReset() {
    var url = new URL(location.href);
    url.searchParams.set('reset-sw', '1');
    url.searchParams.set('_makara_v', String(Date.now()));
    location.replace(url.toString());
  }

  function stripRecoveryParams() {
    var url = new URL(location.href);
    url.searchParams.delete('reset-sw');
    url.searchParams.delete('_makara_v');
    url.searchParams.delete('makara-build-check');
    var qs = url.searchParams.toString();
    return url.pathname + (qs ? '?' + qs : '') + url.hash;
  }

  function purgeCachesAndSw() {
    var tasks = [];

    if ('serviceWorker' in navigator) {
      tasks.push(
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(regs.map(function (reg) { return reg.unregister(); }));
        })
      );
    }

    if ('caches' in window) {
      tasks.push(
        caches.keys().then(function (keys) {
          return Promise.all(keys.map(function (key) { return caches.delete(key); }));
        })
      );
    }

    return Promise.all(tasks).catch(function () {});
  }

  function loadStylesheets() {
    (ASSETS.stylesheets || []).forEach(function (href) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.crossOrigin = 'anonymous';
      link.href = buildUrl(href);
      document.head.appendChild(link);
    });
  }

  function loadModuleScripts() {
    var scripts = ASSETS.moduleScripts || [];
    var index = 0;

    function loadNext() {
      if (index >= scripts.length) {
        return;
      }
      var src = scripts[index++];
      var el = document.createElement('script');
      el.type = 'module';
      el.crossOrigin = 'anonymous';
      el.src = buildUrl(src);
      el.onload = loadNext;
      el.onerror = function () {
        redirectToReset();
      };
      document.head.appendChild(el);
    }

    loadNext();
  }

  function injectInlineModules() {
    (ASSETS.inlineModules || []).forEach(function (code) {
      var el = document.createElement('script');
      el.type = 'module';
      el.textContent = code;
      document.head.appendChild(el);
    });
  }

  function injectLegacyScripts() {
    (ASSETS.legacyScripts || []).forEach(function (item) {
      if (item.html) {
        var tpl = document.createElement('template');
        tpl.innerHTML = item.html.trim();
        var node = tpl.content.firstChild;
        if (node) document.body.appendChild(node);
        return;
      }
      if (!item.src) return;
      var el = document.createElement('script');
      el.nomodule = true;
      if (item.id) el.id = item.id;
      if (item.dataSrc) el.setAttribute('data-src', item.dataSrc);
      el.crossOrigin = 'anonymous';
      el.src = buildUrl(item.src);
      if (item.dataSrc && item.id === 'vite-legacy-entry') {
        el.textContent = "System.import(document.getElementById('vite-legacy-entry').getAttribute('data-src'))";
      }
      document.body.appendChild(el);
    });
  }

  function fetchRemoteBuildVersion() {
    var indexUrl = buildUrl('index.html') + '?makara-build-check=' + Date.now();
    return fetch(indexUrl, { cache: 'no-store', credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) return null;
        return res.text();
      })
      .then(function (html) {
        return html ? parseRemoteBuildVersion(html) : null;
      })
      .catch(function () {
        return null;
      });
  }

  function startApp() {
    loadStylesheets();
    loadModuleScripts();
    injectInlineModules();
    injectLegacyScripts();
  }

  function run() {
    var params = new URLSearchParams(location.search);

    if (params.get('reset-sw') === '1') {
      purgeCachesAndSw().then(function () {
        try {
          localStorage.removeItem('makara-app-version');
        } catch (e) { /* ignore */ }
        var url = new URL(location.href);
        url.searchParams.delete('reset-sw');
        url.searchParams.set('_makara_v', String(Date.now()));
        location.replace(url.toString());
      });
      return;
    }

    var localVersion = readLocalBuildVersion();

    fetchRemoteBuildVersion().then(function (remoteVersion) {
      if (remoteVersion && localVersion && remoteVersion !== localVersion) {
        redirectToReset();
        return;
      }

      try {
        if (remoteVersion) localStorage.setItem('makara-app-version', remoteVersion);
        else if (localVersion) localStorage.setItem('makara-app-version', localVersion);
      } catch (e) { /* ignore */ }

      startApp();
    });

    window.setTimeout(function () {
      if (!window.__makaraBootOk) {
        redirectToReset();
      }
    }, 22000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
