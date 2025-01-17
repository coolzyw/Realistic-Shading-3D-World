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
	'precision highp float;\n' +
	'precision highp int;\n' +

	//--------------- GLSL Struct Definitions:
	'struct MatlT {\n' +		// Describes one Phong material by its reflectances:
	'		vec3 emit;\n' +			// Ke: emissive -- surface 'glow' amount (r,g,b);
	'		vec3 ambi;\n' +			// Ka: ambient reflectance (r,g,b)
	'		vec3 diff;\n' +			// Kd: diffuse reflectance (r,g,b)
	'		vec3 spec;\n' + 		// Ks: specular reflectance (r,g,b)
	'		int shiny;\n' +			// Kshiny: specular exponent (integer >= 1; typ. <200)
	'		};\n' +

	'struct LampT {\n' +		// Describes one point-like Phong light source
	'		vec3 pos;\n' +			// (x,y,z,w); w==1.0 for local light at x,y,z position
	' 		vec3 ambi;\n' +			// Ia ==  ambient light source strength (r,g,b)
	' 		vec3 diff;\n' +			// Id ==  diffuse light source strength (r,g,b)
	'		vec3 spec;\n' +			// Is == specular light source strength (r,g,b)
	'}; \n' +

	//-------------ATTRIBUTES of each vertex, read from our Vertex Buffer Object
	'attribute vec4 a_Position; \n' +		// vertex position (model coord sys)
	'attribute vec4 a_Color; \n' +
	'attribute vec4 a_Normal; \n' +			// vertex normal vector (model coord sys)


	//-------------UNIFORMS: values set from JavaScript before a drawing command.
	'uniform MatlT u_MatlSet[1];\n' +		// Array of all materials.
	'uniform mat4 u_MvpMatrix; \n' +
	'uniform mat4 u_ModelMatrix; \n' + 		// Model matrix
	'uniform mat4 u_NormalMatrix; \n' +  	// Inverse Transpose of ModelMatrix;
	'uniform LampT u_LampSet[2];\n' +		// Array of all light sources.
	'uniform vec3 u_eyePosWorld; \n' + 	// Camera/eye location in world coords.
	'uniform int is_Blinn;\n' +
	'uniform int is_Gouraud; \n' +


	//-------------VARYING:Vertex Shader values sent per-pixel to Fragment shader:
	'varying vec3 v_Kd; \n' +							// Phong Lighting: diffuse reflectance
	'varying vec4 v_Position; \n' +
	'varying vec3 v_Normal; \n' +					// Why Vec3? its not a point, hence w==0
	'varying vec4 v_Color; \n' +


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
	'  v_Kd = u_MatlSet[0].diff; \n' +		// find per-pixel diffuse reflectance from per-vertex

	'if (is_Gouraud == 1){ \n' +
	'	vec3 normal = normalize(v_Normal); \n' +
	//	'  vec3 normal = v_Normal; \n' +
	// Find the unit-length light dir vector 'L' (surface pt --> light):
	'  	vec3 lightDirection = normalize(u_LampSet[0].pos - v_Position.xyz);\n' +
	'  	vec3 lightDirection2 = normalize(u_LampSet[1].pos - v_Position.xyz);\n' +
	// Find the unit-length eye-direction vector 'V' (surface pt --> camera)
	'  	vec3 eyeDirection = normalize(u_eyePosWorld - v_Position.xyz); \n' +
	// The dot product of (unit-length) light direction and the normal vector
	// (use max() to discard any negatives from lights below the surface)
	// (look in GLSL manual: what other functions would help?)
	// gives us the cosine-falloff factor needed for the diffuse lighting term:
	'  	float nDotL = max(dot(lightDirection, normal), 0.0); \n' +
	'  	float nDotL2 = max(dot(lightDirection2, normal), 0.0); \n' +
	// The Blinn-Phong lighting model computes the specular term faster
	// because it replaces the (V*R)^shiny weighting with (H*N)^shiny,
	// where 'halfway' vector H has a direction half-way between L and V
	// H = norm(norm(V) + norm(L)).  Note L & V already normalized above.
	// (see http://en.wikipedia.org/wiki/Blinn-Phong_shading_model)
	'  	vec3 H = normalize(lightDirection + eyeDirection); \n' +
	'  	vec3 H2 = normalize(lightDirection2 + eyeDirection); \n' +
	'  	float nDotH = max(dot(H, normal), 0.0); \n' +
	'  	float nDotH2 = max(dot(H2, normal), 0.0); \n' +
	'	vec3 R = reflect(-lightDirection, normal);' +
	'	vec3 R2 = reflect(-lightDirection2, normal);' +
	'	float vDotR = max(dot(eyeDirection, R), 0.0);' +
	'	float vDotR2 = max(dot(eyeDirection, R2), 0.0);' +

	// if it is blinn phong
	'	vec3 emissive;\n' +
	'	vec3 ambient;\n' +
	'	vec3 diffuse;\n' +
	'	vec3 speculr;\n' +
	'	float e64;\n' +

	'	vec3 head_emissive;\n' +
	'	vec3 head_ambient;\n' +
	'	vec3 head_diffuse;\n' +
	'	vec3 head_speculr;\n' +
	'	float head_e64;\n' +


	'	e64 = pow(nDotH, float(u_MatlSet[0].shiny));\n' +
	'	head_e64 = pow(nDotH2, float(u_MatlSet[0].shiny));\n' +
	'	emissive = 										u_MatlSet[0].emit;' +
	'	ambient = u_LampSet[0].ambi * u_MatlSet[0].ambi;\n' +
	'	diffuse = u_LampSet[0].diff * v_Kd * nDotL;\n' +
	'	speculr = u_LampSet[0].spec * u_MatlSet[0].spec * e64;\n' +


	'	head_emissive = 										u_MatlSet[0].emit;' +
	'	head_ambient = u_LampSet[1].ambi * u_MatlSet[0].ambi;\n' +
	'	head_diffuse = u_LampSet[1].diff * v_Kd * nDotL2;\n' +
	'	head_speculr = u_LampSet[1].spec * u_MatlSet[0].spec * head_e64;\n' +


	'	if (is_Blinn == 0) {\n' +
	'   	e64 = pow(vDotR, float(u_MatlSet[0].shiny));\n' +
	'   	speculr = u_LampSet[0].spec * u_MatlSet[0].spec * e64;\n' +
	'   	head_e64 = pow(vDotR2, float(u_MatlSet[0].shiny));\n' +
	'   	head_speculr = u_LampSet[1].spec * u_MatlSet[0].spec * head_e64;\n' +
	'	}\n' +

	'	vec4 frag_world = vec4(emissive + ambient + diffuse + speculr , 1.0);\n' +
	'	vec4 frag_head = vec4(head_emissive + head_ambient + head_diffuse + head_speculr , 1.0);\n' +

	'	v_Color = frag_world + frag_head;\n' +
	'} \n' +

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

	//--------------- GLSL Struct Definitions:
	'struct LampT {\n' +		// Describes one point-like Phong light source
	'		vec3 pos;\n' +			// (x,y,z,w); w==1.0 for local light at x,y,z position
	' 		vec3 ambi;\n' +			// Ia ==  ambient light source strength (r,g,b)
	' 		vec3 diff;\n' +			// Id ==  diffuse light source strength (r,g,b)
	'		vec3 spec;\n' +			// Is == specular light source strength (r,g,b)
	'}; \n' +


	'struct MatlT {\n' +		// Describes one Phong material by its reflectances:
	'		vec3 emit;\n' +			// Ke: emissive -- surface 'glow' amount (r,g,b);
	'		vec3 ambi;\n' +			// Ka: ambient reflectance (r,g,b)
	'		vec3 diff;\n' +			// Kd: diffuse reflectance (r,g,b)
	'		vec3 spec;\n' + 		// Ks: specular reflectance (r,g,b)
	'		int shiny;\n' +			// Kshiny: specular exponent (integer >= 1; typ. <200)
	'		};\n' +


	//-------------UNIFORMS: values set from JavaScript before a drawing command.
	'uniform LampT u_LampSet[2];\n' +		// Array of all light sources.
	'uniform MatlT u_MatlSet[1];\n' +		// Array of all materials.
	'uniform vec3 u_eyePosWorld; \n' + 	// Camera/eye location in world coords.
	'uniform int is_Blinn;\n' +
	'uniform int is_Gouraud; \n' +

	//-------------VARYING:Vertex Shader values sent per-pixel to Fragment shader:
	'varying vec3 v_Normal;\n' +				// Find 3D surface normal at each pix
	'varying vec4 v_Position;\n' +			// pixel's 3D pos too -- in 'world' coords
	'varying vec3 v_Kd;	\n' +						// Find diffuse reflectance K_d per pix
	'varying vec4 v_Color;\n' +


	'void main() { \n' +
	// Normalize! !!IMPORTANT!! TROUBLE if you don't!
	// normals interpolated for each pixel aren't 1.0 in length any more!
	'	if (is_Gouraud == 1){ \n' +
	'		gl_FragColor = v_Color;\n' +
	'		return;\n' +
	'	} \n' +
	'	vec3 normal = normalize(v_Normal); \n' +
	//	'  vec3 normal = v_Normal; \n' +
	// Find the unit-length light dir vector 'L' (surface pt --> light):
	'  	vec3 lightDirection = normalize(u_LampSet[0].pos - v_Position.xyz);\n' +
	'  	vec3 lightDirection2 = normalize(u_LampSet[1].pos - v_Position.xyz);\n' +
	// Find the unit-length eye-direction vector 'V' (surface pt --> camera)
	'  	vec3 eyeDirection = normalize(u_eyePosWorld - v_Position.xyz); \n' +
	// The dot product of (unit-length) light direction and the normal vector
	// (use max() to discard any negatives from lights below the surface)
	// (look in GLSL manual: what other functions would help?)
	// gives us the cosine-falloff factor needed for the diffuse lighting term:
	'  	float nDotL = max(dot(lightDirection, normal), 0.0); \n' +
	'  	float nDotL2 = max(dot(lightDirection2, normal), 0.0); \n' +
	// The Blinn-Phong lighting model computes the specular term faster
	// because it replaces the (V*R)^shiny weighting with (H*N)^shiny,
	// where 'halfway' vector H has a direction half-way between L and V
	// H = norm(norm(V) + norm(L)).  Note L & V already normalized above.
	// (see http://en.wikipedia.org/wiki/Blinn-Phong_shading_model)
	'  	vec3 H = normalize(lightDirection + eyeDirection); \n' +
	'  	vec3 H2 = normalize(lightDirection2 + eyeDirection); \n' +
	'  	float nDotH = max(dot(H, normal), 0.0); \n' +
	'  	float nDotH2 = max(dot(H2, normal), 0.0); \n' +
	'	vec3 R = reflect(-lightDirection, normal);' +
	'	vec3 R2 = reflect(-lightDirection2, normal);' +
	'	float vDotR = max(dot(eyeDirection, R), 0.0);' +
	'	float vDotR2 = max(dot(eyeDirection, R2), 0.0);' +

	// if it is blinn phong
	'	vec3 emissive;\n' +
	'	vec3 ambient;\n' +
	'	vec3 diffuse;\n' +
	'	vec3 speculr;\n' +
	'	float e64;\n' +

	'	vec3 head_emissive;\n' +
	'	vec3 head_ambient;\n' +
	'	vec3 head_diffuse;\n' +
	'	vec3 head_speculr;\n' +
	'	float head_e64;\n' +


	'	e64 = pow(nDotH, float(u_MatlSet[0].shiny));\n' +
	'	head_e64 = pow(nDotH2, float(u_MatlSet[0].shiny));\n' +
	'	emissive = 										u_MatlSet[0].emit;' +
	'	ambient = u_LampSet[0].ambi * u_MatlSet[0].ambi;\n' +
	'	diffuse = u_LampSet[0].diff * v_Kd * nDotL;\n' +
	'	speculr = u_LampSet[0].spec * u_MatlSet[0].spec * e64;\n' +


	'	head_emissive = 										u_MatlSet[0].emit;' +
	'	head_ambient = u_LampSet[1].ambi * u_MatlSet[0].ambi;\n' +
	'	head_diffuse = u_LampSet[1].diff * v_Kd * nDotL2;\n' +
	'	head_speculr = u_LampSet[1].spec * u_MatlSet[0].spec * head_e64;\n' +


	'	if (is_Blinn == 0) {\n' +
	'   	e64 = pow(vDotR, float(u_MatlSet[0].shiny));\n' +
	'   	speculr = u_LampSet[0].spec * u_MatlSet[0].spec * e64;\n' +
	'   	head_e64 = pow(vDotR2, float(u_MatlSet[0].shiny));\n' +
	'   	head_speculr = u_LampSet[1].spec * u_MatlSet[0].spec * head_e64;\n' +
	'	}\n' +

	'	vec4 frag_world = vec4(emissive + ambient + diffuse + speculr , 1.0);\n' +
	'	vec4 frag_head = vec4(head_emissive + head_ambient + head_diffuse + head_speculr , 1.0);\n' +

	'	gl_FragColor = frag_world + frag_head;\n' +

	'}\n';

