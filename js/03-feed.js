// ---- KUPON: ayak ayak görünüm ----
const ALTILI_MAX = 1500;   // 6'lı ve 7'li Ganyan kuponu en fazla bu tutar (TL) olabilir
const LIMITLI_TURLER = ["6'lı Ganyan", "7'li Ganyan"];
const limitliMi = t => LIMITLI_TURLER.indexOf(t) >= 0;
const kuponMax = () => { try{ return isAdminKey(ME) ? Infinity : ALTILI_MAX; }catch(e){ return ALTILI_MAX; } };   // admin: sınırsız, kullanıcı: 1500 TL
const ASGARI = 20;   // TJK: 5 Ocak 2026'dan beri tüm müşterek bahislerde asgari iştirak bedeli 20 TL
const money = n => n.toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.') + ' ₺';
const placeN = () => 2;   // Plase: yönetmelik ve TJK sonuçları: at sayısından bağımsız ilk 2 (Plase İkili ayrı: ilk 3)
// Plase, Ganyan & Plase ve 7'li Plase: ilk 2. Plase İkili: ilk 3 iki atı bulmak.
const placeCnt = (c, field) => (c && ruleOf(c) === 'pl2') ? 3 : placeN();
function raceTime(r, c = city){
  const k = raceInfo(c, r);
  if(k && k.saat) return k.saat;
  const m = 17*60 + 30*(r-1); return String(Math.floor(m/60)).padStart(2,'0') + ':' + String(m%60).padStart(2,'0');
}
function L(r, picks, win = null, c = city){ return {r, t: raceTime(r, c), picks, win}; }
// Sıralı bahis ayağı: aynı koşu, i. sıra (res = koşunun geliş sırası)
function S(r, i, picks, res = null, c = city){ return {r, t: raceTime(r, c), picks, win: null, slot: i, res}; }

// Bahis türleri (sıra: seçici panelde görünen sıra)
const TYPES = [
  {k:'p7',  name:"7'li Plase",   mode:'legs', n:7, rule:'place', sub:'7 ayak',  desc:"7 ayakta plase'ye girecek atları bul"},
  {k:'g7',  name:"7'li Ganyan",  mode:'legs', n:7, rule:'win',   sub:'7 ayak'},
  {k:'g6',  name:"6'lı Ganyan",  mode:'legs', n:6, rule:'win',   sub:'6 ayak', si:0},
  {k:'g6b', name:"6'lı Ganyan",  mode:'legs', n:6, rule:'win',   sub:'6 ayak', si:1},   // 2. altılı: sadece bülten ikinci başlangıcı bildiriyorsa görünür
  {k:'g5',  name:"5'li Ganyan",  mode:'legs', n:5, rule:'win',   sub:'5 ayak', si:0},
  {k:'g5b', name:"5'li Ganyan",  mode:'legs', n:5, rule:'win',   sub:'5 ayak', si:1},   // 2. 5'li: sadece bülten ikinci başlangıcı bildiriyorsa görünür
  {k:'g4',  name:"4'lü Ganyan",  mode:'legs', n:4, rule:'win',   sub:'4 ayak', si:0},
  {k:'g4b', name:"4'lü Ganyan",  mode:'legs', n:4, rule:'win',   sub:'4 ayak', si:1},   // 2. 4'lü: sadece bülten ikinci başlangıcı bildiriyorsa görünür
  {k:'g3',  name:"3'lü Ganyan",  mode:'legs', n:3, rule:'win',   sub:'3 ayak', si:0},
  {k:'g3b', name:"3'lü Ganyan",  mode:'legs', n:3, rule:'win',   sub:'3 ayak', si:1},   // 2. 3'lü: sadece bülten ikinci başlangıcı bildiriyorsa görünür
  {k:'g1',  name:'Ganyan',       mode:'race', rule:'win',   sub:'1. gelen',  desc:'Tek koşuda kazananı bul'},
  {k:'pl',  name:'Plase',        mode:'race', rule:'place', sub:'plase',     desc:"Seçtiğin at plase'ye girer mi?", hint:'Bir veya daha fazla at seç. Plase: birinci veya ikinci gelen at tutar (en az 7 atlı koşu).'},
  {k:'gp',  name:'Ganyan & Plase', mode:'race', rule:'gp', sub:'1. + plase', desc:'Hem ganyan hem plase oyna', hint:'Seçtiğin her at hem ganyan hem plase oynar.'},
  {k:'si',  name:'Sıralı İkili', mode:'race', rule:'slots', slots:2, sub:'sıralı ilk 2', desc:'İlk iki atı sırasıyla bul', hint:'Üstteki sekmeden sırayı seç (1. At / 2. At), her sıra için at işaretle.'},
  {k:'siv', name:'Sıralı İkili (Virgüllü)', mode:'race', rule:'slots', slots:2, one:true, vir:true, sub:'sıralı ilk 2', desc:'En az 2 at seç, sıran önemli (virgüllü)', hint:'Atlara sırayla dokun (en az 2, istediğin kadar). Dokunma sırası = sıralaman; tutmak için ilk 2 at listede bu sırayla yer almalı.'},
  {k:'ik',  name:'İkili Bahis',  mode:'race', rule:'any2', tabs:2, sub:'ilk 2', desc:'İlk iki atı sırasız bul', hint:'1. At ve 2. At sekmelerinden birer veya daha fazla at seç. Her çift, farklı sekmelerden bir attır.'},
  {k:'ik1', name:'İkili Bahis (Tek kolon)', mode:'race', rule:'any2', sub:'tek kolon', desc:'İlk iki at, tek kolon', hint:'En az 2 at seç. Seçtiğin atlardan olası tüm ikili çiftler oynanır (3 at = 3 kolon, 4 at = 6 kolon).'},
  {k:'c2',  name:'Çifte Bahis',  mode:'legs', n:2, rule:'win', sub:'2 ayak', si:0},
  {k:'c2b', name:'Çifte Bahis',  mode:'legs', n:2, rule:'win', sub:'2 ayak', si:1},   // 2. çifte: sadece bülten ikinci başlangıcı bildiriyorsa görünür
  {k:'pi',  name:'Plase İkili',  mode:'race', rule:'pl2', tabs:2, sub:'plase 2 at', desc:"Plase'ye girecek iki atı bul", hint:"1. At ve 2. At sekmelerinden at seç. Her çift, farklı sekmelerden bir attır."},
  {k:'pi1', name:'Plase İkili (Tek kolon)', mode:'race', rule:'pl2', exact:2, sub:'tek kolon', desc:'Plase ikili, tek kolon', hint:'Tam 2 at seç.'},
  {k:'su',  name:'Sıralı Üçlü',  mode:'race', rule:'slots', slots:3, sub:'sıralı ilk 3', desc:'İlk üç atı sırasıyla bul', hint:'Üstteki sekmeden sırayı seç (1. / 2. / 3. At), her sıra için at işaretle.'},
  {k:'suv', name:'Sıralı Üçlü (Virgüllü)', mode:'race', rule:'slots', slots:3, one:true, vir:true, sub:'sıralı ilk 3', desc:'En az 3 at seç, sıran önemli (virgüllü)', hint:'Atlara sırayla dokun (en az 3, istediğin kadar). Dokunma sırası = sıralaman; tutmak için ilk 3 at listede bu sırayla yer almalı.'},
  {k:'tb',  name:'Tabela Bahis', mode:'race', rule:'any4', exact:4, tabs:4, per:1, sub:'ilk 4', desc:'İlk dört atı sırasız bul', hint:'Her sekmeye bir at seç (1.–4. At). İlk dördü sırasıyla ya da sırasız bulursan tutar.'},
  {k:'tbv', name:'Tabela (Virgüllü)', mode:'race', rule:'any4', sub:'ilk 4', desc:'İlk dört atı sırasız bul, çoklu seçim', hint:'İlk dörde girebilecek atları seç (en az 4).'},
  {k:'s5',  name:'Sıralı Beşli', mode:'race', rule:'slots', slots:5, sub:'sıralı ilk 5', desc:'İlk beş atı sırasıyla bul', hint:'Üstteki sekmeden sırayı seç (1. – 5. At), her sıra için at işaretle.'},
  {k:'s5v', name:'Sıralı Beşli (Virgüllü)', mode:'race', rule:'slots', slots:5, one:true, vir:true, sub:'sıralı ilk 5', desc:'En az 5 at seç, sıran önemli (virgüllü)', hint:'Atlara sırayla dokun (en az 5, istediğin kadar). Dokunma sırası = sıralaman; tutmak için ilk 5 at listede bu sırayla yer almalı.'}
];
const curT = () => TYPES.find(t => t.k === betK);
function typeName(n){ const t = TYPES.find(x => x.mode === 'legs' && x.rule === 'win' && x.n === n); return t ? t.name : (n === 1 ? 'Ganyan' : n + ' Ayaklı Kupon'); }
const ruleOf = c => c.rule || 'win';
// Kupon henüz eksikken "şimdilik" kolon sayısı (boş ayaklar sayılmaz)
function kolonNow(c){
  const part = {...c, legs: c.legs.filter(l => l.picks.length)};
  return part.legs.length ? kolon(part) : 0;
}

// Kolon sayısı (kuponun kaç farklı kombinasyondan oluştuğu)
// Sekmeli İkili / Plase İkili: çiftler farklı sekmelerden birer attır (sırasız, tekrarsız)
function setPairs(sets){
  const A = (sets[0] && sets[0].p) || [], B = (sets[1] && sets[1].p) || [], seen = {};
  A.forEach(a => B.forEach(b => { if(a !== b) seen[Math.min(a, b) + '-' + Math.max(a, b)] = 1; }));
  return Object.keys(seen);
}
// Virgüllü sıralı: n atlık sıralı listeden k'lı sıralı alt diziler = C(n, k)
function comb(n, k){ if(k < 0 || k > n) return 0; let r = 1; for(let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); }
function kolon(c){
  const ps = c.legs.map(l => l.picks), rule = ruleOf(c);
  if(c.vir) return c.legs.length >= c.vir ? comb(c.legs.length, c.vir) : 0;
  if(rule === 'slots'){
    let cnt = 0;
    (function rec(i, used){
      if(i === ps.length){ cnt++; return; }
      ps[i].forEach(n => { if(!used.includes(n)) rec(i + 1, used.concat(n)); });
    })(0, []);
    return cnt;
  }
  if((rule === 'any2' || rule === 'pl2') && c.legs[0].sets) return setPairs(c.legs[0].sets).length;
  if(rule === 'any2' || rule === 'pl2'){ const m = ps[0].length; return m * (m - 1) / 2; }
  if(rule === 'any4'){ const m = ps[0].length; return m < 4 ? 0 : m * (m - 1) * (m - 2) * (m - 3) / 24; }
  if(rule === 'gp') return ps[0].length;   // her at 1 kolon; Ganyan + Plase iki bahis olduğu için birim fiyat 2 TL (birimFiyat)
  return ps.reduce((a, p) => a * p.length, 1);
}

