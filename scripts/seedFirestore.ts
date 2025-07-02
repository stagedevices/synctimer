// 📁 Before running seed, be sure to mkdir -p ./emulator-data and start emulators with --import=./emulator-data --export-on-exit

import * as admin from 'firebase-admin';

admin.initializeApp({ projectId: 'synctimer-dev-464400' });
if (process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
}
const db = admin.firestore();

async function createParseLogs() {
  try {
    const snap = await db.collection('parseLogs').limit(1).get();
    if (!snap.empty) {
      console.log('⚠️ parseLogs already exists');
      return;
    }
    await db.collection('parseLogs').add({
      user: 'seed',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'ready',
      inputSize: 0
    });
    console.log('✅ created parseLogs');
  } catch (err) {
    console.error('Error creating parseLogs', err);
  }
}

async function createUserProfile() {
  try {
    const profileDoc = db.doc('users/SEED_USER/profile');
    const snap = await profileDoc.get();
    if (snap.exists) {
      console.log('⚠️ users/SEED_USER/profile already exists');
      return;
    }
    await profileDoc.set({
      displayName: 'Seed User',
      email: 'seed@example.com',
      username: 'seed',
      pronouns: 'they/them',
      bio: 'This is a seeded user profile.',
      photoURL: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ created users/SEED_USER/profile');
  } catch (err) {
    console.error('Error creating profile', err);
  }
}

async function createUsernameMapping() {
  try {
    const ref = db.doc('usernames/seed');
    const snap = await ref.get();
    if (snap.exists) {
      console.log('⚠️ usernames/seed already exists');
      return;
    }
    await ref.set({ uid: 'SEED_USER' });
    console.log('✅ created usernames/seed');
  } catch (err) {
    console.error('Error creating username mapping', err);
  }
}

async function createTag() {
  try {
    const tagRef = db.doc('tags/percussionist');
    const tagSnap = await tagRef.get();
    if (tagSnap.exists) {
      console.log('⚠️ tags/percussionist already exists');
    } else {
      await tagRef.set({
        name: 'percussionist',
        type: 'instrument',
        createdBy: 'seed',
        memberCount: 1
      });
      console.log('✅ created tags/percussionist');
    }

    const memberRef = tagRef.collection('members').doc('SEED_USER');
    const memberSnap = await memberRef.get();
    if (memberSnap.exists) {
      console.log('⚠️ tags/percussionist/members/SEED_USER already exists');
    } else {
      await memberRef.set({});
      console.log('✅ added SEED_USER to tags/percussionist members');
    }
  } catch (err) {
    console.error('Error creating tag', err);
  }
}

async function createGroup() {
  try {
    const groupRef = db.doc('groups/laphil');
    const groupSnap = await groupRef.get();
    if (groupSnap.exists) {
      console.log('⚠️ groups/laphil already exists');
    } else {
      await groupRef.set({
        name: 'LA Phil',
        description: 'Los Angeles Philharmonic',
        managerUid: 'SEED_USER',
        visibility: 'invite-only',
        memberCount: 1,
        status: 'verified'
      });
      console.log('✅ created groups/laphil');
    }

    const memberRef = groupRef.collection('members').doc('SEED_USER');
    const memberSnap = await memberRef.get();
    if (memberSnap.exists) {
      console.log('⚠️ groups/laphil/members/SEED_USER already exists');
    } else {
      await memberRef.set({ role: 'owner' });
      console.log('✅ added SEED_USER to groups/laphil members');
    }
  } catch (err) {
    console.error('Error creating group', err);
  }
}

async function createUserFiles() {
  try {
    const filesRef = db.collection('users').doc('SEED_USER').collection('files');
    const filesSnap = await filesRef.limit(1).get();
    if (!filesSnap.empty) {
      console.log('⚠️ users/SEED_USER/files already has documents');
      return;
    }
    await filesRef.add({
      title: 'foo.yaml',
      yaml: 'bar: baz\n',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      size: 8,
      status: 'ready'
    });
    console.log('✅ created sample file for SEED_USER');
  } catch (err) {
    console.error('Error creating user file', err);
  }
}

async function main() {
  await createParseLogs();
  await createUserProfile();
  await createUsernameMapping();
  await createTag();
  await createGroup();
  await createUserFiles();
  console.log('Seeding complete.');
}

main().catch(err => {
  console.error('Seeding failed', err);
  process.exit(1);
});
