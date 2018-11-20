import React, { PureComponent } from 'react';
import { OffsetParent, setTransform, getOffsetParent, classNames, executeConstrains } from '../../utils';
import { Position } from '../GridItem';
import { LayoutItem } from '../../model/LayoutState';
import Draggable, { DraggableData, DraggerEvent } from '../Dragger/index';

export interface AxisOpt {
  key: string;
  direction: [-1 | 0 | 1, -1 | 0 | 1];
}

export type ResizeProps = Pick<LayoutItem, 'x' | 'y' | 'w' | 'h'>;
export interface CallbackItem {
  e: MouseEvent | React.SyntheticEvent<MouseEvent>;
  node: DraggableData['node'];
  size: Position;
};

export type ResizeCallback = (e: MouseEvent | React.SyntheticEvent<MouseEvent>, data: any) => ResizeProps | void;

export interface SelectCallbacks<T> {
  onLayoutSelect: T
}
export interface ResizeCallbacks<T> {
  onResize: T;
  onResizeStart: T;
  onResizeStop: T;
}

export interface ResizeCallbacks<T> {
  onResize: T;
  onResizeStart: T;
  onResizeStop: T;
}

export const handles: AxisOpt[] = [
  { key: 'tl', direction: [ -1, -1] },
  { key: 'tr', direction: [ 1, -1 ] },
  { key: 'bl', direction: [ -1, 1 ] },
  { key: 'br', direction: [ 1, 1  ] },
  { key: 't', direction: [ 0, -1 ] },
  { key: 'l', direction: [ -1, 0 ] },
  { key: 'r', direction: [ 1, 0 ] },
  { key: 'b', direction: [ 0, 1 ] },
];

export interface GridResizeEvent {
  e: DraggerEvent;
  axis?: {};
  node: DraggableData['node'];
  size?: Position;
}

export type GridResizeCallback = (
  i: string,
  size: ResizeProps,
  ev: GridResizeEvent,
  axis: AxisOpt,
) => void;

export type ResizeableProps = ResizeCallbacks<GridResizeCallback> &
LayoutItem & {
  className?: {};
  offsetParent?: OffsetParent;
  draggableOpts?: {}
  calcPosition: (...args: any) => Position;
  calcWH: (...args: any) => { w: number, h: number };
  colWidth: number;
  rowHeight: number;
  widthConstrains: [ number, number ];
  heightConstrains: [ number, number ];
}

export interface ResizeState {
  i?: string | symbol;
  x: number;
  y: number;
  h: number;
  w: number;
  resizing: boolean;
  lastX: number;
  lastY: number;
  originPosition?: Position;
  originLayout?: Pick<LayoutItem, 'x' | 'y' | 'w' | 'h'>;
  resizingPosition?: Position;
  resizingLayout?: Pick<LayoutItem, 'x' | 'y' | 'w' | 'h'>;
}

export default class Resizer extends PureComponent<ResizeableProps, ResizeState> {

  static derivedStateFromProps(props: ResizeableProps) {
    return {
      i: props.i,
      w: props.w,
      h: props.h,
      x: props.x,
      y: props.y,
    };
  }

  state: ResizeState = {
    ...Resizer.derivedStateFromProps(this.props),
    lastX: 0,
    lastY: 0,
    resizing: false,
  };
  // a poll implement of static getDerivedStateFromProps
  componentWillReceiveProps(nextProps: ResizeableProps) {
    this.setState(state => ({ ...state, ...Resizer.derivedStateFromProps(nextProps) }))
  }

  resizeHandler = (handlerName: keyof ResizeCallbacks<any>, axisOptions: AxisOpt) => {
    return (e: DraggerEvent, data: DraggableData) => {
      const { i, calcPosition, calcWH, widthConstrains, heightConstrains } = this.props;
      let { x, y, w, h } = this.props;
      const {
        deltaX,
        deltaY,
        lastX,
        lastY,
        x: cX,
        y: cY,
       } = data;
       let layout = { x, y, w, h };

       let size;
       if (handlerName === 'onResizeStart') {
        const position = calcPosition(x, y, w, h);
        size = position;
        this.setState({
          lastX,
          lastY,
          originLayout: layout,
          originPosition: calcPosition(x, y, w, h),
        });
      }

      const { resizingPosition, originLayout, resizingLayout, originPosition } = this.state;
      if (handlerName === 'onResize' && originLayout && originPosition && resizingPosition && resizingLayout) {
        const { direction } = axisOptions;
        let {
          x: resizingX,
          // w: resizingW,
          y: resizingY,
          // h: resizingH,
        } = resizingLayout;


        let width = resizingPosition.width;
        let height = resizingPosition.height;

        if (direction[0] === -1) {
          const dx = Math.round((Math.max(cX, 0) - this.state.lastX) / this.props.colWidth) * this.props.colWidth;
          const rw = executeConstrains(originPosition.width - dx, widthConstrains);
          const right = originPosition.left + originPosition.width;
          const rx = right - rw;
          width = rw;
          resizingX = Math.round(rx / this.props.colWidth);
          x = resizingX;
        } else {
          width = executeConstrains(width + direction[0] * deltaX, widthConstrains);
        }

        if (direction[1] === -1) {
          const dy = Math.round((Math.max(cY, 0) - this.state.lastY) / this.props.rowHeight) * this.props.rowHeight;
          const rh = executeConstrains(originPosition.height - dy, heightConstrains);
          const bottom = originPosition.top + originPosition.height;
          const ry = bottom - rh;
          height = rh;
          resizingY = Math.round(ry / this.props.rowHeight);
          y = resizingY;
        } else {
          height = executeConstrains(height + direction[1] * deltaY, heightConstrains);
        }

        x = Math.max(0, x);
        y = Math.max(0, y);

        const { w: tw, h: th } = calcWH({ width, height, x, y });

        size = {
          width,
          height,
          left: Math.round(this.props.colWidth * x),
          top: Math.round(this.props.rowHeight * y),
        };

        w = tw;
        h = th;
        layout = { x, y, w: tw, h: th };
      }

      // const resizin
      this.setState({
        resizing: handlerName === 'onResizeStop' ? false : true,
        resizingPosition: handlerName === 'onResizeStop' ? undefined : size,
        resizingLayout: handlerName === 'onResizeStop' ? undefined : layout,
      });

      return this.props[handlerName](
        String(i),
        layout,
        {
          e,
          node: data.node,
        }, axisOptions);
    };
  }

  render() {
    const { draggableOpts, calcPosition, className, offsetParent } = this.props;
    const { x, y, w, h, resizing } = this.state;
    const position = calcPosition(x, y, w, h);
    const style = setTransform(position);
    const cls = classNames('react-grid-layout-resizer', className);
    return (
      <>
        { resizing ? <div className="react-grid-layout-selection-helper" /> : null }
        <div className={cls} style={style}>
          {handles.map(({ key, direction }) => <Draggable
            {...draggableOpts}
            key={`resizableHandle-${key}`}
            onStop={this.resizeHandler('onResizeStop', { key, direction })}
            onStart={this.resizeHandler('onResizeStart', { key, direction })}
            onDrag={this.resizeHandler('onResize', { key, direction })}
            offsetParent={getOffsetParent(offsetParent)}
          >
            <span className={`react-resizable-handle react-resizable-handle-${key}`} />
          </Draggable>)}
        </div>
      </>
    )
  }
}
