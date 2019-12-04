//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// From 2013 book "WebGL Programming Guide"
// Chapter 5: ColoredTriangle.js (c) 2012 matsuda  AND
// Chapter 4: RotatingTriangle_withButtons.js (c) 2012 matsuda AND
//	Lengyel 2013 book: "Mathematics for 3D Game Programming and Computer Graphics
// 										," 3rd Ed. Chapter 4 on quaternions,
// merged and modified to became:
//
// ControlQuaternion.js for EECS 351-1, 
//									Northwestern Univ. Jack Tumblin

//		--demonstrate several different user I/O methods: 
//				--Webpage pushbuttons and 'innerHTML' for text display
//				--Mouse click & drag within our WebGL-hosting 'canvas'
//		--demonstrate use of quaternions for user-controlled rotation
//
//	2016.02.12--In-class Activity: add basic diffuse lighting to determine
//							each vertex color.
// -----PLAN:--------------
//   	a)--Add 'surface normal' attributes to each of the vertices created in the 
//	initVertexBufferobject() function.  (Be sure you adjust the rest of the code 
//	to work properly with these new vertices that have an additional attribute).
//		(test it--in the vertex shader program, what should happen if you add a fraction
//		  of the normal vector to the position attribute for each vertex?
//			ANSWER: each face should get displaced outwards, 'exploding' the shape...
//			Bugs?  set all normals to zero except one, add normals to position, see
//						 on-screen the direction for each individual face's normal vector )
//
// 		b)--Add a 'normal matrix' transform; be sure to do all needed setup in 
//	your JavaScript program and in your your GLSL shader programs. You will need 
//	to use those shaders to compute the dot-product of :
//      -- the unit-length surface normal vector N (unit-length? CAREFUL! if you 
//			transformed that normal vector you may have changed its maginitude).
//      --a lighting direction vector (or just use world-space '+Z' axis).
//
//		c)--In the shader(s), use the dot-product result as a weight for the 
// 	vertex color, yielding simple diffuse shading. CAREFUL! dot-products can have
//	negative results, but we need a result restricted to stay within 0 to +1. 
//
// Vertex shader program----------------------------------
var VSHADER_SOURCE = 
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_NormalMatrix;\n' +
  'attribute vec4 a_Position;\n' +
  'attribute vec3 a_Color;\n' +
  'attribute vec3 a_Normal;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  'vec4 transVec = u_NormalMatrix * vec4(a_Normal, 0.0);\n' +
  'vec3 normVec = normalize(transVec.xyz);\n' +
  'vec3 lightVec = vec3(0.0, 0.0, -1.0);\n' +				
  '  gl_Position = u_ModelMatrix * a_Position;\n' +
  '  v_Color = vec4(0.3*a_Color + 0.7*dot(normVec,lightVec), 1.0);\n' +
  '}\n';

// Fragment shader program----------------------------------
var FSHADER_SOURCE = 
  'precision mediump float;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

// Global Variables for the spinning tetrahedron:
var ANGLE_STEP = 45.0;  // default rotation angle rate (deg/sec)

// Global vars for mouse click-and-drag for rotation.
var isDrag=false;		// mouse-drag: true when user holds down mouse button
var xMclik=0.0;			// last mouse button-down position (in CVV coords)
var yMclik=0.0;   
var xMdragTot=0.0;	// total (accumulated) mouse-drag amounts (in CVV coords).
var yMdragTot=0.0;  

var qNew = new Quaternion(0,0,0,1); // most-recent mouse drag's rotation
var qTot = new Quaternion(0,0,0,1);	// 'current' orientation (made from qNew)
var quatMatrix = new Matrix4();				// rotation matrix, made from latest qTot
var floatsPerVertex = 10;

// --------------------- Global Variables----------------------------------
var canvas;		// main() sets this to the HTML-5 'canvas' element used for WebGL.
var gl;				// main() sets this to the rendering context for WebGL. This object
var g_canvas = document.getElementById('webgl');

// --------------------- Eye positions -----------------------------------
var g_EyeX = -0.5, g_EyeY = 8.6, g_EyeZ = 1; // Eye position
var forward = 0.5;
var sideway = 0.3;
var theta = -3.14;
var turn_height = 0;
var currentAngle = 0;

