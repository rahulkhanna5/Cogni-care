import { decideNextLevel } from './adaptive';

const base = { currentLevel: 3, maxLevel: 15, lastDirection: null } as const;

describe('decideNextLevel', () => {
  it('promotes at or above 85%', () => {
    expect(decideNextLevel({ ...base, accuracy: 0.9 })).toEqual({ level: 4, direction: 'up' });
    expect(decideNextLevel({ ...base, accuracy: 0.85 })).toEqual({ level: 4, direction: 'up' });
  });

  it('holds between 60% and 85%', () => {
    expect(decideNextLevel({ ...base, accuracy: 0.84 })).toEqual({ level: 3, direction: 'hold' });
    expect(decideNextLevel({ ...base, accuracy: 0.6 })).toEqual({ level: 3, direction: 'hold' });
  });

  it('demotes below 60%', () => {
    expect(decideNextLevel({ ...base, accuracy: 0.59 })).toEqual({ level: 2, direction: 'down' });
  });

  it('refuses to demote twice in a row', () => {
    expect(decideNextLevel({ ...base, accuracy: 0.1, lastDirection: 'down' })).toEqual({
      level: 3,
      direction: 'hold',
    });
  });

  it('allows a demotion after a hold', () => {
    expect(decideNextLevel({ ...base, accuracy: 0.1, lastDirection: 'hold' })).toEqual({
      level: 2,
      direction: 'down',
    });
  });

  it('clamps at the floor and the ceiling', () => {
    expect(decideNextLevel({ ...base, currentLevel: 1, accuracy: 0 })).toEqual({
      level: 1,
      direction: 'hold',
    });
    expect(decideNextLevel({ ...base, currentLevel: 15, accuracy: 1 })).toEqual({
      level: 15,
      direction: 'hold',
    });
  });
});
