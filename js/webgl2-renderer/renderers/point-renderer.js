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

import { WebGL2Renderer } from '../webgl2-renderer.js';

const drawParticlesVS = `#version 300 es
in vec4 position;

void main() {
  gl_Position = position;
  gl_PointSize = 1.0;
}
`;

const drawParticlesFS = `#version 300 es
precision highp float;
out vec4 outColor;

void main() {
  outColor = vec4(1, 1, 1, 1);
}
`;


export class WebGL2PointRenderer extends WebGL2Renderer {
  renderer = "WebGL2Point";
  updatePositionVAO = Array(2);
  drawVAO = Array(2);

  constructor() {
    super();
  }

  setupConfigurations() {
    const gl = this.gl;
    
    // ================== DRAW PARTICLES PROGRAM ====================
    this.drawParticlesProgram = this.createProgram(drawParticlesVS, drawParticlesFS);
    const positionLoc = gl.getAttribLocation(this.drawParticlesProgram, 'position');

    //gl.useProgram(this.drawParticlesProgram);

    // ================== SETUP DRAW VAO ====================
    for (let i = 0; i < 2; i++) {
      this.drawVAO[i] = gl.createVertexArray();
      gl.bindVertexArray(this.drawVAO[i]);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffers[i]);
      
      gl.enableVertexAttribArray(positionLoc);
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    };

  }

}