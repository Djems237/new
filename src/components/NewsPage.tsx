
import React from 'react';
import { Bell } from 'lucide-react';

const NewsPage = ({ unreadUsers, onUserSelect }) => {
  return (
    <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-4 shadow-2xl border border-white/20 w-full h-full flex flex-col">
      <h2 className="text-lg font-bold text-white mb-4">
        <span className="bg-gradient-to-r from-silver-200 via-white to-blue-300 bg-clip-text text-transparent">
          New Messages
        </span>
      </h2>
      <div className="space-y-2 flex-1 overflow-y-auto">
        {unreadUsers.length > 0 ? (
          unreadUsers.map(user => (
            <button key={user.id} onClick={() => onUserSelect(user)} className="flex items-center justify-between space-x-3 w-full p-3 rounded-xl bg-slate-800/50 text-left hover:bg-slate-700/50 transition-colors duration-200">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                  {user.name[0].toUpperCase()}
                </div>
                <p className="text-white font-medium">{user.name}</p>
              </div>
              <span className="bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                {user.unreadCount}
              </span>
            </button>
          ))
        ) : (
          <div className="text-center text-slate-400 text-sm mt-8">
            <Bell className="w-12 h-12 mx-auto mb-2 text-slate-500" />
            <p>No new messages at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsPage;
