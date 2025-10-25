import React, { useState, useEffect } from 'react';
import { Check, AlertTriangle, Info, X } from 'lucide-react';

const LabBeaker = ({ message, type, onClose, theme }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    const dismissTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 4000);

    return () => {
      clearTimeout(timer);
      clearTimeout(dismissTimer);
    };
  }, [onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const getReactionData = () => {
    switch (type) {
      case 'success':
        return { color: '#4CAF50', status: 'Done', reaction: 'All set!' };
      case 'error':
        return { color: '#F44336', status: 'Oops', reaction: 'Something went wrong' };
      case 'warning':
        return { color: '#FF9800', status: 'Heads up', reaction: 'Check this out' };
      case 'info':
        return { color: '#2196F3', status: 'FYI', reaction: 'Just so you know' };
      default:
        return { color: '#9C27B0', status: 'Ready', reaction: 'Good to go' };
    }
  };

  const reaction = getReactionData();

  return (
    <div
      className={`fixed top-4 right-4 z-[9999] max-w-sm w-full transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      }`}
    >
      <div className="bg-white border-2 border-gray-200 rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: reaction.color }}
            ></div>
            <span className="text-xs font-bold uppercase" style={{ color: reaction.color }}>
              {reaction.status}
            </span>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="text-sm font-semibold text-gray-800 mb-1">
          {reaction.reaction}
        </div>
        
        <div className="text-sm text-gray-700">
          {message}
        </div>
        
        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
          The Pep Planner • {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

const LabBeakerContainer = ({ theme }) => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (event) => {
      const { message, type = 'info' } = event.detail;
      
      // Clear any existing toasts to prevent stacking
      setToasts([]);
      
      const newToast = {
        id: Date.now() + Math.random(),
        message,
        type
      };

      // Add new toast after a brief delay
      setTimeout(() => {
        setToasts([newToast]);
      }, 100);
    };

    window.addEventListener('tpp:toast', handleToast);
    return () => window.removeEventListener('tpp:toast', handleToast);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <>
      {toasts.map(toast => (
        <LabBeaker
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
          theme={theme}
        />
      ))}
    </>
  );
};

export { LabBeaker, LabBeakerContainer };
