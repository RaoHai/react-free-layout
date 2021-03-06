import ReactDOM from 'react-dom';
import { Layout, LayoutItem, Groups, Group, defaultLevel } from '../model/LayoutState';
import { temporaryGroupId, IGridLayoutProps } from '../components/Layout';
import { MousePosition } from '../components/Selection';
import { Ref } from 'react';

export const canUseDOM = () => !!(
  typeof window !== 'undefined' &&
  window.document &&
  window.document.createElement
);

export class GridRect {
  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    public right = x + width,
    public bottom = y + height,
    public left = x,
    public top = y,
  ) {}
}

export interface Position {
  left: number,
  top: number,
  width: number,
  height: number,
};

export function noop() { return; }
export type OffsetParent = HTMLElement | Document | (() => HTMLElement | null);

export function isEqual<T extends {}>(value: T | undefined, other: T | undefined) {
  if (value === other) {
    return true;
  }

  if (!value || !other) {
    if (!value && !other) {
      return true;;
    }
    return false
  }

  if (Object.keys(value).length !== Object.keys(other).length) {
    return false;
  }

  for (const key in value) {
    if (value.hasOwnProperty(key)) {
      if (!other.hasOwnProperty(key)) {
        return false;
      }

      if (value[key] !== other[key]) {
        return false;
      }
    }
  }

  return true;
}

export function classNames(...args: Array<string | {} | undefined>): string {
  const cls: string[] = [];
  for (const arg of args) {
    if (typeof arg === 'string') {
      cls.push(arg);
    } else if (Array.isArray(arg)) {
      cls.push(classNames(...arg));
    } else if (typeof arg === 'object') {
      for (const key in arg) {
        if (arg.hasOwnProperty(key) && arg[key]) {
          cls.push(key);
        }
      }
    }
  }

  return cls.join(' ');
}

