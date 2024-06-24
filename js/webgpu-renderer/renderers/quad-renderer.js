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


export class WebGPUQuadRenderer extends WebGPURenderer {
  renderer = "WebGPUQuad";
  constructor() {
    super();
  }


  setupConfigurations() {

    this.quadSetup();

    this.createUniformBuffer();

    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer }},
      ],
    });

  }


  createUniformBuffer() {

    // ================== UNIFORM ====================
    const uniformBufferSize = 4 * Float32Array.BYTES_PER_ELEMENT;
    const canvasTexture = this.context.getCurrentTexture();
    this.uniformValues = new Float32Array([canvasTexture.width, canvasTexture.height, this.particleSize]);
    this.uniformBuffer = this.device.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const kResolutionOffset = 0;
    this.resolutionValue = this.uniformValues.subarray(kResolutionOffset, kResolutionOffset + 2);
    //this.device.queue.writeBuffer(uniformBuffer, 0, uniformValues);

    //console.log(canvasTexture.width, canvasTexture.height);
    this.oldResolutionValues = new Float32Array([canvasTexture.width, canvasTexture.height]);

    //this.prevCanvasSize = new Float32Array([canvasTexture.width, canvasTexture.height]);
    this.prevCanvasSize = [canvasTexture.width, canvasTexture.height];

  }


  


  createRenderPipeline() {
    const vertShader = `
    struct VertexInput {
      @location(0) particlePos : vec2<f32>,
      @location(1) pos : vec2<f32>,
    };

    struct VertexOutput {
      @builtin(position) position : vec4<f32>,
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
    
    let sizeInNDC: vec2<f32> = vec2<f32>(uni.scale / uni.resolution.x, uni.scale / uni.resolution.y);
    output.position = vec4<f32>(input.particlePos + input.pos * sizeInNDC, 0.0, 1.0);
    
    return output;
    }
    `;

    const fragShader = `

    struct FragOutput {
      @location(0) color: vec4<f32>,
    };

    @fragment
    fn frag_main() -> FragOutput
    {
    var output: FragOutput;
    //output.color = textureSample(t, s, input.texcoord);
    output.color = vec4<f32>(1.0, 1.0, 1.0, 1.0);

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
            arrayStride: 2 * 4,       // Instanced particles buffer
            stepMode: 'instance',
            attributes: [
              {
                shaderLocation: 0,    // Instance position
                offset: 0,
                format: 'float32x2',
              },
            ],
          },
          {
            arrayStride: 2 * 4,       // Vertex buffer
            stepMode: 'vertex',
            attributes: [
              {
                shaderLocation: 1,    // Vertex positions
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
          },
        ],
      },
    });

  }

  quadSetup() {
    // ========= CREATE SINGLE PARTICLE =================
    const vertexData = new Float32Array(4 * 2);
    vertexData.set([
      -1.0, -1.0,
       1.0, -1.0,
       1.0,  1.0,
      -1.0,  1.0,
    ]);

    const indexData = new Uint32Array(6);
    indexData.set([0, 1, 2, 2, 3, 0]);

    this.indexBuffer = this.device.createBuffer({
      label: 'index buffer',
      size: indexData.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.indexBuffer, 0, indexData);

    
    // VERTEX BUFFER FOR STORING A POINT
    this.vertexBuffer = this.device.createBuffer({
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.vertexBuffer.getMappedRange()).set(vertexData);
    this.vertexBuffer.unmap();
  }


  draw(commandEncoder) {

    const canvasTexture = this.context.getCurrentTexture();
    // Update the resolution in the uniform buffer

    if (canvasTexture.width !== this.prevCanvasSize[0] || canvasTexture.height !== this.prevCanvasSize[1]) {
      this.resolutionValue.set([canvasTexture.width, canvasTexture.height]);
      this.device.queue.writeBuffer(this.uniformBuffer, 0, this.uniformValues);
      this.prevCanvasSize = [canvasTexture.width, canvasTexture.height];
    }

    const passEncoder = commandEncoder.beginRenderPass(this.renderPassDescriptor);
      passEncoder.setPipeline(this.pipeline);
      passEncoder.setVertexBuffer(1, this.vertexBuffer);
      passEncoder.setIndexBuffer(this.indexBuffer, 'uint32');
      passEncoder.setBindGroup(0, this.bindGroup);

      for (const particlesBatch of this.particleBatches) {
        passEncoder.setVertexBuffer(0, particlesBatch.positionBuffers[(this.tt + 0) % 2]);
        passEncoder.drawIndexed(6, particlesBatch.particlesCount, 0, 0);   
        //passEncoder.draw(6, this.particleCount, 0, 0);
      }
      passEncoder.end();
  }
  
}












