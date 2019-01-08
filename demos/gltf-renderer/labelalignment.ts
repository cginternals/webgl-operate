import { vec2, vec3 } from 'webgl-operate';
import { computeMunkres } from './hungarian';

/**
 * Calculates p0.x * p1.y - p0.y * p1.x
 * @param p0
 * @param p1
 */
const crossProduct = (p0: vec2, p1: vec2): number => {
    return vec2.cross(vec3.create(), p0, p1)[2];
};

/**
 * Checks if border is a convex hull.
 * @param border Array of vertices describing the border
 */
const isConvexHull = (border: Readonly<vec2[]>): boolean => {
    if (border.length === 0 || border.length === 1 || border.length === 2) { return false; }
    const lines = pointsToLines(border);
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
};

/**
 * Convert points to line array
 * @param points points to be converted to lines
 */
const pointsToLines = (points: Readonly<Array<vec2>>): Array<vec2> => {
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
};

/**
 * calculates intersection point between (p0 -> p1) and (p2 -> p3). If none is found returns undefined.
 * @param p0
 * @param p1
 * @param p2
 * @param p3
 */
const getLineIntersection = (p0: vec2, p1: vec2, p2: vec2, p3: vec2): vec2 | undefined => {
    const line1 = vec2.sub(vec2.create(), p0, p1);
    const line2 = vec2.sub(vec2.create(), p2, p3);
    const crossLines = crossProduct(line1, line2);
    if (crossLines === 0) { return; }
    const p = crossProduct(p0, p1);
    const q = crossProduct(p2, p3);
    const outx = ((p * (p2[0] - p3[0])) - (q * (p0[0] - p1[0]))) / crossLines;
    const outy = ((p * (p2[1] - p3[1])) - (q * (p0[1] - p1[1]))) / crossLines;
    return vec2.fromValues(outx, outy);
};

/**
 * Places ports on convex hull for label placement.
 * @param border convex hull
 * @param labelcount number of label ports needed
 */
const calculateLabelPortsOnConvexHull = (border: Readonly<Array<vec2>>, labelcount: number): Array<vec2> => {
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
        const intersections: vec2[] = [];
        const p0 = vec2.fromValues(minX - 1, leftHeight);
        const p1 = vec2.fromValues(maxX + 1, leftHeight);
        for (let i = 0; i < border.length; i++) {
            const intersection = getLineIntersection(p0, p1, border[i],
                border[i + 1 === border.length ? 0 : i + 1]);
            if (intersection) { intersections.push(intersection); }
        }
        output.push(intersections.sort((a, b) => a[0] - b[0])[0]);
        leftHeight += leftSideSpacing;
    }
    let rightHeight = minY + (rightSideSpacing / 2);
    for (let rightPoint = 0; rightPoint < rightSideCount; rightPoint++) {
        const intersections: vec2[] = [];
        const p0 = vec2.fromValues(minX - 1, rightHeight);
        const p1 = vec2.fromValues(maxX + 1, rightHeight);
        for (let i = 0; i < border.length; i++) {
            const intersection = getLineIntersection(p0, p1, border[i],
                border[i + 1 === border.length ? 0 : i + 1]);
            if (intersection) { intersections.push(intersection); }
        }
        output.push(intersections.sort((a, b) => b[0] - a[0])[0]);
        rightHeight += rightSideSpacing;
    }
    return output;
};

const positionLabels = (border: Array<vec2>, labelPosition: vec2[]): vec2[] => {
    if (!isConvexHull(border)) { throw new Error('Border is not a convex hull'); }
    const ports = calculateLabelPortsOnConvexHull(border, labelPosition.length);
    const hungarianInput: number[][] = [];
    for (let i = 0; i < labelPosition.length; i++) {
        const position = labelPosition[i];
        hungarianInput[i] = [];
        for (let j = 0; j < ports.length; j++) {
            const port = ports[j];
            const cost = vec2.dist(position, port);
            hungarianInput[i][j] = cost;
        }
    }
    const result = computeMunkres(hungarianInput);

    const outputPosition: vec2[] = new Array(result.length);
    for (const position of result) {
        outputPosition[position[0]] = ports[position[1]];
    }
    return outputPosition;
};

export { positionLabels };