function main() {
//==============================================================================
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var myGL = getWebGLContext(g_canvas);
  if (!myGL) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl = myGL;	// make it global--for every function to use.

	window.addEventListener("keydown", myKeyDown, false);

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Initialize a Vertex Buffer in the graphics system to hold our vertices
  var n = initVertexBuffer(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }
	// Register the Mouse & Keyboard Event-handlers-------------------------------
	// If users press any keys on the keyboard or move, click or drag the mouse,
	// the operating system records them as 'events' (small text strings that 
	// can trigger calls to functions within running programs). JavaScript 
	// programs running within HTML webpages can respond to these 'events' if we:
	//		1) write an 'event handler' function (called when event happens) and
	//		2) 'register' that function--connect it to the desired HTML page event. //
	// Here's how to 'register' all mouse events found within our HTML-5 canvas:
  canvas.onmousedown	=	function(ev){myMouseDown( ev, gl, canvas) }; 
  					// when user's mouse button goes down, call mouseDown() function
  canvas.onmousemove = 	function(ev){myMouseMove( ev, gl, canvas) };
											// when the mouse moves, call mouseMove() function					
  canvas.onmouseup = 		function(ev){myMouseUp(   ev, gl, canvas)};
  					// NOTE! 'onclick' event is SAME as on 'mouseup' event
  					// in Chrome Brower on MS Windows 7, and possibly other 
  					// operating systems; thus I use 'mouseup' instead.
  
	// END Mouse & Keyboard Event-Handlers-----------------------------------
	
  // Specify the color for clearing <canvas>
  gl.clearColor(0.3, 0.3, 0.3, 1.0);

	// NEW!! Enable 3D depth-test when drawing: don't over-draw at any pixel 
	// unless the new Z value is closer to the eye than the old one..
	gl.depthFunc(gl.LESS);			 // WebGL default setting: (default)
	gl.enable(gl.DEPTH_TEST); 
	
	// Create 'Uniform' vars to send to GPU----------------------------------
  // Get handle to graphics system's storage location for u_ModelMatrix
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) { 
    console.log('Failed to get GPU storage location for u_ModelMatrix');
    return;
  }
  // Create our JavaScript 'model' matrix (we send its values to GPU)
  var modelMatrix = new Matrix4();
  //------------------------------------------------------------------
	// Get handle to graphics systems' storage location for u_NormalMatrix
	var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
	if(!u_NormalMatrix) {
		console.log('Failed to get GPU storage location for u_NormalMatrix');
		return
	}
	// Create our JavaScript 'normal' matrix (we send its values to GPU
	var normalMatrix = new Matrix4();
	// (holds inverse-transpose of 'model' matrix.  Transform vertex positions
	// in VBO by 'model' matrix to convert to 'world' coordinates, and 
	// transform surface normal vectors by 'normal' matrix to convert to 'world').
	//------------------------------------------------------------------

	// NEW! -- make new canvas to fit the browser-window size;
	drawResize(gl, n, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);   // On this first call, Chrome browser seems to use the
	// initial fixed canvas size we set in the HTML file;
	// But by default Chrome opens its browser at the same
	// size & location where you last closed it, so
	drawResize(gl, n, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);   // Call drawResize() a SECOND time to re-size canvas to
	// match the current browser size.
  // Create, init current rotation angle value in JavaScript
  
//====================================
	testQuaternions();		// test fcn at end of file
//=====================================

  // ANIMATION: create 'tick' variable whose value is this function:
  //----------------- 
  var tick = function() {
    currentAngle = animate(currentAngle);  // Update the rotation angle
	  drawResize(gl, n, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);
//    console.log('currentAngle=',currentAngle); // put text in console.
    requestAnimationFrame(tick, canvas);   
    									// Request that the browser re-draw the webpage
    									// (causes webpage to endlessly re-draw itself)
  };
  tick();							// start (and continue) animation: draw current image
	
}

function drawResize(gl, n, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix) {
//==============================================================================
// Called when user re-sizes their browser window , because our HTML file
// contains:  <body onload="main()" onresize="winResize()">

	var nuCanvas = document.getElementById('webgl');	// get current canvas
	var nuGL = getWebGLContext(nuCanvas);							// and context:

	//Report our current browser-window contents:

	// console.log('nuCanvas width,height=', nuCanvas.width, nuCanvas.height);
	// console.log('Browser window: innerWidth,innerHeight=',
	// 	innerWidth, innerHeight);	// http://www.w3schools.com/jsref/obj_window.asp


	//Make canvas fill the top 3/4 of our browser window:
	nuCanvas.width = innerWidth;
	nuCanvas.height = innerHeight*4/5;


	// IMPORTANT!  Need a fresh drawing in the re-sized viewports.
	drawTwoView(gl, n, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);
}

function drawTwoView(gl, n, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix) {
	// Specify the color for clearing <canvas>

	// NEW!! Enable 3D depth-test when drawing: don't over-draw at any pixel
	// unless the new Z value is closer to the eye than the old one..
//	gl.depthFunc(gl.LESS);			 // WebGL default setting: (default)
	gl.enable(gl.DEPTH_TEST);

	// Get handle to graphics system's storage location of u_ModelMatrix
	// var viewMatrix = new Matrix4();

	// store the view matrix and projection matrix
	// var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');

	// Create, init current rotation angle value in JavaScript
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	var ratio = (innerWidth) / innerHeight;
	gl.viewport(0, 0, g_canvas.width, g_canvas.height);
	modelMatrix.setIdentity();    // DEFINE 'world-space' coords.
	modelMatrix.perspective(40.0,   // FOVY: top-to-bottom vertical image angle, in degrees
		ratio,   // Image Aspect Ratio: camera lens width/height width/height = (right-left) / (top-bottom) = right/top
		1.0,   // camera z-near distance (always positive; frustum begins at z = -znear)
		100.0);  // camera z-far distance (always positive; frustum ends at z = -zfar)
	// console.log("parameters", g_EyeX, g_EyeY, g_EyeZ, theta);
	modelMatrix.lookAt(g_EyeX, g_EyeY, g_EyeZ,     // center of projection
		g_EyeX + Math.sin(theta), g_EyeY + Math.cos(theta), g_EyeZ + turn_height,      // look-at point
		0.0, 0.0, 1.0);     // 'up' vector
	drawAll(gl, n, currentAngle, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);   // Draw shapes
}

