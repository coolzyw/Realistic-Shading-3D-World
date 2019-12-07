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
	//-------------Set precision.
	// GLSL-ES 2.0 defaults (from spec; '4.5.3 Default Precision Qualifiers'):
	// DEFAULT for Vertex Shaders: 	precision highp float; precision highp int;
	//									precision lowp sampler2D; precision lowp samplerCube;
	// DEFAULT for Fragment Shaders:  UNDEFINED for float; precision mediump int;
	//									precision lowp sampler2D;	precision lowp samplerCube;
	//--------------- GLSL Struct Definitions:
	'struct MatlT {\n' +		// Describes one Phong material by its reflectances:
	'		vec3 emit;\n' +			// Ke: emissive -- surface 'glow' amount (r,g,b);
	'		vec3 ambi;\n' +			// Ka: ambient reflectance (r,g,b)
	'		vec3 diff;\n' +			// Kd: diffuse reflectance (r,g,b)
	'		vec3 spec;\n' + 		// Ks: specular reflectance (r,g,b)
	'		int shiny;\n' +			// Kshiny: specular exponent (integer >= 1; typ. <200)
	'		};\n' +
	//
	//-------------ATTRIBUTES of each vertex, read from our Vertex Buffer Object
	'attribute vec4 a_Position; \n' +		// vertex position (model coord sys)
	'attribute vec3 a_Color; \n' +
	'attribute vec4 a_Normal; \n' +			// vertex normal vector (model coord sys)


	//-------------UNIFORMS: values set from JavaScript before a drawing command.
	// 	'uniform vec3 u_Kd; \n' +						// Phong diffuse reflectance for the
	// entire shape. Later: as vertex attrib.
	'uniform MatlT u_MatlSet[1];\n' +		// Array of all materials.
	'uniform mat4 u_MvpMatrix; \n' +
	'uniform mat4 u_ModelMatrix; \n' + 		// Model matrix
	'uniform mat4 u_NormalMatrix; \n' +  	// Inverse Transpose of ModelMatrix;
	// (won't distort normal vec directions
	// but it usually WILL change its length)

	//-------------VARYING:Vertex Shader values sent per-pixel to Fragment shader:
	'varying vec3 v_Kd; \n' +							// Phong Lighting: diffuse reflectance
	// (I didn't make per-pixel Ke,Ka,Ks;
	// we use 'uniform' values instead)
	'varying vec4 v_Position; \n' +
	'varying vec3 v_Normal; \n' +					// Why Vec3? its not a point, hence w==0
	'varying vec3 v_Color; \n' +
	//-----------------------------------------------------------------------------
	'void main() { \n' +
	// Compute CVV coordinate values from our given vertex. This 'built-in'
	// 'varying' value gets interpolated to set screen position for each pixel.
	'  gl_Position = u_MvpMatrix * a_Position;\n' +
	// Calculate the vertex position & normal vec in the WORLD coordinate system
	// for use as a 'varying' variable: fragment shaders get per-pixel values
	// (interpolated between vertices for our drawing primitive (TRIANGLE)).
	'  v_Color = a_Color; \n' +
	'  v_Position = u_ModelMatrix * a_Position; \n' +
	// 3D surface normal of our vertex, in world coords.  ('varying'--its value
	// gets interpolated (in world coords) for each pixel's fragment shader.
	'  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
	'	 v_Kd = u_MatlSet[0].diff; \n' +		// find per-pixel diffuse reflectance from per-vertex
	// (no per-pixel Ke,Ka, or Ks, but you can do it...)
	//	'  v_Kd = vec3(1.0, 1.0, 0.0); \n'	+ // TEST; color fixed at green
	'}\n';