// -------------------- animation-----------------------
var ANGLE_STEP = 45.0;  // default rotation angle rate (deg/sec)
var g_angleRate01 = 60;
var g_angle01 = 0;
var g_last_rod = Date.now();


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
var lamp1 = new LightsT();

// ... for our first material:
var matlSel= MATL_RED_PLASTIC;				// see keypress(): 'm' key changes matlSel
var matlSel2= MATL_RED_PLASTIC + 1;
var matlSel3= MATL_RED_PLASTIC + 2;
var matlSel4= MATL_RED_PLASTIC + 5;
var matlSel5= MATL_RED_PLASTIC + 6;
var matlSel6= MATL_RED_PLASTIC + 7;
var matlSel7= MATL_RED_PLASTIC + 8;
var matl0 = new Material(matlSel);

// --------------------- Global Variables----------------------------------
var canvas;		// main() sets this to the HTML-5 'canvas' element used for WebGL.
var gl;				// main() sets this to the rendering context for WebGL. This object

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
var world_light_on = true;
var head_light_on = true;

// --------------------- Blinn Control -----------------------------------
// blinn location and initial value(not blinn phong)
// initialized to gouraud shading
var u_isBlinn;
var u_isGouraud;
var blinn = 0;
var is_Gouraud = 1;

function main() {
//==============================================================================
	// Retrieve <canvas> element
	canvas = document.getElementById('webgl');

	// Get the rendering context for WebGL
	var myGL = getWebGLContext(canvas);
	if (!myGL) {
		console.log('Failed to get the rendering context for WebGL');
		return;
	}

	gl = myGL;	// make it global--for every function to use.

	gl.clearColor(0.4, 0.4, 0.4, 1.0);
	gl.enable(gl.DEPTH_TEST);

	window.addEventListener("keydown", myKeyDown, false);

	var rangeInput_x = document.getElementById("light_x");
	var rangeInput_y = document.getElementById("light_y");
	var rangeInput_z = document.getElementById("light_z");
	var checkBox = document.getElementById("light_on_off");
	var head_checkBox = document.getElementById("head_light_on_off");
	var blinnCheck = document.getElementById("blinn_on_off");
	var shaderCheck = document.getElementById("shader");

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
			world_light_on = true;
			document.getElementById("light_status").innerHTML = "World light On";
		}
		else {
			world_light_on = false;
			document.getElementById("light_status").innerHTML = "World light Off";
		}
	};

	head_checkBox.oninput = function() {
		if (this.checked === true) {
			head_light_on = true;
			document.getElementById("head_light_status").innerHTML = "Head light On";
		}
		else {
			head_light_on = false;
			document.getElementById("head_light_status").innerHTML = "Head light Off";
		}
	};

	blinnCheck.oninput = function() {
		console.log("this value", this.value);
		if (this.value === 'BlinnOn') {
			blinn = 1;
		}
		else {
			blinn = 0;
		}
	};


	shaderCheck.oninput = function() {
		console.log("this value", this.value);
		if (this.value === 'Gouraud') {
			is_Gouraud = 1;
		}
		else {
			is_Gouraud = 0;
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

	lamp1.u_pos  = gl.getUniformLocation(gl.program, 'u_LampSet[1].pos');
	lamp1.u_ambi = gl.getUniformLocation(gl.program, 'u_LampSet[1].ambi');
	lamp1.u_diff = gl.getUniformLocation(gl.program, 'u_LampSet[1].diff');
	lamp1.u_spec = gl.getUniformLocation(gl.program, 'u_LampSet[1].spec');
	if( !lamp1.u_pos || !lamp1.u_ambi	|| !lamp1.u_diff || !lamp1.u_spec	) {
		console.log('Failed to get GPUs Lamp1 storage locations');
		return;
	}

	u_isBlinn = gl.getUniformLocation(gl.program, 'is_Blinn');
	if (!u_isBlinn) {
		console.log('Failed to get GPUs u_isBlinn storage position');
		return;
	}

	u_isGouraud = gl.getUniformLocation(gl.program, 'is_Gouraud');
	if (!u_isGouraud) {
		console.log('Failed to get GPUs u_isGouraud storage position');
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
	gl.uniform1i(u_isGouraud, is_Gouraud);
	// Position the camera in world coordinates:
	eyePosWorld.set([g_EyeX, g_EyeY, g_EyeZ]);
	gl.uniform3fv(uLoc_eyePosWorld, eyePosWorld);// use it to set our uniform
	// (Note: uniform4fv() expects 4-element float32Array as its 2nd argument)


	// // NEW! -- make new canvas to fit the browser-window size;
	drawResize(gl, n);   // On this first call, Chrome browser seems to use the
	// // initial fixed canvas size we set in the HTML file;
	// // But by default Chrome opens its browser at the same
	// // size & location where you last closed it, so
	drawResize(gl, n);   // Call drawResize() a SECOND time to re-size canvas to
	// // match the current browser size.
	// // Create, init current rotation angle value in JavaScript

//=====================================

	// ANIMATION: create 'tick' variable whose value is this function:
	//-----------------
	var tick = function() {
		currentAngle = animate(currentAngle);  // Update the rotation angle
		animate2();
		gl.uniform1i(u_isBlinn, blinn);
		gl.uniform1i(u_isGouraud, is_Gouraud);
		eyePosWorld.set([g_EyeX, g_EyeY, g_EyeZ]);
		gl.uniform3fv(uLoc_eyePosWorld, eyePosWorld);// use it to set our uniform
		if (!head_light_on) {
			lamp1.I_ambi.elements.set([0.0, 0.0, 0.0]);
			lamp1.I_diff.elements.set([0.0, 0.0, 0.0]);
			lamp1.I_spec.elements.set([0.0, 0.0, 0.0]);
		}
		else {
			lamp1.I_pos.elements.set([g_EyeX, g_EyeY, g_EyeZ]);
			lamp1.I_ambi.elements.set([0.4, 0.4, 0.4]);
			lamp1.I_diff.elements.set([1.0, 1.0, 1.0]);
			lamp1.I_spec.elements.set([1.0, 1.0, 1.0]);
		}
		drawResize(gl, n);
		requestAnimationFrame(tick, canvas);

	};
	tick();

}

function drawResize(gl, n) {
//==============================================================================
// Called when user re-sizes their browser window , because our HTML file
// contains:  <body onload="main()" onresize="winResize()">

	var nuCanvas = document.getElementById('webgl');	// get current canvas
	var nuGL = getWebGLContext(nuCanvas);
	//Make canvas fill the top 3/4 of our browser window:
	nuCanvas.width = innerWidth;
	nuCanvas.height = innerHeight*4/5;
	// IMPORTANT!  Need a fresh drawing in the re-sized viewports.
	drawTwoView(nuGL, n);
}

function drawTwoView(gl, n) {

	gl.enable(gl.DEPTH_TEST);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.viewport(0,											 				// Viewport lower-left corner
		0, 			// location(in pixels)
		gl.drawingBufferWidth, 					// viewport width,
		gl.drawingBufferHeight);			// viewport height in pixels.

	//---------------For the light source(s):
	if (!world_light_on) {
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

	gl.uniform1i(u_isBlinn, blinn);
	gl.uniform1i(u_isGouraud, is_Gouraud);

	gl.uniform3fv(lamp0.u_pos,  lamp0.I_pos.elements.slice(0,3));
	//		 ('slice(0,3) member func returns elements 0,1,2 (x,y,z) )
	gl.uniform3fv(lamp0.u_ambi, lamp0.I_ambi.elements);		// ambient
	gl.uniform3fv(lamp0.u_diff, lamp0.I_diff.elements);		// diffuse
	gl.uniform3fv(lamp0.u_spec, lamp0.I_spec.elements);		// Specular

	gl.uniform3fv(lamp1.u_pos,  lamp1.I_pos.elements.slice(0,3));
	//		 ('slice(0,3) member func returns elements 0,1,2 (x,y,z) )
	gl.uniform3fv(lamp1.u_ambi, lamp1.I_ambi.elements);		// ambient
	gl.uniform3fv(lamp1.u_diff, lamp1.I_diff.elements);		// diffuse
	gl.uniform3fv(lamp1.u_spec, lamp1.I_spec.elements);		// Specular

	gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
	drawAll(gl, n);   // Draw shapes
}

function drawAll(gl, n) {
	modelMatrix.setIdentity();
	pushMatrix(modelMatrix);
	pushMatrix(modelMatrix);
	pushMatrix(modelMatrix);
	pushMatrix(modelMatrix);
	pushMatrix(modelMatrix);

	drawGroundGrid(gl, n);
	drawCube(gl, n);
	drawPyramid(gl, n);
	drawSphere(gl, n);
	drawThirdObject(gl, n);

}

function drawGroundGrid(gl, n) {
	// draw ground grid
	var ratio = gl.drawingBufferWidth / (gl.drawingBufferHeight);
	mvpMatrix.setPerspective(40.0,   // FOVY: top-to-bottom vertical image angle, in degrees
		ratio,   // Image Aspect Ratio: camera lens width/height width/height = (right-left) / (top-bottom) = right/top
		1.0,   // camera z-near distance (always positive; frustum begins at z = -znear)
		100.0);  // camera z-far distance (always positive; frustum ends at z = -zfar)
	// console.log("parameters", g_EyeX, g_EyeY, g_EyeZ, theta);
	mvpMatrix.lookAt(g_EyeX, g_EyeY, g_EyeZ,     // center of projection
		g_EyeX + Math.sin(theta), g_EyeY + Math.cos(theta), g_EyeZ + turn_height,      // look-at point
		0.0, 0.0, 1.0);     // 'up' vector
	matl0.setMatl(matlSel);								// set new material reflectances,

	modelMatrix.translate(1,0,0);
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();
	mvpMatrix.multiply(modelMatrix);

	//---------------For the Material object(s):
	gl.uniform3fv(matl0.uLoc_Ke, matl0.K_emit.slice(0,3));				// Ke emissive
	gl.uniform3fv(matl0.uLoc_Ka, matl0.K_ambi.slice(0,3));				// Ka ambient
	gl.uniform3fv(matl0.uLoc_Kd, matl0.K_diff.slice(0,3));				// Kd	diffuse
	gl.uniform3fv(matl0.uLoc_Ks, matl0.K_spec.slice(0,3));				// Ks specular
	gl.uniform1i(matl0.uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny
	eyePosWorld.set([g_EyeX, g_EyeY, g_EyeZ]);
	gl.uniform3fv(uLoc_eyePosWorld, eyePosWorld);// use it to set our uniform
	gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
	gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
	gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);
	gl.drawArrays(gl.LINES,             // use this drawing primitive, and
		gndStart / floatsPerVertex, // start at this vertex number, and
		gndVerts.length / floatsPerVertex);   // draw this many vertices
}


function drawPyramid(gl, n) {
	modelMatrix = popMatrix();


	modelMatrix.translate(0, 0, 0.5);
	modelMatrix.rotate(90, 1,0, 0);
	modelMatrix.rotate(currentAngle,0,1, 0);
	modelMatrix.scale(0.5,0.5,1);
	var ratio = gl.drawingBufferWidth / (gl.drawingBufferHeight);
	mvpMatrix.setPerspective(40.0,   // FOVY: top-to-bottom vertical image angle, in degrees
		ratio,   // Image Aspect Ratio: camera lens width/height width/height = (right-left) / (top-bottom) = right/top
		1.0,   // camera z-near distance (always positive; frustum begins at z = -znear)
		100.0);  // camera z-far distance (always positive; frustum ends at z = -zfar)
	// console.log("parameters", g_EyeX, g_EyeY, g_EyeZ, theta);
	mvpMatrix.lookAt(g_EyeX, g_EyeY, g_EyeZ,     // center of projection
		g_EyeX + Math.sin(theta), g_EyeY + Math.cos(theta), g_EyeZ + turn_height,      // look-at point
		0.0, 0.0, 1.0);
	mvpMatrix.multiply(modelMatrix);
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();


	matl0.setMatl(matlSel2);								// set new material reflectances,
	//---------------For the Material object(s):
	gl.uniform3fv(matl0.uLoc_Ke, matl0.K_emit.slice(0,3));				// Ke emissive
	gl.uniform3fv(matl0.uLoc_Ka, matl0.K_ambi.slice(0,3));				// Ka ambient
	gl.uniform3fv(matl0.uLoc_Kd, matl0.K_diff.slice(0,3));				// Kd	diffuse
	gl.uniform3fv(matl0.uLoc_Ks, matl0.K_spec.slice(0,3));				// Ks specular
	eyePosWorld.set([g_EyeX, g_EyeY, g_EyeZ]);
	gl.uniform3fv(uLoc_eyePosWorld, eyePosWorld);// use it to set our uniform
	gl.uniform1i(matl0.uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny
	gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
	// Pass our current Normal matrix to the vertex shaders:
	gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
	gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

	gl.drawArrays(gl.TRIANGLES,             // use this drawing primitive, and
		cubeStart / floatsPerVertex, // start at this vertex number, and
		cubeVerts.length / floatsPerVertex);   // draw this many vertices


	pushMatrix(modelMatrix);
	pushMatrix(modelMatrix);
	// ----------------------- draw the pyramid side -----------------------
	modelMatrix = popMatrix();
	modelMatrix.translate(0,-0.2,1);
	modelMatrix.rotate(currentAngle * 2,0,0, 1);
	modelMatrix.scale(2,2,1);
	modelMatrix.scale(0.5,0.5,0.5);

	// modelMatrix.rotate(c, 0, 1, 0);  // spin drawing axes on Y axis;
	// Calculate the matrix to transform the normal based on the model matrix
	var ratio = gl.drawingBufferWidth / (gl.drawingBufferHeight);
	mvpMatrix.setPerspective(40.0,   // FOVY: top-to-bottom vertical image angle, in degrees
		ratio,   // Image Aspect Ratio: camera lens width/height width/height = (right-left) / (top-bottom) = right/top
		1.0,   // camera z-near distance (always positive; frustum begins at z = -znear)
		100.0);  // camera z-far distance (always positive; frustum ends at z = -zfar)
	// console.log("parameters", g_EyeX, g_EyeY, g_EyeZ, theta);
	mvpMatrix.lookAt(g_EyeX, g_EyeY, g_EyeZ,     // center of projection
		g_EyeX + Math.sin(theta), g_EyeY + Math.cos(theta), g_EyeZ + turn_height,      // look-at point
		0.0, 0.0, 1.0);
	matl0.setMatl(matlSel);
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();
	mvpMatrix.multiply(modelMatrix);

	//-----SEND to GPU & Draw
	//the first set of vertices stored in our VBO:
	// Pass our current Model matrix to the vertex shaders:
	matl0.setMatl(matlSel2);								// set new material reflectances,
	//---------------For the Material object(s):
	gl.uniform3fv(matl0.uLoc_Ke, matl0.K_emit.slice(0,3));				// Ke emissive
	gl.uniform3fv(matl0.uLoc_Ka, matl0.K_ambi.slice(0,3));				// Ka ambient
	gl.uniform3fv(matl0.uLoc_Kd, matl0.K_diff.slice(0,3));				// Kd	diffuse
	gl.uniform3fv(matl0.uLoc_Ks, matl0.K_spec.slice(0,3));				// Ks specular
	eyePosWorld.set([g_EyeX, g_EyeY, g_EyeZ]);
	gl.uniform3fv(uLoc_eyePosWorld, eyePosWorld);// use it to set our uniform
	gl.uniform1i(matl0.uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny
	gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
	// Pass our current Normal matrix to the vertex shaders:
	gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
	gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);
	// Draw triangles: start at vertex 0 and draw 12 vertices
	gl.drawArrays(gl.TRIANGLES, 0, 12);


	// ----------------------- draw the pyramid side -----------------------
	modelMatrix = popMatrix();
	modelMatrix.translate(0,-0.2,-1);
	modelMatrix.rotate(180,1,0, 0);
	modelMatrix.rotate(currentAngle * 2,0,0, 1);
	modelMatrix.scale(2,2,1);
	modelMatrix.scale(0.5,0.5,0.5);

	// modelMatrix.rotate(c, 0, 1, 0);  // spin drawing axes on Y axis;
	// Calculate the matrix to transform the normal based on the model matrix
	var ratio = gl.drawingBufferWidth / (gl.drawingBufferHeight);
	mvpMatrix.setPerspective(40.0,   // FOVY: top-to-bottom vertical image angle, in degrees
		ratio,   // Image Aspect Ratio: camera lens width/height width/height = (right-left) / (top-bottom) = right/top
		1.0,   // camera z-near distance (always positive; frustum begins at z = -znear)
		100.0);  // camera z-far distance (always positive; frustum ends at z = -zfar)
	// console.log("parameters", g_EyeX, g_EyeY, g_EyeZ, theta);
	mvpMatrix.lookAt(g_EyeX, g_EyeY, g_EyeZ,     // center of projection
		g_EyeX + Math.sin(theta), g_EyeY + Math.cos(theta), g_EyeZ + turn_height,      // look-at point
		0.0, 0.0, 1.0);
	matl0.setMatl(matlSel);
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();
	mvpMatrix.multiply(modelMatrix);

	//-----SEND to GPU & Draw
	//the first set of vertices stored in our VBO:
	// Pass our current Model matrix to the vertex shaders:
	matl0.setMatl(matlSel2);								// set new material reflectances,
	//---------------For the Material object(s):
	gl.uniform3fv(matl0.uLoc_Ke, matl0.K_emit.slice(0,3));				// Ke emissive
	gl.uniform3fv(matl0.uLoc_Ka, matl0.K_ambi.slice(0,3));				// Ka ambient
	gl.uniform3fv(matl0.uLoc_Kd, matl0.K_diff.slice(0,3));				// Kd	diffuse
	gl.uniform3fv(matl0.uLoc_Ks, matl0.K_spec.slice(0,3));				// Ks specular
	eyePosWorld.set([g_EyeX, g_EyeY, g_EyeZ]);
	gl.uniform3fv(uLoc_eyePosWorld, eyePosWorld);// use it to set our uniform
	gl.uniform1i(matl0.uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny
	gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
	// Pass our current Normal matrix to the vertex shaders:
	gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
	gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);
	// Draw triangles: start at vertex 0 and draw 12 vertices
	gl.drawArrays(gl.TRIANGLES, 0, 12);
}

function drawCube(gl, n) {
	modelMatrix = popMatrix();

	modelMatrix.translate(3, 0,0.5);
	modelMatrix.rotate(currentAngle, 0,0, 1);
	modelMatrix.scale(0.5,0.5,0.5);
	var ratio = gl.drawingBufferWidth / (gl.drawingBufferHeight);
	mvpMatrix.setPerspective(40.0,   // FOVY: top-to-bottom vertical image angle, in degrees
		ratio,   // Image Aspect Ratio: camera lens width/height width/height = (right-left) / (top-bottom) = right/top
		1.0,   // camera z-near distance (always positive; frustum begins at z = -znear)
		100.0);  // camera z-far distance (always positive; frustum ends at z = -zfar)
	// console.log("parameters", g_EyeX, g_EyeY, g_EyeZ, theta);
	mvpMatrix.lookAt(g_EyeX, g_EyeY, g_EyeZ,     // center of projection
		g_EyeX + Math.sin(theta), g_EyeY + Math.cos(theta), g_EyeZ + turn_height,      // look-at point
		0.0, 0.0, 1.0);
	mvpMatrix.multiply(modelMatrix);
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();


	matl0.setMatl(matlSel3);								// set new material reflectances,
	//---------------For the Material object(s):
	gl.uniform3fv(matl0.uLoc_Ke, matl0.K_emit.slice(0,3));				// Ke emissive
	gl.uniform3fv(matl0.uLoc_Ka, matl0.K_ambi.slice(0,3));				// Ka ambient
	gl.uniform3fv(matl0.uLoc_Kd, matl0.K_diff.slice(0,3));				// Kd	diffuse
	gl.uniform3fv(matl0.uLoc_Ks, matl0.K_spec.slice(0,3));				// Ks specular
	eyePosWorld.set([g_EyeX, g_EyeY, g_EyeZ]);
	gl.uniform3fv(uLoc_eyePosWorld, eyePosWorld);// use it to set our uniform
	gl.uniform1i(matl0.uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny
	gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
	// Pass our current Normal matrix to the vertex shaders:
	gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
	gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

	gl.drawArrays(gl.TRIANGLES,             // use this drawing primitive, and
		cubeStart / floatsPerVertex, // start at this vertex number, and
		cubeVerts.length / floatsPerVertex);   // draw this many vertices


	// --------------------------- draw one jointed location upper half
	modelMatrix.rotate(g_angle01 -90,0,1,0)
	modelMatrix.translate(0, 0,2);
	modelMatrix.scale(0.2,0.2,1);
	var ratio = gl.drawingBufferWidth / (gl.drawingBufferHeight);
	mvpMatrix.setPerspective(40.0,   // FOVY: top-to-bottom vertical image angle, in degrees
		ratio,   // Image Aspect Ratio: camera lens width/height width/height = (right-left) / (top-bottom) = right/top
		1.0,   // camera z-near distance (always positive; frustum begins at z = -znear)
		100.0);  // camera z-far distance (always positive; frustum ends at z = -zfar)
	// console.log("parameters", g_EyeX, g_EyeY, g_EyeZ, theta);
	mvpMatrix.lookAt(g_EyeX, g_EyeY, g_EyeZ,     // center of projection
		g_EyeX + Math.sin(theta), g_EyeY + Math.cos(theta), g_EyeZ + turn_height,      // look-at point
		0.0, 0.0, 1.0);
	mvpMatrix.multiply(modelMatrix);
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();


	matl0.setMatl(matlSel3);								// set new material reflectances,
	//---------------For the Material object(s):
	gl.uniform3fv(matl0.uLoc_Ke, matl0.K_emit.slice(0,3));				// Ke emissive
	gl.uniform3fv(matl0.uLoc_Ka, matl0.K_ambi.slice(0,3));				// Ka ambient
	gl.uniform3fv(matl0.uLoc_Kd, matl0.K_diff.slice(0,3));				// Kd	diffuse
	gl.uniform3fv(matl0.uLoc_Ks, matl0.K_spec.slice(0,3));				// Ks specular
	eyePosWorld.set([g_EyeX, g_EyeY, g_EyeZ]);
	gl.uniform3fv(uLoc_eyePosWorld, eyePosWorld);// use it to set our uniform
	gl.uniform1i(matl0.uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny
	gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
	// Pass our current Normal matrix to the vertex shaders:
	gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
	gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

	gl.drawArrays(gl.TRIANGLES,             // use this drawing primitive, and
		cubeStart / floatsPerVertex, // start at this vertex number, and
		cubeVerts.length / floatsPerVertex);   // draw this many vertices
}

function drawSphere(gl, n) {
	modelMatrix = popMatrix();

	modelMatrix.translate(-3, 0,1);
	modelMatrix.rotate(currentAngle, 0, 0, 1);
	var ratio = gl.drawingBufferWidth / (gl.drawingBufferHeight);
	mvpMatrix.setPerspective(40.0,   // FOVY: top-to-bottom vertical image angle, in degrees
		ratio,   // Image Aspect Ratio: camera lens width/height width/height = (right-left) / (top-bottom) = right/top
		1.0,   // camera z-near distance (always positive; frustum begins at z = -znear)
		100.0);  // camera z-far distance (always positive; frustum ends at z = -zfar)
	// console.log("parameters", g_EyeX, g_EyeY, g_EyeZ, theta);
	mvpMatrix.lookAt(g_EyeX, g_EyeY, g_EyeZ,     // center of projection
		g_EyeX + Math.sin(theta), g_EyeY + Math.cos(theta), g_EyeZ + turn_height,      // look-at point
		0.0, 0.0, 1.0);

	mvpMatrix.multiply(modelMatrix);
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();
	matl0.setMatl(matlSel4);								// set new material reflectances,
	//---------------For the Material object(s):
	gl.uniform3fv(matl0.uLoc_Ke, matl0.K_emit.slice(0,3));				// Ke emissive
	gl.uniform3fv(matl0.uLoc_Ka, matl0.K_ambi.slice(0,3));				// Ka ambient
	gl.uniform3fv(matl0.uLoc_Kd, matl0.K_diff.slice(0,3));				// Kd	diffuse
	gl.uniform3fv(matl0.uLoc_Ks, matl0.K_spec.slice(0,3));				// Ks specular
	eyePosWorld.set([g_EyeX, g_EyeY, g_EyeZ]);
	gl.uniform3fv(uLoc_eyePosWorld, eyePosWorld);// use it to set our uniform
	gl.uniform1i(matl0.uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny
	gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
	// Pass our current Normal matrix to the vertex shaders:
	gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
	gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);
	gl.drawArrays(gl.TRIANGLE_STRIP,             // use this drawing primitive, and
		sphereStart / floatsPerVertex, // start at this vertex number, and
		sphVerts.length / floatsPerVertex);   // draw this many vertices
}

function drawThirdObject(gl, n) {
	modelMatrix = popMatrix();
	modelMatrix.translate(-6, 1,1);
	modelMatrix.rotate(currentAngle, 0,0, 1);
	modelMatrix.scale(0.1,0.1,1);
	var ratio = gl.drawingBufferWidth / (gl.drawingBufferHeight);
	mvpMatrix.setPerspective(40.0,   // FOVY: top-to-bottom vertical image angle, in degrees
		ratio,   // Image Aspect Ratio: camera lens width/height width/height = (right-left) / (top-bottom) = right/top
		1.0,   // camera z-near distance (always positive; frustum begins at z = -znear)
		100.0);  // camera z-far distance (always positive; frustum ends at z = -zfar)
	// console.log("parameters", g_EyeX, g_EyeY, g_EyeZ, theta);
	mvpMatrix.lookAt(g_EyeX, g_EyeY, g_EyeZ,     // center of projection
		g_EyeX + Math.sin(theta), g_EyeY + Math.cos(theta), g_EyeZ + turn_height,      // look-at point
		0.0, 0.0, 1.0);
	mvpMatrix.multiply(modelMatrix);
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();


	matl0.setMatl(matlSel6);								// set new material reflectances,
	//---------------For the Material object(s):
	gl.uniform3fv(matl0.uLoc_Ke, matl0.K_emit.slice(0,3));				// Ke emissive
	gl.uniform3fv(matl0.uLoc_Ka, matl0.K_ambi.slice(0,3));				// Ka ambient
	gl.uniform3fv(matl0.uLoc_Kd, matl0.K_diff.slice(0,3));				// Kd	diffuse
	gl.uniform3fv(matl0.uLoc_Ks, matl0.K_spec.slice(0,3));				// Ks specular
	eyePosWorld.set([g_EyeX, g_EyeY, g_EyeZ]);
	gl.uniform3fv(uLoc_eyePosWorld, eyePosWorld);// use it to set our uniform
	gl.uniform1i(matl0.uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny
	gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
	// Pass our current Normal matrix to the vertex shaders:
	gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
	gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

	gl.drawArrays(gl.TRIANGLES,             // use this drawing primitive, and
		cubeStart / floatsPerVertex, // start at this vertex number, and
		cubeVerts.length / floatsPerVertex);   // draw this many vertices

	pushMatrix(modelMatrix);

	// ------------------------------ draw the rotating rod
	modelMatrix = popMatrix();
	modelMatrix.scale(10, 10,1);
	modelMatrix.translate(0, 0,1.1);
	modelMatrix.rotate(90, 1,0, 0);
	modelMatrix.rotate(currentAngle, 0,1, 0);
	modelMatrix.scale(0.1, 0.1,1);

	var ratio = gl.drawingBufferWidth / (gl.drawingBufferHeight);
	mvpMatrix.setPerspective(40.0,   // FOVY: top-to-bottom vertical image angle, in degrees
		ratio,   // Image Aspect Ratio: camera lens width/height width/height = (right-left) / (top-bottom) = right/top
		1.0,   // camera z-near distance (always positive; frustum begins at z = -znear)
		100.0);  // camera z-far distance (always positive; frustum ends at z = -zfar)
	// console.log("parameters", g_EyeX, g_EyeY, g_EyeZ, theta);
	mvpMatrix.lookAt(g_EyeX, g_EyeY, g_EyeZ,     // center of projection
		g_EyeX + Math.sin(theta), g_EyeY + Math.cos(theta), g_EyeZ + turn_height,      // look-at point
		0.0, 0.0, 1.0);
	mvpMatrix.multiply(modelMatrix);
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();


	matl0.setMatl(matlSel6);								// set new material reflectances,
	//---------------For the Material object(s):
	gl.uniform3fv(matl0.uLoc_Ke, matl0.K_emit.slice(0,3));				// Ke emissive
	gl.uniform3fv(matl0.uLoc_Ka, matl0.K_ambi.slice(0,3));				// Ka ambient
	gl.uniform3fv(matl0.uLoc_Kd, matl0.K_diff.slice(0,3));				// Kd	diffuse
	gl.uniform3fv(matl0.uLoc_Ks, matl0.K_spec.slice(0,3));				// Ks specular
	eyePosWorld.set([g_EyeX, g_EyeY, g_EyeZ]);
	gl.uniform3fv(uLoc_eyePosWorld, eyePosWorld);// use it to set our uniform
	gl.uniform1i(matl0.uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny
	gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
	// Pass our current Normal matrix to the vertex shaders:
	gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
	gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

	gl.drawArrays(gl.TRIANGLES,             // use this drawing primitive, and
		cubeStart / floatsPerVertex, // start at this vertex number, and
		cubeVerts.length / floatsPerVertex);   // draw this many vertices

	pushMatrix(modelMatrix);
	pushMatrix(modelMatrix);

	// ------------------------------ draw the sphere attached to rod
	modelMatrix = popMatrix();
	modelMatrix.scale(10, 10,1);
	modelMatrix.translate(0, 0,1);
	modelMatrix.scale(0.3, 0.3,0.3);
	modelMatrix.rotate(90, 1,0, 0);
	modelMatrix.rotate(currentAngle, 0,1, 0);

	var ratio = gl.drawingBufferWidth / (gl.drawingBufferHeight);
	mvpMatrix.setPerspective(40.0,   // FOVY: top-to-bottom vertical image angle, in degrees
		ratio,   // Image Aspect Ratio: camera lens width/height width/height = (right-left) / (top-bottom) = right/top
		1.0,   // camera z-near distance (always positive; frustum begins at z = -znear)
		100.0);  // camera z-far distance (always positive; frustum ends at z = -zfar)
	// console.log("parameters", g_EyeX, g_EyeY, g_EyeZ, theta);
	mvpMatrix.lookAt(g_EyeX, g_EyeY, g_EyeZ,     // center of projection
		g_EyeX + Math.sin(theta), g_EyeY + Math.cos(theta), g_EyeZ + turn_height,      // look-at point
		0.0, 0.0, 1.0);
	mvpMatrix.multiply(modelMatrix);
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();

	matl0.setMatl(matlSel7);								// set new material reflectances,
	//---------------For the Material object(s):
	gl.uniform3fv(matl0.uLoc_Ke, matl0.K_emit.slice(0,3));				// Ke emissive
	gl.uniform3fv(matl0.uLoc_Ka, matl0.K_ambi.slice(0,3));				// Ka ambient
	gl.uniform3fv(matl0.uLoc_Kd, matl0.K_diff.slice(0,3));				// Kd	diffuse
	gl.uniform3fv(matl0.uLoc_Ks, matl0.K_spec.slice(0,3));				// Ks specular
	eyePosWorld.set([g_EyeX, g_EyeY, g_EyeZ]);
	gl.uniform3fv(uLoc_eyePosWorld, eyePosWorld);// use it to set our uniform
	gl.uniform1i(matl0.uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny
	gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
	// Pass our current Normal matrix to the vertex shaders:
	gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
	gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

	gl.drawArrays(gl.TRIANGLE_STRIP,             // use this drawing primitive, and
		sphereStart / floatsPerVertex, // start at this vertex number, and
		sphVerts.length / floatsPerVertex);   // draw this many vertices

	// --------------------------- draw the second sphere
	modelMatrix = popMatrix();
	modelMatrix.scale(10, 10,1);
	modelMatrix.translate(0, 0,-1);
	modelMatrix.scale(0.3, 0.3,0.3);
	modelMatrix.rotate(90, 1,0, 0);
	modelMatrix.rotate(currentAngle, 0,1, 0);

	var ratio = gl.drawingBufferWidth / (gl.drawingBufferHeight);
	mvpMatrix.setPerspective(40.0,   // FOVY: top-to-bottom vertical image angle, in degrees
		ratio,   // Image Aspect Ratio: camera lens width/height width/height = (right-left) / (top-bottom) = right/top
		1.0,   // camera z-near distance (always positive; frustum begins at z = -znear)
		100.0);  // camera z-far distance (always positive; frustum ends at z = -zfar)
	// console.log("parameters", g_EyeX, g_EyeY, g_EyeZ, theta);
	mvpMatrix.lookAt(g_EyeX, g_EyeY, g_EyeZ,     // center of projection
		g_EyeX + Math.sin(theta), g_EyeY + Math.cos(theta), g_EyeZ + turn_height,      // look-at point
		0.0, 0.0, 1.0);
	mvpMatrix.multiply(modelMatrix);
	normalMatrix.setInverseOf(modelMatrix);
	normalMatrix.transpose();

	matl0.setMatl(matlSel7);								// set new material reflectances,
	//---------------For the Material object(s):
	gl.uniform3fv(matl0.uLoc_Ke, matl0.K_emit.slice(0,3));				// Ke emissive
	gl.uniform3fv(matl0.uLoc_Ka, matl0.K_ambi.slice(0,3));				// Ka ambient
	gl.uniform3fv(matl0.uLoc_Kd, matl0.K_diff.slice(0,3));				// Kd	diffuse
	gl.uniform3fv(matl0.uLoc_Ks, matl0.K_spec.slice(0,3));				// Ks specular
	eyePosWorld.set([g_EyeX, g_EyeY, g_EyeZ]);
	gl.uniform3fv(uLoc_eyePosWorld, eyePosWorld);// use it to set our uniform
	gl.uniform1i(matl0.uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny
	gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
	// Pass our current Normal matrix to the vertex shaders:
	gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
	gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

	gl.drawArrays(gl.TRIANGLE_STRIP,             // use this drawing primitive, and
		sphereStart / floatsPerVertex, // start at this vertex number, and
		sphVerts.length / floatsPerVertex);   // draw this many vertices
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

// animation for rod
function animate2() {
//==============================================================================
// Calculate the elapsed time; update all animation angles & amounts.
	var now = Date.now();
	var elapsed = now - g_last_rod;
	g_last_rod = now;

	// Update the current rotation angle (adjusted by the elapsed time)
	// limit the angle to move smoothly between +20 and -85 degrees:
	//  if(angle >  120.0 && g_angleRate01 > 0) g_angleRate01 = -g_angleRate01;
	//  if(angle < -120.0 && g_angleRate01 < 0) g_angleRate01 = -g_angleRate01;
	if(g_angle01 >= 180 && g_angleRate01 > 0) g_angleRate01 = -g_angleRate01;
	if(g_angle01 <= 0 && g_angleRate01 < 0) g_angleRate01 = -g_angleRate01;
	g_angle01 = g_angle01 + (g_angleRate01 * elapsed) / 1000.0;
	// g_angle01 %= 360*3;
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
		g_angle_tmp = g_angleRate01;
		ANGLE_STEP = 0;
		g_angleRate01 = 0;
	}
	else {
		ANGLE_STEP = myTmp;
		g_angleRate01 = g_angle_tmp;
	}
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
// 	document.getElementById('KeyDownResult').innerHTML = ''; // clear old results
// 	document.getElementById('KeyModResult' ).innerHTML = '';
// 	// key details:
// 	document.getElementById('KeyModResult' ).innerHTML =
// 		"   --kev.code:"+kev.code   +"      --kev.key:"+kev.key+
// 		"<br>--kev.ctrlKey:"+kev.ctrlKey+" --kev.shiftKey:"+kev.shiftKey+
// 		"<br>--kev.altKey:"+kev.altKey +"  --kev.metaKey:"+kev.metaKey;

	switch(kev.code) {
		case "KeyP":
			console.log("Pause/unPause!\n");                // print on console,
			// document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found p/P key. Pause/unPause!';   // print on webpage
			if(g_isRun==true) {
				g_isRun = false;    // STOP animation
				runStop();
				// document.getElementById("stop/start").innerText = "both object stop spinning!"
			}
			else {
				g_isRun = true;     // RESTART animation
				runStop();
				// document.getElementById("stop/start").innerText = "both object start spinning!"
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
			// document.getElementById('KeyDownResult').innerHTML =
			// 	'myKeyDown() found d/D key. Strafe RIGHT!';
			turn_height -= 0.03;
			break;
		case "KeyW":
			console.log("d/D key: Strafe RIGHT!\n");
			// document.getElementById('KeyDownResult').innerHTML =
			// 	'myKeyDown() found d/D key. Strafe RIGHT!';
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
			// document.getElementById('KeyDownResult').innerHTML =
			// 	'myKeyDown(): Left Arrow='+kev.keyCode;
			g_EyeX -= Math.cos(theta) * sideway;
			g_EyeY -= -Math.sin(theta) * sideway;
			break;
		case "ArrowRight":
			console.log('right-arrow.');
			// document.getElementById('KeyDownResult').innerHTML =
			// 	'myKeyDown():Right Arrow:keyCode='+kev.keyCode;
			g_EyeX -= -Math.cos(theta) * sideway;
			g_EyeY -= Math.sin(theta) * sideway;
			break;
		case "ArrowUp":
			console.log('   up-arrow.');
			// document.getElementById('KeyDownResult').innerHTML =
			// 	'myKeyDown():   Up Arrow:keyCode='+kev.keyCode;
			g_EyeX += Math.sin(theta) * forward;
			g_EyeY += Math.cos(theta) * forward;
			g_EyeZ += turn_height * forward;
			break;
		case "ArrowDown":
			console.log(' down-arrow.');
			// document.getElementById('KeyDownResult').innerHTML =
			// 	'myKeyDown(): Down Arrow:keyCode='+kev.keyCode;
			g_EyeX -= Math.sin(theta) * forward;
			g_EyeY -= Math.cos(theta) * forward;
			g_EyeZ -= turn_height * forward;
			break;
		default:
			console.log("UNUSED!");
			// document.getElementById('KeyDownResult').innerHTML =
			// 	'myKeyDown(): UNUSED!';
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

	var xcount = 500;			// # of lines to draw in x,y to make the grid.
	var ycount = 500;
	var xymax	= 50;			// grid size; extends to cover +/-xymax in x and y.
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
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,		0.7, 0.9, 0.1,	1,0,0,// Node 3
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,		0, 1, 0,	1,0,0,// Node 2
		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.9, 0, 0.3,  1,0,0,// Node 4

		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.9, 0, 0.3,	1,0,0,// Node 4
		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.9, 1, 0.9,	1,0,0,// Node 7
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.7, 0.9, 0.1, 1,0,0,	// Node 3

		// +y face: GREEN
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,  0, 0.4, 1,    0,1,0,	// Node 1
		-1.0 * length,  1.0 * width, 1.0 * height, 1.0,	  0.3, 0.3, 1,	0,1,0,// Node 5
		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	 0.9, 0, 0.3,	0,1,0,// Node 4

		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.9, 0, 0.3,	0,1,0,// Node 4
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,	  0, 1, 0,	    0,1,0,// Node 2
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,  0, 0.4, 1,    0,1,0,	// Node 1

		// +z face: BLUE
		-1.0 * length,  1.0 * width,  1.0 * height, 1.0,	 0.3, 0.3, 1,   0,0,1, // Node 5
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  1, 0.9, 0.2,	0,0,1, // Node 6
		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	 	0.9, 1, 0.9,	0,0,1, // Node 7

		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.9, 1, 0.9,	    0,0,1, // Node 7
		1.0 * length,  1.0 * width,  1.0 * height, 1.0,	  0.9, 0, 0.3,	    0,0,1, // Node 4
		-1.0 * length,  1.0 * width,  1.0 * height, 1.0,	 0.3, 0.3, 1,	0,0,1, // Node 5

		// -x face: CYAN
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  1, 0.9, 0.2,	-1,0,0,// Node 6
		-1.0 * length,  1.0 * width,  1.0 * height, 1.0,	 0.3, 0.3, 1,	-1,0,0,// Node 5
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	   0, 0.4, 1,	-1,0,0,// Node 1

		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	   0, 0.4, 1,	-1,0,0,// Node 1
		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	 0.3, 0.6, 0.7,	-1,0,0,// Node 0
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  1, 0.9, 0.2,	-1,0,0,// Node 6

		// -y face: MAGENTA
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.7, 0.9, 0.1,	0, -1, 0,// Node 3
		1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  0.9, 1, 0.9,	    0, -1, 0,// Node 7
		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	  1, 0.9, 0.2,	0, -1, 0,// Node 6

		-1.0 * length, -1.0 * width,  1.0 * height, 1.0,	 1, 0.9, 0.2,	0, -1, 0,// Node 6
		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.3, 0.6, 0.7,0, -1, 0,// Node 0
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.7, 0.9, 0.1,	0, -1, 0,// Node 3

		// -z face: YELLOW
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,	 0, 1, 0,           0, 0, -1,// Node 2
		1.0 * length, -1.0 * width, -1.0 * height, 1.0,	  0.7, 0.9, 0.1,	0, 0, -1,// Node 3
		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	 0.3, 0.6, 0.7,	0, 0, -1,// Node 0

		-1.0 * length, -1.0 * width, -1.0 * height, 1.0,	 0.3, 0.6, 0.7, 0, 0, -1,// Node 0
		-1.0 * length,  1.0 * width, -1.0 * height, 1.0,	   0, 0.4, 1,	0, 0, -1,// Node 1
		1.0 * length,  1.0 * width, -1.0 * height, 1.0,	  0, 1, 0,	        0, 0, -1,// Node 2

	]);

}


function makeSphere() {
//==============================================================================
// Make a sphere from one TRIANGLE_STRIP drawing primitive,  using the
// 'stepped spiral' design (Method 2) described in the class lecture notes.
// Sphere radius==1.0, centered at the origin, with 'south' pole at
// (x,y,z) = (0,0,-1) and 'north' pole at (0,0,+1).  The tri-strip starts at the
// south-pole end-cap spiraling upwards (in +z direction) in CCW direction as
// viewed from the origin looking down (from inside the sphere).
// Between the south end-cap and the north, it creates ring-like 'slices' that
// defined by parallel planes of constant z.  Each slice of the tri-strip
// makes up an equal-lattitude portion of the sphere, and the stepped-spiral
// slices follow the same design used to the makeCylinder2() function.
//
// (NOTE: you'll get better-looking results if you create a 'makeSphere3()
// function that uses the 'degenerate stepped spiral' design (Method 3 in
// lecture notes).
//

	var slices = 10;		// # of slices of the sphere along the z axis, including
	// the south-pole and north pole end caps. ( >=2 req'd)
	var sliceVerts = 21;	// # of vertices around the top edge of the slice
	// (same number of vertices on bottom of slice, too)
	// (HINT: odd# or prime#s help avoid accidental symmetry)
	var topColr = new Float32Array([0.3, 0.3, 0.3]);	// South Pole: dark-gray
	var botColr = new Float32Array([0.8, 0.8, 0.8]);	// North Pole: light-gray.
	var errColr = new Float32Array([1.0, 0.2, 0.2]);	// Bright-red trouble colr
	var sliceAngle = Math.PI/slices;	// One slice spans this fraction of the
	// 180 degree (Pi radian) lattitude angle between south pole and north pole.

	// Create a (global) array to hold this sphere's vertices:
	sphVerts = new Float32Array(  ((slices*2*sliceVerts) -2) * floatsPerVertex);
	// # of vertices * # of elements needed to store them.
	// Each end-cap slice requires (2*sliceVerts -1) vertices
	// and each slice between them requires (2*sliceVerts).
	// Create the entire sphere as one single tri-strip array. This first for() loop steps through each 'slice', and the for() loop it contains steps through each vertex in the current slice.
	// INITIALIZE:
	var cosBot = 0.0;					// cosine and sine of the lattitude angle for
	var sinBot = 0.0;					// 	the current slice's BOTTOM (southward) edge.
	// (NOTE: Lattitude = 0 @equator; -90deg @south pole; +90deg at north pole)
	var cosTop = 0.0;					// "	" " for current slice's TOP (northward) edge
	var sinTop = 0.0;
	// for() loop's s var counts slices;
	// 				  its v var counts vertices;
	// 					its j var counts Float32Array elements
	//					(vertices * elements per vertex)
	var j = 0;							// initialize our array index
	var isFirstSlice = 1;		// ==1 ONLY while making south-pole slice; 0 otherwise
	var isLastSlice = 0;		// ==1 ONLY while making north-pole slice; 0 otherwise
	for(s=0; s<slices; s++) {	// for each slice of the sphere,---------------------
		// For current slice's top & bottom edges, find lattitude angle sin,cos:
		if(s==0) {
			isFirstSlice = 1;		// true ONLY when we're creating the south-pole slice
			cosBot =  0.0; 			// initialize: first slice's lower edge is south pole.
			sinBot = -1.0;			// (cos(lat) sets slice diameter; sin(lat) sets z )
		}
		else {					// otherwise, set new bottom edge == old top edge
			isFirstSlice = 0;
			cosBot = cosTop;
			sinBot = sinTop;
		}								// then compute sine,cosine of lattitude of new top edge.
		cosTop = Math.cos((-Math.PI/2) +(s+1)*sliceAngle);
		sinTop = Math.sin((-Math.PI/2) +(s+1)*sliceAngle);
		// (NOTE: Lattitude = 0 @equator; -90deg @south pole; +90deg at north pole)
		// (       use cos(lat) to set slice radius, sin(lat) to set slice z coord)
		// Go around entire slice; start at x axis, proceed in CCW direction
		// (as seen from origin inside the sphere), generating TRIANGLE_STRIP verts.
		// The vertex-counter 'v' starts at 0 at the start of each slice, but:
		// --the first slice (the South-pole end-cap) begins with v=1, because
		// 		its first vertex is on the TOP (northwards) side of the tri-strip
		// 		to ensure correct winding order (tri-strip's first triangle is CCW
		//		when seen from the outside of the sphere).
		// --the last slice (the North-pole end-cap) ends early (by one vertex)
		//		because its last vertex is on the BOTTOM (southwards) side of slice.
		//
		if(s==slices-1) isLastSlice=1;// (flag: skip last vertex of the last slice).
		for(v=isFirstSlice;    v< 2*sliceVerts-isLastSlice;   v++,j+=floatsPerVertex)
		{						// for each vertex of this slice,
			if(v%2 ==0) { // put vertices with even-numbered v at slice's bottom edge;
				// by circling CCW along longitude (east-west) angle 'theta':
				// (0 <= theta < 360deg, increases 'eastward' on sphere).
				// x,y,z,w == cos(theta),sin(theta), 1.0, 1.0
				// where			theta = 2*PI*(v/2)/capVerts = PI*v/capVerts
				sphVerts[j  ] = cosBot * Math.cos(Math.PI * v/sliceVerts);	// x
				sphVerts[j+1] = cosBot * Math.sin(Math.PI * v/sliceVerts);	// y
				sphVerts[j+2] = sinBot;																			// z
				sphVerts[j+3] = 1.0;																				// w.
				sphVerts[j+7] = cosBot * Math.cos(Math.PI * v/sliceVerts);	// x
				sphVerts[j+8] = cosBot * Math.sin(Math.PI * v/sliceVerts);	// y
				sphVerts[j+9] = sinBot;
			}
			else {	// put vertices with odd-numbered v at the the slice's top edge
				// (why PI and not 2*PI? because 0 <= v < 2*sliceVerts
				// and thus we can simplify cos(2*PI* ((v-1)/2)*sliceVerts)
				// (why (v-1)? because we want longitude angle 0 for vertex 1).
				sphVerts[j  ] = cosTop * Math.cos(Math.PI * (v-1)/sliceVerts); 	// x
				sphVerts[j+1] = cosTop * Math.sin(Math.PI * (v-1)/sliceVerts);	// y
				sphVerts[j+2] = sinTop;		// z
				sphVerts[j+3] = 1.0;
				sphVerts[j+7] = cosTop * Math.cos(Math.PI * (v-1)/sliceVerts); 	// x
				sphVerts[j+8] = cosTop * Math.sin(Math.PI * (v-1)/sliceVerts);	// y
				sphVerts[j+9] = sinTop;		// z
			}
			// finally, set some interesting colors for vertices:
			if(v==0) { 	// Troublesome vertex: this vertex gets shared between 3
				// important triangles; the last triangle of the previous slice, the
				// anti-diagonal 'step' triangle that connects previous slice and next
				// slice, and the first triangle of that next slice.  Smooth (Gouraud)
				// shading of this vertex prevents us from choosing separate colors for
				// each slice.  For a better solution, use the 'Degenerate Stepped Spiral'
				// (Method 3) described in the Lecture Notes.
				sphVerts[j+4]=errColr[0];
				sphVerts[j+5]=errColr[1];
				sphVerts[j+6]=errColr[2];
			}
			else if(isFirstSlice==1) {
				sphVerts[j+4]=botColr[0];
				sphVerts[j+5]=botColr[1];
				sphVerts[j+6]=botColr[2];
			}
			else if(isLastSlice==1) {
				sphVerts[j+4]=topColr[0];
				sphVerts[j+5]=topColr[1];
				sphVerts[j+6]=topColr[2];
			}
			else {	// for all non-top, not-bottom slices, set vertex colors randomly
				sphVerts[j+4]= Math.random()/2;  	// 0.0 <= red <= 0.5
				sphVerts[j+5]= Math.random()/2;		// 0.0 <= grn <= 0.5
				sphVerts[j+6]= Math.random()/2;		// 0.0 <= blu <= 0.5
			}
		}
	}
}


function initVertexBuffer(gl) {
//==============================================================================
	makePyramid();
	makeGroundGrid();
	makeCube();
	makeSphere();

	var mySiz = (pyramidShapes.length + gndVerts.length + cubeVerts.length + sphVerts.length);
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

	sphereStart  = i;
	for(j=0; j< sphVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = sphVerts[j];
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