function drawAll(gl, n, currentAngle, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix) {
	drawGroundGrid(gl, n, currentAngle, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix);
}


function makePyramid() {
	var c30 = Math.sqrt(0.75);					// == cos(30deg) == sqrt(3) / 2
	var sq2	= Math.sqrt(2.0);
	// for surface normals:
	var sq23 = Math.sqrt(2.0/3.0)
	var sq29 = Math.sqrt(2.0/9.0)
	var sq89 = Math.sqrt(8.0/9.0)
	var thrd = 1.0/3.0;
	pyramidShapes = new Float32Array([
		// Vertex coordinates(x,y,z,w) and color (R,G,B) for a new color tetrahedron:
		// HOW TO BUILD A SYMMETRICAL TETRAHEDRON:
		//	--define it by 4 'nodes' (locations where we place 1 or more vertices).
		//	--Each node connects to every other node by an 'edge'.
		//	--Any 3 nodes chosen will form an equilateral triangle from 3 edges.
		//	--Every corner of every equilateral triangle forms a 60 degree angle.
		//	--We can define the 'center' of an equilateral triangle as the point
		//		location equally distant from each triangle corner.
		//		Equivalently, the center point is the intersection of the lines that
		//		bisect the 60-degree angles at each corner of the triangle.
		//	--Begin by defining an equilateral triangle in xy plane with center point
		//		at the origin. Create each node by adding a unit vector to the origin;
		//		node n1 at (0,1,0);
		//	  node n2 at ( cos30, -0.5, 0)  (30 degrees below x axis)
		//		node n3 at (-cos30, -0.5, 0)  (Note that cos30 = sqrt(3)/2).
		//	--Note the triangle's 'height' in y is 1.5 (from y=-0.5 to y= +1.0).
		//	--Choose node on +z axis at location that will form equilateral triangles
		//		with the sides of the n1,n2,n3 triangle edges.
		//	--Look carefully at the n0,n3,n1 triangle; its height (1.5) stretches from
		//		(0,-0.5,0) to node n0 at (0,0,zheight).  Thus 1.5^2 = 0.5^2 + zheight^2,
		//		or 2.25 = 0.25 + zHeight^2; thus zHeight==sqrt2.
		// 		node n0 == Apex on +z axis; equilateral triangle base at z=0.
		//  -- SURFACE NORMALS?
		//		See: '2016.02.17.HowToBuildTetrahedron.pdf' on Canvas
		//
		/*	Nodes:
                 0.0,	 0.0, sq2, 1.0,			0.0, 	0.0,	1.0,	// Node 0 (apex, +z axis;  blue)
             c30, -0.5, 0.0, 1.0, 		1.0,  0.0,  0.0, 	// Node 1 (base: lower rt; red)
             0.0,  1.0, 0.0, 1.0,  		0.0,  1.0,  0.0,	// Node 2 (base: +y axis;  grn)
            -c30, -0.5, 0.0, 1.0, 		1.0,  1.0,  1.0, 	// Node 3 (base:lower lft; white)
        */

// Face 0: (right side).  Unit Normal Vector: N0 = (sq23, sq29, thrd)
		// Node 0 (apex, +z axis; 			color--blue, 				surf normal (all verts):
		0.0,	 0.0, sq2, 1.0,			0.0, 	0.0,	1.0,		 sq23,	sq29, thrd,
		// Node 1 (base: lower rt; red)
		c30, -0.5, 0.0, 1.0, 			1.0,  0.0,  0.0, 		sq23,	sq29, thrd,
		// Node 2 (base: +y axis;  grn)
		0.0,  1.0, 0.0, 1.0,  		0.0,  1.0,  0.0,		sq23,	sq29, thrd,
// Face 1: (left side).		Unit Normal Vector: N1 = (-sq23, sq29, thrd)
		// Node 0 (apex, +z axis;  blue)
		0.0,	 0.0, sq2, 1.0,			0.0, 	0.0,	1.0,	 -sq23,	sq29, thrd,
		// Node 2 (base: +y axis;  grn)
		0.0,  1.0, 0.0, 1.0,  		0.0,  1.0,  0.0,	 -sq23,	sq29, thrd,
		// Node 3 (base:lower lft; white)
		-c30, -0.5, 0.0, 1.0, 		1.0,  1.0,  1.0, 	 -sq23,	sq29,	thrd,
// Face 2: (lower side) 	Unit Normal Vector: N2 = (0.0, -sq89, thrd)
		// Node 0 (apex, +z axis;  blue)
		0.0,	 0.0, sq2, 1.0,			0.0, 	0.0,	1.0,		0.0, -sq89,	thrd,
		// Node 3 (base:lower lft; white)
		-c30, -0.5, 0.0, 1.0, 		1.0,  1.0,  1.0, 		0.0, -sq89,	thrd,          																							//0.0, 0.0, 0.0, // Normals debug
		// Node 1 (base: lower rt; red)
		c30, -0.5, 0.0, 1.0, 			1.0,  0.0,  0.0, 		0.0, -sq89,	thrd,
// Face 3: (base side)  Unit Normal Vector: N2 = (0.0, 0.0, -1.0)
		// Node 3 (base:lower lft; white)
		-c30, -0.5, 0.0, 1.0, 		1.0,  1.0,  1.0, 		0.0, 	0.0, -1.0,
		// Node 2 (base: +y axis;  grn)
		0.0,  1.0, 0.0, 1.0,  		0.0,  1.0,  0.0,		0.0, 	0.0, -1.0,
		// Node 1 (base: lower rt; red)
		c30, -0.5, 0.0, 1.0, 			1.0,  0.0,  0.0, 		0.0, 	0.0, -1.0,

		// Drawing Axes: Draw them using gl.LINES drawing primitive;
		//--------------------------------------------------------------
		// +x axis RED; +y axis GREEN; +z axis BLUE; origin: GRAY
		// (I added 'normal vectors' to stay compatible with tetrahedron verts)
// X axis line 	(origin: gray -- endpoint: red. 			Normal Vector: +y
		0.0,  0.0,  0.0, 1.0,			0.3,  0.3,  0.3,			0.0, 	1.0,	0.0,
		1.3,  0.0,  0.0, 1.0,			1.0,  0.3,  0.3,			0.0, 	1.0, 	0.0,
// Y axis line:	(origin: gray -- endpoint: green			Normal Vector: +z)
		0.0,  0.0,  0.0, 1.0,    	0.3,  0.3,  0.3,			0.0,	0.0,	1.0,
		0.0,  1.3,  0.0, 1.0,			0.3,  1.0,  0.3,			0.0, 	0.0,	1.0,
// Z axis line: (origin: gray -- endpoint: blue				Normal Vector: +x)
		0.0,  0.0,  0.0, 1.0,			0.3,  0.3,  0.3,			1.0, 	0.0,	0.0,
		0.0,  0.0,  1.3, 1.0,			0.3,  0.3,  1.0,			1.0, 	0.0,	0.0,
	]);
}

