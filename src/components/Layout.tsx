import React, { ReactChild, MouseEvent as ReactMouseEvent, isValidElement } from 'react';
import LayoutState, { Groups, Group, LayoutItem, GridRect, defaultLevel, Layout } from '../model/LayoutState';
import { classNames, isEqual } from '../utils';

import {
  getRectFromPoints,
  noop,
  Position,
} from '../utils';

import {
  calcColWidth,
  calcPosition,
  cloneLayoutItem,
  getBoundingRectFromLayout,
  getCols,
  hoistSelectionByParent,
  layoutEqual,
  mergeLayout,
  pickByRect,
  stretchLayout,
} from '../utils/layout';

import GridItem, { GridDragEvent, GridResizeEvent, GridDragCallbacks, Axis, GridDragCallback } from './GridItem';
import { DraggableData } from 'react-draggable';
import Selection, { MousePosition } from './Selection';
import Resizer, { ResizeCallbacks, ResizeProps, SelectCallbacks, GridResizeCallback } from './Resizer';
import { persist } from '../utils/events';
import { DraggerEvent } from './Dragger/index';


export const temporaryGroupId = Symbol('template');

const TOP = 999;
export interface Group {
  id: string | symbol
  rect?: GridRect;
  layout: Layout;
}

export interface IGridLayoutState {
  layoutState: LayoutState;

  mounted: boolean;

  oldResizeItem?: LayoutItem | null;
  selecting?: boolean;
  selectedLayout?: Layout;
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
  e?: DraggerEvent,
  node?: DraggableData['node'],
) => void;