// Fragment shader program----------------------------------
var FSHADER_SOURCE =
	//-------------Set precision.
	// GLSL-ES 2.0 defaults (from spec; '4.5.3 Default Precision Qualifiers'):
	// DEFAULT for Vertex Shaders: 	precision highp float; precision highp int;
	//									precision lowp sampler2D; precision lowp samplerCube;
	// DEFAULT for Fragment Shaders:  UNDEFINED for float; precision mediump int;
	//									precision lowp sampler2D;	precision lowp samplerCube;
	// MATCH the Vertex shader precision for float and int:
	'precision highp float;\n' +
	'precision highp int;\n' +
	//
	//--------------- GLSL Struct Definitions:
	'struct LampT {\n' +		// Describes one point-like Phong light source
	'		vec3 pos;\n' +			// (x,y,z,w); w==1.0 for local light at x,y,z position
	//		   w==0.0 for distant light from x,y,z direction
	' 	vec3 ambi;\n' +			// Ia ==  ambient light source strength (r,g,b)
	' 	vec3 diff;\n' +			// Id ==  diffuse light source strength (r,g,b)
	'		vec3 spec;\n' +			// Is == specular light source strength (r,g,b)
	'}; \n' +
	//
	'struct MatlT {\n' +		// Describes one Phong material by its reflectances:
	'		vec3 emit;\n' +			// Ke: emissive -- surface 'glow' amount (r,g,b);
	'		vec3 ambi;\n' +			// Ka: ambient reflectance (r,g,b)
	'		vec3 diff;\n' +			// Kd: diffuse reflectance (r,g,b)
	'		vec3 spec;\n' + 		// Ks: specular reflectance (r,g,b)
	'		int shiny;\n' +			// Kshiny: specular exponent (integer >= 1; typ. <200)
	'		};\n' +
	//
	//-------------UNIFORMS: values set from JavaScript before a drawing command.
	// first light source: (YOU write a second one...)
	'uniform LampT u_LampSet[1];\n' +		// Array of all light sources.
	'uniform MatlT u_MatlSet[1];\n' +		// Array of all materials.
	//
	'uniform vec3 u_eyePosWorld; \n' + 	// Camera/eye location in world coords.

	//-------------VARYING:Vertex Shader values sent per-pixel to Fragment shader:
	'varying vec3 v_Normal;\n' +				// Find 3D surface normal at each pix
	'varying vec4 v_Position;\n' +			// pixel's 3D pos too -- in 'world' coords
	'varying vec3 v_Kd;	\n' +						// Find diffuse reflectance K_d per pix
	'varying vec3 v_Color;\n' +
	// Ambient? Emissive? Specular? almost
	// NEVER change per-vertex: I use 'uniform' values

	//-------------UNIFORMS: values to control the bling or not
	'uniform int is_Blinn;\n' +

	'void main() { \n' +
	// Normalize! !!IMPORTANT!! TROUBLE if you don't!
	// normals interpolated for each pixel aren't 1.0 in length any more!
	'  gl_FragColor = vec4(v_Color, 1.0);\n' +
	'  vec3 normal = normalize(v_Normal); \n' +
	//	'  vec3 normal = v_Normal; \n' +
	// Find the unit-length light dir vector 'L' (surface pt --> light):
	'  vec3 lightDirection = normalize(u_LampSet[0].pos - v_Position.xyz);\n' +
	// Find the unit-length eye-direction vector 'V' (surface pt --> camera)
	'  vec3 eyeDirection = normalize(u_eyePosWorld - v_Position.xyz); \n' +
	// The dot product of (unit-length) light direction and the normal vector
	// (use max() to discard any negatives from lights below the surface)
	// (look in GLSL manual: what other functions would help?)
	// gives us the cosine-falloff factor needed for the diffuse lighting term:
	'  float nDotL = max(dot(lightDirection, normal), 0.0); \n' +
	// The Blinn-Phong lighting model computes the specular term faster
	// because it replaces the (V*R)^shiny weighting with (H*N)^shiny,
	// where 'halfway' vector H has a direction half-way between L and V
	// H = norm(norm(V) + norm(L)).  Note L & V already normalized above.
	// (see http://en.wikipedia.org/wiki/Blinn-Phong_shading_model)
	'  vec3 H = normalize(lightDirection + eyeDirection); \n' +
	'  float nDotH = max(dot(H, normal), 0.0); \n' +
	'  float e02 = nDotH*nDotH; \n' +
	'  float e04 = e02*e02; \n' +
	'  float e08 = e04*e04; \n' +
	'	 float e16 = e08*e08; \n' +
	'	 float e32 = e16*e16; \n' +
	'vec3 R = reflect(-lightDirection, normal);' +
	'float vDotR = max(dot(eyeDirection, R), 0.0);' +
	// '	 float e64 = e32*e32;	\n' +
	// (use max() to discard any negatives from lights below the surface)
	// Apply the 'shininess' exponent K_e:
	// Try it two different ways:		The 'new hotness': pow() fcn in GLSL.
	// CAREFUL!  pow() won't accept integer exponents! Convert K_shiny!


	// '  float e64 = pow(vDotR, float(u_MatlSet[0].shiny));\n' +

	// if it is blinn phong
	'vec3 emissive;\n' +
	'vec3 ambient;\n' +
	'vec3 diffuse;\n' +
	'vec3 speculr;\n' +
	'float e64;\n' +

	'e64 = pow(nDotH, float(u_MatlSet[0].shiny));\n' +
	// Calculate the final color from diffuse reflection and ambient reflection
	//  '	 vec3 emissive = u_Ke;' +
	'emissive = 										u_MatlSet[0].emit;' +
	'ambient = u_LampSet[0].ambi * u_MatlSet[0].ambi;\n' +
	'diffuse = u_LampSet[0].diff * v_Kd * nDotL;\n' +
	'speculr = u_LampSet[0].spec * u_MatlSet[0].spec * e64;\n' +
	'gl_FragColor = vec4(emissive + ambient + diffuse + speculr , 1.0);\n' +

	'if (is_Blinn == 0) {\n' +
		'e64 = pow(vDotR, float(u_MatlSet[0].shiny));\n' +
		'speculr = u_LampSet[0].spec * u_MatlSet[0].spec * e64;\n' +
		'gl_FragColor = vec4(emissive + ambient + diffuse + speculr , 1.0);\n' +
		'}\n' +

	'}\n';

