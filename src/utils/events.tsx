
export function addEventListener<T>(
  target: Document,
  event: string,
  callback: EventListener,
) {
  target.addEventListener(event, callback);
  return () => { target.removeEventListener(event, callback) };
}