function makeGroundGrid() {
//==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
// centered at the origin.  Draw this shape using the GL_LINES primitive.

	var xcount = 200;			// # of lines to draw in x,y to make the grid.
	var ycount = 200;
	var xymax	= 20;			// grid size; extends to cover +/-xymax in x and y.
	var xColr = new Float32Array([1.0, 1.0, 0.3]);	// bright yellow
	var yColr = new Float32Array([0.5, 1.0, 0.5]);	// bright green.
	var n_x = Math.random() * 0.5;
	var n_y = Math.random() * 0.5;

	// Create an (global) array to hold this ground-plane's vertices:
	gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
	// draw a grid made of xcount+ycount lines; 2 vertices per line.

	var xgap = xymax/ (xcount-1);		// HALF-spacing between lines in x,y;
	var ygap = xymax/ (ycount-1);		// (why half? because v==(0line number/2))

	// First, step thru x values as we make vertical lines of constant-x:
	for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
		if(v%2==0) {	// put even-numbered vertices at (xnow, -xymax, 0)
			gndVerts[j  ] = -xymax + (v)*xgap;	// x
			gndVerts[j+1] = -xymax;								// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		else {				// put odd-numbered vertices at (xnow, +xymax, 0).
			gndVerts[j  ] = -xymax + (v-1)*xgap;	// x
			gndVerts[j+1] = xymax;								// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		gndVerts[j+4] = xColr[0];			// red
		gndVerts[j+5] = xColr[1];			// grn
		gndVerts[j+6] = xColr[2];			// blu
		gndVerts[j+7] = n_x;			// normal x
		gndVerts[j+8] = n_y;			// normal y
		gndVerts[j+9] = 1;			// blu
	}
	// Second, step thru y values as wqe make horizontal lines of constant-y:
	// (don't re-initialize j--we're adding more vertices to the array)
	for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
		if(v%2==0) {		// put even-numbered vertices at (-xymax, ynow, 0)
			gndVerts[j  ] = -xymax;								// x
			gndVerts[j+1] = -xymax + (v  )*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		else {					// put odd-numbered vertices at (+xymax, ynow, 0).
			gndVerts[j  ] = xymax;								// x
			gndVerts[j+1] = -xymax + (v-1)*ygap;	// y
			gndVerts[j+2] = 0.0;									// z
			gndVerts[j+3] = 1.0;									// w.
		}
		gndVerts[j+4] = yColr[0];			// red
		gndVerts[j+5] = yColr[1];			// grn
		gndVerts[j+6] = yColr[2];			// blu
		gndVerts[j+7] = n_x;			// normal x
		gndVerts[j+8] = n_y;			// normal y
		gndVerts[j+9] = 1;			// normal z
	}
}

