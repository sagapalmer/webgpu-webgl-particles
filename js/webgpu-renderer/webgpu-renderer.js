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


import { Renderer } from '../renderer.js';

export class WebGPURenderer extends Renderer {
  WORKGROUP_SIZE = 256;
  particleBatches = [];
  renderer = "WebGPU";

  constructor() {
    super();
  }


  async init() {
    this.context = this.canvas.getContext('webgpu');
    this.adapter = await navigator.gpu.requestAdapter({
      powerPreference: "high-performance",
    });
    
    this.device = await this.adapter.requestDevice({
      //requiredFeatures: ["timestamp-query"],
    });


    //this.timestamps = new TimeStamps(this.device);
    //console.log(this.timestamps);

    //console.log(this.device.limits);

    this.contextFormat = 'bgra8unorm';
    if (navigator.gpu.getPreferredCanvasFormat) {
      this.contextFormat = navigator.gpu.getPreferredCanvasFormat();
    } else if (this.context.getPreferredFormat) {
      this.contextFormat = this.context.getPreferredFormat(this.adapter);
    }

    this.context.configure({
      device: this.device,
      format: this.contextFormat,
      //alphaMode: 'premultiplied',
    });

    this.renderPassDescriptor = {
      colorAttachments: [{
        // View: filled out later
        clearValue: this.backgroundColor,
        loadOp: 'clear',
        storeOp: 'store',
      }],
    };

    this.createRenderPipeline();
    this.createComputePipeline();
    this.particleSetup();

    this.setupConfigurations();

    this.tt = 0;
  }

  particleSetup() {
    for (const particlesBatch of this.particleBatches) {
      if (particlesBatch.gpuBuffer) {
          particlesBatch.gpuBuffer.destroy();
      }
    }

    this.particleBatches.length = 0;

    const particleSize = Float32Array.BYTES_PER_ELEMENT * 2;
    const maxDispatchSize = Math.min(
      Math.floor(this.device.limits.maxStorageBufferBindingSize / particleSize / this.WORKGROUP_SIZE),
      this.device.limits.maxComputeWorkgroupsPerDimension);

    let particlesLeftToAllocate = this.particleCount;
    while (particlesLeftToAllocate > 0) {
        const idealDispatchSize = Math.ceil(particlesLeftToAllocate / this.WORKGROUP_SIZE);
        const dispatchSize = Math.min(idealDispatchSize, maxDispatchSize);

        const particlesCount = Math.min(particlesLeftToAllocate, dispatchSize * this.WORKGROUP_SIZE);

        //console.log("dispatchSize: ", dispatchSize);
        particlesLeftToAllocate -= particlesCount;

        const gpuBufferSize = particlesCount * particleSize;
        const rand = (min, max) => min + Math.random() * (max - min);
        
        const positionData = new Float32Array(particlesCount * 2);
        const velocityData = new Float32Array(particlesCount * 2);

        for (let i = 0; i < particlesCount; ++i) {
          const offset = i * 2;
          positionData[offset + 0] = rand(-1, 1);
          positionData[offset + 1] = rand(-1, 1);

          const theta = Math.random() * Math.PI * 2;
          velocityData[offset + 0] = Math.cos(theta) * this.particleSpeed;
          velocityData[offset + 1] = Math.sin(theta) * this.particleSpeed;
        }

        const positionBuffers = Array(2);
        for (let i = 0; i < 2; i++) {
          positionBuffers[i] = this.device.createBuffer({
            label: 'position',
            size: gpuBufferSize,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
            mappedAtCreation: true,
          });
          new Float32Array(positionBuffers[i].getMappedRange()).set(positionData);
          positionBuffers[i].unmap();
        }

        const velocityBuffers = Array(2);
        for (let i = 0; i < 2; i++) {
          velocityBuffers[i] = this.device.createBuffer({
            label: 'velocity',
            size: gpuBufferSize,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
            mappedAtCreation: true,
          });
          new Float32Array(velocityBuffers[i].getMappedRange()).set(velocityData);
          velocityBuffers[i].unmap();
        }

        const computeBindgroups = Array(2);
        for (let i = 0; i < 2; ++i) {
          computeBindgroups[i] = this.device.createBindGroup({
            layout: this.computePipeline.getBindGroupLayout(0),
            entries: [
              {
                binding: 0,
                resource: {
                  buffer: positionBuffers[i],
                },
              },
              {
                binding: 1,
                resource: {
                  buffer: velocityBuffers[i],
                },
              },
              {
                binding: 2,
                resource: {
                  buffer: positionBuffers[(i + 1) % 2],
                },
              },
              {
                binding: 3, 
                resource: {
                  buffer: velocityBuffers[(i + 1) % 2],
                },
              },
            ],
          });
      }

        this.particleBatches.push({
          positionBuffers: positionBuffers,
          velocityBuffers: velocityBuffers,
          computeBindgroups: computeBindgroups,
          particlesCount: particlesCount,
          dispatchSize: dispatchSize,
        });
    }
  }



  setupConfigurations() {
    // override
  }

  createRenderPipeline() {
    // override
  }


  createComputePipeline() {
    const computeShader = `
    @binding(0) @group(0) var<storage, read> positionsA : array<vec2<f32>>;
    @binding(1) @group(0) var<storage, read> velocitiesA : array<vec2<f32>>;

    @binding(2) @group(0) var<storage, read_write> positionsB : array<vec2<f32>>;
    @binding(3) @group(0) var<storage, read_write> velocitiesB : array<vec2<f32>>;

    @compute @workgroup_size(256)
    fn main(@builtin(global_invocation_id) GlobalInvocationID : vec3<u32>)
    {
      var index : u32 = GlobalInvocationID.x;
      var p = positionsA[index];
      var v = velocitiesA[index];

      if (p.x <= -1.0 || p.x >= 1.0) {
        v.x = -v.x;
      }
      if (p.y <= -1.0 || p.y >= 1.0) {
        v.y = -v.y;
      }

      positionsB[index] = p + v;
      velocitiesB[index] = v;
    }
    `;

    const computeParticles = this.device.createShaderModule({ code: computeShader });

    this.computePipeline = this.device.createComputePipeline({
      layout: "auto",
      compute: {
        module: computeParticles,
        entryPoint: 'main',
      },
    });
  }
  
  onResize(width, height) {
    if (!this.device) return;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  
  onFrame(timestamp) {
    const canvasTexture = this.context.getCurrentTexture();
    this.renderPassDescriptor.colorAttachments[0].view = canvasTexture.createView();

    const commandEncoder = this.device.createCommandEncoder();

    this.update(commandEncoder);
    this.draw(commandEncoder);

    this.device.queue.submit([commandEncoder.finish()]);

    this.tt++;
  }


  update(commandEncoder) {
    for (const particlesBatch of this.particleBatches) {
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(this.computePipeline);
      passEncoder.setBindGroup(0, particlesBatch.computeBindgroups[(this.tt + 1) % 2]);
      passEncoder.dispatchWorkgroups(particlesBatch.dispatchSize);
      passEncoder.end();
    }
  }

  
}
