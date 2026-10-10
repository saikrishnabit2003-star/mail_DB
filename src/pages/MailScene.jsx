import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Lightformer, ContactShadows, Float, Line, RoundedBox } from '@react-three/drei'

const DEG = Math.PI / 180
const seg = THREE.MathUtils.smoothstep // smoothstep(x, min, max) -> 0..1 with eased ends

/* =====================================================================
   1) ENVELOPE — flap opens, a letter slides out, then it all closes again
   ===================================================================== */
function Envelope({ reduce }) {
    const flap = useRef()
    const letter = useRef()
    const flapShape = useMemo(() => {
        const s = new THREE.Shape()
        s.moveTo(-1.2, 0)
        s.lineTo(1.2, 0)
        s.lineTo(0, -0.85)
        s.closePath()
        return s
    }, [])

    useFrame(({ clock }) => {
        const t = reduce ? 0.5 : (clock.elapsedTime % 6) / 6 // 0..1 loop every 6 s
        const open = seg(t, 0, 0.15) - seg(t, 0.85, 1) // flap: open early, close at the end
        const rise = seg(t, 0.15, 0.45) - seg(t, 0.6, 0.85) // letter: slide out, hold, slide back
        flap.current.rotation.x = open * 2.7
        letter.current.position.y = 0.05 + rise * 0.95
    })

    return (
        <Float speed={1.5} rotationIntensity={0.15} floatIntensity={0.5}>
            <group rotation={[0, -0.25, 0]}>
                {/* the letter sits INSIDE the body, so the body hides it until it rises above the top edge */}
                <mesh ref={letter} position={[0, 0.05, 0]}>
                    <planeGeometry args={[2, 1.2]} />
                    <meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} />
                    {[0, 1, 2].map(i => (
                        <mesh key={i} position={[0, 0.3 - i * 0.22, 0.002]}>
                            <planeGeometry args={[1.4, 0.07]} />
                            <meshBasicMaterial color="#94a3b8" />
                        </mesh>
                    ))}
                </mesh>
                <RoundedBox args={[2.4, 1.5, 0.06]} radius={0.02} smoothness={3}>
                    <meshStandardMaterial color="#f8fafc" roughness={0.45} />
                </RoundedBox>
                {/* flap: its group origin is the top edge = the hinge */}
                <group ref={flap} position={[0, 0.75, 0.035]}>
                    <mesh>
                        <shapeGeometry args={[flapShape]} />
                        <meshStandardMaterial color="#c7d2fe" roughness={0.4} side={THREE.DoubleSide} />
                    </mesh>
                </group>
            </group>
        </Float>
    )
}

/* =====================================================================
   2) PAPER PLANE — flies a looping path, dashed trail shows the route
   ===================================================================== */
function PaperPlane({ reduce }) {
    const plane = useRef()
    const curve = useMemo(
        () =>
            new THREE.CatmullRomCurve3(
                [[-3, 0, 0], [-1.5, 1, 2], [1.5, 0.2, 2.2], [3, 1.2, 0], [1.5, 0, -2.2], [-1.5, 0.8, -2]].map(p => new THREE.Vector3(...p)),
                true // closed loop
            ),
        []
    )
    const trail = useMemo(() => curve.getPoints(200), [curve])

    // 5 triangles built by hand: nose, tail, wing tips, keel
    const geo = useMemo(() => {
        const N = [0, 0, 1.3], C = [0, 0, -0.9], T = [0, -0.18, -0.9], L = [-0.8, 0.14, -0.9], R = [0.8, 0.14, -0.9]
        const g = new THREE.BufferGeometry()
        g.setAttribute('position', new THREE.Float32BufferAttribute([...N, ...L, ...C, ...N, ...C, ...R, ...N, ...C, ...T], 3))
        g.computeVertexNormals()
        return g
    }, [])

    useFrame(({ clock }) => {
        const u = reduce ? 0.1 : (clock.elapsedTime * 0.045) % 1
        plane.current.position.copy(curve.getPointAt(u))
        plane.current.lookAt(curve.getPointAt((u + 0.01) % 1)) // nose (+z) faces the direction of travel
    })

    return (
        <group position={[0, 1, 0]}>
            <Line points={trail} color="white" lineWidth={1.5} dashed dashSize={0.18} gapSize={0.12} transparent opacity={0.6} />
            <mesh ref={plane} geometry={geo}>
                <meshStandardMaterial color="#ffffff" roughness={0.5} side={THREE.DoubleSide} flatShading />
            </mesh>
        </group>
    )
}

/* =====================================================================
   3) GLOBE — emails travel along arcs between cities
   ===================================================================== */
