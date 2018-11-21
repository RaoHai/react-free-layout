import { isEqual, classNames } from '../index';
import { percentile, getCols, layoutlize, bringForward, bringBack, bringTop, bringBottom, layoutEqual, bottom, updateLayout } from '../index';

describe('utils functions', () => {
  test('isEquals', () => {
    expect(isEqual(undefined, { i: 'a', x: 10, y: 10, w: 10, h: 10 })).toBeFalsy();
    expect(isEqual(
      { i: 'a', x: 10, y: 10, w: 10, h: 10, static: true },
      { i: 'a', x: 10, y: 10, w: 10, h: 10 }
    )).toBeFalsy();

    expect(isEqual(
      { i: 'a', x: 10, y: 10, w: 10, h: 10, static: true },
      { i: 'a', x: 10, y: 10, w: 10, h: 10, moved: true }
    )).toBeFalsy();

    expect(isEqual(
      { i: 'a', x: 10, y: 10, w: 10, h: 10 },
      { i: 'a', x: 10, y: 10, w: 10, h: 11 }
    )).toBeFalsy();

    expect(isEqual(undefined, null as any)).toBeTruthy();
  });

  test('layout equals', () => {
    expect(layoutEqual([
      { i: 'a', x: 10, y: 10, w: 10, h: 10 },
      { i: 'b', x: 25, y: 10, w: 10, h: 10 }
    ], [
      { i: 'a', x: 10, y: 10, w: 10, h: 10 },
      { i: 'b', x: 25, y: 10, w: 10, h: 10 }
    ])).toBeTruthy();

    expect(layoutEqual([
      { i: 'a', x: 10, y: 10, w: 10, h: 10 },
      { i: 'b', x: 25, y: 10, w: 10, h: 10 }
    ], [
      { i: 'a', x: 10, y: 10, w: 10, h: 10 },
      { i: 'b', x: 23, y: 10, w: 10, h: 10 }
    ])).toBeFalsy();
  });

  test('classnames', () => {
    expect(classNames(['foo', 'bar'])).toEqual('foo bar');
  })

  test('utils percentile', () => {
    const width = 1024;
    const layout = [
      { i: 'a', x: 10, y: 10, w: 10, h: 10 },
      { i: 'b', x: 25, y: 10, w: 10, h: 10 }
    ];
    const cols = getCols({ width, grid: [10, 10] });
    const p = percentile(layout, cols);
    expect(p).toEqual([
      {
        i: 'a',
        x: 0.0970873786407767,
        y: 10,
        w: 0.0970873786407767,
        h: 10,
      },
      {
        i: 'b',
        x: 0.24271844660194175,
        y: 10,
        w: 0.0970873786407767,
        h: 10,
      }
    ]);

    const u = layoutlize(p, cols);
    expect(u).toEqual(layout);
  });


  test('utils percentile width height', () => {
    const width = 1024;
    const layout = [
      { i: 'a', x: 10, y: 10, w: 10, h: 10 },
      { i: 'b', x: 25, y: 10, w: 10, h: 10 }
    ];
    const colWidth = 10;
    const height = bottom(layout) * colWidth;
    const cols = getCols({ width, grid: [10, 10] });
    const p = percentile(layout, cols, height);
    expect(p).toEqual([
      {
        i: 'a',
        x: 0.0970873786407767,
        y: 0.5,
        w: 0.0970873786407767,
        h: 0.5,
      },
      {
        i: 'b',
        x: 0.24271844660194175,
        y: 0.5,
        w: 0.0970873786407767,
        h: 0.5,
      }
    ]);

    const u = layoutlize(p, cols, height / colWidth);
    expect(u).toEqual(layout);
  });

  test('level functions', () => {
    const item = { i: 'a', x: 10, y: 10, w: 10, h: 10 };
    expect(bringForward(item).z).toEqual(2);
    expect(bringBack(item).z).toEqual(1);
    expect(bringTop(item, 5).z).toEqual(6);
    expect(bringBottom(item).z).toEqual(1);
  });

  test('updateLayout', () => {
    expect(updateLayout([], [{ i: 'a', w: 10, h: 10, x: 10, y: 10 }]))
      .toEqual([{ i: 'a', w: 10, h: 10, x: 10, y: 10 }]);

    expect(updateLayout([{ i: 'a', w: 10, h: 10, x: 10, y: 10 }], []))
      .toEqual([{ i: 'a', w: 10, h: 10, x: 10, y: 10 }]);

    expect(updateLayout([{ i: 'a', w: 10, h: 10, x: 10, y: 10 }], [{ i: 'a', w: 10, h: 11, x: 10, y: 10 }]))
      .toEqual([{ i: 'a', w: 10, h: 11, x: 10, y: 10 }]);
  })
});