// Bir ayağın sonucu: st = 'p' (bekliyor) | 'h' (tuttu) | 'm' (kaçtı); cls = at kutusunun rengi
// Ayağın sonucu: önce kuponda kayıtlı sonuç, yoksa TJK'dan gelen gerçek sonuç
// Gün sonuçları önbelleği (tarih/şehir bazlı). Ekrandaki tarih değişse ya da uygulama kapanıp açılsa da kuponun sonucu kaybolmaz.
function liveDayGet(){ if(!window.__liveDayRes){ try{ window.__liveDayRes = JSON.parse(localStorage.getItem('gs_liveday_v1') || '{}') || {}; }catch(e){ window.__liveDayRes = {}; } } return window.__liveDayRes; }
function liveDaySave(){ try{ const L = liveDayGet(), o = {}; const lim = isoAdd(TJK.bugunIso(), -360); Object.keys(L).sort().forEach(k => { if(k.slice(0, 10) >= lim) o[k] = L[k]; }); localStorage.setItem('gs_liveday_v1', JSON.stringify(o)); }catch(e){} }
function legRes(c, l){
  if(l.res) return l.res;
  if(l.win != null) return [l.win];
  if(!c.city) return null;
  const iso = c.iso || TJK.bugunIso(), kk = iso + '|' + c.city;
  if(iso !== viewIso){   // ekranda başka gün açık: kuponun günü için kayıtlı sonuçlara bak
    let g = null; try{ g = _dayRes[kk]; }catch(e){}
    g = g || liveDayGet()[kk];
    const rr = g && g.sira && g.sira[l.r];
    if(rr){ l.res = rr.slice(); if(g.fld && g.fld[l.r]) l.fld = g.fld[l.r]; l.odds = Object.assign({}, (g.gny && g.gny[l.r]) || {}); return l.res; }
    return null;
  }
  const r = raceRes(c.city, l.r);
  if(r && c.ts){ const fk = raceInfo(c.city, l.r); l.res = r.slice(); if(fk) l.fld = fk.atlar.length; l.odds = Object.assign({}, (BUL.gny[c.city] || {})[l.r] || {});
    try{ const LD = liveDayGet(), g = (LD[kk] = LD[kk] || {sira: {}, gny: {}, fld: {}}); g.sira[l.r] = r.slice(); g.gny[l.r] = Object.assign({}, (BUL.gny[c.city] || {})[l.r] || {}); if(fk) g.fld[l.r] = fk.atlar.length; liveDaySave(); }catch(e){} }   // sonuç kuponla birlikte kalıcı olur
  return r;
}
function legInfo(c, l){
  const res = legRes(c, l);
  if(!res) return {st:'p'};
  if(c.vir){ const top = res.slice(0, c.vir), inTop = top.includes(l.picks[0]); return {st: inTop ? 'h' : 'm', cls: n => top.includes(n) ? 'win' : 'dim'}; }
  const fk = c.city ? raceInfo(c.city, l.r) : null;
  const rule = ruleOf(c), p = placeCnt(c, l.fld || (fk ? fk.atlar.length : 6));
  let top, hit;
  if(rule === 'win'){ top = [res[0]]; hit = l.picks.includes(res[0]); }
  else if(rule === 'place' || rule === 'gp'){ top = res.slice(0, p); hit = l.picks.some(n => top.includes(n)); }
  else if(rule === 'slots'){ top = [res[l.slot]]; hit = l.picks.includes(top[0]); }
  else if(rule === 'any2'){ top = res.slice(0, 2); hit = l.sets ? (top.length === 2 && setPairs(l.sets).includes(Math.min(top[0], top[1]) + '-' + Math.max(top[0], top[1]))) : top.every(n => l.picks.includes(n)); }
  else if(rule === 'any4'){ top = res.slice(0, 4); hit = top.length === 4 && top.every(n => l.picks.includes(n)); }
  else { top = res.slice(0, p); hit = l.sets ? setPairs(l.sets).some(x => x.split('-').every(n => top.includes(+n))) : l.picks.filter(n => top.includes(n)).length >= 2; }   // pl2
  const cls = n => (rule === 'gp' && n === res[0]) ? 'win' : top.includes(n) ? (rule === 'gp' ? 'pl' : 'win') : (hit ? 'dim' : 'miss');
  return {st: hit ? 'h' : 'm', cls};
}
function status(c){
  if(c.vir){   // virgüllü sıralı: ilk k at listede ve listedeki sırayla olmalı
    const res = c.legs[0] && legRes(c, c.legs[0]);
    if(!res) return {k:'wait', t:'Koşular bekleniyor', h:0};
    const top = res.slice(0, c.vir), idx = top.map(n => c.legs.findIndex(l => l.picks[0] === n));
    const win = top.length === c.vir && idx.every((x, i) => x > -1 && (i === 0 || x > idx[i - 1]));
    return win ? {k:'win', t:'Tuttu', h:1} : {k:'lose', t:'Kaybetti', h:0};
  }
  const st = c.legs.map(l => legInfo(c, l).st);
  const h = st.filter(x => x === 'h').length;
  if(st.includes('m')) return {k:'lose', t:'Kaybetti', h};
  if(h === c.legs.length) return {k:'win', t:'Tuttu', h};
  if(h === 0) return {k:'wait', t:'Koşular bekleniyor', h};
  return {k:'live', t:'Devam ediyor', h};
}
const pst = p => !p.coupon ? '' : (p.mark === 'win' || p.mark === 'lose') ? p.mark : status(p.coupon).k;
const isWon = p => pst(p) === 'win';
// 6'lı Ganyan: bir ayak kaybetse bile, tüm koşuların sonucu belli olana kadar kupon "kaybeden" sayılmaz ve akıştan kalkmaz
const altiliBekler = p => { try{ const c = p.coupon; return !!c && !c.vir && p.mark !== 'lose' && Array.isArray(c.legs) && c.legs.length === 6 && /ganyan/i.test(c.type || '') && c.legs.some(l => legInfo(c, l).st === 'p'); }catch(e){ return false; } };
const isLost = p => pst(p) === 'lose' && !altiliBekler(p);
function cchip(n, info){
  if(info.st === 'p') return `<b class="cn pend">${n}</b>`;
  return `<b class="cn ${info.cls(n)}">${n}</b>`;
}
// Tek koşulu Ganyan: kazanç tahmini. Sonuç gelince gerçek ganyan oranı, öncesinde AGF'ye göre yaklaşık oran (≈ %75 / AGF)
function ganyanWin(c, kn){
  const l = c.legs[0], stake = birimFiyat(c.type, c.city) * c.misli;
  if(!l || !l.picks.length) return null;
  const res = legRes(c, l);
  if(res){
    const w = res[0];
    if(!l.picks.includes(w)) return {k: 'lose'};
    const o = parseFloat(String((l.odds && l.odds[w]) || ((c.iso || TJK.bugunIso()) === viewIso ? gnyOf(c.city, l.r, w) : '')).replace(',', '.'));
    if(!o) return null;
    const v = o * stake, cost = kn * stake;
    return {k: 'real', v, net: v - cost, o};
  }
  const live = (c.iso || TJK.bugunIso()) === viewIso ? horsesFor(c.city, l.r) : [];
  const items = l.picks.map(n => {
    const h = live.find(x => x.no === n) || {};
    const g = h.gny || (l.gnyNow && l.gnyNow[n]), a = (l.agf && l.agf[n]) || h.agf;
    if(g > 1) return {o: +g, real: true};
    return a ? {o: agfOran(a), real: false} : null;
  }).filter(x => x);
  if(!items.length) return null;
  const os = items.map(i => i.o);
  return {k: 'est', lo: Math.min(...os) * stake, hi: Math.max(...os) * stake, olo: Math.min(...os), ohi: Math.max(...os), real: items.every(i => i.real), stake};
}
function winHtml(c, single, kn){
  if(!single || ruleOf(c) !== 'win' || !kn) return '';
  const w = ganyanWin(c, kn); if(!w) return '';
  if(w.k === 'lose') return '<div class="cp-win lose"><div class="wl"><small>Kazanç yok</small></div><b>0,00 ₺</b></div>';
  if(w.k === 'real') return `<div class="cp-win real"><div class="wl"><small>🏆 Kazandın</small><span>Net ${w.net >= 0 ? '+' : '−'}${money(Math.abs(w.net))}</span></div><b>${money(w.v)}</b></div>`;
  const rng = w.hi - w.lo < 0.01 ? money(w.lo) : money(w.lo) + ' – ' + money(w.hi);
  const or = w.ohi - w.olo < 0.005 ? fmtOran(w.olo) : fmtOran(w.olo) + '–' + fmtOran(w.ohi);
  return `<div class="cp-win est"><div class="wl"><small>Olası kazanç</small><span><i class="odd">${or}</i>${w.real ? 'canlı ganyan' : 'AGF\'den tahmini'}</span></div><b>${w.real ? '' : '≈ '}${rng}</b></div>`;
}
// Tek koşulu kupon: her seçim için at numarası kutusu + at adı + jokey / geliş sırası
function singleLegHtml(c){
  const l = c.legs[0], info = legInfo(c, l), res = legRes(c, l);
  const live = (c.iso || TJK.bugunIso()) === viewIso && c.city ? horsesFor(c.city, l.r) : [];
  const rows = l.picks.map((n, i) => {
    const sv = (l.hs && l.hs[n]) || {}, lv = live.find(x => x.no === n) || {};
    const name = sv.name || lv.name || '', jk = sv.jockey || lv.jockey || '';
    const agf = (l.agf && l.agf[n]) || lv.agf;
    const idx = res ? res.indexOf(n) : -1;
    const sub = res ? (idx > -1 ? (idx + 1) + '. geldi' : 'İlk ' + (ruleOf(c) === 'win' ? 1 : ruleOf(c) === 'any2' ? 2 : ruleOf(c) === 'any4' ? 4 : placeCnt(c, l.fld || 6)) + ' dışında') : [jk, agf ? 'AGF %' + agf : ''].filter(Boolean).join(' · ');
    const cls = info.st === 'p' ? '' : (info.cls(n) === 'miss' || info.cls(n) === 'dim') ? ' off' : ' hit';
    const [bg, fg] = SC[(n - 1) % 6];
    return `<div class="leg"><b class="lno${cls}" style="background:${bg};color:${fg}">${n}</b><div class="lg"><b>${esc(name || n + ' numaralı at')}</b><small>${esc(sub)}</small></div>${i === 0 ? `<div class="lrace"><b>${l.r}. Koşu</b><small>${esc(l.t)}</small></div>` : ''}</div>`;
  }).join('');
  return `<div class="legs">${rows || '<div class="leg"><span class="cp-empty">—</span></div>'}</div>`;
}
// İkramiye kutusu kesinleşince (TJK tutarı geldi) kuponun kendi kaydında saklanır (c.ikrH): gün atlayınca ya da bülten verisi gidince de aynı kalır
function ikramiyeKalici(c, cols, slotted){
  let h = '';
  try{ h = ikramiyeHtml(c, cols, slotted) + tekIkramiyeHtml(c) + cokAyakIkramiyeHtml(c); }catch(e){}
  if(h && h.indexOf('🏆 İkramiye') > -1 && h.indexOf('cp-ikr wait') < 0){ if(c.ikrH !== h) c.ikrH = h; return h; }
  return c.ikrH || h;
}
// Çok ayaklı Ganyan (3'lü…7'li): kupon tutsa da kaybetse de TJK'nın verdiği ikramiye gösterilir
function ikramiyeHtml(c, cols, slotted){
  if(slotted || cols < 3 || ruleOf(c) !== 'win' || !c.city) return '';
  if(!c.legs.every(l => legRes(c, l))) return '';   // tüm ayaklar bitmeden gösterme
  let tut = c.ikr;
  if(!tut){
    // 1. / 2. altılı: kuponun ilk ayağının başladığı koşudan bul (Sonuçlar ekranıyla aynı kaynak)
    let ord = c.ord || 0;
    try{
      const k0 = raceList(c.city).find(k => +k.no === +c.legs[0].r);
      const bs = k0 && (k0.baslar || []).find(x => x.tur === 'GANYAN' && x.n === cols);
      if(bs) ord = bs.ord || 0;
    }catch(e){}
    let od = sonucOdeme(c.city, ord, cols, 'Ganyan');
    if(!od && c.ord == null) od = sonucOdeme(c.city, 0, cols, 'Ganyan');
    if(od && /,\d{1,2}$/.test(String(od.tutar))){ tut = c.ikr = String(od.tutar); }
  }
  const ad = esc(sonucAd(cols + "'li") + ' Ganyan');
  if(!tut) return `<div class="cp-ikr wait"><div class="wl"><small>İkramiye</small><span>${ad}</span></div><b>Bekleniyor</b></div>`;
  return `<div class="cp-ikr"><div class="wl"><small>🏆 İkramiye</small><span>${ad}${status(c).k === 'lose' ? ' <em>· kupon tutmadı</em>' : ''}</span></div><b>₺${esc(tut)}</b></div>`;
}
// Tek koşuluk bahisler (Plase, Ganyan & Plase, İkili, Sıralı İkili, Plase İkili, Sıralı Üçlü, Tabela, Sıralı Beşli): koşu bitince TJK'nın açıkladığı ikramiye kuponun altında görünür
// (tek Ganyan'ın gerçek kazancı zaten yukarıdaki "Kazandın" satırında)
function tekTur(c){
  const t = String(c.type || '').replace(/\s*\((Tek kolon|Virgüllü)\)\s*$/i, '');
  const M = {'Plase': ['Plase'], 'Ganyan & Plase': ['Ganyan', 'Plase'], 'İkili Bahis': ['İkili'], 'Sıralı İkili': ['Sıralı İkili'], 'Plase İkili': ['Plase İkili'],
    'Sıralı Üçlü': ['Üçlü Bahis', 'Sıralı Üçlü'], 'Ganyan': ['Ganyan'], 'Tabela Bahis': ['Tabela Bahis'], 'Tabela': ['Tabela Bahis'], 'Sıralı Beşli': ['Sıralı Beşli']};
  return {ad: t, tur: M[t] || null};
}
function tekIkramiyeHtml(c){
  const {ad, tur} = tekTur(c);
  if(!tur || !c.city || !c.legs.length) return '';
  const l0 = c.legs[0];
  if(!c.legs.every(l => l.r === l0.r) || !legRes(c, l0)) return '';   // koşu bitmeden gösterme
  if(ad === 'Ganyan' && status(c).k !== 'lose') return '';   // tutan tek Ganyan'ın kazancı zaten "Kazandı" satırında; tutmayanda kazananın ikramiyesi gösterilir
  const bh = (BUL.bahis[c.city] && BUL.bahis[c.city][l0.r]) || [];
  const lose = status(c).k === 'lose' ? ' <em>· kupon tutmadı</em>' : '';
  const items = [];
  tur.forEach(tr => {
    let es = bh.filter(x => x.tur === tr && /,\d{1,2}$/.test(String(x.tutar)));
    if(tr === 'Plase' || tr === 'Ganyan'){   // at bazlı ödemeler: önce kuponun seçtiği atlar
      const mine = es.filter(x => l0.picks.includes(parseInt(String(x.detay), 10)));
      if(mine.length) es = mine;
    }
    es.forEach(x => items.push({tr, d: String(x.detay || '').trim(), t: String(x.tutar)}));
  });
  const tag = esc(ad);
  if(!items.length){
    // Diğer ödemeler (Ganyan, İkili…) yayınlandığı halde bu bahis listede yoksa TJK bu bahsin ikramiyesini sonuç sayfasında vermiyor
    if(bh.length) return `<div class="cp-ikr wait"><div class="wl"><small>İkramiye</small><span>${tag}${lose}</span></div><b>TJK yayınlamadı</b></div>`;
    return `<div class="cp-ikr wait"><div class="wl"><small>İkramiye</small><span>${tag}</span></div><b>Bekleniyor</b></div>`;
  }
  if(items.length === 1) return `<div class="cp-ikr"><div class="wl"><small>🏆 İkramiye</small><span>${tag}${lose}</span></div><b>₺${esc(items[0].t)}</b></div>`;
  const multi = items.map(i => `<div style="font-size:15px;line-height:1.35">${esc((ad === 'Ganyan & Plase' ? i.tr + ' ' : '') + (i.d ? i.d + ' · ' : ''))}₺${esc(i.t)}</div>`).join('');
  return `<div class="cp-ikr"><div class="wl"><small>🏆 İkramiye</small><span>${tag}${lose}</span></div><b style="text-align:right;letter-spacing:0">${multi}</b></div>`;
}
// Çifte Bahis ve 7'li Plase: tüm ayaklar bitince TJK ikramiyesi (Sonuçlar ekranındaki aynı veriden)
function cokAyakIkramiyeHtml(c){
  const isC = c.type === 'Çifte Bahis', isP7 = c.type === "7'li Plase";
  if(!(isC || isP7) || !c.city || c.legs.some(l => l.slot != null) || !c.legs.length) return '';
  if(!c.legs.every(l => legRes(c, l))) return '';   // tüm ayaklar bitmeden gösterme
  const valid = v => /,\d{1,2}$/.test(String(v || ''));
  let tut = c.ikr2, ad = isC ? 'Çifte Bahis' : "7'li Plase";
  if(!tut){
    let ord = c.ord || 0;
    try{
      const k0 = raceList(c.city).find(k => +k.no === +c.legs[0].r);
      const bs = k0 && (k0.baslar || []).find(x => isC ? x.tur === 'CIFTE' : (x.tur === 'PLASE' && x.n === 7));
      if(bs && bs.ord) ord = bs.ord;
    }catch(e){}
    let od = null;
    if(isC){
      const all = [];
      raceList(c.city).forEach(k => ((BUL.bahis[c.city] || {})[+k.no] || []).forEach(x => { if(/^\d+\. Çifte$/.test(x.tur) && valid(x.tutar) && !all.some(y => y.tur === x.tur)) all.push(x); }));
      // TJK'daki "6. Çifte" = 6. koşudan başlayan çifte: önce kuponun ilk ayağının koşu numarasıyla eşleştir (gün içinde birden fazla çifte olsa da doğru ikramiyeyi bulur)
      const r0 = +c.legs[0].r;
      od = all.find(x => x.tur === r0 + '. Çifte') || (ord ? all.find(x => x.tur === ord + '. Çifte') : (all.length === 1 ? all[0] : null));
      if(od && all.length > 1) ad = od.tur;
    }else{
      od = sonucOdeme(c.city, ord, 7, 'Plase') || (c.ord == null ? sonucOdeme(c.city, 0, 7, 'Plase') : null);
    }
    if(od && valid(od.tutar)){ tut = c.ikr2 = String(od.tutar); }
    if(isC && ord && !(od && /^\d+\. Çifte$/.test(od.tur))) ad = ord + '. Çifte';
  }
  const lose = status(c).k === 'lose' ? ' <em>· kupon tutmadı</em>' : '';
  if(!tut) return `<div class="cp-ikr wait"><div class="wl"><small>İkramiye</small><span>${esc(ad)}</span></div><b>Bekleniyor</b></div>`;
  return `<div class="cp-ikr"><div class="wl"><small>🏆 İkramiye</small><span>${esc(ad)}${lose}</span></div><b>₺${esc(tut)}</b></div>`;
}
function couponHtml(c, draft){
  const s = status(c), cols = c.legs.length, k = kolon(c), full = c.legs.every(l => l.picks.length) && k > 0, kn = full ? k : kolonNow(c);
  const slotted = c.legs.some(l => l.slot != null);
  const mk = st => st === 'h' ? '<div class="mkrow"><span class="mk h">' + ic('ok', 14) + '</span></div>' : st === 'm' ? '<div class="mkrow"><span class="mk m">' + ic('x', 14) + '</span></div>' : '';
  const heads = c.legs.map(l => {
    const i = legInfo(c, l);
    return slotted
      ? `<div class="cp-lh ${i.st}">${l.slot + 1}. At<small>${l.r}. Koşu</small></div>`
      : `<div class="cp-lh ${i.st}">${l.r}. Koşu<small>${l.t}</small></div>`;
  }).join('');
  const single = cols === 1 && !slotted;
  const bodies = c.legs.map(l => {
    const i = legInfo(c, l);
    return `<div class="cp-lb ${cols <= 2 ? 'wide' : ''}">${l.picks.length ? l.picks.map(n => cchip(n, i)).join('') : '<span class="cp-empty">—</span>'}${single ? mk(i.st) : ''}</div>`;
  }).join('');
  const res0 = c.legs[0] && legRes(c, c.legs[0]);
  const order = (res0 && (slotted || ruleOf(c) === 'any4')) ? `<div class="cp-order">Geliş sırası: <b>${res0.slice(0, slotted ? (c.vir || c.legs.length) : 4).join(' · ')}</b></div>` : '';
  const unit = slotted ? 'sıra' : 'ayak';
  const settled = c.legs.some(l => legInfo(c, l).st !== 'p');
  const legend = '';
  const realN = ruleOf(c) === 'win' ? 1 : ruleOf(c) === 'any2' ? 2 : ruleOf(c) === 'any4' ? 4 : (ruleOf(c) === 'pl2' ? 3 : placeN());
  const realRow = (!single && !slotted && c.legs.some(l => legRes(c, l))) ? `<div class="cp-real"><div class="cp-real-h">Gerçek sıralama</div><div class="cp-real-g" style="grid-template-columns:repeat(${cols},1fr)">${c.legs.map(l => { const r = legRes(c, l); const g = (r && ruleOf(c) === 'win') ? ((l.odds && l.odds[r[0]]) || (c.city ? gnyOf(c.city, l.r, r[0]) : '')) : ''; return `<div class="cp-rc">${r ? r.slice(0, realN).join(' · ') : '<span class="cp-empty">—</span>'}${g ? gnyPill(g) : ''}</div>`; }).join('')}</div></div>` : '';
  const marksRow = (!single && settled && !c.vir) ? `<div class="cp-marks" style="grid-template-columns:repeat(${cols},1fr)">${c.legs.map(l => `<div class="cp-mc">${mk(legInfo(c, l).st)}</div>`).join('')}</div>` : '';
  return `<div class="cp s-${s.k}">
    <div class="cp-head"><b>${esc(c.city)} · ${c.ord ? c.ord + '. ' : ''}${esc(c.type || typeName(cols))}</b><span>${draft ? 'Taslak' : esc(c.ts ? fmtStamp(c.ts, true) : c.date)}</span></div>
    ${cols === 1 && !slotted
      ? singleLegHtml(c)
      : c.vir ? `<div class="cp-vir" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 12px">${c.legs.map((l, i) => cchip(l.picks[0], legInfo(c, l)) + (i < c.legs.length - 1 ? '<span style="opacity:.4">›</span>' : '')).join('')}</div><div class="cp-order" style="padding:0 12px 6px">Virgüllü: ${c.legs.length} at, soldan sağa sıralı · her ${c.vir}\'li sıralı alt dizi 1 kolon</div>`
      : `<div class="cp-grid${cols >= 5 ? ' dense' : ''}" style="grid-template-columns:repeat(${cols},1fr)">${heads}${bodies}</div>`}
    ${realRow}${marksRow}${order}${legend}
    <div class="cp-money">
      <div class="cp-fm">${kn ? `<span class="f-k">${kn} kolon</span><i>×</i><span class="f-p">${fiyatYazi(birimFiyat(c.type, c.city))} ₺</span><i>×</i><span class="f-m">${c.misli} misli</span>` + (full ? '' : ' <i>· şimdilik</i>') : 'Eksik seçim var'}</div>
      <div class="cp-tot"><b>${kn ? money(kn * birimFiyat(c.type, c.city) * c.misli) : '—'}</b></div>
    </div>
    ${winHtml(c, single, kn)}${ikramiyeKalici(c, cols, slotted)}
  </div>`;
}

// Kullanıcı adı benzersiz olduğu için bu adlar her zaman yönetici rozeti alır (başkası bu adı alamaz)
const ADMIN_HANDLES = ['admin'];
function isAdminKey(k){ try{ return !!(typeof FB !== 'undefined' && ((k === ME && FB.isAdmin) || (k !== ME && USERS[k] && (USERS[k].adm || ADMIN_HANDLES.includes(String(USERS[k].h || '').replace(/^@/, '').toLowerCase()))) || (FB.adminIds && Object.keys(FB.keyOf || {}).some(u => FB.keyOf[u] === k && FB.adminIds[u])))); }catch(e){ return false; } }
function admBadge(k){ return isAdminKey(k) ? '<span class="adm-b">'+ic('lock',12)+'Yönetici</span>' : (isModKey(k) ? '<span class="adm-b">'+ic('ban',12)+'Moderatör</span>' : ''); }
function postHtml(p){
  const kids = {};
  p.comments.forEach(c => { if(c.rp && findCm(p, c.rp)) (kids[c.rp] = kids[c.rp] || []).push(c); });
  const tops = p.comments.filter(c => !(c.rp && findCm(p, c.rp)));
  const cmList = cmAll[p.id] ? tops : tops.slice(-CM_PREVIEW);
  const cmMore = tops.length > CM_PREVIEW
    ? `<button class="cm-more" onclick="toggleAllComments(${p.id})">${cmAll[p.id] ? 'Daha az göster' : 'Tüm yorumları gör (' + p.comments.length + ')'}</button>` : '';
  const cm = cmList.map(c => cmThread(p, c, kids)).join('');
  const rpBar = replyTo && replyTo.id === p.id
    ? `<div class="rp-bar"><span><b>@${esc(replyTo.name)}</b> kişisine yanıt veriyorsun</span><button onclick="cancelReply(${p.id})" aria-label="Yanıtı iptal et">${ic('x',14)}</button></div>` : '';
  const pt = pinTier(p);
  const ribbon = pt === 2 ? '<div class="pin-r">🏆 ' + esc(String(p.coupon.type)) + ' tuttu · +' + fmtPts(typePts(p.coupon.type)) + ' puan</div>' : pt === 1 ? '<div class="pin-r small">✅ Kupon tuttu · +' + fmtPts(typePts(p.coupon.type)) + ' puan</div>' : '';
  return `<article id="pc-${p.id}" class="card ${p.coupon ? 'st-' + pst(p) : ''} ${(p.id === _flashPid && Date.now() < _flashUntil) ? 'nf-flash' : ''}">${ribbon}
   <div class="ph2">
     <span class="lk" style="display:block;flex:none" onclick="openProfile('${esc(p.author)}', true)">${av(p.author)}</span>
     <div class="ph-n">
       <b class="lk" onclick="openProfile('${esc(p.author)}')">${esc(dn(p.author))}</b>
       <small>${esc(p.ts ? fmtStamp(p.ts) : p.time)}</small>
       ${admBadge(p.author)}
     </div>
     <div class="ph-act">
       ${followBtn(p.author)}
       ${admDelBtn(p)}
       ${p.author === ME && canDelete(p).ok ? `<button class="px" onclick="askDeletePost(${p.id})" aria-label="Kuponu sil" title="Kuponu sil" style="background:#e53935;color:#fff;border-radius:12px;width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(229,57,53,.35)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg></button>` : ''}
     </div>
   </div>
   <div class="txt">${esc(p.text)}</div>
   ${p.coupon ? couponHtml(p.coupon).replace('<div class="cp-tot">', () => (isLost(p) ? '<span class="st-pill lose" style="margin:0">Kaybetti</span>' : isWon(p) ? '<span class="st-pill win" style="margin:0">Tuttu</span>' : '') + '<div class="cp-tot">') : ''}
   <div class="acts">
     <button class="ab ${p.liked ? 'on' : ''}" data-like="${p.id}" onclick="likePost(${p.id})" onmousedown="event.preventDefault()" aria-label="Beğen">${ic('heart',14,p.liked)}<span class="cnt">${p.likes}</span></button>
     <button class="ab ${openCm[p.id] ? 'cmon' : ''}" onclick="toggleComments(${p.id})" aria-label="Yorumlar">${ic('cm2',14)}<span class="cnt">${p.comments.length}</span></button>
     ${trkBadge(p)}
     ${p.coupon ? `<button class="ab" onclick="shareCoupon(${p.id}, this)" aria-label="Kuponu resim olarak paylaş">${ic('share',14)}</button>` : ''}
     ${p.coupon && p.author === ME ? '' : (p.coupon ? `<span class="mk-row"><button class="mkb trk ${tracked[tk(p)] ? 'on' : ''}" onclick="toggleTrack(${p.id})" aria-pressed="${!!tracked[tk(p)]}">${ic('bm',15,!!tracked[tk(p)])}<span>${tracked[tk(p)] ? 'Takip ediliyor' : 'Kuponu takip et'}</span></button></span>` : '')}
   </div>
  </article>`;
}

function markPost(id, v){
  const p = posts.find(x => x.id === id);
  if(!p || p.author !== ME || !p.coupon) return;
  p.mark = p.mark === v ? '' : v;
  if(FB_ON && p.docId) fbDoc('posts', p.docId).update({mark: p.mark}).catch(e => showToast('Kaydedilemedi: ' + fbErr(e)));
  showToast(p.mark === 'win' ? 'Tuttu olarak işaretlendi' : p.mark === 'lose' ? 'Kaybetti olarak işaretlendi' : 'İşaret kaldırıldı');
  rerender();
}
// Puanlama: her tutan koşu (ayak) +1. Sıralı bahisler tek koşu sayılır, kupon tutunca +1.
// Tutan kuponlar akışta üstte durur, süre yok; yenisi gelene kadar kalır, yenisi gelince değişir.
// Kontenjan: 6'lı Ganyan en son tutan 2 (günde 2 altılı), 7'li Ganyan en son tutan 1, diğer bahisler en son tutan 2.
const isYedili = c => !!c && c.type === "7'li Ganyan" && !c.legs.some(l => l.slot != null);
const PIN_KONTENJAN = {a6: 2, a7: 1, diger: 2};
let _pinMap = null;
function pinWinners(){
  const grp = {a6: [], a7: [], diger: []};
  (posts || []).forEach(p => {
    try{
      const c = p && p.coupon; if(!c || status(c).k !== 'win') return;
      const st = c.legs.map(l => legStartMs(c, l)).filter(x => x != null);
      const t0 = st.length ? Math.max(...st) : (p.ts || 0);
      grp[isAltili(c) ? 'a6' : isYedili(c) ? 'a7' : 'diger'].push({p, t0});
    }catch(e){}
  });
  const m = new Map();
  Object.keys(grp).forEach(k => {
    grp[k].sort((x, y) => y.t0 - x.t0 || (y.p.ts || 0) - (x.p.ts || 0))
      .slice(0, PIN_KONTENJAN[k]).forEach(x => m.set(x.p, k === 'diger' ? 1 : 2));
  });
  return m;
}
function pinTier(p){
  if(!_pinMap) _pinMap = pinWinners();
  return _pinMap.get(p) || 0;
}
// Puan kuralı: 6'lı Ganyan tutarsa 10 puan (tutmadıysa tutan her ayak +1) · diğer bahisler tutarsa 0,5 puan
const ALTILI = "6'lı Ganyan";
const fmtPts = n => String(Number(n.toFixed(2))).replace('.', ',');
// Tutan kuponun puanı bahsin zorluğuna göre (6'lı Ganyan ayrıca kısmi ayak puanı alır)
const TYPE_PTS = {"7'li Ganyan": 15, "6'lı Ganyan": 10, "5'li Ganyan": 5, "7'li Plase": 4, "4'lü Ganyan": 3, 'Sıralı Üçlü': 3, 'Sıralı Beşli': 8, 'Tabela': 4, 'Tabela Bahis': 4, "3'lü Ganyan": 2,
  'Çifte Bahis': 1, 'Sıralı İkili': 1, 'İkili Bahis': 0.5, 'Plase İkili': 0.5, 'Ganyan': 0.5, 'Ganyan & Plase': 0.5, 'Plase': 0.25};
const typePts = t => { const v = TYPE_PTS[String(t || '').replace(/\s*\(.*\)\s*$/, '').trim()]; return v == null ? 0.5 : v; };
const isAltili = c => !!c && c.type === ALTILI && !c.legs.some(l => l.slot != null);
function couponPts(c){
  let pts = 0, tot = 0;
  try{
    const st = status(c).k;
    if(isAltili(c)){
      if(st === 'win'){ pts = 10; tot = c.legs.length; }
      else c.legs.forEach(l => { const i = legInfo(c, l); if(i.st === 'h'){ pts++; tot++; } else if(i.st === 'm') tot++; });
    } else if(st === 'win'){ pts = typePts(c.type); tot = 1; }
    else if(st === 'lose') tot = 1;
  }catch(e){}
  return {pts, tot};
}
// Günlük puan tavanı: bir kullanıcı bir günde en fazla bu kadar puan alır (fazlası sayılmaz)
const GUNLUK_TAVAN = 20;
// Yönetici hediyesi: grants/{uid} -> {pts, frames[]}
function bonusOf(k){
  try{
    if(typeof FB === 'undefined' || !FB.grants) return 0;
    const uid = k === ME ? FB.uid : (USERS[k] && USERS[k].uid);
    return uid && FB.grants[uid] ? (+FB.grants[uid].pts || 0) + (+FB.grants[uid].keep || 0) : 0;   // pts: yöneticinin elle verdiği/aldığı · keep: yönetici sildiği kuponlardan korunan puan
  }catch(e){ return 0; }
}
function manualOf(k){
  try{
    const uid = k === ME ? FB.uid : (USERS[k] && USERS[k].uid);
    return uid && FB.grants && FB.grants[uid] ? (+FB.grants[uid].pts || 0) : 0;
  }catch(e){ return 0; }
}
const dayKey = ts => { const d = new Date(ts || 0); return 'd' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); };
// Gün bazlı ham puan / kupon / isabet (paylaşımlardan). skip: tek paylaşım ya da Set
function scoreDays(k, skip, src){
  const sk = p => skip && (skip instanceof Set ? skip.has(p) : skip === p);
  const D = {};
  const day = g => D[g] || (D[g] = {pts: 0, tot: 0, hit: 0});
  // 6'lı Ganyan: aynı kişinin aynı gün, aynı şehir ve aynı altılıya (başlangıç koşusu) yaptığı kuponlardan sadece en çok puan getireni sayılır (eşitlikte önce paylaşılan)
  const altBest = new Map();
  (src || posts).forEach(p => {
    if(p.author !== k || !p.coupon || p.coupon.banked || sk(p) || p.dayOnly || !isAltili(p.coupon)) return;
    const c = p.coupon, key = new Date(p.ts || 0).toDateString() + '|' + (c.city || '') + '|' + (c.legs[0] ? c.legs[0].r : 0);
    const pt = couponPts(c).pts, cur = altBest.get(key);
    if(!cur || pt > cur.pt || (pt === cur.pt && (p.ts || 0) < (cur.p.ts || 0))) altBest.set(key, {p, pt});
  });
  const altOk = new Set(Array.from(altBest.values()).map(x => x.p));
  (src || posts).forEach(p => {
    if(p.author !== k || !p.coupon || p.coupon.banked || sk(p) || p.dayOnly) return;
    if(isAltili(p.coupon) && !altOk.has(p)) return;
    const c = p.coupon, r = couponPts(c), d = day(dayKey(p.ts));
    d.tot += r.tot; d.pts += r.pts;
    // isabet: altılıda tutan ayak sayısı, diğerlerinde tutan kupon sayısı
    if(isAltili(c)) d.hit += c.legs.filter(l => legInfo(c, l).st === 'h').length;
    else if(r.pts > 0) d.hit++;
  });
  return D;
}
// Gün sonunda silinen tutmayan kuponların puanı / isabeti kullanıcı belgesindeki "hist" özetinde saklanır
const histOf = k => (USERS[k] && USERS[k].hist) || {};
function scoreOf(k, skip){
  const D = scoreDays(k, skip), H = histOf(k);
  Object.keys(H).forEach(g => { const d = D[g] || (D[g] = {pts: 0, tot: 0, hit: 0}), h = H[g] || {}; d.pts += +h.p || 0; d.tot += +h.t || 0; d.hit += +h.h || 0; });
  let tot = 0, hit = 0, pts = 0;
  Object.keys(D).forEach(g => { tot += D[g].tot; hit += D[g].hit; pts += Math.min(D[g].pts, GUNLUK_TAVAN); });
  const bugun = Math.min((D[dayKey(Date.now())] || {}).pts || 0, GUNLUK_TAVAN);
  const raw = Math.round((pts + bonusOf(k)) * 100) / 100;
  return {pts: Math.max(0, raw), raw, bugun, tot, pct: tot ? Math.round(hit / tot * 100) : 0};
}
// Kaybeden kuponlar GİZLENMEZ: gün bitince gerçekten veritabanından silinir (autoCleanLost). Puanları kuponlardan ayrı, kullanıcı belgesindeki "hist" özetinde durur.
const histLost = k => Object.values(histOf(k)).reduce((a, h) => a + (+(h && h.l) || 0), 0);
const histWon = k => Object.values(histOf(k)).reduce((a, h) => a + (+(h && h.w) || 0), 0);   // puanı özete işlenmiş tutan kuponlar

// Yerel test modu: puanlı kullanıcı yokken "Öne Çıkan Tahminciler" örnek kişilerle görünür (fotoğraf + çerçeve boyutunu denemek için)
function demoPeople(){
  const ph = (c1, c2) => 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/><circle cx="50" cy="38" r="17" fill="#f1d3b8"/><path d="M14 100c2-26 18-38 36-38s34 12 36 38z" fill="#2f3b52"/></svg>');
  const fr = FRAMES.length ? FRAMES[0] : null;
  const D = [{n:'Tuncer', p:14, r:53, a:'#ef4444', b:'#7f1d1d', f:true}, {n:'Mehmet', p:10, r:83, a:'#38bdf8', b:'#1e3a8a', f:true}, {n:'Gökhan', p:3, r:0, a:'#a3a3a3', b:'#262626', f:false}];
  $('people').innerHTML = `<div class="st-head"><h3>Öne Çıkan Tahminciler</h3><small>Puana göre</small></div><div class="st-strip">${D.map((d, i) => {
    const img = `<div class="av l" style="background:url('${ph(d.a, d.b)}') center/cover no-repeat"></div>`;
    const h = (d.f && fr) ? `<span class="frw fr-${fr.id}">${img}<img class="fi" src="${fr.img}" alt=""></span>` : img;
    return `<div class="st-item"><span class="st-av ${d.f ? 'on' : ''}"><i class="st-rk r${i + 1}">${i + 1}</i><span class="ring">${h}</span>${d.f ? '' : '<button class="st-plus" aria-label="Takip et">+</button>'}</span><b>${d.n}</b><small style="color:var(--ac)">${d.p} puan</small><small>${d.r ? '%' + d.r + ' isabet' : 'henüz yok'}</small></div>`;
  }).join('')}</div>`;
}
function peopleStrip(){
  const all = Object.keys(USERS).map(n => ({n, s: scoreOf(n)}))   // kendin de listede: sıradaki yerini görürsün
    .filter(x => x.s.pts > 0)   // sadece puanı olanlar sıralamaya girer
    .sort((a, b) => b.s.pts - a.s.pts || b.s.pct - a.s.pct || a.n.localeCompare(b.n, 'tr'));
  const names = all.slice(0, 5);   // akışta ilk 5 kişi; fazlası Liderler'de
  if(!names.length && !FB_ON){ demoPeople(); return; }
  if(!names.length){ $('people').innerHTML = '<div class="st-head"><h3>Öne Çıkan Tahminciler</h3><small>Puana göre</small></div><div class="hint" style="margin:0 2px 4px">Henüz puan alan yok. Kuponu tutan ilk kişi burada görünecek.</div>'; return; }
  $('people').innerHTML = `<div class="st-head"><h3>Öne Çıkan Tahminciler</h3><small>Puana göre</small></div><div class="st-strip">${names.map(({n, s}, i) => `<div class="st-item">
    <span class="st-av ${following[n] ? 'on' : ''}" onclick="openProfile('${n}', true)"><i class="st-rk r${i + 1}">${i + 1}</i><span class="ring">${av(n,'l')}</span>${following[n] || n === ME ? '' : `<button class="st-plus" onclick="event.stopPropagation();toggleFollow('${n}')" aria-label="Takip et">+</button>`}</span>
    <b onclick="openProfile('${n}')">${n === ME ? 'Sen' : esc(n.split(' ')[0])}</b><small style="color:${s.pts ? 'var(--ac)' : 'var(--mu)'}">${fmtPts(s.pts)} puan</small><small>${s.tot ? '%' + s.pct + ' isabet' : 'henüz yok'}</small></div>`).join('')}${all.length > 5 ? `<div class="st-item st-all" onclick="switchTab('leaderboard')"><span class="st-av"><span class="ring"><span class="st-allc">›</span></span></span><b>Tümü</b><small>Sıralama</small></div>` : ''}</div>`;
}

function renderMeCard(){
  const e = $('me-card'); if(!e) return;
  const sc = scoreOf(ME);
  const sira = Object.keys(USERS).map(n => ({n, s: scoreOf(n)})).filter(x => x.s.pts > 0)
    .sort((a, b) => b.s.pts - a.s.pts || b.s.pct - a.s.pct || a.n.localeCompare(b.n, 'tr')).findIndex(x => x.n === ME);
  e.innerHTML = `<span class="me-ring">${av(ME, 'l')}</span>
    <div class="me-mid"><b>${esc(dn(ME))}</b><small>${esc((USERS[ME] && USERS[ME].h) || '')}</small>
      <div class="me-bar"><i style="width:${Math.round(sc.bugun / GUNLUK_TAVAN * 100)}%"></i></div>
      <div class="me-bt">Bugün ${fmtPts(sc.bugun)} / ${GUNLUK_TAVAN} puan</div></div>
    <div class="me-pt"><b>${fmtPts(sc.pts)}</b><small>toplam puan</small>${sira > -1 ? `<span class="me-rk">#${sira + 1}. sıra</span>` : ''}</div>`;
}
// ---- AKIŞ TARİHİ: akış seçili günün kuponlarını gösterir (varsayılan bugün, gece yarısı kendiliğinden yeni güne geçer) ----
let feedPick = '';   // '' = bugün
const feedIso = () => feedPick || TJK.bugunIso();
const isoOfTs = ts => { const d = new Date(ts || 0); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const postDay = p => (p.coupon && p.coupon.iso) || isoOfTs(p.ts);   // kupon: yarış günü · yazı: paylaşım günü
function paintFeedDate(){}   // tarih çubuğu kaldırıldı
function feedGoto(iso){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso || '')) return;
  feedPick = iso === TJK.bugunIso() ? '' : iso;
  feedDayListen();
  renderFeed();
}
const shiftFeedDay = n => feedGoto(isoAdd(feedIso(), n));
// Seçili gün son 100 paylaşımın dışında kalabilir: o günün paylaşımlarını tarihe göre ayrıca çek (canlı dinlenir)
function feedDayListen(){
  try{ (FB.dayUn || []).forEach(f => f()); }catch(e){}
  FB.dayUn = []; FB.dayA = []; FB.dayB = []; FB.dayRaw = [];
  const iso = feedIso();
  if(!FB_ON || !FB.db || iso === TJK.bugunIso()){ if(FB.rawPosts) fbRebuildPosts(); return; }
  const [y, m, d] = iso.split('-').map(Number), a = new Date(y, m - 1, d).getTime(), b = new Date(y, m - 1, d + 1).getTime();
  const mix = () => {
    const seen = {};
    FB.dayRaw = FB.dayA.concat(FB.dayB).filter(r => seen[r.docId] ? false : (seen[r.docId] = 1));
    fbRebuildPosts();
  };
  const grab = x => x.docs.map(dc => Object.assign({docId: dc.id}, dc.data()));
  FB.dayUn.push(FB.db.collection('posts').where('coupon.iso', '==', iso).limit(200).onSnapshot(sn => { FB.dayA = grab(sn); mix(); }, e => showToast(fbErr(e))));
  FB.dayUn.push(FB.db.collection('posts').where('ts', '>=', a).where('ts', '<', b).limit(200).onSnapshot(sn => { FB.dayB = grab(sn); mix(); }, e => showToast(fbErr(e))));
}
// Peş peşe gelen yenilemeleri (ör. iki snapshot arka arkaya) tek çizimde topla; ilk çağrı hemen çalışır

// ── Modern filtre hapları (3 sütun x 2 satır, kompakt) + tüm animasyonlar kapalı ──
function injectFilterStyle(){
  if(document.getElementById('filters-style')) return;
  const st = document.createElement('style');
  st.id = 'filters-style';
  st.textContent = `
