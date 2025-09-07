import React, { useState, useEffect, useRef } from 'react';
import type { Category } from '../types';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { TrashIcon } from './icons/TrashIcon';
import { GripVerticalIcon } from './icons/GripVerticalIcon';
import { PaintBrushIcon } from './icons/PaintBrushIcon';
import { CheckIcon } from './icons/CheckIcon';

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

const COLOR_PALETTES: { name: string; bg: string; text: string }[] = [
  { name: 'Rose', bg: '#FFF1F2', text: '#E11D48' },
  { name: 'Orange', bg: '#FFF7ED', text: '#F97316' },
  { name: 'Amber', bg: '#FFFBEB', text: '#D97706' },
  { name: 'Green', bg: '#F0FDF4', text: '#16A34A' },
  { name: 'Sky', bg: '#F0F9FF', text: '#0284C7' },
  { name: 'Violet', bg: '#F5F3FF', text: '#7C3AED' },
  { name: 'Slate', bg: '#F8FAFC', text: '#475569' },
  { name: 'Dark Slate', bg: '#1E293B', text: '#E2E8F0' },
];


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

  const handleSelectPalette = (palette: { bg: string; text: string; }) => {
    onUpdate({ backgroundColor: palette.bg, color: palette.text });
    setIsColorPickerOpen(false);
  };

  const handleResetPalette = () => {
    onUpdate({ backgroundColor: undefined, color: undefined });
    setIsColorPickerOpen(false);
  }
  
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
          <h2 onDoubleClick={() => setIsEditing(true)} id={`category-title-${category.id}`} style={headerStyle} className={`text-xl font-bold cursor-pointer ${!category.color ? defaultTextColorClass : ''}`}>{category.name}</h2>
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
                <div ref={colorPickerRef} className="absolute top-full right-0 mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 w-64 space-y-3">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Category Theme</p>
                    <div className="grid grid-cols-4 gap-2">
                      {COLOR_PALETTES.map(palette => {
                        const isSelected = category.backgroundColor === palette.bg && category.color === palette.text;
                        return (
                          <button 
                              key={palette.name}
                              onClick={() => handleSelectPalette(palette)}
                              className="w-full aspect-square rounded-md flex items-center justify-center relative focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 transition-all"
                              style={{ backgroundColor: palette.bg }}
                              title={palette.name}
                          >
                              {isSelected && <CheckIcon className="h-6 w-6" style={{ color: palette.text }} />}
                          </button>
                        )
                      })}
                    </div>
                    <button onClick={handleResetPalette} className="w-full text-center text-sm font-medium py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md text-gray-700 dark:text-gray-200">
                      Reset to Default
                    </button>
                </div>
            )}
        </div>
        <button onClick={onDelete} className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50" title="Delete category">
          <TrashIcon className="h-4 w-4 text-red-500" />
        </button>
      </div>
    </div>
  );
};

export default CategoryHeader;
