import { Component, Suspense, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Lightformer, ContactShadows, RoundedBox, Float } from '@react-three/drei'

/* ------------------------------------------------------------------
   Constants. World units: 1 unit ≈ 10 cm, so the 15.6" body is 3.6 × 2.4.
   ------------------------------------------------------------------ */
const DEG = Math.PI / 180
const OPEN_ANGLE = 110 // lid angle in degrees
const KEY = 0.2 // one keyboard "unit" in world space

/* ---- keyboard layout: "Label*width" tokens, each row sums to 15 units ---- */
const ROWS = [
  'Esc F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12 Prt Del',
  '` 1 2 3 4 5 6 7 8 9 0 - = Bksp*2',
  'Tab*1.5 Q A R R O W U I O P [ ] \\*1.5',
  "Caps*1.75 A S D F G H J K L ; ' Enter*2.25",
  'Shift*2.25 Z X C V B N M , . / Shift*2.75',
  'Ctrl Fn Win Alt Space*6 Alt Ctrl ◂ ▴ ▾',
]
const KEYS = ROWS.flatMap((row, r) => {
  let x = 0
  return row.split(' ').map(tok => {
    const [label, w] = tok.split('*')
    const width = w ? parseFloat(w) : 1
    const key = { label, width, cx: x + width / 2, row: r } // cx = centre, in key units
    x += width
    return key
  })
})

/* ---- draw on a 2D canvas, wrap it as a texture ---- */
function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace // colour maps must be flagged as sRGB
  t.anisotropy = 8 // sharper at grazing angles
  return t
}

function drawScreen(g, w, h) {
  const bg = g.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, '#1e40af')
  bg.addColorStop(1, '#06b6d4')
  g.fillStyle = bg
  g.fillRect(0, 0, w, h)

  g.fillStyle = 'rgba(255,255,255,0.93)'
  g.beginPath()
  g.roundRect(140, 110, 1000, 500, 36)
  g.fill()

  g.fillStyle = '#0f172a'
  g.font = '700 58px Arial'
  g.fillText('MailEngine', 200, 210)

  // mini pipeline: Contact -> Automation -> Delivered
  const nodes = [
    [300, '#38bdf8', 'Contact'],
    [640, '#818cf8', 'Automation'],
    [980, '#34d399', 'Delivered'],
  ]
  g.strokeStyle = '#cbd5e1'
  g.lineWidth = 10
  g.beginPath()
  g.moveTo(300, 390)
  g.lineTo(980, 390)
  g.stroke()
  g.textAlign = 'center'
  nodes.forEach(([x, color, label], i) => {
    g.fillStyle = color
    g.beginPath()
    g.arc(x, 390, 58, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#fff'
    g.font = '700 46px Arial'
    g.fillText(String(i + 1), x, 408)
    g.fillStyle = '#334155'
    g.font = '600 30px Arial'
    g.fillText(label, x, 500)
  })
  g.fillStyle = '#64748b'
  g.font = '500 28px Arial'
  g.fillText('12,480 emails delivered this week', 640, 568)
}

function drawLegends(g) {
  g.fillStyle = '#e9ecf0'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  KEYS.forEach(k => {
    if (k.label === 'Space') return
    g.font = `600 ${k.label.length > 1 ? 21 : 34}px Arial`
    // 600 px per world unit; key centre -> pixel
    g.fillText(k.label, k.cx * KEY * 600, 60 + k.row * 120)
  })
}

function drawBolt(g) {
  g.fillStyle = '#f2f4f7'
  g.beginPath()
  g.moveTo(150, 20)
  g.lineTo(60, 150)
  g.lineTo(120, 150)
  g.lineTo(100, 236)
  g.lineTo(196, 100)
  g.lineTo(136, 100)
  g.closePath()
  g.fill()
}

/* ---- 82 keys drawn with ONE draw call (instancing) ---- */
function Keys({ material }) {
  const ref = useRef()
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D()
    KEYS.forEach((k, i) => {
      dummy.position.set(-1.5 + k.cx * KEY, 0.225, -1.0 + k.row * KEY)
      dummy.scale.set(k.width * KEY - 0.024, 1, 1)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, KEYS.length]} material={material}>
      <boxGeometry args={[1, 0.05, 0.17]} />
    </instancedMesh>
  )
}

/* ------------------------------------------------------------------
   The laptop itself
   ------------------------------------------------------------------ */