*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}
.nf-flash,.nf-flash::before,.nf-flash::after{animation:revert!important}
#filters{display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:7px!important;overflow:visible!important;flex-wrap:wrap!important;padding:2px 0 4px!important;margin:4px 0 8px!important}
#filters .chip{--ac:#10b981;--ac2:#059669;display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;min-width:0!important;height:34px!important;min-height:0!important;padding:0 6px!important;margin:0!important;border:1px solid rgba(127,127,127,.22)!important;border-radius:12px!important;background:rgba(127,127,127,.08)!important;color:inherit!important;opacity:.85;font-size:12.5px!important;font-weight:700!important;line-height:1!important;letter-spacing:-.1px;text-align:center!important;white-space:nowrap!important;box-shadow:none!important;transform:none!important;-webkit-tap-highlight-color:transparent}
#filters .chip svg{display:none!important}
#filters .chip span{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#filters .chip:active{background:color-mix(in srgb,var(--ac) 18%,transparent)!important;border-color:var(--ac)!important}
#filters .chip.on{background:linear-gradient(135deg,var(--ac),var(--ac2))!important;border-color:transparent!important;color:#fff!important;opacity:1;box-shadow:0 3px 10px color-mix(in srgb,var(--ac) 35%,transparent)!important}
#filters .f-all{--ac:#10b981;--ac2:#047857}
#filters .f-mine{--ac:#6366f1;--ac2:#4338ca}
#filters .f-lost{--ac:#ef4444;--ac2:#b91c1c}
#filters .f-follow{--ac:#ec4899;--ac2:#be185d}
#filters .f-winners{--ac:#f59e0b;--ac2:#b45309}
#filters .f-tracked{--ac:#0ea5e9;--ac2:#0369a1}
`;
  document.head.appendChild(st);
}
var _rfT = 0, _rfP = 0;
function renderFeed(){
  const wait = 60 - (performance.now() - _rfT);
  if(wait > 0){ if(!_rfP){ _rfP = 1; setTimeout(() => { _rfP = 0; renderFeedNow(); }, wait); } return; }
  renderFeedNow();
}
function renderFeedNow(){
  _rfT = performance.now();
  injectFilterStyle();
  renderMeCard();
  paintFeedDate();
  $('cmp-av').innerHTML = av(ME);
  peopleStrip();
  const F = [
    ['all','Akış'],
    ['mine','Paylaştıklarım'],
    ['lost','Kaybedenler'],
    ['follow','Takip Ettiklerim'],
    ['winners','Tutanlar'],
    ['tracked','Kupon Takip']
  ];
  const FI = {
    all: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    mine: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    lost: '<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>',
    follow: '<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/>',
    winners: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
    tracked: '<path d="M6 3h12v18l-6-4-6 4V3z"/>'
  };
  if(!F.some(x => x[0] === filter)) filter = 'all';   // kaldırılan filtre seçili kalmışsa Tümü'ne dön
  $('filters').innerHTML = F.map(([k,l]) => `<button class="chip f-${k} ${filter===k?'on':''}" onclick="filterFeed('${k}')"><svg viewBox="0 0 24 24" aria-hidden="true">${FI[k]}</svg><span>${l}</span></button>`).join('');
  $('draft-chips').innerHTML = selList().length ? '<div class="cmp-hint">Kuponun notunla birlikte paylaşılacak</div>' + couponHtml(buildCoupon(), true) : '';
  
  const fiso = feedIso();
  const base = (filter === 'tracked' || filter === 'mine') ? posts.filter(p => !p.hidden) : posts.filter(p => !p.hidden && postDay(p) === fiso);   // Kupon Takip ve Paylaştıklarım: günden bağımsız
  let l = base;
  if(filter === 'banko') l = base.filter(p => p.banko || /banko/i.test(p.text));
  if(filter === 'kupon') l = base.filter(p => p.coupon).sort((a,b) => b.likes - a.likes);
  if(filter === 'winners') l = base.filter(isWon);
  if(filter === 'lost') l = base.filter(isLost);   // Herkesin kaybeden kuponları (seçili günün)
  if(filter === 'tracked') l = base.filter(p => p.coupon && p.author !== ME && tracked[tk(p)]);
  if(filter === 'follow') l = base.filter(p => following[p.author]);
  if(filter === 'mine') l = base.filter(p => p.author === ME);   // Kendi paylaşımların: tutmayanlar da burada kalır
  if(filter !== 'tracked' && filter !== 'mine' && filter !== 'lost') l = l.filter(p => !isLost(p));   // Kaybeden kuponlar akıştan kalkar (profilde görünmeye devam eder); Kupon Takip'te kalır
  if(filter === 'all' || filter === 'follow') l = l.filter(p => !isWon(p));   // Tutan kuponlar sadece Tutanlar sekmesinde; akışta yeni, bekleyen ve devam eden kuponlar kalır
  // Sıralama: en iyiden en kötüye. Tuttu > devam ediyor (çok ayak tutan önce) > bekliyor > kaybetti > kuponsuz yazılar.
  // Eşitlikte: kupon puanı, sonra beğeni + yorum, sonra yeni olan önce.
  const eng = p => (p.likes || 0) + (p.comments ? p.comments.length : 0);
  const RANK = {win: 4, live: 3, wait: 2, lose: 1};
  const rk = p => { try{ return p.coupon ? (RANK[pst(p)] || 2) : 0; }catch(e){ return 0; } };
  const hits = p => { try{ return p.coupon ? status(p.coupon).h : 0; }catch(e){ return 0; } };
  const cpts = p => { try{ return p.coupon ? couponPts(p.coupon) || 0 : 0; }catch(e){ return 0; } };
  l = l.slice().sort(filter === 'mine' ? ((a, b) => (b.ts || 0) - (a.ts || 0)) : (a, b) => rk(b) - rk(a) || hits(b) - hits(a) || cpts(b) - cpts(a) || eng(b) - eng(a) || (b.ts || 0) - (a.ts || 0));
  
  const feedHtml = l.length ? l.map(postHtml).join('') : `<div class="empty">${filter==='follow' ? 'Takip ettiğin kimsenin paylaşımı yok. Yukarıdan tahmincileri takip edebilirsin.' : (filter==='all' ? (fiso === TJK.bugunIso() ? 'Henüz paylaşım yok. İlk kuponunu sen paylaş!' : 'Bu tarih için paylaşım yok.') : filter==='mine' ? 'Henüz bir şey paylaşmadın. Paylaştığın kuponlar, tutmasa bile burada durur.' : filter==='lost' ? 'Bu gün kaybeden kupon yok.' : filter==='tracked' ? 'Henüz takip ettiğin kupon yok. Başkasının kuponunda "Kuponu takip et" butonuna basarak buraya ekleyebilirsin.' : 'Bu filtrede henüz paylaşım yok.')}</div>`;
  // Resimler görününce yüklensin (kaydırdıkça), çizimi bloklamasın
  $('posts-container').innerHTML = feedHtml.replace(/<img(?![^>]*\bloading=)/g, '<img loading="lazy" decoding="async"');
}

const filterFeed = f => { filter = f; renderFeed(); };

function likePost(id){
  const p = posts.find(x => x.id === id);
  p.liked = !p.liked;
  p.likes += p.liked ? 1 : -1;
  if(FB_ON) fbLike(p);
  // Tüm listeyi yeniden çizmek yerine yalnızca ilgili butonu güncelle (titreme yok)
  document.querySelectorAll('[data-like="' + id + '"]').forEach(b => {
    b.classList.toggle('on', p.liked);
    // DOM'u yeniden kurmadan yalnızca dolgu ve sayıyı değiştir (kayma/titreme yok)
    const sv = b.querySelector('svg'); if(sv) sv.setAttribute('fill', p.liked ? 'currentColor' : 'none');
    const cn = b.querySelector('.cnt'); if(cn) cn.textContent = p.likes;
  });
}

function toggleComments(id){ openCmSheet(id); }
function toggleAllComments(id){
  cmAll[id] = !cmAll[id];
  rerender();
}

// ---- Yorumlar (Instagram mantığı: beğen, düzenle, sil; profil tıklaması yok) ----
let editCm = null;   // {id, key}
const cmKey = c => (c.uid || '') + '|' + c.ts;
const cmAgo = ts => {
  if(!ts) return '';
  const d = Date.now() - ts;
  if(d < 60000) return 'şimdi';
  if(d < 3600000) return Math.floor(d / 60000) + ' dk';
  if(d < 86400000) return Math.floor(d / 3600000) + ' sa';
  if(d < 7 * 86400000) return Math.floor(d / 86400000) + ' g';
  return Math.floor(d / 604800000) + ' hf';
};
function cmHtml(p, c, isRep){
  const mine = c.a === ME, k = esc(cmKey(c));
  const editing = editCm && editCm.id === p.id && editCm.key === cmKey(c);
  const body = editing
    ? `<div class="cm-edit"><input id="ce-${p.id}" maxlength="500" value="${esc(c.t)}" onkeydown="if(event.key==='Enter')saveCmEdit(${p.id})"><div class="row"><button onclick="cancelCmEdit(${p.id})">Vazgeç</button><button class="ok" onclick="saveCmEdit(${p.id})">Kaydet</button></div></div>`
    : `<div class="cb"><b style="color:${colorOf(c.a)}">${esc(dn(c.a))}</b><i class="cm-t">${cmAgo(c.ts)}</i><span>${c.rn ? `<em class="cm-at">@${esc(c.rn)}</em> ` : ''}${esc(c.t)}</span></div>
       <div class="cm-meta">${c.likes ? `<span>${c.likes} beğenme</span>` : ''}<button class="rp" onclick="startReply(${p.id},'${k}')">Yanıtla</button>${c.edited ? '<span class="ed">düzenlendi</span>' : ''}${mine ? `<button onclick="startCmEdit(${p.id},'${k}')">Düzenle</button>` : ''}${(mine || p.author === ME) ? `<button class="del" onclick="askDeleteCm(${p.id},'${k}')">Sil</button>` : ''}</div>`;
  return `<div class="cm${isRep ? ' rep' : ''}" data-k="${k}"><span style="display:block;flex:none">${av(c.a,'s')}</span><div class="cmw">${body}</div>${editing ? '' : `<button class="cm-lk ${c.liked ? 'on' : ''}" onclick="likeCm(${p.id},'${k}')" aria-label="Yorumu beğen">${ic('heart',16,c.liked)}${c.likes ? `<span>${c.likes}</span>` : ''}</button>`}</div>`;
}
function cmThread(p, c, kids){
  const k = cmKey(c), rs = kids[k] || [];
  let reps = '';
  if(rs.length){
    reps = repOpen[k]
      ? `<div class="cm-reps">${rs.map(r => cmHtml(p, r, true)).join('')}<button class="cm-more" onclick="toggleReps(${p.id},'${esc(k)}')">Yanıtları gizle</button></div>`
      : `<button class="cm-more cm-rv" onclick="toggleReps(${p.id},'${esc(k)}')">${rs.length} yanıtı gör</button>`;
  }
  return `<div class="cm-th">${cmHtml(p, c)}${reps}</div>`;
}
function toggleReps(id, key){ repOpen[key] = !repOpen[key]; cmRefresh(id); }
function startReply(id, key){
  const p = posts.find(x => x.id === id), c = findCm(p, key); if(!c) return;
  const top = (c.rp && findCm(p, c.rp)) ? c.rp : key;
  replyTo = {id, top, name: dn(c.a)};
  repOpen[top] = true;
  cmRefresh(id);
  const inp = $('cm-' + id); if(inp) inp.focus({preventScroll:true});
}
function cancelReply(id){ replyTo = null; cmRefresh(id); }


// ---- Yorum penceresi (Instagram gibi alttan açılır) ----
let cmSheetId = null, cmNewKey = null;
function cmSheetPos(){
  const o = $('cmsheet'); if(!o) return;
  const vv = window.visualViewport, full = window.innerHeight;
  const h = vv ? vv.height : full;
  o.style.top = (vv ? vv.offsetTop : 0) + 'px'; o.style.height = h + 'px'; o.style.bottom = 'auto';
  const card = o.querySelector('.cms-card');
  if(card) card.style.height = Math.round(Math.min(full * 0.6, h - 8)) + 'px';
}
function cmEmoji(e){
  const i = document.querySelector('#cmsheet .cin input'); if(!i) return;
  i.value += e; i.parentNode.classList.add('has'); i.focus({preventScroll:true});
}
// Aşağı sürükleyerek kapatma
function cmDrag(o){
  let y0 = 0, dy = 0, on = false, t0 = 0;
  const card = () => o.querySelector('.cms-card');
  const top = o.querySelector('.cms-top');
  top.addEventListener('touchstart', e => { on = true; y0 = e.touches[0].clientY; dy = 0; t0 = Date.now(); card().style.transition = 'none'; }, {passive:true});
  top.addEventListener('touchmove', e => {
    if(!on) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    card().style.transform = 'translateY(' + dy + 'px)';
    o.style.background = 'rgba(0,0,0,' + (0.5 * Math.max(0, 1 - dy / 400)) + ')';
  }, {passive:true});
  const end = () => {
    if(!on) return; on = false;
    const c = card(); c.style.transition = 'transform .22s cubic-bezier(.2,.8,.2,1)';
    if(dy > 90 || (dy > 30 && Date.now() - t0 < 220)){
      c.style.transform = 'translateY(100%)'; o.style.transition = 'opacity .2s'; o.style.opacity = '0';
      setTimeout(() => closeCmSheet(), 200);
    } else { c.style.transform = ''; o.style.background = ''; }
  };
  top.addEventListener('touchend', end); top.addEventListener('touchcancel', end);
}
function openCmSheet(id){
  const p = posts.find(x => x.id === id); if(!p) return;
  closeCmSheet(true);
  cmSheetId = id; replyTo = null; editCm = null;
  const o = document.createElement('div');
  o.id = 'cmsheet'; o.className = 'cms-ov';
  o.onclick = e => { if(e.target === o) closeCmSheet(); };
  o.innerHTML = `<div class="cms-card" role="dialog" aria-label="Yorumlar">
    <div class="cms-top"><div class="cms-grab"></div><h3>Yorumlar <small id="cms-n"></small></h3><button type="button" class="cms-x" onclick="closeCmSheet()" aria-label="Kapat"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
    <div class="cm-list"></div>
    <div class="cm-rp"></div>
    <div class="cms-emo">${['❤️','🙌','🔥','👏','😢','😍','😮','😂'].map(e => `<button type="button" onclick="cmEmoji('${e}')">${e}</button>`).join('')}</div>
    <div class="cms-in"><span class="cms-me">${av(ME,'s')}</span><div class="cin"><input id="cm-${id}" maxlength="500" enterkeyhint="send" autocomplete="off" placeholder="Yorum yaz..." oninput="this.parentNode.classList.toggle('has',!!this.value.trim())" onkeydown="if(event.key==='Enter')addComment(${id})"><button class="snd" onclick="addComment(${id})" aria-label="Gönder">${ic('send',16)}</button></div></div>
  </div>`;
  cmDrag(o);
  document.body.appendChild(o);
  document.body.classList.add('cms-open');
  renderCmSheet(true);
  cmSheetPos();
  if(window.visualViewport){ visualViewport.addEventListener('resize', cmSheetPos); visualViewport.addEventListener('scroll', cmSheetPos); }
  const ls = o.querySelector('.cm-list'); ls.scrollTop = ls.scrollHeight;
}
function closeCmSheet(silent){
  const o = $('cmsheet');
  if(o){
    if(window.visualViewport){ visualViewport.removeEventListener('resize', cmSheetPos); visualViewport.removeEventListener('scroll', cmSheetPos); }
    o.remove();
  }
  document.body.classList.remove('cms-open');
  cmSheetId = null; replyTo = null; editCm = null;
  if(!silent) rerender();
}
function renderCmSheet(force){
  const o = $('cmsheet'); if(!o || cmSheetId == null) return;
  const p = posts.find(x => x.id === cmSheetId);
  if(!p){ closeCmSheet(true); return; }
  const ls = o.querySelector('.cm-list');
  if(!force && ls.contains(document.activeElement)) return;
  const top = ls.scrollTop;
  const kids = {};
  p.comments.forEach(c => { if(c.rp && findCm(p, c.rp)) (kids[c.rp] = kids[c.rp] || []).push(c); });
  const tops = p.comments.filter(c => !(c.rp && findCm(p, c.rp)));
  const nEl = $('cms-n'); if(nEl) nEl.textContent = p.comments.length ? '· ' + p.comments.length : '';
  const cap = `<div class="cm cm-cap"><span style="display:block;flex:none">${av(p.author,'s')}</span><div class="cmw"><div class="cb"><b style="color:${colorOf(p.author)}">${esc(dn(p.author))}</b><span>${esc(p.text)}</span></div></div></div>`;
  ls.innerHTML = cap + (tops.length ? tops.map(c => cmThread(p, c, kids)).join('') : '<div class="none">Henüz yorum yok. İlk yorumu sen yaz!</div>');
  ls.scrollTop = top;
  if(cmNewKey){ const n = ls.querySelector('.cm[data-k="' + cmNewKey + '"]'); if(n) n.classList.add('cm-new'); cmNewKey = null; }
  o.querySelector('.cm-rp').innerHTML = (replyTo && replyTo.id === p.id)
    ? `<div class="rp-bar"><span><b>@${esc(replyTo.name)}</b> kişisine yanıt veriyorsun</span><button onclick="cancelReply(${p.id})" aria-label="Yanıtı iptal et">${ic('x',14)}</button></div>` : '';
  const inp = $('cm-' + p.id);
  if(inp) inp.placeholder = (replyTo && replyTo.id === p.id) ? 'Yanıtını yaz...' : 'Yorum yaz...';
}
function cmRefresh(id){
  rerender();
  if(cmSheetId === id) renderCmSheet(true);
  const e = $('ce-' + id); if(e){ e.focus({preventScroll:true}); e.setSelectionRange(e.value.length, e.value.length); }
}
const findCm = (p, key) => p && p.comments.find(c => cmKey(c) === key);
// Firestore: yorumlar bir dizi olduğu için okuyup değiştirip yazıyoruz
function fbCmUpdate(p, key, fn){
  if(!FB.uid || !p || !p.docId) return;
  const ref = fbDoc('posts', p.docId);
  FB.db.runTransaction(async t => {
    const d = await t.get(ref); if(!d.exists) return;
    let arr = (d.data().comments || []).slice();
    arr = fn(arr, c => ((c.uid || '') + '|' + c.ts) === key);
    t.update(ref, {comments: arr});
  }).catch(e => showToast('Yorum kaydedilemedi: ' + fbErr(e)));
}
function addComment(id){
  const t = $('cm-' + id).value.trim();
  if(!t) return;
  const p = posts.find(x => x.id === id), ts = Date.now();
  const rpl = (replyTo && replyTo.id === id && findCm(p, replyTo.top)) ? replyTo : null;
  const nc = {a: ME, t, ts, uid: FB_ON ? FB.uid : '', likes: 0, liked: false};
  if(rpl){ nc.rp = rpl.top; nc.rn = rpl.name; repOpen[rpl.top] = true; }
  p.comments.push(nc); cmNewKey = cmKey(nc);
  replyTo = null;
  if(FB_ON) fbComment(p, t, ts, nc.rp, nc.rn);
  $('cm-' + id).value = ''; $('cm-' + id).parentNode.classList.remove('has');
  cmRefresh(id);
  const inp = $('cm-' + id);
  if(inp) inp.focus({preventScroll:true});
  const ls = document.querySelector('#cmsheet .cm-list');
  if(ls) ls.scrollTop = ls.scrollHeight;
}
function likeCm(id, key){
  const p = posts.find(x => x.id === id), c = findCm(p, key); if(!c) return;
  c.liked = !c.liked; c.likes = Math.max(0, (c.likes || 0) + (c.liked ? 1 : -1));
  if(FB_ON && FB.uid){
    const on = c.liked;
    fbCmUpdate(p, key, (arr, m) => arr.map(x => {
      if(!m(x)) return x;
      const lb = (x.likedBy || []).filter(u => u !== FB.uid);
      if(on) lb.push(FB.uid);
      return Object.assign({}, x, {likedBy: lb});
    }));
    const nid = 'cl_' + p.docId + '_' + String(key).replace(/\|/g, '-') + '_' + FB.uid;
    if(on && c.uid) fbNotifSet(nid, 'cmlike', c.uid, p, c.t); else fbNotifDel(nid);
  }
  cmRefresh(id);
}
function startCmEdit(id, key){ editCm = {id, key}; cmRefresh(id); }
function cancelCmEdit(id){ editCm = null; cmRefresh(id); }
function saveCmEdit(id){
  if(!editCm) return;
  const p = posts.find(x => x.id === id), c = findCm(p, editCm.key), key = editCm.key;
  const t = ($('ce-' + id).value || '').trim().slice(0, 500);
  if(!c) { editCm = null; return; }
  if(!t){ showToast('Yorum boş olamaz. Silmek için Sil\'e dokun.'); return; }
  if(t !== c.t){
    c.t = t; c.edited = true;
    if(FB_ON) fbCmUpdate(p, key, (arr, m) => arr.map(x => m(x) && x.uid === FB.uid ? Object.assign({}, x, {t, edited: true}) : x));
  }
  editCm = null;
  cmRefresh(id);
}
function askDeleteCm(id, key){
  const p = posts.find(x => x.id === id), c = findCm(p, key);
  if(!c || (c.a !== ME && p.author !== ME)) return;   // yorumu yazan ya da paylaşımın sahibi silebilir
  askConfirm('Yorumu sil', 'Bu yorumu silmek istediğine emin misin?', 'Sil', () => {
    p.comments = p.comments.filter(x => cmKey(x) !== key && x.rp !== key);   // ana yorum silinince yanıtları da gider
    if(FB_ON) fbCmUpdate(p, key, (arr, m) => arr.filter(x => !(m(x) && (x.uid === FB.uid || p.author === ME)) && x.rp !== key));
    if(replyTo && replyTo.top === key) replyTo = null;
    if(editCm && editCm.key === key) editCm = null;
    cmRefresh(id);
    showToast('Yorum silindi.');
  });
}

// Silme kuralı: kupon yoksa serbest · ilk koşu başlamadan serbest · koşular başlayıp sonuç gelene kadar KİLİTLİ · sonuçlanınca puan uyarısıyla serbest
function legStartMs(c, l){
  const m = /^(\d{1,2}):(\d{2})$/.exec(l.t || ''); if(!m) return null;
  const [y, mo, d] = (c.iso || TJK.bugunIso()).split('-').map(Number);
  return new Date(y, mo - 1, d, +m[1], +m[2]).getTime();
}
function canDelete(p){
  if(!p || p.author !== ME) return {ok: false, phase: 'x'};
  const c = p.coupon;
  if(!c) return {ok: true, phase: 'free'};
  // Kullanıcı kendi kuponunu istediği zaman silebilir. Sonuçlanmış ve puan getirmişse silinince puan düşer (onay diyaloğu uyarır).
  let infos = [];
  try{ infos = c.legs.map(l => legInfo(c, l).st); }catch(e){}
  if(infos.length && infos.every(x => x !== 'p')){
    let pts = 0; try{ pts = Math.max(0, scoreOf(ME).pts - scoreOf(ME, p).pts); }catch(e){}   // tavan uygulanmış gerçek katkı kadar düşer
    return {ok: true, phase: 'settled', pts};
  }
  return {ok: true, phase: 'free'};
}
function askDeletePost(id){
  const p = posts.find(x => x.id === id);
  if(!p || p.author !== ME) return;
  const cd = canDelete(p);
  if(!cd.ok){ showToast('Bu paylaşım silinemedi.'); rerender(); return; }
  const warn = cd.phase === 'settled' && cd.pts > 0;
  const title = warn ? 'Puanların silinecek' : 'Paylaşımı sil';
  const text = warn
    ? 'Bu kupondan kazandığın ' + fmtPts(cd.pts) + ' puan silinecek ve puanından düşecek. Yine de silmek istiyor musun?'
    : 'Bu paylaşımı silmek istediğinize emin misiniz?';
  const d = document.createElement('div');
  d.className = 'dlg';
  d.innerHTML = `<div class="dlg-card" role="alertdialog"><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="dlg-row"><button class="no">Vazgeç</button><button class="del">Sil</button></div></div>`;
  const close = () => d.remove();
  d.onclick = e => { if(e.target === d) close(); };
  d.querySelector('.no').onclick = close;
  d.querySelector('.del').onclick = () => {
    close();
    if(!canDelete(p).ok){ showToast('Bu paylaşım silinemedi.'); rerender(); return; }
    if(FB_ON) fbDeletePost(p);
    posts = posts.filter(x => x.id !== id);
    rerender();
    showToast(warn ? 'Kupon silindi, ' + fmtPts(cd.pts) + ' puan düştü.' : 'Paylaşım silindi.');
  };
  document.body.appendChild(d);
}
// Koşu başlayınca ya da sonuç gelince silme düğmesi kendiliğinden gizlenir/açılır
let _delSig = '';
setInterval(() => {
  if(document.hidden) return;
  const sig = posts.filter(p => p.author === ME && p.coupon).map(p => p.id + ':' + canDelete(p).phase).join(',');
  if(sig !== _delSig){ const first = _delSig === ''; _delSig = sig; if(!first && ['feed', 'profile'].includes(visible())) softRefresh(); }
}, 5000);

function addPost(text, coupon){
  const ts = Date.now();
  if(coupon){
    coupon.ts = ts; coupon.iso = viewIso;
    coupon.legs.forEach(l => { l.agf = {}; l.gnyNow = {}; l.hs = {}; l.picks.forEach(n => { const h = horsesFor(coupon.city, l.r).find(x => x.no === n); if(h && h.agf) l.agf[n] = h.agf; if(h && h.gny > 1) l.gnyNow[n] = h.gny; if(h) l.hs[n] = {name: h.name, jockey: h.jockey || ''}; }); });
  }
  posts.unshift({
    id: ts,
    ts,
    author: ME,
    time: fmtStamp(ts),
    text: text || 'Kuponum hazır, bol kazançlar.',
    coupon: coupon || null,
    likes: 0,
    liked: false,
    won: false,
    comments: []
  });
  if(FB_ON) fbPushPost(posts[0]);
  sel = {};
  misli = 1;
  filter = 'all';
  const pd = (coupon && coupon.iso) || isoOfTs(ts);
  if(pd !== feedIso()) feedGoto(pd);   // paylaştığın kupon başka güne aitse akış o güne geçer, kuponunu görürsün
}

function createNewPost(){
  const t = $('feed-post-input').value.trim();
  const {c, err} = checkCoupon();
  if(err) return;
  if(!t && !c){
    showToast('Lütfen bankonu yazın veya Tahmin Yap sekmesinden at ekleyin.');
    return;
  }
  // Bültenden kupon hazırlanmadıysa: at seçme paneli açılır
  if(!c){ openBanko(t); return; }
  addPost(t, c);
  $('feed-post-input').value = '';
  renderFeed();
  showToast('Kupon akışta paylaşıldı!');
}


// Alt bardaki "Akış" butonuna basınca (Kaybedenler/Paylaştıklarım vb. açıkken) filtre sıfırlanır, tam akış açılır
window.addEventListener('load', () => {
  const st = window.switchTab;
  if(typeof st !== 'function' || st.__feedReset) return;
  const w = function(t){
    const reset = (t === 'feed' && typeof filter !== 'undefined' && filter !== 'all');
    if(reset) filter = 'all';
    const r = st.apply(this, arguments);
    if(reset){ renderFeedNow(); window.scrollTo(0, 0); }
    return r;
  };
  w.__feedReset = true;
  window.switchTab = w;
});
