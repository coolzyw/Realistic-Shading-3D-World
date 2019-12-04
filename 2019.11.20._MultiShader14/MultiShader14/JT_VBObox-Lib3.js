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
        'attribute vec4 a_Position;\n' +
        'attribute vec4 a_Color;\n' +
        'attribute vec4 a_Normal;\n' +
        'uniform mat4 u_mvpMatrix;\n' +
        'uniform mat4 u_normalMatrix;\n' +
        'uniform vec3 u_LightDir;\n' +
        'varying vec4 v_Color;\n' +
        'varying float v_Dot;\n' +
        'void main() {\n' +
        '  gl_Position = u_mvpMatrix * a_Position;\n' +
        '  v_Color = a_Color;\n' +
        '  vec4 normal = u_normalMatrix * a_Normal;\n' +
        '  v_Dot = max(dot(normalize(normal.xyz), u_LightDir), 0.0);\n' +
        '}\n';

    this.FRAG_SRC = //---------------------- FRAGMENT SHADER source code
        'precision mediump float;\n' +
        'varying vec4 v_Color;\n' +
        'varying float v_Dot;\n' +
        'void main() {\n' +
        '  gl_FragColor = vec4(v_Color.xyz * v_Dot, v_Color.a);\n' +
        '}\n';

    // this.vboContents = //---------------------------------------------------------
    // new Float32Array ([						// Array of vertex attribute values we will
    //  															// transfer to GPU's vertex buffer object (VBO)
    // // 1st triangle:
    //  	 0.0,	 0.5,	0.0, 1.0,		1.0, 0.0, 0.0, //1 vertex:pos x,y,z,w; color: r,g,b
    //    -0.5, -0.5, 0.0, 1.0,		0.0, 1.0, 0.0,
    //     0.5, -0.5, 0.0, 1.0,		0.0, 0.0, 1.0,
    // // 2nd triangle:
    // 	 0.0,  0.0, 0.0, 1.0,   1.0, 1.0, 1.0,		// (white)
    // 	 0.3,  0.0, 0.0, 1.0,   0.0, 0.0, 1.0,		// (blue)
    // 	 0.0,  0.3, 0.0, 1.0,   0.5, 0.5, 0.5,		// (gray)
    // 	 ]);

    // var vertices = new Float32Array([
    //     1.0, 1.0, 1.0,  -1.0, 1.0, 1.0,  -1.0,-1.0, 1.0,   1.0,-1.0, 1.0,  1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,  0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,// v0-v1-v2-v3 front
    //     1.0, 1.0, 1.0,   1.0,-1.0, 1.0,   1.0,-1.0,-1.0,   1.0, 1.0,-1.0,  1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,  1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,// v0-v3-v4-v5 right
    //     1.0, 1.0, 1.0,   1.0, 1.0,-1.0,  -1.0, 1.0,-1.0,  -1.0, 1.0, 1.0, 1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0, // v0-v5-v6-v1 up
    //     -1.0, 1.0, 1.0,  -1.0, 1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0,-1.0, 1.0,  1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0, -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0, // v1-v6-v7-v2 left
    //     -1.0,-1.0,-1.0,   1.0,-1.0,-1.0,   1.0,-1.0, 1.0,  -1.0,-1.0, 1.0,  1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,  0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,// v7-v4-v3-v2 down
    //     1.0,-1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0, 1.0,-1.0,   1.0, 1.0,-1.0 , 1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,  0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0 // v4-v7-v6-v5 back
    // ]);

    var vertices = new Float32Array([
        1.0, 1.0, 1.0,  -1.0, 1.0, 1.0,  -1.0,-1.0, 1.0,   1.0,-1.0, 1.0, // v0-v1-v2-v3 front
        1.0, 1.0, 1.0,   1.0,-1.0, 1.0,   1.0,-1.0,-1.0,   1.0, 1.0,-1.0, // v0-v3-v4-v5 right
        1.0, 1.0, 1.0,   1.0, 1.0,-1.0,  -1.0, 1.0,-1.0,  -1.0, 1.0, 1.0, // v0-v5-v6-v1 up
        -1.0, 1.0, 1.0,  -1.0, 1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0,-1.0, 1.0, // v1-v6-v7-v2 left
        -1.0,-1.0,-1.0,   1.0,-1.0,-1.0,   1.0,-1.0, 1.0,  -1.0,-1.0, 1.0, // v7-v4-v3-v2 down
        1.0,-1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0, 1.0,-1.0,   1.0, 1.0,-1.0  // v4-v7-v6-v5 back
    ]);

    var positions = new Float32Array([
        1.0, 1.0, 1.0,
        -1.0, 1.0, 1.0,
        -1.0,-1.0, 1.0,
        1.0,-1.0, 1.0,
        1.0,-1.0,-1.0,
        1.0, 1.0,-1.0,
        -1.0, 1.0,-1.0,
        -1.0,-1.0,-1.0,
    ]);

    // Colors
    var colors = new Float32Array([
        1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v0-v1-v2-v3 front
        1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v0-v3-v4-v5 right
        1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v0-v5-v6-v1 up
        1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v1-v6-v7-v2 left
        1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v7-v4-v3-v2 down
        1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0　    // v4-v7-v6-v5 back
    ]);

    // Normal
    var normals = new Float32Array([
        0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,  // v0-v1-v2-v3 front
        1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  // v0-v3-v4-v5 right
        0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  // v0-v5-v6-v1 up
        -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  // v1-v6-v7-v2 left
        0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,  // v7-v4-v3-v2 down
        0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0   // v4-v7-v6-v5 back
    ]);

    // Indices of the vertices
    var indices = new Uint8Array([
        0, 1, 2,   0, 2, 3,    // front
        4, 5, 6,   4, 6, 7,    // right
        8, 9,10,   8,10,11,    // up
        12,13,14,  12,14,15,    // left
        16,17,18,  16,18,19,    // down
        20,21,22,  20,22,23     // back
    ]);


    this.vboContents = new Float32Array(6 * 12 + 6 * 12 + 6*12);
    var cnt = 0;
    for (var i = 0; i < indices.length; i++) {
        for (var j = 0; j < 3; j++) {
            this.vboContents[cnt++] = vertices[i * 3 + j];
            this.vboContents[cnt++] = colors[i * 3 + j];
            this.vboContents[cnt++] = normals[i * 3 + j];
        }
    }

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
    this.vboFcount_a_Pos0 =  3;    // # of floats in the VBO needed to store the
    // attribute named a_Pos0. (4: x,y,z,w values)
    this.vboFcount_a_Colr0 = 3;   // # of floats for this attrib (r,g,b values)
    this.vboFcount_a_Nor0 = 3;
    // console.assert((this.vboFcount_a_Pos0 +     // check the size of each and
    //     this.vboFcount_a_Colr0 + this.vboFcount_a_Nor0) *   // every attribute in our VBO
    //     this.FSIZE == this.vboStride, // for agreeement with'stride'
    //     "Uh oh! VBObox0.vboStride disagrees with attribute-size values!");

    //----------------------Attribute offsets
    this.vboOffset_a_Pos0 = 0;    // # of bytes from START of vbo to the START
                                  // of 1st a_Pos0 attrib value in vboContents[]
    this.vboOffset_a_Colr0 = this.vboFcount_a_Pos0 * this.FSIZE;
    this.vboOffset_a_Nor0 = this.vboFcount_a_Pos0 * this.FSIZE + this.vboOffset_a_Colr0 * this.FSIZE;
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
    this.a_NorLoc;

    //---------------------- Uniform locations &values in our shaders
    this.ModelMat = new Matrix4();	// Transforms CVV axes to model axes.
    this.viewMatrix = new Matrix4();   // View matrix
    this.mvpMatrix = new Matrix4();    // Model view projection matrix
    this.normalMatrix = new Matrix4(); // Transformation matrix for normals
    this.u_MvpMatLoc;							// GPU location for u_ModelMat uniform
    this.u_NorMatLoc;
    this.u_LightMatLoc;

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
    this.a_PosLoc = gl.getAttribLocation(this.shaderLoc, 'a_Position');
    if(this.a_PosLoc < 0) {
        console.log(this.constructor.name +
            '.init() Failed to get GPU location of attribute a_Position');
        return -1;	// error exit.
    }
    this.a_ColrLoc = gl.getAttribLocation(this.shaderLoc, 'a_Color');
    if(this.a_ColrLoc < 0) {
        console.log(this.constructor.name +
            '.init() failed to get the GPU location of attribute a_Color');
        return -1;	// error exit.
    }
    this.a_NorLoc = gl.getAttribLocation(this.shaderLoc, 'a_Normal');
    if(this.a_ColrLoc < 0) {
        console.log(this.constructor.name +
            '.init() failed to get the GPU location of attribute a_Normal');
        return -1;	// error exit.
    }
    // c2) Find All Uniforms:-----------------------------------------------------
    //Get GPU storage location for each uniform var used in our shader programs:
    this.u_MvpMatLoc = gl.getUniformLocation(this.shaderLoc, 'u_mvpMatrix');
    if (!this.u_MvpMatLoc) {
        console.log(this.constructor.name +
            '.init() failed to get GPU location for u_ModelMat1 uniform');
        return;
    }

    this.u_NorMatLoc = gl.getUniformLocation(this.shaderLoc, 'u_normalMatrix');
    if (!this.u_NorMatLoc) {
        console.log(this.constructor.name +
            '.init() failed to get GPU location for u_ModelMat1 uniform');
        return;
    }

    this.u_LightMatLoc = gl.getUniformLocation(this.shaderLoc, 'u_LightDir');
    if (!this.u_NorMatLoc) {
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
        this.vboFcount_a_Pos0,// # of floats used by this attribute: 1,2,3 or 4?
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
        this.vboOffset_a_Pos0);
    // Offset == how many bytes from START of buffer to the first
    // value we will actually use?  (We start with position).
    gl.vertexAttribPointer(this.a_ColrLoc, this.vboFcount_a_Colr0,
        gl.FLOAT, false,
        this.vboStride, this.vboOffset_a_Colr0);

    gl.vertexAttribPointer(this.a_NorLoc, this.vboFcount_a_Nor0,
        gl.FLOAT, false,
        this.vboStride, this.vboOffset_a_Nor0);

