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
} from '../utils';

import GridItem, { GridDragEvent, GridResizeEvent, GridDragCallbacks, Axis } from './GridItem';
import { DraggableData } from 'react-draggable';
import Selection, { MousePosition } from './Selection';
import { ResizeCallbacks, ResizeProps } from './Resizable/index';

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
}

const TOP = 999;
export type Layout = LayoutItem[];
export interface Group {
  rect: GridRect;
  layout: Layout;
}

export interface IGridLayoutState {
  layout: Layout;
  group: {
    [key in symbol]: Group;
  };
  mounted: boolean;
  focusItem?: LayoutItem | null;
  oldDragItem?: LayoutItem | null;
  oldLayout?: Layout | null;
  oldResizeItem?: LayoutItem | null;
  activeDrag?: LayoutItem | null;

  selecting?: boolean;
  selectedLayout?: Layout;

  activeGroup?: Group;
  maxZ: number;
  bottom: number;
}

const defaultProps = {
  maxRows: Infinity,
  margin: [ 0, 0 ] as [ number, number ],
  containerPadding: [0, 0 ] as [ number, number ],
  onDragStart: noop,
  onDrag: noop,
  onDragStop: noop,
  onResizeStart: noop,
  onResize: noop,
  onResizeStop: noop,
  isDraggable: true,
  isResizable: true,
  onLayoutChange: () => {},
}


export type GridDragEventCallback = (
  layout: Layout,
  item?: LayoutItem | null,
  lastItem?: LayoutItem | null,
  placeholder?: LayoutItem | null,
  e?: React.SyntheticEvent<MouseEvent> ,
  node?: DraggableData['node'],
) => void;

export type GridResizeEventCallback = (
  layout: Layout,
  item?: LayoutItem | null,
  lastItem?: LayoutItem | null,
  placeholder?: LayoutItem | null,
  e?: React.SyntheticEvent<MouseEvent> ,
  node?: DraggableData['node'],
) => void;

// type DefaultProps = Readonly<typeof defaultProps>;
export type IGridLayoutProps = {
  className?: string;
  width: number;
  maxRows: number;
  style?: {};
  autoSize?: boolean;
  activeDrag?: LayoutItem;
  layout: Layout;
  containerPadding: [number, number];
  grid: [ number, number ];
  compactType?: CompactType;
  children: JSX.Element[] | JSX.Element;
  isDraggable?: boolean;
  isResizable?: boolean;
  onLayoutChange: (layout: Layout) => void;
} & GridDragCallbacks<GridDragEventCallback>
& ResizeCallbacks<GridResizeEventCallback>
export default class DeerGridLayout extends React.Component<IGridLayoutProps, IGridLayoutState> {
  public static defaultProps: Partial<IGridLayoutProps> = defaultProps;
  private mounted = false;

  constructor(props: IGridLayoutProps) {
    super(props);
    const { layout, children, grid, width, compactType } = props;
    const cols = this.getCols({ width, grid });
    this.state = {
      ...(synchronizeLayoutWithChildren(
        layout,
        children,
        cols,
        compactType,
      )),
      group: {},
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
      const { layout, children } = nextProps;
      this.setState({
        ...synchronizeLayoutWithChildren(
          layout,
          children,
          this.getCols(nextProps),
          nextProps.compactType,
        )
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
    const { group } = this.state;
    const activeGroup = group[i] as Group;
    if (!activeGroup) {
      return;
    }

    this.setState({ activeGroup });
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

  mergeLayout(newLayout: Layout, extraValue: {} | Function = {}) {
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
      selectedLayout: [],
      group: (delete group[temporaryGroupId] && group)
    }))
  }

  selectLayoutItemByRect = (start?: MousePosition, end?: MousePosition) => {
    if (!this.state.selecting || !start || !end) {
      return this.setState({ selectedLayout: [] });
    }

    const selectedLayout = pickByRect(
      this.state.layout,
      getRectFromPoints(start, end, this.calcColWidth()),
    );
    this.setState({ selectedLayout });
  }

  endSelection = (start?: MousePosition, end?: MousePosition) => {
    this.setState({ selecting: false });
    if (start && end && this.state.selectedLayout) {
      this.addTemporaryGroup(
        this.state.selectedLayout,
        getRectFromPoints(start, end, this.calcColWidth()),
      );
    }
  }

  deleteGroup = (groupId: symbol | string) => {
    const targetContainer = this.state.group[groupId];
    if (!targetContainer) {
      return;
    }

    const { layout } = targetContainer;

    this.onLayoutMaybeChanged(
      this.mergeLayout(layout, (i: LayoutItem) => ( delete i.parent && i ))
    );
  }

  addTemporaryGroup = (selectedLayout: Layout, rect: GridRect) => {
    if (!selectedLayout) {
      return;
    }

    const group = { ...this.state.group };
    group[temporaryGroupId] = { rect, layout: selectedLayout };
    this.setState({
      group,
      focusItem: {
        x: rect.x,
        y: rect.y,
        w: rect.right - rect.x,
        h: rect.bottom - rect.y,
        i: temporaryGroupId,
      },
    }, () => this.onLayoutMaybeChanged(
      this.mergeLayout(selectedLayout, { parent: temporaryGroupId })
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

  groupPlaceholder() {
    const { selecting, group, focusItem } = this.state;
    const selectedLayout: Group = group[temporaryGroupId];

    if (selecting || !selectedLayout || !selectedLayout.layout.length) {
      return null;
    }

    const rect = getBoundingRectFromLayout(selectedLayout.layout);

    const {
      width,
      containerPadding,
      maxRows,
      grid,
    } = this.props;

    return <GridItem
      cols={this.getCols()}
      colWidth={this.calcColWidth()}
      x={rect.x}
      y={rect.y}
      w={rect.right - rect.x}
      h={rect.bottom - rect.y}
      i={'selection'}
      className="react-selection-placeholder"
      maxRows={maxRows}
      rowHeight={grid[1]}
      containerWidth={width}
      containerPadding={containerPadding}
      onDrag={noop}
      onDragStart={noop}
      onDragStop={noop}
      onResize={noop}
      onResizeStart={noop}
      onResizeStop={noop}
      margin={[0, 0]}
      active={Boolean(focusItem && focusItem.i === temporaryGroupId)}
    >
      <div />
    </GridItem>
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
        {this.groupPlaceholder()}
        {React.Children.map(this.props.children,
          child => this.processGridItem(child, colWith)
        )}
        {this.placeholder()}
      </div>
    </Selection>
  }
}
