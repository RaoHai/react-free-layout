import React from 'react';
import { mount } from 'enzyme';
// import { mouseMove, mouseUp } from '../../../test/testUtils';
import GridItem from '../GridItem';
import { noop } from '../../utils/index';

test('GridItem', () => {
  const wrapper = mount(<GridItem
    i="a"
    x={0}
    y={0}
    w={12}
    h={8}
    onDragStart={noop}
    onDrag={noop}
    onDragStop={noop}
    onResize={noop}
    onResizeStart={noop}
    onResizeStop={noop}
    cols={24}
    maxRows={Infinity}
    containerWidth={1024}
    colWidth={10}
    rowHeight={10}
    containerPadding={[0, 0]}
  />);

  expect(wrapper);
});
