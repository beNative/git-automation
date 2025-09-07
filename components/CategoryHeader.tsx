import React from 'react';
import type { Category } from '../types';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { PaintBrushIcon } from './icons/PaintBrushIcon';
import { GripVerticalIcon } from './icons/GripVerticalIcon';

interface CategoryHeaderProps {
  category: Category;
  onToggleCollapse: () => void;
  onEditColor: () => void;
}

const CategoryHeader: React.FC<CategoryHeaderProps> = ({ category, onToggleCollapse, onEditColor }) => {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-2">
        <GripVerticalIcon className="h-5 w-5 text-gray-400 cursor-grab" />
        <button onClick={onToggleCollapse} className="flex items-center gap-2">
          <ChevronRightIcon 
            className={`h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform ${!category.isCollapsed ? 'rotate-90' : ''}`}
          />
          <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 flex items-center">
            <span 
              className="w-4 h-4 rounded-full mr-2" 
              style={{ backgroundColor: category.color || '#cccccc' }}
            ></span>
            {category.name}
          </h2>
        </button>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={onEditColor}
          className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <PaintBrushIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default CategoryHeader;
