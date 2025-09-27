import { getFirestore, collection, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
import { appId, db } from '../App';

export async function isUsernameTaken(username: string): Promise<boolean> {
  const usernameRef = doc(db, 'artifacts', appId, 'public', 'data', 'usernames', username);
  const snap = await getDoc(usernameRef);
  return snap.exists();
}

export async function registerUsername(username: string, userId: string) {
  const usernameRef = doc(db, 'artifacts', appId, 'public', 'data', 'usernames', username);
  await setDoc(usernameRef, { userId });
}

export async function getAllUsernames(): Promise<{name: string, userId: string}[]> {
  const usernamesRef = collection(db, 'artifacts', appId, 'public', 'data', 'usernames');
  const snap = await getDocs(usernamesRef);
  return snap.docs.map(doc => ({ name: doc.id, userId: doc.data().userId }));
}