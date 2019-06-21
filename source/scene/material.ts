
import { Bindable } from '../bindable';
import { Program } from '../program';

export abstract class Material implements Bindable {

    protected _name: string;
    protected _program: Program;

    constructor(name: string, program: Program) {
        this._name = name;
        this._program = program;
    }

    get program(): Program {
        return this._program;
    }

    abstract bind(): void;
    abstract unbind(): void;
}
