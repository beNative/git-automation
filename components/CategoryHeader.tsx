import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Category } from '../types';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PencilIcon } from './icons/PencilIcon';
import { PaintBrushIcon } from './icons/PaintBrushIcon';
import { GripVerticalIcon } from './icons/GripVerticalIcon';
import { useTooltip } from '../hooks/useTooltip';
import { ArrowUpIcon } from './icons/ArrowUpIcon';
import { ArrowDownIcon } from './icons/ArrowDownIcon';
import { PlusIcon } from './icons/PlusIcon';
import { useSettings } from '../contexts/SettingsContext';
import { CheckIcon } from './icons/CheckIcon';
import { MoonIcon } from './icons/MoonIcon';
import { SunIcon } from './icons/SunIcon';
import { XIcon } from './icons/XIcon';

// --- START: Inline Color Editor Popover Component ---

interface Theme {
  name: string;
  light: { bg: string; text: string };
  dark: { bg: string; text: string };
}

const PREDEFINED_THEMES: Theme[] = [
  // Muted Tones
  { name: 'Blue', light: { bg: '#EFF6FF', text: '#1E40AF' }, dark: { bg: '#1E3A8A', text: '#DBEAFE' } },
  { name: 'Green', light: { bg: '#F0FDF4', text: '#166534' }, dark: { bg: '#14532D', text: '#D1FAE5' } },
  { name: 'Amber', light: { bg: '#FFFBEB', text: '#B45309' }, dark: { bg: '#78350F', text: '#FEF3C7' } },
  { name: 'Red', light: { bg: '#FEF2F2', text: '#991B1B' }, dark: { bg: '#7F1D1D', text: '#FEE2E2' } },
  { name: 'Violet', light: { bg: '#F5F3FF', text: '#5B21B6' }, dark: { bg: '#4C1D95', text: '#EDE9FE' } },
  { name: 'Pink', light: { bg: '#FDF2F8', text: '#9D2463' }, dark: { bg: '#831843', text: '#FCE7F3' } },
  // Vibrant Tones
  { name: 'Teal', light: { bg: '#F0FDFA', text: '#0F766E' }, dark: { bg: '#134E4A', text: '#CCFBF1' } },
  { name: 'Cyan', light: { bg: '#ECFEFF', text: '#0E7490' }, dark: { bg: '#164E63', text: '#CFFAFE' } },
  { name: 'Lime', light: { bg: '#F7FEE7', text: '#65A30D' }, dark: { bg: '#365314', text: '#EBFB71' } },
  { name: 'Orange', light: { bg: '#FFF7ED', text: '#C2410C' }, dark: { bg: '#7C2D12', text: '#FFEDD5' } },
  { name: 'Purple', light: { bg: '#FAF5FF', text: '#7E22CE' }, dark: { bg: '#581C87', text: '#F3E8FF' } },
  // Grayscale
  { name: 'Slate', light: { bg: '#F1F5F9', text: '#334155' }, dark: { bg: '#334155', text: '#F1F5F9' } },
];

const adjustColor = (hex: string, percent: number): string => {
  if (!hex) hex = percent > 0 ? '#000000' : '#ffffff';
  let usePound = false;
  if (hex[0] === "#") {
    hex = hex.slice(1);
    usePound = true;
  }
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];

  const num = parseInt(hex, 16);
  let r = (num >> 16) & 0xFF, g = (num >> 8) & 0xFF, b = num & 0xFF;
  r = Math.round(r + (percent > 0 ? (255 - r) * (percent / 100) : r * (percent / 100)));
  g = Math.round(g + (percent > 0 ? (255 - g) * (percent / 100) : g * (percent / 100)));
  b = Math.round(b + (percent > 0 ? (255 - b) * (percent / 100) : b * (percent / 100)));
  r = Math.max(0, Math.min(255, r)), g = Math.max(0, Math.min(255, g)), b = Math.max(0, Math.min(255, b));
  const newHex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  return (usePound ? "#" : "") + newHex;
};