function initVertexBuffer(gl) {
//==============================================================================
	makePyramid();
	makeGroundGrid();

	var mySiz = (pyramidShapes.length + gndVerts.length);
	var nn = mySiz / floatsPerVertex;

  	var colorShapes = new Float32Array(mySiz);
  	var i = 0;
  	// draw pyramid
  	pyramidStart = i;
	for(j=0; j< pyramidShapes.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = pyramidShapes[j];
	}

	// draw ground grid
	gndStart = i;
	for(j=0; j< gndVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = gndVerts[j];
	}

	
  // Create a buffer object to hold these vertices inside the graphics system
  var shapeBufferHandle = gl.createBuffer();  
  if (!shapeBufferHandle) {
    console.log('Failed to create the shape buffer object');
    return false;
  }

  // Bind the the buffer object to target:
  gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
  // Transfer data from Javascript array colorShapes to Graphics system VBO
  // (Use sparingly--may be slow if you transfer large shapes stored in files)
  gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);
  // gl.STATIC_DRAW?  a 'usage hint' for OpenGL/WebGL memory usage: says we 
  // won't change these stored buffer values, and use them solely for drawing.

  var FSIZE = colorShapes.BYTES_PER_ELEMENT; // how many bytes per stored value?
    
  //Get graphics system's handle for our Vertex Shader's position-input variable: 
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  // Use handle to specify how to retrieve position data from our VBO:
  gl.vertexAttribPointer(
  		a_Position, 	// choose Vertex Shader attribute to fill with data
  		4, 						// how many values? 1,2,3 or 4.  (we're using x,y,z,w)
  		gl.FLOAT, 		// data type for each value: usually gl.FLOAT
  		false, 				// did we supply fixed-point data AND it needs normalizing?
  		FSIZE * 10, 	// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b, nx,ny,nz) * bytes/value
  		0);						// Offset -- now many bytes from START of buffer to the
  									// value we will actually use?
  gl.enableVertexAttribArray(a_Position);  
  									// Enable assignment of vertex buffer object's position data

  // Get graphics system's handle for our Vertex Shader's color-input variable;
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  // Use handle to specify how to retrieve color data from our VBO:
  gl.vertexAttribPointer(
  	a_Color, 				// choose Vertex Shader attribute to fill with data
  	3, 							// how many values? 1,2,3 or 4. (we're using R,G,B)
  	gl.FLOAT, 			// data type for each value: usually gl.FLOAT
  	false, 					// did we supply fixed-point data AND it needs normalizing?
  	FSIZE * 10, 		// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b, nx,ny,nz) * bytes/value
  	FSIZE * 4);			// Offset -- how many bytes from START of buffer to the
  									// value we will actually use?  Need to skip over x,y,z,w
  									
  gl.enableVertexAttribArray(a_Color);  
  									// Enable assignment of vertex buffer object's position data

  // Get graphics system's handle for our Vertex Shader's normal-vec-input variable;
  var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if(a_Normal < 0) {
    console.log('Failed to get the storage location of a_Normal');
    return -1;
  }
  // Use handle to specify how to retrieve color data from our VBO:
  gl.vertexAttribPointer(
  	a_Normal, 				// choose Vertex Shader attribute to fill with data
  	3, 							// how many values? 1,2,3 or 4. (we're using x,y,z)
  	gl.FLOAT, 			// data type for each value: usually gl.FLOAT
  	false, 					// did we supply fixed-point data AND it needs normalizing?
  	FSIZE * 10, 		// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b, nx,ny,nz) * bytes/value
  	FSIZE * 7);			// Offset -- how many bytes from START of buffer to the
  									// value we will actually use?  Need to skip over x,y,z,w,r,g,b
  									
  gl.enableVertexAttribArray(a_Normal);  
  									// Enable assignment of vertex buffer object's position data

	//--------------------------------DONE!
  // Unbind the buffer object 
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return nn;
}


function drawGroundGrid(gl, n, currentAngle, modelMatrix, u_ModelMatrix, normalMatrix, u_NormalMatrix) {
//==============================================================================
  // Clear <canvas>  colors AND the depth buffer
  	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	// modelMatrix = popMatrix();

	//-------Create Spinning Tetrahedron-----------------------------------------
	// (Projection and View matrices, if you had them, would go here)
	modelMatrix.translate(-0.4,-0.4, 0.0);  // 'set' means DISCARD old matrix,
	pushMatrix(modelMatrix);
	pushMatrix(modelMatrix);
	// (drawing axes centered in CVV), and then make new
	// drawing axes moved to the lower-left corner of CVV.
	modelMatrix.scale(1,1,-1);							// convert to left-handed coord sys
	// to match WebGL display canvas.
	// (THIS STILL PUZZLES ME!)
	modelMatrix.scale(0.5, 0.5, 0.5);
	// if you DON'T scale, tetra goes outside the CVV; clipped!
	modelMatrix.rotate(currentAngle, 0, 1, 0);  // spin drawing axes on Y axis;

	//Find inverse transpose of modelMatrix:
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();


	//-----SEND to GPU & Draw
	//the first set of vertices stored in our VBO:
	// Pass our current Model matrix to the vertex shaders:
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	// Pass our current Normal matrix to the vertex shaders:
	gl.uniformMatrix4fv(u_NormalMatrix, false, modelMatrix.elements);
	// Draw triangles: start at vertex 0 and draw 12 vertices
	gl.drawArrays(gl.TRIANGLES, 0, 12);

	modelMatrix = popMatrix();
	modelMatrix.translate(1,0,0);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
	gl.uniformMatrix4fv(u_NormalMatrix, false, modelMatrix.elements);
	gl.drawArrays(gl.LINES,             // use this drawing primitive, and
		gndStart / floatsPerVertex, // start at this vertex number, and
		gndVerts.length / floatsPerVertex);   // draw this many vertices

}

// Record the last time we called 'animate()':  (used for animation timing)
var g_last = Date.now();

function animate(angle) {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;
  
  // Update the current rotation angle (adjusted by the elapsed time)
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  if(newAngle > 180.0) newAngle = newAngle - 360.0;
  if(newAngle <-180.0) newAngle = newAngle + 360.0;
  return newAngle;
}

