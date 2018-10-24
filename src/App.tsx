import React, { ReactChild } from 'react';
import isEqual from 'lodash.isequal';
import { synchronizeLayoutWithChildren, CompactType, getLayoutItem, cloneLayoutItem, moveElement } from './utils';
import GridItem, { GridDragEvent, GridResizeEvent, GridDragCallbacks, GridResizeCallbacks } from './GridItem';
import { DraggableData } from 'react-draggable';

export interface LayoutItem {
  w: number;
  h: number;
  x: number;
  y: number;
  i: string;
  z?: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  moved?: boolean;
  static?: boolean;
  isDraggable?: boolean;
  isResizable?: boolean;
}

const TOP = 999;
export type Layout = LayoutItem[];
export interface IGridLayoutState {
  layout: Layout;
  mounted: boolean;
  oldDragItem?: LayoutItem | null;
  oldLayout?: Layout | null;
  oldResizeItem?: LayoutItem | null;
  activeDrag?: LayoutItem | null;
  maxZ: number;
}

function noop() { return; }

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
}


export type GridDragEventCallback = (
  layout: Layout,
  item?: LayoutItem | null,
  lastItem?: LayoutItem | null,
  placeholder?: LayoutItem | null,
  e?: MouseEvent,
  node?: DraggableData['node'],
) => void;

export type GridResizeEventCallback = (
  layout: Layout,
  item?: LayoutItem | null,
  lastItem?: LayoutItem | null,
  placeholder?: LayoutItem | null,
  e?: MouseEvent,
  node?: DraggableData['node'],
) => void;

// type DefaultProps = Readonly<typeof defaultProps>;
export type IGridLayoutProps = {
  className?: string;
  width: number;
  maxRows: number;
  rowHeight: number;
  style?: {};
  autoSize?: boolean;
  cols: number;
  activeDrag?: LayoutItem;
  layout: Layout;
  margin: [number, number];
  containerPadding: [number, number];
  compactType?: CompactType;
  children: JSX.Element[] | JSX.Element;
  onLayoutChange: (layout: Layout) => void;
} & GridDragCallbacks<GridDragEventCallback>
& GridResizeCallbacks<GridResizeEventCallback>
export default class DeerGridLayout extends React.Component<IGridLayoutProps, IGridLayoutState> {
  public static defaultProps: Partial<IGridLayoutProps> = defaultProps;
  private mounted = false;