const R = 1.6
const toVec = (lat, lon, r = R) => {
    const phi = (90 - lat) * DEG
    const theta = (lon + 180) * DEG
    return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta))
}
const CITIES = [
    [37.7, -122.4], [40.7, -74], [51.5, -0.1], [19.1, 72.9], [1.35, 103.8], [-33.9, 151.2], [-23.5, -46.6],
]
const LINKS = [[0, 2], [1, 3], [2, 4], [3, 5], [6, 1], [4, 0], [5, 2]]

function Packet({ curve, speed, offset, reduce }) {
    const ref = useRef()
    useFrame(({ clock }) => {
        const u = reduce ? 0.5 : (clock.elapsedTime * speed + offset) % 1
        ref.current.position.copy(curve.getPoint(u))
    })
    return (
        <mesh ref={ref}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
    )
}

function Globe({ reduce }) {
    const group = useRef()
    const arcs = useMemo(
        () =>
            LINKS.map(([a, b]) => {
                const A = toVec(...CITIES[a]), B = toVec(...CITIES[b])
                const mid = A.clone().add(B).multiplyScalar(0.5).normalize().multiplyScalar(R * (1 + A.distanceTo(B) * 0.22))
                return new THREE.QuadraticBezierCurve3(A, mid, B) // control point lifts the arc above the surface
            }),
        []
    )
    useFrame((_, dt) => {
        if (!reduce) group.current.rotation.y += dt * 0.15
    })
    return (
        <group ref={group} position={[0, 1.2, 0]}>
            <mesh>
                <sphereGeometry args={[R, 64, 64]} />
                <meshPhysicalMaterial color="#1e3a8a" roughness={0.25} metalness={0.2} transparent opacity={0.85} clearcoat={1} />
            </mesh>
            <mesh>
                <sphereGeometry args={[R * 1.003, 32, 24]} />
                <meshBasicMaterial color="#93c5fd" wireframe transparent opacity={0.25} />
            </mesh>
            {CITIES.map((c, i) => (
                <mesh key={i} position={toVec(...c, R * 1.01)}>
                    <sphereGeometry args={[0.04, 12, 12]} />
                    <meshBasicMaterial color="#a7f3d0" toneMapped={false} />
                </mesh>
            ))}
            {arcs.map((curve, i) => (
                <group key={i}>
                    <Line points={curve.getPoints(48)} color="#e0f2fe" lineWidth={1.2} transparent opacity={0.7} />
                    <Packet curve={curve} speed={0.12 + i * 0.01} offset={i * 0.31} reduce={reduce} />
                </group>
            ))}
        </group>
    )
}

/* ===================================================================== */
const SETUP = {
    envelope: { Scene: Envelope, cam: [0, 0.4, 5.5], target: [0, 0.4, 0], spin: false, y: 0.5 },
    plane: { Scene: PaperPlane, cam: [0, 3.2, 8], target: [0, 1, 0], spin: true, y: -1 },
    globe: { Scene: Globe, cam: [0, 2.2, 6.2], target: [0, 1.2, 0], spin: false, y: 0 },
}

export default function MailScene({ variant = 'envelope', reduceMotion = false }) {
    const { Scene, cam, target, spin, y } = SETUP[variant]
    return (
        <Canvas dpr={[1, 2]} camera={{ position: cam, fov: 35 }}>
            <Suspense fallback={null}>
                <Environment resolution={128}>
                    <Lightformer form="rect" intensity={4} position={[0, 10, 3]} scale={[12, 12, 1]} onUpdate={s => s.lookAt(0, 1, 0)} />
                    <Lightformer form="rect" intensity={2.5} position={[-8, 3, 2]} scale={[3, 10, 1]} onUpdate={s => s.lookAt(0, 1, 0)} />
                    <Lightformer form="rect" intensity={2} position={[8, 3, -2]} scale={[3, 10, 1]} onUpdate={s => s.lookAt(0, 1, 0)} />
                </Environment>
                <directionalLight position={[3, 6, 4]} intensity={0.6} />
                <Scene reduce={reduceMotion} />
                <ContactShadows position={[0, y, 0]} opacity={0.35} scale={9} blur={2.6} far={3} />
            </Suspense>
            <OrbitControls
                target={target}
                enablePan={false}
                enableZoom={false}
                enableDamping
                autoRotate={spin && !reduceMotion}
                autoRotateSpeed={0.8}
                minPolarAngle={0.9}
                maxPolarAngle={1.7}
                minAzimuthAngle={variant === 'envelope' ? -0.7 : -Infinity}
                maxAzimuthAngle={variant === 'envelope' ? 0.7 : Infinity}
            />
        </Canvas>
    )
}