import React from 'react';
import { mount } from 'enzyme';
import Layout, { IGridLayoutState } from '../Layout';
import { handles } from '../Resizer/index';
import { mouseMove, mouseUp } from '../../../test/testUtils';
import ResizeHelper from '../Resizer/helper';

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
    handler.simulate('mousedown', { button: 0 });
    handles.forEach(({ key }) => {
      const handler = wrapper.findWhere(wrapper => wrapper.key() === `resizableHandle-${key}`);
      expect(handler);
      handler.simulate('mousedown', { button: 0, clientX: 10, clientY: 10 });
      mouseMove(100, 100, handler);

      mouseUp(100, 100, handler);
    });

    expect(resizeStart).toHaveBeenCalledTimes(handles.length);
    expect(resize).toHaveBeenCalledTimes(handles.length);
    expect(resizeStop).toHaveBeenCalledTimes(handles.length);

    wrapper.simulate('mousedown', { button: 0, clientX: 10, clientY: 10 });
    expect((wrapper.state() as IGridLayoutState).layoutState.focusItem).toBeFalsy();
    expect((wrapper.instance() as Layout).onResize('a', {} as any, {} as any)).toBeUndefined();
  });

  test('width resize helper', () => {
    const resizeStart = jest.fn();
    const resize = jest.fn();
    const resizeStop = jest.fn();

    const wrapper = mount(<Layout
      layout={[
        { i: 'a', x: 0, y: 0, w: 10, h: 10, minW: 10, minH: 10, maxH: 15, maxW: 15 },
        { i: 'b', x: 15, y: 15, w: 10, h: 10 }
      ]}
      width={1024}
      grid={[10, 10]}
      onResizeStart={resizeStart}
      onResize={resize}
      onResizeStop={resizeStop}
      minConstraints={[ 5, 5 ]}
      maxConstraints={[ 20, 20 ]}
      resizeHelper
    >
      <div key="a" id="handler">hello world</div>
      <div key="b" id="anotherHandler">hello world</div>
    </Layout>);

    expect(wrapper);

    const handler = wrapper.find('#handler');
    handler.simulate('mousedown', { button: 0});

    const resizer = wrapper.findWhere(wrapper => wrapper.key() === `resizableHandle-br`);
    expect(resizer);
    resizer.simulate('mousedown', { button: 0, clientX: 100, clientY: 100 });

    wrapper.update();
    expect(wrapper.find(ResizeHelper)).not.toBeNull();
  });

  test('resize with constraints', () => {
    const resizeStart = jest.fn();
    const resize = jest.fn();
    const resizeStop = jest.fn();

    const wrapper = mount(<Layout
      layout={[
        { i: 'a', x: 0, y: 0, w: 10, h: 10, minW: 10, minH: 10, maxH: 15, maxW: 15 },
        { i: 'b', x: 15, y: 15, w: 10, h: 10 }
      ]}
      width={1024}
      grid={[10, 10]}
      onResizeStart={resizeStart}
      onResize={resize}
      onResizeStop={resizeStop}
      minConstraints={[ 5, 5 ]}
      maxConstraints={[ 20, 20 ]}
    >
      <div key="a" id="handler">hello world</div>
      <div key="b" id="anotherHandler">hello world</div>
    </Layout>);

    expect(wrapper);

    const handler = wrapper.find('#handler');
    handler.simulate('mousedown', { button: 0});

    const resizer = wrapper.findWhere(wrapper => wrapper.key() === `resizableHandle-br`);
    expect(resizer);
    resizer.simulate('mousedown', { button: 0, clientX: 100, clientY: 100 });
    mouseMove(200, 200, handler);
    mouseUp(200, 200, handler);

    expect((wrapper.state() as IGridLayoutState).layoutState.layout)
      .toEqual([
        { i: 'a', x: 0, y: 0, w: 15, h: 15, minW: 10, minH: 10, maxH: 15, maxW: 15 },
        { i: 'b', x: 15, y: 15, w: 10, h: 10 }
      ]);
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
    node.simulate('mousedown', { button: 0 });

    handles.forEach(({ key }) => {
      const handler = wrapper.findWhere(wrapper => wrapper.key() === `resizableHandle-${key}`);
      expect(handler);
      handler.simulate('mousedown', { button: 0, clientX: 15, clientY: 15 });
      mouseMove(115, 115, handler);
      mouseUp(115, 115, handler);
    });

    expect(resizeStart).toHaveBeenCalledTimes(handles.length);
    expect(resize).toHaveBeenCalledTimes(handles.length);
    expect(resizeStop).toHaveBeenCalledTimes(handles.length);
  });
});