// rexreplace: the parts of utils.js of regex 6.1.0 that subroutines.js uses, copied as they are
import {Context, forEachUnescaped} from 'regex-utilities';

const namedCapturingDelim = String.raw`\(\?<(?![=!])(?<captureName>[^>]+)>`;
const capturingDelim = String.raw`\((?!\?)(?!(?<=\(\?\()DEFINE\))|${namedCapturingDelim}`;

/**
@param {string} expression
@returns {number}
*/
function countCaptures(expression) {
  let num = 0;
  forEachUnescaped(expression, capturingDelim, () => num++, Context.DEFAULT);
  return num;
}

export {
  capturingDelim,
  countCaptures,
  namedCapturingDelim,
};
