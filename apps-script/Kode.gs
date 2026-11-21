/**
 * Estimasi Body & Paint Perintis — penyimpanan Google Spreadsheet
 * ----------------------------------------------------------------
 * Cara pasang:
 * 1. Buat Google Spreadsheet baru → menu Ekstensi → Apps Script.
 * 2. Hapus isi Kode.gs, tempel seluruh kode ini, ganti KUNCI di bawah, lalu Simpan.
 * 3. Pilih fungsi "setup" → Jalankan → izinkan akses (sekali saja).
 * 4. Terapkan → Deployment baru → jenis "Aplikasi web"
 *      Jalankan sebagai: Saya    |    Yang memiliki akses: Siapa saja
 * 5. Salin URL aplikasi web (berakhiran /exec) → tempel di aplikasi: Pengaturan → Google Spreadsheet.
 */

// Ganti dengan kunci rahasia Anda sendiri (huruf/angka, min. 8 karakter).
// Kunci yang sama diisi di Pengaturan aplikasi pada setiap HP.
const KUNCI = 'GANTI-DENGAN-KUNCI-RAHASIA';

const TAB = { EST: 'Estimasi', JASA: 'Detail Jasa', PART: 'Detail Part', CJ: 'Jasa Tambahan' };
const HEAD = {
  EST: ['No. Estimasi', 'Tanggal', 'Status', 'Service Advisor', 'Pelanggan', 'No. WA', 'Kendaraan', 'Tipe', 'No. Polisi',
        'Warna', 'Tahun', 'No. Rangka', 'KM', 'Pembayaran', 'Asuransi', 'Total Jasa', 'Diskon Jasa', 'Total Part',
        'Diskon Part', 'PPN Ditambahkan', 'TOTAL', 'Termasuk PPN', 'Kedatangan Part', 'Lama Pengerjaan (hari)',
        'Catatan', 'Diupdate', 'ID', 'Data (jangan diubah)'],
  JASA: ['No. Estimasi', 'Tanggal', 'No. Polisi', 'Kendaraan', 'No', 'Uraian Pekerjaan', 'Jenis', 'Sumber', 'Qty', 'Harga', 'Jumlah', 'ID'],
  PART: ['No. Estimasi', 'Tanggal', 'No. Polisi', 'Kendaraan', 'No', 'Nama Part', 'No. Part', 'Ketersediaan', 'Qty', 'Harga Satuan', 'Jumlah', 'ID'],
  CJ:   ['ID', 'Nama Pekerjaan', 'Jenis', 'Harga', 'Diupdate']
};
const RP = '#,##0';

function setup() {
  Object.keys(TAB).forEach(k => sheet_(k));
  const ss = SpreadsheetApp.getActive(), s1 = ss.getSheetByName('Sheet1');
  if (s1 && s1.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s1);   // hapus tab kosong bawaan
  SpreadsheetApp.getActive().toast('Tab Spreadsheet siap dipakai.');
}

function doGet(e) { return handle_(e && e.parameter ? e.parameter : {}); }
function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) {}
  return handle_(body);
}

function handle_(p) {
  if (String(p.key || '') !== KUNCI) return out_({ ok: false, error: 'Kunci salah. Samakan kunci di aplikasi dengan KUNCI di Apps Script.' });
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    switch (p.action) {
      case 'ping':   return out_({ ok: true, name: SpreadsheetApp.getActive().getName() });
      case 'save':   return out_(saveEst_(p.est));
      case 'list':   return out_({ ok: true, items: listEst_(Number(p.limit) || 300) });
      case 'delete': return out_(deleteEst_(String(p.id || '')));
      case 'cjGet':  return out_({ ok: true, items: getCJ_() });
      case 'cjSet':  return out_(setCJ_(p.items || []));
    }
    return out_({ ok: false, error: 'Aksi tidak dikenal' });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_(k) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(TAB[k]);
  if (!sh) {
    sh = ss.insertSheet(TAB[k]);
    sh.getRange(1, 1, 1, HEAD[k].length).setValues([HEAD[k]]).setFontWeight('bold')
      .setBackground('#1f4e79').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    if (k === 'EST') sh.hideColumns(HEAD.EST.length);           // kolom data mentah disembunyikan
  }
  return sh;
}

function toDate_(iso) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso || '')) return '';
  // pakai zona waktu Spreadsheet agar tanggal tidak bergeser
  return Utilities.parseDate(iso.slice(0, 10), SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
}

function findRow_(sh, col, value) {
  const last = sh.getLastRow();
  if (last < 2) return 0;
  const hit = sh.getRange(2, col, last - 1, 1).createTextFinder(value).matchEntireCell(true).findNext();
  return hit ? hit.getRow() : 0;
}

function deleteRowsById_(sh, idCol, id) {
  const last = sh.getLastRow();
  if (last < 2) return;
  const ids = sh.getRange(2, idCol, last - 1, 1).getValues();
  for (let i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === id) sh.deleteRow(i + 2);
}

