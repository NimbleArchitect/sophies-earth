const wireframe = false;
const centralLocation = [51.504739, -0.086558];

//const PI = 3.141592653589793;
const PI = Math.PI;

const mat4 = glMatrix.mat4;
const mat3 = glMatrix.mat3;
const vec3 = glMatrix.vec3;

let programInfo = [];
let lineProgram = [];
let projection = 0;

let then = 0;
let now = 0;

let canvas = document.getElementById('glcanvas');
let gl = canvas.getContext('webgl2');

let angle = 0.00;
angle = 4.391068816258958;
let rotangle = 0.0;

let coords = [];
let stillRunning = true;



const vsPlanet = `
  attribute vec3 aVertexPosition;
  attribute vec3 aVertexNormal;
  attribute vec2 aTextureCoord;

  uniform mat4 uModelMatrix; //m
  uniform mat4 uProjectionMatrix; //mvp
  uniform mat4 uViewMatrix; //v

  uniform mat3 ambientLightMatrix;
  varying float LightIntensity;
  varying float ambientStrength;

  varying highp vec2 vTextureCoord;
  //varying highp float color;
  varying vec3 LightColor;
  varying vec3 LightPosition_worldspace;
  varying vec3 Position_worldspace;
  varying vec3 Normal_cameraspace;
  varying vec3 EyeDirection_cameraspace;
  varying vec3 LightDirection_cameraspace;

  void main() {

    // vec3 T = normalize(vec3(model * vec4(aTangent,   0.0)));
    // vec3 B = cross(N, T);  // normalize(vec3(model * vec4(aBitangent, 0.0)));
    // vec3 N = normalize(vec3(model * vec4(aNormal,    0.0)));
    // mat3 TBN = mat3(T, B, N)
    
    LightPosition_worldspace = vec3(-7.0, -2.0, 1.0);
    LightIntensity = ambientLightMatrix[0].x ;
    LightColor = ambientLightMatrix[1].xyz ;
    
    vTextureCoord = aTextureCoord;
    
    // Output position of the vertex, in clip space : MVP * position
    gl_Position =  uProjectionMatrix * vec4(aVertexPosition,1);
    
    // Position of the vertex, in worldspace : M * position
    Position_worldspace = (uModelMatrix * vec4(aVertexPosition,1)).xyz;
    
    // Vector that goes from the vertex to the camera, in camera space.
    // In camera space, the camera is at the origin (0,0,0).
    vec3 vertexPosition_cameraspace = ( uViewMatrix * uModelMatrix * vec4(aVertexPosition,1)).xyz;
    EyeDirection_cameraspace = vec3(0,0,0) - vertexPosition_cameraspace;
    
    // Vector that goes from the vertex to the light, in camera space. M is ommited because it's identity.
    vec3 LightPosition_cameraspace = ( uViewMatrix * vec4(LightPosition_worldspace,1)).xyz;
    LightDirection_cameraspace = LightPosition_cameraspace + EyeDirection_cameraspace;

    // Normal of the the vertex, in camera space
    Normal_cameraspace = ( uViewMatrix * uModelMatrix * vec4(aVertexNormal,0)).xyz; // Only correct if ModelMatrix does not scale the model ! Use its inverse transpose if not.

  }
`;

const fsPlanet = `
  #ifdef GL_ES
  precision mediump float;
  #endif

  varying float LightIntensity;
  varying vec3 LightColor;
  varying highp vec2 vTextureCoord;
  uniform sampler2D uSampler;
  uniform sampler2D uNormal;
  uniform sampler2D uNight;

  varying vec3 LightPosition_worldspace;
  varying vec3 Position_worldspace;
  varying vec3 Normal_cameraspace;
  //varying vec3 EyeDirection_cameraspace;
  varying vec3 LightDirection_cameraspace;

  void main() {
    vec4 normalMap = texture2D(uNormal, vTextureCoord);
    vec3 normal = normalize(normalMap.xyz);
    vec3 basetexture = texture2D(uSampler, vTextureCoord).xyz;
    vec3 nighttexture = texture2D(uNight,vTextureCoord).xyz;
    
    vec3 currenttexture;
    
    //float lightcolor = LightIntensity;
    
    float distance = length( LightPosition_worldspace - Position_worldspace );
    //   distance = 0.10;

    //vec3 LightColor = LightIntensity;
    float LightPower = 1.5;
    float NightPower = LightIntensity + 0.13;
    
    vec3 n = normalize( Normal_cameraspace );
    vec3 l = normalize( LightDirection_cameraspace );
    
    normal = normalize(normalMap.xyz * 2.0 - 1.0);
    vec3 ld = LightDirection_cameraspace * (normal);
    
    l = normalize(1.0 - ld ) ;

    //float value = ;
    float cosTheta = clamp(dot( n,l ), 0.0, 1.0);
    
    //fade out darkness based on light level need to pin to a max light
    vec3 MaterialAmbiantColor;
    vec3 color;
    
    vec3 dayMaterialAmbiantColor = vec3(0.1,0.1,0.1) * basetexture;
    vec3 nightMaterialAmbiantColor = vec3(0.1,0.1,0.1) * nighttexture;
    
    
    vec3 daycolor = 
    // Ambiant : simulates indirect lighting
    dayMaterialAmbiantColor +
    // Diffuse : "color" of the object
    basetexture * LightColor * LightPower * cosTheta ; //   / (distance*distance);

    vec3 nightcolor = 
    // Ambiant : simulates indirect lighting
    nightMaterialAmbiantColor +
    // Diffuse : "color" of the object
    nighttexture * LightColor * NightPower * (1.0 - cosTheta ); //   / (distance*distance);

    float mixamount = clamp(cosTheta + 0.55, 0.0, 1.0);
    //mixamount = clamp(cosTheta * 4.0, 0.0, 1.0);
    
    color = mix(nightcolor, daycolor, mixamount);
    
    if (cosTheta <= -0.1) {
      color = vec3(1.0,0.0,0.0);
    }
    
    gl_FragColor = vec4(color, 1.0);
  }
`;


