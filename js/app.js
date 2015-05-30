var container, scene, camera, renderer, controls, stats;

var CAMERA_HORIZON = 25000;
var minCameraFov = 15, maxCameraFov = 75;

var useRift = false;
var riftCam;
var oculusBridge;

initScene();
animate();

function initScene(){

    var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;

    $container = $('#viewContainer');

    $('#toggle-render').click(function() {
        console.log(oculusBridge);
        useRift = !useRift;
        if(!useRift&&typeof oculusBridge !== 'undefined'){
            //TODO luba hiire liikumine uuesti
            oculusBridge.disconnect();
        }else{
            //TODO tee midagi hiire liikumisega
            initOculus();
        }
        onResize();
    });

	camera = new THREE.PerspectiveCamera(maxCameraFov, SCREEN_WIDTH/SCREEN_HEIGHT, 0.1, CAMERA_HORIZON);

	scene = new THREE.Scene();
	scene.add(camera);

	camera.position.set(0,0,10);
	camera.lookAt(scene.position);

	if (Detector.webgl)
		renderer = new THREE.WebGLRenderer( {antialias:true} );
	else
		renderer = new THREE.CanvasRenderer();

	renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);

	$container.append( renderer.domElement );

	THREEx.WindowResize(renderer, camera);

	controls = new THREE.OrbitControls( camera, renderer.domElement );

    //FPS info
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.bottom = '0px';
	stats.domElement.style.zIndex = 100;
	$container.append( stats.domElement );
	
	// axes
	//var axes = new THREE.AxisHelper(100);
	//scene.add( axes );

	//Pictures
	var panoramaBox = new THREE.BoxGeometry(128, 128, 128, 16, 16, 16);
	
	var panoramArray = [];
	for (var i = 0; i < 6; i++){
	    var timestamp = new Date().getTime();
        var image = new Image();
        image.src = panoramasArray[i];
        var $image = $(image);
        $image.attr('id', 'image-' + i + timestamp);
        $image.data('timestamp', timestamp);
        $image.addClass('panorama-image');

        $image.hide();
        $('body').append($image);
        var texture = new THREE.Texture($image);
        texture.image = $('#' + $image.attr('id'))[0];
        texture.needsUpdate = true;

        panoramArray.push( new THREE.MeshBasicMaterial({
			map: texture,
			side: THREE.BackSide
		}));
	}

	var material = new THREE.MeshFaceMaterial(panoramArray);
	var panoramaMesh = new THREE.Mesh(panoramaBox, material);
	scene.add(panoramaMesh);
}

function initOculus(){
    oculusBridge = new OculusBridge({
        "debug" : true,
        "onOrientationUpdate" : bridgeOrientationUpdated,
        "onConfigUpdate"      : bridgeConfigUpdated,
        "onConnect"           : bridgeConnected,
        "onDisconnect"        : bridgeDisconnected
    });
    oculusBridge.connect();

    riftCam = new THREE.OculusRiftEffect(renderer);
}

function animate(){
	if(render()){
	    requestAnimationFrame(animate);
	}
	update();
}

function update(){
	controls.update();
	stats.update();
}

function render(){
    try{
        if(useRift){
          riftCam.render(scene, camera);
        }else{
          renderer.render(scene, camera);
        }
      } catch(e){
        console.log(e);
        if(e.name == "SecurityError"){
          crashSecurity(e);
        } else {
          crashOther(e);
        }
        return false;
      }
    return true;
}

function onResize() {
  if(!useRift){
    windowHalf = new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2);
    aspectRatio = window.innerWidth / window.innerHeight;

    camera.aspect = aspectRatio;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
  } else {
    riftCam.setSize(window.innerWidth, window.innerHeight);
  }
}

function bridgeConnected(){
  console.log("Bridge connected.");
}

function bridgeDisconnected(){
  console.log("Bridge disconnected.");
}

function bridgeConfigUpdated(config){
  console.log("Oculus config updated.");
  riftCam.setHMD(config);
}

function bridgeOrientationUpdated(quatValues) {

  // Do first-person style controls (like the Tuscany demo) using the rift and keyboard.

  // TODO: Don't instantiate new objects in here, these should be re-used to avoid garbage collection.

  // make a quaternion for the the body angle rotated about the Y axis.
  var quat = new THREE.Quaternion();
  quat.setFromAxisAngle(bodyAxis, bodyAngle);

  // make a quaternion for the current orientation of the Rift
  var quatCam = new THREE.Quaternion(quatValues.x, quatValues.y, quatValues.z, quatValues.w);

  // multiply the body rotation by the Rift rotation.
  quat.multiply(quatCam);

  // Make a vector pointing along the Z axis and rotate it accoring to the combined look/body angle.
  var xzVector = new THREE.Vector3(0, 0, 1);
  xzVector.applyQuaternion(quat);

  // Compute the X/Z angle based on the combined look/body angle.  This will be used for FPS style movement controls
  // so you can steer with a combination of the keyboard and by moving your head.
  viewAngle = Math.atan2(xzVector.z, xzVector.x) + Math.PI;

  // Apply the combined look/body angle to the camera.
  camera.quaternion.copy(quat);
}

function crashSecurity(e){
  oculusBridge.disconnect();
  alert("Security error");
}

function crashOther(e){
  oculusBridge.disconnect();
  alert("Error " + e.message);
}

$(window).keypress(function(e) {
  if (e.keyCode == 0 || e.keyCode == 32) {
    console.log('Space pressed');
    if($('#toggle-render').is(":visible")){
        $('#toggle-render').hide();
        $(stats.domElement).hide();
    }else{
        $('#toggle-render').show();
        $(stats.domElement).show();
    }
  }
});