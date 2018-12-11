import { Position2DLabel, vec2, vec3 } from 'webgl-operate';
import { assert } from './auxiliaries';

interface LabelPositionRelation {
    label: Position2DLabel;
    position: vec2;
}

interface WeightedBipartiteEdge {
    left: number;
    right: number;
    cost: number;
}

interface LeftEdge {
    right: number;
    cost: number;
}

const compareLeftEdge = (edge: LeftEdge, otherEdge: LeftEdge): number => {
    return edge.right < otherEdge.right || (edge.right === otherEdge.right && edge.cost < otherEdge.cost) ? -1 : 1;
};

export class LabelAlignment {

    /**
     * Calculates p0.x * p1.y - p0.y * p1.x
     * @param p0
     * @param p1
     */
    private static crossProduct(p0: vec2, p1: vec2): number {
        return vec2.cross(vec3.create(), p0, p1)[2];
    }

    /**
     * Checks if border is a convex hull.
     * @param border Array of vertices describing the border
     */
    public static isConvexHull(border: Readonly<vec2[]>): boolean {
        if (border.length === 0 || border.length === 1 || border.length === 2) { return false; }
        const lines = this.pointsToLines(border);
        for (const index in lines) {
            let next: number;
            if (lines.length === Number(index) + 1) {
                next = 0;
            } else {
                next = Number(index) + 1;
            }
            if (vec2.cross(vec3.create(), lines[index], lines[next])[2] < 0) {
                return false;
            }
        }
        return true;
    }

    /**
     * Convert points to line array
     * @param points points to be converted to lines
     */
    public static pointsToLines(points: Readonly<Array<vec2>>): Array<vec2> {
        const lines: Array<vec2> = [];
        for (const index in points) {
            let next: number;
            if (points.length === Number(index) + 1) {
                next = 0;
            } else {
                next = Number(index) + 1;
            }
            lines.push(vec2.sub(vec2.create(), points[next], points[index]));
        }
        return lines;
    }

    /**
     * calculates intersection point between (p0 -> p1) and (p2 -> p3). If none is found returns undefined.
     * @param p0
     * @param p1
     * @param p2
     * @param p3
     */
    public static getLineIntersection(p0: vec2, p1: vec2, p2: vec2, p3: vec2): vec2 | undefined {
        const r = vec2.normalize(vec2.create(), vec2.sub(vec2.create(), p1, p0));
        const s = vec2.normalize(vec2.create(), vec2.sub(vec2.create(), p3, p2));

        const p = p0;
        const q = p2;

        const p2SubP0 = vec2.subtract(vec2.create(), q, p);
        const crossS12 = this.crossProduct(r, s);

        const u = this.crossProduct(p2SubP0, r) / crossS12;
        const t = this.crossProduct(p2SubP0, s) / crossS12;

        let out: vec2 | undefined;
        if (crossS12 !== 0 && 0 <= t && t <= 1 && 0 <= u && u <= 1) {
            out = vec2.scaleAndAdd(vec2.create(), p0, r, t);
        }
        return out;
    }