const ColorInput: React.FC<{ label: string; color: string; setColor: (color: string) => void; defaultColor: string;}> = ({ label, color, setColor, defaultColor }) => {
    const lightenTooltip = useTooltip('Lighten 10%'), darkenTooltip = useTooltip('Darken 10%');
    return (
        <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <div className="mt-1 flex items-center gap-2">
                <input type="color" value={color || defaultColor} onChange={(e) => setColor(e.target.value)} className="h-8 w-10 p-1 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer" />
                <input type="text" value={color || ''} onChange={(e) => setColor(e.target.value)} placeholder={defaultColor} className="flex-1 h-8 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono"/>
                <button type="button" {...lightenTooltip} onClick={() => setColor(adjustColor(color, 10))} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><SunIcon className="h-4 w-4"/></button>
                <button type="button" {...darkenTooltip} onClick={() => setColor(adjustColor(color, -10))} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><MoonIcon className="h-4 w-4"/></button>
            </div>
        </div>
    );
};

const CategoryColorEditor: React.FC<{
  initialColors: { light: { bg: string; text: string }, dark: { bg: string; text: string } };
  onColorsChange: (colors: { light: { bg: string; text: string }, dark: { bg: string; text: string } }) => void;
  onSave: (colors: { light: { bg: string; text: string }, dark: { bg: string; text: string } }) => void;
  onReset: () => void;
  onClose: () => void;
}> = ({ initialColors, onColorsChange, onSave, onReset, onClose }) => {
    const [activeTab, setActiveTab] = useState<'light' | 'dark'>('light');
    const [lightBg, setLightBg] = useState(initialColors.light.bg);
    const [lightText, setLightText] = useState(initialColors.light.text);
    const [darkBg, setDarkBg] = useState(initialColors.dark.bg);
    const [darkText, setDarkText] = useState(initialColors.dark.text);

    useEffect(() => {
        onColorsChange({ light: { bg: lightBg, text: lightText }, dark: { bg: darkBg, text: darkText } });
    }, [lightBg, lightText, darkBg, darkText, onColorsChange]);

    const handleThemeSelect = (theme: Theme) => {
        setLightBg(theme.light.bg);
        setLightText(theme.light.text);
        setDarkBg(theme.dark.bg);
        setDarkText(theme.dark.text);
    };

    const handleSaveClick = () => {
        onSave({ light: { bg: lightBg, text: lightText }, dark: { bg: darkBg, text: darkText } });
    };

    return (
        <div className="w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col">
            <header className="p-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Customize Style</h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><XIcon className="h-4 w-4"/></button>
            </header>
            <main className="p-3 space-y-4 text-sm">
                <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Predefined Themes</label>
                    <div className="mt-2 grid grid-cols-6 gap-2">
                        {PREDEFINED_THEMES.map((theme) => {
                            const isSelected = lightBg === theme.light.bg && lightText === theme.light.text && darkBg === theme.dark.bg && darkText === theme.dark.text;
                            return (
                                 <button
                                    key={theme.name}
                                    onClick={() => handleThemeSelect(theme)}
                                    className={`h-10 w-10 rounded-full border-2 flex items-center justify-center transition-all overflow-hidden ${isSelected ? 'border-blue-500 scale-110 ring-2 ring-blue-500/50' : 'border-gray-300 dark:border-gray-600 hover:scale-105'}`}
                                    title={theme.name}
                                >
                                    <div className="w-1/2 h-full" style={{backgroundColor: theme.light.bg}}></div>
                                    <div className="w-1/2 h-full" style={{backgroundColor: theme.dark.bg}}></div>
                                    {isSelected && <div className="absolute inset-0 flex items-center justify-center bg-black/30"><CheckIcon className="h-5 w-5 text-white" /></div>}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div>
                     <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Custom Colors</label>
                     <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex border-b border-gray-200 dark:border-gray-700">
                            <button onClick={() => setActiveTab('light')} className={`flex-1 p-2 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'light' ? 'bg-gray-100 dark:bg-gray-700' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/50'}`}><SunIcon className="h-4 w-4"/> Light Mode</button>
                            <button onClick={() => setActiveTab('dark')} className={`flex-1 p-2 text-sm font-medium flex items-center justify-center gap-2 border-l border-gray-200 dark:border-gray-700 ${activeTab === 'dark' ? 'bg-gray-100 dark:bg-gray-700' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/50'}`}><MoonIcon className="h-4 w-4"/> Dark Mode</button>
                        </div>
                        <div className="p-4 space-y-4">
                            {activeTab === 'light' ? (
                                <>
                                    <ColorInput label="Background" color={lightBg} setColor={setLightBg} defaultColor="#f3f4f6" />
                                    <ColorInput label="Text" color={lightText} setColor={setLightText} defaultColor="#111827" />
                                </>
                            ) : (
                                <>
                                    <ColorInput label="Background" color={darkBg} setColor={setDarkBg} defaultColor="#1f2937" />
                                    <ColorInput label="Text" color={darkText} setColor={setDarkText} defaultColor="#f9fafb" />
                                </>
                            )}
                        </div>
                     </div>
                </div>
            </main>
             <footer className="bg-gray-50 dark:bg-gray-800/50 px-3 py-2 flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700">
                <button onClick={onReset} type="button" className="px-3 py-1.5 rounded-md text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600">Reset to Default</button>
                <button onClick={handleSaveClick} type="button" className="px-3 py-1.5 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Save Colors</button>
            </footer>
        </div>
    );
};

// --- END: Inline Color Editor Popover Component ---


interface CategoryHeaderProps {
  category: Category;
  repoCount: number;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (category: Category) => void;
  onDelete: (categoryId: string) => void;
  onToggleCollapse: (categoryId: string) => void;
  onMoveCategory: (categoryId: string, direction: 'up' | 'down') => void;
  onAddRepo: () => void;
  onDragStart: () => void;
  onDropRepo: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
}

const CategoryHeader: React.FC<CategoryHeaderProps> = ({
  category,
  repoCount,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onToggleCollapse,
  onMoveCategory,
  onAddRepo,
  onDragStart,
  onDropRepo,
  onDragEnd,
}) => {
    const { settings } = useSettings();
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(category.name);
    const [isColorEditorOpen, setIsColorEditorOpen] = useState(false);
    const [previewColors, setPreviewColors] = useState<{ light: { bg: string, text: string }, dark: { bg: string, text: string } } | null>(null);

    const colorEditorRef = useRef<HTMLDivElement>(null);
    const colorButtonRef = useRef<HTMLButtonElement>(null);
    
    const isDarkMode = settings.theme === 'dark';

    // FIX: Correctly resolve the color styles, prioritizing the live preview colors,
    // then the category's saved colors, and finally falling back to a transparent style.
    const getStyle = useCallback(() => {
        const colors = isDarkMode ? { bg: category.darkBackgroundColor, text: category.darkColor } : { bg: category.backgroundColor, text: category.color };
        const preview = isDarkMode ? previewColors?.dark : previewColors?.light;

        return {
            backgroundColor: preview?.bg || colors.bg || 'transparent',
            color: preview?.text || colors.text || 'inherit',
        };
    }, [isDarkMode, category, previewColors]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedName(e.target.value);
    };

    const handleNameBlur = () => {
        if (editedName.trim() && editedName !== category.name) {
            onUpdate({ ...category, name: editedName.trim() });
        }
        setIsEditing(false);
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleNameBlur();
        if (e.key === 'Escape') {
            setEditedName(category.name);
            setIsEditing(false);
        }
    };

    const handleDelete = () => onDelete(category.id);
    const handleToggleCollapse = () => onToggleCollapse(category.id);
    const handleMoveUp = () => onMoveCategory(category.id, 'up');
    const handleMoveDown = () => onMoveCategory(category.id, 'down');
    
    // --- Tooltips ---
    const collapseTooltip = useTooltip(category.collapsed ? 'Expand' : 'Collapse');
    const deleteTooltip = useTooltip('Delete Category');
    const editNameTooltip = useTooltip('Edit Name');
    const styleTooltip = useTooltip('Customize Style');
    const addRepoTooltip = useTooltip('Add New Repository to this Category');
    const dragTooltip = useTooltip('Drag to Reorder');
    const moveUpTooltip = useTooltip('Move Up');
    const moveDownTooltip = useTooltip('Move Down');
    
    // --- Click outside handler for color editor ---
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isColorEditorOpen && 
                colorEditorRef.current && !colorEditorRef.current.contains(event.target as Node) &&
                colorButtonRef.current && !colorButtonRef.current.contains(event.target as Node)
            ) {
                setIsColorEditorOpen(false);
                setPreviewColors(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isColorEditorOpen]);
    
    const handleSaveColors = (colors: { light: { bg: string, text: string }, dark: { bg: string, text: string } }) => {
        onUpdate({ 
            ...category, 
            backgroundColor: colors.light.bg,
            color: colors.light.text,
            darkBackgroundColor: colors.dark.bg,
            darkColor: colors.dark.text,
        });
        setIsColorEditorOpen(false);
        setPreviewColors(null);
    };
    
    const handleResetColors = () => {
        onUpdate({ ...category, backgroundColor: undefined, color: undefined, darkBackgroundColor: undefined, darkColor: undefined });
        setIsColorEditorOpen(false);
        setPreviewColors(null);
    };

    return (
        <div 
            className="flex items-center justify-between group rounded-lg"
            style={getStyle()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={onDropRepo}
        >
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <button
                    {...dragTooltip}
                    draggable
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    className="p-2 cursor-grab opacity-50 group-hover:opacity-100 transition-opacity"
                >
                    <GripVerticalIcon className="h-5 w-5"/>
                </button>
                <button {...collapseTooltip} onClick={handleToggleCollapse} className="p-1 rounded-full hover:bg-black/10">
                    <ChevronRightIcon className={`h-5 w-5 transition-transform ${!category.collapsed ? 'rotate-90' : ''}`} />
                </button>
                {isEditing ? (
                    <input
                        type="text"
                        value={editedName}
                        onChange={handleNameChange}
                        onBlur={handleNameBlur}
                        onKeyDown={handleKeyDown}
                        className="text-lg font-bold bg-transparent border-b-2 border-current focus:outline-none w-full"
                        autoFocus
                    />
                ) : (
                    <h2
                        onDoubleClick={() => setIsEditing(true)}
                        className="text-lg font-bold truncate"
                        title={category.name}
                    >
                        {category.name}
                    </h2>
                )}
                <span className="text-sm font-medium opacity-70">({repoCount})</span>
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button {...moveUpTooltip} onClick={handleMoveUp} disabled={isFirst} className="p-2 rounded-full hover:bg-black/10 disabled:opacity-30"><ArrowUpIcon className="h-4 w-4"/></button>
                <button {...moveDownTooltip} onClick={handleMoveDown} disabled={isLast} className="p-2 rounded-full hover:bg-black/10 disabled:opacity-30"><ArrowDownIcon className="h-4 w-4"/></button>
                <button {...addRepoTooltip} onClick={onAddRepo} className="p-2 rounded-full hover:bg-black/10"><PlusIcon className="h-4 w-4"/></button>
                <div className="relative">
                    <button ref={colorButtonRef} {...styleTooltip} onClick={() => setIsColorEditorOpen(p => !p)} className="p-2 rounded-full hover:bg-black/10"><PaintBrushIcon className="h-4 w-4"/></button>
                    {isColorEditorOpen && (
                        <div ref={colorEditorRef} className="absolute top-full right-0 mt-2 z-30 animate-fade-in-fast">
                            <CategoryColorEditor
                                initialColors={{
                                    light: { bg: category.backgroundColor || '', text: category.color || '' },
                                    dark: { bg: category.darkBackgroundColor || '', text: category.darkColor || '' },
                                }}
                                onColorsChange={setPreviewColors}
                                onSave={handleSaveColors}
                                onReset={handleResetColors}
                                onClose={() => { setIsColorEditorOpen(false); setPreviewColors(null); }}
                            />
                        </div>
                    )}
                </div>
                <button {...editNameTooltip} onClick={() => setIsEditing(true)} className="p-2 rounded-full hover:bg-black/10"><PencilIcon className="h-4 w-4"/></button>
                <button {...deleteTooltip} onClick={handleDelete} className="p-2 rounded-full hover:bg-black/10"><TrashIcon className="h-4 w-4"/></button>
            </div>
        </div>
    );
};

export default CategoryHeader;
