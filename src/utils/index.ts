import ReactDOM from 'react-dom';
import { MousePosition } from '../components/Selection';
import { GridRect } from '../model/LayoutState';

export interface Position {
  left: number,
  top: number,
  width: number,
  height: number,
};

export function noop() { return; }
export type OffsetParent = HTMLElement | Document | (() => HTMLElement | null);

export function isEqual<T extends {}>(value: T | undefined, other: T | undefined) {
  if (value === other) {
    return true;
  }

  if (!value || !other) {
    if (!value && !other) {
      return true;;
    }
    return false
  }

  if (Object.keys(value).length !== Object.keys(other).length) {
    return false;
  }

  for (const key in value) {
    if (value.hasOwnProperty(key)) {
      if (!other.hasOwnProperty(key)) {
        return false;
      }

      if (value[key] !== other[key]) {
        return false;
      }
    }
  }

  return true;
}

export function classNames(...args: Array<string | {} | undefined>): string {
  const cls: string[] = [];
  for (const arg of args) {
    if (typeof arg === 'string') {
      cls.push(arg);
    } else if (Array.isArray(arg)) {
      cls.push(classNames(...arg));
    } else if (typeof arg === 'object') {
      for (const key in arg) {
        if (arg.hasOwnProperty(key) && arg[key]) {
          cls.push(key);
        }
      }
    }
  }

  return cls.join(' ');
}

export function setTransform({ top, left, width, height }: Position, z: number = 1): {} {
  // Replace unitless items with px
  const translate = `translate(${left}px,${top}px)`;
  return {
    transform: translate,
    WebkitTransform: translate,
    MozTransform: translate,
    msTransform: translate,
    OTransform: translate,
    width: `${width}px`,
    height: `${height}px`,
    position: "absolute",
    zIndex: z,
  };
}

export function getTouchIdentifier(e: Pick<TouchEvent, 'targetTouches' | 'changedTouches'>): number {
  if (e.targetTouches && e.targetTouches[0]) {
    return e.targetTouches[0].identifier;
  }
  if (e.changedTouches && e.changedTouches[0]) {
    return e.changedTouches[0].identifier;
  }

  return 0;
}

export interface ArrayLike<T> {
  [index: number]: T;
  length: number;
}

function findInArray<T>(array: ArrayLike<T>, iter: (i: T) => boolean): T | null {
  for (let i = 0; i < array.length; i++) {
    if (iter(array[i])) {
      return array[i];
    }
  }
  return null;
}

export function getTouch(e: TouchEvent, identifier: number): { clientX: number, clientY: number } | null {
  return (e.targetTouches && findInArray(e.targetTouches, t => identifier === t.identifier)) ||
         (e.changedTouches && findInArray(e.changedTouches, t => identifier === t.identifier));
}

function getOwnerDocument(ele?: HTMLElement | Document) {
  return ele && ele.ownerDocument && ele.ownerDocument.body || document.body
}

export function getControlPosition<T extends React.Component<{ offsetParent?: OffsetParent }>>(
  e: TouchEvent,
  identifier: number,
  t: T,
) {
  const touchObj = typeof identifier === 'number' ? getTouch(e, identifier) : null;
  const node = ReactDOM.findDOMNode(t) as HTMLElement;

  return offsetXYFromParent(
    touchObj || e as any,
    t.props.offsetParent || getOwnerDocument(node),
  );
}

export function getOffsetParent(offsetParent?: OffsetParent): HTMLElement {
  if (typeof offsetParent === 'function') {
    return offsetParent() || document.body;
  }
  return getOwnerDocument(offsetParent);
}

export function offsetXYFromParent(
  evt: { clientX: number, clientY: number },
  accesor?: OffsetParent,
) {

  const offsetParent = getOffsetParent(accesor);
  const isBody = offsetParent === (offsetParent.ownerDocument && offsetParent.ownerDocument.body);
  const offsetParentRect = isBody ? {left: 0, top: 0} : offsetParent.getBoundingClientRect();

  const x = evt.clientX + offsetParent.scrollLeft - offsetParentRect.left;
  const y = evt.clientY + offsetParent.scrollTop - offsetParentRect.top;

  return { x, y };
}

export function getRectFromPoints(start: MousePosition, end: MousePosition, colWidth: number): GridRect {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const right = Math.max(start.x, end.x);
  const bottom = Math.max(start.y, end.y);

  return {
    x: Math.floor(x / colWidth),
    y: Math.floor(y / colWidth),
    right: Math.ceil(right / colWidth),
    bottom: Math.ceil(bottom / colWidth),
  };
}

export function executeConstrains(size: number, constraints: [ number, number ]) {
  return Math.min(
      Math.max(size, constraints[0]),
      constraints[1],
  );
}