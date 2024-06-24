// Copyright 2020 Brandon Jones
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.


import { WebGPUQuadRenderer } from './quad-renderer.js';

export class WebGPUTextureRenderer extends WebGPUQuadRenderer {
  renderer = "WebGPUTexture";
  constructor() {
    super();
  }


  setupConfigurations() {
    
    this.quadSetup();

    this.createUniformBuffer();

    // ================== TEXTURE ====================
    const ctx = new OffscreenCanvas(32, 32).getContext('2d');
    ctx.font = '27px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🥑', 16, 16);
    //ctx.fillText('😏', 16, 16);

    const texture = this.device.createTexture({
      size: [32, 32],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING |
             GPUTextureUsage.COPY_DST |
             GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.device.queue.copyExternalImageToTexture(
      { source: ctx.canvas, flipY: true },
      { texture, premultipliedAlpha: true },
      [32, 32],
    );

    const sampler = this.device.createSampler({
      minFilter: 'linear',
      magFilter: 'linear',
    });

    // RENDER PIPELINE BIND GROUP
    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer }},
        { binding: 1, resource: sampler },
        { binding: 2, resource: texture.createView() },
      ],
    });


    // ===============================================
  }
  

  createRenderPipeline() {
    const vertShader = `
    struct VertexInput {
      @location(0) particlePos : vec2<f32>,
      @location(1) pos : vec2<f32>,
    };

    struct VertexOutput {
      @builtin(position) position : vec4<f32>,
      @location(0) texcoord: vec2<f32>,
    };
    
    struct Uniforms {
      resolution : vec2<f32>,   // Canvas width and height
      scale : f32,
    };

    @group(0) @binding(0) var<uniform> uni: Uniforms;

    @vertex
    fn vert_main(input: VertexInput) -> VertexOutput 
    {
    var output : VertexOutput;

    //output.Position = vec4<f32>((input.pos * scale) + input.particlePos, 0.0, 1.0);
    //output.Position = vec4<f32>(input.pos+input.particlePos, 0.0, 1.0);

    let sizeInNDC: vec2<f32> = vec2<f32>(uni.scale / uni.resolution.x, uni.scale / uni.resolution.y);
    output.position = vec4<f32>(input.particlePos + input.pos * sizeInNDC, 0.0, 1.0);
    

    output.texcoord = input.pos * 0.5 + 0.5;
    return output;
    }
    `;

    const fragShader = `
    struct FragInput {
      @location(0) texcoord: vec2f,
    };

    struct FragOutput {
      @location(0) color: vec4<f32>,
    };

    @group(0) @binding(1) var s: sampler;
    @group(0) @binding(2) var t: texture_2d<f32>;

    @fragment
    fn frag_main(input: FragInput) -> FragOutput
    {
      var output: FragOutput;
      output.color = textureSample(t, s, input.texcoord);
      //output.color = vec4<f32>(1.0, 1.0, 1.0, 1.0);
      

      return output;
    }
    `;

    const frag_wgsl = this.device.createShaderModule({ code: fragShader });
    const vert_wgsl = this.device.createShaderModule({ code: vertShader });

    this.pipeline = this.device.createRenderPipeline({
      layout:"auto",
      vertex: {
        module: vert_wgsl,
        entryPoint: 'vert_main',
        buffers: [
          {
            arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,     // Instanced particles buffer
            stepMode: 'instance',
            attributes: [
              {
                shaderLocation: 0,  // Instance position
                offset: 0,
                format: 'float32x2',
              },
            ],
          },
          {
            arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,     // Vertex buffer
            stepMode: 'vertex',
            attributes: [
              { 
                shaderLocation: 1,  // Vertex positions
                offset: 0,
                format: 'float32x2',
              },
            ],
          },
        ],
      },
      fragment: {
        module: frag_wgsl,
        entryPoint: 'frag_main',
        targets: [
          {
            format: this.contextFormat,
            blend: {
              color: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
            },
          },
        ],
      },
    });
  }

}












