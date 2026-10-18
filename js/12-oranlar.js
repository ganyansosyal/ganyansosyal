/* ===== Oranlar sekmesi: ganyan oran geçmişi (ganyan-oran worker'ından) ===== */
// Worker adresi: Cloudflare'de açtığın oran kaydedici worker'ın adresi (sonunda / olmasın)
const ORAN_WORKER = 'https://ganyan-oran.bilyoncu001.workers.dev';

const ORN = { city: '', race: 0, gun: '', data: null, at: 0, err: '', busy: false, timer: null, acik: {}, tum: {} };
const ORN_LIM = 8;   // açık atta ilk gösterilen kayıt sayısı

const ornFmt = x => String(Math.round(x * 10) / 10).replace('.', ',');   // 5.6 → "5,6", 5 → "5"
const ornSaat = ts => { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

// "DIYARBAKIR" → TJK'daki önek ("DBAKIR") eşleştirmesi: şehir adından worker'daki anahtar önekini bulur
function ornOnek(ad, onekler){
  const tam = turkceNormalizeAnahtar(ad).replace(/HIPODROMU$/, '');
  const ilk = turkceNormalizeAnahtar(String(ad).trim().split(/\s+/)[0] || '');
  const TAKMA = { DIYARBAKIR: ['DBAKIR'], SANLIURFA: ['SURFA', 'URFA'], KOCAELI: ['KOCAELI', 'IZMIT'] };
  for(const d of [ilk, tam]){ for(const t of (TAKMA[d] || [])) if(onekler.includes(t)) return t; if(d && onekler.includes(d)) return d; }
  for(const d of [ilk, tam]){ if(!d || d.length < 4) continue; const e = onekler.find(o => o.length >= 4 && (o.startsWith(d) || d.startsWith(o))); if(e) return e; }
  return null;
}

// Oranlar paneli ekranda mı? (visible() sekme adına bağlı kalmadan, DOM'dan bakar)
function ornGorunuyor(){
  const b = $('oranlar-body');
  if(!b) return false;
  try{ if(typeof visible === 'function' && visible() === 'oranlar') return true; }catch(e){}
  return b.getClientRects().length > 0;
}

async function ornYukle(zorla){
  if(ORN.busy) return;
  if(!zorla && ORN.at && Date.now() - ORN.at < 60000 && (ORN.gun === viewIso || ORN.err)) return;
  ORN.busy = true;
  let degisti = true;
  try{
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 10000);
    let r;
    try{ r = await fetch(ORAN_WORKER + '/oran?gun=' + encodeURIComponent(viewIso), { cache: 'no-store', signal: ac.signal }); }
    finally{ clearTimeout(to); }
    if(!r.ok) throw new Error('HTTP ' + r.status);
    const yeni = await r.json();
    const sig = JSON.stringify(yeni);
    // Veri ve durum aynıysa ekranı yeniden çizme (titreme/zıplama olmasın)
    degisti = !(ORN.data && ORN.sig === sig && !ORN.err && ORN.gun === viewIso);
    ORN.data = yeni; ORN.sig = sig; ORN.gun = viewIso; ORN.at = Date.now(); ORN.err = '';
  }catch(e){
    const msg = String((e && e.message) || e);
    degisti = ORN.err !== msg;
    ORN.err = msg; ORN.at = Date.now();
  }
  ORN.busy = false;
  if(degisti && ornGorunuyor()) renderOranlar(true);
}

function ornSatir(isim, no, seri, key){
  // Bu atın oranları, art arda aynı olanlar tek sayılır
  const pts = [];
  seri.forEach(s => { const v = s.o[String(no)]; if(v > 0 && v < 999 && (!pts.length || pts[pts.length - 1].v !== v)) pts.push({ t: s.t, v }); });
  if(!pts.length) return '';
  const acik = !!ORN.acik[key];
  let det = '';
  if(acik){
    const r = pts.slice().reverse();
    const g = ORN.tum[key] ? r : r.slice(0, ORN_LIM);
    det = '<div class="orn-det">' + g.map(p => `<div class="orn-d"><span>${ornSaat(p.t)}</span><b>${ornFmt(p.v)}</b></div>`).join('');
    if(!ORN.tum[key] && r.length > ORN_LIM) det += `<div class="orn-more" onclick="ornTum(this)">Tümünü göster (${r.length - ORN_LIM} kayıt daha)</div>`;
    det += '</div>';
  }
  return `<div class="orn-it${acik ? ' o' : ''}" data-k="${esc(key)}">
    <div class="orn-row" onclick="ornAc(this)">
      <div class="orn-n">${esc(String(no))}</div>
      <div class="orn-ad">${esc(isim || '')}<span class="orn-cnt">${pts.length} kayıt</span></div>
      <div class="orn-num orn-ilk">${ornFmt(pts[0].v)}</div>
      <div class="orn-num orn-son">${ornFmt(pts[pts.length - 1].v)}</div>
    </div>${det}
  </div>`;
}

function ornAc(el){
  const k = el.closest('.orn-it').dataset.k;
  ORN.acik[k] = !ORN.acik[k];
  renderOranlar(true);
}
function ornTum(el){
  const k = el.closest('.orn-it').dataset.k;
  ORN.tum[k] = true;
  renderOranlar(true);
}

