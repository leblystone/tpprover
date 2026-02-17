import React, { useState } from 'react';
import Modal from './Modal';
import { motion } from 'framer-motion';
import { MoreVertical, Share, PlusSquare, ArrowDownCircle, Info } from 'lucide-react';

const BROWSER_INFO = {
  chrome: {
    name: 'Chrome',
    icon: <MoreVertical />,
    steps: [
      "Tap the 'More' icon (three dots) in the top-right corner.",
      "Select 'Install App' or 'Add to Home Screen'.",
      "Follow the on-screen prompts.",
    ],
  },
  safari: {
    name: 'Safari (iOS)',
    icon: <Share />,
    steps: [
      "Tap the 'Share' icon at the bottom of the screen.",
      "Scroll down and select 'Add to Home Screen'.",
      "Confirm by tapping 'Add'.",
    ],
  },
  firefox: {
    name: 'Firefox',
    icon: <MoreVertical />,
    steps: [
      "Tap the 'Menu' button (three dots) in the address bar.",
      "Select 'Install' from the options.",
      "Confirm the installation.",
    ],
  },
};

const InstallInstructionsModal = ({ open, onClose, onInstall, theme }) => {
  const [activeTab, setActiveTab] = useState('chrome');

  return (
    <Modal open={open} onClose={onClose} theme={theme} title="Install The Pep Planner">
      <div className="p-6">
        <p className="mb-6 text-center text-lg" style={{ color: theme.text }}>
          Get the full app experience by installing it on your device.
        </p>
        
        <div className="flex justify-center mb-6">
            {Object.keys(BROWSER_INFO).map(key => (
                <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`px-4 py-2 text-sm font-semibold transition-colors duration-200 focus:outline-none ${activeTab === key ? 'border-b-2' : ''}`}
                    style={{
                        borderColor: activeTab === key ? theme.primary : 'transparent',
                        color: activeTab === key ? theme.primaryDark : theme.text,
                    }}
                >
                    {BROWSER_INFO[key].name}
                </button>
            ))}
        </div>

        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <ul className="space-y-4">
            {BROWSER_INFO[activeTab].steps.map((step, index) => (
              <li key={index} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>
                  {index + 1}
                </div>
                <span className="pt-1">{step}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <div className="mt-8 text-center">
          <button
            onClick={onInstall}
            className="w-full px-6 py-3 rounded-lg text-lg font-semibold transition-transform duration-200 hover:scale-105"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
          >
            Install Now
          </button>
        </div>
        
        <div className="flex items-center gap-2 mt-4 p-3 rounded-lg" style={{ backgroundColor: theme.secondary }}>
            <Info size={20} style={{ color: theme.primary }}/>
            <p className="text-xs" style={{ color: theme.textLight }}>
                If you don't see an install option, your browser may not be supported.
            </p>
        </div>
      </div>
    </Modal>
  );
};

export default InstallInstructionsModal;
