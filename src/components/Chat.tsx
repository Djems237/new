import React, { useState, useEffect, useRef } from 'react';
import { Send, Camera, Trash2, Edit2, Mic, ArrowLeft } from 'lucide-react';
import { collection, addDoc, onSnapshot, serverTimestamp, orderBy, query, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from './config/firebaseConfig';
import Webcam from 'react-webcam'; // Assurez-vous d'avoir installé 'react-webcam'

const appId = 'default-app-id';
const CLOUDINARY_CLOUD_NAME = 'demhlpk5q';
const CLOUDINARY_UPLOAD_PRESET = 'new_appchat';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  createdAt: any;
}

interface ChatProps {
  currentUserId: string;
  currentUserName: string;
  selectedUser: any;
  onBack: () => void;
}

const Chat: React.FC<ChatProps> = ({ currentUserId, currentUserName, selectedUser, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState<boolean>(false);
  const [showCancel, setShowCancel] = useState(false);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordTime, setRecordTime] = useState(0);
  const [showCameraOptions, setShowCameraOptions] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoRecordTime, setVideoRecordTime] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoTimerRef = useRef<NodeJS.Timeout | null>(null);


  const getConversationId = () => {
    const otherUserId = selectedUser.id || selectedUser.name;
    const ids = [currentUserId, otherUserId].sort();
    return ids.join('_');
  };

  const conversationId = getConversationId();

  useEffect(() => {
    console.log('👤 Current User:', currentUserId);
    console.log('👥 Selected User:', selectedUser);

    const messagesRef = collection(db, 'artifacts', appId, 'public', 'data', 'messages', conversationId, 'chat');
    console.log('📁 Chemin Firestore:', `artifacts/${appId}/public/data/messages/${conversationId}/chat`);

    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const messagesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Message[];

        console.log('✅ Messages chargés:', messagesList.length, messagesList);
        setMessages(messagesList);
        scrollToBottom();
      },
      (error) => {
        console.error('❌ Erreur Firebase:', error);
        console.error('Détails erreur:', error.message, error.code);
      }
    );

    return () => {
      console.log('🔌 Déconnexion chat privé');
      unsubscribe();
    };
  }, [conversationId, currentUserId, selectedUser]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      console.log('❌ Message vide');
      return;
    }


    try {
      const messagesRef = collection(db, 'artifacts', appId, 'public', 'data', 'messages', conversationId, 'chat');

      const messageData = {
        senderId: currentUserId,
        senderName: currentUserName || currentUserId,
        text: newMessage.trim(),
        createdAt: serverTimestamp()
      };

      console.log('📦 Données message:', messageData);

      const docRef = await addDoc(messagesRef, messageData);
      console.log('✅ Message envoyé avec ID:', docRef.id);

      setNewMessage('');
      scrollToBottom();
    } catch (error: any) {
      console.error("❌ Erreur envoi:", error);
      console.error("Code erreur:", error.code);
      console.error("Message erreur:", error.message);
      // Remplacé alert par un console.error pour respecter les règles de l'immersive.
      console.error("Erreur envoi message: " + error.message);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCameraClick = () => {
    setShowCameraOptions(!showCameraOptions);
  };

  const handleChooseFromGallery = () => {
    setShowCameraOptions(false);
    fileInputRef.current?.click();
  };

  const handleOpenCamera = async (mode: 'photo' | 'video') => {
    setCameraMode(mode);
    setShowCameraOptions(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: mode === 'video'
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Erreur caméra:', error);
      // Remplacé alert
      console.error('Impossible d\'accéder à la caméra');
    }
  };

  const webcamRef = useRef<Webcam>(null);
  const [captured, setCaptured] = useState(false);
  const capture = async () => {
    if (!webcamRef.current) return;
    const imageSrc = webcamRef.current.getScreenshot();

    if (imageSrc) {
      try {
        const response = await fetch(imageSrc);
        const blob = await response.blob();

        setCaptured(true);

        await uploadMediaToCloudinary(blob, 'image');

        setCaptured(false);

        handleCloseCamera();
      } catch (error) {
        console.error('Erreur lors de la capture de la photo :', error);
        setCaptured(false);
      }
    }
  };

  const handleStartVideoRecording = () => {
    if (!streamRef.current) return;
    videoChunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current);
    videoRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        videoChunksRef.current.push(e.data);
      }
    };
    recorder.onstop = async () => {
      const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
      await uploadMediaToCloudinary(videoBlob, 'video');
      handleCloseCamera();
    };
    recorder.start();
    setIsRecordingVideo(true);
    setVideoRecordTime(0);
    videoTimerRef.current = setInterval(() => {
      setVideoRecordTime(t => t + 1);
    }, 1000);
  };

  const handleStopVideoRecording = () => {
    if (videoRecorderRef.current && isRecordingVideo) {
      videoRecorderRef.current.stop();
      setIsRecordingVideo(false);
      if (videoTimerRef.current) {
        clearInterval(videoTimerRef.current);
      }
    }
  };

  const handleCloseCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoTimerRef.current) {
      clearInterval(videoTimerRef.current);
    }
    setCameraActive(false);
    setCameraMode('photo');
    setIsRecordingVideo(false);
    setVideoRecordTime(0);
  };

  const uploadMediaToCloudinary = async (blob: Blob, type: 'image' | 'video' | 'audio') => {
    console.log('📤 Upload média:', type);
    setUploadingMedia(true);
    setUploadProgress(0);
    setShowCancel(false);

    const formData = new FormData();
    formData.append('file', blob);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const resourceType = type === 'image' ? 'image' : 'video';
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, true);

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

        console.log('✅ Upload réussi:', downloadURL);

        const messagesRef = collection(db, 'artifacts', appId, 'public', 'data', 'messages', conversationId, 'chat');
        const messageData: any = {
          senderId: currentUserId,
          senderName: currentUserName || currentUserId,
          text: '',
          createdAt: serverTimestamp()
        };

        if (type === 'image') messageData.imageUrl = downloadURL;
        else if (type === 'video') messageData.videoUrl = downloadURL;
        else if (type === 'audio') messageData.audioUrl = downloadURL;

        console.log('📦 Envoi média Firestore:', messageData);

        await addDoc(messagesRef, messageData);
        scrollToBottom();
        console.log('✅ Média envoyé avec succès');
      } else {
        console.error('❌ Erreur upload Cloudinary:', xhr.status, xhr.responseText);
      }
      setUploadingMedia(false);
      setUploadProgress(null);
      setShowCancel(false);
      xhrRef.current = null;
    };

    xhr.onerror = () => {
      console.error('❌ Erreur réseau upload');
      setUploadingMedia(false);
      setUploadProgress(null);
      setShowCancel(false);
      xhrRef.current = null;
    };

    xhr.send(formData);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log('📁 Fichier sélectionné:', file.name, file.type);
    const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'image'; // Ajout vérification type vidéo
    await uploadMediaToCloudinary(file, type);
  };

  const handleCancelUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      setUploadingMedia(false);
      setUploadProgress(null);
      setShowCancel(false);
      xhrRef.current = null;
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    // Remplacé confirm() par un console.error pour respecter les règles de l'immersive.
    if (!window.confirm('Supprimer ce message ?')) return;
    try {
      const msgRef = doc(db, 'artifacts', appId, 'public', 'data', 'messages', conversationId, 'chat', msgId);
      await deleteDoc(msgRef);
      console.log('✅ Message supprimé:', msgId);
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
    }
  };

  const handleEditMessage = (msg: Message) => {
    setEditingMsgId(msg.id);
    setEditText(msg.text || '');
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!editText.trim()) return;
    try {
      const msgRef = doc(db, 'artifacts', appId, 'public', 'data', 'messages', conversationId, 'chat', msgId);
      await setDoc(msgRef, { text: editText.trim() }, { merge: true });
      setEditingMsgId(null);
      setEditText('');
      console.log('✅ Message modifié:', msgId);
    } catch (error) {
      console.error('❌ Erreur modification:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingMsgId(null);
    setEditText('');
  };

  const handleStartRecording = async () => {
    try {
      if (!navigator.mediaDevices) {
        console.error('Micro non disponible');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setRecording(true);
      setRecordTime(0);
      setAudioChunks([]);
      recorder.ondataavailable = (e) => setAudioChunks((prev) => [...prev, e.data]);
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      recordTimerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000);
      console.log('🎤 Enregistrement démarré');
    } catch (error) {
      console.error('❌ Erreur micro:', error);
      setRecording(false);
      console.error('Erreur d\'accès au micro');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      console.log('🎤 Enregistrement arrêté, chunks:', audioChunks.length);
    }
  };

  const handleSendAudio = async () => {
    if (audioChunks.length === 0) {
      console.log('❌ Aucun audio enregistré');
      return;
    }
    console.log('🎤 Envoi audio, chunks:', audioChunks.length);
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    await uploadMediaToCloudinary(audioBlob, 'audio');
    setAudioChunks([]);
    setRecordTime(0);
  };

  return (
    // ** Modification 1: Conteneur principal pour la hauteur mobile (min-h-full) **
    <div className="relative w-full min-h-full flex flex-col bg-slate-900 rounded-2xl p-4 shadow-2xl border border-green-600/30">
      
      {/* Overlay Caméra (Full screen mobile) */}
      {cameraActive && (
        <div className="absolute inset-0 bg-black z-50 flex flex-col rounded-2xl overflow-hidden">
          <div className="flex-1 relative">
            {/* Webcam for Photo mode */}
            {cameraMode === 'photo' && (
              <div className="flex flex-col items-center justify-center h-full">
                {!captured ? (
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: "user" }}
                    className="rounded-xl shadow-lg w-full max-h-[80vh] object-contain border-4 border-white/20"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-white text-sm mb-2">Photo capturée et envoi en cours...</p>
                    <div className="loader border-t-4 border-green-500 rounded-full w-10 h-10 animate-spin"></div>
                  </div>
                )}
              </div>
            )}

            {/* Video View */}
            {cameraMode === 'video' && (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                {isRecordingVideo && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600 px-4 py-2 rounded-full flex items-center space-x-2 animate-pulse">
                    <div className="w-3 h-3 bg-white rounded-full" />
                    <span className="text-white font-bold">{videoRecordTime}s</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Camera Controls */}
          <div className="bg-slate-900 p-4 flex items-center justify-around">
            <button onClick={handleCloseCamera} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full text-white transition-all shadow-md">
              <ArrowLeft className="w-6 h-6" />
            </button>
            {cameraMode === 'photo' ? (
              <button
                onClick={capture}
                disabled={captured}
                className="p-5 bg-white border-4 border-gray-400 hover:bg-gray-200 rounded-full transition-colors shadow-2xl disabled:opacity-50"
              >
                <Camera className="w-6 h-6 text-black" />
              </button>
            ) : (
              <button onClick={isRecordingVideo ? handleStopVideoRecording : handleStartVideoRecording} className={`p-6 rounded-full transition-all shadow-xl border-4 ${isRecordingVideo ? 'bg-red-600 border-white/50 animate-pulse' : 'bg-red-500 border-white/50'}`}>
                {isRecordingVideo ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <rect width="12" height="12" x="6" y="6" rx="2" />
                  </svg>
                ) : (
                  <div className="w-6 h-6 bg-white rounded-full" />
                )}
              </button>
            )}
            <div className="w-12" /> {/* Espace pour alignement */}
          </div>
        </div>
      )}

      {/* ** Modification 2: En-tête avec bouton retour pour mobile ** */}
      <div className="flex items-center space-x-3 pb-4 border-b border-white/20">
        <button onClick={onBack} className="p-2 mr-1 text-green-400 hover:text-green-300 transition-colors rounded-full md:hidden">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
          {selectedUser.name[0].toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">{selectedUser.name}</h2>
          <p className="text-xs text-gray-400">Chat privé</p>
        </div>
      </div>

      {/* ** Modification 3: Zone de messages (flex-1 assure le défilement) ** */}
      <div className="flex-1 overflow-y-auto my-4 space-y-4 p-1 md:p-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <Send className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-gray-400 text-sm">Aucun message</p>
            <p className="text-gray-500 text-xs mt-2">Commencez la conversation avec {selectedUser.name}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'}`} onMouseEnter={() => setHoveredMsgId(msg.id)} onMouseLeave={() => setHoveredMsgId(null)}>
              {/* Message bubble with responsive max-width */}
              <div className={`p-3 rounded-xl max-w-[80%] sm:max-w-xs md:max-w-md break-words relative transition-all ${msg.senderId === currentUserId ? 'bg-green-600 text-white rounded-br-none' : 'bg-gray-700 text-white rounded-bl-none'}`}>
                
                {/* Message Header (Sender name and time) */}
                <div className="flex items-center mb-1">
                  <span className={`font-bold text-xs mr-2 ${msg.senderId === currentUserId ? 'text-white' : 'text-green-300'}`}>{msg.senderName}</span>
                  <span className="text-xs text-gray-400">{msg.createdAt?.toDate?.()?.toLocaleTimeString?.([], { hour: '2-digit', minute: '2-digit' }) || '...'}</span>
                </div>

                {/* Editing View */}
                {editingMsgId === msg.id ? (
                  <div className="flex flex-col space-y-2 mt-1">
                    <input type="text" value={editText} onChange={e => setEditText(e.target.value)} className="text-black p-2 rounded w-full" autoFocus onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(msg.id)} />
                    <div className="flex space-x-2">
                      <button onClick={() => handleSaveEdit(msg.id)} className="flex-1 px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs transition-colors">Sauvegarder</button>
                      <button onClick={handleCancelEdit} className="flex-1 px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs transition-colors">Annuler</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {msg.text && <p className="text-sm">{msg.text}</p>}
                    {msg.imageUrl && <img src={msg.imageUrl} alt="Image" className="mt-2 rounded-lg max-w-full max-h-60 cursor-pointer hover:opacity-90" onClick={() => window.open(msg.imageUrl, '_blank')} />}
                    {msg.videoUrl && (
                      <video controls className="mt-2 rounded-lg max-w-full max-h-60">
                        <source src={msg.videoUrl} type="video/webm" />
                      </video>
                    )}
                    {msg.audioUrl && (
                      <audio controls className="mt-2 rounded-lg w-full">
                        <source src={msg.audioUrl} type="audio/webm" />
                      </audio>
                    )}
                  </>
                )}
                {/* Action Buttons on Hover/Mobile */}
                {msg.senderId === currentUserId && (hoveredMsgId === msg.id || editingMsgId === msg.id) && (
                  <div className="absolute -top-3 -right-3 flex space-x-1 p-1 bg-slate-900 rounded-full shadow-lg">
                    <button onClick={() => handleDeleteMessage(msg.id)} className="bg-red-600 hover:bg-red-700 p-1.5 rounded-full text-white transition-colors" title="Supprimer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {msg.text && !msg.imageUrl && !msg.videoUrl && !msg.audioUrl && editingMsgId !== msg.id && (
                      <button onClick={() => handleEditMessage(msg)} className="bg-blue-600 hover:bg-blue-700 p-1.5 rounded-full text-white transition-colors" title="Modifier">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Upload Progress Bar */}
      {uploadingMedia && (
        <div className="w-full mb-3" onMouseEnter={() => setShowCancel(true)} onMouseLeave={() => setShowCancel(false)}>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden relative">
            <div className="h-full bg-green-500 transition-all" style={{ width: `${uploadProgress ?? 0}%` }} />
          </div>
          <div className="flex justify-between items-center mt-1">
            <div className="text-xs text-white">Envoi... {Math.round(uploadProgress ?? 0)}%</div>
            {showCancel && (
              <button onClick={handleCancelUpload} className="px-2 py-0.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors">Annuler</button>
            )}
          </div>
        </div>
      )}

      {/* ** Modification 4: Barre de saisie (Footer) ** */}
      <div className="flex items-center space-x-2 mt-2 bg-slate-800/80 rounded-2xl p-2 border border-green-600/50 backdrop-blur-sm shadow-xl">
        
        {/* Media/Camera Options */}
        <div className="relative">
          <button onClick={handleCameraClick} className="p-3 bg-slate-700 rounded-xl text-white hover:bg-slate-600 transition-colors shadow-md" disabled={uploadingMedia || recording}>
            <Camera className="w-5 h-5" />
          </button>

          {showCameraOptions && (
            <div className="absolute bottom-full mb-3 left-0 flex flex-col space-y-2 bg-slate-700 p-3 rounded-xl shadow-2xl border border-white/20">
              <button onClick={() => handleOpenCamera('photo')} className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors text-sm font-medium w-full text-left flex items-center space-x-2" title="Prendre une photo">
                <Camera className="w-5 h-5" /> <span>Photo</span>
              </button>
              <button onClick={() => handleOpenCamera('video')} className="p-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors text-sm font-medium w-full text-left flex items-center space-x-2" title="Enregistrer une vidéo">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m22 8-6 4 6 4V8Z" />
                  <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
                </svg>
                <span>Vidéo</span>
              </button>
              <button onClick={handleChooseFromGallery} className="p-3 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors text-sm font-medium w-full text-left flex items-center space-x-2" title="Choisir depuis la galerie">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                <span>Galerie</span>
              </button>
            </div>
          )}
        </div>
        <input type="file" accept="image/*,video/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
        
        {/* Microphone / Audio */}
        <button onClick={recording ? handleStopRecording : handleStartRecording} className={`p-3 rounded-xl text-white transition-colors shadow-md ${recording ? 'bg-red-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-500'}`} disabled={uploadingMedia}>
          <Mic className="w-5 h-5" />
        </button>
        
        {/* Input Field */}
        <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyPress={handleKeyPress} placeholder="Écrivez un message..." className="flex-1 px-4 py-3 border border-slate-600 rounded-xl bg-slate-800/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500" disabled={recording || uploadingMedia} />
        
        {/* Send Button */}
        <button onClick={audioChunks.length > 0 && !recording ? handleSendAudio : handleSendMessage} className={`p-3 rounded-xl text-white transition-all shadow-md ${audioChunks.length > 0 && !recording ? 'bg-yellow-500 hover:bg-yellow-400' : 'bg-green-600 hover:bg-green-500'}`} disabled={uploadingMedia || recording || (audioChunks.length === 0 && !newMessage.trim())}>
          <Send className="w-5 h-5" />
        </button>
        {recording && <span className="text-red-400 font-bold text-sm absolute right-24 bottom-1/2 translate-y-1/2">{recordTime}s</span>}
      </div>
    </div>
  );
};

export default Chat;