const vsPlanetAtmos = `
  attribute vec3 aVertexPosition;
  attribute vec2 aTextureCoord;

  uniform mat4 uModelMatrix; //m
  uniform mat4 uProjectionMatrix; //mvp
  uniform mat4 uViewMatrix; //v

  uniform mat3 ambientLightMatrix;
  varying float LightIntensity;
  varying float ambientStrength;

  varying highp vec2 vTextureCoord;

  varying vec3 LightColor;
  varying vec3 LightPosition_worldspace;
  varying vec3 Position_worldspace;
  varying vec3 Normal_cameraspace;
  varying vec3 EyeDirection_cameraspace;
  varying vec3 LightDirection_cameraspace;

  void main() {
    
    LightPosition_worldspace = vec3(-7.0, -2.0, 1.0);
    LightIntensity = ambientLightMatrix[0].x;
    LightColor = ambientLightMatrix[1].xyz;
    
    vTextureCoord = aTextureCoord;
    
    // Output position of the vertex, in clip space : MVP * position
    gl_Position =  uProjectionMatrix * vec4(aVertexPosition,1);
    
    // Position of the vertex, in worldspace : M * position
    Position_worldspace = (uModelMatrix * vec4(aVertexPosition,1)).xyz;
    
    // Vector that goes from the vertex to the camera, in camera space.
    // In camera space, the camera is at the origin (0,0,0).
    vec3 vertexPosition_cameraspace = ( uViewMatrix * uModelMatrix * vec4(aVertexPosition,1)).xyz;
    EyeDirection_cameraspace = vec3(0,0,0) - vertexPosition_cameraspace;
    
    // Vector that goes from the vertex to the light, in camera space. M is ommited because it's identity.
    vec3 LightPosition_cameraspace = ( uViewMatrix * vec4(LightPosition_worldspace,1)).xyz;
    LightDirection_cameraspace = LightPosition_cameraspace + EyeDirection_cameraspace;

    // Normal of the the vertex, in camera space
    Normal_cameraspace = (uViewMatrix * uModelMatrix * vec4(0.0, 0.0, 0.0, 0.0)).xyz; // Only correct if ModelMatrix does not scale the model ! Use its inverse transpose if not.

  }
`;

