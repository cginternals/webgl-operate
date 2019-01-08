/**
 * Introduction
 * ============
 *
 * The Munkres module provides an implementation of the Munkres algorithm
 * (also called the Hungarian algorithm or the Kuhn-Munkres algorithm),
 * useful for solving the Assignment Problem.
 *
 * Assignment Problem
 * ==================
 *
 * Let C be an n×n-matrix representing the costs of each of n workers
 * to perform any of n jobs. The assignment problem is to assign jobs to
 * workers in a way that minimizes the total cost. Since each worker can perform
 * only one job and each job can be assigned to only one worker the assignments
 * represent an independent set of the matrix C.
 *
 * One way to generate the optimal set is to create all permutations of
 * the indices necessary to traverse the matrix so that no row and column
 * are used more than once. For instance, given this matrix (expressed in
 * Python)
 *
 *  matrix = [[5, 9, 1],
 *        [10, 3, 2],
 *        [8, 7, 4]]
 *
 * You could use this code to generate the traversal indices::
 *
 *  def permute(a, results):
 *    if len(a) == 1:
 *      results.insert(len(results), a)
 *
 *    else:
 *      for i in range(0, len(a)):
 *        element = a[i]
 *        a_copy = [a[j] for j in range(0, len(a)) if j != i]
 *        subresults = []
 *        permute(a_copy, subresults)
 *        for subresult in subresults:
 *          result = [element] + subresult
 *          results.insert(len(results), result)
 *
 *  results = []
 *  permute(range(len(matrix)), results) # [0, 1, 2] for a 3x3 matrix
 *
 * After the call to permute(), the results matrix would look like this::
 *
 *  [[0, 1, 2],
 *   [0, 2, 1],
 *   [1, 0, 2],
 *   [1, 2, 0],
 *   [2, 0, 1],
 *   [2, 1, 0]]
 *
 * You could then use that index matrix to loop over the original cost matrix
 * and calculate the smallest cost of the combinations
 *
 *  n = len(matrix)
 *  minval = sys.maxsize
 *  for row in range(n):
 *    cost = 0
 *    for col in range(n):
 *      cost += matrix[row][col]
 *    minval = min(cost, minval)
 *
 *  print minval
 *
 * While this approach works fine for small matrices, it does not scale. It
 * executes in O(n!) time: Calculating the permutations for an n×x-matrix
 * requires n! operations. For a 12×12 matrix, that’s 479,001,600
 * traversals. Even if you could manage to perform each traversal in just one
 * millisecond, it would still take more than 133 hours to perform the entire
 * traversal. A 20×20 matrix would take 2,432,902,008,176,640,000 operations. At
 * an optimistic millisecond per operation, that’s more than 77 million years.
 *
 * The Munkres algorithm runs in O(n³) time, rather than O(n!). This
 * package provides an implementation of that algorithm.
 *
 * This version is based on
 * http://csclab.murraystate.edu/~bob.pilgrim/445/munkres.html
 *
 * This version was originally written for Python by Brian Clapper from the
 * algorithm at the above web site (The ``Algorithm::Munkres`` Perl version,
 * in CPAN, was clearly adapted from the same web site.) and ported to
 * JavaScript by Anna Henningsen (addaleax).
 *
 * Usage
 * =====
 *
 * Construct a Munkres object
 *
 *  var m = new Munkres();
 *
 * Then use it to compute the lowest cost assignment from a cost matrix. Here’s
 * a sample program
 *
 *  var matrix = [[5, 9, 1],
 *           [10, 3, 2],
 *           [8, 7, 4]];
 *  var m = new Munkres();
 *  var indices = m.compute(matrix);
 *  console.log(formatMatrix(matrix), 'Lowest cost through this matrix:');
 *  var total = 0;
 *  for (var i = 0; i < indices.length; ++i) {
 *    var row = indices[l][0], col = indices[l][1];
 *    var value = matrix[row][col];
 *    total += value;
 *
 *    console.log('(' + rol + ', ' + col + ') -> ' + value);
 *  }
 *
 *  console.log('total cost:', total);
 *
 * Running that program produces::
 *
 *  Lowest cost through this matrix:
 *  [5, 9, 1]
 *  [10, 3, 2]
 *  [8, 7, 4]
 *  (0, 0) -> 5
 *  (1, 1) -> 3
 *  (2, 2) -> 4
 *  total cost: 12
 *
 * The instantiated Munkres object can be used multiple times on different
 * matrices.
 *
 * Non-square Cost Matrices
 * ========================
 *
 * The Munkres algorithm assumes that the cost matrix is square. However, it's
 * possible to use a rectangular matrix if you first pad it with 0 values to make
 * it square. This module automatically pads rectangular cost matrices to make
 * them square.
 *
 * Notes:
 *
 * - The module operates on a *copy* of the caller's matrix, so any padding will
 *   not be seen by the caller.
 * - The cost matrix must be rectangular or square. An irregular matrix will
 *   *not* work.
 *
 * Calculating Profit, Rather than Cost
 * ====================================
 *
 * The cost matrix is just that: A cost matrix. The Munkres algorithm finds
 * the combination of elements (one from each row and column) that results in
 * the smallest cost. It’s also possible to use the algorithm to maximize
 * profit. To do that, however, you have to convert your profit matrix to a
 * cost matrix. The simplest way to do that is to subtract all elements from a
 * large value.
 *
 * The ``munkres`` module provides a convenience method for creating a cost
 * matrix from a profit matrix, i.e. makeCostMatrix.
 *
 * References
 * ==========
 *
 * 1. http://www.public.iastate.edu/~ddoty/HungarianAlgorithm.html
 *
 * 2. Harold W. Kuhn. The Hungarian Method for the assignment problem.
 *    *Naval Research Logistics Quarterly*, 2:83-97, 1955.
 *
 * 3. Harold W. Kuhn. Variants of the Hungarian method for assignment
 *    problems. *Naval Research Logistics Quarterly*, 3: 253-258, 1956.
 *
 * 4. Munkres, J. Algorithms for the Assignment and Transportation Problems.
 *    *Journal of the Society of Industrial and Applied Mathematics*,
 *    5(1):32-38, March, 1957.
 *
 * 5. https://en.wikipedia.org/wiki/Hungarian_algorithm
 *
 * Copyright and License
 * =====================
 *
 * Copyright 2008-2016 Brian M. Clapper
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * A very large numerical value which can be used like an integer
 * (i. e., adding integers of similar size does not result in overflow).
 */
