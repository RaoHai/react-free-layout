import React, { ReactChild } from 'react';
import isEqual from 'lodash.isequal';
import {
  synchronizeLayoutWithChildren,
  CompactType,
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
} from '../utils';

import GridItem, { GridDragEvent, GridResizeEvent, GridDragCallbacks, Axis, GridResizeCallback } from './GridItem';
import { DraggableData } from 'react-draggable';
import Selection, { MousePosition } from './Selection';
import { ResizeCallbacks, ResizeProps, SelectCallbacks } from './Resizable/index';


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

  activeGroup?: Group | null;
  maxZ: number;
  bottom: number;
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
) => void;

// type DefaultProps = Readonly<typeof defaultProps>;
export type IGridLayoutProps = {
  layout: Layout;
  group: Groups;
  className?: string;
  width: number;
  maxRows: number;
  style?: {};
  autoSize?: boolean;
  activeDrag?: LayoutItem;
  containerPadding: [number, number];
  grid: [ number, number ];
  compactType?: CompactType;
  children: JSX.Element[] | JSX.Element;
  isDraggable?: boolean;
  isResizable?: boolean;
  onLayoutChange: (layout: Layout) => void;
} & GridDragCallbacks<GridDragEventCallback>
& ResizeCallbacks<GridResizeEventCallback>
& SelectCallbacks<SelectEventCallback>
export default class DeerGridLayout extends React.Component<IGridLayoutProps, IGridLayoutState> {
  public static defaultProps: Partial<IGridLayoutProps> = defaultProps;
  private mounted = false;

  constructor(props: IGridLayoutProps) {
    super(props);
    const { layout, children, grid, width, compactType, group } = props;
    const cols = this.getCols({ width, grid });
    this.state = {
      ...(synchronizeLayoutWithChildren(
        layout,
        children,
        cols,
        compactType,
        group,
      )),
      mounted: false,
    }
  }

  getCols = ({ width, grid }: Pick<IGridLayoutProps, 'width' | 'grid'> = this.props) => {
    return Math.ceil(width / grid[0]);
  }

  componentDidMount() {
    this.mounted = true;
  }

  componentWillReceiveProps(nextProps: IGridLayoutProps) {
    // let newLayoutBase;
    if (
      !isEqual(nextProps.layout, this.props.layout) ||
      !isEqual(nextProps.activeDrag, this.props.activeDrag) ||
      nextProps.compactType !== this.props.compactType
    ) {
      const { layout, children, group } = nextProps;
      this.setState({
        ...synchronizeLayoutWithChildren(
          layout,
          children,
          this.getCols(nextProps),
          nextProps.compactType,
          mergeTemporaryGroup(group, this.state.group),
        ),
      });
    }
  }

  calcColWidth() {
    const { containerPadding, grid, width } = this.props;
    const cols = this.getCols({ width, grid });
    const calcColWidth = (width - containerPadding[0] * 2) / cols;
    return calcColWidth;
  }

  onDragStart = (i: string, x: number, y: number, { e, node }: GridDragEvent) => {
    const { layout } = this.state;
    const l = getLayoutItem(layout, i);

    if (!l) {
      return;
    }

    if (l.parent) {
      return this.onDragContainerStart(l.parent);
    }

    const dragItem = cloneLayoutItem(l);
    this.setState({
      focusItem: l,
      oldDragItem: dragItem,
      oldLayout: this.state.layout,
    });

    return this.props.onDragStart(layout, l, l, null, e, node);
  }

