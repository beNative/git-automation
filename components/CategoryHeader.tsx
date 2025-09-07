import React, { useState, useEffect, useRef } from 'react';
import type { Category } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { GripVerticalIcon } from './icons/GripVerticalIcon';
import { PaintBrushIcon } from './icons/PaintBrushIcon';

interface CategoryHeaderProps {
  category: Category;
  repoCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onUpdate: (updates: Partial<Omit<Category, 'id' | 'repositoryIds'>>) => void;
  onDelete: () => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
}

const CategoryHeader: React.FC<CategoryHeaderProps> = ({
  category, repoCount, isCollapsed, onToggleCollapse, onUpdate, onDelete, onDragStart, onDragEnd
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setName(category.name);
  }, [category.name]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setIsColorPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBlur = () => {
    if (name.trim() && name.trim() !== category.name) {
      onUpdate({ name: name.trim() });
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
  
  const headerStyle = {
      color: category.color,
  };
  const defaultTextColorClass = 'text-gray-800 dark:text-gray-200';

  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-2" draggable onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <GripVerticalIcon className="h-5 w-5 text-gray-400 cursor-grab" />
        <button onClick={onToggleCollapse} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
          <ChevronDownIcon className={`h-5 w-5 transition-transform ${isCollapsed ? '-rotate-90' : ''} ${!category.color ? defaultTextColorClass : ''}`} style={headerStyle} />
        </button>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={headerStyle}
            className={`text-xl font-bold bg-transparent border-b-2 border-blue-500 focus:outline-none ${!category.color ? defaultTextColorClass : ''}`}
          />
        ) : (
          <h2 onClick={() => setIsEditing(true)} id={`category-title-${category.id}`} style={headerStyle} className={`text-xl font-bold cursor-pointer ${!category.color ? defaultTextColorClass : ''}`}>{category.name}</h2>
        )}
        <span className="text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full px-2.5 py-0.5">
          {repoCount}
        </span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative">
            <button onClick={() => setIsColorPickerOpen(p => !p)} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Customize colors">
                <PaintBrushIcon className="h-4 w-4 text-gray-500" />
            </button>
            {isColorPickerOpen && (
                <div ref={colorPickerRef} className="absolute top-full right-0 mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 w-60 space-y-3">
                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Text Color</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input type="color" value={category.color || '#000000'} onChange={e => onUpdate({ color: e.target.value })} className="h-8 w-8 p-0 border-none rounded cursor-pointer bg-transparent" />
                            <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{category.color || 'Default'}</span>
                            <button onClick={() => onUpdate({ color: undefined })} className="ml-auto text-xs text-blue-600 hover:underline">Reset</button>
                        </div>
                    </div>
                     <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Background Color</label>
                        <div className="flex items-center gap-2 mt-1">
                            <input type="color" value={category.backgroundColor || '#ffffff'} onChange={e => onUpdate({ backgroundColor: e.target.value })} className="h-8 w-8 p-0 border-none rounded cursor-pointer bg-transparent" />
                            <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{category.backgroundColor || 'Default'}</span>
                            <button onClick={() => onUpdate({ backgroundColor: undefined })} className="ml-auto text-xs text-blue-600 hover:underline">Reset</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
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