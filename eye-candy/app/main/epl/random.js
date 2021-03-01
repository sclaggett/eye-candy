const MT = require('mersennetwister');

class DeterministicRandom {
  constructor(seed) {
    this.mt = new MT(seed);
  }

  // using Fisher and Yates
  shuffle(array) {
    let j;
    let a;
    for (let i = array.length - 1; i >= 1; i -= 1) {
      j = this.randi(0, i + 1);
      a = array[i];
      array[i] = array[j];
      array[j] = a;
    }
    return array;
  }

  // return random on [0,1)
  random() {
    return this.mt.random();
  }

  // [start,end)
  randi(start, end) {
    const range = end - start;
    // sample must be divisible by range
    const maxint = 2147483647;
    const max = maxint - (maxint % range);
    let r = this.mt.int();
    while (r > max) {
      r = this.mt.int();
    }

    return (r % range) + start;
  }

  int() {
    return this.mt.int();
  }

  // courtesy http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
  uuid() {
    const u = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      // I personally think the statement that "actual bitwise operations are
      // exceedingly rare in JS" is an insult to the intelligence of JS developers
      // but presumably it was written by a JS developer who knows better than I do.
      // Regardless, the following code is legit and the error needs to be disabled.

      /* eslint no-bitwise: 0 */
      const r = (this.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
    return u;
  }
}

exports.DeterministicRandom = DeterministicRandom;
