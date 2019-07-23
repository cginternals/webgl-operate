
import { mat4 } from 'gl-matrix';
import { assert } from '../auxiliaries';
import { GLclampf4, GLfloat2 } from '../tuples';

import { Camera } from '../camera';
import { ChangeLookup } from '../changelookup';
import { Context } from '../context';
import { Framebuffer } from '../framebuffer';
import { Geometry } from '../geometry';
import { Initializable } from '../initializable';
import { Program } from '../program';
import { GeometryComponent } from './geometrycomponent';
import { Material } from './material';
import { SceneNode } from './scenenode';
import { SceneRenderPass } from './scenerenderpass';
import { TransformComponent } from './transformcomponent';


/**
 * This class renders a SceneNode hierarchy. It uses one single program for rendering the whole scene.
 * If different programs are necessary to render a scene, multiple SceneNodes should be used for each
 * program that is used.
 * This renderpass calls callbacks such as `updateModelTransform`, which have to be set by the renderer
 * using this renderpass.
 */
export class ForwardSceneRenderPass extends SceneRenderPass {

    /**
     * Alterable auxiliary object for tracking changes on render pass inputs and lazy updates.
     */
    protected readonly _altered = Object.assign(new ChangeLookup(), {
        any: false,
        camera: false,
    });

    /** @see {@link target} */
    protected _target: Framebuffer;

    /** @see {@link camera} */
    protected _camera: Camera;

    /** @see {@link ndcOffset} */
    protected _ndcOffset: GLfloat2;

    /** @see {@link clearColor} */
    protected _clearColor: GLclampf4;

    /** @see {@link program} */
    protected _program: Program;

    updateModelTransform: (matrix: mat4) => void;
    updateViewProjectionTransform: (matrix: mat4) => void;
    bindMaterial: (material: Material) => void;
    bindGeometry: (geometry: Geometry) => void;
    bindUniforms: () => void;

    /**
     * Creates a pass that renders a SceneNode and all of its children.
     * @param context - @todo The WebGL context for rendering the scene.
     */
    constructor(context: Context) {
        super();
        this._context = context;
    }

    @Initializable.initialize()
    initialize(): boolean {
        return true;
    }

    @Initializable.uninitialize()
    uninitialize(): void { }

    prepare(): void { }

    /**
     * @param override - If enabled, everything will be updated, regardless of tracked alterations.
     */
    @Initializable.assert_initialized()
    update(override: boolean = false): void { }

    /**
     * Triggers rendering a frame of the given hierarchy. All nodes in the hierarchy will be visited recursively
     * and rendered. If nodes contain transformations, they are applied and used for the whole subtree.
     */
    @Initializable.assert_initialized()
    frame(): void {
        assert(this._target && this._target.valid, `valid target expected`);
        assert(this._program && this._program.valid, `valid program expected`);

        assert(this.updateModelTransform !== undefined,
            `Model transform function needs to be initialized.`);
        assert(this.updateViewProjectionTransform !== undefined,
            `View Projection transform function needs to be initialized.`);
        assert(this.bindMaterial !== undefined,
            `Material binding function needs to be initialized.`);

        if (this._scene === undefined) {
            return;
        }

        const gl = this._context.gl;

        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.DEPTH_TEST);

        const size = this._target.size;
        gl.viewport(0, 0, size[0], size[1]);

        const c = this._clearColor;
        gl.clearColor(c[0], c[1], c[2], c[3]);

        this._target.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, true, false);

        this._program.bind();
        if (this.bindUniforms !== undefined) {
            this.bindUniforms();
        }
        this.renderNode(this._scene!, mat4.create());
        this._program.unbind();

        gl.cullFace(gl.BACK);
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.BLEND);
    }

    /**
     * Renders the current node and all children if there are any.
     * @param node - Node to render
     * @param transform - The transformation that should be applied to this node
     */
    renderNode(node: SceneNode, transform: mat4): void {
        assert(this.updateModelTransform !== undefined, `Model transform function needs to be initialized.`);
        assert(this.updateViewProjectionTransform !== undefined,
            `View Projection transform function needs to be initialized.`);

        const nodeTransform = mat4.clone(transform);

        const transformComponents = node.componentsOfType('TransformComponent');
        assert(transformComponents.length <= 1, `SceneNode can not have more than one transform component`);

        if (transformComponents.length === 1) {
            const transformComponent = transformComponents[0] as TransformComponent;
            mat4.mul(nodeTransform, nodeTransform, transformComponent.transform);
        }

        const geometryComponents = node.componentsOfType('GeometryComponent');

        // TODO: allow different orders via visitor
        for (const geometryComponent of geometryComponents) {
            const currentComponent = geometryComponent as GeometryComponent;
            const material = currentComponent.material;
            const geometry = currentComponent.geometry;

            geometry.bind();

            if (this.bindGeometry !== undefined) {
                this.bindGeometry(geometry);
            }
            this.bindMaterial(material);
            this.updateModelTransform(nodeTransform);
            this.updateViewProjectionTransform(this._camera.viewProjection);

            geometry.draw();

            geometry.unbind();
        }

        if (!node.nodes) {
            return;
        }

        for (const child of node.nodes) {
            this.renderNode(child, nodeTransform);
        }
    }


    /**
     * Sets the framebuffer the quads are rendered to.
     * @param target - Framebuffer to render into.
     */
    set target(target: Framebuffer) {
        this.assertInitialized();
        this._target = target;
    }

    /**
     * The NDC offset is used for vertex displacement within subpixel space for anti-aliasing over
     * multiple intermediate frames (multi-frame sampling).
     * @param offset - Subpixel offset used for vertex displacement (multi-frame anti-aliasing).
     */
    set ndcOffset(offset: GLfloat2) {
        this.assertInitialized();
        this._ndcOffset = offset;
    }

    /**
     * The camera's viewProjection is used for 3D label placement calculation.
     */
    set camera(camera: Camera) {
        this.assertInitialized();
        if (this._camera === camera) {
            return;
        }
        this._camera = camera;
        this._altered.alter('camera');
    }

    /**
     * Sets the clear color for rendering.
     */
    set clearColor(color: GLclampf4) {
        this._clearColor = color;
    }

    set program(program: Program) {
        this._program = program;
    }
}
