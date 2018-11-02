import React from 'react';
import { storiesOf } from '@storybook/react';
import { generateLayout, generateDOM } from '../test/testUtils';
import Layout from '../src/components/Layout';

const layout = generateLayout();
storiesOf("TypeScript and Storybook", module)
  .add('Sample Widget', () => <Layout
    layout={layout}
    width={1024}
    grid={[8, 8]}
  >
    {generateDOM(layout)}
  </Layout>);