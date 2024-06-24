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
import { Benchmark } from './benchmarks/benchmark.js';
import { TimeStamps } from './benchmarks/timestamps.js';
import { Timer } from './benchmarks/timernew.js';

const updatePositionVS = `#version 300 es
in vec2 oldPosition;
in vec2 oldVelocity;

out vec2 newPosition;
out vec2 newVelocity;

void main() {
  vec2 position = oldPosition;
  vec2 velocity = oldVelocity;

  if (position.x >= 1.0 || position.x <= -1.0) {
    velocity.x = -oldVelocity.x; 
  }

  if (position.y >= 1.0 || position.y <= -1.0) {
    velocity.y = -oldVelocity.y; 
  }
    
  newPosition = oldPosition + velocity;
  newVelocity = velocity;
}
`;

const updatePositionFS = `#version 300 es
precision highp float;
void main() {
}
`;

export class WebGL2Renderer extends Renderer {
  renderer = "WebGL2";
  positionBuffers = Array(2);
  velocityBuffers = Array(2);

  updatePositionVAO = Array(2);
  drawVAO = Array(2);
  tf = Array(2);

  constructor() {
    super();
    
    
  }  


  init() {
    this.gl = this.canvas.getContext('webgl2', {
      powerPreference: "high-performance",
      //desynchronized: true,
      //premultipliedAlpha: false,
      //alpha: false
    });

    //this.timestamps = new TimeStamps(this.gl);
    //this.timer = new Timer(this.gl);
    //console.log(this.timer);
    const gl = this.gl;
    //this.benchmarkActive = false;
    gl.clearColor(this.backgroundColor.r, this.backgroundColor.g, this.backgroundColor.b, this.backgroundColor.a);

    // ================== UPDATE POSITION PROGRAM ====================
    this.updatePositionProgram = this.createProgram(updatePositionVS, updatePositionFS, ['newPosition', 'newVelocity']);

    const oldPositionLoc = gl.getAttribLocation(this.updatePositionProgram, 'oldPosition');
    const oldVelocityLoc = gl.getAttribLocation(this.updatePositionProgram, 'oldVelocity');

    // ================== SETUP PARTICLES ====================
    this.createParticleData();

    // ================== SETUP INTERNAL CONFIGURATIONS ====================
    this.setupConfigurations();

    // ================== SETUP UPDATE VAO ====================
    for (let i = 0; i < 2; i++) {
      this.updatePositionVAO[i] = gl.createVertexArray();
      gl.bindVertexArray(this.updatePositionVAO[i]);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffers[i]);
      gl.enableVertexAttribArray(oldPositionLoc);
      gl.vertexAttribPointer(oldPositionLoc, 2, gl.FLOAT, false, 0, 0);
      
      gl.bindBuffer(gl.ARRAY_BUFFER, this.velocityBuffers[i]);
      gl.enableVertexAttribArray(oldVelocityLoc);
      gl.vertexAttribPointer(oldVelocityLoc, 2, gl.FLOAT, false, 0, 0);
    };
    
    // ================== SETUP TRANSFORM FEEDBACK ====================
    for (let i = 0; i < 2; i++) {
      this.tf[i] = gl.createTransformFeedback();
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.tf[i]);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.positionBuffers[i]);
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, this.velocityBuffers[i]);
    };

    // Unbind left over stuff
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, null);
    
    this.tt = 0;
    this.query = null;
  }



  onResize(width, height) {
    this.gl.viewport(0, 0, width, height);
  }


  createParticleData() {
    // ========= CREATE PARTICLE POSITIONS AND VELOCITY =================
    const gl = this.gl;

    const rand = (min, max) => min + Math.random() * (max - min);
    const positionData = new Float32Array(this.particleCount * 2); // Each particle has an x and y coordinate
    const velocityData = new Float32Array(this.particleCount * 2); // Each particle has an x and y coordinate

    for (let i = 0; i < this.particleCount; i++) {
      positionData[2 * i + 0] = rand(-1, 1);                            // posx
      positionData[2 * i + 1] = rand(-1, 1);                            // posy

      const theta = Math.random() * Math.PI * 2;
      velocityData[2 * i + 0] = Math.cos(theta) * this.particleSpeed;   // velx
      velocityData[2 * i + 1] = Math.sin(theta) * this.particleSpeed;   // vely
    }
      
    // CREATE POSITION BUFFERS AND VELOCITY BUFFERS
    for (let i = 0; i < 2; i++) {
      this.positionBuffers[i] = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffers[i]);
      gl.bufferData(gl.ARRAY_BUFFER, positionData, gl.DYNAMIC_DRAW);

      this.velocityBuffers[i] = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.velocityBuffers[i]);
      gl.bufferData(gl.ARRAY_BUFFER, velocityData, gl.DYNAMIC_DRAW);
    }
  }
  

  createProgram(vsSource, fsSource, transformFeedbackVaryings) {
    const gl = this.gl;
    const program = gl.createProgram();
  
    // VERTEX SHADER
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vsSource);
    gl.compileShader(vertexShader);
    gl.attachShader(program, vertexShader);

    // FRAGMENT SHADER
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fsSource);
    gl.compileShader(fragmentShader);
    gl.attachShader(program, fragmentShader);

    if (transformFeedbackVaryings) {
      gl.transformFeedbackVaryings(program, transformFeedbackVaryings, gl.SEPARATE_ATTRIBS);
    }

    gl.linkProgram(program);

    return program;
  }
  


  onFrame(time) {
    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    this.update();    
    this.draw();
    
    this.tt++;
  }

  update() {
    const gl = this.gl;
    gl.useProgram(this.updatePositionProgram);
    gl.bindVertexArray(this.updatePositionVAO[(this.tt + 0) % 2]); // Read from position1 and velocity1
    gl.enable(gl.RASTERIZER_DISCARD); // NOT RENDER FRAGMENTS
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.tf[(this.tt + 1) % 2]); // Write to position2 and velocity2
    gl.beginTransformFeedback(gl.POINTS); 
    gl.drawArrays(gl.POINTS, 0, this.particleCount);
    gl.endTransformFeedback();
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.disable(gl.RASTERIZER_DISCARD);  // RENDER FRAGMENTS AGAIN
  }


  draw() {
    const gl = this.gl;
    gl.useProgram(this.drawParticlesProgram);
    gl.bindVertexArray(this.drawVAO[(this.tt + 1) % 2]); // Draw with position2
    gl.drawArrays(gl.POINTS, 0, this.particleCount);
  }



}