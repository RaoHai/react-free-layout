import React, { EventHandler } from 'react';
import { getTouchIdentifier, getControlPosition } from '../utils/index';
import { TouchEvent } from '../utils/events';
import DisposableComponent from '../utils/disposable';

export interface MousePosition {
  x: number;
  y: number;
}

export interface SelectionProps {
  offsetParent?: Element;
  onSelect: (start?: MousePosition, end?: MousePosition, finished?: boolean) => void;
}

export interface SelectionState {
  dragging: boolean;
  start?: MousePosition | null;
  end?: MousePosition | null;
  touchIdentifier: number;
}

export default class Selection extends DisposableComponent<SelectionProps, SelectionState> {
  state = {
    dragging: false,
    start: null,
    end: null,
    touchIdentifier: 0,
  };

  private dragWrapper: Element | null = null;


  moveSelection: EventListener = (e: any) => {
    const { dragging, start } = this.state;
    if (!dragging || !start) {
      return;
    }

    const touchIdentifier = getTouchIdentifier(e);
    const position = getControlPosition(e, touchIdentifier, this);

    if (!position) {
      return;
    }

    if (position) {
      this.props.onSelect(start, position, true);
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
      this.props.onSelect(start, position, true);
    } else {
      this.props.onSelect(undefined, undefined, true);
    }
    this.setState({ dragging: false, start: null, end: null });

    this.removeEventListener('mousemove', this.moveSelection);
    this.removeEventListener('mouseup', this.moveSelection);

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

    this.addEventListener('mousemove', this.moveSelection);
    this.addEventListener('mouseup', this.moveSelectionStop)
  }

  drawingHandler() {
    const { dragging, start, end } = this.state;
    if (!dragging || !start || !end) {
      return null;
    }

    return <span className="drawing-handler" style={getSelectionRegion(start, end)}/>
  }

  render() {
    const { children } = this.props;
    return <>
      {this.drawingHandler()}
      {React.cloneElement(React.Children.only(children), {
        onMouseDown: this.startSelection,
        ref: (ele: Element) => this.dragWrapper = ele
      })}
    </>
  }
}

function getSelectionRegion(start: MousePosition, end: MousePosition): {} {
  return {
    left: start.x,
    top: start.y,
    width: end.x - start.x,
    height: end.y - start.y,
  };
}
