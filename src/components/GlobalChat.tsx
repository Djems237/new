import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { getFirestore, doc, onSnapshot, collection, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

// Initialisation de Firebase
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

const GlobalChat = ({ currentUserId, currentUserName, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const conversationId = 'global';

  useEffect(() => {
    const messagesRef = collection(db, 'artifacts', appId, 'public', 'data', 'messages', conversationId, 'chat');
    const unsubscribe = onSnapshot(messagesRef, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      messagesList.sort((a, b) => a.createdAt?.seconds - b.createdAt?.seconds);
      setMessages(messagesList);
      scrollToBottom();
    });
    return () => unsubscribe();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      const messagesRef = collection(db, 'artifacts', appId, 'public', 'data', 'messages', conversationId, 'chat');
      await addDoc(messagesRef, {
        senderId: currentUserId,
        senderName: currentUserName,
        text: newMessage,
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-white/10 backdrop-blur-lg rounded-2xl p-4 shadow-2xl border border-white/20">
      <div className="flex items-center space-x-2 pb-4 border-b border-white/20">
        <button onClick={onBack} className="md:hidden text-white hover:text-blue-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
          G
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Global Chat</h2>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto my-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3 rounded-xl max-w-xs md:max-w-md break-words ${msg.senderId === currentUserId ? 'bg-green-600 text-white rounded-br-none' : 'bg-gray-700 text-white rounded-bl-none'}`}>
              <div className="flex items-center mb-1">
                <span className="font-bold text-xs mr-2">{msg.senderName || msg.senderId}</span>
                <span className="block text-right text-xs text-gray-400">
                  {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm">{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
        <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Write a message..." className="flex-1 pl-4 pr-3 py-2 border border-slate-600 rounded-xl bg-slate-800/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
        <button type="submit" className="p-3 bg-green-600 rounded-xl text-white shadow-lg hover:bg-green-500 transition-colors duration-200">
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

export default GlobalChat;
