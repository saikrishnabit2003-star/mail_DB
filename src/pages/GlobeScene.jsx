import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line, Sparkles, Trail } from '@react-three/drei'

const R = 1.6 // globe radius
const DEG = Math.PI / 180
const damp = THREE.MathUtils.damp

/* Land mask: white/black equirectangular map. Drop your own in /public and change this URL if you prefer. */
const MASK_URL = 'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-water.png'

/* lat/lon (degrees) -> point on the sphere. Same convention is used for sampling the mask. */
const toVec = (lat, lon, r = R) => {
  const phi = (90 - lat) * DEG
  const theta = (lon + 180) * DEG
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta))
}
const CITIES = [
  [37.7, -122.4], [40.7, -74], [51.5, -0.1], [19.1, 72.9], [1.35, 103.8], [-33.9, 151.2], [-23.5, -46.6], [35.7, 139.7],
]
const LINKS = [[0, 2], [1, 3], [2, 4], [3, 5], [6, 1], [4, 0], [5, 2], [1, 2], [3, 7], [7, 0], [6, 2], [4, 7]]
const CITY_VEC = CITIES.map(c => toVec(c[0], c[1]))

/* ------------------------------------------------------------------
   Land detection: real mask if it loads, procedural noise if it doesn't
   ------------------------------------------------------------------ */
function noiseLand(lat, lon) {
  const p = toVec(lat, lon, 1)
  const v = Math.sin(p.x * 2.1 + 1.3) * Math.cos(p.y * 2.6) + 0.9 * Math.sin(p.z * 2.4 - 0.7) * Math.cos(p.x * 3.1 + p.y * 1.7) + 0.35 * Math.sin((p.x + p.z) * 4.2)
  return v > 0.35
}

function useLandSampler() {
  const [sampler, setSampler] = useState(null)
  useEffect(() => {
    let dead = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = img.width
        c.height = img.height
        const g = c.getContext('2d')
        g.drawImage(img, 0, 0)
        const d = g.getImageData(0, 0, c.width, c.height).data
        let dark = 0
        for (let i = 0; i < d.length; i += 16) if (d[i] < 128) dark++
        const landIsDark = dark / (d.length / 16) < 0.5 // land covers < 50% of Earth -> auto-detect polarity
        const f = (lat, lon) => {
          const x = Math.min(img.width - 1, Math.floor(((lon + 180) / 360) * img.width))
          const y = Math.min(img.height - 1, Math.floor(((90 - lat) / 180) * img.height))
          return (d[(y * img.width + x) * 4] < 128) === landIsDark
        }
        if (!dead) setSampler(() => f)
      } catch {
        if (!dead) setSampler(() => noiseLand)
      }
    }
    img.onerror = () => !dead && setSampler(() => noiseLand)
    img.src = MASK_URL
    return () => { dead = true }
  }, [])
  return sampler
}

/* ------------------------------------------------------------------
   GLSL
   ------------------------------------------------------------------ */
