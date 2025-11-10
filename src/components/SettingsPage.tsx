import React, { useState, useEffect, useRef } from 'react';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import TradingViewWidget from './TradingViewWidget';

const db = getFirestore();
const auth = getAuth();
const appId = 'default-app-id';

const SettingsPage = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [verified, setVerified] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const user = auth.currentUser;
  const tradingViewRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-blue');
    document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('theme', theme);
  }, [theme]);

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
    <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-4 shadow-2xl border border-white/20 h-full">
      <h2 className="text-xl font-bold text-white mb-4">Economic Calendar</h2>
      <div className="h-[calc(100%-4rem)]">
        <TradingViewWidget />
      </div>
    </div>
  );
};

export default SettingsPage;
