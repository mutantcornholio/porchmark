/*
  Many thanks to
  [observablehq/stdlib](https://github.com/observablehq/stdlib/tree/e9e9a6f322002fdc55a145342e393a52f6811f54)
  which distributed by ISC license
*/

import { Doc } from '../utils';
import createHtml from './html';
import createSvg from './svg';

const window = Doc.getWindow() as unknown as Window;

export const html = createHtml(window);
export const svg = createSvg(window);