const DOT_V = /* glsl */ `
  uniform float uTime, uReveal, uPx;
  uniform vec4 uPulses[6];
  attribute float aSeed;
  varying float vAlpha, vGlow, vFres;
  void main() {
    vec3 n = normalize(position);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 vn = normalize(normalMatrix * n);
    float facing = dot(vn, normalize(-mv.xyz));
    vFres = pow(1.0 - max(facing, 0.0), 2.5);

    // intro: dots switch on from the north pole down to the south pole
    float rev = smoothstep(0.0, 0.15, uReveal * 1.15 - (1.0 - (n.y * 0.5 + 0.5)));

    // delivery pulses: a glowing ring expands over the surface from each destination
    float g = 0.0;
    for (int i = 0; i < 6; i++) {
      vec4 p = uPulses[i];
      float age = uTime - p.w;
      if (age > 0.0 && age < 2.2) {
        float ang = acos(clamp(dot(n, p.xyz), -1.0, 1.0));
        g += exp(-pow((ang - age * 0.85) * 7.0, 2.0)) * (1.0 - age / 2.2);
      }
    }
    vGlow = g;
    float twinkle = 1.0 + 0.25 * sin(uTime * 2.0 + aSeed * 40.0);
    float size = (2.3 + vFres * 1.0 + g * 3.5 + aSeed * 0.6) * twinkle * rev;
    gl_PointSize = size * uPx * (6.0 / -mv.z);
    vAlpha = rev * mix(0.2, 1.0, smoothstep(-0.1, 0.25, facing));
    gl_Position = projectionMatrix * mv;
  }
`
const DOT_F = /* glsl */ `
  varying float vAlpha, vGlow, vFres;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    vec3 col = mix(vec3(0.55, 0.78, 1.0), vec3(0.85, 0.97, 1.0), vFres);
    col = mix(col, vec3(0.65, 1.0, 0.85), clamp(vGlow, 0.0, 1.0));
    gl_FragColor = vec4(col, smoothstep(0.5, 0.15, d) * vAlpha * (0.7 + vFres * 0.6 + vGlow));
  }
`
const CORE_V = /* glsl */ `
  varying vec3 vN, vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`
const CORE_F = /* glsl */ `
  varying vec3 vN, vV;
  void main() {
    float f = pow(1.0 - max(dot(vN, vV), 0.0), 2.2);
    vec3 col = mix(vec3(0.03, 0.08, 0.28), vec3(0.20, 0.45, 0.95), f);
    col += vec3(0.25, 0.35, 0.6) * pow(max(dot(vN, normalize(vec3(-0.5, 0.7, 0.6))), 0.0), 18.0) * 0.5; // soft highlight
    gl_FragColor = vec4(col, 1.0);
  }
`
const ATMO_F = /* glsl */ `
  varying vec3 vN, vV;
  void main() {
    float i = pow(max(0.62 - dot(vN, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
    gl_FragColor = vec4(0.45, 0.85, 1.0, 1.0) * i * 2.2;
  }
`
const ARC_V = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const ARC_F = /* glsl */ `
  uniform float uP;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float head = clamp(uP, 0.0, 1.0);
    float tail = clamp(uP - 0.5, 0.0, 1.0);
    float inside = step(tail, vUv.x) * step(vUv.x, head);
    float t = smoothstep(tail, head, vUv.x);
    float tip = exp(-pow((vUv.x - head) * 28.0, 2.0)) * (1.0 - smoothstep(1.0, 1.12, uP));
    float a = inside * (0.1 + 0.9 * t * t) + tip * 1.6 + 0.05;
    gl_FragColor = vec4(mix(uColor, vec3(1.0), tip * 0.8), a);
  }
`

/* ------------------------------------------------------------------
   Parts
   ------------------------------------------------------------------ */
