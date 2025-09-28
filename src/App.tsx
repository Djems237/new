import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
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

// Nouvelle interface User sans id
interface User {
  name: string;
  country?: string;
  [key: string]: any;
}

// Ajout : utilitaire pour gérer les noms d'utilisateurs uniques
// Fichier à créer : /home/rd/Téléchargements/metals-main/src/utils/usernames.ts
//
// import { db } from '../App';
// import { collection, doc, getDoc, setDoc, getDocs } from 'firebase/firestore';
//
// export async function isUsernameTaken(username: string): Promise<boolean> {
//   const usernameRef = doc(db, 'artifacts', appId, 'public', 'data', 'usernames', username);
//   const snap = await getDoc(usernameRef);
//   return snap.exists();
// }
//
// export async function registerUsername(username: string, userId: string) {
//   const usernameRef = doc(db, 'artifacts', appId, 'public', 'data', 'usernames', username);
//   await setDoc(usernameRef, { userId });
// }
//
// export async function getAllUsernames(): Promise<string[]> {
//   const usernamesRef = collection(db, 'artifacts', appId, 'public', 'data', 'usernames');
//   const snap = await getDocs(usernamesRef);
//   return snap.docs.map(doc => doc.id);
// }

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [recentChatUsers, setRecentChatUsers] = useState<User[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showGlobalChat, setShowGlobalChat] = useState(false);

  useEffect(() => {
    // Ne pas faire de connexion automatique ici, laisser AuthForm gérer la connexion
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    // On lit la collection 'users' et on récupère les noms ou les ids
    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      const usersList = snapshot.docs.map(doc => {
        const data = doc.data();
        if (data && data.name) {
          return { name: data.name, country: data.country };
        } else {
          return { name: doc.id };
        }
      });
      setAllUsers(usersList);
    });

    return () => {
      unsubscribeUsers();
    };
  }, [isLoggedIn, currentUser]);

  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;

    const readStatusRef = doc(db, 'artifacts', appId, 'public', 'data', 'readStatus', currentUser.name);
    const unsubscribeReadStatus = onSnapshot(readStatusRef, async (readStatusDoc) => {
      const lastReads = readStatusDoc.exists() ? readStatusDoc.data() : {};
      const unreadCountsMap: Record<string, number> = {};
      const recentUserIds = new Set<string>();
      const messagesRef = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
      const messagesSnapshot = await getDocs(messagesRef);

      const conversationIds = messagesSnapshot.docs.map(doc => doc.id);
      conversationIds.forEach(id => {
        const parts = id.split('_');
        if (parts.includes(currentUser.name)) {
          const otherUserId = parts.find(uid => uid !== currentUser.name);
          if (otherUserId) recentUserIds.add(otherUserId);
        }
      });

      for (const otherUserId of Array.from(recentUserIds)) {
        const convId = [currentUser.name, otherUserId].sort().join('_');
        const lastReadTimestamp = lastReads[convId];
        // On récupère les messages de la conversation
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

      // Afficher toutes les conversations récentes (même sans non lus)
      const allUsersMap = new Map(allUsers.map(u => [u.name, u]));
      const usersWithUnread = Object.keys(unreadCountsMap).map(name => ({
        ...allUsersMap.get(name),
        unreadCount: unreadCountsMap[name]
      })).filter(u => u && u.name);
      usersWithUnread.sort((a, b) => b.unreadCount - a.unreadCount);

      // Ajout : afficher aussi les conversations où il y a au moins un message (même si tout est lu)
      const allConversations = Array.from(recentUserIds).map(name => allUsersMap.get(name)).filter(u => u && u.name);
      const uniqueConversations = [...new Map([...usersWithUnread, ...allConversations].filter(u => u).map(u => [u.name, u])).values()];
      setRecentChatUsers(uniqueConversations.filter((u): u is User => !!u && !!u.name) as User[]);
    });

    return () => {
      unsubscribeReadStatus();
    };
  }, [isLoggedIn, currentUser, allUsers]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
  };

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    setSelectedUser(null);
    setShowGlobalChat(false);
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setRecentChatUsers(prev => {
      if (!prev.some(u => u.name === user.name)) {
        return [...prev, user];
      }
      return prev;
    });
  };

  const handleStartPrivateChat = (userName: string) => {
    const user = allUsers.find(u => u.name === userName);
    if (user) {
      setSelectedUser(user);
      setRecentChatUsers(prev => {
        if (!prev.some(u => u.name === user.name)) {
          return [...prev, user];
        }
        return prev;
      });
      setCurrentPage('messages');
      setShowGlobalChat(false);
    }
  };

  const renderContent = () => {
    if (!isLoggedIn) {
      return <AuthForm onLoginSuccess={handleLoginSuccess} />;
    }

    if (isMobile && selectedUser) {
      return <Chat currentUserId={currentUser.name} selectedUser={selectedUser} onBack={() => setSelectedUser(null)} />;
    }

    switch (currentPage) {
      case 'home':
        return (
          <div className="flex flex-col md:flex-row h-full gap-4">
            <div className="w-full md:w-2/3 h-full">
              <UserList users={allUsers.filter(u => currentUser && u.name !== currentUser.name)} onUserSelect={handleUserSelect} title="All Users" />
            </div>
          </div>
        );
      case 'messages':
        return (
          <div className="w-full h-full">
            <NewsPage
              unreadUsers={recentChatUsers.map(u => ({
                ...u,
                unreadCount: unreadCounts[u.name] || 0
              })).filter(u => u.name).sort((a, b) => b.unreadCount - a.unreadCount)}
              onUserSelect={setSelectedUser}
            />
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
              <p className="text-sm text-slate-400 break-words">{currentUser?.name}</p>
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
            <GlobalChat
              currentUserId={currentUser ? currentUser.name : ''}
              currentUserName={currentUser ? currentUser.name : ''}
              onBack={() => setShowGlobalChat(false)}
              onStartPrivateChat={handleStartPrivateChat}
            />
          ) : (
            renderContent()
          )}
        </div>

        {isLoggedIn && selectedUser && !isMobile && !showGlobalChat && (
          <div className="w-full md:w-2/3 h-full">
            <Chat currentUserId={currentUser.name} selectedUser={selectedUser} onBack={() => setSelectedUser(null)} />
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
              <span className="text-xs font-medium">Global Chat</span>
            </button>
            <button onClick={() => handlePageChange('settings')} className={`relative flex flex-col items-center space-y-1 p-2 rounded-xl transition-colors duration-200 ${currentPage === 'settings' ? 'text-blue-400' : 'text-slate-400 hover:bg-slate-700/50'}`}>
              <Settings className="w-6 h-6" />
              <span className="text-xs font-medium">Settings</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Utilise toujours le même identifiant pour la conversation (name ou id)
// Exemple à utiliser dans Chat.tsx et pour la lecture/écriture des messages :
// const userA = currentUser.name || currentUser.id;
// const userB = selectedUser.name || selectedUser.id;
// const conversationId = [userA, userB].sort().join('_');
// Utilise conversationId pour lire/écrire les messages Firestore

export default App;