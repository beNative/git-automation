import React, { useState } from 'react';
import type { Category } from '../../types';
import { XIcon } from '../icons/XIcon';
import { CheckIcon } from '../icons/CheckIcon';

interface CategoryColorModalProps {
  isOpen: boolean;
  category: Category;
  onClose: () => void;
  onSaveColor: (color: string) => void;
}

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#78716c', '#a1a1aa'
];

const CategoryColorModal: React.FC<CategoryColorModalProps> = ({ isOpen, category, onClose, onSaveColor }) => {
  const [selectedColor, setSelectedColor] = useState(category.color);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    onSaveColor(selectedColor);
  };

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
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100" id="modal-title">
            Edit Color for '{category.name}'
          </h3>
          <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-6 gap-2">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className="w-10 h-10 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 flex items-center justify-center"
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
              >
                {selectedColor === color && <CheckIcon className="h-6 w-6 text-white" />}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 flex justify-end gap-3 rounded-b-lg">
          <button
            type="button"
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
            onClick={handleSave}
          >
            Save Color
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryColorModal;