/* One flight: a comet draws along the arc, then a ring bursts at the destination */
function Arc({ a, b, idx, fire, reduce }) {
  const A = CITY_VEC[a], B = CITY_VEC[b]
  const { geo } = useMemo(() => {
    const mid = A.clone().add(B).multiplyScalar(0.5).normalize().multiplyScalar(R * (1 + A.distanceTo(B) * 0.16))
    const curve = new THREE.QuadraticBezierCurve3(A, mid, B) // control point lifts the arc off the surface
    return { geo: new THREE.TubeGeometry(curve, 80, 0.011, 6, false) }
  }, [A, B])
  const mat = useMemo(
    () => new THREE.ShaderMaterial({ uniforms: { uP: { value: 0 }, uColor: { value: new THREE.Color('#9be7ff') } }, vertexShader: ARC_V, fragmentShader: ARC_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    []
  )
  const ring = useRef()
  const prev = useRef(0)
  const pos = useMemo(() => B.clone().multiplyScalar(1.004), [B])
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), B.clone().normalize()), [B])

  useFrame(({ clock }) => {
    const T = clock.elapsedTime
    const uP = reduce ? 0.6 + (idx % 4) * 0.2 : (T * 0.34 + idx * 0.47) % 2.2 // 0..2.2 loop; 1.0 = arrival
    mat.uniforms.uP.value = uP
    if (!reduce && prev.current < 1 && uP >= 1) fire(B.clone().normalize(), T)
    prev.current = uP
    const k = THREE.MathUtils.clamp((uP - 1) / 0.7, 0, 1)
    const on = !reduce && uP >= 1 && uP < 1.7
    ring.current.visible = on
    if (on) {
      ring.current.scale.setScalar(0.05 + k * 0.42)
      ring.current.material.opacity = (1 - k) * 0.9
    }
  })
  return (
    <>
      <mesh geometry={geo} material={mat} />
      <mesh ref={ring} position={pos} quaternion={quat} visible={false}>
        <ringGeometry args={[0.85, 1, 48]} />
        <meshBasicMaterial color="#a7f3d0" transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

/* City marker with a slow idle "sonar" ring */
function City({ p, i, reduce }) {
  const ring = useRef()
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), p.clone().normalize()), [p])
  const pos = useMemo(() => p.clone().multiplyScalar(1.006), [p])
  useFrame(({ clock }) => {
    const k = reduce ? 0.4 : (clock.elapsedTime * 0.45 + i * 0.37) % 1
    ring.current.scale.setScalar(0.04 + k * 0.16)
    ring.current.material.opacity = (1 - k) * 0.6
  })
  return (
    <group position={pos} quaternion={quat}>
      <mesh>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshBasicMaterial color="#d1fae5" toneMapped={false} />
      </mesh>
      <mesh ref={ring}>
        <ringGeometry args={[0.85, 1, 32]} />
        <meshBasicMaterial color="#a7f3d0" transparent depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/* Satellite on a tilted orbit with a ribbon trail */
function Orbit({ radius, tilt, speed, phase, reduce }) {
  const sat = useRef()
  const pts = useMemo(() => Array.from({ length: 129 }, (_, i) => { const t = (i / 128) * Math.PI * 2; return new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius) }), [radius])
  useFrame(({ clock }) => {
    const t = (reduce ? 1 : clock.elapsedTime) * speed + phase
    sat.current.position.set(Math.cos(t) * radius, 0, Math.sin(t) * radius)
  })
  return (
    <group rotation={tilt}>
      <Line points={pts} color="#dbeafe" lineWidth={0.8} transparent opacity={0.22} />
      <Trail width={0.55} length={7} color="#ffffff" attenuation={t => t * t} decay={1.4}>
        <mesh ref={sat}>
          <boxGeometry args={[0.14, 0.025, 0.09]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      </Trail>
    </group>
  )
}

/* ------------------------------------------------------------------
   The world: everything above, wired together
   ------------------------------------------------------------------ */
function World({ reduce }) {
  const land = useLandSampler()
  const gl = useThree(s => s.gl)
  const rig = useRef(), spin = useRef()
  const s = useRef({ reveal: 0, spin: 0.14, drag: false })
  const pulses = useMemo(() => Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, 0, -999)), [])
  const slot = useRef(0)
  const fire = useCallback((dir, t) => { pulses[slot.current++ % 6].set(dir.x, dir.y, dir.z, t) }, [pulses])

  // ~11,000 points spread evenly over the sphere (Fibonacci lattice), keeping only land
  const dotsGeo = useMemo(() => {
    if (!land) return null
    const N = 11000, golden = Math.PI * (3 - Math.sqrt(5)), pos = [], seed = []
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i
      const x = Math.cos(th) * r, z = Math.sin(th) * r
      const lat = Math.asin(y) / DEG
      const lon = ((((Math.atan2(z, -x) / DEG) - 180 + 540) % 360) - 180)
      if (land(lat, lon)) { pos.push(x * R, y * R, z * R); seed.push(Math.random()) }
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1))
    return g
  }, [land])

  const dotsMat = useMemo(
    () => new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uReveal: { value: 0 }, uPx: { value: gl.getPixelRatio() }, uPulses: { value: pulses } },
      vertexShader: DOT_V, fragmentShader: DOT_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
    [gl, pulses]
  )
  const coreMat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: CORE_V, fragmentShader: CORE_F }), [])
  const atmoMat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: CORE_V, fragmentShader: ATMO_F, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), [])

  useFrame((state, dt) => {
    const st = s.current
    const T = reduce ? 5 : state.clock.elapsedTime
    st.reveal = reduce ? 1 : damp(st.reveal, 1, 1.1, dt)
    dotsMat.uniforms.uTime.value = T
    dotsMat.uniforms.uReveal.value = st.reveal

    const e = 1 - Math.pow(1 - st.reveal, 3) // ease-out intro: scale up + camera dolly-in
    rig.current.scale.setScalar(0.78 + 0.22 * e)
    state.camera.position.z = damp(state.camera.position.z, 6.7, 1.4, dt)

    // pointer parallax: whole rig leans toward the cursor
    rig.current.rotation.x = damp(rig.current.rotation.x, -state.pointer.y * 0.16, 3, dt)
    rig.current.rotation.y = damp(rig.current.rotation.y, state.pointer.x * 0.22, 3, dt)

    // spin with drag inertia: dragging sets the speed, otherwise it eases back to the idle spin
    if (!reduce) {
      spin.current.rotation.y += st.spin * dt
      st.spin = damp(st.spin, st.drag ? 0 : 0.14, 2.2, dt)
    }
    state.camera.lookAt(0, 0, 0)
  })

  return (
    <>
      <group ref={rig}>
        <mesh
          material={coreMat}
          onPointerDown={e => { s.current.drag = true; e.target.setPointerCapture(e.pointerId) }}
          onPointerUp={e => { s.current.drag = false; e.target.releasePointerCapture(e.pointerId) }}
          onPointerMove={e => { if (s.current.drag) s.current.spin = THREE.MathUtils.clamp(e.nativeEvent.movementX * 0.35, -6, 6) }}
          onPointerOver={() => (gl.domElement.style.cursor = 'grab')}
          onPointerOut={() => { gl.domElement.style.cursor = 'auto'; s.current.drag = false }}
        >
          <sphereGeometry args={[R * 0.995, 64, 64]} />
        </mesh>
        <mesh material={atmoMat} raycast={() => null}>
          <sphereGeometry args={[R * 1.2, 64, 64]} />
        </mesh>

        {/* axial tilt (23°) -> spin -> everything that belongs to the surface */}
        <group rotation={[0, 0, 0.41]}>
          <group ref={spin}>
            {dotsGeo && <points geometry={dotsGeo} material={dotsMat} frustumCulled={false} />}
            {CITY_VEC.map((p, i) => <City key={i} p={p} i={i} reduce={reduce} />)}
            {LINKS.map(([a, b], i) => <Arc key={i} a={a} b={b} idx={i} fire={fire} reduce={reduce} />)}
          </group>
        </group>

        <Orbit radius={2.35} tilt={[0.5, 0, 0.35]} speed={0.45} phase={0} reduce={reduce} />
        <Orbit radius={2.7} tilt={[-0.35, 0, -0.5]} speed={-0.3} phase={2} reduce={reduce} />
      </group>
      <Sparkles count={70} scale={[9, 6, 9]} size={3} speed={reduce ? 0 : 0.35} opacity={0.7} color="#e0f2fe" />
    </>
  )
}

class SceneBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed
      ? <div className="grid h-full w-full place-items-center text-sm text-white/80">3D preview unavailable on this device</div>
      : this.props.children
  }
}

export default function GlobeScene({ reduceMotion = false }) {
  return (
    <SceneBoundary>
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0.9, 10], fov: 35 }} gl={{ alpha: true, antialias: true }}>
        <Suspense fallback={null}>
          <World reduce={reduceMotion} />
        </Suspense>
      </Canvas>
    </SceneBoundary>
  )
}