import React from 'react';
// FIX: Add .ts extension to satisfy module resolution
import type { IconSet } from '../types.ts';

export const IconContext = React.createContext<IconSet>('heroicons');