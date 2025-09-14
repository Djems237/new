import React, { useState, useEffect } from 'react';
import { MessageCircle, User, Globe, KeySquare } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase Initialization
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyA9fMT5Sj91Z3BzgcF8TvVvocRzide3nNc",
  authDomain: "datascrapr-d6250.firebaseapp.com",
  projectId: "datascrapr-d6250",
  storageBucket: "datascrapr-d6250.appspot.com",
  messagingSenderId: "861823831568",
  appId: "1:861823831568:web:f4f71e45c7d10d480d4495",
  measurementId: "G-7Q9L777MX6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const AuthForm = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    nom: '', 
    password: '', 
    country: '' 
  });
  const [showPolicy, setShowPolicy] = useState(false);

  // Get user country from IP
  useEffect(() => {
    const fetchCountry = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        setFormData(prev => ({ ...prev, country: data.country_name || 'Unknown' }));
      } catch (err) {
        console.error('Error fetching country:', err);
        setFormData(prev => ({ ...prev, country: 'Unknown' }));
      }
    };
    fetchCountry();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      const q = query(usersRef, where('name', '==', formData.nom));
      const querySnapshot = await getDocs(q);

      if (isLogin) {
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          const userData = userDoc.data();
          if (userData.password === formData.password) {
            onLoginSuccess({ id: userDoc.id, ...userData });
          } else {
            setError("Incorrect password.");
          }
        } else {
          setError("No account found with this username.");
        }
      } else {
        if (!querySnapshot.empty) {
          setError("An account with this username already exists.");
        } else {
          const newUserRef = doc(usersRef);
          await setDoc(newUserRef, {
            name: formData.nom,
            password: formData.password,
            country: formData.country,
            createdAt: serverTimestamp()
          });
          const newUserDoc = await getDocs(query(usersRef, where('name', '==', formData.nom)));
          const newUser = newUserDoc.docs[0];
          onLoginSuccess({ id: newUser.id, ...newUser.data() });
        }
      }
    } catch (err) {
      console.error('Firebase Error:', err);
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError(null);
    setFormData({ nom: '', password: '', country: formData.country });
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-silver-400 to-blue-500 rounded-xl shadow-2xl mb-4 transform hover:scale-110 transition-transform duration-300">
          <MessageCircle className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          <span className="bg-gradient-to-r from-silver-200 via-white to-blue-300 bg-clip-text text-transparent">
            Metal Exchange
          </span>
        </h1>
        <p className="text-slate-400 text-sm">
          {isLogin ? 'Welcome back' : 'Join the community'}
        </p>
      </div>
      <div className="relative">
        <div
          className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 transform transition-all duration-700 hover:shadow-3xl"
          style={{ transform: 'perspective(1000px) rotateY(0deg)', transformStyle: 'preserve-3d' }}
        >
          <div className="flex mb-6 bg-slate-800/50 rounded-xl p-1">
            <button
              onClick={switchMode}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 transform ${!isLogin ? 'bg-gradient-to-r from-silver-400 to-blue-500 text-white shadow-lg scale-105' : 'text-slate-300 hover:text-white'}`}
            >
              Sign Up
            </button>
            <button
              onClick={switchMode}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-300 transform ${isLogin ? 'bg-gradient-to-r from-silver-400 to-blue-500 text-white shadow-lg scale-105' : 'text-slate-300 hover:text-white'}`}
            >
              Login
            </button>
          </div>
          {error && (
            <div className="bg-red-500/20 text-red-300 text-sm p-3 rounded-lg mb-4 animate-fadeIn">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-slate-400 group-focus-within:text-blue-400 transition-colors duration-200" />
              </div>
              <input type="text" name="nom" value={formData.nom} onChange={handleInputChange} placeholder="Username" required className="block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-xl bg-slate-800/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 transform hover:scale-[1.02] focus:scale-[1.02]" />
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeySquare className="h-5 w-5 text-slate-400 group-focus-within:text-blue-400 transition-colors duration-200" />
              </div>
              <input type="password" name="password" value={formData.password} onChange={handleInputChange} placeholder="Password" required className="block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-xl bg-slate-800/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 transform hover:scale-[1.02] focus:scale-[1.02]" />
            </div>
            {!isLogin && (
              <div className="relative group transform transition-all duration-500 animate-fadeIn">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Globe className="h-5 w-5 text-slate-400 group-focus-within:text-blue-400 transition-colors duration-200" />
                </div>
                <input type="text" name="country" value={formData.country} readOnly disabled className="block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-xl bg-slate-800/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 transform hover:scale-[1.02] focus:scale-[1.02]" />
              </div>
            )}
            <button type="submit" disabled={loading} className="w-full py-3 px-4 bg-gradient-to-r from-silver-500 via-slate-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/50 active:scale-[0.98] relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed">
              <span className="relative z-10">
                {loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-slate-400 text-xs">
              By continuing, you agree to our{' '}
              <span className="text-blue-400 hover:text-blue-300 cursor-pointer underline transition-colors duration-200" onClick={() => setShowPolicy(true)}>
                Terms of Service
              </span>{' '}
              and our{' '}
              <span className="text-blue-400 hover:text-blue-300 cursor-pointer underline transition-colors duration-200" onClick={() => setShowPolicy(true)}>
                Privacy Policy
              </span>
            </p>
          </div>
          {showPolicy && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full relative">
                <button className="absolute top-2 right-2 text-slate-500 hover:text-blue-600 text-xl font-bold" onClick={() => setShowPolicy(false)}>&times;</button>
                <h2 className="text-lg font-bold mb-2 text-slate-800">Privacy Policy</h2>
                <p className="text-slate-700 text-sm mb-2">Your information is used only for account management. It will never be shared without your consent.</p>
              </div>
            </div>
          )}
        </div>
        <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full opacity-60 animate-pulse"></div>
        <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-gradient-to-r from-silver-400 to-blue-500 rounded-full opacity-40 animate-bounce"></div>
      </div>
    </div>
  );
};

export default AuthForm;
