import { createContext, useContext } from 'react';

import type { Surface } from '@/theme/contrast';

/**
 * What the nearest container is filled with. Card, Banner and friends set it;
 * Text reads it to pick a shade that clears 7:1 on that fill. Without this,
 * contrast depends on every caller remembering which coral to use where.
 */
const SurfaceContext = createContext<Surface>('bg');

export const SurfaceProvider = SurfaceContext.Provider;
export const useSurface = () => useContext(SurfaceContext);
