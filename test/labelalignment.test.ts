import * as chai from 'chai';
import { vec2 } from 'gl-matrix';
import { LabelAlignment } from '../source/labelalignment';
const expect = chai.expect;
const should = chai.should();


describe('LabelAlignment', () => {
    const convexHull: Readonly<vec2[]> = [vec2.fromValues(1, 0)
        , vec2.fromValues(1, 1), vec2.fromValues(0, 1), vec2.fromValues(0, 0)];
    describe('#isConvexHull', () => {
        it('should check if border is a convex hull', () => {
            expect(LabelAlignment.isConvexHull(convexHull)).to.equal(true);
        });
        it('should defer a non convex hull', () => {
            const nonConvexHull = convexHull.slice();
            nonConvexHull.push(vec2.fromValues(0.5, 0.5));
            expect(LabelAlignment.isConvexHull(nonConvexHull)).to.equal(false);
        });
        it('should defer edge cases', () => {
            expect(LabelAlignment.isConvexHull([])).to.equal(false);
            expect(LabelAlignment.isConvexHull([vec2.create()])).to.equal(false);
            expect(LabelAlignment.isConvexHull([vec2.create(), vec2.create()])).to.equal(false);
        });
    });

    describe('#getLineIntersection', () => {
        it('should defer parallel lines', () => {
            should.not.exist(LabelAlignment.getLineIntersection(vec2.fromValues(-1, 1)
                , vec2.fromValues(1, 1), vec2.fromValues(-1, -1), vec2.fromValues(1, -1)));
        });

        it('should find the correct intersection', () => {
            expect(LabelAlignment.getLineIntersection(vec2.fromValues(-1, 0)
                , vec2.fromValues(1, 0)
                , vec2.fromValues(0, -1)
                , vec2.fromValues(0, 1))).to.eql(vec2.fromValues(0, 0));
        });
    });

    describe('#calculateLabelPortsOnConvexHull', () => {
        it('should return labelcount many ports', () => {
            expect(LabelAlignment.calculateLabelPortsOnConvexHull(convexHull, 4)).to.have.lengthOf(4);
        });
        it('should calculate the right ports', () => {
            const ports = LabelAlignment.calculateLabelPortsOnConvexHull(convexHull, 2);
            expect(ports).to.eql([vec2.fromValues(0, 0.5), vec2.fromValues(1, 0.5)]);
        });
    });

    describe('#hungarianMinimumWeightPerfectMatching', () => {
        // TODO
    });
});
