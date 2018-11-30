import React, { ReactElement } from 'react';
import {
  getBottom,
  getBoundingRectFromLayout,
  getLayoutItem,
  mergeLayout,
  moveElement,
  GridRect,
  autoFit,
} from '../utils';
import { temporaryGroupId } from '../components/Layout';

export type StretchOptions = 'none' | 'x' | 'y' | 'both';
export interface LayoutItem {
  w: number;
  h: number;
  x: number;
  y: number;
  i: string | symbol;
  z?: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  moved?: boolean;
  static?: boolean;
  stretchOptions?: StretchOptions;
  isDraggable?: boolean;
  isResizable?: boolean;
  placeholder?: boolean;
  parent?: string | symbol;
  _parent?: string | symbol;
}

export type Layout = LayoutItem[];


export interface Group {
  id: string | symbol
  rect?: GridRect;
  layout: LayoutItem[];
  level: number[];
}

export type Groups = {
  [key in symbol]: Group;
};

export interface Items {
  definition: LayoutItem;
  child: ReactElement<any>;
}

export interface LevelMap {
  [index: number]: {
    groups: Group[];
    items: Items[];
  }
}

export interface GroupChild extends Group { type: 'group' };
export interface LayoutChild extends Items { type: 'item' };
export type LayoutChildren = GroupChild | LayoutChild;

export const defaultLevel = -Infinity;
export const TOP = 999;

function recoverFromMap(layout: LayoutItem[], parentId: Group['id'], definitionMap: {}) {
  return layout.reduce((prev, curr) => {
    if (definitionMap.hasOwnProperty(curr.i) && definitionMap[curr.i].definition.parent === parentId) {
      return prev.concat([ definitionMap[curr.i].definition]);
    }
    return prev;
  }, [] as LayoutItem[]);
}
export default class LayoutState {
  public bottom: number = 0;
  public focusItem?: LayoutItem;
  public placeholder?: LayoutItem;
  public oldDragItem?: LayoutItem;
  public activeDrag?: LayoutItem;
  public activeGroup?: Group;
  public oldActiveGroup?: Group;
  public dragging = false;

  private levelMap: LevelMap = [];
  private synchronized = false;

  constructor(public layout: LayoutItem[], public groups: Groups, public cols: number) {}

  update(layout: LayoutItem[], groups: Groups, cols: number) {
    this.layout = layout;
    this.groups = groups;
    this.cols = cols;
    return this;
  }

  synchronizeLayoutWithChildren(children: JSX.Element[] | JSX.Element) {
    const { layout, groups, focusItem, activeGroup } = this;
    let focusItemVisited = false;
    const definitionMap = {};
    const parentMap = {};
    const levelMap = {};

    for (const key in groups) {
      if (groups.hasOwnProperty(key) && groups[key].id !== temporaryGroupId) {
        const g: Group = groups[key];
        g.id = g.id || key;
        g.layout.forEach(i => parentMap[i.i] = key);
        g.layout = [];
        g.level = [];
        if (focusItem && focusItem.i === key) {
          focusItemVisited = true;
        }
      }
    }

    React.Children.forEach(children, (child: React.ReactChild, index) => {
      if (!React.isValidElement(child) || !child.key) {
        return;
      }
      const definitionInLayout = getLayoutItem(layout, String(child.key));
      const definition = definitionInLayout ?
        definitionInLayout :
        (child.props['data-grid'] || { w: 1, h: 1, x: 0, y: getBottom(layout), i: String(child.key) });

      if (definition.parent && !parentMap.hasOwnProperty(definition.parent)) {
        delete definition.parent;
      }
      definitionMap[definition.i] = { definition, child };

      const z = Number(definition.z || defaultLevel);
      if (!levelMap[z]) {
        levelMap[z] = { items: [], groups: [], };
      }

      if (parentMap.hasOwnProperty(definition.i)) {
        const parentId = parentMap[definition.i];
        definition.parent = parentId
        groups[parentId].layout.push(definition);
        if (z !== defaultLevel) {
          groups[parentId].level.push(z);
        }
      }

      if (!definition.parent) {
        levelMap[z].items.push({ definition, child });
      }

      const item = layout[index];
      if (focusItem && item && item.i === focusItem.i) {
        focusItemVisited = true;
      }
    });

    for (const key in groups) {
      if (groups.hasOwnProperty(key)) {
        const group: Group = groups[key];
        const level = group.level.length ? Math.min(...group.level) : defaultLevel;
        if (!levelMap[level]) {
          levelMap[level] = { items: [], groups: [], };
        }
        levelMap[level].groups.push(group);

        for (let i = 0; i < group.layout.length; i++) {
          const layoutId = group.layout[i].i;
          if (definitionMap.hasOwnProperty(layoutId)) {
            levelMap[level].items.push(definitionMap[layoutId]);
          }
        }
      }
    }

    if (activeGroup) {
      activeGroup.layout = recoverFromMap(activeGroup.layout, activeGroup.id, definitionMap);
      if (!activeGroup.layout.length || activeGroup.layout.length === 0) {
        this.activeGroup = undefined;
      }
    }

    if (groups[temporaryGroupId]) {
      groups[temporaryGroupId].layout = recoverFromMap(groups[temporaryGroupId].layout, temporaryGroupId, definitionMap);
      if (!groups[temporaryGroupId].layout.length || groups[temporaryGroupId].layout.length === 0) {
        delete groups[temporaryGroupId];
      }
    }

    this.focusItem = focusItemVisited ? focusItem : undefined;
    this.bottom = getBottom(layout);
    this.levelMap = levelMap;
    this.groups = groups;

    this.synchronized = true;
    return this;
  }

