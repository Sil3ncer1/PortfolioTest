import * as THREE from "three"
import { GreaterEqualDepth, Vector2 } from "three"

import { MapControls, OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'

import grassUrl from "./assets/models/grass.fbx"
import triangleUrl from "./assets/models/triangle.fbx"
import blenderUrl from "./assets/models/blender.fbx"
import pillerUrl from "./assets/models/piller.fbx"

import { Grass } from "./grass"

import RenderPixelatedPass from "./RenderPixelatedPass"
import PixelatePass from "./PixelatePass"

import { stopGoEased } from "./math"

import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass'

let camera: THREE.Camera, scene: THREE.Scene, renderer: THREE.WebGLRenderer, composer: EffectComposer;
let controls: OrbitControls;
let logo: THREE.Mesh, plane: THREE.Object3D, mesh: THREE.Mesh;
let grassPlane: Grass;

let pointlightOutline: THREE.PointLight, pointLightBlender: THREE.PointLight;
let selectedObjects: THREE.Object3D[] = [];
let outlinePass: OutlinePass;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

init()
setTimeout( function() { animate(); }, 100 );


function init() {

    let screenResolution = new Vector2( window.innerWidth, window.innerHeight);
    let renderResolution = screenResolution.clone().divideScalar(4);
    renderResolution.x |= 0;
    renderResolution.y |= 0;
    let aspectRatio = screenResolution.x / screenResolution.y;

    camera = new THREE.OrthographicCamera( -aspectRatio, aspectRatio, 1, -1, 0.1, 10 );
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0x151729 );
    // scene.background = new THREE.Color( 0xffffff );

    // Renderer
    renderer = new THREE.WebGLRenderer({antialias:false});
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .75;
    renderer.shadowMap.enabled = true;
    renderer.setSize(screenResolution.x, screenResolution.y);
    document.body.appendChild(renderer.domElement);

    composer = new EffectComposer(renderer);
    
    // composer.addPass( new RenderPass( scene, camera ) )
    composer.addPass( new RenderPixelatedPass(renderResolution, scene, camera ));

    outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
	outlinePass.edgeStrength = 10;
    outlinePass.edgeGlow = 1;
    outlinePass.pulsePeriod = 5;
    outlinePass.visibleEdgeColor = new THREE.Color(0xaaaaaa)
    composer.addPass(outlinePass );

    let bloomPass = new UnrealBloomPass( screenResolution, .4, .1, .9 );
    composer.addPass(bloomPass);
    composer.addPass(new PixelatePass(renderResolution));
    
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0 );
    camera.position.z = 4;
    camera.position.y = 6 * Math.tan(Math.PI / 6 );
    controls.update();
     controls.minPolarAngle = controls.maxPolarAngle = controls.getPolarAngle()


    renderer.domElement.style.touchAction = 'none';
	renderer.domElement.addEventListener('pointermove', onPointerMove );


    // Geometry

    let GrassMaterial = new THREE.MeshPhongMaterial({
        side: THREE.FrontSide,
        color: 0x228822,
        specular:0,
        reflectivity : 0,
        shininess :0
         // Render both sides of the plane
    });

    // Grass Plane
    {
        const fbxLoader = new FBXLoader()
        fbxLoader.load(grassUrl, obj => {
            obj.traverse(child => {
                // @ts-ignore
                if (child instanceof THREE.Mesh ) {
                    child.castShadow = true
                    child.receiveShadow = true
                    child.material = GrassMaterial;
                    mesh = child;
                }
            } )
        } )
    }

    {
        const fbxLoader = new FBXLoader()
        fbxLoader.load(blenderUrl, obj => {
            obj.traverse(child => {
                // @ts-ignore
                if ( child instanceof THREE.Mesh ) {
                    child.castShadow = true
                    child.receiveShadow = true
                    logo = child;

                }
            } )
            scene.add(obj);
        } )
    }
    
    
    {
        const fbxLoader = new FBXLoader()
        fbxLoader.load( pillerUrl, obj => {
            obj.traverse( child => {
                // @ts-ignore
                if ( child instanceof THREE.Mesh ) {
                    child.castShadow = true
                    child.receiveShadow = true
                }
            } )
            obj.position.y =+ 0.1;
            scene.add(obj);
        } )
    }

    {
        
        const fbxLoader = new FBXLoader()
        fbxLoader.load( triangleUrl, obj => {
            obj.traverse( child => {
                // @ts-ignore
                if ( child instanceof THREE.Mesh ) {

                    child.castShadow = true
                    child.receiveShadow = true
                    child.updateMatrix()
                    grassPlane = new Grass(25000,mesh,child);

                    scene.add(grassPlane);
                }
            } )
        } )
    }


    // Lights


    scene.add( new THREE.AmbientLight( 0x2d3645, 0.1 ) )
    
    let directionalLight = new THREE.DirectionalLight( 0x4444aa, 0.7 )
    directionalLight.position.set( 100, 100, 100 )
    directionalLight.castShadow = true
    // directionalLight.shadow.radius = 0
    directionalLight.shadow.mapSize.set( 2048, 2048 )
    scene.add( directionalLight )

    pointlightOutline = new THREE.PointLight(0xffffff,0);
    pointlightOutline.distance =0.8;
    scene.add(pointlightOutline);

    pointLightBlender = new THREE.PointLight(0xffaa00,0.2);
    pointLightBlender.distance = 1;
    scene.add(pointLightBlender);

}

function onPointerMove( event ) {

    if ( event.isPrimary === false ) return;

    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    checkIntersection();

}

function addSelectedObject( object ) {

    selectedObjects = [];
    selectedObjects.push( object );

}

function checkIntersection() {

    raycaster.setFromCamera( mouse, camera );

    const intersects = raycaster.intersectObject( logo, true );
    if ( intersects.length > 0 ) {

        const selectedObject = intersects[ 0 ].object;
        addSelectedObject( selectedObject );
        outlinePass.selectedObjects = selectedObjects;
        if(pointlightOutline.intensity == 0){ 
            
            pointlightOutline.intensity = 1;
            pointlightOutline.position.copy(logo.position); 
        }

    } else {
        if(pointlightOutline.intensity  == 1)
            pointlightOutline.intensity = 0;
        
        
        outlinePass.selectedObjects = [];

    }

}



function animate() {
    requestAnimationFrame( animate )
    let t = performance.now() / 1000

    

    grassPlane.resampleParticle(camera)

    let mat = ( logo.material as THREE.MeshPhongMaterial )
    mat.emissiveIntensity = Math.sin( t * 3 ) * .5 + .5
    logo.position.y = .7 + Math.sin( t * 2 ) * .05
    logo.rotation.y = stopGoEased( t, 2, 4 ) * 2 * Math.PI

    pointLightBlender.position.copy(logo.position)
    pointLightBlender.intensity = .3 + Math.sin( t * 2 ) * -.05

    composer.render()
}