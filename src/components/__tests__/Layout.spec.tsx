import React from 'react';
import { shallow } from 'enzyme';
import { generateLayout, generateDOM } from '../../../test/testUtils';
import Layout from '../Layout';

const layout = generateLayout();

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
})

