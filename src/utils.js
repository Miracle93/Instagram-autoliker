export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function getRandomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generatorBind(context, fn) {
  // eslint-disable-next-line prefer-rest-params
  const args = [context].concat([].slice.call(arguments, 2));

  return function* () {
    const iter = fn.apply(context, args.slice(1));

    for (const i of iter) {
      yield i;
    }
  };
}
