
import { assert, log, LogLevel } from './auxiliaries';

import { Context } from './context';
import { AbstractObject } from './object';


/**
 * WebGL shader wrapper encapsulating shader creation, compilation, and deletion. A shader can be attached to multiple
 * Programs for linking, and can be deleted if detached from all (linked) programs. The expected default behavior is to
 * create a shader, attach it to programs, and  discard is immediately after all programs are created (linked). If,
 * however, the source of a shader needs to be changed, e.g., for replacements or other modifications, the shader
 * object should be kept and, on change, all programs that have the shader attached have to be invalidated/relinked
 * manually.
 *
 * ```
 * var frag = new gloperate.Shader(context, context.gl.FRAGMENT_SHADER, 'EmptyFragmentShader');
 * var vert = new gloperate.Shader(context, context.gl.VERTEX_SHADER, 'EmptyVertexShader');
 * vert.initialize('void main() { }');
 * frag.initialize('void main() { }');
 *
 * var prog = new gloperate.Program(context, 'EmptyProgram');
 * prog.initialize([frag, vert]);
 * ```
 */
export class Shader extends AbstractObject<WebGLShader> {

    /** @see {@link type} */
    protected _type: GLenum;

    /** @see {@link source} */
    protected _source: string;

    /**
     * Map of replacement strings and the value to replace them with.
     */
    protected _replacements: undefined | Map<string, string>;


    /**
     * Object constructor, requires a context and a valid identifier.
     * @param context - Valid context to create the object for.
     * @param type - Either GL_VERTEX_SHADER or GL_FRAGMENT_SHADER.
     * @param identifier - Meaningful name for identification of this instance.
     */
    constructor(context: Context, type: GLenum, identifier?: string) {
        const gl = context.gl;
        if (identifier === undefined) {
            switch (type) {
                case context.gl.FRAGMENT_SHADER:
                    identifier = 'FragmentShader';
                    break;
                case context.gl.VERTEX_SHADER:
                    identifier = 'VertexShader';
                    break;
                default:
                    assert(false, `expected either a FRAGMENT_SHADER (${gl.FRAGMENT_SHADER}) ` +
                        `or a VERTEX_SHADER (${gl.VERTEX_SHADER}), given ${type}`);
            }
        }
        super(context, identifier);
        this._type = type;
    }

    /**
     * Creates a shader, sets the shader source, and compiles the shader. If the shader source cannot be compiled, the
     * identifier and an info log are logged to console and the shader object is deleted. Note that a '#version 300 es'
     * is added in case the shader source is compiled in a WebGL2 context.
     * @param source - Shader source.
     * @returns - Either a new shader or undefined if compilation failed.
     */
    protected create(source: string): WebGLShader | undefined {
        const gl = this._context.gl;
        this._object = gl.createShader(this._type);
        assert(this._object instanceof WebGLShader, `expected WebGLShader object to be created`);

        this._source = source;
        this.compile();
        return this._object;
    }

    /**
     * Delete the shader object. This should have the reverse effect of `create`.
     */
    protected delete(): void {
        assert(this._object !== undefined, `expected WebGLShader object`);
        this._context.gl.deleteShader(this._object);
        this._object = undefined;
        this._valid = false;
    }

    /**
     * Processes all search values and replaces them with the replace value on the source.
     * @returns The source with all replacements applied.
     */
    protected sourceWithReplacements(): string {
        if (this._replacements === undefined) {
            return this._source;
        }

        let source = this._source;
        this._replacements.forEach((replaceValue: string, searchValue: string) => {
            source = source.replace(new RegExp(searchValue, 'g'), replaceValue);
        });
        return source;
    }

    /**
     * Triggers recompilation of a shader. This is usually used internally automatically, but exposed here for leaky
     * abstraction. It should not be required to invoke this manually in most cases. The shader object is marked valid
     * iff the object is a shader object and the source compiled successfully.
     */
    compile(): void {
        const gl = this._context.gl;

        let source = this.sourceWithReplacements();
        if (this._context.isWebGL2) {
            source = `#version 300 es\n${source}`;
        }

        gl.shaderSource(this._object, source);
        gl.compileShader(this._object);

        const compiled = gl.getShaderParameter(this._object, gl.COMPILE_STATUS);
        this._valid = gl.isShader(this._object) && compiled;

        if (!compiled) {
            const infoLog: string = gl.getShaderInfoLog(this._object);
            log(LogLevel.Error, `compilation of shader '${this._identifier}' failed: ${infoLog}`);
        }
    }

    /**
     * Adds a search-replacement-pair that is processed every time the shaders is recompiled. Note that recompilation
     * has to be triggered manually. Internally, all replacments are stored as a Map of search and replacement values.
     * Thus, specifying a replacment value overrides an existing search value.
     * @param searchValue - String that is to be searched (all occurrences) and replaced by replace value.
     * @param replaceValue - The value to be used as replacement for all search value occurrences.
     */
    replace(searchValue: string, replaceValue: string): void {
        if (this._replacements === undefined) {
            this._replacements = new Map<string, string>();
        }
        this._replacements.set(searchValue, replaceValue);
    }

    /**
     * Either VERTEX_SHADER or FRAGMENT_SHADER.
     */
    get type(): GLenum {
        this.assertInitialized();
        return this._type;
    }

    /**
     * Allows to change the shader's source. Note that this will recompile the shader, but invalidation of all programs
     * this shader is attached to needs to be done manually.
     */
    set source(source: string) {
        if (this._source === source) {
            return;
        }
        this._source = source;
        this.compile();
    }

    /**
     * Read access to the shader's source (without replacements applied).
     */
    get source(): string {
        this.assertInitialized();
        return this._source;
    }

}
