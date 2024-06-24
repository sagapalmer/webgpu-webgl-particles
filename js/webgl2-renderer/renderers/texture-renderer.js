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
uniform float pointSize;

void main() {
  gl_Position = position;
  gl_PointSize = pointSize;
}
`;

const drawParticlesFS = `#version 300 es
precision highp float;
out vec4 outColor;
uniform sampler2D spriteTexture;  // texture we are drawing
uniform float pointSize; 

void main() {
  vec4 color = texture(spriteTexture, gl_PointCoord);
  //if(color == vec4(0, 0, 0, 0)) discard;
  //outColor = vec4(1, 1, 1, 1);
  //if(color.a < 0.5 && pointSize > 4.0) discard; // Adjust threshold as needed
  outColor = color; 
  
}
`;


export class WebGL2TextureRenderer extends WebGL2Renderer {
  renderer = "WebGL2Texture";
  updatePositionVAO = Array(2);
  drawVAO = Array(2);

  constructor() {
    super();
  }

  setupConfigurations() {
    const gl = this.gl;
    
    // ================== DRAW PARTICLES PROGRAM ====================
    this.drawParticlesProgram = this.createProgram(drawParticlesVS, drawParticlesFS);

    const pointSizeLoc = gl.getUniformLocation(this.drawParticlesProgram, 'pointSize');
    const positionLoc = gl.getAttribLocation(this.drawParticlesProgram, 'position');

    
    // ================== SETUP UNIFORM ====================
    gl.useProgram(this.drawParticlesProgram);
    gl.uniform1f(pointSizeLoc, this.particleSize);
    

    // ================== SETUP DRAW VAO ====================
    for (let i = 0; i < 2; i++) {
      this.drawVAO[i] = gl.createVertexArray();
      gl.bindVertexArray(this.drawVAO[i]);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffers[i]);
      
      gl.enableVertexAttribArray(positionLoc);
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    };


    // ================== TEXTURE ====================
    const offscreenCanvas = new OffscreenCanvas(32, 32);
    const ctx = offscreenCanvas.getContext('2d');
    ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    ctx.font = '27px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // ctx.fillText('🌼', 16, 16);
    ctx.fillText('🥑', 16, 16);

    const glTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);  // this is the 0th texture
    gl.bindTexture(gl.TEXTURE_2D, glTexture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); // Does not require mipmaps
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); // Magnification filter
    // actually upload bytes
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, offscreenCanvas);

    // generates a version for different resolutions, needed to draw
    //gl.generateMipmap(gl.TEXTURE_2D);

    

    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);


  }

}