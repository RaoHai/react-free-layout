import React, { EventHandler } from 'react';
import { getTouchIdentifier, getControlPosition, noop } from '../utils/index';
import DisposableComponent from '../utils/disposable';

export interface ReactTouchEvent extends React.TouchEvent<HTMLElement> {};
export type TouchEvent = Event & ReactTouchEvent;
export interface MousePosition {
  x: number;
  y: number;
}

export interface SelectionProps {
  offsetParent?: Element;
  style?: {};
  onSelect: (start?: MousePosition, end?: MousePosition) => void;
  onSelectStart: () => void;
  onSelectEnd: (start?: MousePosition, end?: MousePosition) => void;
}

export interface SelectionState {
  dragging: boolean;
  start?: MousePosition | null;
  end?: MousePosition | null;
  touchIdentifier: number;
}

export default class Selection extends DisposableComponent<SelectionProps, SelectionState> {
  static defaultProps = {
    onSelectStart: noop,
    onSelectEnd: noop,
    onSelect: noop,
  }
  private dragWrapper: Element | null = null;

  constructor(props: SelectionProps) {
    super(props);
    this.state = {
      dragging: false,
      start: null,
      end: null,
      touchIdentifier: 0,
    }
  }
  startSelection: EventHandler<TouchEvent> = e => {
    if (e.target !== this.dragWrapper) {
      return;
    }
    const touchIdentifier = getTouchIdentifier(e);
    const position = getControlPosition(e, touchIdentifier, this);
    if (!position) {
      return;
    }
    this.setState({
      dragging: true,
      touchIdentifier,
      start: position,
    });

    this.props.onSelectStart();

    this.addEventListener('mousemove', this.moveSelection);
    this.addEventListener('mouseup', this.moveSelectionStop)
  }

  moveSelection: EventListener = (e: any) => {
    const { dragging, start } = this.state;
    if (!dragging || !start) {
      return;
    }

    const touchIdentifier = getTouchIdentifier(e);
    const position = getControlPosition(e, touchIdentifier, this);

    if (!position || !start) {
      return;
    }

    if (position) {
      this.props.onSelect(start, position);
    }

    this.setState({
      touchIdentifier,
      end: position,
    });
  }

  moveSelectionStop: EventListener = (e: any) => {
    const { dragging, touchIdentifier, start } = this.state;
    if (!dragging || !start) {
      return;
    }

    const position = getControlPosition(e, touchIdentifier, this);
    if (position) {
      this.props.onSelectEnd(start, position);
    } else {
      this.props.onSelectEnd(undefined, undefined);
    }
    this.setState({ dragging: false, start: null, end: null });

    this.removeEventListener('mousemove', this.moveSelection);
    this.removeEventListener('mouseup', this.moveSelection);
  }

  drawingHandler() {
    const { dragging, start, end } = this.state;
    if (!dragging || !start || !end) {
      return null;
    }

    return <span className="drawing-handler" style={getSelectionRegion(start, end)}/>
  }

  render() {
    const { children, style } = this.props;
    return <div className="react-grid-layout-selectionw-wrapper" style={style}>
      {this.drawingHandler()}
      {React.cloneElement(React.Children.only(children), {
        onMouseDown: this.startSelection,
        ref: (ele: Element) => this.dragWrapper = ele
      })}
    </div>
  }
}

function getSelectionRegion(start: MousePosition, end: MousePosition): {} {
  return {
    left: Math.min(start.x, end.x),
    top: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}
