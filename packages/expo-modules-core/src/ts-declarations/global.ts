import type { EventEmitter } from './EventEmitter';
import type { SharedObject } from './SharedObject';

/* eslint-disable no-var */

declare global {
  /**
   * Global object containing all the native bindings installed by Expo.
   * This object is not available in projects without the `expo` package installed.
   */
  var expo: {
    /**
     * Host object that is used to access native Expo modules.
     */
    modules: Record<string, any>;

    // Natively defined JS classes

    /**
     * @see EventEmitter
     */
    EventEmitter: typeof EventEmitter;

    /**
     * @see SharedObject
     */
    SharedObject: typeof SharedObject;

    // Utils

    /**
     * Generates a random UUID v4 string.
     */
    uuidv4(): string;

    /**
     * Generates a UUID v5 string representation of the value in the specified namespace.
     */
    uuidv5(name: string, namespace: string): string;

    /**
     * Returns a static view config of the native view with the given name
     * or `null` if the view has not been registered.
     */
    getViewConfig(viewName: string): ViewConfig | null;
  };
}

type ViewConfig = {
  validAttributes: Record<string, any>;
  directEventTypes: Record<string, { registrationName: string }>;
};