    /**
     * Places ports on convex hull for label placement.
     * @param border convex hull
     * @param labelcount number of label ports needed
     */
    public static calculateLabelPortsOnConvexHull(border: Readonly<Array<vec2>>, labelcount: number): Array<vec2> {
        const leftSideCount = Math.round(labelcount / 2);
        const rightSideCount = labelcount - leftSideCount;
        let maxY: number;
        let minY: number;
        let maxX: number;
        let minX: number;
        for (const i in border) {
            if (Number(i) === 0) {
                maxY = border[i][1];
                maxX = border[i][0];
                minY = border[i][1];
                minX = border[i][0];
            } else {
                maxY = Math.max(maxY!, border[i][1]);
                maxX = Math.max(maxX!, border[i][0]);
                minY = Math.min(minY!, border[i][1]);
                minX = Math.min(minX!, border[i][0]);
            }
        }
        const height = maxY - minY;
        const leftSideSpacing = height / leftSideCount;
        const rightSideSpacing = height / rightSideCount;
        const output: vec2[] = [];
        let leftHeight = minY + (leftSideSpacing / 2);
        for (let leftPoint = 0; leftPoint < leftSideCount; leftPoint++) {
            const intersections = [];
            const p0 = vec2.fromValues(minX, leftHeight);
            const p1 = vec2.fromValues(maxX, leftHeight);
            for (const i in border) {
                let next: number;
                if (Number(i) + 1 === border.length) {
                    next = 0;
                } else {
                    next = Number(i) + 1;
                }
                const intersection = this.getLineIntersection(p0, p1, border[i], border[next]);
                if (intersection) {
                    intersections.push(intersection);
                }
            }
            output.push(intersections.sort((a, b) => a[0] - b[0])[0]);
            leftHeight += leftSideSpacing;
        }
        let rightHeight = minY + (rightSideSpacing / 2);
        for (let rightPoint = 0; rightPoint < leftSideCount; rightPoint++) {
            const intersections = [];
            const p0 = vec2.fromValues(minX, rightHeight);
            const p1 = vec2.fromValues(maxX, rightHeight);
            for (const i in border) {
                let next: number;
                if (Number(i) + 1 === border.length) {
                    next = 0;
                } else {
                    next = Number(i) + 1;
                }
                const intersection = this.getLineIntersection(p0, p1, border[i], border[next]);
                if (intersection) {
                    intersections.push(intersection);
                }
            }
            output.push(intersections.sort((a, b) => b[0] - a[0])[0]);
            rightHeight += rightSideSpacing;
        }
        return output;
    }

    public static positionLabels(border: Array<vec2>, labelsAndPosition: Array<LabelPositionRelation>): void {
        if (!this.isConvexHull(border)) { throw new Error('Border is not a convex hull'); }
        const ports = this.calculateLabelPortsOnConvexHull(border, labelsAndPosition.length);
    }

