// ---- Banko: paylaşırken at seçme paneli ----
let bk = {text:'', city:'İstanbul', race:1, no:0};
function openBanko(text){
  bk = {text, city, race: Math.min(race, raceCount(city) || 1), no: 0};
  renderBanko();
  $('bsheet').classList.remove('hidden');
}
function closeBanko(){ $('bsheet').classList.add('hidden'); }
function bkCity(c){ bk.city = c; bk.no = 0; renderBanko(); }
function bkRace(r){ bk.race = r; bk.no = 0; renderBanko(); }
function bkPick(n){ bk.no = bk.no === n ? 0 : n; renderBanko(); }
function renderBanko(){
  const hs = horsesFor(bk.city, bk.race);
  $('bsheet-body').innerHTML = `
    <div class="hint">“${esc(bk.text)}”</div>
    <div class="chips">${CITIES.map(c => `<button class="chip ${c===bk.city?'on':''}" onclick="bkCity('${c}')">${c}</button>`).join('')}</div>
    <div class="chips" id="bk-races">${Array.from({length:raceCount(bk.city)}, (_, i) => i + 1).map(r => `<button class="chip ${r===bk.race?'on':''}" onclick="bkRace(${r})">${r}. Koşu</button>`).join('')}</div>
    ${hs.map(h => `<div class="hr ${bk.no===h.no?'on':''}" onclick="bkPick(${h.no})">
      ${sc(h.no)}
      <div class="hn"><b>${esc(h.name)}</b><small>${esc(h.jockey)}</small></div>
      <div class="od"><b>${agfTxt(h.agf)}</b></div>
      <span class="tick">${bk.no===h.no ? ic('ok',15) : ''}</span>
    </div>`).join('')}
    <div class="ed-foot">
      <button class="btn2" onclick="bkShare(true)">Atsız paylaş</button>
      <button class="btn ${bk.no ? '' : 'off'}" style="${bk.no ? '' : 'opacity:.55'}" onclick="bkShare(false)">Paylaş</button>
    </div>`;
  const act = $('bk-races').querySelector('.on');
  if(act) $('bk-races').scrollLeft = act.offsetLeft - ($('bk-races').clientWidth - act.clientWidth) / 2;
}
function bkShare(noHorse){
  let c = null;
  if(!noHorse){
    if(!bk.no){ showToast('Bankonu seçmek için bir ata dokun.'); return; }
    c = {city: bk.city, type: 'Ganyan', rule: 'win', date: 'Bugün', misli: 1, legs: [L(bk.race, [bk.no], null, bk.city)]};
  }
  addPost(bk.text, c);
  posts[0].banko = true;
  $('feed-post-input').value = '';
  closeBanko();
  renderFeed();
  showToast('Banko akışta paylaşıldı!');
}


// ---- TJK'daki gibi "bu koşudan başlar" satırı + oyun kuralları ----
const BASLAR_AD = {PLASE:{7:"7'Lİ PLASE"}, GANYAN:{3:"3'LÜ GANYAN",4:"4'LÜ GANYAN",5:"5'Lİ GANYAN",6:"6'LI GANYAN",7:"7'Lİ GANYAN"}, CIFTE:{2:'ÇİFTE'}};
const OYUN_AD = {g1:'GANYAN', ik:'İKİLİ', si:'SIRALI İKİLİ', pi:'PLASE İKİLİ', su:'ÜÇLÜ BAHİS', tb:'TABELA', s5:"SIRALI 5'Lİ", pl:'PLASE'};
function baslarYazi(c, r){
  const ki = raceInfo(c, r); if(!ki) return '';
  const bas = (ki.baslar || []).slice().sort((x, y) => (y.tur === 'CIFTE') - (x.tur === 'CIFTE'));   // TJK/Nesine sırası: önce Çifte
  const out = bas.map(x => {
    const ad = (BASLAR_AD[x.tur] || {})[x.n]; if(!ad) return '';
    const st = raceList(c).filter(k => (k.baslar || []).some(y => y.tur === x.tur && y.n === x.n)).map(k => +k.no);
    return (st.length > 1 ? (st.indexOf(r) + 1) + '. ' : '') + ad;
  }).filter(Boolean);
  const oy = ki.oyun ? Object.keys(OYUN_AD).filter(k => ki.oyun.includes(k)).map(k => OYUN_AD[k]) : [];
  if(!out.length && !oy.length) return '';
  return (out.length ? out.join(', ') + ' bu koşudan başlar' : '') + (oy.length ? (out.length ? ', ' : '') + oy.join(', ') : '');
}
function kuralMetni(T){
  const bf = fiyatYazi(birimFiyat(T.name, city)), ek = [];
  let m;
  if(T.mode === 'legs') m = T.rule === 'place' ? `Ardışık ${T.n} ayakta, her koşuda plase'ye girecek bir at seç. Hepsi tutarsa kazanırsın.` : `Ardışık ${T.n} ayakta, her koşunun kazananını bul. Hepsi tutarsa kazanırsın. Bir ayakta birden fazla at seçebilirsin.`;
  else if(T.rule === 'win') m = 'Seçtiğin at birinci gelirse kazanırsın.';
  else if(T.rule === 'place') m = "Seçtiğin at plase'ye girerse kazanırsın (en az 7 atlı koşuda birinci veya ikinci gelmesi yeter).";
  else if(T.rule === 'gp') m = "Seçtiğin at hem ganyan hem plase oynar. Birinci gelirse ikisi de, sadece plase'ye girerse plase tutar.";
  else if(T.rule === 'any2') m = 'İlk iki atı sırasız bil. Hangisinin birinci, hangisinin ikinci geldiği önemli değil.';
  else if(T.rule === 'pl2') m = "Plase'ye giren iki atı sırasız bil.";
  else if(T.rule === 'any4') m = 'İlk dört atı bil (tabela). Sırasıyla bilirsen sıralı ikramiye, sırasız bilirsen sırasız ikramiye kazanırsın.';
  else if(T.rule === 'slots' && T.vir) m = `En az ${T.slots} at seç, dokunma sırası listendeki sıra olur. İlk ${T.slots} at listende, aynı sırayla yer alırsa kazanırsın. Bahis sayısı: seçtiğin atlardan ${T.slots}'li sıralı kombinasyon sayısı (12 at seçersen ${comb(12, T.slots)}).`;
  else if(T.rule === 'slots') m = `İlk ${T.slots} atı geliş sırasıyla bil.`;
  else m = T.desc || '';
  if(/Virgüllü/.test(T.name) && !T.vir) ek.push('Her sıra için birden fazla at seçebilirsin; kolon sayısı arttıkça tutar artar.');
  if(/Tek kolon/.test(T.name)) ek.push(T.exact ? 'Tek kolondur: tam olarak ' + T.exact + ' at seçilir.' : 'Tek kolondur: en az 2 at seç, seçtiğin atlardan olası tüm ikili çiftler oynanır.');
  return m + (ek.length ? ' ' + ek.join(' ') : '') + ` Birim fiyat ${bf} ₺ · asgari kupon ${money(ASGARI)}.`;
}
function renderKuralBilgi(T, c, r){
  const mt = $('race-meta'); if(!mt || !mt.parentNode) return;
  let box = $('race-kural');
  if(!box){ box = document.createElement('div'); box.id = 'race-kural'; box.style.cssText = 'margin:6px 0;font-size:13px;line-height:1.4'; mt.parentNode.insertBefore(box, mt.nextSibling); }
  const bs = baslarYazi(c, r);
  const html = (bs ? '<div style="font-weight:600;margin-bottom:4px">' + esc(bs) + '</div>' : '')
    + '<details><summary style="cursor:pointer;font-weight:600">ⓘ ' + esc(tLabel(T, c)) + ' nasıl oynanır?</summary><div style="margin-top:4px;opacity:.85">' + esc(kuralMetni(T)) + '</div></details>';
  if(box._h !== html){ box._h = html; box.innerHTML = html; }
}


