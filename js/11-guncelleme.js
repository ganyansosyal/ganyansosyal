/* Zorunlu güncelleme uyarısı — sadece mağaza uygulamasında çalışır.
   APK üretilirken window.APP_BUILD sayısı eklenir. Sitede (tarayıcıda) bu sayı yoktur, uyarı çıkmaz.
   version.json içindeki "min" sayısı, uygulamanın APP_BUILD sayısından büyükse pencere açılır. */
(function () {
  var build = window.APP_BUILD;
  if (typeof build !== 'number' || !isFinite(build)) return;

  var VERSION_URL = 'https://ganyansosyal.github.io/ganyansosyal/version.json';
  var STORE_URL = 'https://play.google.com/store/apps/details?id=io.github.ganyansosyal.app';

  function goster(mesaj) {
    if (document.getElementById('upd-block')) return;
    var o = document.createElement('div');
    o.id = 'upd-block';
    o.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483000;background:rgba(15,23,42,.78);display:flex;align-items:center;justify-content:center;padding:24px;font-family:"Plus Jakarta Sans",system-ui,sans-serif';
    var c = document.createElement('div');
    c.style.cssText = 'background:#fff;border-radius:24px;padding:28px 22px 22px;max-width:340px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.35)';
    var ik = document.createElement('div');
    ik.textContent = '⬆️';
    ik.style.cssText = 'font-size:40px;margin-bottom:10px';
    var h = document.createElement('div');
    h.textContent = 'Yeni sürüm çıktı';
    h.style.cssText = 'font-size:20px;font-weight:800;color:#0f172a;margin-bottom:8px';
    var p = document.createElement('div');
    p.textContent = mesaj || 'Devam edebilmek için uygulamayı güncelle.';
    p.style.cssText = 'font-size:14px;line-height:1.5;color:#475569;margin-bottom:20px';
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Güncelle';
    b.style.cssText = 'width:100%;border:0;border-radius:14px;padding:14px;font-size:16px;font-weight:800;color:#fff;background:#0E7A5A';
    b.onclick = function () { window.location.href = STORE_URL; };
    c.appendChild(ik); c.appendChild(h); c.appendChild(p); c.appendChild(b);
    o.appendChild(c);
    document.body.appendChild(o);
  }

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
