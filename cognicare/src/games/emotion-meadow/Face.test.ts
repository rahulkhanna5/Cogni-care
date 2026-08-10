import { browEnds, type Emotion } from './Face';

/**
 * The first version offset the OUTER brow end instead of the inner one, which
 * silently swapped angry and sad: the "angry" face rendered with its outer
 * brows down, which reads as sad. Tapping the face that looked angry was
 * therefore marked wrong. Larger y is lower on the face.
 */
describe('brow geometry', () => {
  it('drives the inner brow DOWN for angry', () => {
    const { innerY, outerY } = browEnds('angry');
    expect(innerY).toBeGreaterThan(outerY);
  });

  it('lifts the inner brow for sad and worried', () => {
    for (const emotion of ['sad', 'worried'] as Emotion[]) {
      const { innerY, outerY } = browEnds(emotion);
      expect(innerY).toBeLessThan(outerY);
    }
  });

  it('keeps angry and sad on opposite sides of neutral', () => {
    const angry = browEnds('angry');
    const sad = browEnds('sad');
    const calm = browEnds('calm');

    expect(angry.innerY).toBeGreaterThan(calm.innerY);
    expect(sad.innerY).toBeLessThan(calm.innerY);
  });

  it('raises both brows bodily for surprise', () => {
    expect(browEnds('surprised').outerY).toBeLessThan(browEnds('calm').outerY);
  });

  it('keeps angry and sad distinguishable even at the lowest intensity', () => {
    const angry = browEnds('angry', 0);
    const sad = browEnds('sad', 0);
    // Floored intensity must still leave a clear gap between the two.
    expect(angry.innerY - sad.innerY).toBeGreaterThan(5);
  });
});
