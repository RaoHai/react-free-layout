import React, { ReactChild, MouseEvent as ReactMouseEvent } from 'react';
import isEqual from 'lodash.isequal';
import classnames from 'classnames';
import {
  synchronizeLayoutWithChildren,
  getLayoutItem,
  cloneLayoutItem,
  moveElement,
  bottom,
  pickByRect,
  getRectFromPoints,
  getBoundingRectFromLayout,
  noop,
  GridRect,
  stretchLayout,
  mergeTemporaryGroup,
  hoistSelectionByParent,
  calcPosition,
  Position,
  mergeLayout,
  getCols,
  calcColWidth,
} from '../utils';

import GridItem, { GridDragEvent, GridResizeEvent, GridDragCallbacks, Axis, GridDragCallback } from './GridItem';
import { DraggableData } from 'react-draggable';
import Selection, { MousePosition } from './Selection';
import Resizer, { ResizeCallbacks, ResizeProps, SelectCallbacks, GridResizeCallback } from './Resizer';
import { persist } from '../utils/events';

export const temporaryGroupId = Symbol('template');
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
  parent?: string | symbol;
  _parent?: string | symbol;
}

const TOP = 999;
export type Layout = LayoutItem[];
export interface Group {
  id: string | symbol
  rect?: GridRect;
  layout: Layout;
}

export type Groups = {
  [key in symbol]: Group;
};
export interface IGridLayoutState {
  layout: Layout;
  group: Groups;
  mounted: boolean;
  focusItem?: LayoutItem | null;
  oldDragItem?: LayoutItem | null;
  oldLayout?: Layout | null;
  oldResizeItem?: LayoutItem | null;
  activeDrag?: LayoutItem | null;

  selecting?: boolean;
  selectedLayout?: Layout;

  dragging?: boolean;

  activeGroup?: Group | null;
  oldActiveGroup?: Group | null;
  maxZ: number;
  bottom: number;
  colWidth: number;
}

const defaultProps = {
  maxRows: Infinity,
  group: {},
  margin: [ 0, 0 ] as [ number, number ],
  containerPadding: [0, 0 ] as [ number, number ],
  onDragStart: noop,
  onDrag: noop,
  onDragStop: noop,
  onResizeStart: noop,
  onResize: noop,
  onResizeStop: noop,
  onLayoutSelect: noop,
  isDraggable: true,
  isResizable: true,
  onLayoutChange: () => {},
  onContextMenu: noop,
}


export type GridDragEventCallback = (
  layout: Layout,
  item?: LayoutItem | null,
  lastItem?: LayoutItem | null,
  placeholder?: LayoutItem | null,
  e?: MouseEvent | React.SyntheticEvent<MouseEvent> ,
  node?: DraggableData['node'],
) => void;

export type GridResizeEventCallback = (
  layout: Layout,
  item?: LayoutItem | null,
  lastItem?: LayoutItem | null,
  placeholder?: LayoutItem | null,
  e?: MouseEvent | React.SyntheticEvent<MouseEvent> ,
  node?: DraggableData['node'],
) => void;

export type SelectEventCallback = (
  selectedLayout: Layout,
  activeGroup?: Group | null,
) => void;

// type DefaultProps = Readonly<typeof defaultProps>;
export type IGridLayoutProps = {
  layout: Layout;
  group: Groups;
  className?: string;
  width: number;
  maxRows: number;
  style?: {};
  wrapperStyle?: {};
  autoSize?: boolean;
  activeDrag?: LayoutItem;
  containerPadding: [number, number];
  grid: [ number, number ];
  children: JSX.Element[] | JSX.Element;
  isDraggable?: boolean;
  isResizable?: boolean;
  extraRender?: () => JSX.Element;
  onLayoutChange: (layout: Layout) => void;
  onContextMenu?: (currentItem: LayoutItem, focusItem: LayoutItem | null | undefined, ev: ReactMouseEvent) => void;
} & GridDragCallbacks<GridDragEventCallback>
& ResizeCallbacks<GridResizeEventCallback>
& SelectCallbacks<SelectEventCallback>

export default class DeerGridLayout extends React.Component<IGridLayoutProps, IGridLayoutState> {
  public static defaultProps: Partial<IGridLayoutProps> = defaultProps;
  private offsetParent = React.createRef<HTMLDivElement>();