const fsPlanetAtmos = `
  #ifdef GL_ES
  precision mediump float;
  #endif
  
  varying float LightIntensity;
  varying vec3 LightColor;
  varying highp vec2 vTextureCoord;
  uniform sampler2D uSampler;
  uniform sampler2D uNight;
  
  varying vec3 LightPosition_worldspace;
  varying vec3 Position_worldspace;
  varying vec3 Normal_cameraspace;
  varying vec3 LightDirection_cameraspace;
  
  void main() {
    vec3 basetexture = texture2D(uSampler, vTextureCoord).xyz;
    vec3 nighttexture = texture2D(uNight,vTextureCoord).xyz;
    
    vec3 currenttexture;
    
    float distance = length( LightPosition_worldspace - Position_worldspace );

    float LightPower = 1.5;
    float NightPower = LightIntensity + 0.13;
    
    vec3 n = normalize( Normal_cameraspace );
    vec3 l = normalize( LightDirection_cameraspace );
    
    vec3 ld = LightDirection_cameraspace;
    
    l = normalize(1.0 - ld ) ;

    float cosTheta = clamp(dot( n,l ), 0.0, 1.0);
    
    //fade out darkness based on light level need to pin to a max light
    vec3 MaterialAmbiantColor;
    vec3 color;
    float intensity = pow( 0.8 - dot(n, l ), 1.0 );
    
    vec3 dayMaterialAmbiantColor = vec3(0.1,0.1,0.1) * basetexture;
    vec3 nightMaterialAmbiantColor = vec3(0.1,0.1,0.1) * nighttexture;    
    
    vec3 daycolor = 
    dayMaterialAmbiantColor +
    basetexture * LightColor * LightPower * cosTheta ; //   / (distance*distance);

    vec3 nightcolor = 
    nightMaterialAmbiantColor +
    nighttexture * LightColor * NightPower * (1.0 - cosTheta ); //   / (distance*distance);

    float mixamount = clamp(cosTheta, 0.0, 1.0);
    
    color = mix(nightcolor, daycolor, mixamount);

    if (intensity > 0.1) {
      color = vec3(1.0,0.0,0.0);
    }
    
//    gl_FragColor = vec4(daycolor, 0.1) * intensity;
  }
`;

  
const vsSpace = `
  attribute vec3 aVertexPosition;
  attribute vec2 aTextureCoord;
  
  uniform mat4 uModelMatrix; //m
  uniform mat4 uProjectionMatrix; //mvp
  uniform mat4 uViewMatrix; //v
  
  varying highp vec2 vTextureCoord;
  
  void main() {
    vTextureCoord = aTextureCoord;
    gl_Position = vec4(aVertexPosition,1.0); // projectionMatrix * modelViewMatrix * position;
  }
`;
  
  
const fsSpace = `
  varying highp vec2 vTextureCoord;
  uniform sampler2D uSampler;
  
  void main() {
    highp vec4 cube = vec4(texture2D(uSampler, vTextureCoord).xyz,1.0);
    gl_FragColor = cube;
  }
`;
  

function init() {
  
  canvasResize(canvas, gl);

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  projection = mat4.create();
  mat4.perspective(projection, PI/6, 1.0, 0.1, 100.0);

  programInfo[0] = initSkybox(gl, 'space.jpg');
  programInfo[1] = initPlanet(gl, [90, 90], 'earth.jpg', 'night.jpg', '');
  programInfo[2] = initAtmos(gl, [90, 90]);
  programInfo[3] = initPlanet(gl, [30, 30], 'moon.jpg', 'moon.jpg', '');

  programInfo[4] = initPlanet(gl, [4, 4]); //points of the line

}

function drawScene(gl, programList, deltaTime=0.01) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

  // Clear the canvas before we start drawing on it.

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Create a perspective matrix, a special matrix that is  
  const fieldOfView = 45 * PI / 180;   // in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const projectionMatrix = mat4.create();
  //const spinspeed = 0.00005;
  const spinspeed = 0.00005;

  let ambientLightMatrix = mat3.create();
  mat3.set(ambientLightMatrix, 
          1.0, 0.0, 0.0, //brightness
          1.0, 1.0, 1.0, //light colour
          0.0, 0.0, 0.0);

  // note: glmatrix.js always has the first argument
  // as the destination to receive the result.
  mat4.perspective(projectionMatrix, PI/6, aspect, 0.1, 100.0);
  
  let viewMatrix = mat4.create();
  //mat4.targetTo(viewMatrix,
  mat4.lookAt(viewMatrix, 
    // [0, 2.0, -3.0], //[0, 2.5, -5],
    [0, 2.5 , -5], 
    [0, 0, 0], 
    [0, 1, 0]);
    
  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  
  // set earth rotation
  angle = angle + (spinspeed / deltaTime);
  if (angle > 6.28319) {
    angle = 0; console.log("earth reset");
  }
  rotangle += ((spinspeed / 27) / deltaTime);
  if (rotangle > 6.28319) {
    rotangle = 0.0; console.log("moon reset");
  }
  

  drawSkybox(gl, programList[0]);
  
  //draw earth
  const worldTilt = mat4.create();

  mat4.translate(worldTilt, worldTilt, [0.0, 0.0, 0.0]);
  mat4.rotateZ(worldTilt, worldTilt, 0.15);
  mat4.rotateY(worldTilt, worldTilt, angle);

  let m =  mat4.create();
  let mvpMatrix = mat4.create();
  mat4.multiply(m, viewMatrix, worldTilt);
  mat4.multiply(mvpMatrix, projectionMatrix, m);
  
  drawPlanet(gl, programList[1], mvpMatrix, viewMatrix, worldTilt, ambientLightMatrix)
  
  // //draw atmosphere
  // const atmosMatrix = mat4.create();
  // var scalefactor = 1.015;
  // mat3.set(ambientLightMatrix, 
  //   1.0, 0.0, 0.0, //brightness
  //   0.0, 0.0, 1.0, //light colour
  //   0.0, 0.0, 0.0);
  // mat4.multiply(m, viewMatrix, worldTilt);
  // mat4.multiply(mvpMatrix, projectionMatrix, m);
  // mat4.scale(mvpMatrix, atmosMatrix, [scalefactor, scalefactor, scalefactor]);
  // drawPlanet(gl, programList[2], mvpMatrix, viewMatrix, atmosMatrix, ambientLightMatrix)

