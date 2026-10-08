import type { ReactElement } from 'react';

/** A drawing on the 160×120 scene canvas (art/kit.tsx). */
export type Scene = () => ReactElement;

/** Scenes for one routine, keyed by the exact step text in tasks.ts. */
export type Scenes = Record<string, Scene>;
