
import React from 'react';

const UserList = ({ users, onUserSelect, title = "Users", unreadCounts = {} }) => {
  return (
    <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-4 shadow-2xl border border-white/20 w-full">
      <h2 className="text-lg font-bold text-white mb-4">
        <span className="bg-gradient-to-r from-silver-200 via-white to-blue-300 bg-clip-text text-transparent">
          {title}
        </span>
      </h2>
      <div className="space-y-2 overflow-y-auto" style={{ maxHeight: '60vh' }}>
        {users.length > 0 ? (
          users.map(user => (
            <button key={user.id} onClick={() => onUserSelect(user)} className="flex items-center space-x-3 w-full p-3 rounded-xl bg-slate-800/50 text-left hover:bg-slate-700/50 transition-colors duration-200 relative">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                {user.name[0].toUpperCase()}
              </div>
              <p className="text-white font-medium">{user.name}</p>
              {unreadCounts[user.id] > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center p-1">
                  {unreadCounts[user.id]}
                </span>
              )}
            </button>
          ))
        ) : (
          <p className="text-slate-400 text-center text-sm">No user found.</p>
        )}
      </div>
    </div>
  );
};

export default UserList;
