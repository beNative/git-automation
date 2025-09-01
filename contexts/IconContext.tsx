import React from 'react';

export type IconSet = 'heroicons' | 'lucide' | 'tabler';

export const IconContext = React.createContext<IconSet>('heroicons');