  moveElement = (layout: LayoutItem[], i: symbol | string, { x, y, dx, dy }: { [key: string]: number }) => {
    const l = getLayoutItem(layout, String(i));
    if (!l) {
      return { layout, placeholder: null } ;
    }

    const cols = this.getCols(this.props);
    let placeholder;

    // 移动容器
    if (l.parent) {
      // const elementToMove
      const { group } = this.state;
      const container: Group = group[l.parent];
      if (!container) {
        return { layout, placeholder: null };
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

      layout = this.mergeLayout(moved);
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

    return { layout, placeholder };
  }

  onDrag = (i: string, x: number, y: number, { e, node, dx, dy }: GridDragEvent) => {
    const { oldDragItem, layout: stateLayout } = this.state;
    const l = getLayoutItem(stateLayout, i);
    if (!l) {
      return;
    }

    const { placeholder, layout } = this.moveElement(stateLayout, i, { x, y, dx, dy });

    if (oldDragItem) {
      this.props.onDrag(layout, oldDragItem, l, placeholder, e, node);
    }

    this.setState({ layout, activeDrag: placeholder });
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
    const { oldDragItem, layout: stateLayout } = this.state;
    const l = getLayoutItem(stateLayout, i);
    if (!l) {
      return;
    }

   const { layout } = this.moveElement(stateLayout, i, { x, y, dx, dy });

    this.props.onDragStop(layout, oldDragItem, l, null, e, node);

    // Set state
    const { oldLayout } = this.state;
    this.setState({
      activeDrag: null,
      layout,
      oldDragItem: undefined,
      oldLayout: undefined,
      bottom: bottom(layout),
    });

    this.onLayoutMaybeChanged(layout, oldLayout);
  }

  onDragContainerStart = (i: string | symbol) => {
    const { group, layout } = this.state;
    const activeGroup = group[i] as Group;
    if (!activeGroup) {
      return;
    }

    const rect = getBoundingRectFromLayout(layout.filter(i => i.parent && i.parent === activeGroup.id));
    this.setState({
      activeGroup,
      focusItem: {
        x: rect.x,
        y: rect.y,
        w: rect.right - rect.x,
        h: rect.bottom - rect.y,
        i: activeGroup.id
      },
    });
  }

  onResizeStart = (i: string, { x, y, w, h }: ResizeProps, { e, node }: GridResizeEvent) => {
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

  onResize = (i: string, { w, h, x, y }: ResizeProps, { e, node }: GridResizeEvent, axis: Axis) => {
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

  onResizeStop = (i: string, { x, y, w, h }: ResizeProps, { e, node }: GridResizeEvent) => {
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


  mergeLayout(newLayout: Layout, extraValue?: (i: LayoutItem) => LayoutItem | {}) {
    const { layout } = this.state;

    if (!newLayout || !newLayout.length) {
      return layout;
    }

    return layout.map(item => {
      const found = newLayout.find(n => n.i === item.i);
      if (found) {
        return Object.assign(item, found, typeof extraValue === 'function' ? extraValue(found) : extraValue);
      }
      return item;
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

  startSelection = () => {
    this.deleteGroup(temporaryGroupId);
    this.setState(({ group }) => ({
      selecting: true,
      focusItem: null,
      activeGroup: null,
      selectedLayout: [],
      group: (delete group[temporaryGroupId] && group)
    }))
  }

  selectLayoutItemByRect = (start?: MousePosition, end?: MousePosition) => {
    const { selecting, layout } = this.state;
    if (!selecting || !start || !end) {
      return this.setState({ selectedLayout: [] });
    }

    const selectedLayout = pickByRect(
      layout,
      getRectFromPoints(start, end, this.calcColWidth()),
    );

    this.setState({ selectedLayout });
  }

  endSelection = (start?: MousePosition, end?: MousePosition) => {
    this.setState({ selecting: false });
    const { selectedLayout } = this.state;
    if (start && end && selectedLayout) {
      this.props.onLayoutSelect(selectedLayout);
      this.addTemporaryGroup(selectedLayout);
    }
  }

  deleteGroup = (groupId: symbol | string) => {
    const targetContainer = this.state.group[groupId];
    if (!targetContainer) {
      return;
    }

    const { layout } = targetContainer;

    this.onLayoutMaybeChanged(
      this.mergeLayout(layout, i => {
        i.parent = i._parent;
        delete i._parent;
        return i;
      }),
    );
  }

  addTemporaryGroup = (selectedLayout: Layout) => {
    if (!selectedLayout) {
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
    }, () => this.onLayoutMaybeChanged(
      this.mergeLayout(hoistedLayout, i => ({
        ...i,
        _parent: i.parent,
        parent: temporaryGroupId,
      }))
    ));
  }

  processGridItem(child: ReactChild, colWidth: number) {
    if (!child || !React.isValidElement(child)) {
      return;
    }

    const key = child.key;
    if (!key) {
      return;
    }

    const l = getLayoutItem(this.state.layout, String(key));
    if (!l) {
      return;
    }
    const { mounted, props, state } = this;

    const {
      containerPadding, maxRows, width,
      isDraggable, isResizable,
    } = props;

    const { selectedLayout, focusItem } = state;

    const cols = this.getCols();

    const draggable = Boolean(
      !l.static && isDraggable && (l.isDraggable || l.isDraggable == null)
    );
    const resizable = Boolean(
      !l.static && isResizable && (l.isResizable || l.isResizable == null)
    );

    const active = focusItem && focusItem.i === String(key);
    const selected = Boolean(selectedLayout && selectedLayout.find(item => item.i === String(key)));

    return <GridItem
      usePercentages={mounted}
      colWidth={colWidth}
      rowHeight={colWidth}
      margin={[0, 0]}
      containerPadding={containerPadding}
      containerWidth={width}
      i={String(key)}
      cols={cols}
      maxRows={maxRows}
      onDragStop={this.onDragStop}
      onDragStart={this.onDragStart}
      onDrag={this.onDrag}
      onResizeStart={this.onResizeStart}
      onResize={this.onResize}
      onResizeStop={this.onResizeStop}
      isResizable={resizable}
      isDraggable={draggable}
      x={l.x}
      y={l.y}
      w={l.w}
      h={l.h}
      z={l.z}
      active={!!active}
      selected={selected}
    >{child}</GridItem>
  }

  placeholder() {
    const activeDrag = this.props.activeDrag || this.state.activeDrag;
    if (!activeDrag || activeDrag.i === temporaryGroupId) {
      return null;
    }
    const {
      width,
      containerPadding,
      maxRows,
    } = this.props;

    const cols = this.getCols();
    const margin = [0, 0];
    // {...this.state.activeDrag} is pretty slow, actually
    return (
      <GridItem
        w={activeDrag.w}
        h={activeDrag.h}
        x={activeDrag.x}
        y={activeDrag.y}
        i={activeDrag.i}
        z={activeDrag.z}
        className="react-grid-placeholder"
        containerWidth={width}
        cols={cols}
        margin={[0, 0]}
        containerPadding={containerPadding || margin}
        maxRows={maxRows}
        rowHeight={this.calcColWidth()}
        isDraggable={false}
        isResizable={false}
        colWidth={this.calcColWidth()}
        onDrag={noop}
        onDragStart={noop}
        onDragStop={noop}
        onResize={noop}
        onResizeStart={noop}
        onResizeStop={noop}
      >
        <div />
      </GridItem>
    );
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
          this.props.onResizeStop(this.state.layout, focusItem, null, null, e, node);
        });
      }

      if (handlerName === 'onResize' || handlerName === 'onResizeStop') {
        const { layout } = group;

        const strechedLayout = stretchLayout(layout, { x, y, right: x + w, bottom: y + h });

        const newState = {
          layout: this.mergeLayout(strechedLayout),
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

  renderGroupItem = (key: string | symbol, rect: GridRect) => {
    const { activeGroup, focusItem } = this.state;
    const {
      width,
      containerPadding,
      maxRows,
      grid,
    } = this.props;

    const active = Boolean(activeGroup && activeGroup.id === key); // 是否激活
    const selected = Boolean(focusItem && focusItem.i === key);

    return <GridItem
      i={key}
      key={String(key)}
      cols={this.getCols()}
      colWidth={this.calcColWidth()}
      x={rect.x}
      y={rect.y}
      w={rect.right - rect.x}
      h={rect.bottom - rect.y}
      className="react-selection-placeholder"
      maxRows={maxRows}
      rowHeight={grid[1]}
      containerWidth={width}
      containerPadding={containerPadding}
      onDrag={noop}
      onDragStart={noop}
      onDragStop={noop}
      onResize={this.onContainerHandler('onResize')}
      onResizeStart={this.onContainerHandler('onResizeStart')}
      onResizeStop={noop}
      margin={[0, 0]}
      active={active}
      selected={selected}
    >
      <div />
    </GridItem>
  }
  group() {
    const { selecting, group } = this.state;

    const groups = [];

    if (!selecting && group[temporaryGroupId] && group[temporaryGroupId].layout.length) {
      groups.push(
        this.renderGroupItem(
          temporaryGroupId,
          getBoundingRectFromLayout(group[temporaryGroupId].layout)
        )
      );
    }

    for (const key in group) {
      if (group.hasOwnProperty(key)) {
        const currLayout: Group = group[key];
        if (!currLayout || !currLayout.layout.length) {
          continue;
        }
        const rect = getBoundingRectFromLayout(currLayout.layout);
        groups.push(this.renderGroupItem(key, rect))
      }
    }

    return groups;
  }

  render() {
    const { width } = this.props;
    const { bottom } = this.state;
    const colWith = this.calcColWidth();

    return <Selection
      onSelectStart={this.startSelection}
      onSelect={this.selectLayoutItemByRect}
      onSelectEnd={this.endSelection}
    >
      <div style={{ width, height: (bottom + 10) * colWith }}>
        {this.group()}
        {React.Children.map(this.props.children,
          child => this.processGridItem(child, colWith)
        )}
        {this.placeholder()}
      </div>
    </Selection>
  }
}