  constructor(props: IGridLayoutProps) {
    super(props);
    const { layout, children, grid, width, group, containerPadding } = props;
    const cols = getCols({ width, grid });
    this.state = {
      ...(synchronizeLayoutWithChildren(
        layout,
        children,
        cols,
        group,
      )),
      mounted: false,
      colWidth: calcColWidth(width, grid, containerPadding),
    }
  }

  componentDidMount() {
    this.setState({ mounted: true });
  }

  componentWillReceiveProps(nextProps: IGridLayoutProps) {
    if (
      !isEqual(nextProps.layout, this.props.layout) ||
      !isEqual(nextProps.activeDrag, this.props.activeDrag) ||
      !isEqual(nextProps.group, this.props.group)
    ) {
      const { layout, children, group, width, grid, containerPadding } = nextProps;
      this.setState({
        ...synchronizeLayoutWithChildren(
          layout,
          children,
          getCols(nextProps),
          mergeTemporaryGroup(group, this.state.group),
          this.state.focusItem,
        ),
        colWidth: calcColWidth(width, grid, containerPadding),
      });
    }
  }

  onDragStart = (i: string, x: number, y: number, ev: GridDragEvent) => {
    const { layout, activeGroup: stateActiveGroup, focusItem: stateFocusItem } = this.state;
    const l = getLayoutItem(layout, i);
    if (!l) {
      return;
    }

    // 在当前节点有容器的情况下。
    // 以下几种情况开启群组移动
    let focusItem: LayoutItem | null = l;
    let activeGroup: Group | null = null;
    if (l.parent && (
      !stateActiveGroup                                                 // 1. 没有激活的容器时
      || stateActiveGroup.id !== l.parent                               // 2. 当前激活容器与当前节点的容器不一致时
      || (stateFocusItem && stateActiveGroup.id === stateFocusItem.i)   // 3. 当前激活的容器与当前操作的节点是同一个时
    )) {
      const dragStart = this.onDragContainerStart(l.parent, ev);
      focusItem = dragStart.focusItem;
      activeGroup = dragStart.activeGroup;
    } else if (stateActiveGroup && stateActiveGroup.id === l.parent) {
      activeGroup = stateActiveGroup;
    }

    const dragItem = cloneLayoutItem(l);
    this.setState({
      focusItem,
      activeGroup,
      oldActiveGroup: stateActiveGroup,
      oldDragItem: dragItem,
      oldLayout: this.state.layout,
    }, () => {
      persist(ev.e);
      this.props.onLayoutSelect(focusItem ? [ focusItem ] : [], activeGroup);
      this.props.onDragStart(layout, l, l, null, ev.e, ev.node);
    });
  }

  moveElement = (
    layout: LayoutItem[],
    i: symbol | string,
    { x, y, dx, dy }: { [key: string]: number },
    moveWithParent = true,
    stateFocusItem: LayoutItem,
  ) => {
    let focusItem = stateFocusItem;
    const l = getLayoutItem(layout, String(i));
    if (!l) {
      return { layout, focusItem, placeholder: null } ;
    }

    const cols = getCols(this.props);
    let placeholder;

    // 移动容器
    if (moveWithParent && l.parent) {
      // const elementToMove
      const { group } = this.state;
      const container: Group = group[l.parent];
      if (!container) {
        return { layout, focusItem, placeholder: null };
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
        return layout;
      });

      placeholder = {
        w: l.w,
        h: l.h,
        x: l.x,
        y: l.y,
        placeholder: true,
        i: l.parent,
        z: TOP
      };

      layout = mergeLayout(this.state.layout, moved);
      const rect = getBoundingRectFromLayout(layout.filter(i => i.parent && i.parent === focusItem.i));
      focusItem = {
        ...focusItem,
        x: rect.x,
        y: rect.y,
        w: rect.right - rect.x,
        h: rect.bottom - rect.y,
        i: focusItem.i,
      };
    } else {
      placeholder = {
        w: l.w,
        h: l.h,
        x: l.x,
        y: l.y,
        placeholder: true,
        i,
        z: TOP
      };

      moveElement(
        layout,
        l,
        x,
        y,
        true,
        cols
      );
    }

