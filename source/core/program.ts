
import { assert, log_if, LogLevel } from './auxiliaries';

import { Bindable } from './bindable';
import { Initializable } from './initializable';
import { AbstractObject } from './object';
import { Shader } from './shader';


/**
 * WebGL Program wrapper encapsulating program creation, shader attachment, linking, binding, as well as attribute and
 * uniform location retrieval. A program is intended to be used as follows:
 * ```
 * this.program.initialize(
 *  [('screenaligned.vert', require('../shaders/screenaligned.vert'))],
 *  [('blit.frag', require('../shaders/blit.frag'))]);
 *
 * this.a_vertex = this.program.attribute('a_vertex');
 * const u_texture = this.program.uniform('u_texture');
 *
 * this.program.bind();
 * gl.uniform1i(u_texture, 0);
 * // ... draw
 * this.program.unbind();
 * ```
 */
export class Program extends AbstractObject<WebGLProgram> implements Bindable {

    /**
     * Default program, e.g., used for unbind.
     */
    static readonly DEFAULT_PROGRAM = undefined;


    /**
     * Attaches and references all given shaders. Attach is expected to be called once within creation of a Program.
     * Shaders that are not initialized will be skipped/not attached.
     * @param shaders - All shaders to be attached to the program for linking.
     * @returns - True if attaching all shaders and linking succeeded, false otherwise.
     */
    protected attach(shaders: Array<Shader>): boolean {
        assert(this._object !== undefined, `expected a WebGLProgram object`);
        const gl = this._context.gl;

        for (const shader of shaders) {
            if (!shader.initialized) {
                log_if(true, LogLevel.Dev, `shader '${shader.identifier}' not initialized.`);
                continue;
            }
            gl.attachShader(this._object, shader.object);
            shader.ref();
        }
        return true;
    }

    /**
     * Links the program with all its already attached shaders. If linking fails, a developer log with additional
     * information is provided.
     * @returns - True if linking the program succeeded, false otherwise.
     */
    protected link(): boolean {
        assert(this._object !== undefined, `expected WebGLProgram object`);
        const gl = this._context.gl;

        gl.linkProgram(this._object);

        if (!gl.getProgramParameter(this._object, gl.LINK_STATUS)) {
            const infoLog: string = gl.getProgramInfoLog(this._object);
            log_if(true, 1, `linking of program '${this._identifier}' failed: '${infoLog}'`);
            return false;
        }
        return true;
    }

    /**
     * Detaches all shaders from the program. For now, expected to be called after successful linking/program creation.
     * @param shaders - Shaders that are to be deleted.
     */
    protected detach(shaders: Array<Shader>): void {
        assert(this._object !== undefined, `expected WebGLProgram object`);
        const gl = this._context.gl;

        for (const shader of shaders) {
            assert(shader.initialized, `expected shader '${shader.identifier}' to be initialized`);
            gl.detachShader(this._object, shader.object);
            shader.unref();
        }
    }

    /**
     * Creates a WebGLProgram object and attaches, and references all shaders to it. The program is then linked. All
     * shaders have to be initialized in order to be attached and at least on vertex and one fragment shader has to be
     * present.
     * @param shaders - Vertex and fragment shaders that are to be attached to the program.
     * @returns - Either a new program or undefined if linking failed or one of the shaders is invalid/not compiled.
     */
    protected create(shaders: Array<Shader>): WebGLProgram | undefined {
        const gl = this._context.gl;

        let numVertShaders = 0;
        let numFragShaders = 0;

        for (const shader of shaders) {
            switch (shader.type) {
                case gl.VERTEX_SHADER:
                    ++numVertShaders;
                    break;
                case gl.FRAGMENT_SHADER:
                    ++numFragShaders;
                    break;
                default:
                    assert(false, `Unknown shader type detected.`);
                    break;
            }
        }
        log_if(numVertShaders < 1, LogLevel.Dev, `at least one vertex shader is expected`);
        log_if(numFragShaders < 1, LogLevel.Dev, `at least one fragment shader is expected`);
        if (numVertShaders < 1 || numFragShaders < 1) {
            return undefined;
        }

        this._object = gl.createProgram();
        assert(this._object instanceof WebGLProgram, `expected WebGLProgram object to be created`);

        if (!this.attach(shaders) || !this.link()) {
            this.delete();
            return undefined;
        }
        this.detach(shaders);

        this._valid = gl.isProgram(this._object);
        return this._object;
    }

    /**
     * Delete the program object on the GPU. This should have the reverse effect of `create`.
     */
    protected delete(): void {
        assert(this._object !== undefined, `expected WebGLProgram object`);
        this._context.gl.deleteProgram(this._object);
        this._object = undefined;
        this._valid = false;
    }


    /**
     * Activates this program for use.
     */
    @Initializable.assert_initialized()
    bind(): void {
        this._context.gl.useProgram(this._object);
    }

    /**
     * Deactivates this/any program for use.
     */
    @Initializable.assert_initialized()
    unbind(): void {
        this._context.gl.useProgram(Program.DEFAULT_PROGRAM);
    }


    /**
     * Requests the location of a uniform of the program.
     * @param uniform - Uniform identifier to request location of.
     */
    @Initializable.assert_initialized()
    uniform(uniform: string): WebGLUniformLocation {
        return this._context.gl.getUniformLocation(this._object, uniform);
    }

    /**
     * Requests the location of an attribute of the program.
     * @param attribute - Attribute identifier to request location of.
     * @param location - Attribute location (if WebGL2 location is used)
     * @returns - Location of the attribute (or location parameter if provided).
     */
    @Initializable.assert_initialized()
    attribute(attribute: string, location?: GLuint): GLint {
        if (this._context.isWebGL2 && location !== undefined) {
            this._context.gl.bindAttribLocation(this._object, location, attribute);
            return location as GLint;
        } else {
            return this._context.gl.getAttribLocation(this._object, attribute);
        }
    }

}