const MAX_SIZE = (Number.MAX_SAFE_INTEGER / 2) || ((1 << 26) * (1 << 26));

/**
 * A default value to pad the cost matrix with if it is not quadratic.
 */
const DEFAULT_PAD_VALUE = 0;

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

/**
 * Calculate the Munkres solution to the classical assignment problem.
 * See the module documentation for usage.
 * @constructor
 */
class Munkres {


  private C: any;
  private rowCovered: boolean[];
  private colCovered: boolean[];
  private n: number;
  private Z0_R: number;
  private Z0_C: number;
  private marked: any;
  private path: any;

  private originalLength: number;
  private originalWidth: number;

  /**
   * Create an n×n matrix, populating it with the specific value.
   *
   * @param {Number} n Matrix dimensions
   * @param {Number} val Value to populate the matrix with
   *
   * @return {Array} An array of arrays representing the newly created matrix
   */
  private static makeMatrix(n: number, val: number): number[][] {
    const matrix: number[][] = [];
    for (let i = 0; i < n; ++i) {
      matrix[i] = [];
      for (let j = 0; j < n; ++j) {
        matrix[i][j] = val;
      }
    }

    return matrix;
  }

  /**
   * Pad a possibly non-square matrix to make it square.
   *
   * @param {Array} matrix An array of arrays containing the matrix cells
   * @param {Number} [padValue] The value used to pad a rectangular matrix
   *
   * @return {Array} An array of arrays representing the padded matrix
   */
  public static padMatrix(matrix: number[][], padValue: number): number[][] {
    padValue = padValue || DEFAULT_PAD_VALUE;

    let maxColumns = 0;
    let totalRows = matrix.length;
    let i;

    for (i = 0; i < totalRows; ++i) {
      if (matrix[i].length > maxColumns) {
        maxColumns = matrix[i].length;
      }
    }

    totalRows = maxColumns > totalRows ? maxColumns : totalRows;

    const newMatrix = [];

    for (i = 0; i < totalRows; ++i) {
      const row = matrix[i] || [];
      const newRow = row.slice();

      // If this row is too short, pad it
      while (totalRows > newRow.length) {
        newRow.push(padValue);
      }

      newMatrix.push(newRow);
    }

    return newMatrix;
  }

