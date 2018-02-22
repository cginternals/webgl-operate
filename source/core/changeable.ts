// /* tslint:disable:max-classes-per-file */

// import { vec2, vec3, vec4 } from 'gl-matrix';

// import { assert } from './common';


// /**
//  * An assertion expression interface. Typical instances get a value and should validate this value. If the passed value
//  * is valid, 'true' is returned, otherwise 'false'.
//  */
// export interface AssertExpression<T> { (value: T): boolean; }

// /**
//  * A template to track and communicate changes on values. It allows to be queried if the value has been changed since
//  * the last manual validation. There are specializations of Changeable for vec2, vec3, and vec4 (see below).
//  */
// export class Changeable<T> {

//     /**
//      * The actual value.
//      */
//     protected _value: T;

//     /**
//      * A flag if the value has changed since the last validation.
//      */
//     protected _changed = false;

//     /**
//      * A callback for a user-defined validator. It is called each time a new value is set or the object gets manually
//      * invalidated using 'invalidate'.
//      */
//     protected _assert: (value: T) => void;

//     /**
//      * Constructor
//      *
//      * @param expression - A callback for user-defined validation (optional)
//      * @param message - The assertion failure message (optional)
//      */
//     constructor(expression?: AssertExpression<T>, message?: string) {
//         if (expression && message) {
//             this._assert = (value: T) => assert(expression(value), `${message} | ${value}`);
//         }
//     }

//     /**
//      * Set new value. If a validation callback is set, it is called with the new value as argument. Note that the
//      * object is not invalidated if an identical value is set.
//      */
//     set value(value: T) {
//         if (this._value === value) {
//             return;
//         }

//         /**
//          * If the assertion fails, code execution should halt. If the internal state of objects is not as expected at
//          * any given time (infrequently ensured using asserts) the object state cannot be corrected since the its
//          * intended use is most certainly compromised.
//          */
//         if (this._assert) {
//             this._assert(value);
//         }

//         this._value = value;
//         this._changed = true;
//     }

//     get value(): T {
//         return this._value;
//     }

//     /**
//      * Query changed status.
//      */
//     get changed(): boolean {
//         return this._changed;
//     }

//     /**
//      * Manually invalidated object. If a validation callback is set, it is called with the new value as argument.
//      */
//     invalidate(): void {
//         this._changed = true;
//     }

//     /**
//      * Manual validation of object. The 'changed'-status is reset. This has to be called after all observers of this
//      * object had the chance to notice a change.
//      */
//     accept(): void {
//         this._changed = false;
//     }
// }


// /**
//  * Specialization of a Changeable for vec2.
//  */
// export class Changeable2 extends Changeable<vec2> {

//     constructor(expression?: AssertExpression<vec2>, message?: string) {
//         super(expression, message);
//         this._value = vec2.create();
//     }

//     set value(value: vec2) {
//         if (vec2.exactEquals(this._value, value)) {
//             return;
//         }

//         if (this._assert) {
//             this._assert(value);
//         }
//         vec2.copy(this._value, value);

//         this._changed = true;
//     }

//     get value(): vec2 {
//         return this._value;
//     }
// }

// /**
//  * Specialization of a Changeable for vec3.
//  */
// export class Changeable3 extends Changeable<vec3> {

//     constructor(expression?: AssertExpression<vec3>, message?: string) {
//         super(expression, message);
//         this._value = vec3.create();
//     }

//     set value(value: vec3) {
//         if (vec3.exactEquals(this._value, value)) {
//             return;
//         }

//         if (this._assert) {
//             this._assert(value);
//         }
//         vec3.copy(this._value, value);

//         this._changed = true;
//     }

//     get value(): vec3 {
//         return this._value;
//     }
// }

// /**
//  * Specialization of a Changeable for vec4.
//  */
// export class Changeable4 extends Changeable<vec4> {

//     constructor(expression?: AssertExpression<vec4>, message?: string) {
//         super(expression, message);
//         this._value = vec4.create();
//     }

//     set value(value: vec4) {
//         if (vec4.exactEquals(this._value, value)) {
//             return;
//         }

//         if (this._assert) {
//             this._assert(value);
//         }
//         vec4.copy(this._value, value);

//         this._changed = true;
//     }

//     get value(): vec4 {
//         return this._value;
//     }
// }
