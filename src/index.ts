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



let pointlight = new THREE.PointLight(0x0000FF,2);
let camera: THREE.Camera, scene: THREE.Scene, renderer: THREE.WebGLRenderer, composer: EffectComposer
let controls: OrbitControls
let crystalMesh: THREE.Mesh, plane: THREE.Object3D, mesh: THREE.Mesh
let grassPlane: Grass

init()
setTimeout( function() { animate(); }, 100 );
function init() {

    let screenResolution = new Vector2( window.innerWidth, window.innerHeight )
    let renderResolution = screenResolution.clone().divideScalar( 6 )
    renderResolution.x |= 0
    renderResolution.y |= 0
    let aspectRatio = screenResolution.x / screenResolution.y

    camera = new THREE.OrthographicCamera( -aspectRatio, aspectRatio, 1, -1, 0.1, 10 )
    scene = new THREE.Scene()
    scene.background = new THREE.Color( 0x151729 )
    // scene.background = new THREE.Color( 0xffffff )

    // Renderer
    renderer = new THREE.WebGLRenderer( { antialias: false } )
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = .75
    renderer.shadowMap.enabled = true
    renderer.setSize( screenResolution.x, screenResolution.y )
    document.body.appendChild( renderer.domElement )

    composer = new EffectComposer( renderer )
    // composer.addPass( new RenderPass( scene, camera ) )
    composer.addPass( new RenderPixelatedPass( renderResolution, scene, camera ) )
    let bloomPass = new UnrealBloomPass( screenResolution, .4, .1, .9 )
    composer.addPass( bloomPass )
    composer.addPass( new PixelatePass( renderResolution ) )

    controls = new OrbitControls( camera, renderer.domElement )
    controls.target.set( 0, 0, 0 )
    camera.position.z = 4
    camera.position.y = 6 * Math.tan( Math.PI / 6 )
    controls.update()
    // controls.minPolarAngle = controls.maxPolarAngle = controls.getPolarAngle()


    // Geometry

    let GrassMaterial = new THREE.MeshPhongMaterial({
        side: THREE.FrontSide,
        color: 0x228822,
        specular:0,
        reflectivity : 0,
        shininess :0
                
        
         // Render both sides of the plane
    });

    {
        const fbxLoader = new FBXLoader()
        fbxLoader.load( grassUrl, obj => {
            obj.traverse( child => {
                // @ts-ignore
                if ( child instanceof THREE.Mesh ) {
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
        fbxLoader.load( blenderUrl, obj => {
            obj.traverse( child => {
                // @ts-ignore
                if ( child instanceof THREE.Mesh ) {
                    child.castShadow = true
                    child.receiveShadow = true
                    crystalMesh = child;

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
                    grassPlane = new Grass(15000,mesh,child);

                    scene.add(grassPlane);
                }
            } )
        } )
    }


    // Lights
    scene.add( new THREE.AmbientLight( 0x2d3645, 0.5 ) )
    {
        let directionalLight = new THREE.DirectionalLight( 0x506886, .1 )
        directionalLight.position.set( 100, 100, 100 )
        directionalLight.castShadow = true
        directionalLight.shadow.radius = 0
        directionalLight.shadow.mapSize.set( 2048, 2048 )
        scene.add( directionalLight )
    }
}



function animate() {
    requestAnimationFrame( animate )
    let t = performance.now() / 1000

    

    grassPlane.resampleParticle(camera)

    let mat = ( crystalMesh.material as THREE.MeshPhongMaterial )
    mat.emissiveIntensity = Math.sin( t * 3 ) * .5 + .5
    crystalMesh.position.y = .7 + Math.sin( t * 2 ) * .05
    crystalMesh.rotation.y = stopGoEased( t, 2, 4 ) * 2 * Math.PI
    pointlight.position.copy(crystalMesh.position);
    scene.add(pointlight)
    composer.render()
}