// Global Variables for the spinning tetrahedron:
var ANGLE_STEP = 45.0;  // default rotation angle rate (deg/sec)

// Global vars for mouse click-and-drag for rotation.
var isDrag=false;		// mouse-drag: true when user holds down mouse button
var xMclik=0.0;			// last mouse button-down position (in CVV coords)
var yMclik=0.0;
var xMdragTot=0.0;	// total (accumulated) mouse-drag amounts (in CVV coords).
var yMdragTot=0.0;

var qTot = new Quaternion(0,0,0,1);	// 'current' orientation (made from qNew)
var floatsPerVertex = 10;

//  Global vars that hold GPU locations for 'uniform' variables.
//		-- For 3D camera and transforms:
var uLoc_eyePosWorld 	= false;
var uLoc_ModelMatrix 	= false;
var uLoc_MvpMatrix 		= false;
var uLoc_NormalMatrix = false;
var	eyePosWorld = new Float32Array(3);	// x,y,z in world coords

//  ... for our transforms:
var modelMatrix = new Matrix4();  // Model matrix
var	mvpMatrix 	= new Matrix4();	// Model-view-projection matrix
var	normalMatrix= new Matrix4();	// Transformation matrix for normals

//	... for our first light source:   (stays false if never initialized)
var lamp0 = new LightsT();

// ... for our first material:
var matlSel= MATL_RED_PLASTIC;				// see keypress(): 'm' key changes matlSel
var matlSel2= MATL_RED_PLASTIC + 1;
var matlSel3= MATL_RED_PLASTIC + 2;
var matl0 = new Material(matlSel);

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

// --------------------- Light positions -----------------------------------
var light_x = 6;
var light_y = 5;
var light_z = 5;
var light_on = true;

