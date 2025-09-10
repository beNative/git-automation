import React, { useState, useMemo } from 'react';
import { XIcon } from '../icons/XIcon';
import { PaintBrushIcon } from '../icons/PaintBrushIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { useTooltip } from '../../hooks/useTooltip';
import { SunIcon } from '../icons/SunIcon';
import { MoonIcon } from '../icons/MoonIcon';

interface CategoryColorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (colors: { background?: string; text?: string; darkBackground?: string; darkText?: string; }) => void;
  currentBgColor?: string;
  currentTextColor?: string;
  currentDarkBgColor?: string;
  currentDarkTextColor?: string;
}

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
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  const num = parseInt(hex, 16);
  let r = (num >> 16) & 0xFF;
  let g = (num >> 8) & 0xFF;
  let b = num & 0xFF;
  
  r = Math.round(r + (percent > 0 ? (255 - r) * (percent / 100) : r * (percent / 100)));
  g = Math.round(g + (percent > 0 ? (255 - g) * (percent / 100) : g * (percent / 100)));
  b = Math.round(b + (percent > 0 ? (255 - b) * (percent / 100) : b * (percent / 100)));

  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));

  const newHex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  return (usePound ? "#" : "") + newHex;
};

const ColorInput: React.FC<{
  label: string;
  color: string;
  setColor: (color: string) => void;
  defaultColor: string;
}> = ({ label, color, setColor, defaultColor }) => {
    const lightenTooltip = useTooltip('Lighten 10%');
    const darkenTooltip = useTooltip('Darken 10%');

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <div className="mt-1 flex items-center gap-2">
                <input type="color" value={color || defaultColor} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 p-1 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer" />
                <input type="text" value={color || ''} onChange={(e) => setColor(e.target.value)} placeholder={defaultColor} className="flex-1 h-9 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-1.5 px-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono"/>
                <button type="button" {...lightenTooltip} onClick={() => setColor(adjustColor(color, 10))} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><SunIcon className="h-4 w-4"/></button>
                <button type="button" {...darkenTooltip} onClick={() => setColor(adjustColor(color, -10))} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><MoonIcon className="h-4 w-4"/></button>
            </div>
        </div>
    );
};


const CategoryColorModal: React.FC<CategoryColorModalProps> = ({ isOpen, onClose, onSave, currentBgColor, currentTextColor, currentDarkBgColor, currentDarkTextColor }) => {
  const [bgColorLight, setBgColorLight] = useState(currentBgColor || '');
  const [textColorLight, setTextColorLight] = useState(currentTextColor || '');
  const [bgColorDark, setBgColorDark] = useState(currentDarkBgColor || '');
  const [textColorDark, setTextColorDark] = useState(currentDarkTextColor || '');
  const [activeTab, setActiveTab] = useState<'light' | 'dark'>('light');
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');
  
  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    onSave({ 
      background: bgColorLight || undefined, 
      text: textColorLight || undefined,
      darkBackground: bgColorDark || undefined,
      darkText: textColorDark || undefined,
    });
  };
  
  const handleReset = () => {
    onSave({ background: undefined, text: undefined, darkBackground: undefined, darkText: undefined });
  }
  
  const handleThemeSelect = (theme: Theme) => {
      setBgColorLight(theme.light.bg);
      setTextColorLight(theme.light.text);
      setBgColorDark(theme.dark.bg);
      setTextColorDark(theme.dark.text);
  };

  const previewStyle = useMemo(() => {
    if (previewMode === 'dark') {
      return { backgroundColor: bgColorDark || '#1f2937', color: textColorDark || '#f9fafb' };
    }
    return { backgroundColor: bgColorLight || '#f3f4f6', color: textColorLight || '#111827' };
  }, [previewMode, bgColorLight, textColorLight, bgColorDark, textColorDark]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      aria-labelledby="modal-title" role="dialog" aria-modal="true" onMouseDown={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 transform transition-all"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <PaintBrushIcon className="h-6 w-6 text-blue-500 mr-3" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100" id="modal-title">Customize Category Style</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Predefined Themes</label>
                <div className="mt-2 grid grid-cols-6 gap-2">
                    {PREDEFINED_THEMES.map((theme) => {
                        const isSelected = bgColorLight === theme.light.bg && textColorLight === theme.light.text && bgColorDark === theme.dark.bg && textColorDark === theme.dark.text;
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
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Custom Colors</label>
                 <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex border-b border-gray-200 dark:border-gray-700">
                        <button onClick={() => setActiveTab('light')} className={`flex-1 p-2 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'light' ? 'bg-gray-100 dark:bg-gray-700' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/50'}`}><SunIcon className="h-4 w-4"/> Light Mode</button>
                        <button onClick={() => setActiveTab('dark')} className={`flex-1 p-2 text-sm font-medium flex items-center justify-center gap-2 border-l border-gray-200 dark:border-gray-700 ${activeTab === 'dark' ? 'bg-gray-100 dark:bg-gray-700' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/50'}`}><MoonIcon className="h-4 w-4"/> Dark Mode</button>
                    </div>
                    <div className="p-4 space-y-4">
                        {activeTab === 'light' ? (
                            <>
                                <ColorInput label="Background" color={bgColorLight} setColor={setBgColorLight} defaultColor="#f3f4f6" />
                                <ColorInput label="Text" color={textColorLight} setColor={setTextColorLight} defaultColor="#111827" />
                            </>
                        ) : (
                            <>
                                <ColorInput label="Background" color={bgColorDark} setColor={setBgColorDark} defaultColor="#1f2937" />
                                <ColorInput label="Text" color={textColorDark} setColor={setTextColorDark} defaultColor="#f9fafb" />
                            </>
                        )}
                    </div>
                 </div>
            </div>
            
            <div>
                 <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preview</label>
                    <div className="flex items-center text-sm gap-2">
                        <span>Theme:</span>
                        <button onClick={() => setPreviewMode('light')} className={`p-1.5 rounded-full ${previewMode === 'light' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}><SunIcon className="h-4 w-4"/></button>
                        <button onClick={() => setPreviewMode('dark')} className={`p-1.5 rounded-full ${previewMode === 'dark' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}><MoonIcon className="h-4 w-4"/></button>
                    </div>
                 </div>
                 <div className={`mt-2 p-3 rounded-md transition-colors ${previewMode === 'dark' ? 'dark': ''}`}>
                    <div className="p-3 rounded-lg text-lg font-bold" style={previewStyle}>
                        Category Preview Text
                    </div>
                 </div>
            </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg gap-3">
          <button type="button" onClick={handleSave} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 sm:w-auto sm:text-sm">Save</button>
          <button type="button" onClick={handleReset} className="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-500 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 sm:w-auto sm:text-sm">Reset to Default</button>
          <button type="button" onClick={onClose} className="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-500 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-blue-500 sm:w-auto sm:text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default CategoryColorModal;