  constructor() {
    this.C = undefined;

    this.rowCovered = [];
    this.colCovered = [];
    this.n = 0;
    this.Z0_R = 0;
    this.Z0_C = 0;
    this.marked = undefined;
    this.path = undefined;
  }

  /**
   * For each row of the matrix, find the smallest element and
   * subtract it from every element in its row. Go to Step 2.
   */
  private step1(): number {
    for (let i = 0; i < this.n; ++i) {
      // Find the minimum value for this row and subtract that minimum
      // from every element in the row.
      const minval = Math.min.apply(Math, this.C[i]);

      for (let j = 0; j < this.n; ++j) {
        this.C[i][j] -= minval;
      }
    }

    return 2;
  }

  /**
   * Find a zero (Z) in the resulting matrix. If there is no starred
   * zero in its row or column, star Z. Repeat for each element in the
   * matrix. Go to Step 3.
   */
  private step2(): number {
    for (let i = 0; i < this.n; ++i) {
      for (let j = 0; j < this.n; ++j) {
        if (this.C[i][j] === 0 &&
          !this.colCovered[j] &&
          !this.rowCovered[i]) {
          this.marked[i][j] = 1;
          this.colCovered[j] = true;
          this.rowCovered[i] = true;
          break;
        }
      }
    }

    this.clearCovers();

    return 3;
  }

  /**
   * Cover each column containing a starred zero. If K columns are
   * covered, the starred zeros describe a complete set of unique
   * assignments. In this case, Go to DONE, otherwise, Go to Step 4.
   */
  private step3(): number {
    let count = 0;

    for (let i = 0; i < this.n; ++i) {
      for (let j = 0; j < this.n; ++j) {
        if (this.marked[i][j] === 1 && this.colCovered[j] === false) {
          this.colCovered[j] = true;
          ++count;
        }
      }
    }

    return (count >= this.n) ? 7 : 4;
  }

  /**
   * Find a noncovered zero and prime it. If there is no starred zero
   * in the row containing this primed zero, Go to Step 5. Otherwise,
   * cover this row and uncover the column containing the starred
   * zero. Continue in this manner until there are no uncovered zeros
   * left. Save the smallest uncovered value and Go to Step 6.
   */

  private step4(): number {
    const done = false;
    let row = -1;
    let col = -1;
    let starCol = -1;

    while (!done) {
      const z = this.findAZero();
      row = z[0];
      col = z[1];

      if (row < 0) {
        return 6;
      }

      this.marked[row][col] = 2;
      starCol = this.findStarInRow(row);
      if (starCol >= 0) {
        col = starCol;
        this.rowCovered[row] = true;
        this.colCovered[col] = false;
      } else {
        this.Z0_R = row;
        this.Z0_C = col;
        return 5;
      }
    }
    return -1;
  }

  /**
   * Construct a series of alternating primed and starred zeros as
   * follows. Let Z0 represent the uncovered primed zero found in Step 4.
   * Let Z1 denote the starred zero in the column of Z0 (if any).
   * Let Z2 denote the primed zero in the row of Z1 (there will always
   * be one). Continue until the series terminates at a primed zero
   * that has no starred zero in its column. Unstar each starred zero
   * of the series, star each primed zero of the series, erase all
   * primes and uncover every line in the matrix. Return to Step 3
   */
  private step5(): number {
    let count = 0;

    this.path[count][0] = this.Z0_R;
    this.path[count][1] = this.Z0_C;
    let done = false;

    while (!done) {
      const row = this.findStarInCol(this.path[count][1]);
      if (row >= 0) {
        count++;
        this.path[count][0] = row;
        this.path[count][1] = this.path[count - 1][1];
      } else {
        done = true;
      }

      if (!done) {
        const col = this.findPrimeInRow(this.path[count][0]);
        count++;
        this.path[count][0] = this.path[count - 1][0];
        this.path[count][1] = col;
      }
    }

    this.convertPath(this.path, count);
    this.clearCovers();
    this.erasePrimes();
    return 3;
  }

