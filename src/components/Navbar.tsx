import React, { useState } from 'react';
import GlobalChat from './GlobalChat';

const Navbar = ({ currentUserId, currentUserName }) => {
  const [showGlobalChat, setShowGlobalChat] = useState(false);

  return (
    <nav className="navbar">
      <ul className="menu">
        <li>
          <button onClick={() => setShowGlobalChat(true)} className="text-white hover:text-green-400">Global chat</button>
        </li>
      </ul>

      {showGlobalChat && (
        <GlobalChat currentUserId={currentUserId} currentUserName={currentUserName} onBack={() => setShowGlobalChat(false)} />
      )}
    </nav>
  );
};

export default Navbar;