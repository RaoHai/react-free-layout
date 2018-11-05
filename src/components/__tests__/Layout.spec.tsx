import React from 'react';
import ReactDOM from 'react-dom';
import { shallow, mount } from 'enzyme';
import { generateLayout, generateDOM, mouseMove, mouseUp } from '../../../test/testUtils';
import Layout from '../Layout';
import Selection from '../Selection';

const layout = generateLayout();


test('single layout', () => {
  const fn = jest.fn();

  const wrapper = shallow(<Layout
    layout={[{ i: 'a', x: 10, y: 10, w: 10, h: 10}]}
    width={1024}
    grid={[8, 8]}
    onLayoutChange={fn}
  >
    <div key="a">hello world</div>
  </Layout>);

  expect(wrapper.find('div')).not.toBeNull();
});


test('basic render', () => {
  const wrapper = shallow(
    <Layout
      layout={layout}
      width={1024}
      grid={[8, 8]}
    >
      {generateDOM(layout)}
    </Layout>
  );
  expect(wrapper.find('div')).not.toBeNull();
});


test('select item', () => {
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

  expect(fn.mock.calls.length).toEqual(2);
  expect(fn.mock.calls[1]).toEqual([ {"x": 10, "y": 10}, {"x": 110, "y": 210}, true ]);
});
