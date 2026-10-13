import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import {
  Environment,
  Html,
  OrbitControls,
} from '@react-three/drei';
import {
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

function createStarfieldGeometry() {
  const positions = new Float32Array(1800);
  let seed = 7351;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < positions.length; i += 3) {
    const y = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(1 - y * y) * 38;
    positions[i] = Math.cos(angle) * radius;
    positions[i + 1] = y * 38;
    positions[i + 2] = Math.sin(angle) * radius;
  }

  const starGeometry = new BufferGeometry();
  starGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return starGeometry;
}

function Starfield() {
  const geometry = useMemo(createStarfieldGeometry, []);
  const material = useMemo(
    () =>
      new PointsMaterial({
        color: '#ffffff',
        size: 1.35,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    [],
  );
  const stars = useMemo(() => new Points(geometry, material), [geometry, material]);

  return <primitive object={stars} />;
}

function createSaturnTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not create the planetary surface texture canvas.');
  }

  const bands = [
    [0, '#c8a15e'],
    [32, '#e8cb83'],
    [65, '#a87545'],
    [98, '#dabc75'],
    [130, '#815b3d'],
    [162, '#d8b875'],
    [194, '#f0d99b'],
    [225, '#a87545'],
    [256, '#c69b58'],
    [288, '#e4c77f'],
    [320, '#79553a'],
    [352, '#d0aa68'],
    [384, '#eed393'],
    [416, '#986b43'],
    [448, '#cba15e'],
    [480, '#e5c77e'],
    [512, '#c8a15e'],
  ];
  const wave = (x, y) =>
    Math.sin(x * 0.014 + y * 0.035) * 4 +
    Math.sin(x * 0.031 - y * 0.018) * 2;

  for (let band = 0; band < bands.length - 1; band += 1) {
    const [top, color] = bands[band];
    const [bottom] = bands[band + 1];
    context.fillStyle = color;
    context.beginPath();
    for (let x = 0; x <= canvas.width; x += 8) {
      const y = top + wave(x, top);
      if (x === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    for (let x = canvas.width; x >= 0; x -= 8) {
      context.lineTo(x, bottom + wave(x, bottom));
    }
    context.closePath();
    context.fill();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function createPanelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 224;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not create the solar panel texture canvas.');
  }

  context.fillStyle = '#142b50';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#4b2413';
  context.lineWidth = 4;
  for (let column = 1; column < 6; column += 1) {
    const x = (canvas.width * column) / 6;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }
  for (let row = 1; row < 3; row += 1) {
    const y = (canvas.height * row) / 3;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function splitLargestComponent(geometry) {
  const positions = geometry.getAttribute('position').array;
  const faceCount = positions.length / 9;
  const parent = new Int32Array(faceCount);
  const vertexFaces = new Map();
  geometry.computeBoundingBox();
  const modelCenter = geometry.boundingBox.getCenter(new Vector3());

  for (let face = 0; face < faceCount; face += 1) {
    parent[face] = face;
  }

  function find(face) {
    while (parent[face] !== face) {
      parent[face] = parent[parent[face]];
      face = parent[face];
    }
    return face;
  }

  function connect(left, right) {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent[rightRoot] = leftRoot;
  }

  for (let face = 0; face < faceCount; face += 1) {
    for (let vertex = 0; vertex < 3; vertex += 1) {
      const offset = face * 9 + vertex * 3;
      const key = `${positions[offset]},${positions[offset + 1]},${positions[offset + 2]}`;
      const otherFace = vertexFaces.get(key);
      if (otherFace === undefined) {
        vertexFaces.set(key, face);
      } else {
        connect(face, otherFace);
      }
    }
  }

  const components = new Map();
  const componentForFace = new Array(faceCount);
  for (let face = 0; face < faceCount; face += 1) {
    const root = find(face);
    let component = components.get(root);
    if (!component) {
      component = {
        faces: [],
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity,
      };
      components.set(root, component);
    }
    componentForFace[face] = component;
    component.faces.push(face);
    for (let vertex = 0; vertex < 3; vertex += 1) {
      const offset = face * 9 + vertex * 3;
      const x = positions[offset];
      const y = positions[offset + 1];
      component.minX = Math.min(component.minX, x);
      component.maxX = Math.max(component.maxX, x);
      component.minY = Math.min(component.minY, y);
      component.maxY = Math.max(component.maxY, y);
    }
  }

  const componentList = [...components.values()];
  const largestComponent = componentList.reduce((largest, component) =>
    component.faces.length > largest.faces.length ? component : largest,
  );
  const largestFaces = new Set(largestComponent.faces);
  const panelComponents = new Set(
    componentList.filter(
      ({ faces, minY, maxY }) =>
        faces.length <= 20 &&
        ((minY >= 150 && maxY <= 550) || (minY >= 1950 && maxY <= 2350)),
    ),
  );
  const panelFaces = new Set(
    [...panelComponents].flatMap(({ faces }) => faces),
  );

  const beamFaces = new Set();
  for (let face = 0; face < faceCount; face += 1) {
    if (largestFaces.has(face) || panelFaces.has(face)) continue;
    let x = 0;
    let y = 0;
    let z = 0;
    for (let vertex = 0; vertex < 3; vertex += 1) {
      const offset = face * 9 + vertex * 3;
      x += positions[offset] / 3;
      y += positions[offset + 1] / 3;
      z += positions[offset + 2] / 3;
    }
    const radius = Math.hypot(x - modelCenter.x, z - modelCenter.z);
    if (
      y >= largestComponent.minY &&
      y <= largestComponent.maxY &&
      radius > 155 &&
      radius < 835
    ) {
      beamFaces.add(face);
    }
  }

  function createGeometry(predicate, withPanelUv = false) {
    const faces = [];
    for (let face = 0; face < faceCount; face += 1) {
      if (predicate(face)) faces.push(face);
    }

    if (faces.length === 0) return null;

    const componentGeometry = new BufferGeometry();
    const componentPositions = new Float32Array(faces.length * 9);
    const uvs = withPanelUv ? new Float32Array(faces.length * 6) : null;
    faces.forEach((face, index) => {
      componentPositions.set(positions.subarray(face * 9, face * 9 + 9), index * 9);
      if (uvs) {
        const component = componentForFace[face];
        const width = component.maxX - component.minX;
        const height = component.maxY - component.minY;
        for (let vertex = 0; vertex < 3; vertex += 1) {
          const positionOffset = face * 9 + vertex * 3;
          const uvOffset = index * 6 + vertex * 2;
          uvs[uvOffset] =
            (positions[positionOffset] - component.minX) / width;
          uvs[uvOffset + 1] =
            (positions[positionOffset + 1] - component.minY) / height;
        }
      }
    });
    componentGeometry.setAttribute(
      'position',
      new Float32BufferAttribute(componentPositions, 3),
    );
    if (uvs) componentGeometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    componentGeometry.computeVertexNormals();
    componentGeometry.computeBoundingBox();
    return componentGeometry;
  }

  const rotatingGeometry = createGeometry(
    (face) => largestFaces.has(face) || beamFaces.has(face),
  );
  const contactYMin = largestComponent.minY;
  const contactYMax = largestComponent.maxY;
  const contactGeometry = new CylinderGeometry(
    150.8,
    150.8,
    contactYMax - contactYMin,
    96,
    1,
    true,
  );
  contactGeometry.translate(
    modelCenter.x,
    (contactYMin + contactYMax) / 2,
    modelCenter.z,
  );

  return {
    bodyGeometry: createGeometry(
      (face) =>
        !largestFaces.has(face) &&
        !panelFaces.has(face) &&
        !beamFaces.has(face),
    ),
    panelGeometry: createGeometry((face) => panelFaces.has(face), true),
    rotatingGeometry,
    contactGeometry,
    rotatingCenter: rotatingGeometry.boundingBox.getCenter(new Vector3()),
  };
}

function Model({ modelPath }) {
  const geometry = useLoader(STLLoader, modelPath);
  const panelTexture = useMemo(createPanelTexture, []);
  const {
    bodyGeometry,
    panelGeometry,
    rotatingGeometry,
    contactGeometry,
    rotatingCenter,
  } = useMemo(
    () => splitLargestComponent(geometry),
    [geometry],
  );
  const rotatingPart = useRef(null);

  useFrame((_, delta) => {
    if (rotatingPart.current) rotatingPart.current.rotation.y -= delta * 0.18;
  });

  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const center = bounds.getCenter(new Vector3());
  const size = bounds.getSize(new Vector3());
  const scale = 2.1 / Math.max(size.x, size.y, size.z);

  return (
    <group
      position={[-center.x * scale, -center.y * scale, -center.z * scale]}
      scale={scale}
    >
      <mesh castShadow receiveShadow geometry={bodyGeometry}>
        <meshStandardMaterial color="#b84932" roughness={0.48} metalness={0.08} />
      </mesh>
      {panelGeometry && (
        <mesh castShadow receiveShadow geometry={panelGeometry}>
          <meshStandardMaterial
            map={panelTexture}
            roughness={0.55}
            metalness={0.12}
          />
        </mesh>
      )}
      <mesh geometry={contactGeometry}>
        <meshBasicMaterial color="#080808" side={DoubleSide} />
      </mesh>
      <group ref={rotatingPart} position={rotatingCenter}>
        <mesh
          castShadow
          receiveShadow
          geometry={rotatingGeometry}
          position={[-rotatingCenter.x, -rotatingCenter.y, -rotatingCenter.z]}
        >
          <meshStandardMaterial
            color="#b84932"
            roughness={0.48}
            metalness={0.08}
          />
        </mesh>
      </group>
    </group>
  );
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
  const planetTexture = useMemo(createSaturnTexture, []);

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
        <color attach="background" args={['#000000']} />
        <Starfield />
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

        <mesh
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, -12.5, 0]}
          receiveShadow
        >
          <sphereGeometry args={[9.55, 96, 64]} />
          <meshStandardMaterial
            map={planetTexture}
            emissive="#ffffff"
            emissiveMap={planetTexture}
            emissiveIntensity={0.35}
            roughness={1}
          />
        </mesh>
        <group position={[0, -8.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
          {[
            [9.65, 10.15, '#b99a6b'],
            [10.32, 10.9, '#8e6e49'],
            [11.08, 11.85, '#d2b47d'],
            [12.05, 13.2, '#a18158'],
          ].map(([innerRadius, outerRadius, color]) => (
            <mesh key={innerRadius}>
              <ringGeometry args={[innerRadius, outerRadius, 160]} />
              <meshBasicMaterial color={color} side={DoubleSide} />
            </mesh>
          ))}
        </group>
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
