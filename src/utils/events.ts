
export function persist(event: any) {
  if (event.persist && typeof event.persist === 'function') {
    event.persist();
  }
}