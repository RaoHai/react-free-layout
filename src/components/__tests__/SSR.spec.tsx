import React from 'react';
import ReactDOMServer from 'react-dom/server';
import Layout from '../Layout';

describe('SSR', () => {
  test('simple layout', () => {
    const dom = ReactDOMServer.renderToString(<Layout
      layout={[
        { i: 'a', x: 10, y: 10, w: 10, h: 10},
      ]}
      width={1024}
      grid={[8, 8]}
    >
      <div key="a">hello world</div>
      <div key="b" data-grid={{ i: 'b', x: 10, y: 10, w: 10, h: 10 }}>hello world</div>
      <div key="c" id="c">c</div>
      {'a' as any}
    </Layout>);

    expect(dom).toMatchSnapshot();
  });

  test('layout with group', () => {
    const group = {
      'a+b': {
        id: 'a+b',
        layout: [{ i: 'a'}, { i: 'b'}]
      }
    };
    const wrapper = ReactDOMServer.renderToString(<Layout
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


    expect(wrapper).toMatchSnapshot();
  });

});