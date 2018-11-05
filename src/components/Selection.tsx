import React, { Component, EventHandler } from 'react';
import ReactDOM from 'react-dom';
import { getTouchIdentifier, getControlPosition } from '../utils/index';
import { addEventListener, TouchEvent } from '../utils/events';

export interface SelectionProps {
  offsetParent?: Element;
}

export default class Selection extends Component<SelectionProps> {
  state = {
    dragging: false,
    start: null,
    end: null,
    touchIdentifier: null,
  };

  moveSelection: EventListener = (e: any) => {
    const touchIdentifier = getTouchIdentifier(e);
    const position = getControlPosition(e, touchIdentifier, this);
    if (!position) {
      return;
    }
    console.log('>> moveSeletion', position);
  }

  startSelection: EventHandler<TouchEvent> = e => {
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

    const thisNode = ReactDOM.findDOMNode(this);
    if (thisNode && thisNode.ownerDocument) {
      addEventListener(thisNode.ownerDocument, 'mousemove', this.moveSelection);
    }
  }


  render() {
    const { children } = this.props;
    return React.cloneElement(React.Children.only(children), {
      onMouseDown: this.startSelection,
    });
  }
}
