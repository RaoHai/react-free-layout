import React from 'react';
import _ from 'lodash';

export function generateLayout() {
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

export function generateDOM(layouts: any[]) {
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