    /**
     * Calculates the minimum weight perfect matching bipartite graph
     * @param edges Array containing all edges with their corresponding cost.
     * @param n Number of points on each side of the bipartite graph
     */
    public hungarianMinimumWeightPerfectMatching(edges: Array<WeightedBipartiteEdge>, n: number)
        : Array<number> {
        const leftEdges: Array<Array<LeftEdge>> = new Array(n).fill([]);

        // Initialize left edges

        const leftEdgeCounts = new Array(n).fill(0);
        const rightEdgeCounts = leftEdgeCounts.slice();

        // Check if all points are connected to any edge
        for (const edge of edges) {
            if (edge.left >= 0 && edge.left < n) {
                leftEdgeCounts[edge.left] += 1;
            }
            if (edge.right >= 0 && edge.right < n) {
                rightEdgeCounts[edge.right] += 1;
            }
        }
        for (let i = 0; i < n; i++) {
            if (leftEdgeCounts[i] === 0 || rightEdgeCounts[i] === 0) {
                throw new Error('Some points are not connected to an edge');
            }
        }

        // Add edges to leftEdges array
        for (const edge of edges) {
            if (edge.left >= 0 && edge.left < n && edge.right >= 0 && edge.right < n) {
                leftEdges[edge.left].push({
                    right: edge.right,
                    cost: edge.cost,
                });
            }
        }

        // Sort egdes and remove duplicates
        for (let i = 0; i < n; i++) {
            const costEdges = leftEdges[i];
            const filteredEdges = costEdges.sort(compareLeftEdge);
            let edgeCount = 0;
            let lastRight = -1;
            for (let j = 0; j < filteredEdges.length; j++) {
                const edge = filteredEdges[j];
                if (edge.right === lastRight) {
                    continue;
                }
                lastRight = edge.right;
                if (j !== edgeCount) {
                    filteredEdges[edgeCount] = edge;
                }
                edgeCount++;
            }
            leftEdges[i] = filteredEdges.slice(0, edgeCount);
        }

        // Node potential initialization
        const leftPotential: number[] = new Array(n);
        const rightPotential: number[] = new Array(n).fill(Number.MAX_VALUE);

        for (let i = 0; i < n; i++) {
            const costEdges = leftEdges[i];
            let smallestEdgeCost = costEdges[0].cost;
            for (let j = 1; j < costEdges.length; j++) {
                smallestEdgeCost = Math.min(costEdges[j].cost, smallestEdgeCost);
            }
            leftPotential[i] = smallestEdgeCost;
        }

        for (const edge of edges) {
            const reducedCost = edge.cost - leftPotential[edge.left];
            rightPotential[edge.right] = Math.max(rightPotential[edge.right], reducedCost);
        }

        // Tight edge initialization

        const leftTightEdgesCount: Array<number> = new Array(n).fill(0);
        for (let i = 0; i < n; i++) {
            const costEdges = leftEdges[i];
            let tightEdgeCount = 0;
            for (let j = 0; j < costEdges.length; j++) {
                const edge = costEdges[j];
                const reducedCost = edge.cost - leftPotential[i] - rightPotential[edge.right];
                if (reducedCost === 0) {
                    if (j !== tightEdgeCount) {
                        costEdges[j] = costEdges[tightEdgeCount];
                        costEdges[tightEdgeCount] = edge;
                    }
                    tightEdgeCount++;
                }
            }
            leftTightEdgesCount[i] = tightEdgeCount;
        }

        // Initial matching
        let currentMatchingCardinality = 0;
        const leftMatchedTo: Array<number> = new Array(n).fill(-1);
        const rightMatchedTo: Array<number> = leftMatchedTo.slice();

        for (let i = 0; i < n; i++) {
            const costEdges = leftEdges[i];
            for (const edge of costEdges) {
                const j = edge.right;
                if (rightMatchedTo[j] === -1) {
                    currentMatchingCardinality++;
                    rightMatchedTo[j] = i;
                    leftMatchedTo[i] = j;
                    break;
                }
            }
        }

        if (currentMatchingCardinality === n) { return leftMatchedTo; }

        // Inner loop state variables
        const rightMinimumSlack: Array<number> = new Array(n);
        const rightMinimumSlackLeftNode: Array<number> = new Array(n);
        const rightMinimumSlackEdgeIndex: Array<number> = new Array(n);
        const rightBacktrack: Array<number> = new Array(n);
        const leftSeen: Array<boolean> = new Array(n);
        let leftNodeQueue: Array<number> | undefined;

        while (currentMatchingCardinality < n) {
            // Loop state initialization
            rightMinimumSlack.fill(Number.MAX_VALUE);
            rightMinimumSlackLeftNode.fill(-1);

            leftNodeQueue = [];

            leftSeen.fill(false);
            rightBacktrack.fill(-1);

            let startingLeftNode = -1;

            // Find unmatched starting node
            let minimumTightEdges = Number.MAX_VALUE;
            for (let i = 0; i < n; i++) {
                if (leftMatchedTo[i] === -1 && leftTightEdgesCount[i] < minimumTightEdges) {
                    minimumTightEdges = leftTightEdgesCount[i];
                    startingLeftNode = i;
                }
            }

            assert(startingLeftNode !== -1, 'Something went wrong');
            assert(leftNodeQueue.length === 0, 'Something went wrong');

            leftNodeQueue.push(startingLeftNode);
            leftSeen[startingLeftNode] = true;

            let endingRightNode = -1;
            while (endingRightNode === -1) {
                // BFS until match found or no edges to follow

                while (endingRightNode === -1 && leftNodeQueue.length !== 0) {
                    const i = leftNodeQueue.shift();
                    const costEdges = leftEdges[i!];
                    for (let edgeIndex = 0; edgeIndex < leftTightEdgesCount[i!]; edgeIndex++) {
                        const edge = costEdges[edgeIndex];
                        const j = edge.right;
                        assert(edge.cost - leftPotential[i!] - rightPotential[j] >= 0, 'Something went wrong');
                        if (edge.cost > leftPotential[i!] + rightPotential[j]) {
                            leftTightEdgesCount[i!]--;
                            costEdges[edgeIndex] = costEdges[leftTightEdgesCount[i!]];
                            costEdges[leftTightEdgesCount[i!]] = edge;
                            edgeIndex--;
                            continue;
                        }

                        if (rightBacktrack[j] !== -1) {
                            continue;
                        }

                        rightBacktrack[j] = i!;
                        const matchedTo = rightMatchedTo[j];
                        if (matchedTo === -1) {
                            endingRightNode = j;
                        } else if (!leftSeen[matchedTo]) {
                            leftSeen[matchedTo] = true;
                            leftNodeQueue.push(matchedTo);
                        }
                    }

                    // Update slack values

                    if (endingRightNode === -1) {
                        const potential = leftPotential[i!];
                        for (let edgeIndex = leftTightEdgesCount[i!]; edgeIndex < costEdges.length; edgeIndex++) {
                            const edge = costEdges[edgeIndex];
                            const j = edge.right;

                            if (rightMatchedTo[j] === -1 || !leftSeen[rightMatchedTo[j]]) {
                                const reducedCost = edge.cost - potential - rightPotential[j];
                                assert(reducedCost >= 0, 'Something went wrong');

                                if (reducedCost < rightMinimumSlack[j]) {
                                    rightMinimumSlack[j] = reducedCost;
                                    rightMinimumSlackLeftNode[j] = i!;
                                    rightMinimumSlackEdgeIndex[j] = edgeIndex;
                                }
                            }
                        }
                    }
                }

                // Update node potentials to add edges, if no match found

                if (endingRightNode === -1) {
                    let minimumSlackRightNode = -1;

                    // Find minimum slack node or abort if none exists

                    let minimumSlack = Number.MAX_VALUE;

                    for (let j = 0; j < n; j++) {
                        if ((rightMatchedTo[j] === -1 || !leftSeen[rightMatchedTo[j]])
                            && rightMinimumSlack[j] < minimumSlack) {
                            minimumSlack = rightMinimumSlack[j];
                            minimumSlackRightNode = j;
                        }
                    }

                    if (minimumSlackRightNode === -1 || rightMinimumSlackLeftNode[minimumSlackRightNode] === -1) {
                        throw new Error('No matching found');
                    }

                    assert(minimumSlackRightNode !== -1, 'Something went wrong');

                    // Adjust potentials on left and right.
                    for (let i = 0; i < n; i++) {
                        if (leftSeen[i]) {
                            leftPotential[i] += minimumSlack;
                            if (leftMatchedTo[i] !== -1) {
                                rightPotential[leftMatchedTo[i]] -= minimumSlack;
                            }
                        }
                    }

                    // Downward-adjust slackness caches.
                    for (let j = 0; j < n; j++) {
                        if (rightMatchedTo[j] === -1 || !leftSeen[rightMatchedTo[j]]) {
                            rightMinimumSlack[j] -= minimumSlack;

                            if (rightMinimumSlack[j] === 0) {
                                const i = rightMinimumSlackLeftNode[j];
                                const edgeIndex = rightMinimumSlackEdgeIndex[j];

                                // Update leftEdges[i] and leftTightEdgesCount[i]

                                if (edgeIndex !== leftTightEdgesCount[i]) {
                                    const costEdges = leftEdges[i];
                                    const edge = costEdges[edgeIndex];
                                    costEdges[edgeIndex] = costEdges[leftTightEdgesCount[i]];
                                    costEdges[leftTightEdgesCount[i]] = edge;
                                }
                                leftTightEdgesCount[i]++;

                                if (endingRightNode === -1) {
                                    rightBacktrack[j] = i!;
                                    const matchedTo = rightMatchedTo[j];
                                    if (matchedTo === -1) {
                                        endingRightNode = j;
                                    } else if (!leftSeen[matchedTo]) {
                                        leftSeen[matchedTo] = true;
                                        leftNodeQueue.push(matchedTo);
                                    }
                                }
                            }
                        }
                    }

                }
            }
            currentMatchingCardinality++;

            let currentRightNode = endingRightNode;
            while (currentRightNode !== -1) {
                const currentLeftNode = rightBacktrack[currentRightNode];
                const nextRightNode = leftMatchedTo[currentLeftNode];

                rightMatchedTo[currentRightNode] = currentLeftNode;
                leftMatchedTo[currentLeftNode] = currentRightNode;

                currentRightNode = nextRightNode;
            }
        }
        return leftMatchedTo;
    }
}
