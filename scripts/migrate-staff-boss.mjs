/**
 * Firestore staff koleksiyonuna is_boss alanı ekler.
 *
 * Kullanım:
 *   npm run staff:boss -- makara
 *   npm run staff:boss -- makara --boss-id 2
 *   npm run staff:boss -- makara --boss-name "Ahmet"
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
  let bossId = null;
  let bossName = null;

  for (let i = 3; i < argv.length; i += 1) {
    if (argv[i] === '--boss-id' && argv[i + 1]) {
      bossId = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--boss-name' && argv[i + 1]) {
      bossName = argv[i + 1].toLowerCase();
      i += 1;
    }
  }

  return { branchKey, bossId, bossName };
}

async function main() {
  const { branchKey, bossId, bossName } = parseArgs(process.argv);

  if (!branchKey || !BRANCHES[branchKey]) {
    console.error('Kullanım: npm run staff:boss -- <makara|makarasur|sultansomati> [--boss-id ID] [--boss-name "Ad"]');
    process.exit(1);
  }

  const app = initializeApp(BRANCHES[branchKey], 'boss-migrate');
  const db = getFirestore(app);
  const snap = await getDocs(collection(db, 'staff'));

  if (snap.empty) {
    console.log('staff koleksiyonu boş.');
    process.exit(0);
  }

  let bossDocId = null;

  for (const d of snap.docs) {
    const data = d.data();
    const fullName = `${data.name || ''} ${data.surname || ''}`.trim().toLowerCase();
    const firstName = (data.name || '').trim().toLowerCase();

    let isBoss = false;
    if (bossId != null && String(d.id) === String(bossId)) {
      isBoss = true;
      bossDocId = d.id;
    } else if (bossName && (fullName.includes(bossName) || firstName === bossName)) {
      isBoss = true;
      bossDocId = d.id;
    }

    await updateDoc(doc(db, 'staff', d.id), { is_boss: isBoss });
    console.log(`  ${d.id} · ${data.name || ''} ${data.surname || ''} → is_boss: ${isBoss}`);
  }

  console.log(`\nTamamlandı (${snap.size} personel).`);
  if (bossDocId) {
    console.log(`Patron: doküman ${bossDocId}`);
  } else if (bossId || bossName) {
    console.warn('Uyarı: Patron eşleşmesi bulunamadı; hepsi false olarak işaretlendi.');
  } else {
    console.log('İpucu: Patron atamak için --boss-id veya --boss-name ekleyin.');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
