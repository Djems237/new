import React, { useState, useEffect, useRef } from 'react';
import { Send, Camera, Trash2, Edit2, Mic } from 'lucide-react';
import { getFirestore, doc, onSnapshot, collection, addDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

// Initialisation de Firebase
const appId = 'default-app-id';
const firebaseConfig = {
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

const CLOUDINARY_CLOUD_NAME = 'demhlpk5q';
const CLOUDINARY_UPLOAD_PRESET = 'new_appchat'; // Remplace par le nom de ton preset non signé

interface Message {
  id: string;
  senderId?: string;
  senderName?: string;
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  createdAt?: { seconds: number; toDate: () => Date };
}

interface GlobalChatProps {
  currentUserId: string;
  currentUserName: string;
  onBack: () => void;
  onStartPrivateChat: (userName: string) => void;
}

const GlobalChat = ({ currentUserId, currentUserName, onBack, onStartPrivateChat }: GlobalChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [showCancel, setShowCancel] = useState(false);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordTime, setRecordTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  const conversationId = 'global';

  useEffect(() => {
    const messagesRef = collection(db, 'artifacts', appId, 'public', 'data', 'messages', conversationId, 'chat');
    const unsubscribe = onSnapshot(messagesRef, (snapshot) => {
      const messagesList: Message[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      messagesList.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setMessages(messagesList);
      scrollToBottom();
    });
    return () => unsubscribe();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
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

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadingImage(true);
      setUploadProgress(0);
      setShowCancel(false);
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      // Envoi vers Cloudinary
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${isImage ? 'image' : 'video'}/upload`, true);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(progress);
        }
      };
      xhr.onload = async () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          const downloadURL = response.secure_url;
          const messagesRef = collection(db, 'artifacts', appId, 'public', 'data', 'messages', conversationId, 'chat');
          await addDoc(messagesRef, {
            senderId: currentUserId,
            senderName: currentUserName,
            text: '',
            imageUrl: isImage ? downloadURL : '',
            videoUrl: isVideo ? downloadURL : '',
            createdAt: serverTimestamp()
          });
        } else {
          console.error('Erreur upload Cloudinary:', xhr.responseText);
        }
        setUploadingImage(false);
        setUploadProgress(null);
        setShowCancel(false);
        xhrRef.current = null;
      };
      xhr.onerror = () => {
        setUploadingImage(false);
        setUploadProgress(null);
        setShowCancel(false);
        xhrRef.current = null;
        console.error('Erreur upload Cloudinary');
      };
      xhr.send(formData);
    }
  };

  const handleCancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      setUploadingImage(false);
      setUploadProgress(null);
      setShowCancel(false);
      xhrRef.current = null;
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    const msgRef = doc(db, 'artifacts', appId, 'public', 'data', 'messages', conversationId, 'chat', msgId);
    await deleteDoc(msgRef);
  };

  const handleEditMessage = (msg: Message) => {
    setEditingMsgId(msg.id);
    setEditText(msg.text || '');
  };

  const handleSaveEdit = async (msgId: string) => {
    const msgRef = doc(db, 'artifacts', appId, 'public', 'data', 'messages', conversationId, 'chat', msgId);
    await setDoc(msgRef, { text: editText }, { merge: true });
    setEditingMsgId(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingMsgId(null);
    setEditText('');
  };

  const handleStartRecording = async () => {
    if (!navigator.mediaDevices) return;
    setRecording(true);
    setRecordTime(0);
    setAudioChunks([]);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    setMediaRecorder(recorder);
    recorder.ondataavailable = (e) => setAudioChunks((prev) => [...prev, e.data]);
    recorder.onstop = () => {
      stream.getTracks().forEach(track => track.stop());
    };
    recorder.start();
    recordTimerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000);
  };

  const handleStopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  const handleSendAudio = async () => {
    if (audioChunks.length === 0) return;
    setUploadingImage(true);
    setUploadProgress(0);
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('file', audioBlob);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setUploadProgress((event.loaded / event.total) * 100);
      }
    };
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`, true);
    xhr.onload = async () => {
      setUploadingImage(false);
      setUploadProgress(null);
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        const downloadURL = response.secure_url;
        const messagesRef = collection(db, 'artifacts', appId, 'public', 'data', 'messages', conversationId, 'chat');
        await addDoc(messagesRef, {
          senderId: currentUserId,
          senderName: currentUserName,
          text: '',
          audioUrl: downloadURL,
          createdAt: serverTimestamp()
        });
        setAudioChunks([]);
        setRecordTime(0);
      }
    };
    xhr.onerror = () => {
      setUploadingImage(false);
      setUploadProgress(null);
    };
    xhr.send(formData);
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
          <div
            key={index}
            className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
            onMouseEnter={() => setHoveredMsgId(msg.id)}
            onMouseLeave={() => setHoveredMsgId(null)}
          >
            <div className={`p-3 rounded-xl max-w-xs md:max-w-md break-words relative ${msg.senderId === currentUserId ? 'bg-green-600 text-white rounded-br-none' : 'bg-gray-700 text-white rounded-bl-none'}`}>
              <div className="flex items-center mb-1">
                <button
                  className="font-bold text-xs mr-2 hover:underline hover:text-blue-400"
                  onClick={() => msg.senderId !== currentUserId && onStartPrivateChat(msg.senderName || msg.senderId || '')}
                  disabled={msg.senderId === currentUserId}
                  title={msg.senderId === currentUserId ? 'Ceci est vous' : 'Démarrer un chat privé'}
                >
                  {msg.senderName || msg.senderId}
                </button>
                <span className="block text-right text-xs text-gray-400">
                  {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {editingMsgId === msg.id ? (
                <div className="flex flex-col space-y-2">
                  <input type="text" value={editText} onChange={e => setEditText(e.target.value)} className="text-black p-1 rounded" />
                  <div className="flex space-x-2">
                    <button onClick={() => handleSaveEdit(msg.id)} className="px-2 py-1 bg-green-500 text-white rounded">Sauvegarder</button>
                    <button onClick={handleCancelEdit} className="px-2 py-1 bg-gray-500 text-white rounded">Annuler</button>
                  </div>
                </div>
              ) : (
                <>
                  {msg.text && <p className="text-sm">{msg.text}</p>}
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="envoyé" className="mt-2 rounded-lg max-w-full max-h-60" />
                  )}
                  {msg.videoUrl && (
                    <video controls className="mt-2 rounded-lg max-w-full max-h-60">
                      <source src={msg.videoUrl} type="video/mp4" />
                      Votre navigateur ne supporte pas la vidéo.
                    </video>
                  )}
                  {msg.audioUrl && (
                    <audio controls className="mt-2 rounded-lg max-w-full">
                      <source src={msg.audioUrl} type="audio/webm" />
                      Votre navigateur ne supporte pas l'audio.
                    </audio>
                  )}
                </>
              )}
              {msg.senderId === currentUserId && hoveredMsgId === msg.id && (
                <div className="absolute top-2 right-2 flex space-x-2">
                  <button onClick={() => handleDeleteMessage(msg.id)} className="bg-red-600 p-1 rounded hover:bg-red-700" title="Supprimer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {msg.text && !msg.imageUrl && !msg.videoUrl && !msg.audioUrl && (
                    <button onClick={() => handleEditMessage(msg)} className="bg-blue-600 p-1 rounded hover:bg-blue-700" title="Modifier">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {uploadingImage && (
        <div className="w-full mb-2" onMouseEnter={() => setShowCancel(true)} onMouseLeave={() => setShowCancel(false)}>
          <div className="h-2 bg-gray-300 rounded-full overflow-hidden relative">
            <div className="h-full bg-green-500 transition-all duration-200" style={{ width: `${uploadProgress ?? 0}%` }} />
            {showCancel && (
              <button onClick={handleCancelUpload} className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-red-600 text-white text-xs rounded shadow hover:bg-red-700 transition-colors duration-200">
                Annuler l'envoi
              </button>
            )}
          </div>
          <div className="text-xs text-white mt-1">Envoi en cours... {Math.round(uploadProgress ?? 0)}%</div>
        </div>
      )}
      <form onSubmit={handleSendMessage} className="flex items-center space-x-2 mt-2 bg-slate-900/60 rounded-xl p-2 shadow-inner border border-green-600 w-full max-w-full">
        <button type="button" onClick={handleCameraClick} className="p-3 bg-slate-700 rounded-xl text-white shadow-lg hover:bg-slate-600 transition-colors duration-200 flex-shrink-0" title="Envoyer une image ou vidéo">
          <Camera className="w-5 h-5" />
        </button>
        <input type="file" accept="image/*,video/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
        <button
          type="button"
          onClick={recording ? handleStopRecording : handleStartRecording}
          className={`p-3 rounded-xl text-white shadow-lg flex-shrink-0 ${recording ? 'bg-red-600' : 'bg-blue-600'} hover:bg-blue-500 transition-colors duration-200`}
          title={recording ? 'Arrêter' : 'Message vocal'}
          disabled={uploadingImage}
        >
          <Mic className="w-5 h-5" />
        </button>
        <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Write a message..." className="flex-1 min-w-0 pl-4 pr-3 py-2 border border-slate-600 rounded-xl bg-slate-800/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" disabled={recording} />
        <button
          type="button"
          onClick={audioChunks.length > 0 && !recording ? handleSendAudio : undefined}
          className="p-3 bg-green-600 rounded-xl text-white shadow-lg hover:bg-green-500 transition-colors duration-200 border-2 border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400 flex-shrink-0"
          disabled={uploadingImage || (recording || audioChunks.length === 0)}
        >
          <Send className="w-5 h-5" />
        </button>
        {recording && (
          <span className="ml-2 text-red-400 font-bold">{recordTime}s</span>
        )}
      </form>
    </div>
  );
};

export default GlobalChat;
