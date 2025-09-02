import React from 'react';

export type IconSet = 'heroicons' | 'lucide' | 'tabler' | 'feather' | 'remix' | 'phosphor';

export const IconContext = React.createContext<IconSet>('heroicons');