import React, { useState } from 'react';
import { XIcon } from '../icons/XIcon';
import { PaintBrushIcon } from '../icons/PaintBrushIcon';
import { CheckIcon } from '../icons/CheckIcon';

interface CategoryColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (colors: { background?: string; text?: string }) => void;
  currentBgColor?: string;
  currentTextColor?: string;
}

const PRESET_COLORS = [
  // Pastels
  '#A7F3D0', '#BAE6FD', '#FBCFE8', '#FDE68A', '#DDD6FE', '#FECACA',
  // Brights
  '#10B981', '#0EA5E9', '#EC4899', '#F59E0B', '#8B5CF6', '#EF4444',
  // Darks
  '#064E3B', '#0C4A6E', '#831843', '#78350F', '#4C1D95', '#7F1D1D'
];

const PRESET_TEXT_COLORS = ['#FFFFFF', '#000000'];

const CategoryColorModal: React.FC<CategoryColorModalProps> = ({ isOpen, onClose, onSave, currentBgColor, currentTextColor }) => {
  const [bgColor, setBgColor] = useState(currentBgColor || '');
  const [textColor, setTextColor] = useState(currentTextColor || '');

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    onSave({ background: bgColor || undefined, text: textColor || undefined });
  };
  
  const handleReset = () => {
      setBgColor('');
      setTextColor('');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm mx-4 transform transition-all"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <PaintBrushIcon className="h-6 w-6 text-blue-500 mr-3" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100" id="modal-title">
              Customize Category Style
            </h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Background Color</label>
                <div className="mt-2 grid grid-cols-6 gap-2">
                    {PRESET_COLORS.map(color => (
                        <button key={color} onClick={() => setBgColor(color)} className="h-8 w-8 rounded-full border-2" style={{ backgroundColor: color, borderColor: bgColor === color ? '#3b82f6' : 'transparent' }} />
                    ))}
                </div>
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="mt-2 w-full h-8 p-1 border border-gray-300 dark:border-gray-600 rounded-md" />
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Text Color</label>
                <div className="mt-2 flex items-center gap-2">
                    {PRESET_TEXT_COLORS.map(color => (
                        <button key={color} onClick={() => setTextColor(color)} className="h-8 w-8 rounded-full border-2 flex items-center justify-center" style={{ backgroundColor: color, borderColor: textColor === color ? '#3b82f6' : 'transparent' }}>
                            {textColor === color && <CheckIcon className={`h-5 w-5 ${color === '#FFFFFF' ? 'text-black' : 'text-white'}`} />}
                        </button>
                    ))}
                     <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-full h-8 p-1 border border-gray-300 dark:border-gray-600 rounded-md" />
                </div>
            </div>
            
            <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preview</label>
                 <div className="mt-2 p-3 rounded-md text-lg font-bold" style={{ backgroundColor: bgColor, color: textColor }}>
                     Category Preview Text
                 </div>
            </div>

        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg gap-3">
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 sm:w-auto sm:text-sm"
            onClick={handleSave}
          >
            Save
          </button>
           <button
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-500 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 sm:w-auto sm:text-sm"
            onClick={handleReset}
          >
            Reset to Default
          </button>
          <button
            type="button"
            className="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-500 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 sm:w-auto sm:text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryColorModal;
