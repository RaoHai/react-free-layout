import { Layout, LayoutItem, Groups, Group, GridRect, defaultLevel } from '../model/LayoutState';
import { temporaryGroupId, IGridLayoutProps } from '../components/Layout';

import { isEqual } from './index';

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


export function groupLayout(_layout: Layout, id: string): Group {
  const level: number[] = [];
  const layout = _layout.map(i => {
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
  extraValue?: (i: LayoutItem) => LayoutItem | {},
  iter: (...args: any[]) => LayoutItem = (...args: any[]) => Object.assign({}, ...args),
) {
  if (!newLayout || !newLayout.length) {
    return layout;
  }

  return layout.map(item => {
    const found = newLayout.find(n => n.i === item.i);
    if (found) {
      return iter(item, found, typeof extraValue === 'function' ? extraValue(found) : extraValue);
    }
    return item;
  });
}

export function mergeLayout(
  layout: Layout,
  newLayout: Layout,
  extraValue?: (i: LayoutItem) => LayoutItem | {},
) {
  return updateLayout(layout, newLayout, extraValue, (...args: any[]) => Object.assign(args[0], ...args.slice(1)));
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

export function calcPosition(
  x: number,
  y: number,
  w: number,
  h: number,
  colWidth: number,
  containerPadding: [number, number],
  suppliter = Math.round
) {

  const out = {
    left: suppliter(colWidth * x + containerPadding[0]),
    top: suppliter(colWidth * y + containerPadding[1]),
    // 0 * Infinity === NaN, which causes problems with resize constraints;
    // Fix this if it occurs.
    // Note we do it here rather than later because Math.round(Infinity) causes deopt
    width:
      w === Infinity
        ? w
        : Math.round(colWidth * w),
    height:
      h === Infinity
        ? h
        : Math.round(colWidth * h)
  };

  return out;
}

export function isTemporaryGroup(item: LayoutItem) {
  return item.i === temporaryGroupId;
}


export function getCols({ width, grid }: Pick<IGridLayoutProps, 'width' | 'grid'>) {
  return Math.ceil(width / grid[0]);
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
  const h = height ? bottom(layout) : 1;
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
