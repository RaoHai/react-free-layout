import React from 'react';
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { generateLayout, generateDOM, generateGroup } from '../test/testUtils';
import Layout from '../src/components/Layout';
import '../src/style/index.less';

const layout = generateLayout();

const dragActions = {
  onDragStart: action('dragStart'),
  onDragEnd: action('onDragEnd'),
};

storiesOf("Basic Usage", module)
  .add('single layout item', () => <Layout
    {...dragActions}
    width={1024}
    grid={[8, 8]}
    layout={[{ i: 'a', w: 12, h: 10, x: 10, y: 10 }]}
  >
    <div key="a">xxx</div>
  </Layout>)
  .add('random layout', () => <Layout
    {...dragActions}
    layout={layout}
    width={1024}
    grid={[8, 8]}
  >
    {generateDOM(layout)}
  </Layout>
);

storiesOf("Group Usage", module)
  .add('random group', () => <Layout
    {...dragActions}
    layout={layout}
    group={generateGroup(layout)}
    width={1024}
    grid={[8, 8]}
  >
    {generateDOM(layout)}
  </Layout>);