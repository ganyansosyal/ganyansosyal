/* Zorunlu güncelleme ekranı — mağaza uygulamasında çalışır.
   APK üretilirken window.APP_BUILD sayısı eklenir. Tarayıcıda bu sayı yoktur, ekran çıkmaz.
   version.json içindeki "min" sayısı APP_BUILD'den büyükse tam ekran güncelleme ekranı açılır.
   Tarayıcıda tasarımı görmek için: sitenin adresinin sonuna ?guncelleme-onizleme ekle. */
(function () {
  var VERSION_URL = 'https://ganyansosyal.github.io/ganyansosyal/version.json';
  var STORE_URL = 'https://play.google.com/store/apps/details?id=io.github.ganyansosyal.app';

  function stilEkle() {
    if (document.getElementById('upd-style')) return;
    var s = document.createElement('style');
    s.id = 'upd-style';
    s.textContent =
      '#upd-block{position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;overflow:hidden;' +
        'padding:max(28px,env(safe-area-inset-top)) 28px max(28px,env(safe-area-inset-bottom));' +
        'background:radial-gradient(120% 70% at 50% 0%,#15a077 0%,#0E7A5A 45%,#07523d 100%);' +
        'font-family:"Plus Jakarta Sans",system-ui,-apple-system,sans-serif;color:#fff;animation:updIn .35s ease-out}' +
      '#upd-block *{box-sizing:border-box}' +
      '#upd-block .u-glow{position:absolute;width:340px;height:340px;border-radius:50%;top:50%;left:50%;margin:-250px 0 0 -170px;' +
        'background:radial-gradient(circle,rgba(255,255,255,.22) 0%,rgba(255,255,255,0) 70%);animation:updPulse 3.2s ease-in-out infinite}' +
      '#upd-block .u-logo{position:relative;width:104px;height:104px;border-radius:28px;background:#fff;display:flex;align-items:center;justify-content:center;' +
        'box-shadow:0 18px 40px rgba(0,0,0,.28);margin-bottom:26px;animation:updFloat 3.4s ease-in-out infinite}' +
      '#upd-block .u-logo img{width:76px;height:76px;border-radius:18px;display:block}' +
      '#upd-block .u-badge{position:absolute;right:-10px;bottom:-10px;width:40px;height:40px;border-radius:50%;background:#fbbf24;color:#3b2a00;' +
        'display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;box-shadow:0 6px 16px rgba(0,0,0,.3);border:3px solid #0E7A5A}' +
      '#upd-block .u-brand{position:relative;font-size:15px;font-weight:800;letter-spacing:.3px;opacity:.9;margin-bottom:10px}' +
      '#upd-block .u-brand i{font-style:normal;color:#a7f3d0}' +
      '#upd-block h1{position:relative;margin:0 0 12px;font-size:28px;line-height:1.15;font-weight:800;letter-spacing:-.4px}' +
      '#upd-block p{position:relative;margin:0 auto 34px;max-width:300px;font-size:15.5px;line-height:1.55;font-weight:500;color:rgba(255,255,255,.86)}' +
      '#upd-block button{position:relative;width:100%;max-width:340px;border:0;border-radius:18px;padding:17px 20px;font-family:inherit;font-size:17px;font-weight:800;' +
        'color:#0E7A5A;background:#fff;box-shadow:0 12px 28px rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;gap:10px;-webkit-tap-highlight-color:transparent}' +
      '#upd-block button:active{transform:scale(.97)}' +
      '#upd-block .u-note{position:relative;margin-top:16px;font-size:12.5px;font-weight:600;color:rgba(255,255,255,.65)}' +
      '@keyframes updIn{from{opacity:0}to{opacity:1}}' +
      '@keyframes updFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}' +
      '@keyframes updPulse{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:1;transform:scale(1.12)}}';
    document.head.appendChild(s);
  }

  function goster(mesaj) {
    if (document.getElementById('upd-block')) return;
    stilEkle();
    var o = document.createElement('div');
    o.id = 'upd-block';
    o.innerHTML =
      '<div class="u-glow"></div>' +
      '<div class="u-logo"><img src="icon-192.png" alt="" onerror="this.style.display=\'none\'"><div class="u-badge">↑</div></div>' +
      '<div class="u-brand">Ganyan<i>Sosyal</i></div>' +
      '<h1>Yeni sürüm hazır</h1>' +
      '<p id="upd-msg"></p>' +
      '<button type="button" id="upd-btn">Güncelle</button>' +
      '<div class="u-note">Google Play’e yönlendirileceksin</div>';
    document.body.appendChild(o);
    document.getElementById('upd-msg').textContent = mesaj || 'Devam edebilmek için uygulamayı güncelle.';
    document.getElementById('upd-btn').onclick = function () { window.location.href = STORE_URL; };
  }

  // Tarayıcıda tasarımı görmek için önizleme
  if (/[?&]guncelleme-onizleme/.test(window.location.search)) {
    var goster0 = function () { goster('Devam edebilmek için uygulamayı güncelle.'); };
    if (document.body) goster0(); else document.addEventListener('DOMContentLoaded', goster0);
    return;
  }

  var build = window.APP_BUILD;
  if (typeof build !== 'number' || !isFinite(build)) return;

  function kontrol() {
    try {
      fetch(VERSION_URL + '?t=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (v) {
          if (v && Number(v.min) > build) goster(v.mesaj);
        })
        .catch(function () {});
    } catch (e) {}
  }

  kontrol();
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) kontrol();
  });
})();