function saveEst_(e) {
  if (!e || !e.id) return { ok: false, error: 'Data estimasi kosong' };
  const s = e.sum || {};
  const tgl = toDate_(e.date);
  const row = [e.no, tgl, e.status === 'sent' ? 'Terkirim' : 'Draft', e.sa || '', e.cname || '', e.cwa ? "'" + e.cwa : '',
    e.vehName || '', e.type || '', (e.plate || '').toUpperCase(), e.color || '', e.year || '', (e.vin || '').toUpperCase(), e.km || '',
    e.payer || '', e.ins || '', s.sj || 0, s.dj || 0, s.sp || 0, s.dp || 0, s.addPPN || 0, s.total || 0, s.inclPPN || 0,
    e.eta || '', e.days || '', e.notes || '', new Date(e.updated || Date.now()), e.id, JSON.stringify(e)];

  const est = sheet_('EST');
  const idCol = HEAD.EST.indexOf('ID') + 1;
  let r = findRow_(est, idCol, e.id);
  if (r) est.getRange(r, 1, 1, row.length).setValues([row]);
  else { est.appendRow(row); r = est.getLastRow(); }
  est.getRange(r, 2).setNumberFormat('dd/mm/yyyy');
  est.getRange(r, 16, 1, 7).setNumberFormat(RP);
  est.getRange(r, 26).setNumberFormat('dd/mm/yyyy hh:mm');

  const plate = (e.plate || '').toUpperCase();
  const js = sheet_('JASA'), ps = sheet_('PART');
  deleteRowsById_(js, HEAD.JASA.length, e.id);
  deleteRowsById_(ps, HEAD.PART.length, e.id);
  const jobs = (e.jobs || []).map((j, i) => [e.no, tgl, plate, e.vehName || '', i + 1, j.name, j.kind === 'gc' ? 'G+C' : 'K+C',
    j.src === 'pl' ? 'Pricelist' : 'Manual', j.qty, j.price, j.qty * j.price, e.id]);
  const parts = (e.parts || []).map((p, i) => [e.no, tgl, plate, e.vehName || '', i + 1, p.name || '', p.no || '',
    p.orderText || '', p.qty, p.price, p.qty * p.price, e.id]);
  if (jobs.length) {
    const r0 = js.getLastRow() + 1;
    js.getRange(r0, 1, jobs.length, jobs[0].length).setValues(jobs);
    js.getRange(r0, 2, jobs.length, 1).setNumberFormat('dd/mm/yyyy');
    js.getRange(r0, 10, jobs.length, 2).setNumberFormat(RP);
  }
  if (parts.length) {
    const r0 = ps.getLastRow() + 1;
    ps.getRange(r0, 1, parts.length, parts[0].length).setValues(parts);
    ps.getRange(r0, 2, parts.length, 1).setNumberFormat('dd/mm/yyyy');
    ps.getRange(r0, 10, parts.length, 2).setNumberFormat(RP);
  }
  return { ok: true, id: e.id, row: r };
}

function listEst_(limit) {
  const est = sheet_('EST');
  const last = est.getLastRow();
  if (last < 2) return [];
  const col = HEAD.EST.length;
  const vals = est.getRange(2, col, last - 1, 1).getValues();
  const items = [];
  for (let i = vals.length - 1; i >= 0 && items.length < limit; i--) {
    try { items.push(JSON.parse(vals[i][0])); } catch (err) {}
  }
  return items;
}

function deleteEst_(id) {
  if (!id) return { ok: false, error: 'ID kosong' };
  deleteRowsById_(sheet_('EST'), HEAD.EST.indexOf('ID') + 1, id);
  deleteRowsById_(sheet_('JASA'), HEAD.JASA.length, id);
  deleteRowsById_(sheet_('PART'), HEAD.PART.length, id);
  return { ok: true };
}

function getCJ_() {
  const sh = sheet_('CJ');
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 4).getValues()
    .filter(r => r[0] && r[1])
    .map(r => ({ id: String(r[0]), name: String(r[1]), kind: r[2] === 'G+C' ? 'gc' : 'kc', price: Number(r[3]) || 0 }));
}

function setCJ_(items) {
  const sh = sheet_('CJ');
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, HEAD.CJ.length).clearContent();
  const now = new Date();
  const rows = items.filter(c => c && c.name).map(c => [c.id, c.name, c.kind === 'gc' ? 'G+C' : 'K+C', Number(c.price) || 0, now]);
  if (rows.length) {
    sh.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    sh.getRange(2, 4, rows.length, 1).setNumberFormat(RP);
    sh.getRange(2, 5, rows.length, 1).setNumberFormat('dd/mm/yyyy hh:mm');
  }
  return { ok: true, count: rows.length };
}
