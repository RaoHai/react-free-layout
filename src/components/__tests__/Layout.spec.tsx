import React from 'react';
import { shallow, mount } from 'enzyme';
import toJSON from 'enzyme-to-json';
import { generateLayout, generateDOM, mouseMove, mouseUp } from '../../../test/testUtils';
import Layout, { IGridLayoutState } from '../Layout';
import { handles } from '../Resizer';
const layout = generateLayout();


test('single layout', () => {
  const fn = jest.fn();

  const wrapper = shallow(<Layout
    layout={[{ i: 'a', x: 10, y: 10, w: 10, h: 10}]}
    width={1024}
    grid={[8, 8]}
    onLayoutChange={fn}
  >
    <div key="a">hello world</div>
  </Layout>);

  expect(wrapper.find('div')).not.toBeNull();
  expect(toJSON(wrapper));

  wrapper.unmount();
  expect(wrapper.instance()).toBeNull();
});


test('layoutResize', () => {
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

});

test('basic render', () => {
  const wrapper = shallow(
    <Layout
      layout={layout}
      width={1024}
      grid={[8, 8]}
    >
      {generateDOM(layout)}
    </Layout>
  );
  expect(wrapper.find('div')).not.toBeNull();
});

test('controlled layout', () => {
  const fn = jest.fn();
  class App extends React.Component {
    state = {
      layout: [{ i: 'a', x: 10, y: 10, w: 10, h: 10}],
    }

    layoutChange = (layout: any) => {
      fn(layout);
      this.setState({ layout });
    }

    render() {
      const { layout } = this.state;
      return <Layout
        layout={layout}
        width={1024}
        grid={[8, 8]}
        onLayoutChange={this.layoutChange}
        onDrag={this.layoutChange}
        onDragStart={this.layoutChange}
        onDragStop={this.layoutChange}
      >
        <div key="a" id="handler">a</div>
      </Layout>
    }
  }

  const wrapper = mount(<App />);
  const layout = wrapper.find(Layout);
  expect(wrapper);
  expect(layout);

  const handler = wrapper.find('#handler').at(0);
  handler.simulate('mousedown', { clientX: 55, clientY: 55 });

  expect(layout.state().oldDragItem);
  expect(layout.state().oldLayout);

  mouseMove(200, 400);

  expect(layout.state().activeDrag);
  expect(layout.state().activeDrag.i).toEqual('a');

  mouseUp(200, 400);

  expect(fn).toHaveBeenCalled();
  expect(layout.state().activeDrag).toBeNull();
  expect((wrapper.state() as any).layout).toEqual(layout.state().layout);
});

test('click and select', () => {
  const fn = jest.fn();
  const wrapper = mount(<Layout
    layout={[{ i: 'a', x: 10, y: 10, w: 10, h: 10 }]}
    grid={[ 10, 10]}
    width={1024}
    onDragStart={fn}
  >
    <div key="a" id="single">a</div>
  </Layout>);

  expect(wrapper);
  const handler = wrapper.find('#single');

  expect(handler);
  handler.simulate('mousedown');

  expect(fn).toBeCalled();

  const state = wrapper.state() as IGridLayoutState;
  expect(state.focusItem).toEqual({ i: 'a', x: 10, y: 10, w: 10, h: 10 });
});

test('click and select group', () => {
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
  >
    <div key="a" id="a">hello world</div>
    <div key="b" id="b">hello world</div>
  </Layout>);

  expect(wrapper);
  const handler = wrapper.find('#a');

  expect(handler);
  handler.simulate('mousedown', { clientX: 101, clientY: 101 });

  expect((wrapper.state() as IGridLayoutState).focusItem).toEqual({ i: 'a+b', x: 10, y: 10, w: 25, h: 10 });

  handler.simulate('mousedown', { clientX: 101, clientY: 101 });
  handler.simulate('mouseup', { clientX: 101, clientY: 101 });

  const state = wrapper.state() as IGridLayoutState;
  expect(state.focusItem && state.focusItem.i).toEqual('a');
});

test('drag selected group', () => {
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
  >
    <div key="a" id="a">hello world</div>
    <div key="b" id="b">hello world</div>
  </Layout>);

  expect(wrapper);
  const handler = wrapper.find('#a');
  const b = wrapper.find('#b');

  // mock getBoundingClientRect
  handler.getDOMNode().getBoundingClientRect = () => ({
    width: 100,
    height: 100,
    left: 100,
    top: 100,
    right: 200,
    bottom: 200,
  });

  b.getDOMNode().getBoundingClientRect = () => ({
    width: 100,
    height: 100,
    left: 250,
    top: 100,
    right: 350,
    bottom: 200,
  });

  expect(handler);
  handler.simulate('mousedown', { clientX: 100, clientY: 100 });

  const state = wrapper.state() as IGridLayoutState;
  expect(state.focusItem).toEqual({ i: 'a+b', x: 10, y: 10, w: 25, h: 10 });

  expect(state.activeGroup && state.activeGroup.id).toEqual('a+b');

  mouseMove(200, 200);
  mouseUp(200, 200);

  expect((wrapper.state() as IGridLayoutState).layout).toEqual([
    { i: 'a', x: 20, y: 20, w: 10, h: 10, moved: true, parent: 'a+b' },
    { i: 'b', x: 35, y: 20, w: 10, h: 10, moved: true, parent: 'a+b' }
  ])
});

test('contextMenu', () => {
  const fn = jest.fn();
  const wrapper = mount(<Layout
    layout={[{ i: 'a', x: 10, y: 10, w: 10, h: 10}]}
    width={1024}
    grid={[8, 8]}
    onContextMenu={fn}
  >
    <div key="a" id="a">hello world</div>
  </Layout>);

  expect(wrapper);

  const handler = wrapper.find('#a');
  handler.simulate('mousedown');
  handler.simulate('contextmenu');

  expect(fn).toBeCalled();
  expect(fn.mock.calls[0][0]).toEqual('a');
  expect(fn.mock.calls[0][1]).toEqual({ i: 'a', x: 10, y: 10, w: 10, h: 10});
});

it('delete selected item', () => {
  class App extends React.Component {
    state = {
      layout: [
        { i: 'a', x: 10, y: 10, w: 10, h: 10 },
        { i: 'b', x: 25, y: 10, w: 10, h: 10 }
      ],
    }

    delete = () => {
      this.setState({ layout: this.state.layout.filter(i => i.i !== 'a') })
    }

    render() {
      const { layout } = this.state;
      return <Layout
        layout={layout}
        width={1024}
        grid={[8, 8]}
      >
        {layout.map(({ i }) => <div key={i} id={i} >{i}</div>)}
      </Layout>
    }
  }

  const wrapper = mount(<App />);
  const layout = wrapper.find(Layout);

  expect(wrapper);
  expect(layout);

  const handler = wrapper.find('#a');
  expect(handler);

  handler.simulate('mousedown');

  expect(layout.state().focusItem).toEqual({ i: 'a', x: 10, y: 10, w: 10, h: 10 });

  (wrapper.instance() as any).delete();

  expect(layout.state().focusItem).toBeNull()
});