// --------------------- Blinn Control -----------------------------------
// blinn location and initial value(not blinn phong)
var u_isBlinn;
var blinn = 0;

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

	var rangeInput_x = document.getElementById("light_x");
	var rangeInput_y = document.getElementById("light_y");
	var rangeInput_z = document.getElementById("light_z");
	var checkBox = document.getElementById("light_on_off");
	var blinnCheck = document.getElementById("blinn_on_off");

	rangeInput_x.oninput = function() {
		light_x = this.value;
	};

	rangeInput_y.oninput = function() {
		light_y = this.value;
	};

	rangeInput_z.oninput = function() {
		light_z = this.value;
	};

	checkBox.oninput = function() {
		if (this.checked === true) {
			light_on = true;
			document.getElementById("light_status").innerHTML = "light On";
		}
		else {
			light_on = false;
			document.getElementById("light_status").innerHTML = "light Off";
		}
	};

	blinnCheck.oninput = function() {
		console.log("this value", this.value);
		if (this.value === 'BlinnOn') {
			blinn = 1;
			document.getElementById("blinn_status").innerHTML = "Blinn On";
		}
		else {
			blinn = 0;
			document.getElementById("blinn_status").innerHTML = "Blinn Off";

		}
	};

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


	// Create, save the storage locations of uniform variables: ... for the scene
	// (Version 03: changed these to global vars (DANGER!) for use inside any func)
	uLoc_eyePosWorld  = gl.getUniformLocation(gl.program, 'u_eyePosWorld');
	uLoc_ModelMatrix  = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
	uLoc_MvpMatrix    = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
	uLoc_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
	if (!uLoc_eyePosWorld ||
		!uLoc_ModelMatrix	|| !uLoc_MvpMatrix || !uLoc_NormalMatrix) {
		console.log('Failed to get GPUs matrix storage locations');
		return;
	}
	//  ... for Phong light source:
	// NEW!  Note we're getting the location of a GLSL struct array member:

	lamp0.u_pos  = gl.getUniformLocation(gl.program, 'u_LampSet[0].pos');
	lamp0.u_ambi = gl.getUniformLocation(gl.program, 'u_LampSet[0].ambi');
	lamp0.u_diff = gl.getUniformLocation(gl.program, 'u_LampSet[0].diff');
	lamp0.u_spec = gl.getUniformLocation(gl.program, 'u_LampSet[0].spec');
	if( !lamp0.u_pos || !lamp0.u_ambi	|| !lamp0.u_diff || !lamp0.u_spec	) {
		console.log('Failed to get GPUs Lamp0 storage locations');
		return;
	}

	u_isBlinn = gl.getUniformLocation(gl.program, 'is_Blinn');
	if (!u_isBlinn) {
		console.log('Failed to get GPUs u_isBlinn storage position');
		return;
	}

	// ... for Phong material/reflectance:
	matl0.uLoc_Ke = gl.getUniformLocation(gl.program, 'u_MatlSet[0].emit');
	matl0.uLoc_Ka = gl.getUniformLocation(gl.program, 'u_MatlSet[0].ambi');
	matl0.uLoc_Kd = gl.getUniformLocation(gl.program, 'u_MatlSet[0].diff');
	matl0.uLoc_Ks = gl.getUniformLocation(gl.program, 'u_MatlSet[0].spec');
	matl0.uLoc_Kshiny = gl.getUniformLocation(gl.program, 'u_MatlSet[0].shiny');
	if(!matl0.uLoc_Ke || !matl0.uLoc_Ka || !matl0.uLoc_Kd
		|| !matl0.uLoc_Ks || !matl0.uLoc_Kshiny
	) {
		console.log('Failed to get GPUs Reflectance storage locations');
		return;
	}
	gl.uniform1i(u_isBlinn, blinn);
	// Position the camera in world coordinates:
	eyePosWorld.set([g_EyeX, g_EyeY, g_EyeZ]);
	gl.uniform3fv(uLoc_eyePosWorld, eyePosWorld);// use it to set our uniform
	// (Note: uniform4fv() expects 4-element float32Array as its 2nd argument)


	// // NEW! -- make new canvas to fit the browser-window size;
	// drawResize(gl, n);   // On this first call, Chrome browser seems to use the
	// // initial fixed canvas size we set in the HTML file;
	// // But by default Chrome opens its browser at the same
	// // size & location where you last closed it, so
	// drawResize(gl, n);   // Call drawResize() a SECOND time to re-size canvas to
	// // match the current browser size.
	// // Create, init current rotation angle value in JavaScript

