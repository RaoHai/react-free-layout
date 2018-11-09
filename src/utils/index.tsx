import React from 'react';
import ReactDOM from 'react-dom';
import { Layout, LayoutItem, Groups, temporaryGroupId, Group } from '../components/Layout';
import Selection, { MousePosition, TouchEvent } from '../components/Selection';

export type CompactType = 'horizontal' | 'vertical';
export interface Position {
  left: number,
  top: number,
  width: number,
  height: number,
};

export function noop() { return; }


export function synchronizeLayoutWithChildren(
  initialLayout: Layout,
  children: JSX.Element[] | JSX.Element,
  cols: number,
  compactType: CompactType = 'vertical',
  group: Groups,
): {
  layout: Layout;
  maxZ: number;
  bottom: number;
  group: Groups,
} {
  let layout: Layout = initialLayout;
  let maxZ = -Infinity;

  const parentMap = {};

  for (const key in group) {
    if (group.hasOwnProperty(key)) {
      (group[key] as Group).layout.forEach(i => parentMap[i.i] = key);
    }
  }

  React.Children.forEach(children, (child: React.ReactChild, index) => {
    if (!React.isValidElement(child)) {
      return;
    }
    const definition = getLayoutItem(layout, String(child.key));
    if (definition) {
      maxZ = Math.max(maxZ, definition.z || 0);
      if (parentMap.hasOwnProperty(definition.i)) {
        definition.parent = parentMap[definition.i];
      }

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
    group,
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

/**
 * 移动元素
 * @param layout 布局数组
 * @param l 需要移动的组件
 * @param x 新的 x
 * @param y 新的 y
 * @param isUserAction
 * @param cols
 * @param forceMovement 是否忽略 static 标记进行强制移动
 */
export function moveElement(
  layout: Layout,
  l: LayoutItem,
  x: number,
  y: number,
  isUserAction: boolean,
  cols: number,
  forceMovement: boolean = false,
) {
  if (l.static && !forceMovement) {
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

export interface GridRect {
  x: number;
  y: number;
  right: number;
  bottom: number;
}

export function getRectFromPoints(start: MousePosition, end: MousePosition, colWidth: number): GridRect {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const right = Math.max(start.x, end.x);
  const bottom = Math.max(start.y, end.y);

  return {
    x: Math.floor(x / colWidth),
    y: Math.floor(y / colWidth),
    right: Math.ceil(right / colWidth),
    bottom: Math.ceil(bottom / colWidth),
  };
}

export function pickByRect(
  layout: Layout,
  rect: GridRect,
  pickOption: 'include' | 'contain' = 'contain',
) {
  return layout.filter(item => {
    if (pickOption === 'include') {
      return rect.x < item.x
        && rect.y < item.y
        && rect.right > item.x + item.w
        && rect.bottom > item.y + item.h;
    }

    return rect.x < item.x + item.w
      && rect.y < item.y + item.h
      && rect.right > item.x
      && rect.bottom > item.y
  });
}

export function getBoundingRectFromLayout(layout: Layout): GridRect {
  let x: number = Infinity, y: number = Infinity, right: number = -Infinity, bottom: number = -Infinity;
  layout.forEach(i => {
    x = Math.min(i.x, x);
    y = Math.min(i.y, y);
    right = Math.max(i.x + i.w, right);
    bottom = Math.max(i.y + i.h, bottom);
  });

  return { x, y, right, bottom }
}


export function mergeTemporaryGroup(
  newGroup: Groups,
  stateGroup: Groups,
) {

  if (!stateGroup || !stateGroup[temporaryGroupId]) {
    return newGroup;
  }

  newGroup[temporaryGroupId] = stateGroup[temporaryGroupId]
  return newGroup;
}

/**
 * 按指定 Rect 调整布局
 * * 注意
 * * * 在调整一个组时
 * * * 组的外框是跟随网格的
 * * * 但是由于保证百分比
 * * * 所以组内部的元素无法保证跟随网格
 * * * 再单独调整容器内组件时
 * * * 才会继续跟随网格
 * * * 此处逻辑与 Google 的 datastudio 一致。
 * @param layout 布局数组
 * @param restrict 限定的 Rect
 */
export function stretchLayout(layout: LayoutItem[], restrict: GridRect): LayoutItem[] {
  if (!layout.length) {
    return layout;
  }

  const originRect = getBoundingRectFromLayout(layout);
  const w = originRect.right - originRect.x;
  const h = originRect.bottom - originRect.y;

  const nw = restrict.right - restrict.x;
  const nh = restrict.bottom - restrict.y;

  return layout.map(i => ({
    ...i,
    x: ((i.x - originRect.x) * nw / w) + restrict.x,
    y: ((i.y - originRect.y) * nh / h) + restrict.y,
    w: i.w * nw / w,
    h: i.h * nh / h,
  }));

}