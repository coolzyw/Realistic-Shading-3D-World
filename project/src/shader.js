var VSHADER_SOURCE2 =
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

    'struct LampT {\n' +		// Describes one point-like Phong light source
    '		vec3 pos;\n' +			// (x,y,z,w); w==1.0 for local light at x,y,z position
    //		   w==0.0 for distant light from x,y,z direction
    ' 	vec3 ambi;\n' +			// Ia ==  ambient light source strength (r,g,b)
    ' 	vec3 diff;\n' +			// Id ==  diffuse light source strength (r,g,b)
    '		vec3 spec;\n' +			// Is == specular light source strength (r,g,b)
    '}; \n' +


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
    'uniform LampT u_LampSet[2];\n' +		// Array of all light sources.
    'uniform vec3 u_eyePosWorld; \n' + 	// Camera/eye location in world coords.
    'uniform int is_Blinn;\n' +

    //-------------VARYING:Vertex Shader values sent per-pixel to Fragment shader:
    'varying vec3 v_Kd; \n' +							// Phong Lighting: diffuse reflectance
    // (I didn't make per-pixel Ke,Ka,Ks;
    // we use 'uniform' values instead)
    'varying vec4 v_Position; \n' +
    'varying vec3 v_Normal; \n' +					// Why Vec3? its not a point, hence w==0
    'varying vec4 v_Color; \n' +
    //-----------------------------------------------------------------------------


    'void main() { \n' +
    // Compute CVV coordinate values from our given vertex. This 'built-in'
    // 'varying' value gets interpolated to set screen position for each pixel.
    '  v_Color = vec4(a_Color, 1.0); \n' +
    '  gl_Position = u_MvpMatrix * a_Position;\n' +
    // Calculate the vertex position & normal vec in the WORLD coordinate system
    // for use as a 'varying' variable: fragment shaders get per-pixel values
    // (interpolated between vertices for our drawing primitive (TRIANGLE)).
    '  v_Position = u_ModelMatrix * a_Position; \n' +
    // 3D surface normal of our vertex, in world coords.  ('varying'--its value
    // gets interpolated (in world coords) for each pixel's fragment shader.
    '  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
    '	 v_Kd = u_MatlSet[0].diff; \n' +		// find per-pixel diffuse reflectance from per-vertex

    '  vec3 normal = normalize(v_Normal); \n' +
    //	'  vec3 normal = v_Normal; \n' +
    // Find the unit-length light dir vector 'L' (surface pt --> light):
    '  vec3 lightDirection = normalize(u_LampSet[0].pos - v_Position.xyz);\n' +
    '  vec3 lightDirection2 = normalize(u_LampSet[1].pos - v_Position.xyz);\n' +
    // Find the unit-length eye-direction vector 'V' (surface pt --> camera)
    '  vec3 eyeDirection = normalize(u_eyePosWorld - v_Position.xyz); \n' +
    // The dot product of (unit-length) light direction and the normal vector
    // (use max() to discard any negatives from lights below the surface)
    // (look in GLSL manual: what other functions would help?)
    // gives us the cosine-falloff factor needed for the diffuse lighting term:
    '  float nDotL = max(dot(lightDirection, normal), 0.0); \n' +
    '  float nDotL2 = max(dot(lightDirection2, normal), 0.0); \n' +
    // The Blinn-Phong lighting model computes the specular term faster
    // because it replaces the (V*R)^shiny weighting with (H*N)^shiny,
    // where 'halfway' vector H has a direction half-way between L and V
    // H = norm(norm(V) + norm(L)).  Note L & V already normalized above.
    // (see http://en.wikipedia.org/wiki/Blinn-Phong_shading_model)
    '  vec3 H = normalize(lightDirection + eyeDirection); \n' +
    '  vec3 H2 = normalize(lightDirection2 + eyeDirection); \n' +
    '  float nDotH = max(dot(H, normal), 0.0); \n' +
    '  float nDotH2 = max(dot(H2, normal), 0.0); \n' +
    'vec3 R = reflect(-lightDirection, normal);\n' +
    'vec3 R2 = reflect(-lightDirection2, normal);\n' +
    'float vDotR = max(dot(eyeDirection, R), 0.0);\n' +
    'float vDotR2 = max(dot(eyeDirection, R2), 0.0);\n' +
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

    'vec3 head_emissive;\n' +
    'vec3 head_ambient;\n' +
    'vec3 head_diffuse;\n' +
    'vec3 head_speculr;\n' +
    'float head_e64;\n' +


    'e64 = pow(nDotH, float(u_MatlSet[0].shiny));\n' +
    'head_e64 = pow(nDotH2, float(u_MatlSet[0].shiny));\n' +
    // Calculate the final color from diffuse reflection and ambient reflection
    //  '	 vec3 emissive = u_Ke;' +
    'emissive = 										u_MatlSet[0].emit;\n' +
    'ambient = u_LampSet[0].ambi * u_MatlSet[0].ambi;\n' +
    'diffuse = u_LampSet[0].diff * v_Kd * nDotL;\n' +
    'speculr = u_LampSet[0].spec * u_MatlSet[0].spec * e64;\n' +


    'head_emissive = 										u_MatlSet[0].emit;\n' +
    'head_ambient = u_LampSet[1].ambi * u_MatlSet[0].ambi;\n' +
    'head_diffuse = u_LampSet[1].diff * v_Kd * nDotL2;\n' +
    'head_speculr = u_LampSet[1].spec * u_MatlSet[0].spec * head_e64;\n' +


    'if (is_Blinn == 0) {\n' +
    '   e64 = pow(vDotR, float(u_MatlSet[0].shiny));\n' +
    '   speculr = u_LampSet[0].spec * u_MatlSet[0].spec * e64;\n' +
    '   head_e64 = pow(vDotR2, float(u_MatlSet[0].shiny));\n' +
    '   head_speculr = u_LampSet[1].spec * u_MatlSet[0].spec * head_e64;\n' +
    '}\n' +

    'vec4 frag_world = vec4(emissive + ambient + diffuse + speculr, 1.0);\n' +
    'vec4 frag_head = vec4(head_emissive + head_ambient + head_diffuse + head_speculr, 1.0);\n' +

    '  v_Color = frag_world + frag_head;\n' +

    '}\n';

// Fragment shader program----------------------------------
var FSHADER_SOURCE2 =
    //-------------Set precision.
    // GLSL-ES 2.0 defaults (from spec; '4.5.3 Default Precision Qualifiers'):
    // DEFAULT for Vertex Shaders: 	precision highp float; precision highp int;
    //									precision lowp sampler2D; precision lowp samplerCube;
    // DEFAULT for Fragment Shaders:  UNDEFINED for float; precision mediump int;
    //									precision lowp sampler2D;	precision lowp samplerCube;
    // MATCH the Vertex shader precision for float and int:
    '#ifdef GL_ES\n' +
    'precision highp float;\n' +
    'precision highp int;\n' +
    '#endif\n' +
    'varying vec4 v_Color;\n' +

    'void main() { \n' +
    '   gl_FragColor = v_Color;\n' +
    '}\n';
