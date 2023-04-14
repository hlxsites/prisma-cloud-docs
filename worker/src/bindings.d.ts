import type { Environment } from "./types";

declare global {
  export interface Process {
    env: Environment;
  }

  // export const process: Process;
}

export { };