import React, { useState } from 'react';
import type { Category } from '../types';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { PaintBrushIcon } from './icons/PaintBrushIcon';
import CategoryColorModal from './modals/CategoryColorModal';
import { GripVerticalIcon } from './icons/GripVerticalIcon';
import { useTooltip } from '../hooks/useTooltip';

interface CategoryHeaderProps {
  category: Category;
  repoCount: number;
  onUpdate: (category: Category) => void;
  onDelete: (categoryId: string) => void;
  onToggleCollapse: (categoryId: string) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
}

const CategoryHeader: React.FC<CategoryHeaderProps> = ({ category, repoCount, onUpdate, onDelete, onToggleCollapse, onDragOver, onDrop, onDragLeave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(category.name);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);

  const dragTooltip = useTooltip('Drag to reorder category');
  const colorizeTooltip = useTooltip('Customize color');
  const editTooltip = useTooltip('Rename category');
  const deleteTooltip = useTooltip('Delete category');

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
    color: category.color,
  };
  const hasCustomBg = !!category.backgroundColor;
  const hasCustomColor = !!category.color;

  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
// FIX START: Add onDragLeave handler to the div.
      onDragLeave={onDragLeave}
// FIX END
      className={`group flex items-center p-0.5 rounded-lg transition-colors ${hasCustomBg ? '' : 'bg-gray-200 dark:bg-gray-800'}`}
    >
      <div {...dragTooltip} className="p-1.5 cursor-move text-gray-400 dark:text-gray-500">
        <GripVerticalIcon className="h-5 w-5" />
      </div>
      <button onClick={() => onToggleCollapse(category.id)} className="flex items-center flex-grow text-left p-1.5" style={customStyle}>
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
            onClick={(e) => {e.preventDefault(); e.stopPropagation()}}
          />
        ) : (
          <h2 onDoubleClick={() => setIsEditing(true)} className="text-lg font-bold">{category.name}</h2>
        )}
        <span className={`ml-2 text-sm font-normal ${hasCustomColor ? 'opacity-80' : 'text-gray-500 dark:text-gray-400'}`}>
          ({repoCount})
        </span>
      </button>

      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity pr-2" style={customStyle}>
        <button {...colorizeTooltip} onClick={() => setIsColorModalOpen(true)} className={`p-1.5 rounded-full ${hasCustomBg ? 'hover:bg-black/20' : 'hover:bg-gray-300 dark:hover:bg-gray-700'}`}><PaintBrushIcon className="h-4 w-4" /></button>
        <button {...editTooltip} onClick={() => setIsEditing(true)} className={`p-1.5 rounded-full ${hasCustomBg ? 'hover:bg-black/20' : 'hover:bg-gray-300 dark:hover:bg-gray-700'}`}><PencilIcon className="h-4 w-4" /></button>
        <button {...deleteTooltip} onClick={() => onDelete(category.id)} className={`p-1.5 rounded-full ${hasCustomBg ? 'hover:bg-black/20' : 'hover:bg-gray-300 dark:hover:bg-gray-700'}`}><TrashIcon className="h-4 w-4" /></button>
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