//////////////////////////////////////

  //draw green ball
  const scalefactor = 0.010;
  //scalefactor = 0.050;
  

  // coords = [];
  // coords.push([50.039246, -5.675544]); //cornwall
  // coords.push([51.504739, -0.086558]); //london - the shard
  // coords.push([36.101764, 138.231323]); //japan
  // coords.push([8.322576, 77.569631]); //south india
  // coords.push([-46.332722, 168.954283]); //new zealand
  // coords.push([25.763439, -80.190282]); //florida
  // coords.push([34.521709, -120.481808]); //LA

  //***********************************************
  //***********************************************

  //draw the lines
  let lineCount = lineProgram.length;

//FIXME: line drawing is broken
  
  for (let l = 0; l < lineCount; l++) {
    let thisLine = lineProgram[l];
    //console.log("thisLine: " + thisLine);
    let ballMatrix = mat4.create();
    mat4.translate( ballMatrix, ballMatrix, worldTilt);
    //mat4.scale(ballMatrix, ballMatrix, [scalefactor, scalefactor, scalefactor]);
    
    mat3.set(ambientLightMatrix, 
      1.0, 0.0, 0.0,
      1.0 , 0.0, 0.0, //color
      0.0, 0.0, 0.0);

    m = mat4.create();
    mvpMatrix = mat4.create();
    mat4.multiply(m, viewMatrix, ballMatrix);
    mat4.multiply(mvpMatrix, projectionMatrix, m);
    //drawPlanet(gl, programList[4], mvpMatrix, viewMatrix, ballMatrix, ambientLightMatrix)  
    drawTube(gl, thisLine, mvpMatrix, viewMatrix, ballMatrix, ambientLightMatrix)  

  }
  //***********************************************
  //***********************************************
  // if (lineCount >=4) {
  //   stillRunning = false;
  // }

  //draw moon
  viewMatrix = mat4.create();
  //mat4.targetTo(viewMatrix,
  mat4.lookAt(viewMatrix, 
      [0, 0, -6], 
      [0, 0, 0], 
      [0, 1, 0]);
  //var ambientLightMatrix = mat3.create();
  mat3.set(ambientLightMatrix, 
    0.0, 0.0, 0.0,
    1.0, 1.0, 1.0,
    0.0, 0.0, 0.0);
          

  const moonMatrix = mat4.create();
  mat4.scale(moonMatrix, moonMatrix, [0.25, 0.25, 0.25]);
  mat4.rotateY( moonMatrix, moonMatrix, rotangle);

  mat4.translate( moonMatrix, moonMatrix, [-7.0, 0.0, 0.0]);
  mat4.rotateY( moonMatrix, moonMatrix, 4);
  m =  mat4.create();
  mvpMatrix = mat4.create();
  mat4.multiply(m, viewMatrix, moonMatrix);
  mat4.multiply(mvpMatrix, projectionMatrix, m);
  drawPlanet(gl, programList[3], mvpMatrix, viewMatrix, moonMatrix, ambientLightMatrix)

}



function initPlanet(gl, segments, img_day=undefined, img_night=undefined, img_normal=undefined) {
  let thistexture = undefined;
  let nighttexture = undefined;
  let normalmap = undefined;
  
  if (img_day == undefined) { 
    thistexture = loadTexture(gl, undefined, false, [255,255,255,255]);
  } else {
    thistexture = loadTexture(gl, img_day, true);
  }
  if (img_night == undefined) { 
    thistexture = loadTexture(gl, undefined, false, [255,255,255,255]);
  } else {
    nighttexture = loadTexture(gl, img_night, true);
  }
  if (img_normal == undefined) { 
    thistexture = loadTexture(gl, undefined, false, [255,255,255,255]);
  } else {
    normalmap = loadTexture(gl, img_normal, true); 
  }


  let shaderProgram = initShaderProgram(gl, vsPlanet, fsPlanet)
  thisprogram = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      normalPosition: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
      textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      viewMatrix: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
      modelMatrix: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
      uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
      ambientLightMatrix: gl.getUniformLocation(shaderProgram, 'ambientLightMatrix'),

      uNight: gl.getUniformLocation(shaderProgram, 'uNight'),
      uNormal: gl.getUniformLocation(shaderProgram, 'uNormal'),
    },
  };  
  thisprogram.buffers = plotSphere(gl, thisprogram, segments);
  thisprogram.texture = thistexture;
  thisprogram.textureNight = nighttexture;
  thisprogram.textureNormal = normalmap;

  return thisprogram;
}