//=====================================

	// ANIMATION: create 'tick' variable whose value is this function:
	//-----------------
	var tick = function() {
		currentAngle = animate(currentAngle);  // Update the rotation angle
		console.log(blinn);
		gl.uniform1i(u_isBlinn, blinn);
		eyePosWorld.set([g_EyeX, g_EyeY, g_EyeZ]);
		gl.uniform3fv(uLoc_eyePosWorld, eyePosWorld);// use it to set our uniform
		drawResize(gl, n);
//    console.log('currentAngle=',currentAngle); // put text in console.
		requestAnimationFrame(tick, canvas);

		// Request that the browser re-draw the webpage
		// (causes webpage to endlessly re-draw itself)
	};
	tick();							// start (and continue) animation: draw current image

}

function drawResize(gl, n) {
//==============================================================================
// Called when user re-sizes their browser window , because our HTML file
// contains:  <body onload="main()" onresize="winResize()">

	var nuCanvas = document.getElementById('webgl');	// get current canvas

	//Make canvas fill the top 3/4 of our browser window:
	nuCanvas.width = innerWidth;
	nuCanvas.height = innerHeight*4/5;
	gl.uniform1i(u_isBlinn, blinn);

	//---------------For the light source(s):
	if (!light_on) {
		lamp0.I_ambi.elements.set([0.0, 0.0, 0.0]);
		lamp0.I_diff.elements.set([0.0, 0.0, 0.0]);
		lamp0.I_spec.elements.set([0.0, 0.0, 0.0]);
	}
	else {
		lamp0.I_pos.elements.set([light_x, light_y, light_z]);
		lamp0.I_ambi.elements.set([0.4, 0.4, 0.4]);
		lamp0.I_diff.elements.set([1.0, 1.0, 1.0]);
		lamp0.I_spec.elements.set([1.0, 1.0, 1.0]);
	}



	// IMPORTANT!  Need a fresh drawing in the re-sized viewports.
	drawTwoView(gl, n);
}

function drawTwoView(gl, n) {
	// Specify the color for clearing <canvas>
	// NEW!! Enable 3D depth-test when drawing: don't over-draw at any pixel
	// unless the new Z value is closer to the eye than the old one..
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
	mvpMatrix.setPerspective(40.0,   // FOVY: top-to-bottom vertical image angle, in degrees
		ratio,   // Image Aspect Ratio: camera lens width/height width/height = (right-left) / (top-bottom) = right/top
		1.0,   // camera z-near distance (always positive; frustum begins at z = -znear)
		100.0);  // camera z-far distance (always positive; frustum ends at z = -zfar)
	// console.log("parameters", g_EyeX, g_EyeY, g_EyeZ, theta);
	mvpMatrix.lookAt(g_EyeX, g_EyeY, g_EyeZ,     // center of projection
		g_EyeX + Math.sin(theta), g_EyeY + Math.cos(theta), g_EyeZ + turn_height,      // look-at point
		0.0, 0.0, 1.0);     // 'up' vector
	drawAll(gl, n);   // Draw shapes
}

function drawAll(gl, n) {
	gl.uniform3fv(lamp0.u_pos,  lamp0.I_pos.elements.slice(0,3));
	//		 ('slice(0,3) member func returns elements 0,1,2 (x,y,z) )
	gl.uniform3fv(lamp0.u_ambi, lamp0.I_ambi.elements);		// ambient
	gl.uniform3fv(lamp0.u_diff, lamp0.I_diff.elements);		// diffuse
	gl.uniform3fv(lamp0.u_spec, lamp0.I_spec.elements);		// Specular

	drawGroundGrid(gl, n);
	drawCube(gl, n);
	drawPyramid(gl, n);
}

