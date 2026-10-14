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

const ASTRONOMICAL_UNIT_IN_MILLION_KM = 149.6;
const INNER_ORBIT_OFFSET = 0.52;
const ORBIT_DISTANCE_FACTOR = 0.88;
const ASTEROID_BELT_INNER_DISTANCE = 2.1 * ASTRONOMICAL_UNIT_IN_MILLION_KM;
const ASTEROID_BELT_OUTER_DISTANCE = 3.3 * ASTRONOMICAL_UNIT_IN_MILLION_KM;

function scaledSolarDistance(distanceInMillionKm) {
  const distanceInAstronomicalUnits =
    distanceInMillionKm / ASTRONOMICAL_UNIT_IN_MILLION_KM;
  return INNER_ORBIT_OFFSET + ORBIT_DISTANCE_FACTOR * Math.sqrt(distanceInAstronomicalUnits);
}

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
  const ringY = (largestComponent.minY + largestComponent.maxY) / 2;
  let ringMinRadius = Infinity;
  let ringMaxRadius = -Infinity;
  for (let face = 0; face < faceCount; face += 1) {
    if (!largestFaces.has(face)) continue;
    for (let vertex = 0; vertex < 3; vertex += 1) {
      const offset = face * 9 + vertex * 3;
      const y = positions[offset + 1];
      const radius = Math.hypot(
        positions[offset] - modelCenter.x,
        positions[offset + 2] - modelCenter.z,
      );
      if (Math.abs(y - ringY) <= 8 && radius > 800) {
        ringMinRadius = Math.min(ringMinRadius, radius);
        ringMaxRadius = Math.max(ringMaxRadius, radius);
      }
    }
  }
  if (!Number.isFinite(ringMinRadius) || !Number.isFinite(ringMaxRadius)) {
    throw new Error('Could not locate the model ring for spoke connectors.');
  }
  const ringRadius = (ringMinRadius + ringMaxRadius) / 2;
  const ringTubeRadius = (ringMaxRadius - ringMinRadius) / 2 + 7;
  const jointArc = 48 / ringRadius;
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
    jointCenter: new Vector3(modelCenter.x, ringY, modelCenter.z),
    ringRadius,
    ringTubeRadius,
    jointArc,
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
    jointCenter,
    ringRadius,
    ringTubeRadius,
    jointArc,
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
        {[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((angle) => (
          <group
            key={angle}
            position={[
              jointCenter.x - rotatingCenter.x,
              jointCenter.y - rotatingCenter.y,
              jointCenter.z - rotatingCenter.z,
            ]}
            rotation={[0, jointArc / 2 - angle, 0]}
          >
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry
                args={[ringRadius, ringTubeRadius, 24, 24, jointArc]}
              />
              <meshBasicMaterial color="#080808" side={DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function createJupiterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not create the Jupiter surface texture canvas.');
  }

  const bands = [
    ['#d6b58a', 0.08],
    ['#a9663e', 0.06],
    ['#ead5ac', 0.11],
    ['#bc7950', 0.07],
    ['#f0dfbd', 0.11],
    ['#a85f3c', 0.07],
    ['#d4ad7d', 0.1],
    ['#f1dfbc', 0.12],
    ['#a96b49', 0.07],
    ['#e7cda4', 0.1],
    ['#bd8056', 0.06],
    ['#d6b58a', 0.05],
  ];
  let top = 0;
  bands.forEach(([color, fraction], index) => {
    const bottom = index === bands.length - 1
      ? canvas.height
      : top + canvas.height * fraction;
    context.fillStyle = color;
    context.fillRect(0, top, canvas.width, bottom - top);
    context.fillStyle = 'rgb(255 244 216 / 12%)';
    for (let x = -40; x < canvas.width; x += 110) {
      const offset = Math.sin(x * 0.012 + index) * 4;
      context.fillRect(x, top + offset, 62, Math.max(2, (bottom - top) * 0.1));
    }
    top = bottom;
  });

  context.save();
  context.translate(260, 278);
  context.rotate(-0.12);
  context.fillStyle = '#b95737';
  context.beginPath();
  context.ellipse(0, 0, 110, 45, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = 'rgb(247 220 179 / 55%)';
  context.lineWidth = 5;
  context.beginPath();
  context.ellipse(0, 0, 86, 28, 0, 0, Math.PI * 2);
  context.stroke();
  context.restore();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function createNeptuneTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not create the Neptune surface texture canvas.');
  }

  context.fillStyle = '#176fae';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const bands = ['#278ac3', '#176fae', '#135d9e', '#3195c7', '#155f9e'];
  bands.forEach((color, index) => {
    context.fillStyle = color;
    const y = index * 108 - 22;
    context.fillRect(0, y, canvas.width, 42);
    context.fillStyle = 'rgb(145 213 236 / 18%)';
    context.fillRect(0, y + 42, canvas.width, 15);
  });
  context.save();
  context.translate(260, 255);
  context.rotate(-0.18);
  context.fillStyle = '#082f55';
  context.beginPath();
  context.ellipse(0, 0, 118, 54, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = 'rgb(106 178 215 / 70%)';
  context.lineWidth = 5;
  context.beginPath();
  context.ellipse(0, 0, 144, 72, 0, 0, Math.PI * 2);
  context.stroke();
  context.restore();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function Planet({
  radius,
  orbitRadius,
  color,
  texture,
  speed,
  children,
}) {
  const orbit = useRef(null);
  const planet = useRef(null);

  useFrame((_, delta) => {
    if (orbit.current) orbit.current.rotation.y += delta * speed;
    if (planet.current) planet.current.rotation.y += delta * 0.22;
  });

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[orbitRadius, 0.01, 5, 240]} />
        <meshBasicMaterial color="#77818d" transparent opacity={0.62} />
      </mesh>
      <group ref={orbit}>
        <group position={[orbitRadius, 0, 0]}>
          <mesh ref={planet} castShadow receiveShadow>
            <sphereGeometry args={[radius, 48, 32]} />
            <meshStandardMaterial
              color={color}
              map={texture}
              roughness={0.88}
            />
          </mesh>
          {children}
        </group>
      </group>
    </>
  );
}

function AsteroidBelt() {
  const geometry = useMemo(() => {
    const positions = new Float32Array(1600 * 3);
    let seed = 4219;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let asteroid = 0; asteroid < positions.length / 3; asteroid += 1) {
      const angle = random() * Math.PI * 2;
      const radius =
        scaledSolarDistance(ASTEROID_BELT_INNER_DISTANCE) +
        random() *
          (scaledSolarDistance(ASTEROID_BELT_OUTER_DISTANCE) -
            scaledSolarDistance(ASTEROID_BELT_INNER_DISTANCE));
      const offset = asteroid * 3;
      positions[offset] = Math.cos(angle) * radius;
      positions[offset + 1] = (random() - 0.5) * 0.12;
      positions[offset + 2] = Math.sin(angle) * radius;
    }

    const beltGeometry = new BufferGeometry();
    beltGeometry.setAttribute(
      'position',
      new Float32BufferAttribute(positions, 3),
    );
    return beltGeometry;
  }, []);
  const material = useMemo(
    () =>
      new PointsMaterial({
        color: '#d3b58c',
        size: 0.035,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
      }),
    [],
  );
  const asteroids = useMemo(() => new Points(geometry, material), [geometry, material]);

  return <primitive object={asteroids} />;
}

function JupiterWithMithila({ texture }) {
  const orbit = useRef(null);
  const markerOrbit = useRef(null);
  const arrow = useRef(null);
  const arrowShaft = useRef(null);
  const arrowHead = useRef(null);
  const direction = useMemo(() => new Vector3(), []);
  const markerOrbitRadius = 0.55;
  const arrowOrigin = [0.88, 0.95, 0.12];
  const jupiterOrbitRadius = scaledSolarDistance(778.5);

  useFrame((state, delta) => {
    const angle = state.clock.elapsedTime * 0.62;
    if (orbit.current) orbit.current.rotation.y += delta * 0.035;
    if (markerOrbit.current) markerOrbit.current.rotation.y = angle;

    const markerX = Math.cos(angle) * markerOrbitRadius;
    const markerZ = -Math.sin(angle) * markerOrbitRadius;
    direction.set(
      markerX - arrowOrigin[0],
      0.025 - arrowOrigin[1],
      markerZ - arrowOrigin[2],
    );
    const arrowLength = direction.length();
    direction.normalize();

    if (arrow.current) {
      arrow.current.quaternion.setFromUnitVectors(
        new Vector3(0, 1, 0),
        direction,
      );
    }
    if (arrowShaft.current) {
      arrowShaft.current.position.y = (arrowLength - 0.1) / 2;
      arrowShaft.current.scale.y = Math.max(0.1, arrowLength - 0.1);
    }
    if (arrowHead.current) {
      arrowHead.current.position.y = arrowLength - 0.08;
    }
  });

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[jupiterOrbitRadius, 0.01, 5, 280]} />
        <meshBasicMaterial color="#f2c58b" transparent opacity={0.55} />
      </mesh>
      <group ref={orbit}>
        <group position={[jupiterOrbitRadius, 0, 0]}>
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[0.42, 64, 48]} />
            <meshStandardMaterial map={texture} roughness={0.9} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[markerOrbitRadius, 0.008, 6, 96]} />
            <meshBasicMaterial color="#f5dfbd" transparent opacity={0.8} />
          </mesh>
          <group ref={markerOrbit}>
            <mesh position={[markerOrbitRadius, 0.025, 0]}>
              <sphereGeometry args={[0.035, 20, 16]} />
              <meshBasicMaterial color="#ffffff" toneMapped={false} />
            </mesh>
            <pointLight
              position={[markerOrbitRadius, 0.025, 0]}
              color="#ffffff"
              intensity={0.8}
              distance={1.3}
              decay={2}
            />
          </group>
          <group ref={arrow} position={arrowOrigin}>
            <mesh ref={arrowShaft}>
              <cylinderGeometry args={[0.012, 0.012, 1, 8]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh ref={arrowHead}>
              <coneGeometry args={[0.055, 0.13, 12]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
          <Html
            position={[0.88, 1.28, 0.12]}
            center
            distanceFactor={9}
            style={{ pointerEvents: 'none' }}
          >
            <span className="mithila-marker-label">MITHILA</span>
          </Html>
        </group>
      </group>
    </>
  );
}