function initTube(gl, coords, img_day=undefined, img_night=undefined, img_normal=undefined) {
  let locStart = coords[0];
  let locEnd = coords[1];
  let thistexture = undefined;
  let nighttexture = undefined;
  let normalmap = undefined;
  
  if (img_day == undefined) { 
    thistexture = loadTexture(gl, undefined, false, [255,255,255,255]);
  } else {
    thistexture = loadTexture(gl, img_day, true);
  }
  if (img_night == undefined) { 
    thistexture = loadTexture(gl, undefined, false, [255,255,255,255]);
  } else {
    nighttexture = loadTexture(gl, img_night, true);
  }
  if (img_normal == undefined) { 
    thistexture = loadTexture(gl, undefined, false, [255,255,255,255]);
  } else {
    normalmap = loadTexture(gl, img_normal, true); 
  }


  let shaderProgram = initShaderProgram(gl, vsPlanet, fsPlanet)
  thisprogram = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      normalPosition: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
      textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      viewMatrix: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
      modelMatrix: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
      uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
      ambientLightMatrix: gl.getUniformLocation(shaderProgram, 'ambientLightMatrix'),

      uNight: gl.getUniformLocation(shaderProgram, 'uNight'),
      uNormal: gl.getUniformLocation(shaderProgram, 'uNormal'),
    },
  };  
  thisprogram.buffers = plotTube(gl, thisprogram, locStart, locEnd);
  thisprogram.texture = thistexture;
  thisprogram.textureNight = nighttexture;
  thisprogram.textureNormal = normalmap;

  return thisprogram;
}


function initAtmos(gl, segments, img_day=undefined, img_night=undefined) {

  let thistexture = undefined;
  let nighttexture = undefined;
  
  if (img_day == undefined) { 
    thistexture = loadTexture(gl, undefined, false, [255,255,255,255]);
  } else {
    thistexture = loadTexture(gl, img_day, true);
  }
  if (img_day == undefined) { 
    thistexture = loadTexture(gl, undefined, false, [255,255,255,255]);
  } else {
    nighttexture = loadTexture(gl, img_night, true);
  }


  let shaderProgram = initShaderProgram(gl, vsPlanetAtmos, fsPlanetAtmos)
  thisprogram = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      //normalPosition: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
      textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      viewMatrix: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
      modelMatrix: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
      uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
      ambientLightMatrix: gl.getUniformLocation(shaderProgram, 'ambientLightMatrix'),

      uNight: gl.getUniformLocation(shaderProgram, 'uNight'),
    },
  };  
  thisprogram.buffers = plotSphere(gl, thisprogram, segments);
  thisprogram.texture = thistexture;
  thisprogram.textureNight = nighttexture;

  return thisprogram;
}


function initSkybox(gl, img_background) {
  
  let thistexture = loadTexture(gl, img_background, true);
  let shaderProgram = initShaderProgram(gl, vsSpace, fsSpace)

  thisprogram = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
      textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      viewMatrix: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
      modelMatrix: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
      uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
     },
  };  
  thisprogram.buffers = plotSkybox(gl, thisprogram);
  thisprogram.texture = thistexture;

  return thisprogram;
}


