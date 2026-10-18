/* GanyanSosyal - Sadece Android uygulamasi (Capacitor) icinde calisir.
   Web / PWA surumunu etkilemez. Build sirasinda eklenen yamalar + resim indirme/paylasma koprusu. */
(function () {
  function isNative() {
    var C = window.Capacitor;
    return !!(C && C.isNativePlatform && C.isNativePlatform());
  }

  function gsBoot() {
    var de = document.documentElement;
    de.classList.add('gs-native');

    // Uygulama gibi davransin (kurulum cubuklari vb.)
    try { Object.defineProperty(navigator, 'standalone', { get: function () { return true; } }); } catch (e) {}

    // Service worker eski dosyayi onbellekten vermesin
    try {
      navigator.serviceWorker.getRegistrations().then(function (r) { r.forEach(function (x) { x.unregister(); }); });
      caches.keys().then(function (k) { k.forEach(function (c) { caches['delete'](c); }); });
      navigator.serviceWorker.register = function () { return Promise.resolve(); };
    } catch (e) {}

    // Gorunum duzeltmeleri (sadece uygulama icinde)
    var P = 'html.gs-native ';
    var nav = 'nav,[class*=bottom-nav],[class*=bottomnav],[class*=tabbar],[class*=tab-bar],[id*=bottomNav],[id*=bottom-nav],[id*=bottomnav]'.split(',');
    function scope(list) { return list.map(function (s) { return P + s; }).join(','); }
    var css = [
      P + ',' + P + 'body{overscroll-behavior-y:none;-webkit-text-size-adjust:100%;touch-action:manipulation}',
      P + '*{-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none}',
      scope(['button', 'a', '[onclick]', 'nav']) + '{-webkit-user-select:none;user-select:none}',
      scope(['input', 'textarea']) + '{-webkit-user-select:text;user-select:text}',
      scope(['button:active', 'a:active', '[onclick]:active']) + '{transform:none!important}',
      scope(nav) + '{position:fixed!important;bottom:0!important;left:0;right:0;transform:none!important;translate:none!important;transition:none!important;animation:none!important;will-change:auto!important}',
      scope(['nav *', '[class*=bottom-nav] *', '[class*=tabbar] *']) + '{transition:none!important;animation:none!important}',
      scope(['[id=au-install]', '[id=inst-bar]', '[id=dw-inst]']) + '{display:none!important}'
    ].join('\n');
    var s = document.createElement('style');
    s.id = 'gs-native-css';
    s.textContent = css;
    (document.head || de).appendChild(s);
  }

  function gsBridge() {
    // Build zaten ayri native-bridge.js eklediyse ikinci kez calistirma
    if (document.querySelector('script[src*="native-bridge.js"]')) return;
  var C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  var P = C.Plugins || {};
  var FS = P.Filesystem, SH = P.Share;
  if (!FS || !SH) return;

  function blobToBase64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onloadend = function () { res(String(r.result).split(',')[1]); };
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }
  function safeName(n) { return (n || 'kupon.png').replace(/[^\w.\-]+/g, '_'); }
  function cancelled(e) {
    var m = String((e && (e.message || e)) || '').toLowerCase();
    return m.indexOf('cancel') > -1 || m.indexOf('abort') > -1;
  }
  function abort() { var e = new Error('canceled'); e.name = 'AbortError'; return e; }

  function saveAndShare(blob, name, title, text) {
    return blobToBase64(blob)
      .then(function (b64) {
        return FS.writeFile({ path: safeName(name), data: b64, directory: 'CACHE' });
      })
      .then(function (r) {
        return SH.share({
          title: title || 'GanyanSosyal',
          text: text || '',
          files: [r.uri],
          dialogTitle: 'Kupon görseli'
        });
      })
      .catch(function (e) { throw cancelled(e) ? abort() : e; });
  }

  function uniqueName(n) {
    n = safeName(n || 'kupon.png');
    var i = n.lastIndexOf('.');
    var base = i > 0 ? n.slice(0, i) : n, ext = i > 0 ? n.slice(i) : '.png';
    return base + '_' + Date.now() + ext;
  }
  // Indir: once dogrudan galeriye (Pictures/GanyanSosyal) kaydet, olmazsa paylasim menusu
  function handleAnchor(a) {
    return fetch(a.href)
      .then(function (r) { return r.blob(); })
      .then(function (b) {
        var name = uniqueName(a.download);
        if (window.NativeSave) {
          return blobToBase64(b).then(function (b64) {
            var ok = false;
            try { ok = window.NativeSave.saveImage(b64, name, b.type || 'image/png'); } catch (e) {}
            if (!ok) return saveAndShare(b, name);
          });
        }
        return saveAndShare(b, name);
      })
      .catch(function (e) { if (!cancelled(e)) console.error('Indirme hatasi', e); });
  }
  function isFileLink(a) {
    return a && a.hasAttribute && a.hasAttribute('download') && /^(blob:|data:)/.test(a.href);
  }

  // a.click() ile kodla tetiklenen indirmeler
  var origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (isFileLink(this)) { handleAnchor(this); return; }
    return origClick.apply(this, arguments);
  };
  // DOM'a eklenmis <a download> tiklamalari
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[download]') : null;
    if (isFileLink(a)) { e.preventDefault(); e.stopPropagation(); handleAnchor(a); }
  }, true);

  // navigator.share (dosyali paylasim dahil)
  function define(name, fn) {
    try { Object.defineProperty(navigator, name, { value: fn, configurable: true, writable: true }); }
    catch (e) { try { navigator[name] = fn; } catch (_) {} }
  }
  define('canShare', function () { return true; });
  define('share', function (d) {
    d = d || {};
    var f = d.files && d.files[0];
    if (f) return saveAndShare(f, f.name, d.title, d.text);
    return SH.share({ title: d.title, text: d.text, url: d.url })
      .catch(function (e) { throw cancelled(e) ? abort() : e; });
  });
  }

  var done = false;
  function run() {
    if (done || !isNative()) return;
    done = true;
    gsBoot();
    gsBridge();
  }
  run();
  if (!done) document.addEventListener('DOMContentLoaded', run);
})();
