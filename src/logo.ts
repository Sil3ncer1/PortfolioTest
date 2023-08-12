import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'

class Logo extends THREE.Group {
    logo : THREE.Group | undefined;

    constructor(url: string){
        super();
        const fbxLoader = new FBXLoader()
        fbxLoader.load( url, obj => {
            obj.traverse( child => {
                // @ts-ignore
                if ( child instanceof THREE.Mesh ) {
                    child.castShadow = true
                    child.receiveShadow = true
                    

                }
            } )
            this.logo = obj;
        } )
    }
}
export { Logo };