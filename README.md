# Got

[![NPM version][npm-img]][npm]
[![Build Status][ci-img]][ci]
[![Coverage Status][coveralls-img]][coveralls]
[![XO code style][xo-img]][xo]


[npm-img]:         https://img.shields.io/npm/v/@tadashi/got.svg
[npm]:             https://www.npmjs.com/package/@tadashi/got
[ci-img]:          https://github.com/lagden/got/actions/workflows/nodejs.yml/badge.svg
[ci]:              https://github.com/lagden/got/actions/workflows/nodejs.yml
[coveralls-img]:   https://coveralls.io/repos/github/lagden/got/badge.svg?branch=main
[coveralls]:       https://coveralls.io/github/lagden/got?branch=main
[xo-img]:          https://img.shields.io/badge/code_style-XO-5ed9c7.svg
[xo]:              https://github.com/sindresorhus/xo


---


Request library.


## Install

```
$ npm i @tadashi/got
```


## Usage

See more examples here: https://codepen.io/lagden/pen/BaqXJPN?editors=0010

```html
<script type="module">
  import {got} from 'https://unpkg.com/@tadashi/got@{version}/src/got.js'

  const response = await got({
    endpoint: 'https://registry.npmjs.org/@tadashi/got/latest',
  })
</script>
```


## Team

[<img src="https://avatars.githubusercontent.com/u/130963?s=390" alt="Lagden" width="90">](https://github.com/lagden)


## Donate ❤️

- BTC: bc1q7famhuj5f25n6qvlm3sssnymk2qpxrfwpyq7g4


## License

MIT © [Thiago Lagden](https://github.com/lagden)
