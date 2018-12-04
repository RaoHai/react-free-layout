import React from 'react';
import { storiesOf } from '@storybook/react';
// import { action } from '@storybook/addon-actions';
import { generateLayout, generateDOM, generateGroup } from '../test/testUtils';
import Layout from '../src/components/Layout';
import '../src/style/index.less';

const layout = generateLayout();

const dragActions = {
  // onDragStart: action('dragStart'),
  // onDragEnd: action('onDragEnd'),
};

storiesOf("Basic Usage", module)
  .add('single layout item', () => <>
    <div style={{ height: 200 }} />
    <Layout
      {...dragActions}
      width={1024}
      style={{ transform: 'scale3d(0.8, 0.8, 1)'}}
      grid={[8, 8]}
      layout={[{ i: 'a', w: 12, h: 10, x: 10, y: 10 }]}
    >
      <div key="a">xxx</div>
    </Layout>
  </>)
  .add('helper', () => <Layout
    {...dragActions}
    width={1024}
    grid={[8, 8]}
    resizeHelper={true}
    layout={[{ i: 'a', w: 12, h: 10, x: 10, y: 10 }]}
  >
    <div key="a">xxx</div>
  </Layout>)
  .add('size Constraints', () => <Layout
    {...dragActions}
    width={1024}
    grid={[8, 8]}
    layout={[{ i: 'a', w: 12, h: 10, x: 10, y: 10, minH: 5, minW: 5, maxW: 20, maxH: 20 }]}
  >
    <div key="a">xxx</div>
  </Layout>)
  .add('random layout', () => <Layout
    {...dragActions}
    style={{ margin: '0 auto' }}
    layout={layout}
    width={1024}
    grid={[8, 8]}
  >
    {generateDOM(layout)}
  </Layout>
  ).add('layout with scale', () => <Layout
    {...dragActions}
    layout={layout}
    style={{ margin: '0 auto' }}
    width={600}
    grid={[8, 8]}
  >
    {generateDOM(layout)}
  </Layout>);

storiesOf("Group Usage", module)
  .add('random group', () => <Layout
    {...dragActions}
    layout={layout}
    group={generateGroup(layout)}
    width={1024}
    grid={[8, 8]}
  >
    {generateDOM(layout)}
  </Layout>)
  .add('group render', () => {
    const groupElement = <div
      className="custom-group"
      style={{
        background: 'rgba(0, 0, 255, .15)'
      }}
    />;

    return <Layout
      {...dragActions}
      layout={layout}
      group={generateGroup(layout)}
      width={1024}
      grid={[ 10, 10 ]}
      groupElement={groupElement}
    >
      {generateDOM(layout)}
    </Layout>
  });