function drawGroundGrid(gl, n) {
	// draw ground grid
	pushMatrix(modelMatrix);
	pushMatrix(modelMatrix);
	pushMatrix(modelMatrix);

	matl0.setMatl(matlSel);								// set new material reflectances,
	//---------------For the Material object(s):
	gl.uniform3fv(matl0.uLoc_Ke, matl0.K_emit.slice(0,3));				// Ke emissive
	gl.uniform3fv(matl0.uLoc_Ka, matl0.K_ambi.slice(0,3));				// Ka ambient
	gl.uniform3fv(matl0.uLoc_Kd, matl0.K_diff.slice(0,3));				// Kd	diffuse
	gl.uniform3fv(matl0.uLoc_Ks, matl0.K_spec.slice(0,3));				// Ks specular
	gl.uniform1i(matl0.uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny

	modelMatrix.translate(1,0,0);
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();
	mvpMatrix.multiply(modelMatrix);

	gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
	gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
	gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);
	gl.drawArrays(gl.LINES,             // use this drawing primitive, and
		gndStart / floatsPerVertex, // start at this vertex number, and
		gndVerts.length / floatsPerVertex);   // draw this many vertices
}


function drawPyramid(gl, n) {
	//-------Create Spinning Tetrahedron-----------------------------------------
	// (Projection and View matrices, if you had them, would go here)
	modelMatrix = popMatrix();


	matl0.setMatl(matlSel2);								// set new material reflectances,
	//---------------For the Material object(s):
	gl.uniform3fv(matl0.uLoc_Ke, matl0.K_emit.slice(0,3));				// Ke emissive
	gl.uniform3fv(matl0.uLoc_Ka, matl0.K_ambi.slice(0,3));				// Ka ambient
	gl.uniform3fv(matl0.uLoc_Kd, matl0.K_diff.slice(0,3));				// Kd	diffuse
	gl.uniform3fv(matl0.uLoc_Ks, matl0.K_spec.slice(0,3));				// Ks specular
	gl.uniform1i(matl0.uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny

	modelMatrix.translate(-3,-5, 0);  // 'set' means DISCARD old matrix,
	// (drawing axes centered in CVV), and then make new
	// drawing axes moved to the lower-left corner of CVV.
	modelMatrix.scale(1,1,-1);							// convert to left-handed coord sys
	// to match WebGL display canvas.
	// (THIS STILL PUZZLES ME!)
	modelMatrix.scale(0.5, 0.5, 0.5);
	// if you DON'T scale, tetra goes outside the CVV; clipped!
	modelMatrix.rotate(currentAngle, 0, 1, 0);  // spin drawing axes on Y axis;
	// Calculate the matrix to transform the normal based on the model matrix
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();
	mvpMatrix.multiply(modelMatrix);

	//-----SEND to GPU & Draw
	//the first set of vertices stored in our VBO:
	// Pass our current Model matrix to the vertex shaders:
	gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
	// Pass our current Normal matrix to the vertex shaders:
	gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
	gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);
	// Draw triangles: start at vertex 0 and draw 12 vertices
	gl.drawArrays(gl.TRIANGLES, 0, 12);
}

function drawCube(gl, n) {

	modelMatrix = popMatrix();

	matl0.setMatl(matlSel3);								// set new material reflectances,
	//---------------For the Material object(s):
	gl.uniform3fv(matl0.uLoc_Ke, matl0.K_emit.slice(0,3));				// Ke emissive
	gl.uniform3fv(matl0.uLoc_Ka, matl0.K_ambi.slice(0,3));				// Ka ambient
	gl.uniform3fv(matl0.uLoc_Kd, matl0.K_diff.slice(0,3));				// Kd	diffuse
	gl.uniform3fv(matl0.uLoc_Ks, matl0.K_spec.slice(0,3));				// Ks specular
	gl.uniform1i(matl0.uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny

	modelMatrix.translate(2, 0,0);
	modelMatrix.scale(0.5,0.5,0.5);
	mvpMatrix.multiply(modelMatrix);
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();
	gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
	// Pass our current Normal matrix to the vertex shaders:
	gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
	gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);
	gl.drawArrays(gl.TRIANGLES,             // use this drawing primitive, and
		cubeStart / floatsPerVertex, // start at this vertex number, and
		cubeVerts.length / floatsPerVertex);   // draw this many vertices
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
	// Show it on our webpage, in the <div> element named 'MouseText':
	document.getElementById('MouseText').innerHTML=
		'Mouse Drag totals (CVV x,y coords):\t'+
		xMdragTot.toFixed(5)+', \t'+
		yMdragTot.toFixed(5);
};


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