//==================HTML Button Callbacks======================
function spinUp() {
// Called when user presses the 'Spin >>' button on our webpage.
// ?HOW? Look in the HTML file (e.g. ControlMulti.html) to find
// the HTML 'button' element with onclick='spinUp()'.
  ANGLE_STEP += 25; 
}

function spinDown() {
// Called when user presses the 'Spin <<' button
 ANGLE_STEP -= 25; 
}

function runStop() {
// Called when user presses the 'Run/Stop' button
  if(ANGLE_STEP*ANGLE_STEP > 1) {
    myTmp = ANGLE_STEP;
    ANGLE_STEP = 0;
  }
  else {
  	ANGLE_STEP = myTmp;
  }
}

function clearMouse() {
// Called when user presses 'Clear' button on our webpage, just below the 
// 'xMdragTot,yMdragTot' display.
	xMdragTot = 0.0;
	yMdragTot = 0.0;
	document.getElementById('MouseText').innerHTML=
			'Mouse Drag totals (CVV x,y coords):\t'+
			 xMdragTot.toFixed(5)+', \t'+
			 yMdragTot.toFixed(5);	
}

function resetQuat() {
// Called when user presses 'Reset' button on our webpage, just below the 
// 'Current Quaternion' display.
  var res=5;
	qTot.clear();
	document.getElementById('QuatValue').innerHTML= 
														 '\t X=' +qTot.x.toFixed(res)+
														'i\t Y=' +qTot.y.toFixed(res)+
														'j\t Z=' +qTot.z.toFixed(res)+
														'k\t W=' +qTot.w.toFixed(res)+
														'<br>length='+qTot.length().toFixed(res);
}
//===================Mouse and Keyboard event-handling Callbacks

function myMouseDown(ev, gl, canvas) {
//==============================================================================
// Called when user PRESSES down any mouse button;
// 									(Which button?    console.log('ev.button='+ev.button);   )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
  var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);
  
	// Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
  						 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);
//	console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);
	
	isDrag = true;											// set our mouse-dragging flag
	xMclik = x;													// record where mouse-dragging began
	yMclik = y;
};

function myMouseMove(ev, gl, canvas) {
//==============================================================================
// Called when user MOVES the mouse with a button already pressed down.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

	if(isDrag==false) return;				// IGNORE all mouse-moves except 'dragging'

	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);
  
	// Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
  						 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);

	// find how far we dragged the mouse:
	xMdragTot += (x - xMclik);					// Accumulate change-in-mouse-position,&
	yMdragTot += (y - yMclik);
	// AND use any mouse-dragging we found to update quaternions qNew and qTot.
	//===================================================
	dragQuat(x - xMclik, y - yMclik);
	//===================================================
	xMclik = x;													// Make NEXT drag-measurement from here.
	yMclik = y;
	
	// Show it on our webpage, in the <div> element named 'MouseText':
	document.getElementById('MouseText').innerHTML=
			'Mouse Drag totals (CVV x,y coords):\t'+
			 xMdragTot.toFixed(5)+', \t'+
			 yMdragTot.toFixed(5);	
};

