import { Component } from 'react';
import { findDOMNode } from 'react-dom';

export interface Disposable {
  handler: Function;
  callback: EventListener;
}

export default class DisposableComponent<P = {}, S = {}, SS = {}> extends Component<P,S,SS> {
  protected _disposables: Disposable[] = [];

  constructor(p: P, s?: S) {
    super(p, s);
  }

  protected getThisNode():Document {
    const thisNode = findDOMNode(this);
    return thisNode && thisNode.ownerDocument || document;
  }

  protected addEventListener<T extends keyof DocumentEventMap>(
    event: T,
    callback: (ev: DocumentEventMap[T]) => void,
    options?: AddEventListenerOptions,
    target: HTMLElement | Document = this.getThisNode(),
  ) {
    target.addEventListener(event, callback, options);
    const handler = () => target.removeEventListener(event, callback);
    this._disposables.push({ handler, callback });
    return callback;
  }

  protected removeEventListener<T extends keyof DocumentEventMap>(
    event: T,
    callback: (ev: DocumentEventMap[T]) => void,
  ) {
    this._disposables = this._disposables.filter(i => {
      if (i.callback === callback) {
        i.handler();
        return true;
      }
      return false;
    });
  }

  componentWillUnmount() {
    this._disposables.forEach(i => i.handler());
    this._disposables.length = 0;
  }

}