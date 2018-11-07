import React, { Component } from 'react';
import { DraggableCore, DraggableData } from 'react-draggable';
import classNames from 'classnames';
import { LayoutItem } from './Layout';
import { setTransform } from '../utils';
import Resizable, { ResizeCallbacks, ResizeCallback, ResizeProps } from './Resizable/index';

export interface GridDragEvent {
  e: React.SyntheticEvent<MouseEvent>;
  node: DraggableData['node'];
  newPosition: { x: number; y: number, };
}

export interface GridResizeEvent {
  e: React.SyntheticEvent<MouseEvent>;
  axis?: {};
  node: DraggableData['node'];
  size: Position;
}

export interface Position {
  left: number;
  top: number;
  width: number;
  height: number;
  deltaX?: number;
  deltaY?: number;
}

export type GridDragCallback = (
  i: string,
  x: number,
  y: number,
  event: GridDragEvent,
) => void;

export interface GridDragCallbacks<T> {
  onDragStart: T;
  onDrag: T;
  onDragStop: T;
}

export type Axis = {
  key: string;
  direction: (0 | -1 | 1)[];
}

export type GridResizeCallback = (
  i: string,
  size: ResizeProps,
  ev: GridResizeEvent,
  axis: Axis,
) => void;

export default class GridItem extends Component<
GridDragCallbacks<GridDragCallback> &
ResizeCallbacks<GridResizeCallback>&
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
    selected?: boolean;
  }, {
    lastX: number;
    lastY: number;
    dragging: Pick<Position, 'left' | 'top'> | null;
    originPosition: Position | null;
    originLayout: Pick<LayoutItem, 'x' | 'y' | 'w' | 'h'> | null;
    resizingPosition: Position | null;
    resizingLayout: Pick<LayoutItem, 'x' | 'y' | 'w' | 'h'> | null;
}> {
  static defaultProps = {
    cancel: "",
    handle: "",
  }

  constructor(props: GridItem['props']) {
    super(props);
    this.state = {
      lastX: 0,
      lastY: 0,
      dragging: null,
      originPosition: null,
      originLayout: null,
      resizingPosition: null,
      resizingLayout: null,
    };
  }

  calcXY(top: number, left: number, suppliter = Math.round): { x: number, y: number } {
    const { margin, cols, colWidth, rowHeight, w, h, maxRows } = this.props;

    // left = colWidth * x + margin * (x + 1)
    // l = cx + m(x+1)
    // l = cx + mx + m
    // l - m = cx + mx
    // l - m = x(c + m)
    // (l - m) / (c + m) = x
    // x = (left - margin) / (coldWidth + margin)
    let x = suppliter((left - margin[0]) / (colWidth + margin[0]));
    let y = suppliter((top - margin[1]) / (rowHeight + margin[1]));

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
    state?: GridItem['state'],
    suppliter = Math.round
  ): Position {
    const { margin, containerPadding, colWidth, rowHeight } = this.props;

    const out = {
      left: suppliter((colWidth + margin[0]) * x + containerPadding[0]),
      top: suppliter((rowHeight + margin[1]) * y + containerPadding[1]),
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

    if (state && state.resizingPosition) {
      out.width = Math.round(state.resizingPosition.width);
      out.height = Math.round(state.resizingPosition.height);
      out.top = suppliter(state.resizingPosition.top);
      out.left = suppliter(state.resizingPosition.left);
    }

    if (state && state.dragging) {
      out.top = suppliter(state.dragging.top);
      out.left = suppliter(state.dragging.left);
    }

    return out;
  }

  onDragHandler(handlerName: keyof GridDragCallbacks<GridDragCallback>) {
    return (e: React.SyntheticEvent<MouseEvent>, { node, deltaX, deltaY }: DraggableData) => {
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
    suppliter = Math.round
  ): { w: number; h: number } {
    const { margin, maxRows, colWidth, cols, rowHeight, x, y } = this.props;

    // width = colWidth * w - (margin * (w - 1))
    // ...
    // w = (width + margin) / (colWidth + margin)
    let w = suppliter((width + margin[0]) / (colWidth + margin[0]));
    let h = suppliter((height + margin[1]) / (rowHeight + margin[1]));

    // Capping
    w = Math.max(Math.min(w, cols - x), 0);
    h = Math.max(Math.min(h, maxRows - y), 0);
    return { w, h };
  }

  onResizeHandler(handlerName: keyof ResizeCallbacks<ResizeCallback>): ResizeCallback {
    return (e, { node, size, axis }) => {
      if (!this.props[handlerName]) {
        return;
      }

      e.preventDefault();

      let { i, x, y, w, h } = this.props;

      const {
        deltaX,
        deltaY,
        lastX,
        lastY,
        x: cX,
        y: cY,
       } = size;
      let layout = { x, y, w, h };


      if (handlerName === 'onResizeStart') {
        const position = this.calcPosition(x, y, w, h);
        size = position;
        this.setState({
          lastX,
          lastY,
          originLayout: layout,
          originPosition: this.calcPosition(x, y, w, h),
        });
      }

      const { resizingPosition, originLayout, resizingLayout, originPosition } = this.state;
      if (handlerName === 'onResize' && originLayout && originPosition && resizingPosition && resizingLayout) {
        const { direction } = axis;
        let {
          x: resizingX,
          // w: resizingW,
          y: resizingY,
          // h: resizingH,
        } = resizingLayout;


        let width = resizingPosition.width;
        let height = resizingPosition.height;

        if (direction[0] === -1) {
          const dx = Math.round((cX - this.state.lastX) / this.props.colWidth) * this.props.colWidth;
          const _w = originPosition.width - dx;
          const right = originPosition.left + originPosition.width;
          const _x = right - _w;
          width = _w;
          resizingX = Math.round(_x / this.props.colWidth);
          x = resizingX;
        } else {
          width += direction[0] * deltaX;
        }

        if (direction[1] === -1) {
          const dy = Math.round((cY - this.state.lastY) / this.props.rowHeight) * this.props.rowHeight;
          const _h = originPosition.height - dy;
          const bottom = originPosition.top + originPosition.height;
          const _y = bottom - _h;
          height = _h;
          resizingY = Math.round(_y / this.props.rowHeight);
          y = resizingY;
        } else {
          height += direction[1] * deltaY;
        }

        const { w: _w, h: _h } = this.calcWH({ width, height });

        size = this.calcPosition(resizingX, resizingY, _w, _h);

        w = _w;
        h = _h;
        layout = { x, y, w: _w, h: _h };
      }

      this.setState({
        resizingPosition: handlerName === 'onResizeStop' ? null : size,
        resizingLayout: handlerName === 'onResizeStop' ? null : layout,
      });

      return this.props[handlerName](String(i), { x, y, w, h }, { e, node, size }, axis);
    };
  }

  mixinResizable(
    child: React.ReactElement<any>,
    position: Position,
  ): React.ReactElement<any> {

    return (
      <Resizable
        key={String(this.props.i)}
        left={position.left}
        top={position.top}
        width={position.width}
        height={position.height}
        onResizeStop={this.onResizeHandler("onResizeStop")}
        onResizeStart={this.onResizeHandler("onResizeStart")}
        onResize={this.onResizeHandler("onResize")}
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
      children, className, style, active, selected,
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
          resizing: Boolean(this.state.resizingPosition),
          "react-draggable": isDraggable,
          "react-draggable-dragging": Boolean(this.state.dragging),
          active: Boolean(active),
          selected: Boolean(selected),
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
