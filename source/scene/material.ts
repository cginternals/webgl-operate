
import { Context } from '../context';

export abstract class Material {

    protected _context: Context;
    protected _name: string;

    constructor(context: Context, name: string) {
        this._context = context;
        this._name = name;
    }

    get name(): string {
        return this._name;
    }
}
