/* eslint-disable import/prefer-default-export */

/**
 * Sanitizes a string for use as class name.
 */
export function toClassName(name: string): string {
  return typeof name === 'string'
    ? name.toLowerCase().replace(/[^0-9a-z]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    : '';
}
