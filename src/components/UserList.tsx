import React, { useState } from 'react';
import { ArrowLeft, UserPlus, MessageCircle } from 'lucide-react';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface User {
  name: string;
  country?: string;
  id?: string;
}

interface UserListProps {
  users: User[];
  onUserSelect: (user: User) => void;
  title?: string;
  unreadCounts?: Record<string, number>;
  onBack?: () => void;  // Nouvelle prop pour gérer le retour
  currentUserId?: string;
}

const UserList: React.FC<UserListProps> = ({ users = [], onUserSelect, title = "Users", unreadCounts = {}, onBack, currentUserId }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // Vérification du format des utilisateurs
  const validUsers = Array.isArray(users)
    ? users.filter(u => u && typeof u.name === 'string')
    : [];

  const handleContextMenu = (e: React.MouseEvent, user: User) => {
    e.preventDefault();
    setSelectedUser(user);
    setShowMenu(true);
    setMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const handleAddFriend = async () => {
    if (!selectedUser || !currentUserId) return;

    const db = getFirestore();
    try {
      // Créer un ID unique pour la conversation
      const chatId = [currentUserId, selectedUser.id].sort().join('_');

      // Sauvegarder dans la collection friends
      await setDoc(doc(db, 'friends', chatId), {
        userId: currentUserId,
        friendId: selectedUser.id,
        friendName: selectedUser.name,
        createdAt: serverTimestamp()
      });

      // Créer une conversation dans messages
      await setDoc(doc(db, 'messages', chatId), {
        participants: [currentUserId, selectedUser.id],
        lastMessage: null,
        createdAt: serverTimestamp()
      });

      setShowMenu(false);
    } catch (error) {
      console.error('Error adding friend:', error);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-4 shadow-2xl border border-white/20 w-full">
      <div className="flex items-center space-x-4 mb-4">
        {onBack && (
          <button 
            onClick={onBack}
            className="p-2 text-white hover:text-blue-400 transition-colors duration-200"
            title="Retour"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}
        <h2 className="text-lg font-bold text-white">
          <span className="bg-gradient-to-r from-silver-200 via-white to-blue-300 bg-clip-text text-transparent">
            {title}
          </span>
        </h2>
      </div>
      <div className="space-y-2 overflow-y-auto" style={{ maxHeight: '60vh' }}>
        {validUsers.length > 0 ? (
          validUsers.map(user => (
            <button
              key={user.name}
              onClick={() => onUserSelect(user)}
              onContextMenu={(e) => handleContextMenu(e, user)}
              className="flex items-center space-x-3 w-full p-3 rounded-xl bg-slate-800/50 text-left hover:bg-slate-700/50 transition-colors duration-200 relative"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                {user.name[0].toUpperCase()}
              </div>
              <p className="text-white font-medium">{user.name}</p>
              {unreadCounts && unreadCounts[user.name] > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center p-1">
                  {unreadCounts[user.name]}
                </span>
              )}
            </button>
          ))
        ) : (
          <p className="text-slate-400 text-center text-sm">No user found or invalid user data.</p>
        )}
      </div>

      {showMenu && selectedUser && (
        <div
          className="fixed bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 z-50"
          style={{ top: menuPosition.y, left: menuPosition.x }}
        >
          <button
            onClick={handleAddFriend}
            className="flex items-center space-x-2 w-full px-4 py-2 text-white hover:bg-slate-700"
          >
            <UserPlus size={16} />
            <span>Ajouter aux amis</span>
          </button>
          <button
            onClick={() => {
              onUserSelect(selectedUser);
              setShowMenu(false);
            }}
            className="flex items-center space-x-2 w-full px-4 py-2 text-white hover:bg-slate-700"
          >
            <MessageCircle size={16} />
            <span>Envoyer un message</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserList;