function SolarSystem() {
  const jupiterTexture = useMemo(createJupiterTexture, []);
  const saturnTexture = useMemo(createSaturnTexture, []);
  const neptuneTexture = useMemo(createNeptuneTexture, []);
  const earthTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not create the Earth surface texture canvas.');
    }
    context.fillStyle = '#246f9d';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#62975c';
    context.beginPath();
    context.ellipse(120, 90, 58, 34, -0.4, 0, Math.PI * 2);
    context.ellipse(280, 155, 46, 24, 0.5, 0, Math.PI * 2);
    context.ellipse(390, 72, 28, 18, 0.3, 0, Math.PI * 2);
    context.fill();
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, []);

  return (
    <group scale={0.95}>
      <mesh>
        <sphereGeometry args={[0.62, 64, 48]} />
        <meshBasicMaterial color="#ffd36c" toneMapped={false} />
      </mesh>
      <pointLight color="#ffd783" intensity={240} distance={24} decay={2} />
      <Planet
        radius={0.035}
        orbitRadius={scaledSolarDistance(57.9)}
        color="#99958e"
        speed={0.27}
      />
      <Planet
        radius={0.065}
        orbitRadius={scaledSolarDistance(108.2)}
        color="#d4b27e"
        speed={0.2}
      />
      <Planet
        radius={0.07}
        orbitRadius={scaledSolarDistance(149.6)}
        color="#ffffff"
        texture={earthTexture}
        speed={0.16}
      />
      <Planet
        radius={0.048}
        orbitRadius={scaledSolarDistance(228)}
        color="#c83f32"
        speed={0.13}
      />
      <AsteroidBelt />
      <JupiterWithMithila texture={jupiterTexture} />
      <Planet
        radius={0.48}
        orbitRadius={scaledSolarDistance(1432)}
        color="#d0b47f"
        texture={saturnTexture}
        speed={0.06}
      >
        <group rotation={[Math.PI * 0.1, 0, Math.PI * 0.08]}>
          {[0.57, 0.67, 0.78].map((ringRadius, index) => (
            <mesh key={ringRadius} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[ringRadius, ringRadius + (index === 1 ? 0.09 : 0.045), 96]} />
              <meshBasicMaterial
                color={index === 1 ? '#dbc18e' : '#a58458'}
                side={DoubleSide}
                transparent
                opacity={0.78}
              />
            </mesh>
          ))}
        </group>
      </Planet>
      <Planet
        radius={0.27}
        orbitRadius={scaledSolarDistance(2867)}
        color="#38a9d6"
        speed={0.045}
      >
        <group rotation={[0, Math.PI / 2, 0]}>
          {[
            [0.34, 0.4],
            [0.42, 0.47],
            [0.49, 0.55],
            [0.58, 0.65],
          ].map(([innerRadius, outerRadius], index) => (
            <mesh key={innerRadius}>
              <ringGeometry args={[innerRadius, outerRadius, 96]} />
              <meshBasicMaterial
                color={index % 2 === 0 ? '#d8e0e4' : '#aebbc2'}
                side={DoubleSide}
                transparent
                opacity={0.82}
              />
            </mesh>
          ))}
        </group>
      </Planet>
      <Planet
        radius={0.27}
        orbitRadius={scaledSolarDistance(4515)}
        color="#287bb5"
        texture={neptuneTexture}
        speed={0.035}
      >
        <group>
          {[
            [0.4, 0.49],
            [0.53, 0.63],
            [0.67, 0.78],
          ].map(([innerRadius, outerRadius], index) => (
            <mesh key={innerRadius} rotation={[-Math.PI / 2 + 0.12, 0, 0.08]}>
              <ringGeometry args={[innerRadius, outerRadius, 96]} />
              <meshBasicMaterial
                color={index % 2 === 0 ? '#56616b' : '#34404a'}
                side={DoubleSide}
                transparent
                opacity={0.9}
              />
            </mesh>
          ))}
        </group>
      </Planet>
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

