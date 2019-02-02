import React, { Ref, isValidElement } from 'react';
import ReactDOM from 'react-dom';
import { getTouchIdentifier, getControlPosition, noop, OffsetParent, getOffsetParent, setTransform, Position, offsetXYFromParent } from '../utils';
import DisposableComponent from '../utils/disposable';

export type TouchEvent = React.SyntheticEvent<React.TouchEvent> | Event;
export interface ReactTouchEvent extends React.TouchEvent<HTMLElement> {};
export interface MousePosition {
  x: number;
  y: number;
}

export interface SelectionProps {
  offsetParent?: OffsetParent;
  forwardRef?: Ref<HTMLElement>;
  style?: {};
  mounted?: boolean;
  onSelect: (start?: MousePosition, end?: MousePosition) => void;
  onSelectStart: () => void;
  onSelectEnd: (start?: MousePosition, end?: MousePosition) => void;
  children: JSX.Element[] | JSX.Element;
}

export interface SelectionState {
  dragging: boolean;
  start?: MousePosition | null;
  startOffset?: MousePosition | null;
  end?: MousePosition | null;
  endOffset?: MousePosition | null;
  touchIdentifier: number;
}

export class Selection extends DisposableComponent<SelectionProps, SelectionState> {
  static defaultProps = {
    onSelectStart: noop,
    onSelectEnd: noop,
    onSelect: noop,
  }
  private wrapperRef = React.createRef<HTMLDivElement>();

  constructor(props: SelectionProps) {
    super(props);
    this.state = {
      dragging: false,
      start: null,
      startOffset: null,
      end: null,
      endOffset: null,
      touchIdentifier: 0,
    }
  }

  startSelection: React.MouseEventHandler<HTMLElement> = e => {
    if (
      e.target !== this.wrapperRef.current &&
      e.target !== getOffsetParent(this.props.offsetParent)
    ) {
      return;
    }

    const touchIdentifier = getTouchIdentifier(e as any);
    const position = getControlPosition(e as any, touchIdentifier, this);
    const offsetPosition = offsetXYFromParent(e, ReactDOM.findDOMNode(this) as HTMLElement);
    this.setState({
      dragging: true,
      touchIdentifier,
      start: position,
      startOffset: offsetPosition,
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
    const offsetPosition = offsetXYFromParent(e, ReactDOM.findDOMNode(this) as HTMLElement);

    this.props.onSelect(start, position);

    this.setState({
      touchIdentifier,
      end: position,
      endOffset: offsetPosition,
    });
  }

  moveSelectionStop: EventListener = (e: any) => {
    const { dragging, touchIdentifier, start } = this.state;
    if (!dragging || !start) {
      return;
    }

    const position = getControlPosition(e, touchIdentifier, this);
    this.props.onSelectEnd(start, position);
    this.setState({ dragging: false, start: null, end: null, startOffset: null, endOffset: null });

    this.removeEventListener('mousemove', this.moveSelection);
    this.removeEventListener('touchmove', this.moveSelection);
    this.removeEventListener('mouseup', this.moveSelectionStop);
    this.removeEventListener('touchend', this.moveSelectionStop);
  }

  drawingHandler() {
    const { dragging, startOffset, endOffset } = this.state;
    if (!dragging || !startOffset || !endOffset) {
      return null;
    }

    return this.props.mounted ? <div className="react-grid-layout-selection-helper">
      <span
        key="drawing-hanlder"
        className="drawing-handler"
        style={setTransform(getSelectionRegion(startOffset, endOffset, this))}
      />
    </div> : null;
  }

  render() {
    const { children, style } = this.props;
    const onlyChild = React.Children.only(children);
    if (!isValidElement(onlyChild)) {
      return;
    }
    return <div
      className="react-grid-layout-selection-wrapper"
      data-role="selection"
      style={{ ...style, position: 'relative' }}
      ref={this.wrapperRef}
      onMouseDown={this.startSelection}
    >
      {React.cloneElement(onlyChild as React.ReactElement<any>, {
        ref: this.props.forwardRef,
        onMouseDown: this.startSelection,
        onTouchStart: this.startSelection,
      })}
      {this.drawingHandler()}
    </div>
  }
}

export default React.forwardRef<HTMLElement, SelectionProps>(
  (props, ref) => <Selection {...props} forwardRef={ref} />);

function getSelectionRegion(
  start: MousePosition,
  end: MousePosition,
  t: Selection,
): Position {

  return {
    left: Math.min(start.x, end.x),
    top: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}
