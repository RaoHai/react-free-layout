import React, { Component, MouseEventHandler } from 'react';
import Draggable, { DraggableData, DraggerEvent } from './Dragger';
import { setTransform, getOffsetParent, OffsetParent, classNames, offsetXYFromParent, canUseDOM } from '../utils';
import { LayoutItem } from '../model/LayoutState';
import { temporaryGroupId } from './Layout';

export interface GridDragEvent {
  e: DraggerEvent;
  node: DraggableData['node'];
  newPosition: { x: number; y: number, };
  dx: number;
  dy: number;
}

export interface GridResizeEvent {
  e: DraggerEvent;
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

export type GridItemProps = GridDragCallbacks<GridDragCallback> &
  LayoutItem &
  {
    offsetParent?: OffsetParent;
    className?: string;
    cols: number;
    scale: number;
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
    useTransform: boolean;
    inGroup?: boolean;
    parent?: LayoutItem['parent'];
    onContextMenu?: MouseEventHandler;
  };

export default class GridItem extends Component<GridItemProps, {
  mounted: boolean;
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
    scale: 1,
    useTransform: true,
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
      mounted: !Boolean(canUseDOM()),
    };
  }

  componentDidMount() {
    if (!this.state.mounted) {
      this.setState({ mounted: true });
    }
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
    return (e: DraggerEvent, { node, deltaX, deltaY }: DraggableData) => {
      const handler = this.props[handlerName];
      if (!handler) {
        return;
      }

      const newPosition = { top: 0, left: 0 };
      const { dragging } = this.state;

      switch (handlerName) {
        case 'onDragStart':
          const clientRect = node.getBoundingClientRect();
          const xy = offsetXYFromParent({
            clientX: clientRect.left,
            clientY: clientRect.top,
          }, getOffsetParent(this.props.offsetParent));

          newPosition.left = xy.x;
          newPosition.top = xy.y
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
    return (
      <Draggable
        onStart={this.onDragHandler("onDragStart")}
        onDrag={this.onDragHandler("onDrag")}
        onStop={this.onDragHandler("onDragStop")}
        mounted={this.state.mounted}
        // disabled={!draggable}
        // handle={this.props.handle}
        offsetParent={this.props.offsetParent}
        // cancel={
        //   ".react-resizable-handle" +
        //   (this.props.cancel ? "," + this.props.cancel : "")
        // }
      >
        {child}
      </Draggable>
    );
  }

  render() {
    const {
      margin, colWidth, containerPadding, rowHeight, isDraggable = true,
      x, y, w, h, scale, inGroup,
      parent, children, className, style, active, selected, onContextMenu, useTransform,
    } = this.props;

    const out = {
      left: Math.round((colWidth + margin[0]) * x + containerPadding[0]) * scale,
      top: Math.round((rowHeight + margin[1]) * y + containerPadding[1]) * scale,
      // 0 * Infinity === NaN, which causes problems with resize constraints;
      // Fix this if it occurs.
      // Note we do it here rather than later because Math.round(Infinity) causes deopt
      width:
        w === Infinity
          ? w
          : Math.round(colWidth * w + Math.max(0, w - 1) * margin[0]) * scale,
      height:
        h === Infinity
          ? h
          : Math.round(rowHeight * h + Math.max(0, h - 1) * margin[1]) * scale,
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
          "in-group": Boolean(inGroup),
          "in-temporary-group": parent === temporaryGroupId
        },
      ),
      // We can set the width and height on the child, but unfortunately we can't set the position.
      style: {
        ...style,
        ...child.props.style,
        ...setTransform(out, useTransform),
      },
      onContextMenu,
    });

    newChild = canUseDOM() && this.state.mounted ? this.mixinDraggable(newChild, isDraggable) : newChild;
    return newChild;
  }
}
