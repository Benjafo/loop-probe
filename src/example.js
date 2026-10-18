// Placeholder module so the CI skeleton has something to lint, typecheck, and
// cover. /bootstrap deletes it once the real vertical slices exist.

const DEFAULT_TEMPLATE = "Hello, {name}!";
const HISTORY_LIMIT = 50;

/** @type {string[]} greetings returned by successful greet calls, oldest first */
const greetings = [];

/**
 * @returns {string[]} a copy of the greeting log, oldest first, at most the 50 most recent
 */
export function history() {
  return [...greetings];
}

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
  const greeting = template.replaceAll("{name}", () => name.trim());
  greetings.push(greeting);
  if (greetings.length > HISTORY_LIMIT) {
    greetings.shift();
  }
  return greeting;
}

/**
 * @param {unknown} word
 * @returns {string} the trimmed word with its first character upper-cased
 * @throws {TypeError} if word is not a string, or is empty or whitespace-only
 * @example
 * capitalize(" ada "); // "Ada"
 */
export function capitalize(word) {
  if (typeof word !== "string" || word.trim() === "") {
    throw new TypeError("word must be a non-empty string");
  }
  const trimmed = word.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
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
 * @param {unknown} text
 * @returns {number}
 */
export function countWords(text) {
  if (typeof text !== "string" || text.trim() === "") {
    throw new TypeError("text must be a non-empty string");
  }
  return text.trim().split(/\s+/).length;
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
 * @param {unknown} text
 * @returns {boolean} true when text is not a string, or is empty or whitespace only
 */
export function isBlank(text) {
  return typeof text !== "string" || text.trim() === "";
}

/**
 * @param {unknown} text
 * @returns {string} lower-cased a-z0-9 words joined by single hyphens
 * @throws {TypeError} if text is not a string, is empty or whitespace-only, or has no ASCII letters or digits
 * @example
 * slugify(" Hello, World! "); // "hello-world"
 */
export function slugify(text) {
  if (typeof text !== "string" || text.trim() === "") {
    throw new TypeError("text must be a non-empty string");
  }
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (slug === "") {
    throw new TypeError("text must contain an ASCII letter or digit");
  }
  return slug;
}

/**
 * @param {unknown} text
 * @returns {string}
 */
export function exclaim(text) {
  if (typeof text !== "string" || text.trim() === "") {
    throw new TypeError("text must be a non-empty string");
  }
  return text.trim().replace(/!+$/, "") + "!";
}
