import React from 'react';
import ReactDOM from 'react-dom';
import { getTouchIdentifier, getControlPosition, noop, OffsetParent, getOffsetParent, setTransform, Position } from '../utils';
import DisposableComponent from '../utils/disposable';

export type TouchEvent = React.SyntheticEvent<React.TouchEvent> | Event;
export interface ReactTouchEvent extends React.TouchEvent<HTMLElement> {};
export interface MousePosition {
  x: number;
  y: number;
}

export interface SelectionProps {
  offsetParent?: OffsetParent;
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
  private wrapperRef = React.createRef<HTMLDivElement>();
  private childRef = React.createRef<React.Component<any>>();

  constructor(props: SelectionProps) {
    super(props);
    this.state = {
      dragging: false,
      start: null,
      end: null,
      touchIdentifier: 0,
    }
  }

  startSelection: React.MouseEventHandler<HTMLElement> = e => {
    if (
      e.target !== this.wrapperRef.current &&
      (!this.childRef.current || e.target !== ReactDOM.findDOMNode(this.childRef.current)) &&
      e.target !== getOffsetParent(this.props.offsetParent)
    ) {
      return;
    }
    const touchIdentifier = getTouchIdentifier(e as any);
    const position = getControlPosition(e as any, touchIdentifier, this);
    this.setState({
      dragging: true,
      touchIdentifier,
      start: position,
    });

    this.props.onSelectStart();

    this.addEventListener('mousemove', this.moveSelection);
    this.addEventListener('touchmove', this.moveSelection);
    this.addEventListener('mouseup', this.moveSelectionStop)
    this.addEventListener('touchend', this.moveSelectionStop);
  }

  moveSelection: EventListener = (e: any) => {
    const { dragging, start } = this.state;
    if (!dragging || !start) {
      return;
    }

    const touchIdentifier = getTouchIdentifier(e);
    const position = getControlPosition(e, touchIdentifier, this);
    this.props.onSelect(start, position);

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
    this.props.onSelectEnd(start, position);
    this.setState({ dragging: false, start: null, end: null });

    this.removeEventListener('mousemove', this.moveSelection);
    this.removeEventListener('touchmove', this.moveSelection);
    this.removeEventListener('mouseup', this.moveSelectionStop);
    this.removeEventListener('touchend', this.moveSelectionStop);
  }

  drawingHandler() {
    const { dragging, start, end } = this.state;
    if (!dragging || !start || !end) {
      return null;
    }

    return <div className="react-grid-layout-selection-helper">
      <span
        key="drawing-hanlder"
        className="drawing-handler"
        style={setTransform(getSelectionRegion(start, end))}
      />
    </div>;
  }

  render() {
    const { children, style } = this.props;
    const onlyChild = React.Children.only(children);
    return <div
      className="react-grid-layout-selection-wrapper"
      style={{ ...style, position: 'relative' }}
      ref={this.wrapperRef}
      onMouseDown={this.startSelection}
    >
      {React.cloneElement(onlyChild, {
        onMouseDown: this.startSelection,
        onTouchStart: this.startSelection,
        ref: this.childRef
      })}
      {this.drawingHandler()}
    </div>
  }
}

function getSelectionRegion(start: MousePosition, end: MousePosition): Position {
  return {
    left: Math.min(start.x, end.x),
    top: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}
