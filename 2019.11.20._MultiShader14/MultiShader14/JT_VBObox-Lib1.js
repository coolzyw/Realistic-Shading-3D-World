//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)

// Tabs set to 2

/*=====================
  VBObox-Lib.js library: 
  ===================== 
Note that you don't really need 'VBObox' objects for any simple, 
    beginner-level WebGL/OpenGL programs: if all vertices contain exactly 
		the same attributes (e.g. position, color, surface normal), and use 
		the same shader program (e.g. same Vertex Shader and Fragment Shader), 
		then our textbook's simple 'example code' will suffice.
		  
***BUT*** that's rare -- most genuinely useful WebGL/OpenGL programs need 
		different sets of vertices with  different sets of attributes rendered 
		by different shader programs.  THUS a customized VBObox object for each 
		VBO/shader-program pair will help you remember and correctly implement ALL 
		the WebGL/GLSL steps required for a working multi-shader, multi-VBO program.
		
One 'VBObox' object contains all we need for WebGL/OpenGL to render on-screen a 
		set of shapes made from vertices stored in one Vertex Buffer Object (VBO), 
		as drawn by calls to one 'shader program' that runs on your computer's 
		Graphical Processing Unit(GPU), along with changes to values of that shader 
		program's one set of 'uniform' varibles.  
The 'shader program' consists of a Vertex Shader and a Fragment Shader written 
		in GLSL, compiled and linked and ready to execute as a Single-Instruction, 
		Multiple-Data (SIMD) parallel program executed simultaneously by multiple 
		'shader units' on the GPU.  The GPU runs one 'instance' of the Vertex 
		Shader for each vertex in every shape, and one 'instance' of the Fragment 
		Shader for every on-screen pixel covered by any part of any drawing 
		primitive defined by those vertices.
The 'VBO' consists of a 'buffer object' (a memory block reserved in the GPU),
		accessed by the shader program through its 'attribute' variables. Shader's
		'uniform' variable values also get retrieved from GPU memory, but their 
		values can't be changed while the shader program runs.  
		Each VBObox object stores its own 'uniform' values as vars in JavaScript; 
		its 'adjust()'	function computes newly-updated values for these uniform 
		vars and then transfers them to the GPU memory for use by shader program.
EVENTUALLY you should replace 'cuon-matrix-quat03.js' with the free, open-source
   'glmatrix.js' library for vectors, matrices & quaternions: Google it!
		This vector/matrix library is more complete, more widely-used, and runs
		faster than our textbook's 'cuon-matrix-quat03.js' library.  
		--------------------------------------------------------------
		I recommend you use glMatrix.js instead of cuon-matrix-quat03.js
		--------------------------------------------------------------
		for all future WebGL programs. 
You can CONVERT existing cuon-matrix-based programs to glmatrix.js in a very 
    gradual, sensible, testable way:
		--add the glmatrix.js library to an existing cuon-matrix-based program;
			(but don't call any of its functions yet).
		--comment out the glmatrix.js parts (if any) that cause conflicts or in	
			any way disrupt the operation of your program.
		--make just one small local change in your program; find a small, simple,
			easy-to-test portion of your program where you can replace a 
			cuon-matrix object or function call with a glmatrix function call.
			Test; make sure it works. Don't make too large a change: it's hard to fix!
		--Save a copy of this new program as your latest numbered version. Repeat
			the previous step: go on to the next small local change in your program
			and make another replacement of cuon-matrix use with glmatrix use. 
			Test it; make sure it works; save this as your next numbered version.
		--Continue this process until your program no longer uses any cuon-matrix
			library features at all, and no part of glmatrix is commented out.
			Remove cuon-matrix from your library, and now use only glmatrix.

	------------------------------------------------------------------
	VBObox -- A MESSY SET OF CUSTOMIZED OBJECTS--NOT REALLY A 'CLASS'
	------------------------------------------------------------------
As each 'VBObox' object can contain:
  -- a DIFFERENT GLSL shader program, 
  -- a DIFFERENT set of attributes that define a vertex for that shader program, 
  -- a DIFFERENT number of vertices to used to fill the VBOs in GPU memory, and 
  -- a DIFFERENT set of uniforms transferred to GPU memory for shader use.  
  THUS:
		I don't see any easy way to use the exact same object constructors and 
		prototypes for all VBObox objects.  Every additional VBObox objects may vary 
		substantially, so I recommend that you copy and re-name an existing VBObox 
		prototype object, and modify as needed, as shown here. 
		(e.g. to make the VBObox3 object, copy the VBObox2 constructor and 
		all its prototype functions, then modify their contents for VBObox3 
		activities.)

*/

