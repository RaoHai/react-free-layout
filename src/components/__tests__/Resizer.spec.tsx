import React from 'react';
import { mount } from 'enzyme';
import Layout, { IGridLayoutState } from '../Layout';
import { handles } from '../Resizer/index';
import { mouseMove, mouseUp } from '../../../test/testUtils';

describe('Resizer', () => {
  test('resize simple layout', () => {
    const resizeStart = jest.fn();
    const resize = jest.fn();
    const resizeStop = jest.fn();

    const wrapper = mount(<Layout
      layout={[{ i: 'a', x: 10, y: 10, w: 10, h: 10}]}
      width={1024}
      grid={[8, 8]}
      onResizeStart={resizeStart}
      onResize={resize}
      onResizeStop={resizeStop}
    >
      <div key="a" id="handler">hello world</div>
    </Layout>);

    expect(wrapper);

    const handler = wrapper.find('#handler');
    handler.simulate('mousedown');
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

    wrapper.simulate('mousedown', { clientX: 10, clientY: 10 });
    expect((wrapper.state() as IGridLayoutState).layoutState.focusItem).toBeFalsy();
    expect((wrapper.instance() as Layout).onResize('a', {} as any, {} as any)).toBeUndefined();
  });

  test('resize group', () => {
    const resizeStart = jest.fn();
    const resize = jest.fn();
    const resizeStop = jest.fn();

    const group ={
      'a+b': {
        id: 'a+b',
        layout: [{ i: 'a'}, { i: 'b'}]
      }
    };
    const wrapper = mount(<Layout
      layout={[
        { i: 'a', x: 10, y: 10, w: 10, h: 10 },
        { i: 'b', x: 25, y: 10, w: 10, h: 10 }
      ]}
      group={group}
      width={1024}
      grid={[10, 10]}
      onResizeStart={resizeStart}
      onResize={resize}
      onResizeStop={resizeStop}
    >
      <div key="a" id="a">hello world</div>
      <div key="b" id="b">hello world</div>
    </Layout>);

    const node = wrapper.find('#a');
    node.simulate('mousedown');

    handles.forEach(({ key }) => {
      const handler = wrapper.findWhere(wrapper => wrapper.key() === `resizableHandle-${key}`);
      expect(handler);
      handler.simulate('mousedown', { clientX: 15, clientY: 15 });
      mouseMove(115, 115, handler);
      mouseUp(115, 115, handler);
    });

    expect(resizeStart).toHaveBeenCalledTimes(handles.length);
    expect(resize).toHaveBeenCalledTimes(handles.length);
    expect(resizeStop).toHaveBeenCalledTimes(handles.length);
  });
});