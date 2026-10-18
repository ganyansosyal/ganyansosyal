/* GanyanSosyal - Sadece Android uygulamasi (Capacitor) icinde calisir.
   Web / PWA surumunu etkilemez. Eskiden build sirasinda eklenen yamalar. */
(function () {
  function isNative() {
    var C = window.Capacitor;
    return !!(C && C.isNativePlatform && C.isNativePlatform());
  }

  function run() {
    var de = document.documentElement;
    if (de.classList.contains('gs-native')) return;
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

  if (isNative()) run();
  else document.addEventListener('DOMContentLoaded', function () { if (isNative()) run(); });
})();
