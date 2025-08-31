import React from 'react';

export type IconSet = 'heroicons' | 'lucide';

export const IconContext = React.createContext<IconSet>('heroicons');
