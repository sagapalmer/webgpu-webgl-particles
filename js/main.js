import Stats from './third-party/stats.module.js';

import { WebGL2TextureRenderer } from './webgl2-renderer/renderers/texture-renderer.js';
import { WebGL2PointRenderer } from './webgl2-renderer/renderers/point-renderer.js';
import { WebGL2QuadRenderer } from './webgl2-renderer/renderers/quad-renderer.js';

import { WebGPUTextureRenderer } from './webgpu-renderer/renderers/texture-renderer.js';
import { WebGPUPointRenderer } from './webgpu-renderer/renderers/point-renderer.js';
import { WebGPUQuadRenderer } from './webgpu-renderer/renderers/quad-renderer.js';

const stats = new Stats();
let gui = new dat.GUI();


const guiSettings = {
  renderer: 'webGL2',
  particleType: 'texture-particles',
  backgroundColor: '#000000',
  particleSize: 10,
  particleCount: 5000,
  particleSpeed: 0.001,
};

gui.add(guiSettings, 'renderer', {
  webGL2: 'webGL2',
  webGPU: 'webGPU'
}).onChange(onApiChange);

gui.add(guiSettings, 'particleType', {
  PointParticles: 'point-particles',
  TextureParticles: 'texture-particles',
  QuadParticles: 'quad-particles',
}).onChange(onApiChange);

gui.add(guiSettings, 'particleCount', 0, 20000000).step(1).onFinishChange(onApiChange);
gui.add(guiSettings, 'particleSpeed', 0, 0.1).step(0.001).onFinishChange(onApiChange);
gui.add(guiSettings, 'particleSize', 0, 100).step(1).onFinishChange(onApiChange);
//gui.add(guiSettings, 'benchmarkDuration', 0, 60).step(1);
gui.addColor(guiSettings, 'backgroundColor').onChange(onApiChange);


document.body.appendChild(stats.dom);
document.body.appendChild(gui.domElement);

let renderer = null;

async function onApiChange() {
  let prevCanvas;
  if (renderer) {
    prevCanvas = renderer.canvas;
    renderer.stop();
}

renderer = setRenderer(guiSettings.particleType);
if (renderer) {
  try {
    renderer.setGUI(guiSettings);
    const startTime = performance.now();
    await renderer.init();
    const endTime = performance.now();
    
    console.log(`Initialization time: ${endTime - startTime}ms`);
    renderer.setStats(stats);
    if (prevCanvas) {
      document.body.removeChild(prevCanvas);
    }
    document.body.appendChild(renderer.canvas);
    renderer.start();
  } catch (err) {
    console.error('renderer init failed', err);
    renderer.stop();
    renderer = null;
  }
}
}
onApiChange();



function setRenderer(particleType) {
  let renderer = null;
  switch(guiSettings.renderer) {
    case 'webGL2':
      if (particleType == 'texture-particles') renderer = new WebGL2TextureRenderer();
      else if (particleType == 'point-particles') renderer = new WebGL2PointRenderer();
      else if (particleType == 'quad-particles') renderer = new WebGL2QuadRenderer();
      break;
    case 'webGPU':
      if (particleType == 'texture-particles') renderer = new WebGPUTextureRenderer();
      else if (particleType == 'point-particles') renderer = new WebGPUPointRenderer();
      else if (particleType == 'quad-particles') renderer = new WebGPUQuadRenderer();
      break;
    default:
      //renderer = null;
      break;
  }
  return renderer;
}