import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  ContactShadows,
  Environment,
  Html,
  OrbitControls,
  useGLTF,
} from '@react-three/drei';

function Model({ modelPath }) {
  const { scene } = useGLTF(modelPath);
  return <primitive object={scene} />;
}

function ModelPlaceholder() {
  return (
    <group rotation={[0, -0.3, 0]}>
      <mesh castShadow position={[0, 0.12, 0]}>
        <dodecahedronGeometry args={[1.05, 1]} />
        <meshStandardMaterial
          color="#b84932"
          roughness={0.48}
          metalness={0.08}
          flatShading
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <torusGeometry args={[1.32, 0.012, 8, 96]} />
        <meshStandardMaterial color="#c98e43" roughness={0.5} />
      </mesh>
    </group>
  );
}

function LoadingLabel() {
  return (
    <Html center>
      <span className="viewer-loading">
        Preparing model…
      </span>
    </Html>
  );
}

export default function MithilaViewer({ modelPath }) {
  return (
    <div className="model-viewer">
      <Canvas
        fallback={
          <div className="viewer-support-message" role="status">
            Interactive 3D is not available in this browser. Try opening this
            page in an up-to-date browser with WebGL enabled.
          </div>
        }
        shadows
        dpr={[1, 2]}
        camera={{ position: [3.5, 2.5, 4.5], fov: 38 }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#e8e1d5']} />
        <ambientLight intensity={0.7} />
        <directionalLight
          castShadow
          position={[4, 6, 4]}
          intensity={2.1}
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-4, 2, -3]} intensity={0.75} />

        <Suspense fallback={<LoadingLabel />}>
          {modelPath ? <Model modelPath={modelPath} /> : <ModelPlaceholder />}
          <Environment preset="studio" />
        </Suspense>

        <ContactShadows
          position={[0, -1.15, 0]}
          opacity={0.35}
          scale={8}
          blur={2.5}
          far={3}
        />
        <OrbitControls
          makeDefault
          autoRotate
          autoRotateSpeed={0.65}
          enableDamping
          dampingFactor={0.06}
          minDistance={2}
          maxDistance={9}
          maxPolarAngle={Math.PI * 0.82}
        />
      </Canvas>
      {!modelPath && (
        <div className="viewer-placeholder-help">
          No 3D object is configured yet
        </div>
      )}
    </div>
  );
}