export function setTransform(
  { top, left, width, height }: Position,
  useTransform = true,
  containerWidth?: number,
): {} {

  let translate;
  // Replace unitless items with px
  if (containerWidth) {
    translate = `translate(0,${top}px)`;
    return {
      transform: translate,
      WebkitTransform: translate,
      MozTransform: translate,
      msTransform: translate,
      OTransform: translate,
      height: `${height}px`,
      left: `${left / containerWidth * 100}%`,
      width: `${width / containerWidth * 100}%`,
      position: 'absolute',
    };
  }

  translate = `translate(${left}px,${top}px)`;
  const transformProps = useTransform ? {
    left: 0,
    top: 0,
    transform: translate,
    WebkitTransform: translate,
    MozTransform: translate,
    msTransform: translate,
    OTransform: translate,
  } : {
    left: `${left}px`,
    top: `${top}px`,
  };

  return {
    ...transformProps,
    width: containerWidth ? `${width / containerWidth * 100}%` : `${width}px`,
    height: `${height}px`,
    position: 'absolute',
    zIndex: 1,
  };
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

export function getOwnerDocument(ele?: HTMLElement | Document) {
  return ele && ele.ownerDocument && ele.ownerDocument.body || document.body
}

export function getControlPosition<T extends React.Component<{ offsetParent?: OffsetParent }>>(
  e: TouchEvent,
  identifier: number,
  t: T,
) {
  const touchObj = typeof identifier === 'number' ? getTouch(e, identifier) : null;
  const node = ReactDOM.findDOMNode(t) as HTMLElement;

  return offsetXYFromParent(
    touchObj || e as any,
    getOffsetParent(t.props.offsetParent) || node.offsetParent || getOwnerDocument(node),
  );
}

export function getOffsetParent(offsetParent?: OffsetParent): HTMLElement {
  if (typeof offsetParent === 'function') {
    return offsetParent() || document.body;
  }
  return offsetParent as HTMLElement;
}

export function getRectFromParent(
  ele: Element,
  offsetParent: HTMLElement,
) {
  const isBody = offsetParent === (offsetParent.ownerDocument && offsetParent.ownerDocument.body);
  const offsetParentRect = isBody ? {left: 0, top: 0} : offsetParent.getBoundingClientRect();
  const eleRect = ele.getBoundingClientRect();
  const x = eleRect.left + offsetParent.scrollLeft - offsetParentRect.left;
  const y = eleRect.top + offsetParent.scrollTop - offsetParentRect.top;

  return new GridRect(x, y, eleRect.width, eleRect.height);
}

export function offsetXYFromParent(
  evt: { clientX: number, clientY: number },
  offsetParent: HTMLElement,
) {

  const isBody = offsetParent === (offsetParent.ownerDocument && offsetParent.ownerDocument.body);
  const offsetParentRect = isBody ? {left: 0, top: 0} : offsetParent.getBoundingClientRect();

  const x = evt.clientX + offsetParent.scrollLeft - offsetParentRect.left;
  const y = evt.clientY + offsetParent.scrollTop - offsetParentRect.top;

  return { x, y };
}


export function getRectFromPoints(start: MousePosition, end: MousePosition, colWidth: number): GridRect {
  const x = Math.floor(Math.min(start.x, end.x));
  const y = Math.floor(Math.min(start.y, end.y));
  return new GridRect(x, y, Math.abs(start.x - end.x), Math.abs(start.y - end.y));
}

export function pickLayout(layout: LayoutItem[], findLayout: Array<LayoutItem['i']>) {
  return layout.filter(t => findLayout.indexOf(t.i) !== -1);
}

export function executeConstrains(size: number, constraints: [ number, number ]) {
  return Math.min(
      Math.max(size, constraints[0]),
      constraints[1],
  );
}

export function getLayoutItem(layout: Layout, key: string | symbol): LayoutItem | undefined {
  return layout.find(({ i }) => i === key);
}

export function layoutEqual(value: LayoutItem[], other: LayoutItem[]) {
  if (value.length !== other.length) {
    return false;
  }

  for (let i = 0; i < value.length; i++) {
    if (!isEqual(value[i], other[i])) {
      return false;
    }
  }

  return true;
}

export function getBottom(layout: Layout): number {
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
    parent: layoutItem.parent,
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


export function groupLayout(originLayout: Layout, id: string): Group {
  const level: number[] = [];
  const layout = originLayout.map(i => {
    if (i.z && !isNaN(i.z) && i.z !== defaultLevel) {
      level.push(i.z);
    }
    return {
      ...i,
      parent: id,
      _parent: id,
    };
  });
  return {
    id,
    level,
    layout,
    rect: getBoundingRectFromLayout(layout),
  };
}

export function splitGroup(layout: Layout): Layout {
  return layout.map(i => ({ ...i, parent: undefined }));
}

export type PickOption = 'include' | 'contain';

function contains(
  originRect: GridRect,
  targetRect: GridRect,
  pickOption: PickOption,
): boolean {
  if (pickOption === 'include') {
    return originRect.x < targetRect.x
      && originRect.y < targetRect.y
      && originRect.right > targetRect.right
      && originRect.bottom > targetRect.bottom
  }

  return originRect.x < targetRect.right
    && originRect.y < targetRect.bottom
    && originRect.right > targetRect.x
    && originRect.bottom > targetRect.y;
}

export function pickByRect<T>(
  layoutRefs: { [key in symbol]: Ref<T> },
  rect: GridRect,
  pickOption: PickOption = 'contain',
): Array<LayoutItem['i']> {
  const result = [];
  for (const key in layoutRefs) {
    if (layoutRefs.hasOwnProperty(key)) {
      const { current } = layoutRefs[key];
      const ele = ReactDOM.findDOMNode(current) as HTMLElement;

      if (!ele) {
        continue;
      }
      const itemRect = getRectFromParent(ele,
        getOffsetParent(current.props.offsetParent) || ele.offsetParent || getOwnerDocument(ele));
      if (contains(rect, itemRect, pickOption)) {
        result.push(key);
      }
    }
  }

  return result;
}

export function hoistSelectionByParent(
  layout: Layout,
  group: Groups,
): Layout {
  const parents = new Set();
  const singleItems: LayoutItem[] = [];

  layout.forEach(i => {
    if (i.parent) {
      parents.add(i.parent);
    } else {
      singleItems.push(i);
    }
  });

  return parents.size ? Array.from(parents).reduce((list, parentId) =>
    group[parentId] ? list.concat( group[parentId].layout || []) : []
  , []).concat(singleItems) : layout;
}

export function updateLayout(
  layout: Layout,
  newLayout: Layout,
  extraValue?: any,
  iter: (...args: any[]) => LayoutItem = (...args: any[]) => Object.assign({}, ...args),
) {
  if (!newLayout || !newLayout.length) {
    return layout;
  }

  for (let i = 0; i < newLayout.length; i++) {
    const item = newLayout[i];
    const foundIndex = layout.findIndex(t => t.i === item.i);
    if (foundIndex !== -1) {
      const found = layout[foundIndex];
      layout[foundIndex] = iter(found, item, typeof extraValue === 'function' ? extraValue(item) : extraValue);
    } else {
      layout.push(item);
    }
  }

  return layout;
}

export function mergeLayout(
  layout: Layout,
  newLayout: Layout,
  extraValue?: (i: LayoutItem) => LayoutItem | {},
) {
  return updateLayout(layout, newLayout, extraValue, (...args: any[]) => Object.assign(args[0], ...args.slice(1)));
}

export function getBoundingRectFromLayout(layout: Layout): GridRect {
  let x: number = Infinity;
  let y: number = Infinity;
  let right: number = -Infinity;
  let bottom: number = -Infinity;

  layout.forEach(i => {
    x = Math.min(i.x, x);
    y = Math.min(i.y, y);
    right = Math.max(i.x + i.w, right);
    bottom = Math.max(i.y + i.h, bottom);
  });

  return new GridRect(x, y, right - x, bottom - y);
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
export function stretchLayout(
  layout: LayoutItem[],
  restrict: GridRect,
  stretchOptions: { strict: boolean } = { strict: false }
): LayoutItem[] {

  const originRect = getBoundingRectFromLayout(layout);
  const w = originRect.right - originRect.x;
  const h = originRect.bottom - originRect.y;

  const nw = restrict.right - restrict.x;
  const nh = restrict.bottom - restrict.y;

  return layout.map(i => {
    let canStretchX = i.stretchOptions === 'both' || i.stretchOptions === 'x';
    let canStretchY = i.stretchOptions === 'both' || i.stretchOptions === 'y';

    canStretchX = stretchOptions.strict ? canStretchX : (canStretchX || !i.stretchOptions);
    canStretchY = stretchOptions.strict ? canStretchY : (canStretchY || !i.stretchOptions);
    return {
      ...i,
      x: ((i.x - originRect.x) * nw / w) + restrict.x,
      y: ((i.y - originRect.y) * nh / h) + restrict.y,
      w: canStretchX ? i.w * nw / w : i.w,
      h: canStretchY ? i.h * nh / h : i.h,
    };
  });
}

export function autoFit(layout: LayoutItem[], restrict: GridRect) {
  return layout.map(i => {
    if (!i.stretchOptions) {
      return i;
    }


    if (i.stretchOptions === 'x' || i.stretchOptions === 'both') {
      i.x = restrict.x;
      i.w = restrict.width;
    }

    if (i.stretchOptions === 'y' || i.stretchOptions === 'both') {
      i.y = restrict.y;
      i.h = restrict.height;
    }

    return i;
  });
}

export function calcPosition(
  x: number,
  y: number,
  w: number,
  h: number,
  colWidth: number,
  rowHeight: number,
  containerPadding: [number, number],
  scale: number = 1,
) {

  const out = {
    left: Math.round(colWidth * x + containerPadding[0]) * scale,
    top: Math.round(rowHeight * y + containerPadding[1]) * scale,
    // 0 * Infinity === NaN, which causes problems with resize constraints;
    // Fix this if it occurs.
    // Note we do it here rather than later because Math.round(Infinity) causes deopt
    width: Math.round(colWidth * w) * scale,
    height: Math.round(rowHeight * h) * scale,
  };

  return out;
}

export function isTemporaryGroup(item: LayoutItem) {
  return item.i === temporaryGroupId;
}

export function getCols({ width, grid }: Pick<IGridLayoutProps, 'width' | 'grid'>) {
  return Math.ceil(width / grid[0]);
}

export type CompactType = 'vertical' | 'horizontal';

function getStatics(layout: Layout): LayoutItem[] {
  return layout.filter(l => l.static);
}

export function sortLayoutItems(
  layout: Layout,
  compactType: CompactType
): Layout {
  if (compactType === "horizontal") {
    return sortLayoutItemsByColRow(layout);
  }
  return sortLayoutItemsByRowCol(layout);
}

export function sortLayoutItemsByRowCol(layout: Layout): Layout {
  return ([] as Layout).concat(layout).sort((a, b) => {
    if (a.y > b.y || (a.y === b.y && a.x > b.x)) {
      return 1;
    } else if (a.y === b.y && a.x === b.x) {
      // Without this, we can get different sort results in IE vs. Chrome/FF
      return 0;
    }
    return -1;
  });
}

export function sortLayoutItemsByColRow(layout: Layout): Layout {
  return ([] as Layout).concat(layout).sort((a, b) => {
    if (a.x > b.x || (a.x === b.x && a.y > b.y)) {
      return 1;
    }
    return -1;
  });
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

const heightWidth = { x: "w", y: "h" };

function resolveCompactionCollision(
  layout: Layout,
  item: LayoutItem,
  moveToCoord: number,
  axis: "x" | "y"
) {
  const sizeProp = heightWidth[axis];
  item[axis] += 1;
  const itemIndex = layout
    .map(layoutItem => {
      return layoutItem.i;
    })
    .indexOf(item.i);

  // Go through each item we collide with.
  for (let i = itemIndex + 1; i < layout.length; i++) {
    const otherItem = layout[i];
    // Ignore static items
    if (otherItem.static) {
      continue;
    }

    // Optimization: we can break early if we know we're past this el
    // We can do this b/c it's a sorted layout
    if (otherItem.y > (item.y + item.h)) {
      break;
    }

    if (collides(item, otherItem)) {
      resolveCompactionCollision(
        layout,
        otherItem,
        moveToCoord + item[sizeProp],
        axis
      );
    }
  }

  item[axis] = moveToCoord;
}

export function compactItem(
  compareWith: Layout,
  l: LayoutItem,
  compactType: CompactType,
  cols: number,
  fullLayout: Layout,
  containerPadding = [0, 0]
): LayoutItem {
  const compactV = compactType === "vertical";
  const compactH = compactType === "horizontal";
  if (compactV) {
    // Bottom 'y' possible is the bottom of the layout.
    // This allows you to do nice stuff like specify {y: Infinity}
    // This is here because the layout must be sorted in order to get the correct bottom `y`.
    l.y = Math.min(getBottom(compareWith), l.y);
    // Move the element up as far as it can go without colliding.
    while (l.y > 0 && !getFirstCollision(compareWith, l)) {
      l.y--;
    }
  } else if (compactH) {
    l.y = Math.min(getBottom(compareWith), l.y);
    // Move the element left as far as it can go without colliding.
    while (l.x > 0 && !getFirstCollision(compareWith, l)) {
      l.x--;
    }
  }

  // Move it down, and keep moving it down if it's colliding.
  let collide;
  // tslint:disable-next-line
  while ((collide = getFirstCollision(compareWith, l))) {
    if (compactH) {
      resolveCompactionCollision(fullLayout, l, collide.x + collide.w + containerPadding[0], "x");
    } else {
      resolveCompactionCollision(fullLayout, l, collide.y + collide.h + containerPadding[1], "y");
    }
    // Since we can't grow without bounds horizontally, if we've overflown, let's move it down and try again.
    if (compactH && l.x + l.w > cols) {
      l.x = cols - l.w;
      l.y++;
    }
  }
  return l;
}

export function compact(
  layout: Layout,
  compactType: CompactType,
  cols: number,
  containerPadding = [0, 0]
): Layout {
  // Statics go in the compareWith array right away so items flow around them.
  const compareWith = getStatics(layout);
  // We go through the items by row and column.
  const sorted = sortLayoutItems(layout, compactType);
  // Holding for new items.
  const out = Array(layout.length);

  for (let i = 0, len = sorted.length; i < len; i++) {
    let l = cloneLayoutItem(sorted[i]);

    // Don't move static elements
    if (!l.static) {
      l = compactItem(compareWith, l, compactType, cols, sorted, containerPadding);

      // Add to comparison array. We only collide with items before this one.
      // Statics are already in this array.
      compareWith.push(l);
    }

    // Add to output array to make sure they still come out in the right order.
    out[layout.indexOf(sorted[i])] = l;

    // Clear moved flag, if it exists.
    l.moved = false;
  }

  return out;
}

export function calcColWidth(
  width: number,
  grid: IGridLayoutProps['grid'],
  containerPadding: IGridLayoutProps['containerPadding'],
) {
  const cols = getCols({ width, grid });
  return (width - containerPadding[0] * 2) / cols;
}

export function percentile(layout: Layout, cols: number, height?: number) {
  const h = height ? getBottom(layout) : 1;
  return layout.map(i => ({
    ...i,
    x: i.x / cols,
    y: i.y / h,
    w: i.w / cols,
    h: i.h / h,
  }));
}

export function layoutlize(layout: Layout, cols: number, unitHeight?: number) {
  const h = unitHeight ? unitHeight : 1;
  return layout.map(i => ({
    ...i,
    x: Math.round(i.x * cols),
    y: Math.round(i.y * h),
    w: Math.round(i.w * cols),
    h: Math.round(i.h * h),
  }));
}


export function changeItemLevel(item: LayoutItem, fn: (z: number) => number) {
  return {
    ...item,
    z: fn(item.z || 1)
  };
}

export function bringForward(item: LayoutItem) {
  return changeItemLevel(item, z => z + 1);
}

export function bringBack(item: LayoutItem) {
  return changeItemLevel(item, z => Math.max(z - 1, 1));
}

export function bringTop(item: LayoutItem, maxZ: number) {
  return changeItemLevel(item, () => maxZ + 1);
}

export function bringBottom(item: LayoutItem) {
  return changeItemLevel(item, () => 1);
}