function drawPlanet(gl, programInfo, mvpMatrix, viewMatrix, modelMatrix, ambientLightMatrix) {
  // Tell WebGL how to pull out the positions from the position
  // buffer into the vertexPosition attribute.
  const numComponents = 3;  // pull out 2 values per iteration
  const type = gl.FLOAT;    // the data in the buffer is 32bit floats
  const normalize = false;  // don't normalize
  const stride = 0;         // how many bytes to get from one set of values to the next
                            // 0 = use type and numComponents above
  const offset = 0;         // how many bytes inside the buffer to start from

  // Tell WebGL to use our program when drawing
  gl.useProgram(programInfo.program);

  gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.buffers.textureCoord);
  gl.vertexAttribPointer(
    programInfo.attribLocations.textureCoord,
    2,
    type,
    normalize,
    stride,
    offset);
  gl.enableVertexAttribArray(
      programInfo.attribLocations.textureCoord);

  // Set vertice positions
  gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.buffers.position);
  gl.vertexAttribPointer(
    programInfo.attribLocations.vertexPosition,
    numComponents,
    type,
    normalize,
    stride,
    offset);
  gl.enableVertexAttribArray(
    programInfo.attribLocations.vertexPosition);
    
  if (typeof programInfo.buffers.normals !== 'undefined') {
    //set normals
    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.buffers.normals);
    gl.vertexAttribPointer(
      programInfo.attribLocations.normalPosition,
      numComponents,
      type,
      normalize,
      stride,
      offset);
    gl.enableVertexAttribArray(
      programInfo.attribLocations.normalPosition);
  }
      
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, programInfo.buffers.indicies);


  gl.uniformMatrix4fv(
    programInfo.uniformLocations.projectionMatrix,
    false,
    mvpMatrix); //mvp
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.viewMatrix,
    false,
    viewMatrix);
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.modelMatrix,
    false,
    modelMatrix);
  gl.uniformMatrix3fv(
    programInfo.uniformLocations.ambientLightMatrix,
    false,
    ambientLightMatrix);

  // Tell WebGL we want to affect texture unit 0
  gl.activeTexture(gl.TEXTURE0);
  // Bind the texture to texture unit 0
  gl.bindTexture(gl.TEXTURE_2D, programInfo.texture);
  // Tell the shader we bound the texture to texture unit 0
  gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

  if (typeof programInfo.textureNormal !== 'undefined') {
    // Tell WebGL we want to affect texture unit 1
    gl.activeTexture(gl.TEXTURE1);
    // Bind the texture to texture unit 1
    gl.bindTexture(gl.TEXTURE_2D, programInfo.textureNormal);
    // Tell the shader we bound the texture to texture unit 1
    gl.uniform1i(programInfo.uniformLocations.uNormal, 1);
  }
  
   if (typeof programInfo.textureNight !== 'undefined') {
    // Tell WebGL we want to affect texture unit 2
    gl.activeTexture(gl.TEXTURE2);
    // Bind the texture to texture unit 2
    gl.bindTexture(gl.TEXTURE_2D, programInfo.textureNight);
    // Tell the shader we bound the texture to texture unit 2
    gl.uniform1i(programInfo.uniformLocations.uNight, 2);
  }

  if (wireframe == false) {
    gl.drawElements(gl.TRIANGLES, programInfo.buffers.indexlen, gl.UNSIGNED_SHORT, 0);
  } else {
    gl.drawElements(gl.LINES, programInfo.buffers.indexlen, gl.UNSIGNED_SHORT, 0);
  }
}


function drawTube(gl, programInfo, mvpMatrix, viewMatrix, modelMatrix, ambientLightMatrix) {
  // Tell WebGL how to pull out the positions from the position
  // buffer into the vertexPosition attribute.
  const numComponents = 3;  // pull out 3 values per iteration
  const type = gl.FLOAT;    // the data in the buffer is 32bit floats
  const normalize = false;  // don't normalize
  const stride = 0;         // how many bytes to get from one set of values to the next
                            // 0 = use type and numComponents above
  const offset = 0;         // how many bytes inside the buffer to start from

  // Tell WebGL to use our program when drawing
  gl.useProgram(programInfo.program);

  gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.buffers.textureCoord);
  gl.vertexAttribPointer(
    programInfo.attribLocations.textureCoord,
    2,
    type,
    normalize,
    stride,
    offset);
  gl.enableVertexAttribArray(
      programInfo.attribLocations.textureCoord);

  // Set vertice positions
  gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.buffers.position);
  gl.vertexAttribPointer(
    programInfo.attribLocations.vertexPosition,
    numComponents,
    type,
    normalize,
    stride,
    offset);
  gl.enableVertexAttribArray(
    programInfo.attribLocations.vertexPosition);
    
  if (typeof programInfo.buffers.normals !== 'undefined') {
    //set normals
    gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.buffers.normals);
    gl.vertexAttribPointer(
      programInfo.attribLocations.normalPosition,
      numComponents,
      type,
      normalize,
      stride,
      offset);
    gl.enableVertexAttribArray(
      programInfo.attribLocations.normalPosition);
  }
      
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, programInfo.buffers.indicies);


  gl.uniformMatrix4fv(
    programInfo.uniformLocations.projectionMatrix,
    false,
    mvpMatrix); //mvp
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.viewMatrix,
    false,
    viewMatrix);
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.modelMatrix,
    false,
    modelMatrix);
  gl.uniformMatrix3fv(
    programInfo.uniformLocations.ambientLightMatrix,
    false,
    ambientLightMatrix);

  // Tell WebGL we want to affect texture unit 0
  gl.activeTexture(gl.TEXTURE0);
  // Bind the texture to texture unit 0
  gl.bindTexture(gl.TEXTURE_2D, programInfo.texture);
  // Tell the shader we bound the texture to texture unit 0
  gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

  if (typeof programInfo.textureNormal !== 'undefined') {
    // Tell WebGL we want to affect texture unit 1
    gl.activeTexture(gl.TEXTURE1);
    // Bind the texture to texture unit 1
    gl.bindTexture(gl.TEXTURE_2D, programInfo.textureNormal);
    // Tell the shader we bound the texture to texture unit 1
    gl.uniform1i(programInfo.uniformLocations.uNormal, 1);
  }
  
   if (typeof programInfo.textureNight !== 'undefined') {
    // Tell WebGL we want to affect texture unit 2
    gl.activeTexture(gl.TEXTURE2);
    // Bind the texture to texture unit 2
    gl.bindTexture(gl.TEXTURE_2D, programInfo.textureNight);
    // Tell the shader we bound the texture to texture unit 2
    gl.uniform1i(programInfo.uniformLocations.uNight, 2);
  }

  if (wireframe == false) {
    //gl.drawElements(gl.TRIANGLES, programInfo.buffers.indexlen, gl.UNSIGNED_SHORT, 0);
    //drawElements(mode, count, type, offset);
    //drawArrays(mode, first, count);
    gl.drawArrays(gl.TRIANGLES, 0, programInfo.buffers.indexlen);
  } else {
    gl.drawElements(gl.LINES, programInfo.buffers.indexlen, gl.UNSIGNED_SHORT, 0);
  }
}


