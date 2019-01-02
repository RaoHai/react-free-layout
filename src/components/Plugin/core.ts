import { DraggerEvent } from '../Dragger/index';

export interface Plugin<T> {
  onConstruct(layout: T, next: () => void): void;
  onEvent(layout: T, event: DraggerEvent, data: any, next: () => void): void;
  onCommand(layout: T, command: string, next: () => void): void;
}