  /**
   * Add the value found in Step 4 to every element of each covered
   * row, and subtract it from every element of each uncovered column.
   * Return to Step 4 without altering any stars, primes, or covered
   * lines.
   */
  private step6(): number {
    const minval = this.findSmallest();

    for (let i = 0; i < this.n; ++i) {
      for (let j = 0; j < this.n; ++j) {
        if (this.rowCovered[i]) {
          this.C[i][j] += minval;
        }
        if (!this.colCovered[j]) {
          this.C[i][j] -= minval;
        }
      }
    }

    return 4;
  }

  /**
   * Find the smallest uncovered value in the matrix.
   *
   * @return {Number} The smallest uncovered value, or MAX_SIZE if no value was found
   */
  private findSmallest(): number {
    let minval = MAX_SIZE;

    for (let i = 0; i < this.n; ++i) {
      for (let j = 0; j < this.n; ++j) {
        if (!this.rowCovered[i] && !this.colCovered[j]) {
          if (minval > this.C[i][j]) {
            minval = this.C[i][j];
          }
        }
      }
    }

    return minval;
  }

  /**
   * Find the first uncovered element with value 0.
   *
   * @return {Array} The indices of the found element or [-1, -1] if not found
   */
  private findAZero(): [number, number] {
    for (let i = 0; i < this.n; ++i) {
      for (let j = 0; j < this.n; ++j) {
        if (this.C[i][j] === 0 &&
          !this.rowCovered[i] &&
          !this.colCovered[j]) {
          return [i, j];
        }
      }
    }

    return [-1, -1];
  }

  /**
   * Find the first starred element in the specified row. Returns
   * the column index, or -1 if no starred element was found.
   *
   * @param {Number} row The index of the row to search
   * @return {Number}
   */

  private findStarInRow(row: number): number {
    for (let j = 0; j < this.n; ++j) {
      if (this.marked[row][j] === 1) {
        return j;
      }
    }

    return -1;
  }

