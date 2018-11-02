import * as React from 'react';
import * as ReactDOM from 'react-dom';
import _ from 'lodash';
import Layout from './Layout';
import './index.css';

function generateLayout() {
  return _.map(_.range(0, 25), (item, i) => {
    const y = Math.ceil(Math.random() * 12) + 1;
    return {
      x: _.random(0, 5) * 10,
      y: Math.floor(i / 6) * y,
      w: 10,
      h: y,
      i: i.toString(),
      static: Math.random() < 0.05
    };
  });
}

function generateDOM(layouts: any[]) {
  return _.map(layouts, (l, i) => {
    return (
      <div key={i} className={l.static ? 'react-grid-item static' : 'react-grid-item'}>
        {l.static ?
          <span className="text" title="This item is static and cannot be removed or resized.">Static - {i}</span>
          : <span className="text">{i}</span>
        }
      </div>);
  });
}

const layout = generateLayout();

ReactDOM.render(
  <Layout
    layout={layout}
    width={1024}
    grid={[8, 8]}
  >
    {generateDOM(layout)}
  </Layout>,
  document.getElementById('root') as HTMLElement
);
