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


import { WebGPURenderer } from '../webgpu-renderer.js';

export class WebGPUPointRenderer extends WebGPURenderer {
  renderer = "WebGPUPoint";
  constructor() {
    super();
  }

  createRenderPipeline() {
    const vertShader = `
    struct Vertex {
      @location(0) position: vec2f,
    };

    struct VSOutput {
      @builtin(position) position: vec4f,
    };

    @vertex fn vs(vert: Vertex) -> VSOutput {
      var vsOut: VSOutput;
      vsOut.position = vec4f(vert.position, 0, 1);
      return vsOut;
    }
    `;

    const fragShader = `
    struct VSOutput {
      @builtin(position) position: vec4f,
    };

    @fragment fn fs(vsOut: VSOutput) -> @location(0) vec4f {
      return vec4f(1, 1, 1, 1); // yellow
    }
    `;

    const frag_wgsl = this.device.createShaderModule({ code: fragShader });
    const vert_wgsl = this.device.createShaderModule({ code: vertShader });

    this.pipeline = this.device.createRenderPipeline({
      label: '1 pixel points',
      layout: 'auto',
      vertex: {
        module: vert_wgsl,
        entryPoint: 'vs',
        buffers: [
          {
            arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT, // 2 floats, posx and posy
            attributes: [
              {shaderLocation: 0, offset: 0, format: 'float32x2'},  // position
            ],
          },
        ],
      },
      fragment: {
        module: frag_wgsl,
        entryPoint: 'fs',
        targets: [{ format: this.contextFormat }],
      },
      primitive: {
        topology: 'point-list',
      },
    });
  }


  draw(commandEncoder) {
    const passEncoder = commandEncoder.beginRenderPass(this.renderPassDescriptor);
    passEncoder.setPipeline(this.pipeline);
    for (const particlesBatch of this.particleBatches) {
      passEncoder.setVertexBuffer(0, particlesBatch.positionBuffers[(this.tt + 0) % 2]);
      passEncoder.draw(particlesBatch.particlesCount);
    }
    passEncoder.end();
  }

}