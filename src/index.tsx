import * as React from 'react';
import * as ReactDOM from 'react-dom';
import _ from 'lodash';
import App from './App';
import './index.css';
import registerServiceWorker from './registerServiceWorker';

function generateLayout() {
  return _.map(_.range(0, 25), (item, i) => {
    const y = Math.ceil(Math.random() * 4) + 1;
    return {
      x: _.random(0, 5) * 2 % 12,
      y: Math.floor(i / 6) * y,
      w: 2,
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
  <App
    layout={layout}
    width={1024}
    cols={24}
    rowHeight={16}
    margin={[ 8, 8 ]}
  >
    {generateDOM(layout)}
  </App>,
  document.getElementById('root') as HTMLElement
);
registerServiceWorker();
