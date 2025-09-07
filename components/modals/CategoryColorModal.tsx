import React, { useState } from 'react';
import { XIcon } from '../icons/XIcon';
import { PaintBrushIcon } from '../icons/PaintBrushIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { useTooltip } from '../../hooks/useTooltip';

interface CategoryColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (colors: { background?: string; text?: string }) => void;
  currentBgColor?: string;
  currentTextColor?: string;
}

const PREDEFINED_THEMES = [
  // Muted Tones
  { bg: '#EFF6FF', text: '#1E40AF' }, // Blue
  { bg: '#F0FDF4', text: '#166534' }, // Green
  { bg: '#FFFBEB', text: '#B45309' }, // Amber
  { bg: '#FEF2F2', text: '#991B1B' }, // Red
  { bg: '#F5F3FF', text: '#5B21B6' }, // Violet
  { bg: '#FDF2F8', text: '#9D2463' }, // Pink
  // Dark Tones
  { bg: '#1E3A8A', text: '#DBEAFE' }, // Dark Blue
  { bg: '#14532D', text: '#D1FAE5' }, // Dark Green
  { bg: '#78350F', text: '#FEF3C7' }, // Dark Amber
  { bg: '#7F1D1D', text: '#FEE2E2' }, // Dark Red
  { bg: '#4C1D95', text: '#EDE9FE' }, // Dark Violet
  { bg: '#831843', text: '#FCE7F3' }, // Dark Pink
];


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
    onSave({ background: undefined, text: undefined });
  }
  
  const handleThemeSelect = (theme: { bg: string, text: string }) => {
      setBgColor(theme.bg);
      setTextColor(theme.text);
  };
  
  const customBgTooltip = useTooltip('Custom background color');
  const customTextTooltip = useTooltip('Custom text color');


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 transform transition-all"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Predefined Themes</label>
                <div className="mt-2 grid grid-cols-6 gap-2">
                    {PREDEFINED_THEMES.map((theme, index) => {
                        const isSelected = bgColor === theme.bg && textColor === theme.text;
                        return (
                            <button 
                                key={index} 
                                onClick={() => handleThemeSelect(theme)} 
                                className={`h-10 w-10 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-blue-500 scale-110' : 'border-transparent'}`} 
                                style={{ backgroundColor: theme.bg, color: theme.text }}
                            >
                                {isSelected && <CheckIcon className="h-5 w-5" />}
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Custom Background</label>
                    <div {...customBgTooltip} className="mt-2">
                        <input type="color" value={bgColor || '#ffffff'} onChange={(e) => setBgColor(e.target.value)} className="w-full h-10 p-1 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer" />
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Custom Text</label>
                     <div {...customTextTooltip} className="mt-2">
                        <input type="color" value={textColor || '#000000'} onChange={(e) => setTextColor(e.target.value)} className="w-full h-10 p-1 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer" />
                     </div>
                </div>
            </div>
            
            <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preview</label>
                 <div className="mt-2 p-3 rounded-md text-lg font-bold transition-colors" style={{ backgroundColor: bgColor || 'transparent', color: textColor || 'inherit' }}>
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