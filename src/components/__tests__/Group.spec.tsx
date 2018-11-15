
import React from 'react';
import { mount } from 'enzyme';
import Layout, { IGridLayoutState } from '../Layout';
import { generateGroup, generateDOM, generateLayout, selectRange } from '../../../test/testUtils';
import { groupLayout } from '../../utils/index';
const layout = generateLayout();

describe('Group', () => {
  test('Layout with Group', () => {
    const group = generateGroup(layout);
    const wrapper = mount(<Layout
      layout={layout}
      group={group}
      width={1024}
      grid={[8, 8]}
    >
      {generateDOM(layout)}
    </Layout>)

    expect(wrapper);
    const state = wrapper.state() as IGridLayoutState;
    expect(state.group).toEqual(group);
    expect(state.layout.every(i => !!i.parent));
  });

  test('GroupAction: create group', () => {
    const fn = jest.fn();
    const layout = [
      { i: 'a', x: 10, y: 10, w: 10, h: 10 },
      { i: 'b', x: 25, y: 10, w: 10, h: 10 }
    ];
    const wrapper = mount(<Layout
      layout={layout}
      width={1024}
      grid={[10, 10]}
      onLayoutSelect={fn}
    >
      <div key="a">a</div>
      <div key="b">b</div>
    </Layout>);

    expect(wrapper);

    const eventTarget =  wrapper.find('.react-grid-layout-selection-wrapper > div').at(0);
    expect(eventTarget);
    selectRange(eventTarget, { x: 0, y: 0}, { x: 300, y: 100 });

    const state = wrapper.state() as IGridLayoutState;

    expect(state.selectedLayout).toHaveLength(2);
    expect(fn).toBeCalled();
    expect(fn.mock.calls[0][0]).toEqual(state.selectedLayout);

    const group = groupLayout(fn.mock.calls[0][0], 'newGroup');
    expect(group.layout).toHaveLength(2);
    expect(group.layout.every(i => i.parent === 'newGroup'));

    const newLayout = mount(<Layout
      layout={group.layout}
      group={{ newGroup: group }}
      width={1024}
      grid={[10, 10]}
      onLayoutSelect={fn}
    >
      <div key="a">a</div>
      <div key="b">b</div>
    </Layout>);

    expect(newLayout);
    const newState = newLayout.state() as IGridLayoutState;
    expect(newState.group).toEqual({ newGroup: group });
  });


  test('select group', () => {
    const group = {
      'a+b': {
        id: 'a+b',
        layout: [{ i: 'a'}, { i: 'b'}]
      },
    };
    const wrapper = mount(<Layout
      layout={[
        { i: 'a', x: 10, y: 10, w: 10, h: 10 },
        { i: 'b', x: 25, y: 10, w: 10, h: 10 },
      ]}
      group={group}
      width={1024}
      grid={[10, 10]}
    >
      <div key="a" id="a">hello world</div>
      <div key="b" id="b">hello world</div>
    </Layout>);

    expect(wrapper);

    wrapper.find('#a').simulate('mousedown');

    expect((wrapper.state() as IGridLayoutState).focusItem).toEqual({ i: 'a+b', w: 25, x: 10, y: 10, h: 10,});
    wrapper.update();

    wrapper.find('#a').simulate('mousedown');
    expect((wrapper.state() as IGridLayoutState).focusItem).toEqual({ i: 'a', x: 10, y: 10, w: 10, h: 10, parent: 'a+b' });

    wrapper.update();
    wrapper.find('#b').simulate('mousedown');
    expect((wrapper.state() as IGridLayoutState).focusItem).toEqual({ i: 'b', x: 25, y: 10, w: 10, h: 10, parent: 'a+b' });
  });
});
