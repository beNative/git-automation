import React, { useState } from 'react';
import type { Category } from '../types';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { PaintBrushIcon } from './icons/PaintBrushIcon';
import CategoryColorModal from './modals/CategoryColorModal';
import { GripVerticalIcon } from './icons/GripVerticalIcon';

interface CategoryHeaderProps {
  category: Category;
  repoCount: number;
  onUpdate: (category: Category) => void;
  onDelete: (categoryId: string) => void;
  onToggleCollapse: (categoryId: string) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}

const CategoryHeader: React.FC<CategoryHeaderProps> = ({ category, repoCount, onUpdate, onDelete, onToggleCollapse, onDragOver, onDrop }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(category.name);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedName(e.target.value);
  };

  const handleNameSave = () => {
    if (editedName.trim() && editedName.trim() !== category.name) {
      onUpdate({ ...category, name: editedName.trim() });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditedName(category.name);
      setIsEditing(false);
    }
  };
  
  const handleColorSave = (color: { background?: string, text?: string }) => {
      onUpdate({ ...category, backgroundColor: color.background, color: color.text });
      setIsColorModalOpen(false);
  };

  const customStyle = {
    backgroundColor: category.backgroundColor,
    color: category.color,
    borderColor: category.backgroundColor ? 'transparent' : undefined,
  };
  const hasCustomColors = category.backgroundColor || category.color;

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`flex items-center p-2 rounded-lg transition-colors ${hasCustomColors ? '' : 'bg-gray-100 dark:bg-gray-900/50'}`}
      style={customStyle}
    >
      <GripVerticalIcon className="h-5 w-5 mr-2 text-gray-400 cursor-move" />
      <button onClick={() => onToggleCollapse(category.id)} className="flex items-center flex-grow">
        <ChevronRightIcon className={`h-5 w-5 mr-2 transition-transform ${category.collapsed ? '' : 'rotate-90'}`} />
        {isEditing ? (
          <input
            type="text"
            value={editedName}
            onChange={handleNameChange}
            onBlur={handleNameSave}
            onKeyDown={handleKeyDown}
            className="text-lg font-bold bg-transparent border-b-2 border-blue-500 focus:ring-0 focus:outline-none"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h2 className="text-lg font-bold">{category.name}</h2>
        )}
        <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400" style={{ color: category.color ? 'inherit' : undefined }}>
          ({repoCount})
        </span>
      </button>

      <div className="flex items-center space-x-2">
        <button onClick={() => setIsColorModalOpen(true)} className="p-1.5 rounded-full hover:bg-black/10"><PaintBrushIcon className="h-4 w-4" /></button>
        <button onClick={() => setIsEditing(true)} className="p-1.5 rounded-full hover:bg-black/10"><PencilIcon className="h-4 w-4" /></button>
        <button onClick={() => onDelete(category.id)} className="p-1.5 rounded-full hover:bg-black/10"><TrashIcon className="h-4 w-4" /></button>
      </div>

      <CategoryColorModal
        isOpen={isColorModalOpen}
        onClose={() => setIsColorModalOpen(false)}
        onSave={handleColorSave}
        currentBgColor={category.backgroundColor}
        currentTextColor={category.color}
      />
    </div>
  );
};

export default CategoryHeader;
