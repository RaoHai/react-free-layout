import React, { Component } from 'react';
import { DraggableCore, DraggableData } from 'react-draggable';
import { Resizable } from '@alipay/deer-react-resizable';
import classNames from 'classnames';
import { LayoutItem } from './Layout';
import { setTransform } from '../utils';

export interface GridDragEvent {
  e: MouseEvent;
  node: DraggableData['node'];
  newPosition: { x: number; y: number };
}

export interface GridResizeEvent {
  e: MouseEvent;
  node: DraggableData['node'];
  size: Position;
}

export interface Position {
  left: number;
  top: number;
  width: number;
  height: number
}

export type GridDragCallback = (
  i: string,
  x: number,
  y: number,
  event: GridDragEvent,
) => void;

export type CallbackItem = { e: MouseEvent; node: DraggableData['node']; size: Position };

export type GridResizeCallback = (
  i: string,
  w: number,
  h: number,
  ev: CallbackItem,
  axis: Axis,
) => void;

export interface GridDragCallbacks<T> {
  onDragStart: T;
  onDrag: T;
  onDragStop: T;
}
export interface GridResizeCallbacks<T> {
  onResize: T;
  onResizeStart: T;
  onResizeStop: T;
}

type Axis = 'both' | 'x' | 'y' | 'none';
const handles = [
  { key: 'tl', type: 'both'},
  { key: 'tr', type: 'both'},
  { key: 'bl', type: 'both'},
  { key: 'br', type: 'both'},
  { key: 'top', type: 'y', },
  { key: 'left', type: 'x' },
  { key: 'right', type: 'x'},
  { key: 'bottom',type: 'x', },
];
export default class GridItem extends Component<
GridDragCallbacks<GridDragCallback> &
GridResizeCallbacks<GridResizeCallback>&
  LayoutItem & {
    className?: string;
    cols: number;
    maxRows: number;
    usePercentages?: boolean;
    containerWidth: number;
    colWidth: number;
    rowHeight: number;
    margin: [ number, number ];
    containerPadding: [ number, number ];
    style?: {};
    handle: string;
    cancel: string;
    active?: boolean;
  }, {
  dragging: Pick<Position, 'left' | 'top'> | null;
  resizing: Position | null;
}> {
  static defaultProps = {
    cancel: "",
    handle: "",
  }

  constructor(props: GridItem['props']) {
    super(props);
    this.state = {
      dragging: null,
      resizing: null,
    };
  }

  calcXY(top: number, left: number): { x: number, y: number } {
    const { margin, cols, colWidth, rowHeight, w, h, maxRows } = this.props;

    // left = colWidth * x + margin * (x + 1)
    // l = cx + m(x+1)
    // l = cx + mx + m
    // l - m = cx + mx
    // l - m = x(c + m)
    // (l - m) / (c + m) = x
    // x = (left - margin) / (coldWidth + margin)
    let x = Math.round((left - margin[0]) / (colWidth + margin[0]));
    let y = Math.round((top - margin[1]) / (rowHeight + margin[1]));

    // Capping
    x = Math.max(Math.min(x, cols - w), 0);
    y = Math.max(Math.min(y, maxRows - h), 0);

    return { x, y };
  }

  calcPosition(
    x: number,
    y: number,
    w: number,
    h: number,
    state?: GridItem['state']
  ): Position {
    const { margin, containerPadding, colWidth, rowHeight } = this.props;

    const out = {
      left: Math.round((colWidth + margin[0]) * x + containerPadding[0]),
      top: Math.round((rowHeight + margin[1]) * y + containerPadding[1]),
      // 0 * Infinity === NaN, which causes problems with resize constraints;
      // Fix this if it occurs.
      // Note we do it here rather than later because Math.round(Infinity) causes deopt
      width:
        w === Infinity
          ? w
          : Math.round(colWidth * w + Math.max(0, w - 1) * margin[0]),
      height:
        h === Infinity
          ? h
          : Math.round(rowHeight * h + Math.max(0, h - 1) * margin[1])
    };

    if (state && state.resizing) {
      out.width = Math.round(state.resizing.width);
      out.height = Math.round(state.resizing.height);
    }

    if (state && state.dragging) {
      out.top = Math.round(state.dragging.top);
      out.left = Math.round(state.dragging.left);
    }

    return out;
  }

  onDragHandler(handlerName: keyof GridDragCallbacks<GridDragCallback>) {
    return (e: Event, { node, deltaX, deltaY }: DraggableData) => {
      const handler = this.props[handlerName];
      if (!handler) {
        return;
      }

      const newPosition = { top: 0, left: 0 };
      const { dragging } = this.state;

      switch (handlerName) {
        case 'onDragStart':
          const { offsetParent } = node;
          if (!offsetParent) {
            return;
          }

          const parentRect = offsetParent.getBoundingClientRect();
          const clientRect = node.getBoundingClientRect();

          newPosition.left =
            clientRect.left - parentRect.left + offsetParent.scrollLeft;
          newPosition.top =
            clientRect.top - parentRect.top + offsetParent.scrollTop;
          this.setState({ dragging: newPosition });
        break;
        case 'onDrag':
          if (!dragging) {
            throw new Error("onDrag called before onDragStart.");
          }
          newPosition.left = dragging.left + deltaX;
          newPosition.top = dragging.top + deltaY;
          this.setState({ dragging: newPosition });
        break;
        case "onDragStop":
          if (!dragging) {
            throw new Error("onDragEnd called before onDragStart.");
          }
          newPosition.left = dragging.left;
          newPosition.top = dragging.top;
          this.setState({ dragging: null });
        break;
        default:
          throw new Error(
            "onDragHandler called with unrecognized handlerName: " + handlerName
          );
      }

      const { x, y } = this.calcXY(newPosition.top, newPosition.left);
      return handler.call(this, this.props.i, x, y, { e, node, newPosition });
    }
  }

  calcWH(
    { height, width }: Pick<Position, 'width' | 'height'>,
  ): { w: number; h: number } {
    const { margin, maxRows, colWidth, cols, rowHeight, x, y } = this.props;

    // width = colWidth * w - (margin * (w - 1))
    // ...
    // w = (width + margin) / (colWidth + margin)
    let w = Math.round((width + margin[0]) / (colWidth + margin[0]));
    let h = Math.round((height + margin[1]) / (rowHeight + margin[1]));

    // Capping
    w = Math.max(Math.min(w, cols - x), 0);
    h = Math.max(Math.min(h, maxRows - y), 0);
    return { w, h };
  }

  onResizeHandler(handlerName: keyof GridResizeCallbacks<GridResizeCallback>) {
    return (
      e: MouseEvent,
      {node, size, axis} : {node: HTMLElement, size: Position, axis: Axis }
    ) => {
      if (!this.props[handlerName]) {
        return;
      }
      e.preventDefault();
      const {cols, x, i, maxW = Infinity, minW = 0, maxH = Infinity, minH = 0 } = this.props;

      // Get new XY
      let { w, h } = this.calcWH(size);

      // Cap w at numCols
      w = Math.min(w, cols - x);
      // Ensure w is at least 1
      w = Math.max(w, 1);

      w = Math.max(Math.min(w, maxW), minW);
      h = Math.max(Math.min(h, maxH), minH);

      this.setState({ resizing: handlerName === 'onResizeStop' ? null : size });

      return this.props[handlerName](i, w, h, { e, node, size }, axis);
    };
  }

  mixinResizable(
    child: React.ReactElement<any>,
    position: Position,
  ): React.ReactElement<any> {
    const { cols, x, minW = 0, minH = 0, maxW = Infinity, maxH = Infinity } = this.props;

    // This is the max possible width - doesn't go to infinity because of the width of the window
    const maxWidth = this.calcPosition(0, 0, cols - x, 0).width;

    // Calculate min/max constraints using our min & maxes
    const mins = this.calcPosition(0, 0, minW, minH);
    const maxes = this.calcPosition(0, 0, maxW, maxH);
    const minConstraints = [mins.width, mins.height];
    const maxConstraints = [
      Math.min(maxes.width, maxWidth),
      Math.min(maxes.height, Infinity)
    ];
    return (
      <Resizable
        width={position.width}
        height={position.height}
        minConstraints={minConstraints}
        maxConstraints={maxConstraints}
        onResizeStop={this.onResizeHandler("onResizeStop")}
        onResizeStart={this.onResizeHandler("onResizeStart")}
        onResize={this.onResizeHandler("onResize")}
        handles={handles}
      >
        {child}
      </Resizable>
    );
  }

  mixinDraggable(child: React.ReactElement<any>, draggable: boolean): React.ReactElement<any> {
    return (
      <DraggableCore
        onStart={this.onDragHandler("onDragStart")}
        onDrag={this.onDragHandler("onDrag")}
        onStop={this.onDragHandler("onDragStop")}
        disabled={!draggable}
        handle={this.props.handle}
        cancel={
          ".react-resizable-handle" +
          (this.props.cancel ? "," + this.props.cancel : "")
        }
      >
        {child}
      </DraggableCore>
    );
  }

  render() {
    const {
      margin, colWidth, containerPadding, rowHeight, isDraggable = true,
      x, y, w, h, z,
      children, className, style, active,
    } = this.props;

    const out = {
      left: Math.round((colWidth + margin[0]) * x + containerPadding[0]),
      top: Math.round((rowHeight + margin[1]) * y + containerPadding[1]),
      // 0 * Infinity === NaN, which causes problems with resize constraints;
      // Fix this if it occurs.
      // Note we do it here rather than later because Math.round(Infinity) causes deopt
      width:
        w === Infinity
          ? w
          : Math.round(colWidth * w + Math.max(0, w - 1) * margin[0]),
      height:
        h === Infinity
          ? h
          : Math.round(rowHeight * h + Math.max(0, h - 1) * margin[1]),
    };

    const position = this.calcPosition(x, y, w, h, this.state);
    const child = React.Children.only(children);
    let newChild = React.cloneElement(child, {
      className: classNames(
        "react-grid-item",
        child.props.className,
        className,
        {
          static: this.props.static,
          resizing: Boolean(this.state.resizing),
          "react-draggable": isDraggable,
          "react-draggable-dragging": Boolean(this.state.dragging),
          active: Boolean(active)
        },
      ),
      // We can set the width and height on the child, but unfortunately we can't set the position.
      style: {
        ...style,
        ...child.props.style,
        ...setTransform(out, z),
      },
    });

    newChild = this.mixinResizable(newChild, position);
    newChild = this.mixinDraggable(newChild, isDraggable);
    return newChild;
  }
}
