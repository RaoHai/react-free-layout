import React from 'react';
import { storiesOf } from '@storybook/react';
import { generateLayout, generateDOM, generateGroup } from '../test/testUtils';
import Layout from '../src/components/Layout';
import '../src/style/index.less';

const layout = generateLayout();

storiesOf("Basic Usage", module)
  .add('Single Card', () => <Layout
    width={1024}
    grid={[8, 8]}
    layout={[{ i: 'a', w: 12, h: 10, x: 10, y: 10 }]}
  >
    <div key="a">xxx</div>
  </Layout>)
  .add('Basic Render', () => <Layout
    layout={layout}
    width={1024}
    grid={[8, 8]}
  >
    {generateDOM(layout)}
  </Layout>)
  .add('Groups', () => <Layout
    layout={layout}
    group={generateGroup(layout)}
    width={1024}
    grid={[8, 8]}
  >
    {generateDOM(layout)}
  </Layout>);