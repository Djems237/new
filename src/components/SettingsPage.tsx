
import React from 'react';
import { Settings } from 'lucide-react';

const SettingsPage = () => (
  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 text-center h-full flex flex-col justify-center items-center">
    <Settings className="w-16 h-16 text-blue-400 mb-4" />
    <h2 className="text-xl font-bold text-white mb-2">Settings</h2>
    <p className="text-slate-400">Upcoming features: notifications, profile, etc.</p>
  </div>
);

export default SettingsPage;