// ---- Virgüllü sıralı: seçim sırası ve "Sırala" penceresi ----
const virOrder = () => selList().filter(h => h.c === city && h.r === race).sort((a, b) => a.slot - b.slot);
function virSetOrder(nos){
  const hs = {}; virOrder().forEach(h => { hs[h.no] = h; delete sel[kk(race, h.slot, h.no)]; });
  nos.forEach((n, i) => { const h = hs[n]; if(!h) return; h.slot = i; sel[kk(race, i, n)] = h; });
}
function virMove(i, d){
  const nos = virOrder().map(h => h.no), j = i + d; if(j < 0 || j >= nos.length) return;
  [nos[i], nos[j]] = [nos[j], nos[i]]; virSetOrder(nos); renderBulten(); virSiralaCiz();
}
function virNumaraSirala(){ virSetOrder(virOrder().map(h => h.no).sort((a, b) => a - b)); renderBulten(); virSiralaCiz(); }
function virSiralaKapat(){ const o = document.getElementById('vir-sirala'); if(o) o.remove(); }
function virSiralaCiz(){
  let o = document.getElementById('vir-sirala');
  const list = virOrder();
  if(!list.length){ virSiralaKapat(); return; }
  if(!o){
    o = document.createElement('div'); o.id = 'vir-sirala';
    o.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center';
    o.onclick = e => { if(e.target === o) virSiralaKapat(); };
    document.body.appendChild(o);
  }
  const btn = 'border:0;border-radius:10px;padding:8px 14px;font-size:18px;background:#e6efe9;color:#111';
  o.innerHTML = `<div style="background:#fff;color:#111;width:100%;max-width:520px;max-height:80vh;overflow:auto;border-radius:18px 18px 0 0;padding:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b style="font-size:17px">Sıralamayı düzenle</b><button style="${btn};font-size:15px" onclick="virSiralaKapat()">Bitti</button></div>
    <div style="font-size:13px;opacity:.7;margin-bottom:8px">Yukarıdaki at önce gelir. Tutmak için ilk ${(curT() || {}).slots || 5} at bu sırayla listede yer almalı.</div>
    <button style="${btn};font-size:14px;margin-bottom:8px" onclick="virNumaraSirala()">Numaraya göre diz</button>
    ${list.map((h, i) => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid #0001"><b style="width:26px;text-align:center">${i + 1}</b><b style="width:30px">${h.no}</b><span style="flex:1">${esc(h.name || '')}</span><button style="${btn}" onclick="virMove(${i},-1)" ${i === 0 ? 'disabled' : ''}>▲</button><button style="${btn}" onclick="virMove(${i},1)" ${i === list.length - 1 ? 'disabled' : ''}>▼</button></div>`).join('')}
  </div>`;
}
function virSirala(){ virSiralaCiz(); }

// ---- BÜLTEN: bahis türü -> seçim ----
// Çok ayaklı bahisler günün SON N koşusudur (örn. 6'lı = 4-9. koşu). Diğer türlerde tek koşu seçilir.
// TJK'nın bildirdiği ayak başlangıçları (varsa). Tür → {tur, n}
const LEG_MAP = {p7:{tur:'PLASE', n:7}, g7:{tur:'GANYAN', n:7}, g6:{tur:'GANYAN', n:6}, g6b:{tur:'GANYAN', n:6}, g5:{tur:'GANYAN', n:5}, g5b:{tur:'GANYAN', n:5}, g4:{tur:'GANYAN', n:4}, g4b:{tur:'GANYAN', n:4}, g3:{tur:'GANYAN', n:3}, g3b:{tur:'GANYAN', n:3}, c2:{tur:'CIFTE', n:2}, c2b:{tur:'CIFTE', n:2}};
// Görünen ad: bülten iki altılı bildiriyorsa "1. 6'lı Ganyan" / "2. 6'lı Ganyan"
// Aynı bahisten TJK'da birden fazla başlangıç varsa (1. / 2. 3'lü Ganyan gibi) seçili grubun sırası başa yazılır
const tLabel = (t, c = city) => {
  if(t.mode === 'legs'){ const st = legStarts(t, c); if(st.length > 1){ const i = st.indexOf(legStart(t, c)); if(i >= 0) return (i + 1) + '. ' + t.name; } }
  return (t.si != null && legStarts(t, c).length > 1) ? (t.si + 1) + '. ' + t.name : t.name;
};
// Kullanıcının seçtiği ayak grubu: 'tür|şehir' -> başlangıç koşusu
let legSel = {};
const legBilgiVar = c => raceList(c).some(k => k.baslar && k.baslar.length);
// Bu bahsin TJK'daki başlangıç koşuları (1. 6'lı, 2. 6'lı gibi birden fazla olabilir)
function legStarts(t, c){
  const mp = LEG_MAP[t.k]; if(!mp) return [];
  return raceList(c).filter(k => (k.baslar || []).some(x => x.tur === mp.tur && x.n === mp.n)).map(k => +k.no);
}
function legStart(t, c = city){
  const N = raceCount(c);
  if(legBilgiVar(c)){   // kullanıcı bir ayak grubu seçtiyse (ve henüz başlamadıysa) o geçerli
    const st0 = legStarts(t, c), pk = legSel[t.k + '|' + c];
    if(pk != null && st0.includes(pk) && (BUL.note || gecmisMu() || admTest() || !raceDone(c, pk))) return pk;
  }
  if(t.si != null){   // 1. / 2. altılı: bültendeki sıraya göre sabit başlangıç
    if(legBilgiVar(c)){ const st = legStarts(t, c); return st[t.si] != null ? st[t.si] : null; }
    return t.si ? null : (N >= t.n ? N - t.n + 1 : null);
  }
  if(legBilgiVar(c)){
    const st = legStarts(t, c); if(!st.length) return null;
    return st.find(r => BUL.note || gecmisMu() || admTest() || !raceDone(c, r)) || st[st.length - 1];
  }
  return N >= t.n ? N - t.n + 1 : null;     // TJK bilgisi okunamadıysa: günün son N koşusu (tahmini)
}
// ---- Tek koşuluk bahisler: hangi koşuda oynanır? ----
// Önce TJK programındaki o koşunun oyun listesine bakılır (k.oyun). Liste okunamadıysa yönetmelikteki asgari at sayısına düşülür:
// Plase ve İkili en az 7 at, Sıralı İkili en az 4 at, Plase İkili 10 at; Sıralı Üçlü/Tabela ikili ile birlikte konur (7 at); Sıralı Beşli 12 at ve üzeri.
const OYUN_KEY = {g1:'g1', pl:'pl', gp:'gp', si:'si', siv:'si', ik:'ik', ik1:'ik', pi:'pi', pi1:'pi', su:'su', suv:'su', tb:'tb', tbv:'tb', s5:'s5', s5v:'s5'};
const OYUN_MIN = {pl:7, gp:7, ik:7, si:4, pi:10, su:7, tb:7, s5:12};
function oyunMusait(t, c, r){
  const key = OYUN_KEY[t.k]; if(!key || key === 'g1') return true;
  const k = raceInfo(c, r); if(!k) return false;
  if(k.oyun && k.oyun.length) return k.oyun.indexOf(key) >= 0;
  return (k.atlar || []).filter(a => !a.kosmaz).length >= (OYUN_MIN[key] || 0);
}
const fmtKos = a => a.length <= 5 ? a.join('., ') + '. koşu' : a.length + ' koşuda';
function tekKosular(t, c = city){
  return allRaces(c).filter(r => oyunMusait(t, c, r) && (BUL.note || gecmisMu() || admTest() || !raceDone(c, r)));
}
function tekMusait(t, c = city){
  const key = OYUN_KEY[t.k];
  if(!key || key === 'g1' || !raceCount(c)) return {ok: true};
  const kos = tekKosular(t, c);
  if(kos.length){
    const kalan = allRaces(c).filter(r => BUL.note || gecmisMu() || admTest() || !raceDone(c, r)).length;
    return {ok: true, kos, sub: kos.length === kalan ? null : fmtKos(kos)};
  }
  return {ok: false, why: allRaces(c).some(r => oyunMusait(t, c, r)) ? 'koşular bitti' : c + ' programında yok'};
}

// Çok ayaklı bahis oynanabilir mi? TJK'da o ayak başlangıcı olmalı ve ilk ayak henüz başlamamış olmalı
function legsMusait(t, c = city){
  if(t && t.mode === 'race') return tekMusait(t, c);
  if(!t || t.mode !== 'legs') return {ok: true};
  const N = raceCount(c); if(!N) return {ok: true};
  const ilk = legStart(t, c);
  if(ilk == null) return {ok: false, why: legBilgiVar(c) ? c + ' programında yok' : c + "'da " + N + ' koşu var'};
  if(ilk + t.n - 1 > N) return {ok: false, why: c + ' programında yok'};
  if(!BUL.note && !gecmisMu() && !admTest() && raceDone(c, ilk)) return {ok: false, why: ilk + '. koşu başladı', ilk};
  return {ok: true, ilk, son: ilk + t.n - 1};
}
// Seçili çok ayaklı bahis oynanamaz hale geldiyse (ilk ayak koşuldu / yeterli koşu yok) otomatik olarak oynanabilir en büyük türe geçer
function autoFixType(){
  const T = curT(); if(!T || (T.mode !== 'legs' && T.mode !== 'race') || legsMusait(T).ok) return false;
  const alt = T.mode === 'race' ? TYPES.find(t => t.k === 'g1') : TYPES.find(t => t.k !== T.k && t.mode === 'legs' && t.rule === T.rule && t.n === T.n && legsMusait(t).ok)
    || TYPES.filter(t => t.mode === 'legs' && t.rule === T.rule && t.n < T.n && legsMusait(t).ok).sort((a, b) => b.n - a.n)[0]
    || TYPES.find(t => t.k === (T.rule === 'place' ? 'pl' : 'g1'));
  betK = alt.k; curSlot = 0; misli = 1;
  const lr = legRaces();
  const before = Object.keys(sel).length;
  if(alt.mode === 'legs'){
    const kept = {}; Object.keys(sel).forEach(k => { if(lr.includes(sel[k].r)) kept[k] = sel[k]; });
    sel = kept;
    if(!lr.includes(race) || raceDone(city, race)) race = lr.find(r => !raceDone(city, r)) || lr[lr.length - 1];
  } else {
    sel = {};
    race = nextRaceNo(city);
  }
  const lost = before - Object.keys(sel).length;
  showToast(`${tLabel(T)} oynanamaz (${legsMusait(T).why}). ${tLabel(alt)} seçildi` + (lost ? ' · koşulan ayağın seçimi silindi.' : '.'));
  return true;
}
// Çok ayaklı bahiste (3'lü, 5'li, 7'li, Çifte…) ilk ayağa — henüz başlamamış ilk ayak koşusuna — geç
function goFirstLeg(){
  const T = curT(); if(!T) return;
  if(T.mode !== 'legs'){   // tek koşuluk bahis: bu bahsin oynandığı koşuya geç; koşu bittiyse sıradaki koşuya geç
    const ks = tekMusait(T).kos;
    if(ks && ks.length && ks.indexOf(race) < 0){ race = ks.find(r => r >= race) || ks[0]; curSlot = 0; refreshOranlar(true, true); return; }
    if(raceDone(city, race)){ race = nextRaceNo(city); curSlot = 0; refreshOranlar(true, true); }
    return;
  }
  const lr = legRaces(); if(!lr.length) return;
  const hedef = lr.find(r => !raceDone(city, r)) || lr[0];
  if(race !== hedef){ race = hedef; curSlot = 0; refreshOranlar(true, true); }
}
function legRaces(c = city){
  const T = curT(), N = raceCount(c);
  if(T.mode !== 'legs') return Array.from({length: N}, (_, i) => i + 1);
  const ilk = legStart(T, c);
  if(ilk == null){ const n = Math.min(T.n, N); return Array.from({length: n}, (_, i) => N - n + 1 + i); }
  return Array.from({length: Math.min(T.n, N - ilk + 1)}, (_, i) => ilk + i);
}
const kk = (r, slot, no) => [city, r, slot, no].join('|');
const picksIn = (r, slot = 0) => selList().filter(h => h.c === city && h.r === r && h.slot === slot);
const anyIn = r => selList().some(h => h.c === city && h.r === r);

function buildCoupon(){
  if(!selList().length) return null;
  const T = curT();
  const base = {city, type: T.name, rule: T.rule, date: 'Bugün', misli};
  if(T.mode === 'legs'){   // 1. / 2. altılı, 1. / 2. 3'lü… (tür adı aynı kalır: puan, limit, kontenjan bozulmaz); sıra TJK'nın verdiği ord, yoksa başlangıç sırası
    const st = legStarts(T, city), ilk = legStart(T, city);
    if(st.length > 1 && ilk != null){
      const mp = LEG_MAP[T.k], ki = raceInfo(city, ilk), b = mp && ki && (ki.baslar || []).find(x => x.tur === mp.tur && x.n === mp.n);
      base.ord = (b && b.ord) ? b.ord : st.indexOf(ilk) + 1;
    }
  }
  const nos = (r, sl) => picksIn(r, sl).map(h => h.no).sort((a,b) => a - b);
  if(T.mode === 'legs') return {...base, legs: legRaces().map(r => L(r, nos(r, 0)))};
  const r = selList()[0].r;
  if(T.vir){   // virgüllü sıralı: dokunma sırası = liste sırası, en az T.slots at
    const n = selList().filter(h => h.c === city && h.r === r).length;
    return {...base, vir: T.slots, legs: Array.from({length: n}, (_, i) => ({...L(r, nos(r, i)), slot: i}))};
  }
  if(T.slots) return {...base, legs: Array.from({length: T.slots}, (_, i) => ({...L(r, nos(r, i)), slot: i}))};
  if(T.tabs){   // sekmeli İkili / Plase İkili / Tabela: kupondaki atlar tüm sekmelerin birleşimi; çiftli bahislerde sekme dağılımı da saklanır
    const sets = Array.from({length: T.tabs}, (_, i) => nos(r, i));
    const all = [...new Set(sets.flat())].sort((a, b) => a - b);
    return {...base, legs: [{...L(r, all), ...(T.per ? {} : {sets: sets.map(p => ({p}))})}]};
  }
  return {...base, legs: [L(r, nos(r, 0))]};
}
// Tahmin limiti: aynı bahis türünden, tek koşuluk bahislerde koşu başına, çok ayaklı bahislerde şehir başına günde en fazla 2 kupon
const TAHMIN_LIMIT = 2;
function limitDolu(c){
  try{ if(isAdminKey(ME)) return null; }catch(e){}   // admin: test için günlük tahmin limiti yok
  const fam = t => String(t || '').replace(/\s*\(.*\)\s*$/, '').trim();
  const tek = k => k.legs.length === 1 || k.legs.some(l => l.slot != null);
  const gun = new Date().toDateString();
  const t1 = tek(c), f = fam(c.type), r = c.legs[0].r;
  const n = (posts || []).filter(p => {
    const k = p.coupon; if(!k || p.author !== ME || k.city !== c.city) return false;
    if(new Date(p.ts || 0).toDateString() !== gun) return false;
    if(fam(k.type) !== f || tek(k) !== t1) return false;
    if(!t1 && (k.ord || 0) !== (c.ord || 0)) return false;   // 1. ve 2. altılının limiti ayrı
    return !t1 || k.legs[0].r === r;
  }).length;
  if(n < TAHMIN_LIMIT) return null;
  return t1 ? r + '. koşu için ' + f + ' en fazla ' + TAHMIN_LIMIT + ' kez oynanabilir.'
            : c.city + ' için bugün en fazla ' + TAHMIN_LIMIT + ' adet ' + (c.ord ? c.ord + '. ' : '') + f + ' oynanabilir.';
}
function checkCoupon(){
  const c = buildCoupon();
  if(!c) return {c: null};
  if(gecmisMu() && !isAdminKey(ME)){ showToast('Geçmiş günlere kupon yapılamaz.'); return {err: true}; }   // sonucu belli koşuya tahmin: sadece admin (test)
  { const m = legsMusait(curT()); if(!m.ok){ showToast(m.why + ' · bu kupon artık oynanamaz.'); return {err: true}; } }
  { const T0 = curT(); if(T0.mode === 'race' && !oyunMusait(T0, city, c.legs[0].r)){ showToast(tLabel(T0) + ' ' + c.legs[0].r + '. koşuda oynanmıyor.'); return {err: true}; } }
  { const lm = limitDolu(c); if(lm){ showToast(lm); return {err: true}; } }
  const slotted = c.legs.some(l => l.slot != null);
  { const Tt = curT(); if(Tt.tabs){ const emp = Array.from({length: Tt.tabs}, (_, i) => i).filter(i => !picksIn(c.legs[0].r, i).length); if(emp.length){ showToast('Eksik sıra: ' + emp.map(i => (i + 1) + '. At').join(', ')); return {err: true}; } } }
  const miss = c.legs.filter(l => !l.picks.length);
  if(miss.length){
    showToast(slotted ? 'Eksik sıra: ' + miss.map(l => (l.slot + 1) + '. At').join(', ')
                      : 'Eksik ayak: ' + miss.map(l => l.r + '.').join(', ') + ' koşu');
    return {err: true};
  }
  if(c.vir && c.legs.length < c.vir){ showToast('En az ' + c.vir + ' at seç (şu an ' + c.legs.length + ').'); return {err: true}; }
  if(kolon(c) < 1){
    showToast((slotted || curT().tabs) ? 'Her sırada farklı bir at olmalı.' : 'Seçimini tamamla: en az ' + (ruleOf(c) === 'any4' ? 4 : 2) + ' at seç.');
    return {err: true};
  }
  { const tut = kolon(c) * birimFiyat(c.type, c.city) * c.misli;
    if(tut < ASGARI){ showToast('Asgari kupon bedeli ' + money(ASGARI) + ' · şu an ' + money(tut) + ', misli artır.'); return {err: true}; }
    if(limitliMi(c.type) && tut > kuponMax()){ showToast(c.type + " kuponu en fazla " + money(kuponMax()) + ' olabilir · şu an ' + money(tut) + '. Seçimini azalt.'); return {err: true}; } }
  return {c};
}

function selectStart(s){
  const T = curT(); if(!T || T.mode !== 'legs' || legStart(T, city) === s) return;
  if(selList().length){ sel = {}; showToast('Ayak grubu değişti, seçimler temizlendi.'); }
  legSel[T.k + '|' + city] = s; race = s; curSlot = 0;
  renderBulten(); kosuBasinaGit(); refreshOranlar(true, true); kosuSonucCek(city, s);
}
function renderBulStatus(){
  const e = $('bul-status'); if(!e) return;
  if(BUL.status === 'loading') e.innerHTML = '<span>TJK bülteni yükleniyor…</span>';
  else if(BUL.status === 'err') e.innerHTML = `<span class="bad">Bülten alınamadı: ${esc(BUL.msg)}</span><button onclick="loadBulten(true)">Tekrar dene</button>` + (bugunMu() ? '' : `<button onclick="gotoDate(TJK.bugunIso())">Bugüne dön</button>`);
  else if(BUL.status === 'ok'){
    const n = CITIES.reduce((a, c) => a + raceCount(c), 0), t = new Date(BUL.at);
    const hh = String(t.getHours()).padStart(2,'0') + ':' + String(t.getMinutes()).padStart(2,'0');
    e.innerHTML = `<span>TJK · ${CITIES.length} hipodrom · ${n} koşu · ${hh}</span><button onclick="loadBulten(true)">Yenile</button><button class="livebtn" onclick="liveOpen()">● Canlı yayın</button>`
      + (BUL.note ? `<small>${esc(BUL.note)}</small>` : '')
      + (BUL.hata.length ? `<small class="bad">${esc(BUL.hata.join(' · '))}</small>` : '')
      + `<button onclick="BUL.dbg=!BUL.dbg;renderBulStatus()">${BUL.dbg ? 'Teşhisi gizle' : 'Teşhis'}</button>`
      + (BUL.dbg ? '<small><b>Sürüm: oyun-r1 (11 Ekim)</b><br>' + CITIES.map(c => '<b>' + esc(c) + '</b>: ' + raceList(c).map(k => esc(k.no + '·' + k.saat + '·' + k.atlar.length + ' at' + ((k.baslar || []).length ? '·başlar: ' + k.baslar.map(x => (x.ord ? x.ord + '. ' : '') + (x.tur === 'CIFTE' ? 'Çifte' : x.n + "'li " + x.tur)).join(', ') : ''))).join(' | ') + (legBilgiVar(c) ? '' : ' | <i>ayak bilgisi bulunamadı (tahmini)</i>') + (CANLI_TESHIS[c] ? '<br><i>canlı oran:</i> ' + (CANLI_TESHIS[c].anahtar ? esc(CANLI_TESHIS[c].anahtar) + ' · ' + Object.keys(CANLI_TESHIS[c].kosu).map(n => esc(n + '=' + CANLI_TESHIS[c].kosu[n])).join(', ') : '<b>TJK listesinde şehir bulunamadı</b> (TJK şehirleri: ' + esc(CANLI_TESHIS[c].onekler.join(', ')) + ')' + (CANLI_TESHIS[c].deneme ? '<br><i>Karma denemeleri:</i> ' + esc(CANLI_TESHIS[c].deneme) : '')) : '')).join('<br>')
          + (raceInfo(city, race) ? '<br><b>Seçili koşu metni:</b> ' + esc(raceInfo(city, race).sinif || '') + '<br><b>Takı teşhisi:</b><br>' + raceInfo(city, race).atlar.map(a => esc(a.no + ' → ' + ((a.takiDetay || []).map(x => x.k + (x.a ? '✓' : '')).join(' ') || '(yok)') + ' ⟨' + (a.takiHam || '') + '⟩')).join('<br>') + '<br><b>İdman teşhisi (at → KosuKodu-Atkodu):</b><br>' + raceInfo(city, race).atlar.map(a => esc(a.no + ' ' + a.isim + ' → ' + (a.idm ? a.idm.k + '-' + a.idm.a : a.idm === undefined ? '(eski kayıt, Yenile\'ye bas)' : '(video yok)'))).join('<br>') : '')
          + '<br><b>Sonuç okuyucu:</b>' + (window.__TESHIS ? Object.keys(window.__TESHIS).map(sn => { const D = window.__TESHIS[sn]; return '<br><b>' + esc(sn) + '</b> ' + esc(D.zaman) + ' · sayfa ' + D.htmlUzunluk + ' karakter · başlıklar: ' + esc((D.basliklar || []).join(' | ')) + ' · bülten koşuları: ' + esc(D.bultenKosular) + '<br>' + (D.tablolar || []).map(T => esc(T.no + ' → ' + T.not + ' (' + T.eslesen + '/' + T.satir + ')' + (T.eslesmeyen.length ? ' eşleşmeyen: ' + T.eslesmeyen.join(', ') : ''))).join('<br>') + (D.hatalar && D.hatalar.length ? '<br><b>HATA:</b> ' + esc(D.hatalar.join(' ; ')) : '') + '<br>sayfa sonu: ' + esc(D.htmlSon || ''); }).join('') : ' henüz sorgu atılmadı') + '</small>' : '');
  } else e.innerHTML = '';
}
// Takı kısaltmaları (TJK'nın kendi açıklamaları). Sayfada açıklama gelirse o, yoksa bu sözlük kullanılır
const TAKI_AD = {KG:'Kapalı gözlük', K:'Kulaklık', SK:'Starta kadar kulaklık', SKG:'Starta kadar kapalı gözlük', DB:'Dil bağı', GKR:'Göz koruyucu'};
const TAKI_ACIKLAMA = {
  KG:'Kapalı gözlük takılacağını ifade eder.',
  K:'Kulaklık takılacağını ifade eder.',
  SK:'Ring mahalinden starta kadar kulaklık ile geleceğini ifade eder.',
  SKG:'Ring mahalinden starta kadar kapalı gözlük ile geleceğini ifade eder.',
  DB:'Dilinin bağlanacağını ifade eder.',
  GKR:'Göz koruyucu takılacağını ifade eder.'
};
let _tkTip = null, _tkTimer = 0;
function takiTipKapat(){ if(_tkTip){ _tkTip.remove(); _tkTip = null; } clearTimeout(_tkTimer); document.removeEventListener('click', takiTipKapat, true); }
function takiTip(el){
  const acik = _tkTip && _tkTip._for === el;
  takiTipKapat(); if(acik) return;
  const t = document.createElement('div');
  t.className = 'tktip'; t.textContent = el.dataset.t || 'Açıklama bulunamadı.'; t._for = el;
  document.body.appendChild(t); _tkTip = t;
  const r = el.getBoundingClientRect(), w = t.offsetWidth, hh = t.offsetHeight;
  let left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
  let top = r.top - hh - 10, below = false;
  if(top < 8){ top = r.bottom + 10; below = true; }
  t.style.left = left + 'px'; t.style.top = top + 'px';
  t.style.setProperty('--ax', Math.min(Math.max(14, r.left + r.width / 2 - left), w - 14) + 'px');
  t.classList.toggle('below', below);
  _tkTimer = setTimeout(takiTipKapat, 2000);
  setTimeout(() => document.addEventListener('click', takiTipKapat, true), 0);
}
function takiChips(d){
  const list = (d.takiDetay && d.takiDetay.length) ? d.takiDetay : String(d.taki || '').split(/\s+/).filter(Boolean).map(k => ({k, a: ''}));
  if(!list.length) return '';
  return `<div class="tkw">${list.map(x => {
    const k = String(x.k).toUpperCase(), ac = x.a || TAKI_ACIKLAMA[k] || (TAKI_AD[k] ? TAKI_AD[k] + ' takılacağını ifade eder.' : 'Açıklama bulunamadı.');
    return `<button class="tkc" data-t="${esc(ac)}" onclick="event.stopPropagation();takiTip(this)"><b>${esc(x.k)}</b></button>`;
  }).join('')}</div>`;
}
// ---- Son galibiyet + son galop (at sayfalarından, cihazda 12 saat saklanır) ----
const GALIP_TTL = 12 * 3600 * 1000;
const GL = {
  yar: { key: 'gs_yaris_v3', label: 'Son yarış', none: 'Yarış kaydı yok', fn: 'atSonYaris', cls: 'hgal hyar' },
  gal: { key: 'gs_galip_v5', label: 'Son galibiyet', none: 'Kayıtlı galibiyeti yok', fn: 'atSonGalibiyet', cls: 'hgal' },
  gop: { key: 'gs_galop_v2', label: 'Son galop', none: 'İdman kaydı yok', fn: 'atSonGalop', cls: 'hgal hgop' }
};
Object.keys(GL).forEach(k => {
  const o = GL[k]; o.c = {}; o.fail = {}; o.busy = {}; o.err = {}; o.q = []; o.run = 0;
  try{ o.c = JSON.parse(localStorage.getItem(o.key) || '{}') || {}; }catch(e){ o.c = {}; }
});
const galipGet = (k, id) => { const g = GL[k].c[id]; return g && Date.now() - g.ts < GALIP_TTL ? g : null; };
// Son yarış kartının at numarası: kart hemen çizilir, numara arkadan (koşu sonuç sayfasından) bulunup rozete eklenir.
// Tek tek (sırayla) çalışır, kaydırırken ve sekme arka plandayken bekler; ekran akıcı kalsın
const _yarNb = new Set(), _yarQ = []; let _yarRun = false;
function yarNoBul(id){
  const g = GL.yar.c[id]; if(!g || g.n || g.no || !g.st || !g.sh || !g.kn || !g.t || _yarNb.has(id)) return;
  _yarNb.add(id); _yarQ.push(id); yarNoPompa();
}
function yarNoPompa(){
  if(_yarRun || !_yarQ.length || document.hidden) return;
  if(typeof _lastTouch === 'number' && Date.now() - _lastTouch < 800){ setTimeout(yarNoPompa, 900); return; }
  const id = _yarQ.shift(), g = GL.yar.c[id]; if(!g){ yarNoPompa(); return; }
  _yarRun = true;
  TJK.kosuIlk4(g.sh, g.t, g.kn).then(l => {
    const x = l && l.find(r => r.st && r.st === +g.st);
    if(x && x.no){ g.no = String(x.no); galipSave('yar'); galipRefresh('yar', id); }
  }).catch(() => {}).finally(() => { _yarRun = false; setTimeout(yarNoPompa, 400); });
}
document.addEventListener('visibilitychange', () => { if(!document.hidden) yarNoPompa(); });
const _gsT = {};
function galipSaveNow(k){ clearTimeout(_gsT[k]); _gsT[k] = 0; try{ localStorage.setItem(GL[k].key, JSON.stringify(GL[k].c)); }catch(e){} }
function galipSave(k){ if(_gsT[k]) return; _gsT[k] = setTimeout(() => galipSaveNow(k), 2500); }   // yığılan kayıtlar tek seferde, ana iş parçacığı rahat kalsın
function galipFlush(){ Object.keys(GL).forEach(k => { if(_gsT[k]) galipSaveNow(k); }); }
document.addEventListener('visibilitychange', () => { if(document.hidden) galipFlush(); });
window.addEventListener('pagehide', galipFlush);
function galipGun(t){
  const m = /^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/.exec(t || ''); if(!m) return '';
  const n = Math.floor((new Date().setHours(0,0,0,0) - new Date(+m[3], +m[2] - 1, +m[1]).getTime()) / 86400000);
  if(!(n >= 0)) return '';
  return n === 0 ? 'Bugün' : n === 1 ? 'Dün' : n < 60 ? n + ' gün önce' : n < 730 ? Math.round(n / 30) + ' ay önce' : Math.floor(n / 365) + ' yıl önce';
}
function galipInner(k, id){
  const o = GL[k], g = galipGet(k, id);
  if(!g) return o.fail[id] && Date.now() - o.fail[id] < 600000
    ? (/HTTP 404/.test(o.err[id] || '')
      ? `<div><small>${o.label}</small><b class="gm">TJK'da kayıt yok</b></div>`
      : `<div><small>${o.label}</small><b class="gm">Alınamadı</b></div>${o.err[id] ? `<span>${esc(o.err[id])}</span>` : ''}`)
    : `<div><small>${o.label}</small><b class="gm">Aranıyor…</b></div>`;
  if(g.n) return `<div><small>${o.label}</small><b class="gm">${o.none}</b></div>`;
  const gun = galipGun(g.t);
  const yy = g.y ? `<span>${esc(g.y)}</span>` : '';
  const vb = (k === 'gal' || k === 'yar') && g.v ? `<button type="button" class="gal-vid" data-v="${esc(g.v)}" data-t="${esc(g.t)}" data-l="${esc(o.label)}" data-no="${esc(g.no || '')}" data-sh="${esc(g.sh || '')}" data-kn="${esc(g.kn || '')}">Videoyu izle</button>` : '';
  const nob = k === 'yar' && g.no ? `<i class="yar-no"><em>NO</em>${esc(g.no)}</i>` : '';
  const lh = `<div><small>${o.label}${gun ? ' · ' + esc(gun) : ''}</small><b>${k === 'yar' ? esc(g.d || g.t) : esc(g.t) + (g.d ? ' · ' + esc(g.d) : '')}</b></div>`;
  return `${nob ? `<div class="yar-l">${nob}${lh}</div>` : lh}${vb ? `<div class="gal-r">${yy}${vb}</div>` : yy}`;
}
const yarisBlock = d => d && d.atId ? `<div class="${GL.yar.cls}" data-k="yar" data-id="${esc(d.atId)}">${galipInner('yar', d.atId)}</div>` : '';
const galipBlock = d => d && d.atId ? Object.keys(GL).filter(k => k !== 'yar').map(k => `<div class="${GL[k].cls}" data-k="${k}" data-id="${esc(d.atId)}">${galipInner(k, d.atId)}</div>`).join('') : '';
const galipRefresh = (k, id) => { const h = galipInner(k, id); document.querySelectorAll('.hgal[data-k="' + k + '"][data-id="' + id + '"]').forEach(el => { if(el._h !== h){ el._h = h; el.innerHTML = h; } }); };
// Kuyruktaki işleri (türüne göre 3 paralel) çeker, geldikçe kartı yerinde günceller
function galipPompa(k){
  const o = GL[k];
  if(document.hidden) return; // sekme arka plandaysa çekme, dönünce devam eder
  if(typeof _lastTouch === 'number' && Date.now() - _lastTouch < 500){ clearTimeout(o.wt); o.wt = setTimeout(() => galipPompa(k), 600); return; }   // kaydırırken ağır ayrıştırma yapma, bitince devam et
  if(k === 'gop' && TJK.atGaloplarToplu && !(o.workerYok && Date.now() - o.workerYok < 600000)){ return galopTopluPompa(); }
  while(o.run < 3 && o.q.length){
    const id = o.q[0];
    const vis = !!document.querySelector('.hgal[data-k="' + k + '"][data-id="' + id + '"]');   // ekranda mı?
    if(!vis && o.run >= 1) break;   // ekranda olmayan (önden yükleme) işler tek tek çalışır, ekran kasmasın
    o.q.shift(); o.run++;
    TJK[o.fn](id).then(r => {
      if(r){ o.c[id] = Object.assign({ts: Date.now()}, r); galipSave(k); delete o.fail[id]; if(k === 'yar') yarNoBul(id); }
      else o.fail[id] = Date.now();
    }).catch(e => { o.fail[id] = Date.now(); o.err[id] = String((e && e.message) || e).slice(0, 260); }).finally(() => {
      o.run--; delete o.busy[id];
      galipRefresh(k, id);
      setTimeout(() => galipPompa(k), vis ? 250 : 700); // ayrıştırma işleri üst üste binmesin; arka plan işleri daha seyrek
    });
    galipRefresh(k, id);
  }
}
// Galop: worker'a 6'şar atlık toplu istek (telefon sayfa indirip ayrıştırmaz). Worker yoksa 10 dk eski yönteme düşer.
function galopTopluPompa(){
  const o = GL.gop;
  while(o.run < 2 && o.q.length){
    const ids = o.q.splice(0, 6); o.run++;
    ids.forEach(id => galipRefresh('gop', id));
    TJK.atGaloplarToplu(ids).then(m => {
      ids.forEach(id => {
        const r = m[id];
        if(r && (r.t || r.n)){ o.c[id] = Object.assign({ts: Date.now()}, r); delete o.fail[id]; }
        else { o.fail[id] = Date.now(); o.err[id] = String((r && r.e) || 'Alınamadı').slice(0, 260); }
      });
      galipSave('gop');
    }).catch(e => {
      o.workerYok = Date.now(); // worker güncel değil: eski yönteme dön
      ids.forEach(id => { if(!o.q.includes(id)) o.q.unshift(id); });
    }).finally(() => {
      o.run--;
      ids.forEach(id => { if(!o.q.includes(id)){ delete o.busy[id]; galipRefresh('gop', id); } });
      setTimeout(() => galipPompa('gop'), 100);
    });
  }
}
// Ekrandaki koşunun atları için eksik olanları kuyruğun BAŞINA koyar (önce görünenler gelsin)
function galipYukle(root){
  Object.keys(GL).forEach(k => {
    const o = GL[k], gor = [];
    root.querySelectorAll('.hgal[data-k="' + k + '"][data-id]').forEach(el => {
      const id = el.dataset.id;
      if(galipGet(k, id)){ if(k === 'yar') yarNoBul(id); return; }
      if(o.fail[id] && Date.now() - o.fail[id] < 600000) return;
      if(o.busy[id]){ const i = o.q.indexOf(id); if(i > 0){ o.q.splice(i, 1); gor.push(id); } return; }
      o.busy[id] = 1; gor.push(id);
    });
    o.q.unshift(...gor);
    galipPompa(k);
  });
}
// Girişte: seçili şehrin atlarının son yarış/galibiyet/galop verisini arka planda önceden çeker (önce seçili koşu).
// Ekran boştayken başlar, veri tasarrufu açıksa ya da sekme gizliyse yapmaz.
let _gonBekle = false;
function galopOnYukle(){
  if(_gonBekle) return; _gonBekle = true;
  const basla = () => {
    _gonBekle = false;
    try{
      if(document.hidden || (navigator.connection && navigator.connection.saveData)) return;
      // Üç tür de (son yarış, son galibiyet = videolu kartlar, son galop) tüm koşular için önceden çekilir; seçili koşu önce
      ['yar', 'gal', 'gop'].forEach(k => {
        const o = GL[k];
        raceList(city).slice().sort((a, b) => (a.no === race ? -1 : b.no === race ? 1 : 0)).forEach(kz => (kz.atlar || []).forEach(a => {
          const id = a.atId || (a.d && a.d.atId);
          if(!id || a.kosmaz || galipGet(k, id) || o.busy[id]) return;
          if(o.fail[id] && Date.now() - o.fail[id] < 600000) return;
          o.busy[id] = 1; o.q.push(id);
        }));
        galipPompa(k);
      });
    }catch(e){}
  };
  if(window.requestIdleCallback) requestIdleCallback(basla, {timeout: 3000}); else setTimeout(basla, 800);
}
document.addEventListener('visibilitychange', () => { if(!document.hidden) Object.keys(GL).forEach(galipPompa); });
// Detay panelleri varsayılan AÇIK; kullanıcının kapattıkları burada tutulur
const _detAcik = new Set();   // Orijin/sahip/antrenör paneli varsayılan KAPALI; kullanıcının açtıkları burada tutulur
const detKey = h => city + '|' + race + '|' + h.no;
// Açılır paneller: sınıf değişir, yükseklik CSS ile yumuşak animasyonlanır (yeniden çizim yok → zıplama yok)
function animTg(btn, set){
  const box = btn.parentElement, k = box.dataset.k; if(!k) return;
  const open = box.classList.toggle('open');
  btn.setAttribute('aria-expanded', open);
  if(open) set.add(k); else set.delete(k);
}
function detTg(btn){
  const box = btn.parentElement, k = box.dataset.k; if(!k) return;
  const open = box.classList.toggle('open');
  btn.setAttribute('aria-expanded', open);
  if(open) _detAcik.add(k); else _detAcik.delete(k);
}
const _moreAcik = new Set();   // "Detay bilgileri" varsayılan KAPALI; kullanıcının açtıkları burada tutulur
function moreTg(btn){ animTg(btn, _moreAcik); }
// Ekürü: aynı koşuda aynı sahibe ait diğer atlar
function ekuriHtml(h){
  const d = h.d; if(!d || !d.sahip || h.kosmaz) return '';
  const nrm = x => String(x || '').toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ').trim();
  const my = nrm(d.sahip); if(!my) return '';
  const es = horsesFor(city, race).filter(x => x.no !== h.no && !x.kosmaz && x.d && nrm(x.d.sahip) === my);
  if(!es.length) return '';
  return `<div class="hek"><small>Ekürü</small><span>${es.map(x => `<b>${esc(x.no)}</b> ${esc(x.name)}`).join(' · ')}</span></div>`;
}
function infoPanel(h){
  const d = h.d; if(!d || h.kosmaz) return '';
  const v = x => x != null && x !== '' && x !== '-';
  const eidS = String(d.eid || '');
  const eid = (eidS.match(/\d{1,2}\.\d{2}\.\d{2}/) || [])[0] || '';
  const em = eidS.match(/Bu derece\s+(.+?)\s+Hipodromu.{0,3}nda,?\s*([\d.]+)/i);
  const eidSub = em ? em[1].replace(/\s+/g, ' ') + ' · ' + em[2] : '';
  const sik = d.siklet ? String(d.siklet).replace('.', ',') + (d.fazla ? ' +' + d.fazla.replace('.', ',') : '') : null;
  const kgsS = String(d.kgs || '').trim();
  let kgsTxt = kgsS, kgsCls = '';
  if(/^\d+$/.test(kgsS)){
    const n = +kgsS;
    kgsTxt = n === 0 ? 'Bugün' : n === 1 ? 'Dün' : n + ' gün önce';
    kgsCls = n <= 14 ? 'kg-g' : n >= 36 ? 'kg-o' : '';
  }
  const cell = (lab, val, cls) => v(val) ? `<div><small>${esc(lab)}</small><b${cls ? ` class="${cls}"` : ''}>${esc(val)}</b></div>` : '';
  const stats = cell('Yaş', d.yas) + cell('Sıklet', sik) + cell('Kulvar', d.st) + cell('HP', d.hp, 'hp') + cell('Son koşu', kgsTxt, kgsCls) + cell('S20', d.s20);
  const best = eid ? `<div class="hbest"><div><small>En iyi derece</small><b>${esc(eid)}</b></div>${eidSub ? `<span>${esc(eidSub)}</span>` : ''}</div>` : '';
  const line = (cls, lab, val) => v(val) ? `<div class="hl ${cls}"><small>${esc(lab)}</small><span>${esc(val)}</span></div>` : '';
  const lines = line('l-or', 'Orijin', d.orijin) + line('l-sa', 'Sahip', d.sahip) + line('l-an', 'Antrenör', d.antrenor);
  const tk = takiChips(d);
  const s6 = (h.son6 && h.son6.length) ? `<button class="hlab hlg" data-t="Son 6 yarıştaki bitiş sırası. Altın, gümüş ve bronz ilk üç. Kırmızımsı kutu 6. ve daha geri. Üstteki harf pist türü: Ç çim, K kum, S sentetik." onclick="event.stopPropagation();takiTip(this)">SON 6</button>${son6Html(h.son6)}` : '';
  const ek = ekuriHtml(h);
  const top = (s6 || tk || ek) ? `${(s6 || tk) ? `<div class="hrow">${s6}${tk}</div>` : ''}${ek}` : '';
  if(!top && !stats && !best && !lines && !(d && d.atId)) return '';
  const idmE = d && d.idm, idmRow = (idmE && idmE.k && idmE.a) ? `<div class="idm-row" data-k="${esc(idmE.k)}" data-a="${esc(idmE.a)}" data-h="${esc(idmE.h || '')}" data-n="${esc(h.name || '')}"><span class="idm-pl">▶</span><span class="idm-tx"><b>İdman videosunu izle</b></span><span class="idm-ok">İzle ›</span></div>` : '';
  const inner = `${stats ? `<div class="hst">${stats}</div>` : ''}${idmRow}${yarisBlock(d)}${best}${galipBlock(d)}${lines ? `<div class="hdet" data-k="${esc(detKey(h))}" onclick="event.stopPropagation()"><button type="button" class="hd-s" aria-expanded="false" onclick="detTg(this)"><span>Orijin, sahip, antrenör</span></button><div class="anim"><div class="anim-in"><div class="hls">${lines}</div></div></div></div>` : ''}`;
  if(!inner.trim()) return top ? `<div class="hinfo">${top}</div>` : '';
  // Kapalıyken tek satır özet: yaş · sıklet · HP · son koşu. "Detay" ile tüm bilgiler açılır
  const prev = [v(d.yas) ? esc(d.yas) : '', sik ? esc(sik) + ' kg' : '', v(d.hp) ? '<b class="hp">HP ' + esc(d.hp) + '</b>' : '', kgsTxt ? `<b class="${kgsCls}">${esc(kgsTxt)}</b>` : ''].filter(Boolean).join(' · ');
  return `<div class="hinfo">${top}<div class="hmore" data-k="${esc(detKey(h))}" onclick="event.stopPropagation()"><button type="button" class="hm-s" aria-expanded="false" onclick="moreTg(this)"><span class="hm-l"><span class="hm-p">${prev}</span><span class="hm-o">Detay bilgileri</span></span><span class="hm-b">Detay</span></button><div class="anim"><div class="anim-in"><div class="hm-in">${inner}</div></div></div></div></div>`;
}
function pistHarf(c){
  if(c === 'g') return 'Ç'; if(c === 'k') return 'K'; if(c === 's') return 'S';
  if(!c) return '';
  let r, g, b; const t = String(c).trim().toLowerCase();
  let m = t.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if(m){ let h = m[1]; if(h.length === 3) h = h.split('').map(x => x + x).join(''); r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16); }
  else if((m = t.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/))){ r = +m[1]; g = +m[2]; b = +m[3]; }
  else { if(/green|lime|olive/.test(t)) return 'Ç'; if(/brown|maroon|sienna|chocolate|peru|tan|orange|red/.test(t)) return 'K'; if(/blue|navy|teal|cyan/.test(t)) return 'S'; return ''; }
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if(d < 25) return '';
  let hue = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  hue = (hue * 60 + 360) % 360;
  if(hue >= 75 && hue < 170) return 'Ç';
  if(hue >= 170 && hue < 270) return 'S';
  if(hue < 60 || hue >= 330) return 'K';
  return '';
}
function son6Html(a){
  if(!a || !a.length) return '';
  return '<div class="s6" title="Son 6 koşu sıralaması">' + a.map(x => {
    const n = String(x.s), cl = /^[1-3]$/.test(n) ? ' p' + n : (n === '0' || +n >= 6) ? ' bk' : '';
    const hr = pistHarf(x.c);
    return `<span class="s6c"><small class="${hr === 'Ç' ? 'sg' : hr === 'K' ? 'sk' : hr === 'S' ? 'ss' : ''}">${hr || '&nbsp;'}</small><i class="${cl.trim()}">${esc(n)}</i></span>`;
  }).join('') + '</div>';
}
function odInner(h, fin){
  return `<b>${h.kosmaz ? '—' : agfTxt(h.agf)}</b>
        ${h.kosmaz ? '<span class="gp nr">Koşmaz</span>' : fin ? (gnyOf(city, race, h.no) ? gnyPill(gnyOf(city, race, h.no), 'Gny') : '') : (oranPill(h) || `<div class="bar"><i style="width:${Math.min((h.agf || 0) * 2.8, 100)}%"></i></div>`)}`;
}
// Canlı oran değişince listeyi baştan çizmeden sadece oran hücrelerini günceller (titreme/dokunma kaybı olmaz)
function patchOranlar(){
  const el = $('horses-list'); if(!el || visible() !== 'bulten' || raceDone(city, race)) return false;
  const hl = horsesFor(city, race);
  for(const h of hl){
    const od = el.querySelector(`.hr[data-no="${h.no}"] .od`); if(!od) return false;
    if(od.parentElement.classList.contains('nr') !== !!h.kosmaz) return false;   // koşmaz durumu değişti → tam çizim
  }
  const degisti = [];
  hl.forEach(h => {
    const od = el.querySelector(`.hr[data-no="${h.no}"] .od`), html = odInner(h, false);
    if(od._h !== html){ od.innerHTML = html; od._h = html; od.classList.remove('odflash'); degisti.push(od); }
  });
  if(degisti.length){ void el.offsetWidth; degisti.forEach(od => od.classList.add('odflash')); }
  el._h = null;
  return true;
}
function applyOpen(root){
  root.querySelectorAll('.hmore[data-k],.hdet[data-k]').forEach(b => {
    const kapali = b.classList.contains('hmore') ? !_moreAcik.has(b.dataset.k) : !_detAcik.has(b.dataset.k);
    b.classList.toggle('open', !kapali);
    const s = b.firstElementChild; if(s) s.setAttribute('aria-expanded', String(!kapali));
  });
}
// At listesi: tüm listeyi baştan çizmek yerine sadece değişen kartı günceller (titreme/kayma olmaz, açık paneller ve yüklü galop verisi korunur)
const _hrBase = x => x.replace(/^<div class="[^"]*"/, '<div').replace(/ onclick="[^"]*"/, '').replace(/<span class="(?:tick|rkb)[^"]*"[^>]*>[\s\S]*?<\/span>/, '');
function patchHorses(el, h){
  const t = document.createElement('template'); t.innerHTML = h;
  const nn = Array.from(t.content.children), old = Array.from(el.children);
  if(!nn.length || old.length !== nn.length || !nn.every((n, i) => n.dataset && n.dataset.no != null && old[i].dataset && old[i].dataset.no === n.dataset.no)) return false;
  nn.forEach((n, i) => {
    const o = old[i], ns = n.outerHTML;
    if(o._h === ns) return;
    if(o._b != null && o._b === _hrBase(ns)){   // sadece seçim durumu değişti: sınıf + işaret daire
      o.className = n.className;
      const a = n.getAttribute('onclick'); if(a == null) o.removeAttribute('onclick'); else o.setAttribute('onclick', a);
      const ot = o.querySelector(':scope > .tick, :scope > .rkb'), nt = n.querySelector(':scope > .tick, :scope > .rkb');
      if(ot && nt) ot.replaceWith(nt);
      o._h = ns;
    } else { n._h = ns; n._b = _hrBase(ns); o.replaceWith(n); }
  });
  Array.from(el.children).forEach(c => { if(c._b == null){ c._h = c.outerHTML; c._b = _hrBase(c._h); } });
  return true;
}
const setHtml = (el, h) => {
  if(el._h === h) return;
  if(el.id === 'horses-list'){
    const ok = el._h != null && patchHorses(el, h);
    if(!ok){ el.innerHTML = h; Array.from(el.children).forEach(c => { c._h = c.outerHTML; c._b = _hrBase(c._h); }); }
    el._h = h; applyOpen(el); galipYukle(el);
    return;
  }
  el.innerHTML = h; el._h = h;
};
function renderBulten(){
  const y = window.scrollY;
  _renderBulten();
  galopOnYukle();
  if(Math.abs(window.scrollY - y) > 1) window.scrollTo({top: y, behavior: 'instant'});
}
function _renderBulten(){
  renderBulStatus();
  if(!CITIES.length){
    $('city-tabs').innerHTML = ''; $('race-tabs').innerHTML = ''; $('slot-tabs').classList.add('hidden');
    $('sel-sum').classList.add('hidden'); $('hint').classList.add('hidden');
    $('race-title').textContent = ''; $('race-meta').textContent = ''; $('next-wrap').innerHTML = '';
    $('tsel-name').textContent = tLabel(curT()); $('tsel-sub').textContent = curT().desc || '';
    $('horses-list')._h = null; $('res-panel')._h = null; $('res-panel').innerHTML = '';
    $('horses-list').innerHTML = `<div class="empty">${BUL.status === 'err' ? (bugunMu() ? 'Bülten alınamadı. Yukarıdan tekrar deneyebilirsin.' : 'Bu tarih için TJK programı bulunamadı. Başka bir gün seç ya da bugüne dön.') : 'Bülten yükleniyor…'}</div>`;
    return;
  }
  autoFixType();
  const T = curT(), lr = legRaces();
  if(!allRaces(city).includes(race)) race = nextRaceNo(city);
  const tabN = T.tabs || T.slots || 0;
  const slotMode = !!((T.slots && !T.one) || T.tabs);       // virgüllü ve sekmeli İkili/Plase İkili/Tabela: sıra sekmeleri
  $('tsel-name').textContent = tLabel(T);
  $('tsel-sub').textContent = T.desc || (T.rule === 'place'
    ? `${lr[0]}.–${lr[lr.length - 1]}. koşu · her ayakta plase'ye girecek atı bul`
    : `${lr[0]}.–${lr[lr.length - 1]}. koşu · her ayakta kazananı bul`);
  let hintTxt = T.hint || '';
  if(!hintTxt && !raceDone(city, race) && !selList().length) hintTxt = 'Seçmek için atın üstüne dokun';
  if(T.mode === 'race' && !oyunMusait(T, city, race)){ const ks0 = tekMusait(T).kos || []; hintTxt = tLabel(T) + ' bu koşuda oynanmıyor' + (ks0.length ? ' · oynanan: ' + fmtKos(ks0) : ''); }
  $('hint').textContent = hintTxt;
  $('hint').classList.toggle('hidden', !hintTxt);

  $('city-tabs').innerHTML = CITIES.map(c => `<button class="chip ${c===city?'on':''}" onclick="selectCity('${c}')">${c}</button>`).join('');
  const rt = $('race-tabs');
  // Ayak grubu sekmeleri: aynı bahisten TJK'da birden fazla başlangıç varsa (3-4-5 | 7-8-9) kullanıcı seçer
  let sr = $('start-tabs');
  if(!sr && rt.parentNode){ sr = document.createElement('div'); sr.id = 'start-tabs'; sr.className = 'chips hidden'; rt.parentNode.insertBefore(sr, rt); }
  if(sr){
    const sts = T.mode === 'legs' ? legStarts(T, city) : [], cur0 = legStart(T, city), showSt = sts.length > 1;
    sr.classList.toggle('hidden', !showSt);
    setHtml(sr, showSt ? sts.map(s => { const bitti = !(BUL.note || gecmisMu() || admTest()) && raceDone(city, s); return `<button class="chip ${s===cur0?'on':''} ${bitti?'fin dim':''}" ${bitti ? 'disabled aria-disabled="true"' : `onclick="selectStart(${s})"`}>${Array.from({length: T.n}, (_, i) => s + i).join('-')}</button>`; }).join('') : '');
  }
  // Sekmeli düzen: çok ayaklıda "1. Ayak, 2. Ayak…" (altında koşu no), tek koşuluklarda sadece oynanan koşular
  const legMode = T.mode === 'legs';
  const tabRaces = legMode ? lr : allRaces(city).filter(r => T.mode !== 'race' || oyunMusait(T, city, r));
  const rtHtml = tabRaces.map((r, i) => `<button class="chip ${legMode ? 'leg' : ''} ${r===race?'on':''} ${anyIn(r)?'has':''} ${raceDone(city, r)?'fin':''}" onclick="selectRace(${r})">${legMode ? `${i+1}. Ayak<small>${r}. Koşu</small>` : `${r}. Koşu`}</button>`).join('');
  const rtSame = rt._h === rtHtml; setHtml(rt, rtHtml);
  const act = rt.querySelector && rt.querySelector('.on');
  if(act && !rtSame) rt.scrollLeft = act.offsetLeft - (rt.clientWidth - act.clientWidth) / 2;

  const st = $('slot-tabs');
  st.classList.toggle('hidden', !slotMode);
  st.innerHTML = slotMode
    ? Array.from({length: tabN}, (_, i) => `<button class="chip ${i===curSlot?'on':''} ${picksIn(race,i).length?'has':''}" onclick="selectSlot(${i})">${i+1}. At</button>`).join('')
    : '';

  const ri = raceInfo(city, race);
  $('race-title').textContent = `${city} ${race}. Koşu` + (ri && ri.saat ? ' • ' + ri.saat : '');
  $('race-meta').innerHTML = ri ? (ri.bilgi ? `<span class="rbi">${esc(ri.bilgi)}</span><span class="rbn">${ri.atlar.length} at</span>` : esc([ri.mesafe, ri.pist, ri.atlar.length + ' at'].filter(Boolean).join(' • '))) : '';

  renderKuralBilgi(T, city, race);
  const mine = selList().filter(x => x.c === city && x.r === race);
  const fin = raceDone(city, race), rres = raceRes(city, race) || [];
  setHtml($('res-panel'), resPanelHtml(city, race));
  let hlist = horsesFor(city, race);
  if(fin && rres.length) hlist = hlist.slice().sort((a, b) => { const ia = rres.indexOf(a.no), ib = rres.indexOf(b.no); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.no - b.no; });
  setHtml($('horses-list'), hlist.map(h => {
    const hit = T.one ? mine.find(x => x.no === h.no) : mine.find(x => x.no === h.no && x.slot === (slotMode ? curSlot : 0));
    const rk = rres.indexOf(h.no);
    return `<div class="hr ${hit && !h.kosmaz ? 'on' : ''} ${fin && !admTest() ? 'lock' : ''} ${h.kosmaz ? 'nr' : ''} ${fin && rk > -1 && rk < 4 ? 'top3 pos' + (rk + 1) : ''}" data-no="${h.no}" ${(fin && !admTest()) || h.kosmaz ? '' : `onclick="toggleHorse(${h.no})"`}>
      ${sc(h.no)}
      <div class="hn">
        <b>${esc(h.name)}</b>
        <small>${esc(h.jockey)}${h.d && h.d.ap ? ' <em class="apb">AP</em>' : ''}${h.d && h.d.fazla ? ' <em class="fz">+' + esc(h.d.fazla) + '</em>' : ''}</small>
      </div>
      <div class="od">${odInner(h, fin)}</div>
      ${h.kosmaz ? '<span class="tick" style="opacity:0"></span>' : fin ? (admTest() && hit ? `<span class="tick">${T.one ? hit.slot + 1 : ic('ok',15)}</span>` : rk > -1 ? `<span class="rkb r${Math.min(rk+1,5)}">${rk+1}</span>` : '<span class="tick"></span>') : `<span class="tick${hit ? '' : ' add'}">${hit ? (T.one ? hit.slot + 1 : ic('ok',15)) : ''}</span>`}
      ${infoPanel(h)}
    </div>`;
  }).join(''));

  // "Sonraki" butonu: ayak ayak veya sıra sıra ilerlet
  const idx = lr.indexOf(race);
  let nx = '';
  if(T.mode === 'legs' && idx < lr.length - 1) nx = `<button class="btn2 next" onclick="selectRace(${lr[idx+1]})">Sonraki ayak: ${lr[idx+1]}. Koşu ›</button>`;
  if(slotMode && curSlot < tabN - 1) nx = `<button class="btn2 next" onclick="selectSlot(${curSlot+1})">Sonraki sıra: ${curSlot+2}. At ›</button>`;
  $('next-wrap').innerHTML = nx;

  // Alt bar
  const n = selList().length;
  const c = buildCoupon();
  $('draft').classList.toggle('hidden', !n);
  if(document.activeElement !== $('dr-note')) $('dr-note').value = $('feed-post-input').value;
  $('sel-sum').classList.toggle('hidden', !n);
  if(document.body) document.body.classList.toggle('has-draft', !!n);
  if(c){
    const total = T.mode === 'legs' ? T.n : (T.tabs || T.slots || 1);   // virgüllüde total = en az seçilecek at
    const done = T.tabs ? Array.from({length: T.tabs}, (_, i) => picksIn(c.legs[0].r, i).length ? 1 : 0).reduce((a, b) => a + b, 0) : c.legs.filter(l => l.picks.length).length;
    const unit = T.vir ? 'at' : (T.slots || T.tabs) ? 'sıra' : 'ayak';
    const k = kolon(c);
    const full = (T.vir ? done >= total : done === total) && k > 0;
    const ayniAt = !!T.tabs && !T.per && done === total && k === 0;   // İkili / Plase İkili: iki sekmede de aynı tek at seçili
    const multi = total > 1;
    const kn = full ? k : kolonNow(c);
    const tutar = (full ? k : 0) * birimFiyat(T.name, city) * misli, asgOk = tutar >= ASGARI, maxOk = !(limitliMi(T.name) && tutar > kuponMax());
    $('coupon-count-text').textContent = full ? (!maxOk ? `Limit ${money(kuponMax())} · ${money(tutar - kuponMax())} fazla` : asgOk ? 'Kupon hazır' : `Asgari ${money(ASGARI)} · ${money(ASGARI - tutar)} eksik`)
      : (ayniAt ? 'Sekmelerde farklı atlar seç' : multi ? `${done}/${total} ${unit} · ${total - done} eksik` : `${n} at seçili · eksik seçim`);
    $('coupon-total-price').textContent = kn ? money(kn * birimFiyat(T.name, city) * misli) : '—';
    $('coupon-formula').textContent = kn
      ? `${kn} kolon × ${fiyatYazi(birimFiyat(T.name, city))} ₺ × ${misli} misli` + (full ? '' : ' · şimdilik')
      : `Birim fiyat ${fiyatYazi(birimFiyat(T.name, city))} ₺ · ` + (ayniAt ? 'aynı atı iki sekmede seçtin, farklı bir at ekle' : 'fiyat için at seç');
    if(document.body) document.body.classList.toggle('has-draft', true);
    if(document.activeElement !== $('misli-out')) $('misli-out').value = misli;
    $('draft-go').classList.toggle('off', !full || !asgOk || !maxOk);
    const rr = c.legs[0].r, nz = x => x.map(h => h.no).sort((p, q) => p - q).join(',') || '-';
    const selTxt = T.vir ? virOrder().map(h => h.no).join(', ')
      : T.mode === 'legs' ? c.legs.map(l => l.picks.join(',') || '-').join(' / ')
      : (T.slots || T.tabs) ? Array.from({length: T.tabs || T.slots}, (_, i) => nz(picksIn(rr, i))).join(' - ')
      : c.legs[0].picks.join(', ');
    $('sel-sum').innerHTML = `<span><b>Seçimler:</b> <span style="color:var(--gold,#f5c518);font-weight:800">${selTxt}</span></span><button onclick="clearSel()">Temizle</button>`;
  }
}


// Seçilmemiş atın dairesinde ince bir "+" çizilir (yazı karakteri değil, iki çizgi): dokununca seçileceği anlaşılsın
(function(){
  if(document.getElementById('pick-css')) return;
  const st = document.createElement('style'); st.id = 'pick-css';
  st.textContent = '.hr .tick.add{display:flex;align-items:center;justify-content:center}'
    + '.hr .tick.add::before{content:"";display:block;width:14px;height:14px;color:var(--green,#0f8a5f);opacity:.85;'
    + 'background:linear-gradient(currentColor,currentColor) center/100% 2px no-repeat,linear-gradient(currentColor,currentColor) center/2px 100% no-repeat}';
  document.head.appendChild(st);
})();
