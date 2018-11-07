import React from 'react';
import { shallow, mount } from 'enzyme';
// import toJSON from 'enzyme-to-json';
import { generateLayout, generateDOM, mouseMove, mouseUp } from '../../../test/testUtils';
import Layout, { temporaryGroupId } from '../Layout';
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


test('layout selection', () => {
  const wrapper = mount(<Layout
    layout={[{ i: 'a', x: 10, y: 10, w: 10, h: 10}]}
    width={1024}
    grid={[8, 8]}
  >
    <div key="a" id="target">hello world</div>
  </Layout>);

  const eventTarget =  wrapper.find('div').at(0);

  expect(eventTarget).not.toBeNull();

  eventTarget.simulate('mousedown', { clientX: 10, clientY: 10 });

  expect((wrapper.state() as any).selecting).toEqual(true);

  mouseMove(100, 200);

  expect((wrapper.state() as any).activeDrag);

  mouseUp(110, 210);

  const state = wrapper.state() as any;
  expect(state.selecting).toEqual(false);
  expect(state.selectedLayout).toHaveLength(1);
  expect(state.group[temporaryGroupId]);
});
