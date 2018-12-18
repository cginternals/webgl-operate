import { vec2, vec3 } from 'webgl-operate';
import { computeMunkres } from './hungarian';

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

    public static positionLabels(border: Array<vec2>, labelPosition: vec2[]): vec2[] {
        if (!this.isConvexHull(border)) { throw new Error('Border is not a convex hull'); }
        const ports = this.calculateLabelPortsOnConvexHull(border, labelPosition.length);
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
    }
}
