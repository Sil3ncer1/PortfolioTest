import * as THREE from 'three';


import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler';
class Grass extends THREE.Group {
    
    instances: number;
    plane : THREE.Object3D 
    triangle : THREE.Mesh;
    grassInstance : THREE.InstancedMesh;
    sampler: MeshSurfaceSampler | undefined;

    _positionx: number[];
    _positiony: number[];
    _positionz: number[];


    GrassMaterial: THREE.MeshPhongMaterial;

    dummy: THREE.Object3D;

    constructor(instances : number, plane : THREE.Mesh, triangle : THREE.Mesh) {
        super();
        this.instances = instances;
        this.plane = plane;
        this.dummy = new THREE.Object3D;
        this.triangle = triangle;
        this.triangle.geometry.rotateX(-Math.PI /2)
        triangle.geometry.computeVertexNormals();
        triangle.geometry.attributes.normal.needsUpdate = true;
        triangle.geometry.getAttribute('normal');
        this.setNormal(triangle.geometry, 0);
        this.setNormal(triangle.geometry, 1);
        this.setNormal(triangle.geometry, 2);

        this.GrassMaterial = new THREE.MeshPhongMaterial({
            side: THREE.DoubleSide,
            vertexColors: true,
            specular: 0,
            reflectivity: 0,
            shininess:0
        });


        this.sampler = new MeshSurfaceSampler( plane )
        .setWeightAttribute( 'uv' )
        .build();   
        this.grassInstance = new THREE.InstancedMesh( triangle.geometry, this.GrassMaterial, this.instances );
        
        this._positionx = [instances];
        this._positiony = [instances];
        this._positionz = [instances];

        let _tempPosition = new THREE.Vector3;
        for ( let i = 0; i < instances; i ++ ) {

            this.sampler.sample( _tempPosition );
            this.dummy.position.copy( new THREE.Vector3(_tempPosition.x *100,0 *100,_tempPosition.y *100));
            this.dummy.scale.set(100,100,100);
            this.dummy.updateMatrix();

            this.grassInstance.setMatrixAt( i, this.dummy.matrix );

            this._positionx[i] = _tempPosition.x;
            this._positiony[i] = _tempPosition.y;
            this._positionz[i] = _tempPosition.z;
        }

        this.grassInstance.receiveShadow = true;
        this.grassInstance.instanceMatrix.needsUpdate = true;
        this.add(this.grassInstance);
        this.add(this.plane);

    }
    

    resampleParticle(camera: THREE.Camera ) {
        const dummy = new THREE.Object3D();
        
        dummy.updateMatrix()
        for ( let i = 0; i < this.instances; i ++ ) {
            dummy.position.copy( new THREE.Vector3(this._positionx[i] *100,this._positionz[i]*100,this._positiony[i] *100));
            dummy.scale.set(100,100,100);
            dummy.lookAt(new THREE.Vector3(camera.position.x,0,camera.position.z))
            dummy.updateMatrix();
    
            
            dummy.updateMatrix();
            this.grassInstance.setMatrixAt( i, dummy.matrix );
            this.grassInstance.instanceMatrix.needsUpdate = true;
        }
    }

    setNormal = function (geometry, normalIndex) {
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


}


export { Grass };