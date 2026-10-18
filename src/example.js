// Placeholder module so the CI skeleton has something to lint, typecheck, and
// cover. /bootstrap deletes it once the real vertical slices exist.

const DEFAULT_TEMPLATE = "Hello, {name}!";

/**
 * @param {string} name
 * @param {{ template?: unknown }} [options] template must contain `{name}`
 * @returns {string}
 */
export function greet(name, options) {
  if (typeof name !== "string" || name.trim() === "") {
    throw new TypeError("name must be a non-empty string");
  }
  // Only undefined falls back to the default; null is a non-string and throws.
  const template = options?.template === undefined ? DEFAULT_TEMPLATE : options.template;
  if (typeof template !== "string" || !template.includes("{name}")) {
    throw new TypeError("template must be a string containing {name}");
  }
  // Replacer function so "$" sequences in the name are not interpreted.
  return template.replaceAll("{name}", () => name.trim());
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

/**
 * @param {string} name
 * @returns {string}
 */
export function shout(name) {
  // greet() validates and trims, and already ends in one "!".
  return greet(name).toUpperCase() + "!!";
}

/**
 * Cuts text to at most `max` characters, the single-character ellipsis (…)
 * included, so the result always fits a fixed-width slot.
 * @param {string} text
 * @param {unknown} max positive integer
 * @returns {string}
 */
export function truncate(text, max) {
  if (typeof max !== "number" || !Number.isInteger(max) || max <= 0) {
    throw new RangeError("max must be a positive integer");
  }
  if (text.length <= max) {
    return text;
  }
  return text.slice(0, max - 1) + "…";
}