// Written for EECS 351-2,	Intermediate Computer Graphics,
//							Northwestern Univ. EECS Dept., Jack Tumblin
// 2016.05.26 J. Tumblin-- Created; tested on 'TwoVBOs.html' starter code.
// 2017.02.20 J. Tumblin-- updated for EECS 351-1 use for Project C.
// 2018.04.11 J. Tumblin-- minor corrections/renaming for particle systems.
//    --11e: global 'gl' replaced redundant 'myGL' fcn args; 
//    --12: added 'SwitchToMe()' fcn to simplify 'init()' function and to fix 
//      weird subtle errors that sometimes appear when we alternate 'adjust()'
//      and 'draw()' functions of different VBObox objects. CAUSE: found that
//      and 'draw()' functions of different VBObox objects. CAUSE: found that
//      only the 'draw()' function (and not the 'adjust()' function) made a full
//      changeover from one VBObox to another; thus calls to 'adjust()' for one
//      VBObox could corrupt GPU contents for another.
//      --Created vboStride, vboOffset members to centralize VBO layout in the 
//      constructor function.
//    -- 13 (abandoned) tried to make a 'core' or 'resuable' VBObox object to
//      which we would add on new properties for shaders, uniforms, etc., but
//      I decided there was too little 'common' code that wasn't customized.
//=============================================================================

