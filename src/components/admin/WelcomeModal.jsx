import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PartyPopper } from 'lucide-react';

export default function WelcomeModal({ isOpen, onClose, theme: enhancedTheme }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black bg-opacity-40 backdrop-blur-sm pointer-events-auto" />
          
          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative z-10 bg-white rounded-3xl shadow-2xl p-12 text-center max-w-2xl mx-4 pointer-events-auto"
            style={{
              background: `linear-gradient(135deg, ${enhancedTheme.cardBackground} 0%, ${enhancedTheme.primaryLight} 100%)`,
              border: `4px solid ${enhancedTheme.primary}`
            }}
          >
            {/* Fireworks Effects */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl">
              {[...Array(50)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  initial={{ 
                    x: '50%',
                    y: '50%',
                    scale: 0,
                    opacity: 1
                  }}
                  animate={{
                    x: `${Math.random() * 100}%`,
                    y: `${Math.random() * 100}%`,
                    scale: [0, 1.5, 0],
                    opacity: [1, 1, 0],
                    rotate: Math.random() * 360
                  }}
                  transition={{
                    duration: 2,
                    delay: Math.random() * 0.8,
                    repeat: Infinity,
                    repeatDelay: 1.5
                  }}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${enhancedTheme.primary}, ${enhancedTheme.secondary})`,
                    boxShadow: `0 0 20px ${enhancedTheme.primary}`
                  }}
                />
              ))}
            </div>
            
            {/* Content */}
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="relative z-10"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.3, 1],
                  rotate: [0, 15, -15, 0]
                }}
                transition={{ 
                  duration: 0.8,
                  repeat: Infinity,
                  repeatDelay: 2
                }}
                className="mb-6 inline-block"
              >
                <PartyPopper size={96} style={{ color: enhancedTheme.primary }} strokeWidth={2.5} />
              </motion.div>
              
              <h2 className="text-5xl md:text-6xl font-bold mb-4" style={{ color: enhancedTheme.primaryDark, textShadow: `0 4px 12px ${enhancedTheme.primary}40` }}>
                Welcome, Mrs. FloralKaffe
              </h2>
              <p className="text-2xl md:text-3xl mb-8" style={{ color: enhancedTheme.textLight }}>
                Welcome to The Calming Place ☕📚
              </p>
              <p className="text-lg mb-8" style={{ color: enhancedTheme.textLight }}>
                Your peaceful workspace for coffee, books, and peptides awaits
              </p>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="px-12 py-4 text-xl rounded-full font-bold text-white shadow-2xl transition-all"
                style={{ 
                  backgroundColor: enhancedTheme.primary,
                  boxShadow: `0 8px 24px ${enhancedTheme.primary}60`
                }}
              >
                Let's Go! 🚀
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