function renderOranlar(sessiz){
  const box = $('oranlar-body'); if(!box) return;
  const sehirler = Object.keys(BUL.data || {});
  if(!sehirler.length){
    box.innerHTML = `<div class="ru-t">Oranlar</div><div class="empty">${BUL.status === 'err' ? 'Program alınamadı. Tahmin Yap sekmesinden tekrar deneyebilirsin.' : 'Program yükleniyor…'}</div>`;
    if(!BUL.status || BUL.status === 'idle') try{ loadBulten(false); }catch(e){}
    clearTimeout(ORN.timer); ORN.timer = setTimeout(() => { if(ornGorunuyor()) renderOranlar(true); }, 1500);
    return;
  }
  if(!ORN.city || !BUL.data[ORN.city]) ORN.city = (typeof city === 'string' && BUL.data[city]) ? city : sehirler[0];
  const kosular = BUL.data[ORN.city] || [];
  if(!kosular.find(k => +k.no === ORN.race)) ORN.race = +(kosular[0] && kosular[0].no) || 1;
  if(!sessiz) ornYukle(true); else ornYukle(false);

  const cip = sehirler.map(c => `<button class="orn-chip ${c === ORN.city ? 'on' : ''}" onclick="ornSec('${esc(c)}',0)">${esc(c)}</button>`).join('');
  const kcip = kosular.map(k => `<button class="orn-chip k ${+k.no === ORN.race ? 'on' : ''}" onclick="ornSec('${esc(ORN.city)}',${+k.no})">${+k.no}. Koşu</button>`).join('');
  const k = kosular.find(x => +x.no === ORN.race);

  let govde;
  if(ORN.err && !ORN.data) govde = `<div class="empty">Oranlar alınamadı (${esc(ORN.err)}).<br>Worker adresini ve D1 bağlantısını kontrol et.</div>`;
  else if(!ORN.data) govde = '<div class="empty">Oranlar yükleniyor…</div>';
  else {
    const onekler = [...new Set(Object.keys(ORN.data).map(x => x.split('-')[0]))];
    const onek = ornOnek(ORN.city, onekler);
    const seri = onek ? (ORN.data[onek + '-' + ORN.race] || []) : [];
    if(!seri.length){
      const anh = Object.keys(ORN.data || {});
      govde = '<div class="empty">Bu koşu için henüz kayıtlı oran yok.<br><small>Oranlar 5 dakikada bir kaydedilir.</small>'
        + '<br><small style="opacity:.6">[teşhis] aranan: ' + esc((onek || 'EŞLEŞMEDİ') + '-' + ORN.race) + ' · worker anahtarları: ' + esc(anh.length ? anh.slice(0, 12).join(', ') + (anh.length > 12 ? '…' : '') : 'BOŞ') + ' · gün: ' + esc(viewIso) + '</small></div>';
    }
    else {
      const satirlar = (k.atlar || []).filter(a => !a.kosmaz).map(a => ornSatir(a.isim, a.no, seri, ORN.city + '|' + ORN.race + '|' + a.no)).join('');
      const son = seri[seri.length - 1].t;
      govde = `<div class="orn-bilgi">${seri.length} kayıt · son ${ornSaat(son)}</div><div class="orn-list"><div class="orn-hd"><span>No</span><span>At</span><span>Açılış</span><span>Son</span></div>${satirlar || '<div class="empty">At bulunamadı.</div>'}</div>`;
    }
  }
  // Yeniden çizmeden önce kaydırma konumlarını sakla
  const kaydirTut = [...box.querySelectorAll('.orn-chips')].map(e => e.scrollLeft);
  const ustler = []; for(let el = box; el; el = el.parentElement){ if(el.scrollTop > 0) ustler.push([el, el.scrollTop]); }
  const penY = window.scrollY;
  box.innerHTML = `<div class="ru-t">Oranlar</div>
    <div class="ru-s">Ganyan oranlarının açılıştan bu yana değişimi. Uygulama kapalıyken de 5 dakikada bir kaydedilir.</div>
    <div class="orn-chips">${cip}</div>
    <div class="orn-chips">${kcip}</div>
    ${k && k.saat ? `<div class="orn-saat">${esc(ORN.city)} · ${+k.no}. Koşu · ${esc(String(k.saat))}${ORN.err && ORN.data ? ' · <span class="orn-hata">yenilenemedi</span>' : ''}</div>` : ''}
    ${govde}
    <button class="orn-yenile" onclick="ornYukle(true)">Yenile</button>`;
  // Kaydırma konumlarını geri yükle
  box.querySelectorAll('.orn-chips').forEach((e, i) => { e.scrollLeft = kaydirTut[i] || 0; });
  ustler.forEach(([el, y]) => { el.scrollTop = y; });
  if(window.scrollY !== penY) window.scrollTo(0, penY);
  // Açıkken dakikada bir kendini yeniler
  clearTimeout(ORN.timer);
  ORN.timer = setTimeout(() => { if(ornGorunuyor()) ornYukle(true); }, 60000);
}

function ornSec(c, r){
  ORN.city = c; ORN.race = r;
  renderOranlar(true);
}
