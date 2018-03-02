
import { assert, log, LogLevel } from './auxiliaries';

import { Context } from './context';
import { AbstractObject } from './object';


/**
 * WebGL shader wrapper encapsulating shader creation, compilation, and deletion. A shader can be attached to multiple
 * Programs for linking, and can be deleted if detached from all (linked) programs.
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

        if (this._context.isWebGL2) {
            source = '#version 300 es\n' + source;
        }

        gl.shaderSource(this._object, source);
        gl.compileShader(this._object);

        if (!gl.getShaderParameter(this._object, gl.COMPILE_STATUS)) {
            const infoLog: string = gl.getShaderInfoLog(this._object);
            log(LogLevel.Dev, `compilation of shader '${this._identifier}' failed: ${infoLog}`);

            this.delete();
            return undefined;
        }

        this._valid = gl.isShader(this._object);
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
     * Either VERTEX_SHADER or FRAGMENT_SHADER.
     */
    get type() {
        this.assertInitialized();
        return this._type;
    }

}
