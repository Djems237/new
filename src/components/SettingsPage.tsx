import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp } from 'lucide-react';
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

  useEffect(() => {
    if (tradingViewRef.current) {
      tradingViewRef.current.innerHTML = '';
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
      script.innerHTML = `{
        "symbols": [
          ["Apple", "AAPL|1D"],
          ["Microsoft", "MSFT|1D"],
          ["Google", "GOOGL|1D"]
        ],
        "chartOnly": false,
        "width": "100%",
        "height": "100%",
        "locale": "fr",
        "colorTheme": "light",
        "autosize": true,
        "showVolume": false,
        "showMA": false,
        "hideDateRanges": false,
        "hideMarketStatus": false,
        "hideSymbolLogo": false,
        "scalePosition": "right",
        "scaleMode": "Normal",
        "fontFamily": "Inter, sans-serif",
        "fontSize": "12",
        "noTimeScale": false,
        "valuesTracking": "1",
        "chartType": "area",
        "timeSeriesSteps": ["1D", "1W", "1M"]
      }`;
      tradingViewRef.current.appendChild(script);
    }
  }, []);

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
      {/* Logo Trading en haut */}
      <TrendingUp className="w-16 h-16 text-blue-400 mb-4" />
      <h2 className="text-3xl font-bold text-gray-800 mb-2">Aperçu Boursier en Direct</h2>
      <p className="text-center text-sm text-gray-500 mb-4">Fourni par le widget Symbol Overview de TradingView</p>
      <div className="w-full flex justify-center mb-6">
        <div ref={tradingViewRef} className="w-full max-w-2xl widget-wrapper" style={{ height: 450 }} />
      </div>
      {/* ...infos utilisateur... */}
      <div className="mb-4">
        <div className="text-white font-bold">Name: {name}</div>
        <div className="text-white">Phone: {phone || 'Not provided'}</div>
      </div>
      {verified ? (
        <>
          <button onClick={handleVerify} className="px-4 py-2 bg-blue-600 text-white rounded">Modify</button>
        </>
      ) : null}
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