export type GridResizeEventCallback = (
  layout: Layout,
  item?: LayoutItem | null,
  lastItem?: LayoutItem | null,
  placeholder?: LayoutItem | null,
  e?: DraggerEvent,
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
    this.state = {
      mounted: false,
      layoutState: new LayoutState(layout, group, getCols({ width, grid }))
        .synchronizeLayoutWithChildren(children),
      colWidth: calcColWidth(width, grid, containerPadding),
    };
  }

  componentDidMount() {
    this.setState({ mounted: true });
  }

  componentWillReceiveProps(nextProps: IGridLayoutProps) {
    if (
      !layoutEqual(nextProps.layout, this.props.layout) ||
      !isEqual(nextProps.activeDrag, this.props.activeDrag) ||
      !isEqual(nextProps.group, this.props.group)
    ) {
      const { layout, children, group, width, grid, containerPadding } = nextProps;
      this.setState({
        layoutState: this.state.layoutState
          .update(layout, group, getCols({ width, grid }))
          .synchronizeLayoutWithChildren(children),
        colWidth: calcColWidth(width, grid, containerPadding),
      });
    }
  }

  onDragStart = (i: string, x: number, y: number, ev: GridDragEvent) => {
    const { layoutState } = this.state;
    const l = layoutState.getLayoutItem(i);
    const {
      activeGroup: stateActiveGroup,
      focusItem: stateFocusItem,
    } = layoutState

    if (!l) {
      return;
    }

    // 在当前节点有容器的情况下。
    // 以下几种情况开启群组移动
    let focusItem: LayoutItem | undefined = l;
    let activeGroup: Group | undefined;
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
      layoutState: layoutState
        .startDrag(dragItem, focusItem, activeGroup),
    }, () => {
      persist(ev.e);
      this.props.onLayoutSelect(focusItem ? [ focusItem ] : [], activeGroup);
      this.props.onDragStart(layoutState.getLayout(), l, l, null, ev.e, ev.node);
    });
  }

  onDrag = (i: string, x: number, y: number, { e, node, dx, dy }: GridDragEvent) => {
    const { layoutState } = this.state;
    const {
      oldDragItem,
      focusItem: stateFocusItem,
      activeGroup,
    } = this.state.layoutState;
    const l = layoutState.getLayoutItem(i);

    if (!l || !stateFocusItem) {
      return;
    }

    const movedLayoutState = layoutState
      .moveElement(i,
        { x, y, dx, dy },
        Boolean(activeGroup && stateFocusItem && activeGroup.id == stateFocusItem.i),
      )
      .drag();
    const { layout, placeholder } = movedLayoutState;

    if (oldDragItem) {
      persist(e);
      this.props.onDrag(layout, oldDragItem, l, placeholder, e, node);
    }

    this.setState({ layoutState: movedLayoutState });
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
    const { layoutState } = this.state;
    const {
      oldDragItem,
      dragging,
      oldActiveGroup,
      activeGroup,
      focusItem,
    } = layoutState;

    const l = layoutState.getLayoutItem(i);

    if (!l || !focusItem) {
      return;
    }

    const movedState = dragging ? layoutState.moveElement(i, { x, y, dx, dy }, true) : layoutState;

    if (!dragging && activeGroup && (
      oldActiveGroup === activeGroup &&
      activeGroup.id === l.parent
    )) {
      this.selectItem(l);
    }

    this.props.onDragStop(movedState.layout, oldDragItem, l, null, e, node);
    // Set state
    this.setState({
      layoutState: movedState.endDrag(),
    });

    this.onLayoutMaybeChanged(layoutState.layout);
  }

  onDragContainerStart = (i: string | symbol, { e, node }: GridDragEvent) => {
    const { layoutState } = this.state;
    const activeGroup = layoutState.getGroup(i);
    if (!activeGroup) {
      return {};
    }

    const rect = getBoundingRectFromLayout(
      layoutState.layout.filter(i => i.parent && i.parent === activeGroup.id)
    );

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
    const { layoutState } = this.state;
    const l = layoutState.getLayoutItem(i);
    if (!l) {
      return;
    }

    this.setState({ oldResizeItem: cloneLayoutItem(l)});

    this.props.onResizeStart(layoutState.layout, l, l, null, e, node);
  }

  onResize = (i: string | symbol, { w, h, x, y }: ResizeProps, { e, node }: GridResizeEvent, axis: Axis) => {
    const { layoutState } = this.state;
    if (!layoutState.focusItem) {
      return;
    }

    layoutState.focusItem = {
      ...layoutState.focusItem,
      w, h, x, y,
    };

    // Create placeholder element (display only)
    const placeholder = {
      w: layoutState.focusItem.w,
      h: layoutState.focusItem.h,
      x: layoutState.focusItem.x,
      y: layoutState.focusItem.y,
      static: true,
      i,
      z: TOP,
    };

    // Re-compact the layout and set the drag placeholder.
    this.setState({
      layoutState: layoutState
        .merge([ layoutState.focusItem ])
        .set({ activeDrag: placeholder }),
    });

    this.props.onResize(layoutState.layout, layoutState.focusItem, layoutState.focusItem, null, e, node);
  }

  onResizeStop = (i: string | symbol, { x, y, w, h }: ResizeProps, { e, node }: GridResizeEvent) => {
    const { layoutState, oldResizeItem } = this.state;
    const l = layoutState.getLayoutItem(i);

    this.props.onResizeStop(layoutState.layout, oldResizeItem, l, null, e, node);


    // Set state
    this.setState({
      layoutState: layoutState.set({ activeDrag: null }),
    })
    this.props.onLayoutChange(layoutState.layout);
  }

  onContextMenu = (currentItem: LayoutItem, e: ReactMouseEvent) => {
    const { layoutState } = this.state;
    const { focusItem } = layoutState;
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
      layoutState: this.state.layoutState.set({ focusItem: l }),
    });

  }

  onLayoutMaybeChanged(newLayout: Layout, oldLayout?: Layout | null) {
    if (!oldLayout) {
      oldLayout = this.state.layoutState.layout;
    }

    if (!isEqual(oldLayout, newLayout)) {
      this.props.onLayoutChange(newLayout);
    }
  }

  startSelection = (reselectItem?: LayoutItem) => {
    this.setState(({ layoutState }) => ({
      selecting: true,
      selectedLayout: [],
      layoutState: layoutState
        .deleteGroup(temporaryGroupId)
        .startDrag(reselectItem, reselectItem, undefined),
    }), () => {
      this.props.onLayoutChange(this.state.layoutState.layout);
    });
  }

  selectLayoutItemByRect = (start?: MousePosition, end?: MousePosition) => {
    const { selecting, colWidth, layoutState } = this.state;
    if (!selecting || !start || !end) {
      return this.setState({ selectedLayout: [] });
    }

    const selectedLayout = pickByRect(
      layoutState.layout,
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

  selectGroup = (group: Group, groupRect: GridRect) => {
    if (!group) {
      return;
    }

    const rect = groupRect || group.rect || getBoundingRectFromLayout(group.layout);
    this.setState({
      layoutState: this.state.layoutState.focus({
          x: rect.x,
          y: rect.y,
          w: rect.right - rect.x,
          h: rect.bottom - rect.y,
          i: group.id,
        },
        group,
      )
    });
  }

  addTemporaryGroup = (selectedLayout: Layout) => {
    if (!selectedLayout || selectedLayout.length <= 1) {
      return;
    }
    const { layoutState } = this.state;

    const hoistedLayout = hoistSelectionByParent(selectedLayout, layoutState.groups);
    const rect = getBoundingRectFromLayout(hoistedLayout);
    const temporaryGroup = {
      id: temporaryGroupId,
      rect, layout:
      hoistedLayout,
      level: hoistedLayout.map(i => i.z).filter(z => z && !isNaN(z) && z !== defaultLevel) as number[],
    };

    this.setState({
      layoutState: layoutState.addGroup(
        temporaryGroupId,
        temporaryGroup,
      ).focus({
        x: rect.x,
        y: rect.y,
        w: rect.right - rect.x,
        h: rect.bottom - rect.y,
        i: temporaryGroupId,
      }, temporaryGroup),
    }, () => {
      const { layoutState } = this.state;
      this.props.onLayoutChange(
        mergeLayout(layoutState.layout, hoistedLayout, i => {
          return {
            ...i,
            _parent: i.parent,
            parent: temporaryGroupId,
          }
        })
      );
      this.props.onLayoutSelect(hoistedLayout, layoutState.getGroup[temporaryGroupId]);
    })
  }

  processGridItem = (child: ReactChild) => {
    if (!child || !React.isValidElement(child)) {
      return;
    }

    const key = child.key;
    if (!key) {
      return child;
    }

    const l = this.state.layoutState.getLayoutItem(String(key));
    if (!l) {
      return child;
    }
    const { props, state } = this;

    const {
      isDraggable, isResizable,
    } = props;

    const { selectedLayout, layoutState } = state;
    const { focusItem } = layoutState;

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
    const activeDrag = this.props.activeDrag || this.state.layoutState.activeDrag;
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
      const { layoutState } = this.state;
      const { focusItem } = layoutState;
      if (!focusItem) {
        return;
      }
      const group: Group = layoutState.getGroup(focusItem.i);

      if (!group) {
        return;
      }

      if (handlerName === 'onResizeStart') {
        this.props.onResizeStart(layoutState.layout, focusItem, null, null, e, node);
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

        const newState = layoutState.merge(strechedLayout).set({ focusItem: updatedFocusItem });

        if (handlerName === 'onResizeStop') {
          newState.endDrag();

          this.onLayoutMaybeChanged(layout, newState.layout);
        }

        this.setState({
          layoutState: newState
        }, () =>
          this.props[handlerName](newState.layout, focusItem, focusItem, null, e, node)
        );
      }

    };
  }

  renderGroupItem = (group: Group, rect: GridRect) => {
    const { activeGroup, focusItem } = this.state.layoutState;

    const selected = Boolean(activeGroup && activeGroup.id === group.id); // 是否激活
    const active = Boolean(focusItem && selected && focusItem.i === group.id);
    const className = classNames('react-grid-layout-group react-selection-placeholder', {
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

  children() {
    const { layoutState, selecting } = this.state;
    const children = layoutState.getChildren();

    const extraChildren: ReactChild[] = [];
    const childKeyMap: { [key: string]: ReactChild } = {};

    React.Children.forEach(this.props.children, child => {
      if (!isValidElement(child) || !child.key) {
        extraChildren.push(child);
        return;
      }

      childKeyMap[child.key] = child;
    });

    const temporary = (!selecting && layoutState.getGroup(temporaryGroupId)) ?
      this.renderGroupItem(
        layoutState.getGroup(temporaryGroupId),
          getBoundingRectFromLayout(layoutState.getGroup(temporaryGroupId).layout)
      ) : null;

    return <>
      {temporary}
      {children.map(child => {
        if (child.type === 'group') {
          if (!child.layout || !child.layout.length) {
            return null;
          }
          const rect = getBoundingRectFromLayout(child.layout);
          return this.renderGroupItem(child, rect);
        }
        const key = child.child.key;
        return this.processGridItem(key && childKeyMap.hasOwnProperty(key) ? childKeyMap[key] : child.child);
      })}
    </>;
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
    const { colWidth, mounted } = this.state;
    const { focusItem, activeGroup } = this.state.layoutState;
    if (!focusItem || !mounted) {
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
      offsetParent={this.getOffsetParent}
      calcPosition={this.getPositionCalculator()}
      calcWH={this.getWHCalculator()}
      colWidth={colWidth}
      rowHeight={colWidth}
    />;
  }

  render() {
    const { extraRender, width, wrapperStyle = {}, style } = this.props;
    const { layoutState, colWidth } = this.state;
    const { bottom } = layoutState;

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
        {this.children()}
        {this.placeholder()}
        {this.resizer()}
        {extraRender ? extraRender() : null}
      </div>
    </Selection>
  }
}