function makeCube() {

	var height = 1;
	var width = 1;
	var length = 1;

	cubeVerts = new Float32Array([
		// Vertex coordinates(x,y,z,w) and color (R,G,B) for a color tetrahedron:
		//		Apex on +z axis; equilateral triangle base at z=0

		// Node 0 0.3, 0.6, 0.7,
		// Node 1 0.8, 0.4, 1,
		// Node 2 0.8, 0.5, 0.4,
		// Node 3 0.7, 0.9, 0.1,
		// Node 4 0.9, 0, 0.3,
		// Node 5 0.3, 0.3, 1,
		// Node 6 1, 0.9, 0.2,
		// Node 7 0.9, 1, 0.9,
		// Node 8 0.8, 0.8, 0.7,




		// +x face: RED
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,		0.7, 0.9, 0.1,	0,0,1,// Node 3
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,		0, 1, 0,	0,0,1,// Node 2
		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.9, 0, 0.3,  0,0,1,// Node 4

		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.9, 0, 0.3,	0,0,1,// Node 4
		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.9, 1, 0.9,	0,0,1,// Node 7
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.7, 0.9, 0.1, 0,0,1,	// Node 3

		// +y face: GREEN
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	   0, 0.4, 1, 1,0,0,	// Node 1
		-1.0 * length,  1.0 * width, 1.0 * height, 1.0,	  0.3, 0.3, 1,	1,0,0,// Node 5
		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	 0.9, 0, 0.3,	1,0,0,// Node 4

		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.9, 0, 0.3,	1,0,0,// Node 4
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,	  0, 1, 0,	 1,0,0,// Node 2
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	   0, 0.4, 1, 1,0,0,	// Node 1

		// +z face: BLUE
		-1.0 * length,  1.0 * width,  1.0 * height, 1.0,	 0.3, 0.3, 1, 0,1,0, // Node 5
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  1, 0.9, 0.2,	0,1,0, // Node 6
		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	 	0.9, 1, 0.9,	0,1,0, // Node 7

		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.9, 1, 0.9,	0,1,0, // Node 7
		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.9, 0, 0.3,	0,1,0, // Node 4
		-1.0 * length,  1.0 * width,  1.0 * height, 1.0,	 0.3, 0.3, 1,	0,1,0, // Node 5

		// -x face: CYAN
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  1, 0.9, 0.2,	0,0,-1,// Node 6
		-1.0 * length,  1.0 * width,  1.0 * height, 1.0,	 0.3, 0.3, 1,	0,0,-1,// Node 5
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	   0, 0.4, 1,	0,0,-1,// Node 1

		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	   0, 0.4, 1,	0,0,-1,// Node 1
		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	 0.3, 0.6, 0.7,	0,0,-1,// Node 0
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  1, 0.9, 0.2,	0,0,-1,// Node 6

		// -y face: MAGENTA
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.7, 0.9, 0.1,	-1, 0, 0,// Node 3
		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.9, 1, 0.9,	-1, 0, 0,// Node 7
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  1, 0.9, 0.2,	-1, 0, 0,// Node 6

		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	 1, 0.9, 0.2,	-1, 0, 0,// Node 6
		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.3, 0.6, 0.7,	-1, 0, 0,// Node 0
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.7, 0.9, 0.1,	-1, 0, 0,// Node 3

		// -z face: YELLOW
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,	 0, 1, 0,   0, -1, 0,// Node 2
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.7, 0.9, 0.1,	0, -1, 0,// Node 3
		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	 0.3, 0.6, 0.7,	0, -1, 0,// Node 0

		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.3, 0.6, 0.7,	0, -1, 0,// Node 0
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	   0, 0.4, 1,	0, -1, 0,// Node 1
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,	  0, 1, 0,	0, -1, 0,// Node 2

	]);

}


function initVertexBuffer(gl) {
//==============================================================================
	makePyramid();
	makeGroundGrid();
	makeCube();

	var mySiz = (pyramidShapes.length + gndVerts.length + cubeVerts.length);
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

	cubeStart = i;
	for(j=0; j< cubeVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = cubeVerts[j];
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