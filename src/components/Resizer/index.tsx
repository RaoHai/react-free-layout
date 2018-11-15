import React, { PureComponent } from 'react';
import { OffsetParent, setTransform } from '../../utils/index';
import { DraggableCore, DraggableData } from 'react-draggable';
import { Position } from '../GridItem';
import classnames from 'classnames';
import { LayoutItem } from '../Layout';

export interface AxisOpt {
  key: string;
  direction: [-1 | 0 | 1, -1 | 0 | 1];
}

export type ResizeProps = Pick<LayoutItem, 'x' | 'y' | 'w' | 'h'>;
export type CallbackItem = { e: MouseEvent | React.SyntheticEvent<MouseEvent>; node: DraggableData['node']; size: Position };
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
  e: MouseEvent | React.SyntheticEvent<MouseEvent>;
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
  offsetParent?: OffsetParent | null;
  draggableOpts?: {}
  calcPosition: (...args: any) => Position;
  calcWH: (...args: any) => { w: number, h: number };
  colWidth: number;
  rowHeight: number;
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
  state: ResizeState = {
    ...Resizer.derivedStateFromProps(this.props),
    lastX: 0,
    lastY: 0,
    resizing: false,
  };

  static derivedStateFromProps(props: ResizeableProps) {
    return {
      i: props.i,
      w: props.w,
      h: props.h,
      x: props.x,
      y: props.y,
    };
  }

  // a poll implement of static getDerivedStateFromProps
  componentWillReceiveProps(nextProps: ResizeableProps) {
    this.setState(state => ({ ...state, ...Resizer.derivedStateFromProps(nextProps) }))
  }

  resizeHandler = (handlerName: keyof ResizeCallbacks<any>, axisOptions: AxisOpt) => {
    return (e: MouseEvent | React.SyntheticEvent<MouseEvent>, data: DraggableData) => {
      let { i, x, y, w, h, calcPosition, calcWH } = this.props;
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

        const { w: _w, h: _h } = calcWH({ width, height, x, y });

        size = calcPosition(resizingX, resizingY, _w, _h, this.state);

        w = _w;
        h = _h;
        layout = { x, y, w: _w, h: _h };
      }

      // const resizin
      this.setState({
        resizing: handlerName === 'onResizeStop' ? false : true,
        resizingPosition: handlerName === 'onResizeStop' ? undefined : size,
        resizingLayout: handlerName === 'onResizeStop' ? undefined : layout,
      });

      return this.props[handlerName](
        String(i),
        { x, y, w, h },
        {
          e,
          node: data.node,
        }, axisOptions);
    };
  }

  render() {
    const { draggableOpts, calcPosition, className } = this.props;
    const { x, y, w, h, resizing } = this.state;
    const position = calcPosition(x, y, w, h);
    const style = setTransform(position);
    const cls = classnames('react-grid-layout-resizer', className);
    return (
      <>
        { resizing ? <div className="react-grid-layout-selection-helper" /> : null }
        <div className={cls} style={style}>
          {handles.map(({ key, direction }) => <DraggableCore
            {...draggableOpts}
            key={`resizableHandle-${key}`}
            onStop={this.resizeHandler('onResizeStop', { key, direction })}
            onStart={this.resizeHandler('onResizeStart', { key, direction })}
            onDrag={this.resizeHandler('onResize', { key, direction })}
            offsetParent={document.body}
          >
            <span className={`react-resizable-handle react-resizable-handle-${key}`} />
          </DraggableCore>)}
        </div>
      </>
    )
  }
}