  getChildren(): LayoutChildren[] {
    const { levelMap, synchronized } = this;
    if (!synchronized) {
      throw new Error('Cannot get children before synchronized')
    }

    let children: LayoutChildren[] = [];

    Object.keys(levelMap).sort().forEach(index => {
     const { groups, items } = levelMap[Number(index)];

     children = children
     .concat(
       groups.reduce((prev, group) => (
         group.layout.length ? prev.concat([({ ...group, type: 'group' })]) : prev)
        , [] as GroupChild[])
     )
     .concat(
       items.map(item => ({ ...item, type: 'item' })) as LayoutChild[]
     )
    });

    return children;
  }

  moveElement(
    i: LayoutItem['i'],
    { x, y, dx, dy }: { [key: string]: number },
    moveWithParent = true,
  ) {
    const { focusItem, cols } = this;
    const l = this.getLayoutItem(String(i));

    if (!l) {
      this.placeholder = undefined;
      return this;
    }

    if (!focusItem) {
      return this;
    }

    if (moveWithParent && l.parent && l.parent === focusItem.i) {
      // const elementToMove
      const container = this.getGroup(l.parent);
      if (!container) {
        this.placeholder = undefined;
        return this;
      }
      const moved = container.layout;
      container.layout.forEach(item => {
        moveElement(
          moved,
          item,
          item.x + dx,
          item.y + dy,
          true,
          cols,
          true,
        );
      });

      this.placeholder = {
        w: l.w,
        h: l.h,
        x: l.x,
        y: l.y,
        placeholder: true,
        i: l.parent,
        z: TOP
      };

      this.merge(moved);
      const rect = getBoundingRectFromLayout(this.layout.filter(t => t.parent && t.parent === focusItem.i));
      this.focusItem = {
        ...focusItem,
        x: rect.x,
        y: rect.y,
        w: rect.right - rect.x,
        h: rect.bottom - rect.y,
        i: focusItem.i,
      };

      container.rect = getBoundingRectFromLayout(container.layout);
    } else {
      this.placeholder = {
        w: l.w,
        h: l.h,
        x: l.x,
        y: l.y,
        placeholder: true,
        i,
        z: TOP
      };

      this.focusItem = {
        ...(this.focusItem as LayoutItem),
        w: l.w,
        h: l.h,
        x: l.x,
        y: l.y,
      };

      moveElement(
        this.layout,
        l,
        x,
        y,
        true,
        cols
      );
    }

    return this;
  }

  stretch = (layoutItem: LayoutItem) => {
    if (!layoutItem.parent) {
      return layoutItem;
    }
    const container = this.getGroup(layoutItem.parent);

    const stretched = autoFit(
      container.layout,
      getBoundingRectFromLayout(container.layout),
    );

    return stretched.find(i => i.i === layoutItem.i) as LayoutItem;
  }

  merge(newLayout: LayoutItem[]) {
    const itemsToStretch: LayoutItem[] = this.layout
      .filter(i => Boolean(i.stretchOptions && i.stretchOptions !== 'none'));

    this.layout = mergeLayout(this.layout, newLayout);
    this.mergeGroup(this.layout);

    this.layout = itemsToStretch.length ?
      mergeLayout(this.layout, itemsToStretch.map(this.stretch)) :
      this.layout;
    return this;
  }

  getLayout() {
    return this.layout;
  }

  getLayoutItem(i: LayoutItem['i']): LayoutItem {
    return this.layout.find(item => item.i === i) as LayoutItem;
  }

  getGroup(id: Group['id']): Group {
    return this.groups[id];
  }

  mergeGroup(layout: LayoutItem[]) {
    for (let i = 0; i < layout.length; i++) {
      const item = layout[i];
      if (!item.parent) {
        continue;
      }

      const container: Group = this.groups[item.parent];
      if (!container) {
        continue;
      }

      container.layout = container.layout.map(
        layoutInContainer => layoutInContainer.i === item.i ? item : layoutInContainer,
      );
    }
  }

  addGroup(groupId: Group['id'], params: Group) {
    this.groups[groupId] = params;
    return this;
  }

  deleteGroup(groupId: Group['id']) {
    const targetContainer = this.getGroup(groupId);

    if (!targetContainer) {
      return this;
    }

    this.layout = mergeLayout(this.layout, targetContainer.layout, i => {
      if (i.parent === groupId) {
        i.parent = i._parent;
        delete i._parent;
      }
      return i;
    });
    delete this.groups[groupId];

    return this;
  }

  set(params: Partial<{ [ key in keyof LayoutState]: any }>) {
    return Object.assign(this, params);
  }

  focus(
    focusItem: LayoutItem | undefined,
    activeGroup: Group | undefined,
  ) {
    if (!focusItem || !focusItem.static) {
      this.focusItem = focusItem;
    }
    this.activeGroup = activeGroup;
    return this;
  }

  startDrag(
    dragItem: LayoutItem | undefined,
    focusItem: LayoutItem | undefined,
    activeGroup: Group | undefined,
  ) {
    this.oldDragItem = dragItem;
    this.oldActiveGroup = this.activeGroup;
    return this.focus(focusItem, activeGroup);
  }

  drag(draggingItem = this.placeholder) {
    this.activeDrag = draggingItem;
    this.dragging = true;
    return this;
  }

  endDrag() {
    this.oldDragItem = undefined;
    this.activeDrag = undefined;
    this.dragging = false;
    return this;
  }
}
