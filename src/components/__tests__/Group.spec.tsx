
import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import Layout, { IGridLayoutState } from '../Layout';
import { selectRange, mouseUp, generateDOM } from '../../../test/testUtils';
import { groupLayout, splitGroup } from '../../utils';

describe('Group', () => {
  let wrapper: ReactWrapper;
  let layoutChangeFn = jest.fn();
  let layoutSelectFn = jest.fn();

  const group = {
    'a+b': {
      id: 'a+b',
      layout: [{ i: 'a'}, { i: 'b'}]
    },
  };
  beforeAll(() => {
    wrapper = mount(<Layout
      layout={[
        { i: 'a', x: 10, y: 10, w: 10, h: 10 },
        { i: 'b', x: 25, y: 10, w: 10, h: 10 },
      ]}
      group={group}
      width={1024}
      grid={[10, 10]}
      groupElement={<div className="custom-group" />}
      onLayoutChange={layoutChangeFn}
      onLayoutSelect={layoutSelectFn}
    >
      <div key="a" id="a">hello world</div>
      <div key="b" id="b">hello world</div>
    </Layout>);
  });

  test('Layout with group', () => {
    expect(wrapper);
    const state = wrapper.state() as IGridLayoutState;
    expect(state.layoutState.groups).toEqual(group);
    expect(state.layoutState.layout.every(i => !!i.parent));
  });

  test('Custom group element', () => {
    expect(wrapper.find('.custom-group').length).toEqual(1);
  });

  test('Group Action: select and split group', () => {
    const a = wrapper.find('#a');
    a.simulate('mousedown', { button: 0 });
    wrapper.update();
    expect(layoutSelectFn).toHaveBeenCalled();
    const selectedGroup = layoutSelectFn.mock.calls[0][1];
    expect(layoutSelectFn.mock.calls[0][0][0].i).toEqual('a+b');
    expect(layoutSelectFn.mock.calls[0][1].id).toEqual('a+b');

    expect(
      splitGroup(selectedGroup.layout).every(i => !!i.parent)
    );
  });

  test('GroupAction: create group', () => {
    const fn = jest.fn();
    const layout = [
      { i: 'a', x: 10, y: 10, w: 10, h: 10 },
      { i: 'b', x: 25, y: 10, w: 10, h: 10 }
    ];
    const wrapper = mount(<Layout
      layout={layout}
      width={1024}
      grid={[10, 10]}
      onLayoutSelect={fn}
      useTransform={false}
    >
      <div key="a">a</div>
      <div key="b">b</div>
    </Layout>);

    expect(wrapper);

    const eventTarget =  wrapper.find('.react-grid-layout-selection-wrapper').at(0);
    expect(eventTarget);
    selectRange(eventTarget, { x: 0, y: 0}, { x: 300, y: 100 });

    const state = wrapper.state() as IGridLayoutState;

    expect(state.selectedLayout).toHaveLength(2);
    expect(fn).toBeCalled();
    expect(fn.mock.calls[0][0]).toEqual(state.selectedLayout);

    const group = groupLayout(fn.mock.calls[0][0], 'newGroup');
    expect(group.layout).toHaveLength(2);
    expect(group.layout.every(i => i.parent === 'newGroup'));

    const newLayout = mount(<Layout
      layout={group.layout}
      group={{ newGroup: group }}
      width={1024}
      grid={[10, 10]}
      onLayoutSelect={fn}
    >
      <div key="a">a</div>
      <div key="b">b</div>
    </Layout>);

    expect(newLayout);
    const newState = newLayout.state() as IGridLayoutState;
    expect(newState.layoutState.groups).toEqual({ newGroup: group });
  });

  test('select group', () => {
    const group = {
      'a+b': {
        id: 'a+b',
        layout: [{ i: 'a'}, { i: 'b'}]
      },
    };
    const wrapper = mount(<Layout
      layout={[
        { i: 'a', x: 10, y: 10, w: 10, h: 10 },
        { i: 'b', x: 25, y: 10, w: 10, h: 10 },
      ]}
      group={group}
      width={1024}
      grid={[10, 10]}
    >
      <div key="a" id="a">hello world</div>
      <div key="b" id="b">hello world</div>
    </Layout>);

    expect(wrapper);

    wrapper.find('#a').simulate('mousedown', { button: 0 });

    expect((wrapper.state() as IGridLayoutState).layoutState.focusItem).toEqual({ i: 'a+b', w: 25, x: 10, y: 10, h: 10,});
    wrapper.update();

    wrapper.find('#a').simulate('mousedown', { button: 0 });
    mouseUp(0, 0);
    expect((wrapper.state() as IGridLayoutState).layoutState.focusItem).toEqual({ i: 'a', x: 10, y: 10, w: 10, h: 10, parent: 'a+b' });

    wrapper.update();
    wrapper.find('#b').simulate('mousedown', { button: 0 });
    expect((wrapper.state() as IGridLayoutState).layoutState.focusItem).toEqual({ i: 'b', x: 25, y: 10, w: 10, h: 10, parent: 'a+b' });

    const groupEle = wrapper.findWhere(i => {
      return i && i.instance() && i.instance().props && (i.instance().props as any).i === 'a+b';
    });
    expect(groupEle);

    groupEle.simulate('mousedown', { button: 0 });
    expect((wrapper.state() as IGridLayoutState).layoutState.focusItem).toEqual({ i: 'a+b', w: 25, x: 10, y: 10, h: 10,});
  });

  test.only('Group: merge group', () => {
    const layout = [
      { i: 'a', x: 10, y: 10, w: 10, h: 10 },
      { i: 'b', x: 25, y: 10, w: 10, h: 10 },
      { i: 'c', x: 40, y: 10, w: 10, h: 10 },
    ];
    class App extends React.Component {
      state = {
        group: {
          'a+b': {
            id: 'a+b',
            layout: [{ i: 'a'}, { i: 'b'}]
          },
        }
      }
      groupLayout = () => {
        this.setState({
          group: {
            'a+b': {
              id: 'a+b',
              layout: [{ i: 'a'}, { i: 'b'}, { i: 'c'}]
            },
          }
        });
      }
      render() {
        return <Layout
          layout={layout}
          group={this.state.group}
          grid={[ 10, 10 ]}
          width={1024}
          useTransform={false}
        >
          {generateDOM(layout)}
        </Layout>
      }
    }

    const wrapper = mount(<App />);
    expect(wrapper);

    const eventTarget =  wrapper.find('.react-grid-layout-selection-wrapper').at(0);
    selectRange(eventTarget, { x: 0, y: 0}, { x: 500, y: 100 });
    wrapper.update();
    const state = wrapper.find(Layout).state() as IGridLayoutState;

    expect(state.selectedLayout).toHaveLength(3);

    (wrapper.instance() as any).groupLayout();
    wrapper.update();

    const layoutState = (wrapper.find(Layout).state() as IGridLayoutState).layoutState;
    expect(layoutState.groups['a+b'].layout).toHaveLength(3);
  });

  test('Group: delete item from group', () => {
      const selectFn = jest.fn();
      class App extends React.Component {
        state = {
          layout: [
            { i: 'a', x: 10, y: 10, w: 10, h: 10 },
            { i: 'b', x: 25, y: 10, w: 10, h: 10 },
            { i: 'c', x: 40, y: 10, w: 10, h: 10 },
          ],
          group: {
            'a+b': {
              id: 'a+b',
              layout: [{ i: 'a'}, { i: 'b'}, { i: 'c' }]
            },
          }
        }
        deleteItem = () => {
          this.setState({
            layout: this.state.layout.filter(i => i.i !== 'a'),
          });
        }
        render() {
          return <Layout
            layout={this.state.layout}
            group={this.state.group}
            grid={[ 10, 10 ]}
            width={1024}
            useTransform={false}
            onLayoutSelect={selectFn}
          >
            {generateDOM(this.state.layout)}
          </Layout>
        }
      }

      const wrapper = mount(<App />);
      expect(wrapper);

      const handler = wrapper.find('#a');
      handler.simulate('mousedown', { button: 0 });
      wrapper.update();

      expect(selectFn).toBeCalled();

      (wrapper.instance() as any).deleteItem();
      wrapper.update();

      expect((wrapper.state() as any).layout).toEqual([
        {"h": 10, "i": "b", "parent": "a+b", "w": 10, "x": 25, "y": 10},
        {"h": 10, "i": "c", "parent": "a+b", "w": 10, "x": 40, "y": 10}
      ]);
      const layoutRef = wrapper.find(Layout);

      expect(layoutRef);

      const state = layoutRef.state();
      const layoutState = state.layoutState;

      expect(layoutState.groups['a+b'].layout).toEqual([
        {"h": 10, "i": "b", "parent": "a+b", "w": 10, "x": 25, "y": 10},
        {"h": 10, "i": "c", "parent": "a+b", "w": 10, "x": 40, "y": 10}
      ]);
  });
});
