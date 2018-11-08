import React from 'react';
import { mount } from 'enzyme';
import { mouseMove, mouseUp } from '../../../test/testUtils';
import Selection from '../Selection';
import Layout, { temporaryGroupId } from '../Layout';


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

  target.simulate('mousedown', { clientX: 10, clientY: 10 });

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

  eventTarget.simulate('mousedown', { clientX: 10, clientY: 10 });

  expect((wrapper.state() as any).selecting).toEqual(true);

  mouseMove(350, 200);

  expect((wrapper.state() as any).activeDrag);

  mouseUp(350, 210);

  const state = wrapper.state() as any;
  expect(state.selecting).toEqual(false);
  expect(state.selectedLayout).toHaveLength(2);

  // temporary group exists
  expect(state.group[temporaryGroupId]);

});
