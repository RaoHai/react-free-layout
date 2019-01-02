import React from 'react';
import Layout from '../Layout';
import { shallow } from 'enzyme';

describe('layout with plugin', () => {

  test('should load plugin', () => {
    const wrapper = shallow(<Layout
      layout={[{ i: 'a', x: 10, y: 10, w: 10, h: 10}]}
      width={1024}
      grid={[8, 8]}
      plugins={[{ onCommand: () => {}, onConstruct: () => {}, onEvent: () => {} }]}
    >
      <div key="a">hello world</div>
    </Layout>);

    expect(wrapper);
    expect((wrapper.instance() as any).middlewares.onCommand).toHaveLength(1);
  });
});
