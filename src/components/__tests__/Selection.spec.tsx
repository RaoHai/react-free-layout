import React from 'react';
import { mount } from 'enzyme';
import { mouseMove, mouseUp, generateDOM, selectRange, touchMove, touchEnd } from '../../../test/testUtils';
import Selection from '../Selection';
import Layout, { temporaryGroupId, IGridLayoutState, Group } from '../Layout';
import { LayoutItem } from '../../model/LayoutState';
import { groupLayout, splitGroup } from '../../utils';

describe('Selection', () => {
  test('Selection', () => {
    const selectfn = jest.fn();
    const selectEndFn = jest.fn();

    const wrapper = mount(<Selection
      onSelect={selectfn}
      onSelectEnd={selectEndFn}
    >
      <div />
    </Selection>);

    expect(wrapper).not.toBeNull();
    const target = wrapper.find('div').at(0);

    expect(wrapper).not.toBeNull();
    expect(target).not.toBeNull();

    target.simulate('mousedown', { button: 0, clientX: 10, clientY: 10 });

    expect((wrapper.state() as any).dragging).toEqual(true);
    expect((wrapper.state() as any).start).toEqual({ x: 10, y: 10 });

    mouseMove(100, 200);

    expect((wrapper.state() as any).dragging).toEqual(true);
    expect((wrapper.state() as any).end).toEqual({ x: 100, y: 200 });

    mouseUp(110, 210);

    expect((wrapper.state() as any).dragging).toEqual(false);
    expect((wrapper.state() as any).end).toBeNull();

    expect(selectfn.mock.calls.length).toEqual(1);
    expect(selectfn.mock.calls[0]).toEqual([ {"x": 10, "y": 10}, {"x": 100, "y": 200} ]);

    expect(selectEndFn.mock.calls.length).toEqual(1);
    expect(selectEndFn.mock.calls[0]).toEqual([ {"x": 10, "y": 10}, {"x": 110, "y": 210} ]);

    wrapper.unmount();
  });

  test('layout selection', () => {
    const wrapper = mount(<Layout
      layout={[
        { i: 'a', x: 10, y: 10, w: 10, h: 10 },
        { i: 'b', x: 25, y: 10, w: 10, h: 10 }
      ]}
      width={1024}
      grid={[10, 10]}
    >
      <div key="a" id="target">hello world</div>
      <div key="b" id="target">hello world</div>
    </Layout>);

    const eventTarget =  wrapper.find('div').at(0);

    expect(eventTarget).not.toBeNull();

    eventTarget.simulate('mousedown', { button: 0, clientX: 10, clientY: 10 });

    expect((wrapper.state() as any).selecting).toEqual(true);

    mouseMove(330, 200);

    expect((wrapper.state() as any).activeDrag);

    mouseUp(330, 210);

    const state = (wrapper.state() as any) as IGridLayoutState;
    expect(state.selecting).toEqual(false);
    expect(state.selectedLayout).toHaveLength(2);

    // temporary group exists
    expect(state.layoutState.getGroup(temporaryGroupId)).not.toBeUndefined();

    eventTarget.simulate('mousedown', { button: 0, clientX: 0, clientY: 0 });

    expect((wrapper.state() as any).layoutState.getGroup(temporaryGroupId)).toBeUndefined();

    wrapper.unmount();
  });

  test('layout selection with selectOption', () => {
    const wrapper = mount(<Layout
      layout={[
        { i: 'a', x: 10, y: 10, w: 10, h: 10 },
        { i: 'b', x: 25, y: 10, w: 10, h: 10 }
      ]}
      width={1024}
      grid={[10, 10]}
      selectOption="include"
    >
      <div key="a" id="target">hello world</div>
      <div key="b" id="target">hello world</div>
    </Layout>);

    const eventTarget =  wrapper.find('div').at(0);

    expect(eventTarget).not.toBeNull();

    eventTarget.simulate('mousedown', { button: 0, clientX: 0, clientY: 0 });

    expect((wrapper.state() as any).selecting).toEqual(true);

    mouseMove(351, 200);

    expect((wrapper.state() as any).activeDrag);

    mouseUp(351, 210);

    const state = (wrapper.state() as any) as IGridLayoutState;
    expect(state.selecting).toEqual(false);
    expect(state.selectedLayout).toHaveLength(2);

    // temporary group exists
    expect(state.layoutState.getGroup(temporaryGroupId)).not.toBeUndefined();

    eventTarget.simulate('mousedown', { button: 0, clientX: 0, clientY: 0 });

    expect((wrapper.state() as any).layoutState.getGroup(temporaryGroupId)).toBeUndefined();

    wrapper.unmount();
  });

  test('select single item and group', () => {
    /**
     *  |---|  |---|
     *  | a |  | c |
     *  |---|  |---|
     *  |---|
     *  | b |
     *  |---|
     */
    const layout = [
      { i: 'a', x: 10, y: 10, w: 10, h: 10 },
      { i: 'b', x: 10, y: 25, w: 10, h: 10 },
      { i: 'c', x: 25, y: 10, w: 10, h: 10, z: 1 },
    ];
    const group = {
      'a+b': {
        id: 'a+b',
        layout: [{ i: 'a'}, { i: 'b'}]
      }
    };

    const fn = jest.fn();
    const wrapper = mount(<Layout
      layout={layout}
      group={group}
      width={1024}
      grid={[10, 10]}
      onLayoutSelect={fn}
    >
      {generateDOM(layout)}
    </Layout>);

    expect(wrapper);

    const eventTarget =  wrapper.find('.react-grid-layout-selection-wrapper > div').at(0);
    selectRange(eventTarget, { x: 10, y: 10 }, { x: 300, y: 300 });

    const state = wrapper.state() as IGridLayoutState;
    expect(state.selectedLayout).toHaveLength(3);
    expect(((state.layoutState.activeGroup) as Group).id).toEqual(temporaryGroupId);
    expect(((state.layoutState.focusItem) as LayoutItem).i).toEqual(temporaryGroupId);

    expect(fn).toHaveBeenCalled();

    const selectedLayout = fn.mock.calls[0][0];
    expect(selectedLayout).toHaveLength(3);
    const newGroup = groupLayout(selectedLayout, 'newGroup');

    expect(newGroup.layout).toHaveLength(3);
    expect(newGroup.layout.every(i => i.parent === 'newGroup'));

    const splitedGroup = splitGroup(newGroup.layout);
    expect(splitedGroup).toHaveLength(3);
    expect(newGroup.layout.every(i => i.parent === undefined));

    wrapper.unmount();
  });
});

describe('touchEvent', () => {
  test('Selection', () => {
    const selectfn = jest.fn();
    const selectEndFn = jest.fn();

    const wrapper = mount(<Selection
      onSelect={selectfn}
      onSelectEnd={selectEndFn}
    >
      <div id="handler" />
    </Selection>);

    expect(wrapper).not.toBeNull();
    const target = wrapper.find('#handler');

    expect(wrapper).not.toBeNull();
    expect(target).not.toBeNull();

    target.simulate('touchStart', {
      target: wrapper.find('div').at(0).instance(),
      touches: [{ identifier: 0, clientX: 10, clientY: 10 }],
      targetTouches: [{ identifier: 0, clientX: 10, clientY: 10 }],
    });

    expect((wrapper.state() as any).dragging).toEqual(true);
    expect((wrapper.state() as any).start).toEqual({ x: 10, y: 10 });


    touchMove(100, 200);

    expect((wrapper.state() as any).dragging).toEqual(true);
    expect((wrapper.state() as any).end).toEqual({ x: 100, y: 200 });

    touchEnd(110, 210);

    expect((wrapper.state() as any).dragging).toEqual(false);
    expect((wrapper.state() as any).end).toBeNull();
    wrapper.unmount();
  });
});