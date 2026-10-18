// Placeholder module so the CI skeleton has something to lint, typecheck, and
// cover. /bootstrap deletes it once the real vertical slices exist.

/**
 * @param {string} name
 * @returns {string}
 */
export function greet(name) {
  if (typeof name !== "string" || name.trim() === "") {
    throw new TypeError("name must be a non-empty string");
  }
  return `Hello, ${name.trim()}!`;
}

/**
 * @param {unknown} name
 * @returns {string}
 */
export function farewell(name) {
  if (typeof name !== "string" || name.trim() === "") {
    throw new TypeError("name must be a non-empty string");
  }
  return `Goodbye, ${name.trim()}!`;
}