export default function MithilaViewer({
  modelPath,
  viewMode = 'overview',
  onViewChange,
}) {
  const planetTexture = useMemo(createSaturnTexture, []);
  const controlsRef = useRef(null);
  const isSolarSystem = viewMode === 'solar-system';
  const showDimensions = viewMode === 'dimensions';

  return (
    <div className="model-viewer">
      <select
        id="view-select"
        className="view-select"
        aria-label="Select 3D model view"
        value={viewMode}
        onChange={(event) => onViewChange(event.target.value)}
      >
        <option value="overview">View 1</option>
        <option value="dimensions">View 2</option>
        <option value="solar-system">View 3</option>
      </select>
      <Canvas
        key={viewMode}
        fallback={
          <div className="viewer-support-message" role="status">
            Interactive 3D is not available in this browser. Try opening this
            page in an up-to-date browser with WebGL enabled.
          </div>
        }
        shadows
        dpr={[1, 2]}
        camera={{
          position: isSolarSystem
            ? [0, 4, 12]
            : showDimensions
              ? [2.4, 1.6, 3.2]
              : [3.5, 2.5, 4.5],
          fov: 38,
        }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#000000']} />
        <Starfield />
        <ambientLight intensity={isSolarSystem ? 0.3 : 0.7} />
        <directionalLight
          castShadow
          position={[4, 6, 4]}
          intensity={2.1}
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-4, 2, -3]} intensity={0.75} />

        <Suspense fallback={<LoadingLabel />}>
          {isSolarSystem ? (
            <SolarSystem />
          ) : !modelPath ? (
            <ModelPlaceholder />
          ) : (
            <Model modelPath={modelPath} />
          )}
          <Environment preset="studio" />
        </Suspense>

        {!isSolarSystem && (
          <>
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
          </>
        )}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          autoRotate={!isSolarSystem}
          autoRotateSpeed={0.65}
          enableDamping
          dampingFactor={0.06}
          minDistance={isSolarSystem ? 3 : 2}
          maxDistance={isSolarSystem ? 34 : 9}
          maxPolarAngle={Math.PI * 0.82}
          target={isSolarSystem ? [0.35, 0, 0] : [0, 0, 0]}
        />
      </Canvas>
      {isSolarSystem && (
        <div className="solar-system-key">
          <span>Project Mithila · View 3</span>
          <strong>Approx. location in the Solar System</strong>
          <small>PLANETARY ROTATION AND INDIVIDUAL MOONS ARE NOT SHOWN!</small>
        </div>
      )}
      {showDimensions && (
        <div className="dimension-overlay" aria-label="Settlement dimension guide">
          <div className="dimension-heading">
            <span>Concept dimensions</span>
            <strong>Gravity ring · Ø 1,800 m · 1 RPM</strong>
          </div>
          <div className="dimension-scale" aria-label="Scale from 0 to 1,800 meters">
            <div className="dimension-scale-bar" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="dimension-scale-labels" aria-hidden="true">
              <span>0</span>
              <span>450</span>
              <span>900</span>
              <span>1,350</span>
              <span>1,800 m</span>
            </div>
          </div>
          <div className="dimension-facts">
            <span>Ring tube Ø 15 m</span>
            <span>Spine 1,200 m · Ø 30 m</span>
            <span>4 spokes · Ø 6 m</span>
            <span>4 wings · 35 × 100 m</span>
          </div>
        </div>
      )}
      <button
        className="recenter-button"
        type="button"
        aria-label="Recenter 3D model"
        title="Recenter view"
        onClick={() => controlsRef.current?.reset()}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="currentColor"
        >
          <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8.94 3A8.99 8.99 0 0 0 13 3.06V1h-2v2.06A8.99 8.99 0 0 0 3.06 11H1v2h2.06A8.99 8.99 0 0 0 11 20.94V23h2v-2.06A8.99 8.99 0 0 0 20.94 13H23v-2h-2.06ZM12 19a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z" />
        </svg>
      </button>
    </div>
  );
}