function Laptop() {
  // materials & textures are created once and shared
  const m = useMemo(
    () => ({
      alu: new THREE.MeshStandardMaterial({ color: '#cfd2d7', metalness: 1, roughness: 0.3 }),
      dark: new THREE.MeshStandardMaterial({ color: '#121316', roughness: 0.6, metalness: 0.2 }),
      key: new THREE.MeshStandardMaterial({ color: '#1c1e22', roughness: 0.55, metalness: 0.1 }),
      pad: new THREE.MeshStandardMaterial({ color: '#d9dce0', metalness: 0.5, roughness: 0.12 }),
      hinge: new THREE.MeshStandardMaterial({ color: '#3a3d44', metalness: 0.9, roughness: 0.35 }),
    }),
    []
  )
  const tex = useMemo(
    () => ({
      screen: canvasTexture(1280, 720, drawScreen),
      legends: canvasTexture(1800, 720, drawLegends),
      logo: canvasTexture(256, 256, drawBolt),
    }),
    []
  )

  return (
    <group>
      {/* ===== BASE ===== */}
      <RoundedBox args={[3.6, 0.14, 2.4]} radius={0.06} smoothness={4} position={[0, 0.13, 0]} material={m.alu} />
      {/* keyboard well */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2015, -0.46]} material={m.dark}>
        <planeGeometry args={[3.1, 1.28]} />
      </mesh>
      <Keys material={m.key} />
      {/* legends (plane 3 × 1.2 matching the 1800 × 720 canvas) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2515, -0.5]}>
        <planeGeometry args={[3, 1.2]} />
        <meshBasicMaterial map={tex.legends} transparent opacity={0.85} />
      </mesh>
      {/* trackpad */}
      <RoundedBox args={[1.3, 0.01, 0.8]} radius={0.004} smoothness={2} position={[0, 0.205, 0.72]} material={m.pad} />
      {/* feet */}
      {[[-1.4, -0.85], [1.4, -0.85], [-1.4, 0.85], [1.4, 0.85]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.03, z]} material={m.dark}>
          <cylinderGeometry args={[0.1, 0.1, 0.06, 20]} />
        </mesh>
      ))}
      {/* ports: [side, z, height, length] */}
      {[[-1, -0.55, 0.05, 0.1], [-1, -0.15, 0.05, 0.1], [-1, 0.25, 0.04, 0.2], [1, -0.5, 0.05, 0.2], [1, -0.1, 0.05, 0.2], [1, 0.3, 0.04, 0.2]].map(
        ([s, z, h, l], i) => (
          <mesh key={i} position={[s * 1.795, 0.13, z]} material={m.dark}>
            <boxGeometry args={[0.03, h, l]} />
          </mesh>
        )
      )}

      {/* ===== LID: a group whose ORIGIN is the hinge line ===== */}
      <group position={[0, 0.21, -1.2]} rotation={[-OPEN_ANGLE * DEG, 0, 0]}>
        {/* the lid extends away from the pivot along +z */}
        <RoundedBox args={[3.6, 0.07, 2.3]} radius={0.03} smoothness={4} position={[0, 0, 1.15]} material={m.alu} />
        {/* bezel + screen on the underside of the lid (faces the user once opened) */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.0355, 1.15]}>
          <planeGeometry args={[3.52, 2.2]} />
          <meshStandardMaterial color="#050506" roughness={0.25} metalness={0.3} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.0365, 1.17]}>
          <planeGeometry args={[3.44, 1.935]} />
          <meshBasicMaterial map={tex.screen} toneMapped={false} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.0368, 2.19]}>
          <circleGeometry args={[0.025, 16]} />
          <meshStandardMaterial color="#1a2a3a" roughness={0.1} metalness={0.8} />
        </mesh>
        {/* logo on the outer lid. rotation z = π flips it so it reads upright from behind */}
        <mesh rotation={[-Math.PI / 2, 0, Math.PI]} position={[0, 0.0365, 1.15]}>
          <planeGeometry args={[0.6, 0.6]} />
          <meshStandardMaterial map={tex.logo} transparent metalness={0.95} roughness={0.18} />
        </mesh>
        {/* hinge barrels */}
        {[-1.05, 1.05].map(x => (
          <mesh key={x} rotation={[0, 0, Math.PI / 2]} position={[x, 0, 0.02]} material={m.hinge}>
            <cylinderGeometry args={[0.075, 0.075, 0.9, 24]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------
   Studio lighting built from emissive panels (no HDR file download)
   ------------------------------------------------------------------ */
function Studio() {
  const aim = self => self.lookAt(0, 1, 0)
  return (
    <Environment resolution={256}>
      <color attach="background" args={['#443f3aff']} />
      <Lightformer form="rect" intensity={5} position={[0, 15, 2]} scale={[14, 14, 1]} onUpdate={aim} />
      <Lightformer form="rect" intensity={3.6} position={[-14, 6, 2]} scale={[4, 14, 1]} onUpdate={aim} />
      <Lightformer form="rect" intensity={2.6} position={[14, 6, -2]} scale={[4, 14, 1]} onUpdate={aim} />
      <Lightformer form="rect" intensity={2.2} position={[0, 4, -16]} scale={[12, 3, 1]} onUpdate={aim} />
      <Lightformer form="rect" intensity={1.3} position={[0, 3, 16]} scale={[10, 6, 1]} onUpdate={aim} />
    </Environment>
  )
}

/* If WebGL is unavailable, show a quiet fallback instead of crashing the page */
class SceneBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <div className="grid h-full w-full place-items-center rounded-3xl border border-white/30 bg-white/10 text-sm text-white/80">
        3D preview unavailable on this device
      </div>
    ) : (
      this.props.children
    )
  }
}

export default function LaptopScene({ reduceMotion = false }) {
  return (
    <SceneBoundary>
      <Canvas dpr={[1, 2]} camera={{ position: [5.2, 2.9, 7.4], fov: 32 }}>
        <Suspense fallback={null}>
          <Studio />
          <directionalLight position={[4, 8, 5]} intensity={0.5} />
          <Float speed={1.4} rotationIntensity={0.08} floatIntensity={0.35} floatingRange={[0, 0.12]}>
            <Laptop />
          </Float>
          <ContactShadows position={[0, 0, 0]} opacity={0.45} scale={10} blur={0.6} far={3.5} />
        </Suspense>
        <OrbitControls
          target={[0, 1.10, 0]}
          enablePan={false}
          enableZoom={true} /* keep page scrolling on a login screen */
          enableDamping
          dampingFactor={0.07}
          rotateSpeed={0.8}
          minPolarAngle={0.9}
          maxPolarAngle={1.35}
          autoRotate={!reduceMotion}
          autoRotateSpeed={1.2}
          minDistance={6}
          maxDistance={12}
          minZoom={1}
          maxZoom={1}
        />
      </Canvas>
    </SceneBoundary>
  )
}