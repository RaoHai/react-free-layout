import React from 'react';
import { shallow, mount } from 'enzyme';
import toJSON from 'enzyme-to-json';
import { generateLayout, generateDOM, mouseMove, mouseUp } from '../../../test/testUtils';
import Layout, { temporaryGroupId } from '../Layout';
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

test('layout selection', () => {
  const wrapper = mount(<Layout
    layout={[{ i: 'a', x: 10, y: 10, w: 10, h: 10}]}
    width={1024}
    grid={[8, 8]}
  >
    <div key="a" id="target">hello world</div>
  </Layout>);

  const eventTarget =  wrapper.find('div').at(0);

  expect(eventTarget).not.toBeNull();

  eventTarget.simulate('mousedown', { clientX: 10, clientY: 10 });

  expect((wrapper.state() as any).selecting).toEqual(true);

  mouseMove(100, 200);

  expect((wrapper.state() as any).activeDrag);

  mouseUp(110, 210);

  const state = wrapper.state() as any;
  expect(state.selecting).toEqual(false);
  expect(state.selectedLayout).toHaveLength(1);
  expect(state.group[temporaryGroupId]);
});