function drawSkybox(gl, programInfo) {
  const numComponents = 3;  // pull out 2 values per iteration
  const type = gl.FLOAT;    // the data in the buffer is 32bit floats
  const normalize = false;  // don't normalize
  const stride = 0;         // how many bytes to get from one set of values to the next
  // 0 = use type and numComponents above
  const offset = 0;         // how many bytes inside the buffer to start from
  
  gl.disable(gl.DEPTH_TEST);
  // Tell WebGL to use our program when drawing
  gl.useProgram(programInfo.program);

  gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.buffers.textureCoord);
  gl.vertexAttribPointer(
    programInfo.attribLocations.textureCoord,
    2,
    type,
    normalize,
    stride,
    offset);
  gl.enableVertexAttribArray(
    programInfo.attribLocations.textureCoord);

  // Set vertice positions
  gl.bindBuffer(gl.ARRAY_BUFFER, programInfo.buffers.position);
  gl.vertexAttribPointer(
    programInfo.attribLocations.vertexPosition,
    numComponents,
    type,
    normalize,
    stride,
    offset);
  gl.enableVertexAttribArray(
    programInfo.attribLocations.vertexPosition);
      
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, programInfo.buffers.indicies);

  // Tell WebGL we want to affect texture unit 0
  gl.activeTexture(gl.TEXTURE0);
  // Bind the texture to texture unit 0
  gl.bindTexture(gl.TEXTURE_2D, programInfo.texture);
  // Tell the shader we bound the texture to texture unit 0
  gl.uniform1i(programInfo.uniformLocations.uSampler, 0);

  if (wireframe == false) {
    gl.drawElements(gl.TRIANGLES, programInfo.buffers.indexlen, gl.UNSIGNED_SHORT, 0);
  } else {
    gl.drawElements(gl.LINES, programInfo.buffers.indexlen, gl.UNSIGNED_SHORT, 0);
  }

  gl.enable(gl.DEPTH_TEST);

}


