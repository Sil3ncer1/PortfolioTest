import * as THREE from "three"
import { GreaterEqualDepth, Vector2 } from "three"

import { MapControls, OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'



import RenderPixelatedPass from "./RenderPixelatedPass"
import PixelatePass from "./PixelatePass"

import { stopGoEased } from "./math"

import grassURL from "./assets/grass.fbx"
import pillarURL from "./assets/well.fbx"
import traingleURL from "./assets/triangle.fbx"

let camera: THREE.Camera, scene: THREE.Scene, renderer: THREE.WebGLRenderer, composer: EffectComposer
let controls: OrbitControls
let crystalMesh: THREE.Mesh, pillar: THREE.Object3D, grassmesh: THREE.Object3D, grassplane: THREE.Object3D,grassplaneMesh: THREE.Mesh
let targetQuaternion
let grassInstance: THREE.InstancedMesh
let pointlightn ;
let sampler:MeshSurfaceSampler;
let _positiond : THREE.Vector3;
let dummyd : THREE.Object3D = new THREE.Object3D;
var _positionx: number[];
var _positiony: number[];
var _positionz: number[];
init();
animate();
function init() {


    let screenResolution = new Vector2( window.innerWidth, window.innerHeight )
    let renderResolution = screenResolution.clone().divideScalar( 5)
    renderResolution.x |= 0
    renderResolution.y |= 0
    let aspectRatio = screenResolution.x / screenResolution.y

    camera = new THREE.OrthographicCamera( -aspectRatio, aspectRatio, 1, -1, 0, 10 )
    scene = new THREE.Scene()
    scene.background = new THREE.Color( 0x151729 )

    // Renderer
    renderer = new THREE.WebGLRenderer( { antialias: false } )
    renderer.shadowMap.enabled = true
    renderer.setSize( screenResolution.x, screenResolution.y )
    document.body.appendChild( renderer.domElement )

    composer = new EffectComposer( renderer )
    composer.addPass( new RenderPixelatedPass( renderResolution, scene, camera ) )
    let bloomPass = new UnrealBloomPass( screenResolution, .4, .1, .9 )
    composer.addPass( bloomPass )
    composer.addPass( new PixelatePass( renderResolution ) )

    controls = new OrbitControls( camera, renderer.domElement )
    controls.target.set( 0, 0, 0 )
    camera.position.z = 5
    camera.position.y = 5 * Math.tan( Math.PI / 6 )

    targetQuaternion = camera.quaternion;
    
    controls.update()
    // controls.minPolarAngle = controls.maxPolarAngle = controls.getPolarAngle()

    //Geometry
    //Pillar
    {
        const fbxLoader = new FBXLoader()
        fbxLoader.load( pillarURL, obj => {
            // obj.scale.set( .005, .005, .005 )
            obj.traverse( child => {
                // @ts-ignore
                if ( child instanceof THREE.Mesh ) {
                    child.castShadow = true
                    child.receiveShadow = true
                    child.material = new THREE.MeshPhongMaterial( {
                        color: 0x333333,
                        // opacity: 0.5
                    } )
                }
            } )
            pillar = obj
            scene.add( obj )
        } )
    }



        //Grass Plane
        
        {
            const fbxLoader = new FBXLoader()
            fbxLoader.load( grassURL, obj => {
                obj.traverse( child => {
                    // @ts-ignore
                    if ( child instanceof THREE.Mesh ) {
                        child.castShadow = true
                        child.receiveShadow = true
                        child.material = new THREE.MeshPhongMaterial( {
                            color: 0x009900,
                            shininess: 0
                            // opacity: 0.5
                        } )
                        child.material.receiveShadow = true;
                        sampler = new MeshSurfaceSampler( child )
                        .setWeightAttribute( 'uv' )
                        .build();
                    }
                } )
                grassplane = obj
                scene.add( obj )
            } )
        }

    //Grass Halm
    const setNormal = function (geometry, normalIndex) {
        const pos = {
            x: 0,
            y: 1,
            z: 0
        };
        const normal = geometry.getAttribute('normal');
        normal.array[normalIndex * 3] = pos.x;
        normal.array[normalIndex * 3 + 1] = pos.y;
        normal.array[normalIndex * 3 + 2] = pos.z;
        normal.needsUpdate = true;
    };
    
    let GrassMaterial = new THREE.MeshPhongMaterial({
        side: THREE.DoubleSide,
        vertexColors: true,
        specular: 0
                
        
         // Render both sides of the plane
    });
    {
        const fbxLoader = new FBXLoader()
        let i = 0;
        fbxLoader.load( traingleURL, obj => {
            obj.traverse( child => {
                i++;
                // @ts-ignore
                if ( child instanceof THREE.Mesh ) {
                    child.geometry.computeVertexNormals();
                    child.geometry.normalsNeedUpdate = true;
                    child.geometry.getAttribute('normal');
                    setNormal(child.geometry, 0);
                    setNormal(child.geometry, 1);
                    setNormal(child.geometry, 2);
                    grassInstance = new THREE.InstancedMesh( child.geometry, GrassMaterial, 10000 );
                    const dummy = new THREE.Object3D();
                    let _position = new THREE.Vector3;                   
                    _positionx = [10000];
                    _positiony = [10000];
                    _positionz = [10000];
                    for ( let i = 0; i < 10000; i ++ ) {
                        sampler.sample( _position );
                        dummy.position.copy( new THREE.Vector3(_position.x *100,_position.z *100,_position.y *100));
                        dummy.updateMatrix();
                        dummy.castShadow= true;
                        dummy.receiveShadow= true;
                        
                        grassInstance.setMatrixAt( i, dummy.matrix );
                        _positionx[i] = _position.x;
                        _positiony[i] = _position.y;
                        _positionz[i] = _position.z;
                    }
                    grassInstance.receiveShadow = true;
                    grassInstance.instanceMatrix.needsUpdate = true;
                    scene.add( grassInstance );
                }
            } )
            
            grassmesh = obj
            let targetQuaternion = camera.quaternion;
            grassmesh.quaternion.rotateTowards(targetQuaternion, 1);
            grassmesh.position.x = -1;
            grassmesh.position.z = -1;
            scene.add( obj )
        } )
    }




    //Icosphere

    {
        const radius = .2
        // const geometry = new THREE.DodecahedronGeometry( radius )
        const geometry = new THREE.IcosahedronGeometry( radius )
        crystalMesh = new THREE.Mesh(
            geometry,
            new THREE.MeshPhongMaterial( {
                color: 0x2379cf,
                emissive: 0x143542,
                shininess: 100,
                specular: 0xffffff,
                // opacity: 0.5
            } )
            // new THREE.MeshNormalMaterial()
        )
        crystalMesh.receiveShadow = true
        crystalMesh.castShadow = true
        scene.add( crystalMesh )
    }

    // Lights
    scene.add( new THREE.AmbientLight( 0x2d3645, 1 ) )
    {
        let directionalLight = new THREE.DirectionalLight( 0xfffc9c, 0.1 )
        directionalLight.position.set( 100, 100, 100 )
        directionalLight.castShadow = true
        // directionalLight.shadow.radius = 0
        directionalLight.shadow.mapSize.set( 2048, 2048 )
        scene.add( directionalLight )

        let pointlight = new THREE.PointLight( 0xfffc9c, 1)
        
        pointlight.position.set(1,0.5,1)
        pointlight.distance = 1;
        const sphereSize = 0.1;
        const pointLightHelper = new THREE.PointLightHelper( pointlight, sphereSize );
        scene.add( pointLightHelper );
        scene.add( pointlight );
        pointlightn = new THREE.PointLight( 0x2222aa, 5);
        scene.add(pointlightn)
        }
}

function animate() {


    requestAnimationFrame( animate )
    

    let t = performance.now() / 1000
    let mat = ( crystalMesh.material as THREE.MeshPhongMaterial )
    mat.emissiveIntensity = Math.sin( t * 3 ) * .5 + .5
    crystalMesh.position.y = .8 + Math.sin( t * 2 ) * .05
    // crystalMesh.rotation.y = stopGoEased( t, 3, 4 ) * Math.PI / 2
    crystalMesh.rotation.y = stopGoEased( t, 2, 4 ) * 2 * Math.PI
    pointlightn.position.copy(crystalMesh.position);
    pointlightn.intensity = mat.emissiveIntensity *5;
    pointlightn.distance =mat.emissiveIntensity*3
    mat.emissiveIntensity = Math.sin( t * 3 ) * 2 + 2
    resampleParticle( );
    composer.render()
}

function resampleParticle( ) {
    const dummy = new THREE.Object3D();
    let _position = new THREE.Vector3;         
    for ( let i = 0; i < 10000; i ++ ) {
        dummy.position.copy( new THREE.Vector3(_positionx[i] *100,_positionz[i]*100,_positiony[i] *100));
        dummy.lookAt(new THREE.Vector3(camera.position.x,0,camera.position.z))
        dummy.updateMatrix();
        dummy.castShadow= true;
        dummy.receiveShadow= true;
        grassInstance.setMatrixAt( i, dummy.matrix );
        grassInstance.instanceMatrix.needsUpdate = true;
    }

 
}