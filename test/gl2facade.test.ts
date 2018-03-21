
import * as chai from 'chai';
import * as spies from 'chai-spies';
import * as sinon from 'sinon';

chai.use(spies);

const expect = chai.expect;
const spy = chai.spy;
const stub = sinon.stub;


/* tslint:disable:no-unused-expression */

describe('gl2facade', () => {

    it('should support ArrayBufferViews for texImage2D in Webgl1', () => {
        /** @todo wait for context in tests */
    });

});