//=============================================================================
//=============================================================================
function VBObox1() {
//=============================================================================
//=============================================================================
// CONSTRUCTOR for one re-usable 'VBObox0' object that holds all data and fcns
// needed to render vertices from one Vertex Buffer Object (VBO) using one
// separate shader program (a vertex-shader & fragment-shader pair) and one
// set of 'uniform' variables.

// Constructor goal:
// Create and set member vars that will ELIMINATE ALL LITERALS (numerical values
// written into code) in all other VBObox functions. Keeping all these (initial)
// values here, in this one coonstrutor function, ensures we can change them
// easily WITHOUT disrupting any other code, ever!

    this.VERT_SRC =	//--------------------- VERTEX SHADER source code
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
        //-----------------------------------------------------------------------------
        'void main() { \n' +
        // Compute CVV coordinate values from our given vertex. This 'built-in'
        // 'varying' value gets interpolated to set screen position for each pixel.
        '  gl_Position = u_MvpMatrix * a_Position;\n' +
        // Calculate the vertex position & normal vec in the WORLD coordinate system
        // for use as a 'varying' variable: fragment shaders get per-pixel values
        // (interpolated between vertices for our drawing primitive (TRIANGLE)).
        '  v_Position = u_ModelMatrix * a_Position; \n' +
        // 3D surface normal of our vertex, in world coords.  ('varying'--its value
        // gets interpolated (in world coords) for each pixel's fragment shader.
        '  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
        '	 v_Kd = u_MatlSet[0].diff; \n' +		// find per-pixel diffuse reflectance from per-vertex
        // (no per-pixel Ke,Ka, or Ks, but you can do it...)
        //	'  v_Kd = vec3(1.0, 1.0, 0.0); \n'	+ // TEST; color fixed at green
        '}\n';

    this.FRAG_SRC = //---------------------- FRAGMENT SHADER source code
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
        // OLD first material definition: you write 2nd, 3rd, etc.
        //  'uniform vec3 u_Ke;\n' +						// Phong Reflectance: emissive
        //  'uniform vec3 u_Ka;\n' +						// Phong Reflectance: ambient
        // no Phong Reflectance: diffuse? -- no: use v_Kd instead for per-pixel value
        //  'uniform vec3 u_Ks;\n' +						// Phong Reflectance: specular
        //  'uniform int u_Kshiny;\n' +				// Phong Reflectance: 1 < shiny < 128
        //
        'uniform vec3 u_eyePosWorld; \n' + 	// Camera/eye location in world coords.

        //-------------VARYING:Vertex Shader values sent per-pix'''''''''''''''';el to Fragment shader:
        'varying vec3 v_Normal;\n' +				// Find 3D surface normal at each pix
        'varying vec4 v_Position;\n' +			// pixel's 3D pos too -- in 'world' coords
        'varying vec3 v_Kd;	\n' +						// Find diffuse reflectance K_d per pix
        // Ambient? Emissive? Specular? almost
        // NEVER change per-vertex: I use 'uniform' values

        'void main() { \n' +
        // Normalize! !!IMPORTANT!! TROUBLE if you don't!
        // normals interpolated for each pixel aren't 1.0 in length any more!
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
        // (use max() to discard any negatives from lights below the surface)
        // Apply the 'shininess' exponent K_e:
        // Try it two different ways:		The 'new hotness': pow() fcn in GLSL.
        // CAREFUL!  pow() won't accept integer exponents! Convert K_shiny!
        '  float e64 = pow(nDotH, float(u_MatlSet[0].shiny));\n' +
        // Calculate the final color from diffuse reflection and ambient reflection
        //  '	 vec3 emissive = u_Ke;' +
        '	 vec3 emissive = 										u_MatlSet[0].emit;' +
        '  vec3 ambient = u_LampSet[0].ambi * u_MatlSet[0].ambi;\n' +
        '  vec3 diffuse = u_LampSet[0].diff * v_Kd * nDotL;\n' +
        '	 vec3 speculr = u_LampSet[0].spec * u_MatlSet[0].spec * e64;\n' +
        '  gl_FragColor = vec4(emissive + ambient + diffuse + speculr , 1.0);\n' +
        '}\n';

    //==============================================================================
// Create a list of vertices that create a large grid of lines in the x,y plane
// centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.

    var SPHERE_DIV = 13; //default: 13.  JT: try others: 11,9,7,5,4,3,2,

    var i, ai, si, ci;
    var j, aj, sj, cj;
    var p1, p2;

    var positions = [];
    var indices = [];

    // Generate coordinates
    for (j = 0; j <= SPHERE_DIV; j++) {
        aj = j * Math.PI / SPHERE_DIV;
        sj = Math.sin(aj);
        cj = Math.cos(aj);
        for (i = 0; i <= SPHERE_DIV; i++) {
            ai = i * 2 * Math.PI / SPHERE_DIV;
            si = Math.sin(ai);
            ci = Math.cos(ai);

            positions.push(si * sj);  // X
            positions.push(cj);       // Y
            positions.push(ci * sj);  // Z
        }
    }

    // Generate indices
    for (j = 0; j < SPHERE_DIV; j++) {
        for (i = 0; i < SPHERE_DIV; i++) {
            p1 = j * (SPHERE_DIV+1) + i;
            p2 = p1 + (SPHERE_DIV+1);

            indices.push(p1);
            indices.push(p2);
            indices.push(p1 + 1);

            indices.push(p1 + 1);
            indices.push(p2);
            indices.push(p2 + 1);
        }
    }

    this.vboContents = new Uint16Array(indices);

    this.vboVerts = indices.length;						// # of vertices held in 'vboContents' array
    this.FSIZE = this.vboContents.BYTES_PER_ELEMENT;
    // bytes req'd by 1 vboContents array element;
    // (why? used to compute stride and offset
    // in bytes for vertexAttribPointer() calls)
    this.vboBytes = this.vboContents.length * this.FSIZE;
    // total number of bytes stored in vboContents
    // (#  of floats in vboContents array) *
    // (# of bytes/float).
    this.vboStride = this.vboBytes / this.vboVerts;
    // (== # of bytes to store one complete vertex).
    // From any attrib in a given vertex in the VBO,
    // move forward by 'vboStride' bytes to arrive
    // at the same attrib for the next vertex.

    //----------------------Attribute sizes
    this.vboFcount_a_Pos1 =  4;    // # of floats in the VBO needed to store the
    // attribute named a_Pos0. (4: x,y,z,w values)
    this.vboFcount_a_Colr1 = 3;   // # of floats for this attrib (r,g,b values)
    console.assert((this.vboFcount_a_Pos1 +     // check the size of each and
        this.vboFcount_a_Colr1) *   // every attribute in our VBO
        this.FSIZE == this.vboStride, // for agreeement with'stride'
        "Uh oh! VBObox0.vboStride disagrees with attribute-size values!");

    //----------------------Attribute offsets
    this.vboOffset_a_Pos1 = 0;    // # of bytes from START of vbo to the START
                                  // of 1st a_Pos0 attrib value in vboContents[]
    this.vboOffset_a_Colr1 = this.vboFcount_a_Pos1 * this.FSIZE;
    // (4 floats * bytes/float)
    // # of bytes from START of vbo to the START
    // of 1st a_Colr0 attrib value in vboContents[]
    //-----------------------GPU memory locations:
    this.vboLoc;									// GPU Location for Vertex Buffer Object,
    // returned by gl.createBuffer() function call
    this.shaderLoc;								// GPU Location for compiled Shader-program
    // set by compile/link of VERT_SRC and FRAG_SRC.
    //------Attribute locations in our shaders:
    this.a_PosLoc;								// GPU location for 'a_Pos0' attribute
    this.a_ColrLoc;								// GPU location for 'a_Colr0' attribute

    //---------------------- Uniform locations &values in our shaders
    this.ModelMat = new Matrix4();	// Transforms CVV axes to model axes.
    this.u_ModelMatLoc;							// GPU location for u_ModelMat uniform
}