  constructor(props: IGridLayoutProps) {
    super(props);
    const { layout, children, cols, compactType } = props;
    this.state = {
      ...(synchronizeLayoutWithChildren(
        layout,
        children,
        cols,
        compactType,
      )),
      mounted: false,
    }
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
      const { layout, children, cols } = nextProps;
      this.setState({
        ...synchronizeLayoutWithChildren(
          layout,
          children,
          cols,
          nextProps.compactType,
        )
      });
    }
  }

  calcColWidth() {
    const { margin, containerPadding,  cols, width } = this.props;
    const calcColWidth = (width - margin[0] * (cols - 1) - containerPadding[0] * 2) / cols;
    return calcColWidth;
  }

  onDragStart = (i: string, x: number, y: number, { e, node }: GridDragEvent) => {
    const { layout } = this.state;
    const l = getLayoutItem(layout, i);
    if (!l) {
      return;
    }

    this.setState({
      oldDragItem: cloneLayoutItem(l),
      oldLayout: this.state.layout
    });

    return this.props.onDragStart(layout, l, l, null, e, node);
  }

  onDrag = (i: string, x: number, y: number, { e, node }: GridDragEvent) => {
    const { oldDragItem } = this.state;
    let { layout } = this.state;
    const { cols } = this.props;
    const l = getLayoutItem(layout, i);
    if (!l) {
      return;
    }

    // Create placeholder (display only)
    const placeholder = {
      w: l.w,
      h: l.h,
      x: l.x,
      y: l.y,
      placeholder: true,
      i,
      z: TOP
    };

    // Move the element to the dragged location.
    const isUserAction = true;
    layout = moveElement(
      layout,
      l,
      x,
      y,
      isUserAction,
      cols
    );

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
  onDragStop = (i: string, x: number, y: number, { e, node }: GridDragEvent) => {
    const { oldDragItem } = this.state;
    let { layout } = this.state;
    const { maxZ } = this.state;
    const { cols } = this.props;
    const l = getLayoutItem(layout, i);
    if (!l) {
      return;
    }

    l.z = maxZ +1;
    // Move the element here
    const isUserAction = true;
    layout = moveElement(
      layout,
      l,
      x,
      y,
      isUserAction,
      cols
    );

    this.props.onDragStop(layout, oldDragItem, l, null, e, node);

    // Set state
    const { oldLayout } = this.state;
    this.setState({
      maxZ: maxZ + 1,
      activeDrag: null,
      layout,
      oldDragItem: undefined,
      oldLayout: undefined
    });

    this.onLayoutMaybeChanged(layout, oldLayout);
  }

  onResizeStart = (i: string, w: number, h: number, { e, node }: GridResizeEvent) => {
    const { layout, maxZ } = this.state;
    const l = getLayoutItem(layout, i);
    if (!l) {
      return;
    }

    l.z = maxZ + 1;

    this.setState({
      maxZ: maxZ + 1,
      oldResizeItem: cloneLayoutItem(l),
      oldLayout: this.state.layout
    });

    this.props.onResizeStart(layout, l, l, null, e, node);
  }

  onResize = (i: string, w: number, h: number, { e, node }: GridResizeEvent) => {
    const { layout, oldResizeItem } = this.state;
    const l = getLayoutItem(layout, i);
    if (!l) {
      return;
    }

    l.w = w;
    l.h = h;

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

  onResizeStop = (i: string, w: number, h: number, { e, node }: GridResizeEvent) => {
    const { layout, oldResizeItem, oldLayout } = this.state;
    const l = getLayoutItem(layout, i);

    this.props.onResizeStop(layout, oldResizeItem, l, null, e, node);

    // Set state
    this.setState({
      activeDrag: null,
      layout,
      oldResizeItem: null,
      oldLayout: null
    });

    this.onLayoutMaybeChanged(layout, oldLayout);
  }

  onLayoutMaybeChanged(newLayout: Layout, oldLayout?: Layout | null) {
    if (!oldLayout) {
      oldLayout = this.state.layout;
    }
    if (!isEqual(oldLayout, newLayout)) {
      this.props.onLayoutChange(newLayout);
    }
  }


  processGridItem(child: ReactChild) {
    if (!child || !React.isValidElement(child)) {
      return;
    }

    const key = (child as React.ReactElement<LayoutItem>).key;
    if (!key) {
      return;
    }

    const l = getLayoutItem(this.state.layout, String(key));
    if (!l) {
      return;
    }
    const { mounted, props } = this;

    const { rowHeight, margin, containerPadding, cols, maxRows, width } = props;

    return <GridItem
      usePercentages={mounted}
      colWidth={this.calcColWidth()}
      rowHeight={rowHeight}
      margin={margin}
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
      x={l.x}
      y={l.y}
      w={l.w}
      h={l.h}
      z={l.z}
    >{child}</GridItem>
  }

  placeholder() {
    const activeDrag = this.props.activeDrag || this.state.activeDrag;
    if (!activeDrag) {
      return null;
    }
    const {
      width,
      cols,
      margin,
      containerPadding,
      rowHeight,
      maxRows,
    } = this.props;

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
        margin={margin}
        containerPadding={containerPadding || margin}
        maxRows={maxRows}
        rowHeight={rowHeight}
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

  render() {
    return <div>
      {React.Children.map(this.props.children,
        child => this.processGridItem(child)
      )}
      {this.placeholder()}
    </div>
  }
}
