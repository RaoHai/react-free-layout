import React, { Component, MouseEventHandler } from 'react';
import { DraggableCore, DraggableData } from 'react-draggable';
import classNames from 'classnames';
import { LayoutItem } from './Layout';
import { setTransform, getOffsetParent, OffsetParent } from '../utils';

export interface GridDragEvent {
  e: MouseEvent | React.SyntheticEvent<MouseEvent>;
  node: DraggableData['node'];
  newPosition: { x: number; y: number, };
  dx: number;
  dy: number;
}

export interface GridResizeEvent {
  e: MouseEvent | React.SyntheticEvent<MouseEvent>;
  axis?: {};
  node: DraggableData['node'];
  size?: Position;
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

export type GridItemProps = GridDragCallbacks<GridDragCallback> &
  LayoutItem &
  {
    offsetParent?: OffsetParent;
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
    onContextMenu?: MouseEventHandler;
  };

export default class GridItem extends Component<GridItemProps, {
  lastX: number;
  lastY: number;
  dragging: Pick<Position, 'left' | 'top'> | null;
  originPosition: Position | null;
  originLayout: Pick<LayoutItem, 'x' | 'y' | 'w' | 'h'> | null;
  resizingLayout: Pick<LayoutItem, 'x' | 'y' | 'w' | 'h'> | null;
}> {

  static defaultProps = {
    margin: [ 0, 0],
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
      resizingLayout: null,
    };
  }

  calcXY(top: number, left: number, suppliter = Math.round): { x: number, y: number } {
    const { margin, cols, colWidth, rowHeight, w, h, maxRows } = this.props;

    let x = suppliter((left - margin[0]) / (colWidth + margin[0]));
    let y = suppliter((top - margin[1]) / (rowHeight + margin[1]));

    // Capping
    x = Math.max(Math.min(x, cols - w), 0);
    y = Math.max(Math.min(y, maxRows - h), 0);

    return { x, y };
  }

  onDragHandler(handlerName: keyof GridDragCallbacks<GridDragCallback>) {
    return (e: MouseEvent, { node, deltaX, deltaY }: DraggableData) => {
      const handler = this.props[handlerName];
      if (!handler) {
        return;
      }

      const newPosition = { top: 0, left: 0 };
      const { dragging } = this.state;

      switch (handlerName) {
        case 'onDragStart':
          const offsetParent = getOffsetParent(this.props.offsetParent);
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
      }

      const { x, y } = this.calcXY(newPosition.top, newPosition.left);
      return handler.call(this, this.props.i, x, y, {
        e,
        node,
        newPosition,
        dx: x - this.props.x,
        dy: y - this.props.y,
      });
    }
  }

  mixinDraggable(child: React.ReactElement<any>, draggable: boolean): React.ReactElement<any> {
    const offsetParent = getOffsetParent(this.props.offsetParent);
    return (
      <DraggableCore
        onStart={this.onDragHandler("onDragStart")}
        onDrag={this.onDragHandler("onDrag")}
        onStop={this.onDragHandler("onDragStop")}
        disabled={!draggable}
        handle={this.props.handle}
        offsetParent={offsetParent}
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
      x, y, w, h,
      children, className, style, active, selected, onContextMenu,
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

    const child = React.Children.only(children);
    let newChild = React.cloneElement(child, {
      className: classNames(
        "react-grid-item",
        child.props.className,
        className,
        {
          static: this.props.static,
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
        ...setTransform(out),
      },
      onContextMenu,
    });

    newChild = this.mixinDraggable(newChild, isDraggable);
    return newChild;
  }
}
