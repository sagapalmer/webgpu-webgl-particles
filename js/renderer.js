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



export class Renderer {
  timestamps;
  
  constructor() {
    this.canvas = document.createElement('canvas');
    this.rafId = 0;
    this.frameCount = -1;
    let lastTimestamp = -1;
    this.benchmarkActive = false;

    this.frameUniforms = new Float32Array(16 + 16 + 16 + 4 + 4);
    this.outputSize = new Float32Array(this.frameUniforms.buffer, 32 * 4, 2);
    
    this.frameCallback = (timestamp) => {
      const timeDelta = lastTimestamp == -1 ? 0 : timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      this.rafId = requestAnimationFrame(this.frameCallback);
      //this.rafId = setInterval(this.frameCallback,4000);
      this.frameCount++;
      if (this.frameCount % 200 == 0) { return; }

      if (this.stats) {
        this.stats.begin();
      }

      this.onFrame(timestamp, timeDelta);

      if (this.stats) {
        this.stats.end();
      }
    };

    this.resizeCallback = () => {
      this.canvas.width = this.canvas.clientWidth; //* devicePixelRatio;
      this.canvas.height = this.canvas.clientHeight; //* devicePixelRatio;

      //const aspect = this.canvas.width / this.canvas.height;

      this.onResize(this.canvas.width, this.canvas.height);
    };
  }

  async init() {
    // Override with renderer-specific initialization logic.
  }

  setStats(stats) {
    this.stats = stats;
  }

  async setGUI(guiData) {
    this.particleCount = guiData.particleCount;
    this.particleSpeed = guiData.particleSpeed;
    this.particleSize = guiData.particleSize;

    this.setBackgroundColor(guiData.backgroundColor);
    //this.setStats(stats);
  }

  setBackgroundColor(colorHex) { 
    this.backgroundColor = this.hexToRgb(colorHex);
    //console.log(this.backgroundColor)
  }

  // setParticleColor(colorHex) { 
  //   this.particleColor = this.hexToRgb(colorHex);
  //   //console.log(this.particleColor)
  // }

  
  hexToRgb(colorHex) {
    if (colorHex.length === 4) {
      colorHex = '#' + colorHex[1] + colorHex[1] + colorHex[2] + colorHex[2] + colorHex[3] + colorHex[3];
    }
  
    // Extract the red, green, and blue components
    const redHex = colorHex.substring(1, 3);
    const greenHex = colorHex.substring(3, 5);
    const blueHex = colorHex.substring(5, 7);
  
    // Convert hexadecimal to decimal
    const red = parseInt(redHex, 16);
    const green = parseInt(greenHex, 16);
    const blue = parseInt(blueHex, 16);
  
    // Normalize the values
    return {
      r: +(red / 255).toFixed(2),
      g: +(green / 255).toFixed(2),
      b: +(blue / 255).toFixed(2),
      a: 1.0
    };
  }


  start() {
    window.addEventListener('resize', this.resizeCallback);
    this.resizeCallback();
    this.rafId = requestAnimationFrame(this.frameCallback);
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    window.removeEventListener('resize', this.resizeCallback);
  }



  
  onResize(width, height) {
    // Override with renderer-specific resize logic.
  }

  onFrame(timestamp) {
    // Override with renderer-specific frame logic.
  }

  startBenchmark(duration) {
    // Override with renderer-specific benchmark logic
}

}