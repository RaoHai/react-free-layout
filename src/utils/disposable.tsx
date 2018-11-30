import { Component } from 'react';
import { findDOMNode } from 'react-dom';

export interface Disposable {
  handler: () => any;
  callback: EventListener;
}

export default class DisposableComponent<P = {}, S = {}, SS = {}> extends Component<P,S,SS> {
  protected disposables: Disposable[] = [];

  constructor(p: P, s?: S) {
    super(p, s);
  }

  componentWillUnmount() {
    this.disposables.forEach(i => i.handler());
    this.disposables.length = 0;
  }

  protected getOwnerDocument(): Document {
    const thisNode = findDOMNode(this);
    return thisNode && thisNode.ownerDocument && thisNode.ownerDocument || document;
  }

  protected addEventListener<T extends keyof DocumentEventMap>(
    event: T,
    callback: (ev: DocumentEventMap[T]) => void,
    options?: AddEventListenerOptions,
    target: HTMLElement | Document = this.getOwnerDocument(),
  ) {
    target.addEventListener(event, callback, options);
    const handler = () => target.removeEventListener(event, callback);
    this.disposables.push({ handler, callback });
    return callback;
  }

  protected removeEventListener<T extends keyof DocumentEventMap>(
    event: T,
    callback: (ev: DocumentEventMap[T]) => void,
  ) {
    this.disposables = this.disposables.filter(i => {
      if (i.callback === callback) {
        i.handler();
        return true;
      }
      return false;
    });
  }

}