function myMouseUp(ev, gl, canvas) {
//==============================================================================
// Called when user RELEASES mouse button pressed previously.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseUp  (pixel coords): xp,yp=\t',xp,',\t',yp);
  
	// Convert to Canonical View Volume (CVV) coordinates too:
  var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
  						 (canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
							 (canvas.height/2);
//	console.log('myMouseUp  (CVV coords  ):  x, y=\t',x,',\t',y);
	
	isDrag = false;											// CLEAR our mouse-dragging flag, and
	// accumulate any final bit of mouse-dragging we did:
	xMdragTot += (x - xMclik);
	yMdragTot += (y - yMclik);
//	console.log('myMouseUp: xMdragTot,yMdragTot =',xMdragTot,',\t',yMdragTot);

	// AND use any mouse-dragging we found to update quaternions qNew and qTot;
	dragQuat(x - xMclik, y - yMclik);

	// Show it on our webpage, in the <div> element named 'MouseText':
	document.getElementById('MouseText').innerHTML=
			'Mouse Drag totals (CVV x,y coords):\t'+
			 xMdragTot.toFixed(5)+', \t'+
			 yMdragTot.toFixed(5);	
};

function dragQuat(xdrag, ydrag) {
//==============================================================================
// Called when user drags mouse by 'xdrag,ydrag' as measured in CVV coords.
// We find a rotation axis perpendicular to the drag direction, and convert the 
// drag distance to an angular rotation amount, and use both to set the value of 
// the quaternion qNew.  We then combine this new rotation with the current 
// rotation stored in quaternion 'qTot' by quaternion multiply.  Note the 
// 'draw()' function converts this current 'qTot' quaternion to a rotation 
// matrix for drawing. 
	var res = 5;
	var qTmp = new Quaternion(0,0,0,1);
	
	var dist = Math.sqrt(xdrag*xdrag + ydrag*ydrag);
	// console.log('xdrag,ydrag=',xdrag.toFixed(5),ydrag.toFixed(5),'dist=',dist.toFixed(5));
	qNew.setFromAxisAngle(-ydrag + 0.0001, xdrag + 0.0001, 0.0, dist*150.0);
	// (why add tiny 0.0001? To ensure we never have a zero-length rotation axis)
							// why axis (x,y,z) = (-yMdrag,+xMdrag,0)? 
							// -- to rotate around +x axis, drag mouse in -y direction.
							// -- to rotate around +y axis, drag mouse in +x direction.
							
	qTmp.multiply(qNew,qTot);			// apply new rotation to current rotation. 
	//--------------------------
	// IMPORTANT! Why qNew*qTot instead of qTot*qNew? (Try it!)
	// ANSWER: Because 'duality' governs ALL transformations, not just matrices. 
	// If we multiplied in (qTot*qNew) order, we would rotate the drawing axes
	// first by qTot, and then by qNew--we would apply mouse-dragging rotations
	// to already-rotated drawing axes.  Instead, we wish to apply the mouse-drag
	// rotations FIRST, before we apply rotations from all the previous dragging.
	//------------------------
	// IMPORTANT!  Both qTot and qNew are unit-length quaternions, but we store 
	// them with finite precision. While the product of two (EXACTLY) unit-length
	// quaternions will always be another unit-length quaternion, the qTmp length
	// may drift away from 1.0 if we repeat this quaternion multiply many times.
	// A non-unit-length quaternion won't work with our quaternion-to-matrix fcn.
	// Matrix4.prototype.setFromQuat().
//	qTmp.normalize();						// normalize to ensure we stay at length==1.0.
	qTot.copy(qTmp);
	// show the new quaternion qTot on our webpage in the <div> element 'QuatValue'
	document.getElementById('QuatValue').innerHTML= 
														 '\t X=' +qTot.x.toFixed(res)+
														'i\t Y=' +qTot.y.toFixed(res)+
														'j\t Z=' +qTot.z.toFixed(res)+
														'k\t W=' +qTot.w.toFixed(res)+
														'<br>length='+qTot.length().toFixed(res);
};

function testQuaternions() {
//==============================================================================
// Test our little "quaternion-mod.js" library with simple rotations for which 
// we know the answers; print results to make sure all functions work as 
// intended.
// 1)  Test constructors and value-setting functions:

	var res = 5;
	var myQuat = new Quaternion(1,2,3,4);		
		console.log('constructor: myQuat(x,y,z,w)=', 
		myQuat.x, myQuat.y, myQuat.z, myQuat.w);
	myQuat.clear();
		console.log('myQuat.clear()=', 
		myQuat.x.toFixed(res), myQuat.y.toFixed(res), 
		myQuat.z.toFixed(res), myQuat.w.toFixed(res));
	myQuat.set(1,2, 3,4);
		console.log('myQuat.set(1,2,3,4)=', 
		myQuat.x.toFixed(res), myQuat.y.toFixed(res), 
		myQuat.z.toFixed(res), myQuat.w.toFixed(res));
		console.log('myQuat.length()=', myQuat.length().toFixed(res));
	myQuat.normalize();
		console.log('myQuat.normalize()=', 
		myQuat.x.toFixed(res), myQuat.y.toFixed(res), myQuat.z.toFixed(res), myQuat.w.toFixed(res));
		// Simplest possible quaternions:
	myQuat.setFromAxisAngle(1,0,0,0);
		console.log('Set myQuat to 0-deg. rot. on x axis=',
		myQuat.x.toFixed(res), myQuat.y.toFixed(res), myQuat.z.toFixed(res), myQuat.w.toFixed(res));
	myQuat.setFromAxisAngle(0,1,0,0);
		console.log('set myQuat to 0-deg. rot. on y axis=',
		myQuat.x.toFixed(res), myQuat.y.toFixed(res), myQuat.z.toFixed(res), myQuat.w.toFixed(res));
	myQuat.setFromAxisAngle(0,0,1,0);
		console.log('set myQuat to 0-deg. rot. on z axis=',
		myQuat.x.toFixed(res), myQuat.y.toFixed(res), myQuat.z.toFixed(res), myQuat.w.toFixed(res), '\n');
		
	myQmat = new Matrix4();
	myQuat.setFromAxisAngle(1,0,0, 90.0);	
		console.log('set myQuat to +90-deg rot. on x axis =',
		myQuat.x.toFixed(res), myQuat.y.toFixed(res), myQuat.z.toFixed(res), myQuat.w.toFixed(res));
	myQmat.setFromQuat(myQuat.x, myQuat.y, myQuat.z, myQuat.w);
		console.log('myQuat as matrix: (+y axis <== -z axis)(+z axis <== +y axis)');
		myQmat.printMe();
	
	myQuat.setFromAxisAngle(0,1,0, 90.0);	
		console.log('set myQuat to +90-deg rot. on y axis =',
		myQuat.x.toFixed(res), myQuat.y.toFixed(res), myQuat.z.toFixed(res), myQuat.w.toFixed(res));
	myQmat.setFromQuat(myQuat.x, myQuat.y, myQuat.z, myQuat.w);
		console.log('myQuat as matrix: (+x axis <== +z axis)(+z axis <== -x axis)');
		myQmat.printMe();

	myQuat.setFromAxisAngle(0,0,1, 90.0);	
		console.log('set myQuat to +90-deg rot. on z axis =',
		myQuat.x.toFixed(res), myQuat.y.toFixed(res), myQuat.z.toFixed(res), myQuat.w.toFixed(res));
	myQmat.setFromQuat(myQuat.x, myQuat.y, myQuat.z, myQuat.w);
		console.log('myQuat as matrix: (+x axis <== -y axis)(+y axis <== +x axis)');
		myQmat.printMe();

	// Test quaternion multiply: 
	// (q1*q2) should rotate drawing axes by q1 and then by q2;  it does!
	var qx90 = new Quaternion;
	var qy90 = new Quaternion;
	qx90.setFromAxisAngle(1,0,0,90.0);			// +90 deg on x axis
	qy90.setFromAxisAngle(0,1,0,90.0);			// +90 deg on y axis.
	myQuat.multiply(qx90,qy90);
		console.log('set myQuat to (90deg x axis) * (90deg y axis) = ',
		myQuat.x.toFixed(res), myQuat.y.toFixed(res), myQuat.z.toFixed(res), myQuat.w.toFixed(res));
	myQmat.setFromQuat(myQuat.x, myQuat.y, myQuat.z, myQuat.w);
	console.log('myQuat as matrix: (+x <== +z)(+y <== +x )(+z <== +y');
	myQmat.printMe();
}


function myKeyDown(kev) {
//===============================================================================
// Called when user presses down ANY key on the keyboard;
//
// For a light, easy explanation of keyboard events in JavaScript,
// see:    http://www.kirupa.com/html5/keyboard_events_in_javascript.htm
// For a thorough explanation of a mess of JavaScript keyboard event handling,
// see:    http://javascript.info/tutorial/keyboard-events
//
// NOTE: Mozilla deprecated the 'keypress' event entirely, and in the
//        'keydown' event deprecated several read-only properties I used
//        previously, including kev.charCode, kev.keyCode.
//        Revised 2/2019:  use kev.key and kev.code instead.
//
// Report EVERYTHING in console:
	console.log(  "--kev.code:",    kev.code,   "\t\t--kev.key:",     kev.key,
		"\n--kev.ctrlKey:", kev.ctrlKey,  "\t--kev.shiftKey:",kev.shiftKey,
		"\n--kev.altKey:",  kev.altKey,   "\t--kev.metaKey:", kev.metaKey);

// and report EVERYTHING on webpage:
	document.getElementById('KeyDownResult').innerHTML = ''; // clear old results
	document.getElementById('KeyModResult' ).innerHTML = '';
	// key details:
	document.getElementById('KeyModResult' ).innerHTML =
		"   --kev.code:"+kev.code   +"      --kev.key:"+kev.key+
		"<br>--kev.ctrlKey:"+kev.ctrlKey+" --kev.shiftKey:"+kev.shiftKey+
		"<br>--kev.altKey:"+kev.altKey +"  --kev.metaKey:"+kev.metaKey;

	switch(kev.code) {
		case "KeyP":
			console.log("Pause/unPause!\n");                // print on console,
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found p/P key. Pause/unPause!';   // print on webpage
			if(g_isRun==true) {
				g_isRun = false;    // STOP animation
				runStop();
				document.getElementById("stop/start").innerText = "both object stop spinning!"
			}
			else {
				g_isRun = true;     // RESTART animation
				runStop();
				document.getElementById("stop/start").innerText = "both object start spinning!"
				// tick();
			}
			break;
		//------------------WASD navigation-----------------
		case "KeyD":
			theta += 0.03;
			break;
		case "KeyA":
			theta -= 0.03;
			break;
		case "KeyS":
			console.log("d/D key: Strafe RIGHT!\n");
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found d/D key. Strafe RIGHT!';
			turn_height -= 0.03;
			break;
		case "KeyW":
			console.log("d/D key: Strafe RIGHT!\n");
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found d/D key. Strafe RIGHT!';
			turn_height += 0.03;
			break;
		case "KeyH":
			g_EyeZ += 0.1;
			break;
		case "KeyG":
			g_EyeZ -= 0.1;
			break;
		// case "KeyJ":
		// 	g_angleRate04 -= 5;
		// 	break;
		// case "KeyK":
		// 	g_angleRate04 += 5;
		// 	break;
		//----------------Arrow keys------------------------
		case "ArrowLeft":
			console.log(' left-arrow.');
			// and print on webpage in the <div> element with id='Result':
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown(): Left Arrow='+kev.keyCode;
			g_EyeX -= Math.cos(theta) * sideway;
			g_EyeY -= -Math.sin(theta) * sideway;
			break;
		case "ArrowRight":
			console.log('right-arrow.');
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown():Right Arrow:keyCode='+kev.keyCode;
			g_EyeX -= -Math.cos(theta) * sideway;
			g_EyeY -= Math.sin(theta) * sideway;
			break;
		case "ArrowUp":
			console.log('   up-arrow.');
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown():   Up Arrow:keyCode='+kev.keyCode;
			g_EyeX += Math.sin(theta) * forward;
			g_EyeY += Math.cos(theta) * forward;
			g_EyeZ += turn_height * forward;
			break;
		case "ArrowDown":
			console.log(' down-arrow.');
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown(): Down Arrow:keyCode='+kev.keyCode;
			g_EyeX -= Math.sin(theta) * forward;
			g_EyeY -= Math.cos(theta) * forward;
			g_EyeZ -= turn_height * forward;
			break;
		default:
			console.log("UNUSED!");
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown(): UNUSED!';
			break;
	}
}