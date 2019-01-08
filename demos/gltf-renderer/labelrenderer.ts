import { mat4, vec2, vec3 } from 'gl-matrix';
import { uniq } from 'lodash';
import {
    Context,
    DefaultFramebuffer,
    FontFace,
    Label,
    LabelRenderPass,
    Position2DLabel,
    Text,
} from 'webgl-operate';

import { positionLabels } from './labelalignment';
import { Scene } from './scene';
import { SceneRenderer } from './scenerenderer';

export class LabelRenderer extends SceneRenderer {
    set scene(scene: Scene) {
        this._scene = scene;
        this.labelPass.labels = [];

        uniq(this._scene.nodes).forEach((node) => {
            if (node.labelText) {
                const label = new Position2DLabel(
                    new Text(
                        node.labelText,
                    ),
                    Label.Type.Dynamic,
                );
                label.fontSize = 25;
                label.fontFace = this.fontFace;
                label.alignment = Label.Alignment.Center;
                label.color.fromHex('0f1e4d');
                node.label = label;
                this.labelPass.labels.push(label);
            }
        });
        this.invalidate(true);
    }

    get context(): Context {
        return this._context;
    }
    protected labelPass: LabelRenderPass;
    protected defaultFBO: DefaultFramebuffer;
    protected fontFace: FontFace | undefined;

    protected onInitialize(
        context: Context,
    ): boolean {

        this.defaultFBO = new DefaultFramebuffer(context, 'DefaultFBO');
        this.defaultFBO.initialize();

        /* Create and configure label pass. */

        this.labelPass = new LabelRenderPass(context);
        this.labelPass.initialize();
        this.labelPass.target = this.defaultFBO;
        this.labelPass.camera = this.camera;
        this.labelPass.depthMask = true;
        this.labelPass.ndcOffset = [0, 0];
        (window as any).labelPass = this.labelPass;

        FontFace.fromFile('./data/opensansr144.fnt', context)
            .then((fontFace) => {
                this.fontFace = fontFace;
                for (const label of this.labelPass.labels) {
                    label.fontFace = fontFace;
                }
            })
            .catch((reason) => console.error(reason));

        return true;
    }

    protected onUninitialize(): void {
        this._scene.uninitialize();
        this.defaultFBO.uninitialize();
        this.labelPass.uninitialize();
    }

    protected onUpdate(): boolean {
        // TODO: update label positions
        if (this._scene) {
            const positions: Array<{ label: Position2DLabel, viewPos: vec2 }> = [];
            uniq(this._scene.nodes).forEach((node) => {
                if (node.label) {
                    const modelViewTransf = mat4.create();
                    mat4.mul(modelViewTransf, this.camera.viewProjection, node.finalTransform);
                    const center = vec3.create();
                    vec3.transformMat4(center, node.bounds.center, modelViewTransf);
                    positions.push({ label: node.label, viewPos: vec2.fromValues(center[0], center[1]) });
                    // console.log('x: ' + center[0] + '\n');
                    // console.log('y: ' + center[1] + '\n');
                    // node.label.position = vec2.fromValues(center[0] * this._frameSize[0] * 0.5, center[1]
                    //   * this._frameSize[1] * 0.5);
                }
            });
            if (positions.length !== 0) {

                const scenebounds = this._scene.bounds.clone();
                scenebounds.transform(this.camera.viewProjection);
                const border: Array<vec2> = [];
                border.push(vec2.fromValues(scenebounds.min[0], scenebounds.min[1]));
                border.push(vec2.fromValues(scenebounds.max[0], scenebounds.min[1]));
                border.push(vec2.fromValues(scenebounds.max[0], scenebounds.max[1]));
                border.push(vec2.fromValues(scenebounds.min[0], scenebounds.max[1]));
                const labelPositions = positionLabels(border, positions.map((pos) => pos.viewPos));
                labelPositions.forEach((position, index) => {
                    if (positions[index].label) {
                        positions[index].label.position = vec2.fromValues(
                            position[0] * this._canvasSize[0] * 0.5, position[1]
                            * this._canvasSize[1] * 0.5);
                    }
                });
            }
        }

        this.labelPass.update();
        let labelAltered = false;
        this.labelPass.labels.forEach((label) => {
            labelAltered = labelAltered || label.altered;
        });
        // Reset state
        const altered =
            this._altered.any ||
            labelAltered;
        this._altered.reset();
        this.camera.altered = false;

        // If anything has changed, render a new frame
        return altered;
    }

    protected onPrepare(): void {
        return;
    }

    protected onFrame(frameNumber: number): void {
        this.labelPass.frame();
        this.labelPass.unbind();
    }
    protected onSwap(): void {
        return;
    }

}
