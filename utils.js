

function canvasResize(canvas, gl) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  gl.viewport(0, 0, canvas.width, canvas.height);
}


//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource, 'vertex');
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource, 'fragment');

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}


//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source, name) {
  const shader = gl.createShader(type);

  // Send the source to the shader object
  gl.shaderSource(shader, source);

  // Compile the shader program
  gl.compileShader(shader);

  // See if it compiled successfully
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the ' + name + ' shader: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}


//
// Initialize a texture and load an image.
// When the image finished loading copy it into the texture.
//
function loadTexture(gl, url=undefined, flip=false, emptyColor=[0, 0, 0, 255]) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Because images have to be download over the internet
  // they might take a moment until they are ready.
  // Until then put a single pixel in the texture so we can
  // use it immediately. When the image has finished downloading
  // we'll update the texture with the contents of the image.
  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array(emptyColor);  // opaque blue

  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                width, height, border, srcFormat, srcType,
                pixel);

  var image = new Image();
  image.flip = flip;
  image.onload = function() {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    if (this.flip == true) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    }
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  srcFormat, srcType, image);

    // WebGL1 has different requirements for power of 2 images
    // vs non power of 2 images so check if the image is a
    // power of 2 in both dimensions.
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
      // Yes, it's a power of 2. Generate mips.
      gl.generateMipmap(gl.TEXTURE_2D);
    } else {
      // No, it's not a power of 2. Turn of mips and set
      // wrapping to clamp to edge
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  };

  if (url != undefined) {
    image.src = url;
  }

  return texture;
}
  

function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}


function plotSphere(gl, prog, bands=[10,10]) {
  let latitudeBands = bands[0];
  let longitudeBands = bands[1];
  let radius = 1;

  let vertexPositionData = [];
  let normalData = [];
  let textureCoordData = [];
  let indexData = [];

  // Calculate sphere vertex positions, normals, and texture coordinates.
  for (let latNumber = 0; latNumber <= latitudeBands; ++latNumber) {
    let theta = latNumber * Math.PI / latitudeBands;
    let sinTheta = Math.sin(theta);
    let cosTheta = Math.cos(theta);

    for (let longNumber = 0; longNumber <= longitudeBands; ++longNumber) {
      let phi = longNumber * 2 * Math.PI / longitudeBands;
      let sinPhi = Math.sin(phi);
      let cosPhi = Math.cos(phi);

      let x = cosPhi * sinTheta;
      let y = cosTheta;
      let z = sinPhi * sinTheta;

      let u = 1 - (longNumber / longitudeBands);
      let v = 1 - (latNumber / latitudeBands);

      vertexPositionData.push(radius * x);
      vertexPositionData.push(radius * y);
      vertexPositionData.push(radius * z);

      normalData.push(x);
      normalData.push(y);
      normalData.push(z);

      textureCoordData.push(u);
      textureCoordData.push(v);
    }
  }

  // Calculate sphere indices.
  for (let latNumber = 0; latNumber < latitudeBands; ++latNumber) {
    for (let longNumber = 0; longNumber < longitudeBands; ++longNumber) {
      let first = (latNumber * (longitudeBands + 1)) + longNumber;
      let second = first + longitudeBands + 1;

      indexData.push(first);
      indexData.push(second);
      indexData.push(first + 1);

      indexData.push(second);
      indexData.push(second + 1);
      indexData.push(first + 1);
    }
  }

  vertexPositionData = new Float32Array(vertexPositionData);
  normalData = new Float32Array(normalData);
  textureCoordData = new Float32Array(textureCoordData);
  indexData = new Uint16Array(indexData);
  
  // Create buffer objects.
  let textureCoordBuffer = gl.createBuffer();
  let vertexPositionBuffer = gl.createBuffer();
  let vertexNormalBuffer = gl.createBuffer();
  let indexBuffer = gl.createBuffer();
  
  // Write the texture data to buffer object.
  gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, textureCoordData, gl.STATIC_DRAW);

  // Assign texturePosition
  let texturePosition = prog.attribLocations.texturePosition;
  gl.vertexAttribPointer(texturePosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(texturePosition);

  // Write the vertex positions to their buffer object.
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertexPositionData, gl.STATIC_DRAW);
  
  // Assign position coords to attrib and enable it.
  let VertexPosition = prog.attribLocations.vertexPosition;
  gl.vertexAttribPointer(VertexPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(VertexPosition);
  

  // Write the normals to their buffer object.
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexNormalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, normalData, gl.STATIC_DRAW);

  // Assign normal to attrib and enable it.
  let VertexNormal = prog.attribLocations.normalPosition;
  gl.vertexAttribPointer(VertexNormal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(VertexNormal);

  // Pass index buffer data to element array buffer.
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);
  
  
  return {
    position: vertexPositionBuffer,
    normals: vertexNormalBuffer,
    textureCoord: textureCoordBuffer,
    indicies: indexBuffer,
    indexlen: indexData.length
  }
}


function plotSkybox(gl, prog) {

    var vertexPositionData = [];
    var textureCoordData = [];
    var indexData = [];

    var vertexPositionData = [  
         1.0,  1.0, 1.0,  // top right
         1.0, -1.0, 1.0,  // bottom right
        -1.0, -1.0, 1.0,  // bottom left
        -1.0,  1.0, 1.0   // top left 
    ];

     var indexData = [
        0, 1, 3,   // first triangle
        1, 2, 3    // second triangle
    ];

    var textureCoordData = [
        1.0, 1.0,
        1.0, 0.0,
        0.0, 0.0,
        0.0, 1.0
    ];
    

    vertexPositionData = new Float32Array(vertexPositionData);
    textureCoordData = new Float32Array(textureCoordData);
    indexData = new Uint16Array(indexData);
    
    // Create buffer objects.
    let textureCoordBuffer = gl.createBuffer();
    let vertexPositionBuffer = gl.createBuffer();
    let indexBuffer = gl.createBuffer();
    
    // Write the texture data to buffer object.
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, textureCoordData, gl.STATIC_DRAW);

    // Assign texturePosition
    let texturePosition = prog.attribLocations.texturePosition;
    gl.vertexAttribPointer(texturePosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(texturePosition);

    // Write the vertex positions to their buffer object.
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexPositionData, gl.STATIC_DRAW);
    
    // Assign position coords to attrib and enable it.
    let VertexPosition = prog.attribLocations.vertexPosition;
    gl.vertexAttribPointer(VertexPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(VertexPosition);
    

    // Pass index buffer data to element array buffer.
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);
    
    return {
        position: vertexPositionBuffer,
        textureCoord: textureCoordBuffer,
        indicies: indexBuffer,
        indexlen: indexData.length
    }
}

