
import { assert } from 'core/common';

describe('common assert', () => {

    it('should not throw on true expression', () => {
        const message = 'never throw';
        expect(() => assert(true, message)).not.toThrow();
    });

    it('should throw on false expression', () => {
        const message = 'always throw';
        expect(() => assert(false, message)).toThrow();
    });
});


import { assert_range } from 'core/common';

describe('common assert_range', () => {

    it('should not throw on true expression', () => {
        const message = 'never throw';
        expect(() => assert_range(true, message)).not.toThrow();
    });

    it('should throw on false expression', () => {
        const message = 'always throw';
        expect(() => assert_range(false, message)).toThrow();
    });
});


import { log_if, LogLevel } from 'core/common';

describe('common log_if', () => {

    it('should not log on false expression', () => {
        console.log = jasmine.createSpy('log');
        log_if(false, LogLevel.User, 'never log');
        expect(console.log).not.toHaveBeenCalled();
    });

    it('should log on true expression', () => {
        console.log = jasmine.createSpy('log');
        log_if(true, LogLevel.User, 'always log');
        expect(console.log).toHaveBeenCalled();
    });

    it('should use the correct log level', () => {
        let output = '';
        console.log = (input) => output = input;

        log_if(true, LogLevel.User, 'log level 0');
        expect(output).toContain('[0]');

        log_if(true, LogLevel.Dev, 'log level 1');
        expect(output).toContain('[1]');

        log_if(true, LogLevel.ModuleDev, 'log level 2');
        expect(output).toContain('[2]');
    });
});


import { rand } from 'core/common';

describe('common rand', () => {

    it('should not exceed range within 1000 tests (fuzzy)', () => {
        for (let i = 0; i < 1000; ++i) {
            const value = rand(-i, +i);
            expect(value).toBeGreaterThanOrEqual(-i);
            expect(value).toBeLessThanOrEqual(+i);
        }
    });

});


import { prettyPrintBytes } from 'core/common';

describe('common prettyPrintBytes', () => {

    it('should print bytes for bytes < 1024', () => {
        expect(prettyPrintBytes(0)).toEqual('0B');
        expect(prettyPrintBytes(1023)).toEqual('1023B');
    });

    it('should print kibi bytes for bytes between 1024, 1048575', () => {
        expect(prettyPrintBytes(1024)).toEqual('1.000KiB');
        expect(prettyPrintBytes(1048575)).toEqual('1023.999KiB');
    });

});


import { bitInBitfield } from 'core/common';

describe('common bitInBitfield', () => {

    it('should detect set/unset bits in bitfield', () => {
        expect(bitInBitfield(0, 0)).toBeTruthy();

        const bits = 1 << 1 | 1 << 4;

        expect(bitInBitfield(bits, 1 << 0)).toBeFalsy();
        expect(bitInBitfield(bits, 1 << 1)).toBeTruthy();
        expect(bitInBitfield(bits, 1 << 2)).toBeFalsy();
        expect(bitInBitfield(bits, 1 << 3)).toBeFalsy();
        expect(bitInBitfield(bits, 1 << 4)).toBeTruthy();
        expect(bitInBitfield(bits, 1 << 5)).toBeFalsy();
        expect(bitInBitfield(bits, 1 << 6)).toBeFalsy();
        expect(bitInBitfield(bits, 1 << 7)).toBeFalsy();

        expect(bitInBitfield(bits, bits)).toBeTruthy();
    });

});


import { DEG2RAD, RAD2DEG } from 'core/common';

describe('common RAD2DEG and DEG2RAD', () => {

    it('should be bijective', () => {
        expect(DEG2RAD * RAD2DEG).toEqual(1.0);
    });

    it('should convert degree to radian for sample set', () => {
        expect(DEG2RAD * 45.0).toBeCloseTo(Math.PI / 4, 8);
        expect(DEG2RAD * 90.0).toBeCloseTo(Math.PI / 2, 8);
        expect(DEG2RAD * 135.0).toBeCloseTo(3 * Math.PI / 4, 8);
        expect(DEG2RAD * 180.0).toBeCloseTo(Math.PI, 8);
        expect(DEG2RAD * 225.0).toBeCloseTo(5 * Math.PI / 4, 8);
        expect(DEG2RAD * 270.0).toBeCloseTo(3 * Math.PI / 2, 8);
        expect(DEG2RAD * 315.0).toBeCloseTo(7 * Math.PI / 4, 8);
        expect(DEG2RAD * 360.0).toBeCloseTo(2 * Math.PI, 8);
    });

    it('should convert radian to degree for sample set', () => {
        expect(RAD2DEG * Math.PI / 4).toBeCloseTo(45.0, 8);
        expect(RAD2DEG * Math.PI / 2).toBeCloseTo(90.0, 8);
        expect(RAD2DEG * 3 * Math.PI / 4).toBeCloseTo(135.0, 8);
        expect(RAD2DEG * Math.PI).toBeCloseTo(180.0, 8);
        expect(RAD2DEG * 5 * Math.PI / 4).toBeCloseTo(225.0, 8);
        expect(RAD2DEG * 3 * Math.PI / 2).toBeCloseTo(270.0, 8);
        expect(RAD2DEG * 7 * Math.PI / 4).toBeCloseTo(315.0, 8);
        expect(RAD2DEG * 2 * Math.PI).toBeCloseTo(360.0, 8);
    });

});

describe('common GETparameter', () => {

    it('should return value of present parameters', () => {
        /** @todo */
    });

    it('should return undefined if parameter is not present', () => {
        /** @todo */
    });

});
