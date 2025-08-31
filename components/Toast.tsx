import React, { useEffect, useState } from 'react';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { XIcon } from './icons/XIcon';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [message, onClose]);

  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
  const Icon = type === 'success' ? CheckCircleIcon : XCircleIcon;

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center p-4 rounded-lg shadow-lg text-white ${bgColor} transition-transform duration-300 ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
      role="alert"
    >
      <Icon className="h-6 w-6 mr-3" />
      <div className="text-sm font-medium">{message}</div>
      <button onClick={onClose} className="ml-4 -mr-2 p-1.5 rounded-md hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white">
        <span className="sr-only">Close</span>
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
};

export default Toast;
