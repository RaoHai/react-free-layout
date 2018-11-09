import React from 'react';
import _ from 'lodash';
import { getBoundingRectFromLayout } from '../src/utils/index';

Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
  get() { return this.parentNode; },
});

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

export function generateGroup(layouts: any[]) {
  const groups = {};
  const max = Math.round(Math.random() * 10);
  _.forEach(layouts, (l, i) => {
    const id = Math.floor(Math.random() * (max + 1));
    if (!groups[id]) {
      groups[id] = {
        layout: [],
      };
    }

    groups[id].layout.push(l);
  });

  for (const groupId in groups) {
    if (groups.hasOwnProperty(groupId)) {
      groups[groupId].grid = getBoundingRectFromLayout(groups[groupId].layout);
    }
  }

  return groups;
}

export function mouseMove(x: number, y: number, node?: Element) {
  const doc = node && node.ownerDocument || document;
  const evt = doc.createEvent('MouseEvents');
  evt.initMouseEvent('mousemove', true, true, window,
      0, 0, 0, x, y, false, false, false, false, 0, null);
  doc.dispatchEvent(evt);
  return evt;
}

export function mouseUp(x: number, y: number, node?: Element) {
  const doc = node && node.ownerDocument || document;
  const evt = doc.createEvent('MouseEvents');
  evt.initMouseEvent('mouseup', true, true, window,
      0, 0, 0, x, y, false, false, false, false, 0, null);
  doc.dispatchEvent(evt);
  return evt;
}