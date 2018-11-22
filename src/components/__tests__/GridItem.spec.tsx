import React from 'react';
import { mount } from 'enzyme';
import GridItem from '../GridItem';
import { noop } from '../../utils';
import { mouseMove, mouseUp } from '../../../test/testUtils';


describe('GridItem', () => {
  beforeEach(() => {
    spyOn(console, 'error');
  });

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

  test('GridItem without handler', () => {
    const wrapper = mount(<GridItem
      i="a"
      x={0}
      y={0}
      w={12}
      h={8}
      onDragStart={null as any}
      onDragStop={() => {}}
      onDrag={() => {}}
      cols={24}
      maxRows={Infinity}
      containerWidth={1024}
      colWidth={10}
      rowHeight={10}
      containerPadding={[0, 0]}
    >
      <div id="a">a</div>
    </GridItem>);

    const handler = wrapper.find('#a');
    handler.simulate('mousedown', { button: 0 });

    const errorFn = jest.fn();
    window.addEventListener('error', errorFn);
    mouseMove(200, 200);

    expect(errorFn).toHaveBeenCalledTimes(2);
  });

  test('GridItem without handler', () => {
    const wrapper = mount(<GridItem
      i="a"
      x={0}
      y={0}
      w={12}
      h={8}
      onDragStart={null as any}
      onDragStop={() => {}}
      onDrag={() => {}}
      cols={24}
      maxRows={Infinity}
      containerWidth={1024}
      colWidth={10}
      rowHeight={10}
      containerPadding={[0, 0]}
    >
      <div id="a">a</div>
    </GridItem>);

    const handler = wrapper.find('#a');
    handler.simulate('mousedown', { button: 0 });

    const errorFn = jest.fn();
    window.addEventListener('error', errorFn);
    mouseUp(200, 200);

    expect(errorFn).toHaveBeenCalledTimes(2);
  });
});
