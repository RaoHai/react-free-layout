
import React from 'react';
import { mount } from 'enzyme';
import Layout, { IGridLayoutState } from '../Layout';
import { generateGroup, generateDOM, generateLayout } from '../../../test/testUtils';
const layout = generateLayout();

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
});
