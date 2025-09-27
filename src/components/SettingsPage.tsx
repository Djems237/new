import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const db = getFirestore();
const auth = getAuth();
const appId = 'default-app-id';

const SettingsPage = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [verified, setVerified] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
      getDoc(userRef).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setName(data.name || '');
          setPhone(data.phone || '');
          setVerified(!!data.name);
        }
      });
    }
  }, [user]);

  const handleVerify = () => setShowPopup(true);
  const handleSave = async () => {
    if (user) {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
      await setDoc(userRef, { name, phone }, { merge: true });
      setVerified(true);
      setShowPopup(false);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 text-center h-full flex flex-col justify-center items-center">
      <Settings className="w-16 h-16 text-blue-400 mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">Settings</h2>
      {verified ? (
        <>
          <div className="mb-4">
            <div className="text-white font-bold">Name: {name}</div>
            <div className="text-white">Phone: {phone || 'Not provided'}</div>
          </div>
          <button onClick={handleVerify} className="px-4 py-2 bg-blue-600 text-white rounded">Modify</button>
        </>
      ) : (
        <button onClick={handleVerify} className="px-4 py-2 bg-green-600 text-white rounded">Verify</button>
      )}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl w-80 flex flex-col items-center">
            <h3 className="text-lg font-bold mb-4">Verify your info</h3>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="mb-2 p-2 rounded w-full border" />
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone (optional)" className="mb-4 p-2 rounded w-full border" />
            <div className="flex space-x-2">
              <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded">Save</button>
              <button onClick={() => setShowPopup(false)} className="px-4 py-2 bg-gray-500 text-white rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