  /**
   * Find the first starred element in the specified column.
   *
   * @return {Number} The row index, or -1 if no starred element was found
   */
  private findStarInCol(col: number): number {
    for (let i = 0; i < this.n; ++i) {
      if (this.marked[i][col] === 1) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Find the first prime element in the specified row.
   *
   * @return {Number} The column index, or -1 if no prime element was found
   */

  private findPrimeInRow(row: number): number {
    for (let j = 0; j < this.n; ++j) {
      if (this.marked[row][j] === 2) {
        return j;
      }
    }

    return -1;
  }

  private convertPath(path: number[][], count: number): void {
    for (let i = 0; i <= count; ++i) {
      this.marked[path[i][0]][path[i][1]] =
        (this.marked[path[i][0]][path[i][1]] === 1) ? 0 : 1;
    }
  }

  /** Clear all covered matrix cells */
  private clearCovers(): void {
    for (let i = 0; i < this.n; ++i) {
      this.rowCovered[i] = false;
      this.colCovered[i] = false;
    }
  }

  /** Erase all prime markings */
  private erasePrimes(): void {
    for (let i = 0; i < this.n; ++i) {
      for (let j = 0; j < this.n; ++j) {
        if (this.marked[i][j] === 2) {
          this.marked[i][j] = 0;
        }
      }
    }
  }

  /**
   * Compute the indices for the lowest-cost pairings between rows and columns
   * in the database. Returns a list of (row, column) tuples that can be used
   * to traverse the matrix.
   *
   * **WARNING**: This code handles square and rectangular matrices.
   * It does *not* handle irregular matrices.
   *
   * @param {Array} costMatrix The cost matrix. If this cost matrix is not square,
   *                            it will be padded with DEFAULT_PAD_VALUE. Optionally,
   *                            the pad value can be specified via options.padValue.
   *                            This method does *not* modify the caller's matrix.
   *                            It operates on a copy of the matrix.
   * @param {Object} [options] Additional options to pass in
   * @param {Number} [options.padValue] The value to use to pad a rectangular costMatrix
   *
   * @return {Array} An array of ``(row, column)`` arrays that describe the lowest
   *                 cost path through the matrix
   */
  public compute(costMatrix: number[][], options?: { padValue: number }): Array<[number, number]> {

    const padValue = options && options.padValue ? options.padValue : DEFAULT_PAD_VALUE;

    this.C = Munkres.padMatrix(costMatrix, padValue);
    this.n = this.C.length;
    this.originalLength = costMatrix.length;
    this.originalWidth = costMatrix[0].length;

    const nfalseArray = []; /* array of n false values */
    while (nfalseArray.length < this.n) {
      nfalseArray.push(false);
    }
    this.rowCovered = nfalseArray.slice();
    this.colCovered = nfalseArray.slice();
    this.Z0_R = 0;
    this.Z0_C = 0;
    this.path = Munkres.makeMatrix(this.n * 2, 0);
    this.marked = Munkres.makeMatrix(this.n, 0);

    let step = 1;

    const steps: { [key: number]: () => number } = {
      1: this.step1,
      2: this.step2,
      3: this.step3,
      4: this.step4,
      5: this.step5,
      6: this.step6,
    };

    while (true) {
      const func = steps[step];
      if (!func) { // done
        break;
      }

      step = func.apply(this);
    }

    const results: Array<[number, number]> = [];
    for (let i = 0; i < this.originalLength; ++i) {
      for (let j = 0; j < this.originalWidth; ++j) {
        if (this.marked[i][j] === 1) {
          results.push([i, j]);
        }
      }
    }

    return results;
  }
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Create a cost matrix from a profit matrix by calling
 * 'inversionFunction' to invert each value. The inversion
 * function must take one numeric argument (of any type) and return
 * another numeric argument which is presumed to be the cost inverse
 * of the original profit.
 *
 * This is a static method. Call it like this:
 *
 *  costMatrix = makeCostMatrix(matrix[, inversion_func]);
 *
 * For example:
 *
 *  costMatrix = makeCostMatrix(matrix, function(x) { return MAXIMUM - x; });
 *
 * @param {Array} profitMatrix An array of arrays representing the matrix
 *                              to convert from a profit to a cost matrix
 * @param {Function} [inversionFunction] The function to use to invert each
 *                                       entry in the profit matrix
 *
 * @return {Array} The converted matrix
 */
const makeCostMatrix = (profitMatrix: number[][], inversionFunction?: (x: number) => number) => {
  let i;
  let j;
  if (!inversionFunction) {
    let maximum = -1.0 / 0.0;
    for (i = 0; i < profitMatrix.length; ++i) {
      for (j = 0; j < profitMatrix[i].length; ++j) {
        if (profitMatrix[i][j] > maximum) {
          maximum = profitMatrix[i][j];
        }
      }
    }

    inversionFunction = (x: number): number => maximum - x;
  }

  const costMatrix: number[][] = [];

  for (i = 0; i < profitMatrix.length; ++i) {
    const row = profitMatrix[i];
    costMatrix[i] = [];

    for (j = 0; j < row.length; ++j) {
      costMatrix[i][j] = inversionFunction(profitMatrix[i][j]);
    }
  }

  return costMatrix;
};

/**
 * Convenience function: Converts the contents of a matrix of integers
 * to a printable string.
 *
 * @param {Array} matrix The matrix to print
 *
 * @return {String} The formatted matrix
 */
const formatMatrix = (matrix: number[][]): string => {
  const columnWidths = [];
  let i;
  let j;
  for (i = 0; i < matrix.length; ++i) {
    for (j = 0; j < matrix[i].length; ++j) {
      const entryWidth = String(matrix[i][j]).length;

      if (!columnWidths[j] || entryWidth >= columnWidths[j]) {
        columnWidths[j] = entryWidth;
      }
    }
  }

  let formatted = '';
  for (i = 0; i < matrix.length; ++i) {
    for (j = 0; j < matrix[i].length; ++j) {
      let s = String(matrix[i][j]);

      // pad at front with spaces
      while (s.length < columnWidths[j]) {
        s = ' ' + s;
      }

      formatted += s;

      // separate columns
      if (j !== matrix[i].length - 1) {
        formatted += ' ';
      }
    }

    if (i !== matrix[i].length - 1) {
      formatted += '\n';
    }
  }

  return formatted;
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

const computeMunkres = (costMatrix: number[][], options?: { padValue: number }) => {
  const m = new Munkres();
  return m.compute(costMatrix, options);
};

export { computeMunkres, makeCostMatrix, formatMatrix };
