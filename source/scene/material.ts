
import { Context } from '../context';

export abstract class Material {

    protected _context: Context;
    protected _name: string;
    protected _isTransparent: boolean;

    constructor(context: Context, name: string) {
        this._context = context;
        this._name = name;
        this._isTransparent = false;
    }

    get name(): string {
        return this._name;
    }

    get isTransparent(): boolean {
        return this._isTransparent;
    }

    set isTransparent(val: boolean) {
        this._isTransparent = val;
    }
}
