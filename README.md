# broccoli-less-single

The broccoli-less-single plugin compiles `.less` files with
[less.js](https://github.com/less/less.js).

This plugin is designed to compile a single, primary input file
into a single output file, with a tree of `@import`d dependencies. This
differs from [broccoli-less](https://github.com/sindresorhus/broccoli-less/),
which compiles each `.less` file individually into a `.css` file and doesn't
support `@import`s or a single output file depending on multiple inputs.

This code is based heavily on
[broccoli-sass](https://github.com/joliss/broccoli-sass/)

## Installation

```bash
npm install --save-dev broccoli-less-single
```

## Usage

```js
var compileLess = require('broccoli-less-single');

var outputTree = compileLess(inputTrees, inputFile, outputFile, options)
```

* **`inputTrees`**: An array of trees that act as the include paths for
  less. If you have a single tree, pass `[tree]`.

* **`inputFile`**: Relative path of the main `.less` file to compile. This
  file must exist in one of the `inputTrees`.

* **`outputFile`**: Relative path of the output CSS file.

* **`options`**: A hash of options for less.

### Example

```js
var appCss = compileLess(sourceTrees, 'myapp/app.less', 'assets/app.css')
```

### `@import`-Example

```css
/* file: sub.less */
h1 {
  font-size: 200em;
}

/* =================== */

/* file: app.less */
@import "sub.less";

html, body {
  margin: 20px;
}
```

## Caching

This plugin determines whether or not to rebuild your LESS based on a stat
cache of all LESS files in `inputTrees` (that is, any file that matches
`**/*.less`. If any file in the tree has changed since your last build, it
will rebuild your LESS.

Because of this, be careful to not pass in a huge tree (i.e. a `vendor/`
folder) to `inputTrees`, as it will recursively stat the files in it on each
build.
