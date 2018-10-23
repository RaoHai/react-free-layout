import React from 'react';
import { Layout, LayoutItem } from './App';
import { ReactElement } from 'react';

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
): Layout {
  let layout: Layout = initialLayout;

  React.Children.forEach(children, (child: ReactElement<any>, index) => {
    const definition = getLayoutItem(layout, String(child.key));
    if (definition) {
      layout[index] = definition;
    } else {
      const g = child.props["data-grid"];
        layout[index] = g ? g : { w: 1, h: 1, x: 0, y: bottom(layout), i: String(child.key) };
    }
  });

  layout = correctBounds(layout, { cols });
  return layout;
}

export function getLayoutItem(layout: Layout, key: string): LayoutItem | undefined {
  return layout.find(({ i }) => i === key);
}

export function setTransform({ top, left, width, height }: Position): {} {
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
    zIndex: 1,
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