VBObox1.prototype.init = function() {
//=============================================================================
// Prepare the GPU to use all vertices, GLSL shaders, attributes, & uniforms
// kept in this VBObox. (This function usually called only once, within main()).
// Specifically:
// a) Create, compile, link our GLSL vertex- and fragment-shaders to form an
//  executable 'program' stored and ready to use inside the GPU.
// b) create a new VBO object in GPU memory and fill it by transferring in all
//  the vertex data held in our Float32array member 'VBOcontents'.
// c) Find & save the GPU location of all our shaders' attribute-variables and
//  uniform-variables (needed by switchToMe(), adjust(), draw(), reload(), etc.)
// -------------------
// CAREFUL!  before you can draw pictures using this VBObox contents,
//  you must call this VBObox object's switchToMe() function too!
//--------------------
// a) Compile,link,upload shaders-----------------------------------------------
    this.shaderLoc = createProgram(gl, this.VERT_SRC, this.FRAG_SRC);
    if (!this.shaderLoc) {
        console.log(this.constructor.name +
            '.init() failed to create executable Shaders on the GPU. Bye!');
        return;
    }

// CUTE TRICK: let's print the NAME of this VBObox object: tells us which one!
//  else{console.log('You called: '+ this.constructor.name + '.init() fcn!');}

    gl.program = this.shaderLoc;		// (to match cuon-utils.js -- initShaders())

// b) Create VBO on GPU, fill it------------------------------------------------
    this.vboLoc = gl.createBuffer();
    if (!this.vboLoc) {
        console.log(this.constructor.name +
            '.init() failed to create VBO in GPU. Bye!');
        return;
    }
    // Specify the purpose of our newly-created VBO on the GPU.  Your choices are:
    //	== "gl.ARRAY_BUFFER" : the VBO holds vertices, each made of attributes
    // (positions, colors, normals, etc), or
    //	== "gl.ELEMENT_ARRAY_BUFFER" : the VBO holds indices only; integer values
    // that each select one vertex from a vertex array stored in another VBO.
    gl.bindBuffer(gl.ARRAY_BUFFER,	      // GLenum 'target' for this GPU buffer
        this.vboLoc);				  // the ID# the GPU uses for this buffer.

    // Fill the GPU's newly-created VBO object with the vertex data we stored in
    //  our 'vboContents' member (JavaScript Float32Array object).
    //  (Recall gl.bufferData() will evoke GPU's memory allocation & management:
    //    use gl.bufferSubData() to modify VBO contents without changing VBO size)
    gl.bufferData(gl.ARRAY_BUFFER, 			  // GLenum target(same as 'bindBuffer()')
        this.vboContents, 		// JavaScript Float32Array
        gl.STATIC_DRAW);			// Usage hint.
    //	The 'hint' helps GPU allocate its shared memory for best speed & efficiency
    //	(see OpenGL ES specification for more info).  Your choices are:
    //		--STATIC_DRAW is for vertex buffers rendered many times, but whose
    //				contents rarely or never change.
    //		--DYNAMIC_DRAW is for vertex buffers rendered many times, but whose
    //				contents may change often as our program runs.
    //		--STREAM_DRAW is for vertex buffers that are rendered a small number of
    // 			times and then discarded; for rapidly supplied & consumed VBOs.

    // c1) Find All Attributes:---------------------------------------------------
    //  Find & save the GPU location of all our shaders' attribute-variables and
    //  uniform-variables (for switchToMe(), adjust(), draw(), reload(),etc.)
    this.a_PosLoc = gl.getAttribLocation(this.shaderLoc, 'a_Pos1');
    if(this.a_PosLoc < 0) {
        console.log(this.constructor.name +
            '.init() Failed to get GPU location of attribute a_Pos1');
        return -1;	// error exit.
    }
    this.a_ColrLoc = gl.getAttribLocation(this.shaderLoc, 'a_Colr1');
    if(this.a_ColrLoc < 0) {
        console.log(this.constructor.name +
            '.init() failed to get the GPU location of attribute a_Colr1');
        return -1;	// error exit.
    }
    // c2) Find All Uniforms:-----------------------------------------------------
    //Get GPU storage location for each uniform var used in our shader programs:
    this.u_ModelMatLoc = gl.getUniformLocation(this.shaderLoc, 'u_ModelMat1');
    if (!this.u_ModelMatLoc) {
        console.log(this.constructor.name +
            '.init() failed to get GPU location for u_ModelMat1 uniform');
        return;
    }
}