//calc a line between two points made from X segments and at least Y distance apart
function plotTube(gl, prog, startpoint, endpoint, steps = 120, minDistance = 0.06) {
  let nextVec = [];
  let diffVec = [];
  let vertexPositionData = [];
  let indexData = [];
  let textureCoordData = [];
  let tubeNumb = 0;

  if (minDistance <= 0.0) {
    console.log("plotLine distance is too small");
    return false;
  }
  startVec = convert2Map(startpoint);
  endVec = convert2Map(endpoint);
  currVec = startVec;

  gap = checkGap(startVec, endVec);
  steps = steps * (gap)
  
  prevPoint = startVec; //setting this now avoids the need for an if check inside the loop

  //console.log("steps: " + steps);
  diffVec[0] = (endVec[0] - startVec[0]) / steps;
  diffVec[1] = (endVec[1] - startVec[1]) / steps;
  diffVec[2] = (endVec[2] - startVec[2]) / steps;
  
  for (let i=1; i <= steps; i++) {
    //calculate the next vector and store in nextVec
    nextVec[0] = startVec[0] + (diffVec[0] * i);
    nextVec[1] = startVec[1] + (diffVec[1] * i);
    nextVec[2] = startVec[2] + (diffVec[2] * i);
    
    pos = movePoint2Sphere(currVec, nextVec);
    //scan bewteen points and ignore point that are two close
    gap = checkGap(prevPoint, pos);
    //console.log("gap: " + (gap));
    if (gap > minDistance) {
      //calc tube of triangles between 2 points
      t = calcTubes(prevPoint, pos, tubeNumb);
      prevPoint = pos;
      //merge the arrays
      vertexPositionData = vertexPositionData.concat(t.positions);
      indexData = indexData.concat(t.index);
      textureCoordData = textureCoordData.concat(t.textureCoord);
      //indexlength += t.indexlen;
      tubeNumb += 1;
    }
    currVec = nextVec;
  }

  //always add the endpoint :)
  endVec = convert2Map(endpoint);
  pos = movePoint2Sphere(currVec, endVec);
  t = calcTubes(prevPoint, pos, tubeNumb);
  //merge the arrays
  vertexPositionData = vertexPositionData.concat(t.positions);
  indexData = indexData.concat(t.index);
  textureCoordData = textureCoordData.concat(t.textureCoord)
  //indexlength += t.indexlen;

  // console.log("vec1:" + startVec);
  // console.log("vec2:" + endVec);
  //console.log(vertexPositionData);
  bufferPoints = initGlBuffers(gl, prog, vertexPositionData, undefined, textureCoordData, indexData)
  
  // Assign texturePosition
  let texturePosition = prog.attribLocations.texturePosition;
  gl.vertexAttribPointer(texturePosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(texturePosition);
  
  // Assign position coords to attrib and enable it.
  let VertexPosition = prog.attribLocations.vertexPosition;
  gl.vertexAttribPointer(VertexPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(VertexPosition);
  
  return bufferPoints;
}


function calcTubes(startPoint, endPoint, tubeNumb = 0) {
  let out = [];
  let im = (3 * 8) * tubeNumb;

  //draw x points of circle on x/z plane
  let endCap = [  
    0.5, 0.0, -0.5, //0 4 front right top
    0.5, 0.0,  0.5, //1 5 back right top
   -0.5, 0.0,  0.5, //2 6 back left top
   -0.5, 0.0, -0.5 //3 7 front left top
  ];

  // let endCap = [
  //   -1.0, 0.0, 0.0, //0 2 left
  //    1.0, 0.0, 0.0, //1 3 right
  // ];

  let capTopPos = mat4.create();
  let capBottomPos = mat4.create();
  let endCapTop = Array.from(endCap);
  let endCapBottom = Array.from(endCap);
  
  //rotate to point at pos
  //mat4.rotate(cT, cT, 0.15);

  //translate to position start/end Point
  mat4.fromTranslation(capTopPos, endPoint);
  mat4.fromTranslation(capBottomPos, startPoint);

  // a 	Array 		the array of vectors to iterate over
  // stride 	Number 		Number of elements between the start of each vec3. If 0 assumes tightly packed
  // offset 	Number 		Number of elements to skip at the beginning of the array
  // count 	Number 		Number of vec3s to iterate over. If 0 iterates over entire array
  // fn 	function 		Function to call for each vector in the array
  // arg 	Object 	<optional>
  //   additional argument to pass to fn

  vec3.forEach(endCapTop, 3, 0, 0, vec3.transformMat4, capTopPos);
  vec3.forEach(endCapBottom, 3, 0, 0, vec3.transformMat4, capBottomPos);

  out = endCapTop//.concat(endCapBottom);

  // 0   /|1
  //    / |
  //   /  |
  //  /---|3
  // 2
  
  // var indexData = [
  //   0, 1, 2,
  //   2, 1, 3
  // ];

  // var indexData = [
  //   0 + im, 4 + im, 7 + im,  //front face
  //   7 + im, 3 + im, 0 + im,  //front face
  //   3 + im, 7 + im, 6 + im,  //left face
  //   6 + im, 2 + im, 3 + im,  //left face
  //   2 + im, 6 + im, 5 + im,  //back face
  //   5 + im, 1 + im, 2 + im,  //back face
  //   1 + im, 5 + im, 4 + im,  //right face
  //   4 + im, 0 + im, 1 + im   //right face
  // ];

  // var indexData = [
  //   0, 4, 7,  //front face
  //   7, 3, 0,  //front face
  //   3, 7, 6,  //left face
  //   6, 2, 3,  //left face
  //   2, 6, 5,  //back face
  //   5, 1, 2,  //back face
  //   1, 5, 4,  //right face
  //   4, 0, 1   //right face
  // ];

  var textureCoordData = [
    1.0, 1.0,
    1.0, 0.0,
    0.0, 0.0,
    0.0, 1.0,
    0.0, 0.0, 
    1.0, 1.0,
    0.0, 0.0,
    0.0, 0.0, 
    0.0, 0.0,
    1.0, 0.0,
    0.0, 0.0,
    0.0, 0.0
  ];


  //use point to mark triangle
  return {
    positions: out,
    //index: indexData,
    textureCoord: textureCoordData,
  }
}


let fps_time = 0.0;

function render(now) {
  now *= 0.001;  // convert to seconds
  const deltaTime = now - then;
  then = now;

  //calcballs();
  drawScene(gl, programInfo, deltaTime);

  fps_time += deltaTime;
  if (fps_time >= 1.0) {
    document.getElementById("info").innerHTML = (1.0 / deltaTime) + "fps";
    fps_time = 0.0;
  }

  if (stillRunning == true) {
    requestAnimationFrame(render);
  }
}


init();


let myWorker = new Worker('pointsworker.js');
myWorker.onmessage = function(e) {
  line = initTube(gl, [e.data, centralLocation]);
  lineProgram.push(line);
  coords.push(line);
}

requestAnimationFrame(render);
