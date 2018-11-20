import React from 'react';
import ReactDOM from 'react-dom';
import DisposableComponent from '../../utils/disposable';
import { persist } from '../../utils/events';
import { getControlPosition, getTouchIdentifier, OffsetParent } from '../../utils/index';

export interface DraggableState {
  lastX: number;
  lastY: number;
  dragging: boolean;
  touchIdentifier: number;
}

export interface DraggableData {
  node: HTMLElement;
  x: number;
  y: number;
  deltaX: number;
  deltaY: number;
  lastX: number;
  lastY: number;
}

export type DraggerEvent = TouchEvent | MouseEvent;

export interface DraggableProps {
  offsetParent: OffsetParent;
  onStart: (e: DraggerEvent, data: DraggableData) => void;
  onDrag: (e: DraggerEvent, data: DraggableData) => void | false;
  onStop: (e: DraggerEvent, data: DraggableData) => void;
}


function createCoreData(draggable: Draggable, x: number, y: number): DraggableData {
  const { state } = draggable;
  const isStart = isNaN(state.lastX);
  const node = ReactDOM.findDOMNode(draggable) as HTMLElement;
  if (isStart) {
    return {
      node,
      x, y,
      deltaX: 0, deltaY: 0,
      lastX: x, lastY: 0,
    };
  }

  return {
    node,
    x, y,
    deltaX: x - state.lastX, deltaY: y - state.lastY,
    lastX: state.lastX, lastY: state.lastY,
  }
}

export default class Draggable extends DisposableComponent<DraggableProps, DraggableState> {
  constructor(p: DraggableProps) {
    super(p);
    this.state = {
      lastX: NaN,
      lastY: NaN,
      dragging: false,
      touchIdentifier: NaN,
    };
  }

  private handleTopDragStart = (e: DraggerEvent) => {
    const touchIdentifier = getTouchIdentifier(e as any);
    const position = getControlPosition(e as any, touchIdentifier, this);

    const draggingData = createCoreData(this, position.x, position.y);

    this.setState({
      dragging: true,
      lastX: position.x,
      lastY: position.y,
      touchIdentifier,
    }, () => {
      if (this.props.onStart) {
        persist(e);
        this.props.onStart(e, draggingData);
      }
    });

    this.addEventListener('mousemove', this.handleDrag, undefined, document);
    this.addEventListener('touchmove', this.handleDrag, undefined, document);
    this.addEventListener('mouseup', this.handleDragStop, undefined, document);
    this.addEventListener('touchend', this.handleDragStop, undefined, document);
  }

  private handleDrag = (e: DraggerEvent) => {

    const { dragging, touchIdentifier } = this.state;
    if (!dragging) {
      return;
    }

    const position = getControlPosition(e as any, touchIdentifier, this);
    const draggingData = createCoreData(this, position.x, position.y);

    this.setState({
      lastX: position.x,
      lastY: position.y,
    }, () => {
      if (this.props.onDrag) {
        persist(e);
        const dragReturn = this.props.onDrag(e, draggingData);
        if (dragReturn === false) {
          this.handleDragStop(new TouchEvent('touchend'));
        }
      }
    });
  }

  handleDragStop = (e: DraggerEvent) => {
    const { dragging, touchIdentifier } = this.state;
    if (!dragging) {
      return;
    }

    const position = getControlPosition(e as any, touchIdentifier, this);

    const draggingData = createCoreData(this, position.x, position.y);

    this.setState({
      dragging: false,
      touchIdentifier: NaN,
      lastX: NaN,
      lastY: NaN
    }, () => {
      if (this.props.onStop) {
        persist(e);
        this.props.onStop(e, draggingData);
      }
    });

    this.removeEventListener('mousemove', this.handleDrag);
    this.removeEventListener('touchmove', this.handleDragStop);
  }

  render() {
    const child = React.Children.only(this.props.children);
    return React.cloneElement(child, {
      onMouseDown: this.handleTopDragStart,
      onTouchStart: this.handleTopDragStart,
    });
  }
}