    return { layout, placeholder, focusItem };
  }

  onDrag = (i: string, x: number, y: number, { e, node, dx, dy }: GridDragEvent) => {
    const { oldDragItem, layout: stateLayout, activeGroup, focusItem: stateFocusItem } = this.state;
    const l = getLayoutItem(stateLayout, i);
    if (!l || !stateFocusItem) {
      return;
    }

    const { placeholder, layout, focusItem } = this.moveElement(
      stateLayout,
      i,
      { x, y, dx, dy },
      Boolean(activeGroup && stateFocusItem && activeGroup.id == stateFocusItem.i),
      stateFocusItem,
    );

    if (oldDragItem) {
      persist(e);
      this.props.onDrag(layout, oldDragItem, l, placeholder, e, node);
    }

    this.setState({
      layout,
      focusItem,
      activeDrag: placeholder,
      dragging: true,
    });
  }

  /**
   * When dragging stops, figure out which position the element is closest to and update its x and y.
   * @param  {String} i Index of the child.
   * @param {Number} x X position of the move
   * @param {Number} y Y position of the move
   * @param {Event} e The mousedown event
   * @param {Element} node The current dragging DOM element
   */
  onDragStop = (i: string, x: number, y: number, { e, node, dx, dy }: GridDragEvent) => {
    const { oldDragItem, layout: stateLayout, dragging, oldActiveGroup, activeGroup, focusItem: stateFocusItem } = this.state;
    const l = getLayoutItem(stateLayout, i);
    if (!l || !stateFocusItem) {
      return;
    }

    let layout = stateLayout;
    if (dragging) {
      const moved = this.moveElement(stateLayout, i, { x, y, dx, dy }, true, stateFocusItem);
      layout = moved.layout;
    }

    if (!dragging && activeGroup && (
      oldActiveGroup === activeGroup &&
      activeGroup.id === l.parent
    )) {
      this.selectItem(l);
    }

    this.props.onDragStop(layout, oldDragItem, l, null, e, node);
    // Set state
    const { oldLayout } = this.state;
    this.setState({
      activeDrag: null,
      layout,
      oldDragItem: undefined,
      oldLayout: undefined,
      bottom: bottom(layout),
      dragging: false,
    });

    this.onLayoutMaybeChanged(layout, oldLayout);
  }

  onDragContainerStart = (i: string | symbol, { e, node }: GridDragEvent) => {
    const { group, layout } = this.state;
    const activeGroup = group[i] as Group;
    if (!activeGroup) {
      return {
        focusItem: null,
        activeGroup: null,
      };
    }

    const rect = getBoundingRectFromLayout(layout.filter(i => i.parent && i.parent === activeGroup.id));
    const focusItem = {
      x: rect.x,
      y: rect.y,
      w: rect.right - rect.x,
      h: rect.bottom - rect.y,
      i: activeGroup.id
    };
    persist(e);

    return {
      activeGroup,
      focusItem,
    };
  }

  onResizeStart = (i: string | symbol, { x, y, w, h }: ResizeProps, { e, node }: GridResizeEvent) => {
    const { layout } = this.state;
    const l = getLayoutItem(layout, i);
    if (!l) {
      return;
    }


    this.setState({
      oldResizeItem: cloneLayoutItem(l),
      oldLayout: this.state.layout
    });

    this.props.onResizeStart(layout, l, l, null, e, node);
  }

  onResize = (i: string | symbol, { w, h, x, y }: ResizeProps, { e, node }: GridResizeEvent, axis: Axis) => {
    const { layout, oldResizeItem } = this.state;
    const l = getLayoutItem(layout, i);
    if (!l) {
      return;
    }

    l.w = w;
    l.h = h;
    l.x = x;
    l.y = y;

    // Create placeholder element (display only)
    const placeholder = {
      w: l.w,
      h: l.h,
      x: l.x,
      y: l.y,
      static: true,
      i,
      z: TOP,
    };

    this.props.onResize(layout, oldResizeItem, l, placeholder, e, node);

    // Re-compact the layout and set the drag placeholder.
    this.setState({
      layout,
      activeDrag: placeholder
    });
  }

  onResizeStop = (i: string | symbol, { x, y, w, h }: ResizeProps, { e, node }: GridResizeEvent) => {
    const { layout, oldResizeItem, oldLayout } = this.state;
    const l = getLayoutItem(layout, i);

    this.props.onResizeStop(layout, oldResizeItem, l, null, e, node);

    // Set state
    this.setState({
      activeDrag: null,
      layout,
      oldResizeItem: null,
      oldLayout: null,
      bottom: bottom(layout),
    });

    this.onLayoutMaybeChanged(layout, oldLayout);
  }

  onContextMenu = (currentItem: LayoutItem, e: ReactMouseEvent) => {
    const { focusItem } = this.state;
    if (!this.props.onContextMenu) {
      return;
    }

    persist(e);
    return this.props.onContextMenu(
      currentItem,
      focusItem,
      e,
    )
  }

  // 点击，仅处理多选时再点击的行为
  selectItem = (l: LayoutItem) => {
    if (!l || !l.parent) {
      return;
    }

    // 两种行为
    // * 1. 临时选择时，点击临时选择中的元素
    // * 则取消临时框选。
    if (l.parent === temporaryGroupId) {
      delete l.parent;
      return this.startSelection(l);
    }

    // * 2. 在选择了容器的情况下，再次点击属于容器中的元素
    // * 则在保持容器选中的情况下，激活容器中的元素
    // * 此时容器中的元素可以自由活动，而不影响父容器
    return this.setState({
      focusItem: l,
    });

  }

  onLayoutMaybeChanged(newLayout: Layout, oldLayout?: Layout | null) {
    if (!oldLayout) {
      oldLayout = this.state.layout;
    }

    if (!isEqual(oldLayout, newLayout)) {
      this.props.onLayoutChange(newLayout);
    }
  }

  startSelection = (reselectItem?: LayoutItem) => {
    this.deleteGroup(temporaryGroupId);
    this.setState(({ group }) => ({
      selecting: true,
      activeGroup: undefined,
      selectedLayout: [],
      oldDragItem: reselectItem,
      focusItem: reselectItem,
      oldLayout: reselectItem ? this.state.layout : null,
      group: (delete group[temporaryGroupId] && group)
    }));
  }

  selectLayoutItemByRect = (start?: MousePosition, end?: MousePosition) => {
    const { selecting, layout, colWidth } = this.state;
    if (!selecting || !start || !end) {
      return this.setState({ selectedLayout: [] });
    }

    const selectedLayout = pickByRect(
      layout,
      getRectFromPoints(start, end, colWidth),
    );

    this.setState({ selectedLayout });
    return selectedLayout;
  }

  endSelection = (start?: MousePosition, end?: MousePosition) => {
    this.setState({ selecting: false });
    const { selectedLayout } = this.state;
    if (start && end && selectedLayout) {
      this.addTemporaryGroup(selectedLayout);
    }
  }

  deleteGroup = (groupId: symbol | string) => {
    const targetContainer = this.state.group[groupId];
    if (!targetContainer) {
      return;
    }

    const { layout } = targetContainer;

    const removedLayout = mergeLayout(this.state.layout, layout, i => {
      if (i.parent === groupId) {
        i.parent = i._parent;
        delete i._parent;
      }
      return i;
    });

    this.setState({ layout: removedLayout });
    this.props.onLayoutChange(removedLayout);
  }

  selectGroup = (group: Group, groupRect: GridRect) => {
    if (!group) {
      return;
    }

    const rect = groupRect || group.rect || getBoundingRectFromLayout(group.layout);
    this.setState({
      activeGroup: group,
      focusItem: {
        x: rect.x,
        y: rect.y,
        w: rect.right - rect.x,
        h: rect.bottom - rect.y,
        i: group.id,
      },
    });
  }

  addTemporaryGroup = (selectedLayout: Layout) => {
    if (!selectedLayout || selectedLayout.length <= 1) {
      return;
    }

    const group = { ...this.state.group };
    const hoistedLayout = hoistSelectionByParent(selectedLayout, group);
    const rect = getBoundingRectFromLayout(hoistedLayout);
    group[temporaryGroupId] = { id: temporaryGroupId, rect, layout: hoistedLayout };
    this.setState({
      selectedLayout: hoistedLayout,
      group,
      activeGroup: group[temporaryGroupId],
      focusItem: {
        x: rect.x,
        y: rect.y,
        w: rect.right - rect.x,
        h: rect.bottom - rect.y,
        i: temporaryGroupId,
      },
    }, () => {
      this.props.onLayoutChange(
        mergeLayout(this.state.layout, hoistedLayout, i => {
          return {
            ...i,
            _parent: i.parent,
            parent: temporaryGroupId,
          }
        })
      );
      this.props.onLayoutSelect(hoistedLayout, group[temporaryGroupId]);
    });
  }

  processGridItem = (child: ReactChild) => {
    if (!child || !React.isValidElement(child)) {
      return;
    }

    const key = child.key;
    if (!key) {
      return child;
    }

    const l = getLayoutItem(this.state.layout, String(key));
    if (!l) {
      return child;
    }
    const { props, state } = this;

    const {
      isDraggable, isResizable,
    } = props;

    const { selectedLayout, focusItem } = state;
    const draggable = Boolean(
      !l.static && isDraggable && (l.isDraggable || l.isDraggable == null)
    );
    const resizable = Boolean(
      !l.static && isResizable && (l.isResizable || l.isResizable == null)
    );

    const active = Boolean(focusItem && focusItem.i === String(key));
    const selected = Boolean(selectedLayout && selectedLayout.find(item => item.i === String(key)));

    return this.createGridItem(l, {
      onDragStop: this.onDragStop,
      onDragStart: this.onDragStart,
      onDrag: this.onDrag,
    }, child, {
      isDraggable: draggable,
      isResizable: resizable,
      active,
      selected,
    });
  }

  placeholder() {
    const activeDrag = this.props.activeDrag || this.state.activeDrag;
    if (!activeDrag) {
      return null;
    }

    return this.createGridItem(
      activeDrag,
      {
        onDrag: noop,
        onDragStart: noop,
        onDragStop: noop,
      },
      <div />,
      {
        className: 'react-grid-placeholder',
      });

  }

  createGridItem = (
    activeDrag: LayoutItem,
    events: GridDragCallbacks<GridDragCallback>,
    children: ReactChild,
    extProps?: Partial<GridItem['props']>,
  ) => {
    const { width, containerPadding, maxRows } = this.props;
    const cols = getCols(this.props);
    const { colWidth } = this.state;

    return <GridItem
      {...extProps}
      key={String(activeDrag.i)}
      i={activeDrag.i}
      w={activeDrag.w}
      h={activeDrag.h}
      x={activeDrag.x}
      y={activeDrag.y}
      z={activeDrag.z}
      containerWidth={width}
      cols={cols}
      margin={[0, 0]}
      containerPadding={containerPadding}
      maxRows={maxRows}
      colWidth={colWidth}
      rowHeight={colWidth}
      offsetParent={this.getOffsetParent}
      onContextMenu={(e: React.MouseEvent) => this.onContextMenu(activeDrag, e)}
      {...events}
    >
      {children}
    </GridItem>;
  }

  onContainerHandler(handlerName: keyof ResizeCallbacks<GridResizeCallback>): GridResizeCallback {
    return (i, { x, y, w, h }, { e, node }: GridResizeEvent) => {
      const { focusItem, group: stateGroup } = this.state;
      if (!focusItem) {
        return;
      }
      const group: Group = stateGroup[focusItem.i];

      if (!group) {
        return;
      }

      if (handlerName === 'onResizeStart') {
        return this.setState({
          oldLayout: this.state.layout
        }, () => {
          this.props.onResizeStart(this.state.layout, focusItem, null, null, e, node);
        });
      }

      if (handlerName === 'onResize' || handlerName === 'onResizeStop') {
        const { layout } = group;

        const strechedLayout = stretchLayout(layout, { x, y, right: x + w, bottom: y + h });
        const rect = getBoundingRectFromLayout(strechedLayout.filter(i => i.parent && i.parent === focusItem.i));
        const updatedFocusItem = {
          ...focusItem,
          x: rect.x,
          y: rect.y,
          w: rect.right - rect.x,
          h: rect.bottom - rect.y,
          i: focusItem.i,
        };
        const newState = {
          layout: mergeLayout(this.state.layout, strechedLayout),
          focusItem: updatedFocusItem,
        };

        if (handlerName === 'onResizeStop') {
          Object.assign(newState,{
            activeDrag: null,
            oldResizeItem: null,
            oldLayout: null,
            bottom: bottom(layout),
          });

          this.onLayoutMaybeChanged(layout, this.state.oldLayout);
        }

        this.setState(newState, () =>
          this.props[handlerName](newState.layout, focusItem, focusItem, null, e, node)
        );
      }

    };
  }

  renderGroupItem = (group: Group, rect: GridRect) => {
    const { activeGroup, focusItem } = this.state;

    const selected = Boolean(activeGroup && activeGroup.id === group.id); // 是否激活
    const active = Boolean(focusItem && selected && focusItem.i === group.id);
    const className = classnames('react-grid-layout-group react-selection-placeholder', {
      'temporary-group': group.id === temporaryGroupId,
    });

    return this.createGridItem(
      {
        i: group.id,
        x: rect.x,
        y: rect.y,
        w: rect.right - rect.x,
        h: rect.bottom - rect.y,
      },
      {
        onDrag: noop,
        onDragStart: () => this.selectGroup(group, rect),
        onDragStop: noop,
      },
      <div />,
      {
        selected,
        active,
        className,
      });
  }

  group() {
    const { selecting, group } = this.state;
    const groups = [];

    if (!selecting && group[temporaryGroupId] && group[temporaryGroupId].layout.length) {
      groups.push(
        this.renderGroupItem(
          group[temporaryGroupId],
          getBoundingRectFromLayout(group[temporaryGroupId].layout)
        )
      );
    }

    for (const key in group) {
      if (group.hasOwnProperty(key)) {
        const currentGroup: Group = group[key];
        if (!currentGroup || !currentGroup.layout.length) {
          continue;
        }
        const rect = getBoundingRectFromLayout(currentGroup.layout);
        groups.push(this.renderGroupItem(currentGroup, rect))
      }
    }

    return groups;
  }

  getOffsetParent = () => {
    return this.offsetParent.current;
  }

  getWHCalculator = () => {
    const { maxRows } = this.props;
    const colWidth = this.state.colWidth;
    const cols = getCols(this.props);
    const rowHeight = colWidth;

    return function calcWH(
      { x, y, height, width }: Pick<Position, 'width' | 'height'> & { x: number, y: number },
    ): { w: number; h: number } {

      let w = Math.round(width / colWidth);
      let h = Math.round(height / rowHeight);

      // Capping
      w = Math.max(Math.min(w, cols - x), 0);
      h = Math.max(Math.min(h, maxRows - y), 0);
      return { w, h };
    }
  }

  getPositionCalculator = () => {
    return (x: number, y: number, w: number, h: number) => {
      return calcPosition(x, y, w, h, this.state.colWidth, [0, 0]);
    }
  }

  resizer = () => {
    const { focusItem, activeGroup, colWidth } = this.state;
    if (!focusItem) {
      return null;
    }

    const { i, x, y, w, h } = focusItem;

    const resizingGroup = activeGroup && activeGroup.id === focusItem.i;
    const resizeCallbacks = resizingGroup ? {
      onResize: this.onContainerHandler('onResize'),
      onResizeStart: this.onContainerHandler('onResizeStart'),
      onResizeStop: this.onContainerHandler('onResizeStop'),
    } : {
      onResize: this.onResize,
      onResizeStart: this.onResizeStart,
      onResizeStop: this.onResizeStop,
    };

    return <Resizer
      i={i}
      x={x}
      y={y}
      w={w}
      h={h}
      {...resizeCallbacks}
      className={resizingGroup ? 'group-resizer' : 'item-resizer'}
      offsetParent={this.offsetParent.current}
      calcPosition={this.getPositionCalculator()}
      calcWH={this.getWHCalculator()}
      colWidth={colWidth}
      rowHeight={colWidth}
    />;
  }


  render() {
    const { extraRender, width, wrapperStyle = {}, style } = this.props;
    const { bottom, mounted, colWidth } = this.state;

    return <Selection
      onSelectStart={this.startSelection}
      onSelect={this.selectLayoutItemByRect}
      onSelectEnd={this.endSelection}
      style={wrapperStyle}
      offsetParent={this.getOffsetParent}
    >
      <div
        style={{
          ...style,
          width,
          height: (bottom + 10) * colWidth,
          position: 'relative'
        }}
        ref={this.offsetParent}
      >
        {mounted ? <>
          {this.group()}
          {React.Children.map(this.props.children, this.processGridItem)}
          {this.placeholder()}
          {this.resizer()}
        </> : null}
        {extraRender ? extraRender() : null}
      </div>
    </Selection>
  }
}
