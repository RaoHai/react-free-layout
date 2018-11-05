import React from 'react';
import { mount } from 'enzyme';
import { mouseMove, mouseUp } from '../../../test/testUtils';
import Selection from '../Selection';

test('Selection', () => {
  const fn = jest.fn();
  const wrapper = mount(<Selection
    onSelect={fn}
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

  expect(fn.mock.calls.length).toEqual(1);
  expect(fn.mock.calls[0]).toEqual([ {"x": 10, "y": 10}, {"x": 110, "y": 210}, true ]);
});