VBObox1.prototype.switchToMe = function() {
//==============================================================================
// Set GPU to use this VBObox's contents (VBO, shader, attributes, uniforms...)
//
// We only do this AFTER we called the init() function, which does the one-time-
// only setup tasks to put our VBObox contents into GPU memory.  !SURPRISE!
// even then, you are STILL not ready to draw our VBObox's contents onscreen!
// We must also first complete these steps:
//  a) tell the GPU to use our VBObox's shader program (already in GPU memory),
//  b) tell the GPU to use our VBObox's VBO  (already in GPU memory),
//  c) tell the GPU to connect the shader program's attributes to that VBO.

// a) select our shader program:
    gl.useProgram(this.shaderLoc);
//		Each call to useProgram() selects a shader program from the GPU memory,
// but that's all -- it does nothing else!  Any previously used shader program's
// connections to attributes and uniforms are now invalid, and thus we must now
// establish new connections between our shader program's attributes and the VBO
// we wish to use.

// b) call bindBuffer to disconnect the GPU from its currently-bound VBO and
//  instead connect to our own already-created-&-filled VBO.  This new VBO can
//    supply values to use as attributes in our newly-selected shader program:
    gl.bindBuffer(gl.ARRAY_BUFFER,	        // GLenum 'target' for this GPU buffer
        this.vboLoc);			    // the ID# the GPU uses for our VBO.

// c) connect our newly-bound VBO to supply attribute variable values for each
// vertex to our SIMD shader program, using 'vertexAttribPointer()' function.
// this sets up data paths from VBO to our shader units:
    // 	Here's how to use the almost-identical OpenGL version of this function:
    //		http://www.opengl.org/sdk/docs/man/xhtml/glVertexAttribPointer.xml )
    gl.vertexAttribPointer(
        this.a_PosLoc,//index == ID# for the attribute var in your GLSL shader pgm;
        this.vboFcount_a_Pos1,// # of floats used by this attribute: 1,2,3 or 4?
        gl.FLOAT,			// type == what data type did we use for those numbers?
        false,				// isNormalized == are these fixed-point values that we need
        //									normalize before use? true or false
        this.vboStride,// Stride == #bytes we must skip in the VBO to move from the
        // stored attrib for this vertex to the same stored attrib
        //  for the next vertex in our VBO.  This is usually the
        // number of bytes used to store one complete vertex.  If set
        // to zero, the GPU gets attribute values sequentially from
        // VBO, starting at 'Offset'.
        // (Our vertex size in bytes: 4 floats for pos + 3 for color)
        this.vboOffset_a_Pos1);
    // Offset == how many bytes from START of buffer to the first
    // value we will actually use?  (We start with position).
    gl.vertexAttribPointer(this.a_ColrLoc, this.vboFcount_a_Colr1,
        gl.FLOAT, false,
        this.vboStride, this.vboOffset_a_Colr1);

// --Enable this assignment of each of these attributes to its' VBO source:
    gl.enableVertexAttribArray(this.a_PosLoc);
    gl.enableVertexAttribArray(this.a_ColrLoc);
}

