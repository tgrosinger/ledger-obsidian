/**
 * getWithDefault retrieves a value from a map, setting the map to the provided
 * default if the key does not already have a value.
 */
export const getWithDefault = <K, T>(
  m: Map<K, T>,
  key: K,
  makeDefault: () => T,
): T => {
  const val = m.get(key);
  if (val !== undefined) {
    return val;
  }

  const newVal = makeDefault();
  m.set(key, newVal);
  return newVal;
};
