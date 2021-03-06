import React from 'react';
import _ from 'lodash';
import { getBoundingRectFromLayout } from '../src/utils';
import { ReactWrapper } from 'enzyme';
import { Group } from '../src/components/Layout';

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
      <div key={l.i || i} id={l.i} className={l.static ? 'react-grid-item static' : 'react-grid-item'}>
        {l.static ?
          <span className="text" title="This item is static and cannot be removed or resized.">Static - {i}</span>
          : <span className="text">{i}</span>
        }
      </div>);
  });
}

export function generateGroup(layouts: any[]) {
  const groups: { [key: string]: Group } = {};
  const max = Math.round(Math.random() * 10);
  _.forEach(layouts, (l, i) => {
    const rd = Math.floor(Math.random() * (max + 1));
    if (rd < max / 2) {
      return;
    }
    const id = `group-${rd}`;
    if (!groups[id]) {
      groups[id] = {
        id: String(id),
        layout: [],
      };
    }

    groups[id].layout.push(l);
  });

  for (const groupId in groups) {
    if (groups.hasOwnProperty(groupId)) {
      groups[groupId].rect = getBoundingRectFromLayout(groups[groupId].layout);
    }
  }

  return groups;
}


function createTouchEvent(x: number, y: number, element: Element | Document, eventType: string) {
  const touchObj = {
    identifier: Date.now(),
    target: element,
    clientX: x,
    clientY: y,
    radiusX: 2.5,
    radiusY: 2.5,
    rotationAngle: 10,
    force: 0.5,
  } as any;

  const touchEvent = new TouchEvent(eventType, {
    cancelable: true,
    bubbles: true,
    touches: [touchObj],
    targetTouches: [],
    changedTouches: [touchObj],
    shiftKey: true,
  });

  element.dispatchEvent(touchEvent);
}

export function mouseMove(x: number, y: number, node?: Element | ReactWrapper) {
  const doc = node && (node as Element).ownerDocument || document;
  const evt = doc.createEvent('MouseEvents');
  evt.initMouseEvent('mousemove', true, true, window,
      0, 0, 0, x, y, false, false, false, false, 0, null);
  doc.dispatchEvent(evt);
  return evt;
}

export function touchMove(x: number, y: number, node?: Element | ReactWrapper) {
  const doc = node && (node as Element).ownerDocument || document;
  createTouchEvent(x, y, doc, 'touchmove');
}

export function touchEnd(x: number, y: number, node?: Element | ReactWrapper) {
  const doc = node && (node as Element).ownerDocument || document;
  createTouchEvent(x, y, doc, 'touchend');
}

export function mouseUp(x: number, y: number, node?: Element | ReactWrapper) {
  const doc = node && (node as Element).ownerDocument || document;
  const evt = doc.createEvent('MouseEvents');
  evt.initMouseEvent('mouseup', true, true, window,
      0, 0, 0, x, y, false, false, false, false, 0, null);
  doc.dispatchEvent(evt);
  return evt;
}

export function selectRange(
  target: ReactWrapper,
  start: { x: number, y: number },
  end: { x: number, y: number },
) {
  target.simulate('mousedown', { button: 0, clientX: start.x, clientY: start.y });
  mouseMove(end.x, end.y);
  mouseUp(end.x, end.y);
}