// --Enable this assignment of each of these attributes to its' VBO source:
    gl.enableVertexAttribArray(this.a_PosLoc);
    gl.enableVertexAttribArray(this.a_ColrLoc);
    gl.enableVertexAttribArray(this.a_NorLoc);
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
    // Set the viewing volume


    // Calculate the view matrix
    this.viewMatrix.setLookAt(0, 3, 10, 0, 0, 0, 0, 1, 0);
    this.ModelMat.set(this.viewMatrix).rotate(60, 0, 1, 0); // Rotate 60 degree around the y-axis
    // Calculate the model view projection matrix
    this.ModelMat.translate(0.35, -1, 2);
    this.mvpMatrix.setPerspective(30, 1, 1, 1000);
    this.mvpMatrix.multiply(this.ModelMat);
    // Calculate the matrix to transform the normal based on the model matrix
    this.normalMatrix.setInverseOf(this.ModelMat);
    this.normalMatrix.transpose();


    // Pass the model view matrix to u_mvpMatrix
    gl.uniformMatrix4fv(this.u_MvpMatLoc, false, this.mvpMatrix.elements);

    // Pass the normal matrixu_normalMatrix
    gl.uniformMatrix4fv(this.u_NorMatLoc, false, this.normalMatrix.elements);

    // Pass the direction of the diffuse light(world coordinate, normalized)
    var lightDir = new Vector3([1.0, 1.0, 1.0]);
    lightDir.normalize();     // Normalize
    var lightDir_eye = this.viewMatrix.multiplyVector3(lightDir); // Transform to view coordinate
    lightDir_eye.normalize(); // Normalize
    gl.uniform3fv(this.u_LightMatLoc, lightDir_eye.elements);


    // this.ModelMat.setIdentity();
    // this.ModelMat.perspective(30, 1,1,1000);
    // this.ModelMat.lookAt(5, 5, 3, 2, 2, 2, 0, 0, 1);
    // // this.ModelMat.scale(10, 10, 10);
    // // pushMatrix(this.ModelMat);
    // // this.ModelMat.setRotate(0, 0, 0, 1);	  // rotate drawing axes,
    // this.ModelMat.translate(0.35, 0, 1);							// then translate them.
    // //  Transfer new uniforms' values to the GPU:-------------
    // // Send  new 'ModelMat' values to the GPU's 'u_ModelMat1' uniform:
    // gl.uniformMatrix4fv(this.u_MvpMatLoc,	// GPU location of the uniform
    //     false, 				// use matrix transpose instead?
    //     this.ModelMat.elements);	// send data from Javascript.
    // // gl.uniformMatrix4fv(this.u_LightMatLoc,	// GPU location of the uniform
    // //     false, 				// use matrix transpose instead?
    // //     this.ModelMat.elements);	// send data from Javascript.
    // gl.uniformMatrix4fv(this.u_NorMatLoc,	// GPU location of the uniform
    //     false, 				// use matrix transpose instead?
    //     this.ModelMat.elements);	// send data from Javascript.
    // // Adjust the attributes' stride and offset (if necessary)
    // // (use gl.vertexAttribPointer() calls and gl.enableVertexAttribArray() calls)
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
    console.log("inside draw function");
    // ----------------------------Draw the contents of the currently-bound VBO:
    gl.drawArrays(gl.TRIANGLES, 	    // select the drawing primitive to draw,
        // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP,
        //          gl.TRIANGLES, gl.TRIANGLE_STRIP, ...
        0, 								// location of 1st vertex to draw;
        34);		// number of vertices to draw on-screen.
    // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Draw the cube
    // gl.drawElements(gl.TRIANGLES, this.vboContents, gl.UNSIGNED_BYTE, 0);
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