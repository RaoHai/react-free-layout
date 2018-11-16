import React from 'react';
import LayoutState from "../LayoutState";

describe('layoutState', () => {
  const layout = [
    { i: 'a', x: 10, y: 10, w: 10, h: 10 },
    { i: 'b', x: 25, y: 10, w: 10, h: 10 }
  ];

  const group = {
    'a+b': {
      id: 'a+b',
      layout: [{ i: 'a'}, { i: 'b'}]
    },
  };

  let state: LayoutState;
  test('initial state', () => {
    state = new LayoutState(layout, group, 24);
    expect(state);
  });

  test('synchronizeLayoutWithChildren', () => {
    const synchronized = state.synchronizeLayoutWithChildren([
      <div key="a">a</div>,
      <div key="b">b</div>
    ]);

    expect(synchronized);
    const children = synchronized.getChildren();
    expect(children).toHaveLength(3);
    expect(children[0].type).toEqual('group');
    expect(children[1].type).toEqual('item');
    expect(children[2].type).toEqual('item');
  })



});
