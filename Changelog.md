# Changelog

## 2.0.0

- **Breaking:** `framesFromDom()` now only takes two arguments: a list of target elements and an options object. The `windowObject` argument has been moved into the options object, the `sourceSelector` argument got removed due to extreme uselessness.
- **Feature:** Add support for decorations.

## 1.1.0

- **Feature:** Add JSDOM compatibility. A `window` object that's not the global object can now be passed to to the main function.

## 1.0.1

- **Bugfix:** Add missing types

## 1.0.0

Initial release
