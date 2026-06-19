/**
 * Firestore staff koleksiyonuna is_admin alanı ekler.
 *
 * Kullanım:
 *   node scripts/migrate-staff-admin.mjs makara
 *   node scripts/migrate-staff-admin.mjs makara --admin-id 1
 *   node scripts/migrate-staff-admin.mjs makara --admin-name "Erol"
 *
 * Tüm personele is_admin: false yazar; --admin-id veya --admin-name ile bir kişiyi true yapar.
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';

const BRANCHES = {
  makara: {
    apiKey: 'AIzaSyCdf-c13e0wCafRYHXhIls1epJgD1RjPUA',
    authDomain: 'makara-16344.firebaseapp.com',
    projectId: 'makara-16344',
    storageBucket: 'makara-16344.firebasestorage.app',
    messagingSenderId: '216769654742',
    appId: '1:216769654742:web:16792742d4613f4269be77',
  },
  makarasur: {
    apiKey: 'AIzaSyDnVpG-Hl7n2a1esMO4rZhq9JfqpKd3VUo',
    authDomain: 'makarasurici.firebaseapp.com',
    projectId: 'makarasurici',
    storageBucket: 'makarasurici.firebasestorage.app',
    messagingSenderId: '237735301273',
    appId: '1:237735301273:web:bf62c8f145434df0292808',
  },
  sultansomati: {
    apiKey: 'AIzaSyB_sSvCgbWC4HYKufueqfoDmbBS4SHlUnA',
    authDomain: 'sultansomati-5a3e9.firebaseapp.com',
    projectId: 'sultansomati-5a3e9',
    storageBucket: 'sultansomati-5a3e9.firebasestorage.app',
    messagingSenderId: '166037373406',
    appId: '1:166037373406:web:ed1c3724085446ae0d1d4f',
  },
};

function parseArgs(argv) {
  const branchKey = argv[2];
  let adminId = null;
  let adminName = null;

  for (let i = 3; i < argv.length; i += 1) {
    if (argv[i] === '--admin-id' && argv[i + 1]) {
      adminId = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--admin-name' && argv[i + 1]) {
      adminName = argv[i + 1].toLowerCase();
      i += 1;
    }
  }

  return { branchKey, adminId, adminName };
}

async function main() {
  const { branchKey, adminId, adminName } = parseArgs(process.argv);

  if (!branchKey || !BRANCHES[branchKey]) {
    console.error('Kullanım: node scripts/migrate-staff-admin.mjs <makara|makarasur|sultansomati> [--admin-id ID] [--admin-name "Ad"]');
    process.exit(1);
  }

  const app = initializeApp(BRANCHES[branchKey], 'admin-migrate');
  const db = getFirestore(app);
  const snap = await getDocs(collection(db, 'staff'));

  if (snap.empty) {
    console.log('staff koleksiyonu boş.');
    process.exit(0);
  }

  let adminDocId = null;

  for (const d of snap.docs) {
    const data = d.data();
    const fullName = `${data.name || ''} ${data.surname || ''}`.trim().toLowerCase();
    const firstName = (data.name || '').trim().toLowerCase();

    let isAdmin = false;
    if (adminId != null && String(d.id) === String(adminId)) {
      isAdmin = true;
      adminDocId = d.id;
    } else if (adminName && (fullName.includes(adminName) || firstName === adminName)) {
      isAdmin = true;
      adminDocId = d.id;
    }

    await updateDoc(doc(db, 'staff', d.id), { is_admin: isAdmin });
    console.log(`  ${d.id} · ${data.name || ''} ${data.surname || ''} → is_admin: ${isAdmin}`);
  }

  console.log(`\nTamamlandı (${snap.size} personel).`);
  if (adminDocId) {
    console.log(`Yönetici: doküman ${adminDocId}`);
  } else if (adminId || adminName) {
    console.warn('Uyarı: Yönetici eşleşmesi bulunamadı; hepsi false olarak işaretlendi.');
  } else {
    console.log('İpucu: Kendinizi yönetici yapmak için --admin-id veya --admin-name ekleyin.');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