VBObox1.prototype.isReady = function() {
//==============================================================================
// Returns 'true' if our WebGL rendering context ('gl') is ready to render using
// this objects VBO and shader program; else return false.
// see: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter

    var isOK = true;

    if(gl.getParameter(gl.CURRENT_PROGRAM) != this.shaderLoc)  {
        console.log(this.constructor.name +
            '.isReady() false: shader program at this.shaderLoc not in use!');
        isOK = false;
    }
    if(gl.getParameter(gl.ARRAY_BUFFER_BINDING) != this.vboLoc) {
        console.log(this.constructor.name +
            '.isReady() false: vbo at this.vboLoc not in use!');
        isOK = false;
    }
    return isOK;
}

VBObox1.prototype.adjust = function() {
//==============================================================================
// Update the GPU to newer, current values we now store for 'uniform' vars on
// the GPU; and (if needed) update each attribute's stride and offset in VBO.

    // check: was WebGL context set to use our VBO & shader program?
    if(this.isReady()==false) {
        console.log('ERROR! before' + this.constructor.name +
            '.adjust() call you needed to call this.switchToMe()!!');
    }
    // Adjust values for our uniforms
    // Send fresh 'uniform' values to the GPU:

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

    // ... for Phong material/reflectance:
    uLoc_Ke = gl.getUniformLocation(gl.program, 'u_MatlSet[0].emit');
    console.log('uLoc_Ke', uLoc_Ke, '\n');
    uLoc_Ka = gl.getUniformLocation(gl.program, 'u_MatlSet[0].ambi');
    uLoc_Kd = gl.getUniformLocation(gl.program, 'u_MatlSet[0].diff');
    uLoc_Ks = gl.getUniformLocation(gl.program, 'u_MatlSet[0].spec');
    uLoc_Kshiny = gl.getUniformLocation(gl.program, 'u_MatlSet[0].shiny');

    if(!uLoc_Ke || !uLoc_Ka || !uLoc_Kd // || !uLoc_Kd2
        || !uLoc_Ks || !uLoc_Kshiny
    ) {
        console.log('Failed to get GPUs Reflectance storage locations');
        return;
    }

    // TEST: can we store/retrieve these locations in our matl0 object?
    // try one:
    matl0.uLoc_Ke = gl.getUniformLocation(gl.program, 'u_MatlSet[0].emit');
    console.log('matl0.uLoc_Ke', matl0.uLoc_Ke);
    /*	uLoc_Ka = gl.getUniformLocation(gl.program, 'u_MatlSet[0].ambi');
        uLoc_Kd = gl.getUniformLocation(gl.program, 'u_MatlSet[0].diff');
        uLoc_Ks = gl.getUniformLocation(gl.program, 'u_MatlSet[0].spec');
        uLoc_Kshiny = gl.getUniformLocation(gl.program, 'u_MatlSet[0].shiny');
    */
    if(!matl0.uLoc_Ke
    //  || !matl0.uLoc_Ka || !matl0.uLoc_Kd // || !uLoc_Kd2
    //	  		    || !matl0.uLoc_Ks || !matl0.uLoc_Kshiny
    ) {
        console.log('Failed to get GPUs Reflectance NEW storage locations');
        return;
    }
    // Position the camera in world coordinates:
    eyePosWorld.set([6.0, 0.0, 0.0]);
    gl.uniform3fv(uLoc_eyePosWorld, eyePosWorld);// use it to set our uniform
    // (Note: uniform4fv() expects 4-element float32Array as its 2nd argument)

    // Init World-coord. position & colors of first light source in global vars;
    lamp0.I_pos.elements.set( [6.0, 5.0, 5.0]);
    lamp0.I_ambi.elements.set([0.4, 0.4, 0.4]);
    lamp0.I_diff.elements.set([1.0, 1.0, 1.0]);
    lamp0.I_spec.elements.set([1.0, 1.0, 1.0]);
    //TEST: console.log('lamp0.I_pos.elements: ', lamp0.I_pos.elements, '\n');

    // ( MOVED:  set the GPU's uniforms for lights and materials in draw()
    // 					function, not main(), so they ALWAYS get updated before each
    //					on-screen re-drawing)

    //---------------For the light source(s):

    gl.uniform3fv(lamp0.u_pos,  lamp0.I_pos.elements.slice(0,3));
    //		 ('slice(0,3) member func returns elements 0,1,2 (x,y,z) )
    gl.uniform3fv(lamp0.u_ambi, lamp0.I_ambi.elements);		// ambient
    gl.uniform3fv(lamp0.u_diff, lamp0.I_diff.elements);		// diffuse
    gl.uniform3fv(lamp0.u_spec, lamp0.I_spec.elements);		// Specular
//	console.log('lamp0.u_pos',lamp0.u_pos,'\n' );
//	console.log('lamp0.I_diff.elements', lamp0.I_diff.elements, '\n');

    //---------------For the materials:
// Test our new Material object:
// console.log('matl0.K_emit', matl0.K_emit.slice(0,3), '\n');
// (Why 'slice(0,4)'?
//	this takes only 1st 3 elements (r,g,b) of array, ignores 4th element (alpha))
    gl.uniform3fv(uLoc_Ke, matl0.K_emit.slice(0,3));				// Ke emissive
    gl.uniform3fv(uLoc_Ka, matl0.K_ambi.slice(0,3));				// Ka ambient
    gl.uniform3fv(uLoc_Kd, matl0.K_diff.slice(0,3));				// Kd	diffuse
    gl.uniform3fv(uLoc_Ks, matl0.K_spec.slice(0,3));				// Ks specular
    gl.uniform1i(uLoc_Kshiny, parseInt(matl0.K_shiny, 10));     // Kshiny
    //	== specular exponent; (parseInt() converts from float to base-10 integer).

    //----------------For the Matrices: find the model matrix:
    modelMatrix.setRotate(90, 0, 1, 0); // Rotate around the y-axis
    // Calculate the view projection matrix
    mvpMatrix.setPerspective(30, canvas.width/canvas.height, 1, 100);
    mvpMatrix.lookAt(	eyePosWorld[0], eyePosWorld[1], eyePosWorld[2], // eye pos
        0,  0, 0, 				// aim-point (in world coords)
        0,  0, 1);				// up (in world coords)
    mvpMatrix.multiply(modelMatrix);
    // Calculate the matrix to transform the normal based on the model matrix
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();

    // Send the new matrix values to their locations in the GPU:
    gl.uniformMatrix4fv(uLoc_ModelMatrix, false, modelMatrix.elements);
    gl.uniformMatrix4fv(uLoc_MvpMatrix, false, mvpMatrix.elements);
    gl.uniformMatrix4fv(uLoc_NormalMatrix, false, normalMatrix.elements);

    // Clear color and depth buffer
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

// Draw the shape(s) in our VBO
}

VBObox1.prototype.draw = function() {
//=============================================================================
// Render current VBObox contents.

    this.adjust();
    // check: was WebGL context set to use our VBO & shader program?
    if(this.isReady()==false) {
        console.log('ERROR! before' + this.constructor.name +
            '.draw() call you needed to call this.switchToMe()!!');
    }
    // ----------------------------Draw the contents of the currently-bound VBO:
    gl.drawArrays(gl.TRIANGLES, 	    // select the drawing primitive to draw,
        // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP,
        //          gl.TRIANGLES, gl.TRIANGLE_STRIP, ...
        0, 								// location of 1st vertex to draw;
        this.vboVerts);		// number of vertices to draw on-screen.
}

VBObox1.prototype.reload = function() {
//=============================================================================
// Over-write current values in the GPU inside our already-created VBO: use
// gl.bufferSubData() call to re-transfer some or all of our Float32Array
// contents to our VBO without changing any GPU memory allocations.

    gl.bufferSubData(gl.ARRAY_BUFFER, 	// GLenum target(same as 'bindBuffer()')
        0,                  // byte offset to where data replacement
        // begins in the VBO.
        this.vboContents);   // the JS source-data array used to fill VBO

}