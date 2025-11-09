import React from 'react';

const Navbar = ({ onGlobalChatClick }) => {
  return (
    <nav className="navbar">
      <ul className="menu">
        <li>
          <button onClick={onGlobalChatClick} className="text-white hover:text-green-400">Global chat</button>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;