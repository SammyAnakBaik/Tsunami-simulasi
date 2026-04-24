// js/config.js
const CFG = {
  PLAYER_SPEED: 9, PLAYER_RUN: 18, PLAYER_JUMP: 11, GRAVITY: -28,
  PLAYER_H: 1.7, CAM_SENS: 0.0022, CAM_FOV: 72,
  WORLD_SIZE: 500,
  WAVE_SPEED_INIT: 12, WAVE_SPEED_MAX: 50, WAVE_H_MAX: 30,
  WAVE_START_Z: 230,
  SAFE_ZONE: { x: 0, z: -110, r: 32 },
  START_H: 7, START_M: 58,
  TIME_SCALE: 25,
  QUAKE_DUR: 9, QUAKE_INT: 0.18,
  QUAKE_TIME: 3, WARN_TIME: 16, WAVE_TIME: 22,
};

const DIFFICULTY = {
  easy:   { waveSpeedMul: 0.6, waveTimeMul: 1.5, npcCount: 5,  decisionTime: 15 },
  normal: { waveSpeedMul: 1.0, waveTimeMul: 1.0, npcCount: 8,  decisionTime: 10 },
  hard:   { waveSpeedMul: 1.6, waveTimeMul: 0.7, npcCount: 12, decisionTime: 6  },
};

const NPC_NAMES = [
  'Pak Rahmat','Bu Aminah','Andi','Siti','Pak Hasan','Bu Fatimah',
  'Rizki','Laila','Pak Daud','Bu Maryam','Yusuf','Nurul',
  'Pak Zulkifli','Bu Khadijah','Farhan','Zara','Pak Ibrahim','Dewi',
];

const NPC_DIALOGS = {
  calm:   ['Ada apa ini?','Gempa lagi...','Alhamdulillah masih aman.','Ini gempa besar sekali!'],
  scared: ['Tolong! Saya takut!','Gempa! Gempa besar!','Mau lari ke mana?','Allahu Akbar...'],
  asking: ['Ke mana kita lari?','Di mana tempat aman?','Apakah tsunami akan datang?','Bantu saya!'],
  follow: ['Oke, saya ikut!','Jangan tinggalkan saya!','Cepat, saya tidak bisa lari cepat!'],
  rescue: ['Terima kasih sudah menyelamatkan saya!','Semoga Allah membalas kebaikanmu.','Kita harus cepat!'],
};

const HISTORY_FACTS = [
  { label:'Kekuatan Gempa', val:'9,1 SR' },
  { label:'Korban Jiwa', val:'±230.000' },
  { label:'Tinggi Gelombang', val:'hingga 30m' },
  { label:'Negara Terdampak', val:'14 negara' },
  { label:'Durasi Gempa', val:'~10 menit' },
  { label:'Dana Rekonstruksi', val:'$7,5 Miliar' },
];

const EDU_TIPS = [
  'Saat merasakan gempa kuat di pantai, langsung lari ke dataran tinggi.',
  'Jangan tunggu peringatan resmi — waktu sangat berharga.',
  'Jika melihat air laut surut drastis, itu tanda tsunami akan datang!',
  'Tinggalkan semua barang berharga — nyawa lebih penting.',
  'Lari menjauh dari pantai, bukan menjauhi pantai secara diagonal.',
  'Sistem peringatan dini kini ada di Samudra Hindia berkat tragedi ini.',
];

const SURVIVE_TIPS = [
  'Ingat tanda bahaya: tanah bergetar kuat + air surut = LARI!',
  'Zona evakuasi biasanya ditandai papan hijau — kenali lokasinya.',
  'Bantu orang yang lebih lambat: lansia, anak-anak, difabel.',
  'Setelah selamat, jangan kembali sebelum ada izin resmi.',
  'Pelajari peta jalur evakuasi di daerah pantai tempat tinggalmu.',
];

const NARRATIVES = [
  { t:0,  time:'07:58 WIB', txt:'Minggu pagi yang tenang di Banda Aceh. Warga bersiap menjalani hari.' },
  { t:3,  time:'07:58 WIB', txt:'🌍 GEMPA DAHSYAT! 9,1 Skala Richter — salah satu terkuat dalam sejarah!' },
  { t:12, time:'07:59 WIB', txt:'Air laut mulai surut secara tidak wajar. Ini tanda peringatan bahaya!' },
  { t:18, time:'07:59 WIB', txt:'🚨 WASPADA! Air surut ekstrem — tsunami bisa datang kapan saja. LARI!' },
  { t:23, time:'08:00 WIB', txt:'🌊 TSUNAMI! Gelombang raksasa terlihat dari kejauhan — LARI SEKARANG!' },
  { t:45, time:'08:01 WIB', txt:'Jangan berhenti! Terus lari ke bukit — selamatkan dirimu dan orang lain!' },
  { t:80, time:'08:02 WIB', txt:'Gelombang menghantam kota dengan kekuatan dahsyat. Zona aman sudah dekat!' },
];

const ENDINGS = {
  perfect: { title:'PAHLAWAN SEJATI', ico:'🏆', desc:'Kamu berhasil menyelamatkan semua warga dan mencapai zona aman!', msg:'Tindakanmu menyelamatkan nyawa orang lain di saat kritis. Seperti itulah semangat gotong royong Indonesia.' },
  good:    { title:'SELAMAT', ico:'🙏', desc:'Kamu berhasil selamat dan menyelamatkan sebagian warga.', msg:'Setiap nyawa yang diselamatkan sangat berarti. Kamu telah berbuat lebih dari yang bisa dilakukan banyak orang.' },
  bare:    { title:'SELAMAT (TIPIS)', ico:'😰', desc:'Kamu berhasil selamat, namun banyak warga yang tidak berhasil diselamatkan.', msg:'Kamu selamat, tapi masih banyak yang bisa dipelajari tentang respons evakuasi yang lebih baik.' },
};
