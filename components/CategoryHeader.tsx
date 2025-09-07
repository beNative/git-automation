import React, { useState, useEffect, useRef } from 'react';
import type { Category } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { GripVerticalIcon } from './icons/GripVerticalIcon';

interface CategoryHeaderProps {
  category: Omit<Category, 'repositoryIds'>;
  repoCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onUpdateName: (newName: string) => void;
  onDelete: () => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
}

const CategoryHeader: React.FC<CategoryHeaderProps> = ({
  category, repoCount, isCollapsed, onToggleCollapse, onUpdateName, onDelete, onDragStart, onDragEnd
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(category.name);
  }, [category.name]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    if (name.trim() && name.trim() !== category.name) {
      onUpdateName(name.trim());
    } else {
      setName(category.name);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setName(category.name);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-2" draggable onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <GripVerticalIcon className="h-5 w-5 text-gray-400 cursor-grab" />
        <button onClick={onToggleCollapse} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
          <ChevronDownIcon className={`h-5 w-5 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
        </button>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="text-xl font-bold bg-transparent border-b-2 border-blue-500 focus:outline-none dark:text-gray-100"
          />
        ) : (
          <h2 onClick={() => setIsEditing(true)} id={`category-title-${category.id}`} className="text-xl font-bold text-gray-800 dark:text-gray-200 cursor-pointer">{category.name}</h2>
        )}
        <span className="text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-2.5 py-0.5">
          {repoCount}
        </span>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setIsEditing(true)} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Rename category">
          <PencilIcon className="h-4 w-4 text-gray-500" />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50" title="Delete category">
          <TrashIcon className="h-4 w-4 text-red-500" />
        </button>
      </div>
    </div>
  );
};

export default CategoryHeader;