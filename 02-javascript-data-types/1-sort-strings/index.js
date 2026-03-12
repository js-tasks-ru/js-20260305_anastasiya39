/**
 * sortStrings - sorts array of string by two criteria "asc" or "desc"
 * @param {string[]} arr - the array of strings
 * @param {string} [param="asc"] param - the sorting type "asc" or "desc"
 * @returns {string[]}
 */
export function sortStrings(arr, param = 'asc') {
  const newArr = [...arr];

  newArr.sort((a, b) => {
    const result = a.toLowerCase().localeCompare(b.toLowerCase(), ['ru', 'en']);

    if (result !== 0) {
      return param === 'asc' ? result : -result;
    }
    
    if (a[0] === a[0].toUpperCase()) {
      return -1;
    }

    if (b[0] === b[0].toUpperCase()) {
      return 1;
    }

    return 0;
  });

  return newArr;
}
