
export interface ReactTouchEvent extends React.TouchEvent<HTMLElement> {};
export type TouchEvent = Event & ReactTouchEvent;

export function addEventListener<T>(
  target: Document,
  event: string,
  callback: EventListener,
) {
  target.addEventListener(event, callback);
  return () => { target.removeEventListener(event, callback) };
}

