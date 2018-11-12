import React from 'react';
import { mount } from 'enzyme';
import GridItem from '../GridItem';
import { noop } from '../../utils/index';
import { handles } from '../Resizable/index';
import { mouseMove, mouseUp } from '../../../test/testUtils';

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
  >
    <div>a</div>
  </GridItem>);

  expect(wrapper);
  const dom = wrapper.getDOMNode();
  expect(dom);
  expect(window.getComputedStyle(dom).width).toEqual('120px');
  expect(window.getComputedStyle(dom).height).toEqual('80px');
});

test('Resize', () => {
  const resizeStart = jest.fn();
  const resize = jest.fn();
  const resizeStop = jest.fn();

  const wrapper = mount(<GridItem
    i="a"
    x={0}
    y={0}
    w={12}
    h={8}
    onDragStart={noop}
    onDrag={noop}
    onDragStop={noop}
    onResize={resize}
    onResizeStart={resizeStart}
    onResizeStop={resizeStop}
    cols={24}
    maxRows={Infinity}
    containerWidth={1024}
    colWidth={10}
    rowHeight={10}
    containerPadding={[0, 0]}
  >
    <div>a</div>
  </GridItem>);

  expect(wrapper);
  handles.forEach(({ key }) => {
    const handler = wrapper.findWhere(wrapper => wrapper.key() === `resizableHandle-${key}`);
    expect(handler);
    handler.simulate('mousedown', { clientX: 10, clientY: 10 });
    mouseMove(100, 100, handler);

    mouseUp(100, 100, handler);
  });

  expect(resizeStart).toHaveBeenCalledTimes(handles.length);
  expect(resize).toHaveBeenCalledTimes(handles.length);
  expect(resizeStop).toHaveBeenCalledTimes(handles.length);

});
