import React, { Component, isValidElement } from 'react';
import { DraggableCore, DraggableData } from 'react-draggable';
import omit from 'lodash.omit';
import { LayoutItem } from '../Layout';

export type Direction = 1 | -1 | 0;

export type AxisOpt = {
  key: string;
  direction: [ Direction, Direction ];
}

const handles: AxisOpt[] = [
  { key: 'tl', direction: [ -1, -1] },
  { key: 'tr', direction: [ -1, 1 ] },
  { key: 'bl', direction: [ 1, -1 ] },
  { key: 'br', direction: [ 1, 1  ] },
  { key: 't', direction: [ 0, -1 ] },
  { key: 'l', direction: [ -1, 0 ] },
  { key: 'r', direction: [ 1, 0 ] },
  { key: 'b', direction: [ 0, 1 ] },
];

export interface ResizeState {
  left: number;
  top: number;
  width: number;
  height: number;
  resizing: boolean;
}

export type ResizeProps = Pick<LayoutItem, 'x' | 'y' | 'w' | 'h'>;
export type CallbackItem = { e: React.SyntheticEvent<MouseEvent>; node: DraggableData['node']; size: Position };
export type ResizeCallback = (e: React.SyntheticEvent<MouseEvent>, { node, deltaX, deltaY }: any) => ResizeProps | void;

export interface ResizeCallbacks<T> {
  onResize: T;
  onResizeStart: T;
  onResizeStop: T;
}

export type ResizableProps = ResizeCallbacks<ResizeCallback> & {
  left: number;
  top: number;
  width: number;
  height: number;
  className?: string;
  draggableOpts?: {};
}

export default class Resizable extends Component<ResizableProps, ResizeState> {
  state = {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    resizing: false,
  };

  componentWillReceiveProps(nextProps: ResizableProps) {
    // If parent changes height/width, set that in our state.
    if (!this.state.resizing &&
      nextProps.width !== this.props.width || nextProps.height !== this.props.height
    ) {
      this.setState({
        width: nextProps.width,
        height: nextProps.height
      });
    }
  }

  resizeHandler = (handlerName: keyof ResizeCallbacks<ResizeCallback>, axisOptions: AxisOpt) => {
    return (e: React.SyntheticEvent<MouseEvent>, data: any) => {
      const { node, deltaX, deltaY } = data;
      const { direction } = axisOptions;

      const canDragX = direction[0] !== 0;
      const canDragY = direction[1] !== 0;

      let { left, top, width, height } = this.state

      width = canDragX ? width + direction[0] * deltaX : width;
      height = canDragY ? height + direction[1] * deltaY : height;

      if (direction[0] < 0) {
        left -= deltaX;
      }

      if (direction[1] < 0) {
        top -= deltaY;
      }
      const newState: any = {};

      if (handlerName === 'onResizeStart') {
        newState.resizing = true;
      } else if (handlerName === 'onResizeStop') {
        newState.resizing = false;
      } else {
        // Early return if no change after constraints
        if (width === this.state.width && height === this.state.height) {
          return;
        }
        newState.width = width;
        newState.height = height;
        newState.left = left;
        newState.top = top;
      }

      const hasCb = typeof this.props[handlerName] === 'function';
      if (hasCb) {
        if (e.persist && typeof e.persist === 'function') {
          e.persist();
        }
        this.setState(newState, () => this.props[handlerName](e, {
          node,
          size: { ...data, width, height },
          axis: axisOptions,
        }));
      } else {
        this.setState(newState);
      }
    };
  }

  renderDraggableCores = () => {
    const { draggableOpts } = this.props;
    return handles.map(({ key, direction }) => <DraggableCore
      {...draggableOpts}
      key={`resizableHandle-${key}`}
      onStop={this.resizeHandler('onResizeStop', { key, direction })}
      onStart={this.resizeHandler('onResizeStart', { key, direction })}
      onDrag={this.resizeHandler('onResize', { key, direction })}
      offsetParent={document.body}
    >
      <span className={`react-resizable-handle react-resizable-handle-${key}`} />
    </DraggableCore>)
  }

  render() {
    const { children: propsChildren, ...p } = this.props;
    // const children = React.Children.only(propsChildren);
    const className = p.className ? `${p.className} react-resizable` : 'react-resizable';

    const props = omit(p, [ 'onResize', 'onResizeStop', 'onResizeStart']);

    if (!propsChildren && !isValidElement(propsChildren)) {
      return null;
    }

    return cloneElement(React.Children.only(propsChildren), {
      ...props,
      className,
      children: [
        React.Children.only(propsChildren).props.children,
        this.renderDraggableCores(),
      ]
    });
  }
}


function cloneElement(element: React.ReactElement<any>, props: any): React.ReactElement<any> {
  if (props.style && element.props.style) {
    props.style = {...element.props.style, ...props.style};
  }
  if (props.className && element.props.className) {
    props.className = `${element.props.className} ${props.className}`;
  }
  return React.cloneElement(element, props);
};