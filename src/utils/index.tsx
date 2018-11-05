import React from 'react';
import ReactDOM from 'react-dom';
import { Layout, LayoutItem } from '../components/Layout';
import Selection from '../components/Selection';
import { TouchEvent } from './events';

export type CompactType = 'horizontal' | 'vertical';
export interface Position {
  left: number,
  top: number,
  width: number,
  height: number,
};

export function synchronizeLayoutWithChildren(
  initialLayout: Layout,
  children: JSX.Element[] | JSX.Element,
  cols: number,
  compactType: CompactType = 'vertical'
): {
  layout: Layout;
  maxZ: number;
  bottom: number;
} {
  let layout: Layout = initialLayout;
  let maxZ = -Infinity;

  React.Children.forEach(children, (child: React.ReactChild, index) => {
    if (!React.isValidElement(child)) {
      return;
    }
    const definition = getLayoutItem(layout, String(child.key));
    if (definition) {
      maxZ = Math.max(maxZ, definition.z || 0);
      layout[index] = definition;
    } else {
      const g = child.props["data-grid"];
        layout[index] = g ? g : { w: 1, h: 1, x: 0, y: bottom(layout), i: String(child.key) };
    }
  });

  layout = correctBounds(layout, { cols });
  return {
    layout,
    maxZ,
    bottom: bottom(layout),
  }
}

export function getLayoutItem(layout: Layout, key: string): LayoutItem | undefined {
  return layout.find(({ i }) => i === key);
}

export function setTransform({ top, left, width, height }: Position, z: number = 1): {} {
  // Replace unitless items with px
  const translate = `translate(${left}px,${top}px)`;
  return {
    transform: translate,
    WebkitTransform: translate,
    MozTransform: translate,
    msTransform: translate,
    OTransform: translate,
    width: `${width}px`,
    height: `${height}px`,
    position: "absolute",
    zIndex: z,
  };
}

export function getStatics(layout: Layout): Layout {
  return layout.filter(l => l.static);
}

export function collides(l1: LayoutItem, l2: LayoutItem): boolean {
  if (l1.i === l2.i) {
    return false; // same element
  }
  if (l1.x + l1.w <= l2.x) {
    return false; // l1 is left of l2
  }
  if (l1.x >= l2.x + l2.w) {
    return false; // l1 is right of l2
  }
  if (l1.y + l1.h <= l2.y) {
    return false; // l1 is above l2
  }
  if (l1.y >= l2.y + l2.h) {
    return false; // l1 is below l2
  }
  return true; // boxes overlap
}

export function getFirstCollision(
  layout: Layout,
  layoutItem: LayoutItem
): LayoutItem | undefined {
  for (let i = 0, len = layout.length; i < len; i++) {
    if (collides(layout[i], layoutItem)) {
      return layout[i];
    }
  }
  return;
}

export function correctBounds(
  layout: Layout,
  bounds: { cols: number }
): Layout {
  const collidesWith = getStatics(layout);
  for (let i = 0, len = layout.length; i < len; i++) {
    const l = layout[i];
    // Overflows right
    if (l.x + l.w > bounds.cols) {
      l.x = bounds.cols - l.w;
    }
    // Overflows left
    if (l.x < 0) {
      l.x = 0;
      l.w = bounds.cols;
    }
    if (!l.static) {
      collidesWith.push(l);
    } else {
      // If this is static and collides with other statics, we must move it down.
      // We have to do something nicer than just letting them overlap.
      while (getFirstCollision(collidesWith, l)) {
        l.y++;
      }
    }
  }
  return layout;
}

export function bottom(layout: Layout): number {
  let max = 0;
  let bottomY;
  for (let i = 0, len = layout.length; i < len; i++) {
    bottomY = layout[i].y + layout[i].h;
    if (bottomY > max) {
      max = bottomY;
    }
  }
  return max;
}

export function cloneLayoutItem(layoutItem: LayoutItem): LayoutItem {
  return {
    w: layoutItem.w,
    h: layoutItem.h,
    x: layoutItem.x,
    y: layoutItem.y,
    i: layoutItem.i,
    minW: layoutItem.minW,
    maxW: layoutItem.maxW,
    minH: layoutItem.minH,
    maxH: layoutItem.maxH,
    moved: Boolean(layoutItem.moved),
    static: Boolean(layoutItem.static),
    // These can be null
    isDraggable: layoutItem.isDraggable,
    isResizable: layoutItem.isResizable,
  };
}

export function moveElement(
  layout: Layout,
  l: LayoutItem,
  x: number,
  y: number,
  isUserAction: boolean,
  cols: number,
) {
  if (l.static) {
    return layout;
  }

  if (l.y === y && l.x === x) {
    return layout;
  }

  if (typeof x === 'number') {
    l.x = x;
  }
  if (typeof y === 'number') {
    l.y = y;
  }
  l.moved = true;

  return layout;
}

export function getTouchIdentifier(e: Pick<TouchEvent, 'targetTouches' | 'changedTouches'>): number {
  if (e.targetTouches && e.targetTouches[0]) {
    return e.targetTouches[0].identifier;
  }
  if (e.changedTouches && e.changedTouches[0]) {
    return e.changedTouches[0].identifier;
  }

  return 0;
}

export interface ArrayLike<T> {
  [index: number]: T;
  length: number;
}

function findInArray<T>(array: ArrayLike<T>, iter: (i: T) => boolean): T | null {
  for (let i = 0; i < array.length; i++) {
    if (iter(array[i])) {
      return array[i];
    }
  }
  return null;
}

export function getTouch(e: TouchEvent, identifier: number): { clientX: number, clientY: number } | null {
  return (e.targetTouches && findInArray(e.targetTouches, t => identifier === t.identifier)) ||
         (e.changedTouches && findInArray(e.changedTouches, t => identifier === t.identifier));
}

export function getControlPosition(
  e: TouchEvent,
  identifier: number,
  selection: Selection,
) {
  const touchObj = typeof identifier === 'number' ? getTouch(e, identifier) : null;
  const node = ReactDOM.findDOMNode(selection) as HTMLElement;
  if (!node) {
    return null;
  }

  const offsetParent = selection.props.offsetParent ||
    node.offsetParent ||
    (node.ownerDocument && node.ownerDocument.body) || document.body;

  return offsetXYFromParent(touchObj || e as any, offsetParent);
}

export function offsetXYFromParent(evt: { clientX: number, clientY: number }, offsetParent: Element) {
  const isBody = offsetParent === (offsetParent.ownerDocument && offsetParent.ownerDocument.body);
  const offsetParentRect = isBody ? {left: 0, top: 0} : offsetParent.getBoundingClientRect();

  const x = evt.clientX + offsetParent.scrollLeft - offsetParentRect.left;
  const y = evt.clientY + offsetParent.scrollTop - offsetParentRect.top;

  return { x, y };
}