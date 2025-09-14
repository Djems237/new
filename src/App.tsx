import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDocs, collection, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { Bell, Settings, Home } from 'lucide-react';

import AuthForm from './components/AuthForm';
import UserList from './components/UserList';
import Chat from './components/Chat';
import NewsPage from './components/NewsPage';
import SettingsPage from './components/SettingsPage';
import GlobalChat from './components/GlobalChat';

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
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [recentChatUsers, setRecentChatUsers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showGlobalChat, setShowGlobalChat] = useState(false);

  useEffect(() => {
    const authUser = async () => {
      try {
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error("Authentication error:", e);
      }
    };
    authUser();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllUsers(usersList.filter(u => u.id !== currentUser.id));
    });

    return () => {
      unsubscribeUsers();
    };
  }, [isLoggedIn, currentUser]);

  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    const readStatusRef = doc(db, 'artifacts', appId, 'public', 'data', 'readStatus', currentUser.id);
    const unsubscribeReadStatus = onSnapshot(readStatusRef, async (readStatusDoc) => {
      const lastReads = readStatusDoc.exists() ? readStatusDoc.data() : {};
      const unreadCountsMap = {};
      const recentUserIds = new Set();
      const messagesRef = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
      const messagesSnapshot = await getDocs(messagesRef);

      const conversationIds = messagesSnapshot.docs.map(doc => doc.id);
      conversationIds.forEach(id => {
        const parts = id.split('_');
        if (parts.includes(currentUser.id)) {
          const otherUserId = parts.find(uid => uid !== currentUser.id);
          if (otherUserId) recentUserIds.add(otherUserId);
        }
      });

      for (const otherUserId of recentUserIds) {
        const convId = [currentUser.id, otherUserId].sort().join('_');
        const lastReadTimestamp = lastReads[convId];
        const q = lastReadTimestamp
          ? query(collection(db, 'artifacts', appId, 'public', 'data', 'messages', convId, 'chat'), where('createdAt', '>', lastReadTimestamp), where('senderId', '==', otherUserId))
          : query(collection(db, 'artifacts', appId, 'public', 'data', 'messages', convId, 'chat'), where('senderId', '==', otherUserId));

        const unreadDocs = await getDocs(q);
        const count = unreadDocs.size;
        if (count > 0) {
          unreadCountsMap[otherUserId] = count;
        }
      }

      setUnreadCounts(unreadCountsMap);

      const allUsersMap = new Map(allUsers.map(u => [u.id, u]));
      const usersWithUnread = Object.keys(unreadCountsMap).map(id => ({
        ...allUsersMap.get(id),
        unreadCount: unreadCountsMap[id]
      })).filter(u => u && u.name);
      usersWithUnread.sort((a, b) => b.unreadCount - a.unreadCount);

      const otherRecentUsers = Array.from(recentUserIds)
        .filter(id => !(id in unreadCountsMap))
        .map(id => allUsersMap.get(id))
        .filter(u => u && u.name);

      setRecentChatUsers([...usersWithUnread, ...otherRecentUsers]);
    });

    return () => {
      unsubscribeReadStatus();
    };
  }, [isLoggedIn, currentUser, allUsers]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setSelectedUser(null);
    setShowGlobalChat(false);
  };

  const renderContent = () => {
    if (!isLoggedIn) {
      return <AuthForm onLoginSuccess={handleLoginSuccess} />;
    }

    if (isMobile && selectedUser) {
      return <Chat currentUserId={currentUser.id} selectedUser={selectedUser} onBack={() => setSelectedUser(null)} />;
    }

    switch (currentPage) {
      case 'home':
        return (
          <div className="flex flex-col md:flex-row h-full gap-4">
            <div className="w-full md:w-1/3 h-full">
              <UserList users={recentChatUsers} onUserSelect={setSelectedUser} title="Recent Chats" unreadCounts={unreadCounts} />
            </div>
            <div className="w-full md:w-2/3 h-full">
              <UserList users={allUsers} onUserSelect={setSelectedUser} title="All Users" />
            </div>
          </div>
        );
      case 'messages':
        return (
          <div className="w-full h-full">
            <NewsPage unreadUsers={Object.keys(unreadCounts).map(id => allUsers.find(u => u.id === id) || {id, name: 'Unknown', unreadCount: unreadCounts[id]})
            .filter(u => u.name).sort((a, b) => b.unreadCount - a.unreadCount)} onUserSelect={setSelectedUser} />
          </div>
        );
      case 'settings':
        return <SettingsPage />;
      default:
        return null;
    }
  };

  return (
    <div className="relative w-screen h-screen bg-slate-900 overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: "url('https://placehold.co/1920x1080/1a202c/6495ED?text=Metal+Background')" }}>
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-3xl"></div>
      </div>
      <div className={`relative z-10 w-full h-full max-w-7xl flex flex-col md:flex-row gap-4 ${isMobile ? 'pb-16' : ''}`}>
        {isLoggedIn && !isMobile && (
          <div className="w-full md:w-1/4 h-full flex flex-col gap-4">
            <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-4 shadow-2xl border border-white/20 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-silver-400 to-blue-500 flex items-center justify-center text-white font-bold text-3xl mx-auto mb-2">
                {currentUser?.name[0].toUpperCase()}
              </div>
              <h1 className="text-xl font-bold text-white">{currentUser?.name}</h1>
              <p className="text-sm text-slate-400 break-words">{currentUser?.id}</p>
              <p className="text-xs text-slate-500">{currentUser?.country}</p>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-2 shadow-2xl border border-white/20 flex flex-col space-y-2">
              <button onClick={() => handlePageChange('home')} className={`flex items-center space-x-3 w-full p-3 rounded-xl transition-colors duration-200 ${currentPage === 'home' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}>
                <Home className="w-5 h-5" />
                <span className="font-medium">Home</span>
              </button>
              <button onClick={() => handlePageChange('messages')} className={`flex items-center space-x-3 w-full p-3 rounded-xl transition-colors duration-200 ${currentPage === 'messages' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}>
                <Bell className="w-5 h-5" />
                <span className="font-medium">New Messages</span>
                {Object.keys(unreadCounts).length > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">{Object.keys(unreadCounts).length}</span>
                )}
              </button>
              <button onClick={() => handlePageChange('settings')} className={`flex items-center space-x-3 w-full p-3 rounded-xl transition-colors duration-200 ${currentPage === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}>
                <Settings className="w-5 h-5" />
                <span className="font-medium">Settings</span>
              </button>
              <button onClick={() => setShowGlobalChat(true)} className={`flex items-center space-x-3 w-full p-3 rounded-xl transition-colors duration-200 ${showGlobalChat ? 'bg-green-600 text-white' : 'text-slate-400 hover:bg-slate-700/50'}`}>
                <span className="w-5 h-5 flex items-center justify-center"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="8" /><path d="M8 10h4" /><path d="M10 8v4" /></svg></span>
                <span className="font-medium">Global chat</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 h-full overflow-y-auto">
          {showGlobalChat ? (
            <GlobalChat currentUserId={currentUser?.id} currentUserName={currentUser?.name} onBack={() => setShowGlobalChat(false)} />
          ) : (
            renderContent()
          )}
        </div>

        {isLoggedIn && selectedUser && !isMobile && !showGlobalChat && (
          <div className="w-full md:w-2/3 h-full">
            <Chat currentUserId={currentUser.id} selectedUser={selectedUser} onBack={() => setSelectedUser(null)} />
          </div>
        )}

        {isLoggedIn && isMobile && !showGlobalChat && (
          <div className="fixed bottom-0 left-0 right-0 bg-slate-800/50 backdrop-blur-lg border-t border-white/20 p-2 flex justify-around">
            <button onClick={() => handlePageChange('home')} className={`relative flex flex-col items-center space-y-1 p-2 rounded-xl transition-colors duration-200 ${currentPage === 'home' ? 'text-blue-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>
              <Home className="w-6 h-6" />
              <span className="text-xs font-medium">Home</span>
            </button>
            <button onClick={() => handlePageChange('messages')} className={`relative flex flex-col items-center space-y-1 p-2 rounded-xl transition-colors duration-200 ${currentPage === 'messages' ? 'text-blue-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>
              <Bell className="w-6 h-6" />
              <span className="text-xs font-medium">Messages</span>
              {Object.keys(unreadCounts).length > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">{Object.keys(unreadCounts).length}</span>
                )}
            </button>
            <button onClick={() => setShowGlobalChat(true)} className={`relative flex flex-col items-center space-y-1 p-2 rounded-xl transition-colors duration-200 ${showGlobalChat ? 'text-green-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>
              <span className="w-6 h-6 flex items-center justify-center"><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M10 12h4" /><path d="M12 10v4" /></svg></span>
              <span className="text-xs font-medium">Global</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;