import React, { ReactElement } from 'react';
import {
  bottom,
  getBoundingRectFromLayout,
  getLayoutItem,
  mergeLayout,
  moveElement,
} from '../utils/layout';

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
  isDraggable?: boolean;
  isResizable?: boolean;
  placeholder?: boolean;
  parent?: string | symbol;
  _parent?: string | symbol;
}

export type Layout = LayoutItem[];


export interface GridRect {
  x: number;
  y: number;
  right: number;
  bottom: number;
}

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

export default class LayoutState {
  private levelMap: LevelMap = [];

  private _synchronized = false;

  public bottom: number = 0;

  public focusItem?: LayoutItem;
  public placeholder?: LayoutItem;
  public oldDragItem?: LayoutItem;
  public activeDrag?: LayoutItem;
  public activeGroup?: Group;
  public oldActiveGroup?: Group;
  public dragging = false;

  constructor(public layout: LayoutItem[], public groups: Groups, public cols: number) {}

  update(layout: LayoutItem[], groups: Groups, cols: number) {
    this.layout = layout;
    this.groups = groups;
    this.cols = cols;
    return this;
  }

  synchronizeLayoutWithChildren(children: JSX.Element[] | JSX.Element) {
    const { layout, groups, focusItem } = this;
    let focusItemVisited = false;
    const parentMap = {};
    const levelMap = {};

    for (const key in groups) {
      if (groups.hasOwnProperty(key)) {
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
        (child.props['data-grid'] || { w: 1, h: 1, x: 0, y: bottom(layout), i: String(child.key) });

      if (definition.parent && !parentMap.hasOwnProperty(definition.parent)) {
        delete definition.parent;
      }

      const z = Number(definition.z || defaultLevel);
      if (!levelMap[z]) {
        levelMap[z] = { items: [], groups: [], };
      }
      levelMap[z].items.push({ definition, child });

      if (parentMap.hasOwnProperty(definition.i)) {
        const parentId = parentMap[definition.i];
        definition.parent = parentId
        groups[parentId].layout.push(definition);
        if (z !== defaultLevel) {
          groups[parentId].level.push(z);
        }
      }

      const item = layout[index];
      if (focusItem && item && item.i === focusItem.i) {
        focusItemVisited = true;
      }
    });

    for (const key in groups) {
      const group: Group = groups[key];
      const level = group.level.length ? Math.min(...group.level) : defaultLevel;
      if (!levelMap[level]) {
        levelMap[level] = { items: [], groups: [], };
      }
      levelMap[level].groups.push(groups[key]);
      levelMap[level].items
    }

    this.focusItem = focusItemVisited ? focusItem : undefined;
    this.bottom = bottom(layout);
    this.levelMap = levelMap;

    this._synchronized = true;
    return this;
  }

  getChildren(): LayoutChildren[] {
    const { levelMap, _synchronized} = this;
    if (!_synchronized) {
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

    if (moveWithParent && l.parent && focusItem) {
      // const elementToMove
      const container = this.getGroup(l.parent);
      if (!container) {
        this.placeholder = undefined;
        return this;
      }
      const moved = container.layout;
      moved.forEach(item => {
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

      this.layout = mergeLayout(this.layout, moved);
      const rect = getBoundingRectFromLayout(this.layout.filter(i => i.parent && i.parent === focusItem.i));
      this.focusItem = {
        ...focusItem,
        x: rect.x,
        y: rect.y,
        w: rect.right - rect.x,
        h: rect.bottom - rect.y,
        i: focusItem.i,
      };
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

  merge(newLayout: LayoutItem[]) {
    this.layout = mergeLayout(this.layout, newLayout);
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
    this.focusItem = focusItem;
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

  //
  endDrag() {
    this.oldDragItem = undefined;
    this.activeDrag = undefined;
    this.dragging = false;
    return this;
  }
}
