import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import './GameCanvas.css'

const TILE_SIZE = 2.25

export default function GameCanvas({ gameState, levelData, width = 800, height = 500 }) {
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)
  const droneRef = useRef(null)
  const rotorRef = useRef([])
  const stateRef = useRef(gameState)
  const levelRef = useRef(levelData)

  stateRef.current = gameState
  levelRef.current = levelData

  useEffect(() => {
    if (!canvasRef.current) return undefined

    const canvas = canvasRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x071018)
    scene.fog = new THREE.Fog(0x071018, 18, 38)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100)
    camera.position.set(8, 9, 11)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height, false)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15

    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.enablePan = false
    controls.minDistance = 7
    controls.maxDistance = 20
    controls.maxPolarAngle = Math.PI / 2.15
    controls.target.set(0, 0, 0)

    scene.add(new THREE.HemisphereLight(0xb7e8ff, 0x101b20, 1.8))
    const keyLight = new THREE.DirectionalLight(0xd9f6a6, 3.2)
    keyLight.position.set(5, 10, 5)
    keyLight.castShadow = true
    scene.add(keyLight)
    const rimLight = new THREE.PointLight(0x37d6ff, 12, 18)
    rimLight.position.set(-5, 4, -4)
    scene.add(rimLight)

    const world = new THREE.Group()
    scene.add(world)
    createWorld(world, levelRef.current)
    droneRef.current = createDrone(scene)

    const particles = createParticles(scene)
    const animationStart = performance.now()
    let frameId

    const animate = () => {
      const elapsed = (performance.now() - animationStart) / 1000
      frameId = requestAnimationFrame(animate)
      controls.update()
      particles.rotation.y = elapsed * 0.025
      particles.position.y = Math.sin(elapsed * 0.4) * 0.15
      if (droneRef.current) {
        const targetAltitude = stateRef.current?.drone?.altitude || 0
        const hoverHeight = targetAltitude > 0 ? 1.25 + targetAltitude * 0.45 : 0.72
        droneRef.current.position.y = hoverHeight + Math.sin(elapsed * 3) * (targetAltitude > 0 ? 0.08 : 0.025)
        rotorRef.current.forEach((rotor) => { rotor.rotation.y += 0.45 })
        droneRef.current.getObjectByName('signal').material.emissiveIntensity = 2 + Math.sin(elapsed * 5)
      }
      renderer.render(scene, camera)
    }
    animate()

    const resizeObserver = new ResizeObserver(() => {
      const bounds = canvas.parentElement.getBoundingClientRect()
      const nextWidth = Math.max(bounds.width, 320)
      const nextHeight = Math.max(bounds.height, 300)
      camera.aspect = nextWidth / nextHeight
      camera.updateProjectionMatrix()
      renderer.setSize(nextWidth, nextHeight, false)
    })
    resizeObserver.observe(canvas.parentElement)

    return () => {
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      controls.dispose()
      renderer.dispose()
      scene.clear()
    }
  }, [height, width, levelData])

  useEffect(() => {
    if (!droneRef.current || !gameState?.drone) return
    const targetX = (gameState.drone.x - 1) * 2.25
    const targetZ = (gameState.drone.y - 0.5) * 2.25
    droneRef.current.position.x = targetX
    droneRef.current.position.z = targetZ
    const angle = { north: Math.PI, south: 0, east: Math.PI / 2, west: -Math.PI / 2 }
    droneRef.current.rotation.y = angle[gameState.drone.facing] ?? Math.PI / 2
  }, [gameState])

  return (
    <section className="game-canvas-container">
      <div className="scene-heading">
        <div>
          <span className="scene-kicker">LIVE SIMULATION</span>
          <h3>Harvest Protocol</h3>
        </div>
        <div className="scene-stats">
          <span><b>{gameState?.steps ?? 0}</b> / {levelData?.max_steps ?? 0} steps</span>
          <span className={`scene-status ${gameState?.status || 'running'}`}>{gameState?.status || 'booting'}</span>
        </div>
      </div>
      <div className="scene-viewport">
        <canvas ref={canvasRef} className="game-canvas" />
        <div className="scene-help">Drag to orbit <span>•</span> Scroll to zoom</div>
      </div>
    </section>
  )


function createWorld(world, levelData) {
  const cells = levelData?.grid_cells || []
  const cellColors = {
    grass: 0x327b5d,
    wheat: 0xa9c94b,
    bomb: 0x713c88,
    water: 0x176184,
    wall: 0x475761,
  }
  cells.forEach((cell) => {
    const material = new THREE.MeshStandardMaterial({
      color: cellColors[cell.type] || 0x1c634e,
      roughness: 0.76,
      metalness: 0.08,
      emissive: cell.type === 'wheat' ? 0x496d16 : 0x0d2a20,
      emissiveIntensity: cell.type === 'wheat' ? 0.7 : 0.42,
    })
    const tile = new THREE.Mesh(new THREE.BoxGeometry(TILE_SIZE * 0.94, 0.28, TILE_SIZE * 0.94), material)
    tile.position.set((cell.x - 1) * TILE_SIZE, 0.12, (cell.y - 0.5) * TILE_SIZE)
    tile.castShadow = true
    tile.receiveShadow = true
    world.add(tile)
    const tileEdge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(TILE_SIZE * 0.94, 0.28, TILE_SIZE * 0.94)),
      new THREE.LineBasicMaterial({ color: 0x9be4c2, transparent: true, opacity: 0.22 })
    )
    tileEdge.position.copy(tile.position)
    world.add(tileEdge)
    addCellDetail(world, cell, tile.position)
  })
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(8.8, 0.45, 5.9),
    new THREE.MeshStandardMaterial({ color: 0x101d22, roughness: 0.7, metalness: 0.25 })
  )
  base.position.y = -0.52
  base.receiveShadow = true
  world.add(base)
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(8.8, 0.45, 5.9)),
    new THREE.LineBasicMaterial({ color: 0x39d6dc, transparent: true, opacity: 0.35 })
  )
  edge.position.y = -0.52
  world.add(edge)
}

function addCellDetail(world, cell, position) {
  if (cell.type === 'wheat') {
    for (let index = 0; index < 5; index += 1) {
      const stalk = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.65, 5),
        new THREE.MeshStandardMaterial({ color: 0xf0dc68, emissive: 0x554313, emissiveIntensity: 0.35 })
      )
      stalk.position.set(position.x - 0.5 + index * 0.22, 0.47, position.z + (index % 2) * 0.3 - 0.3)
      stalk.rotation.z = (index - 2) * 0.08
      world.add(stalk)
    }
  }
  if (cell.type === 'bomb') {
    const bomb = new THREE.Mesh(
      new THREE.SphereGeometry(0.48, 20, 12),
      new THREE.MeshStandardMaterial({ color: 0x17101f, emissive: 0x6d24a4, emissiveIntensity: 1.1, metalness: 0.4 })
    )
    bomb.position.set(position.x, 0.62, position.z)
    world.add(bomb)
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.65, 0.035, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xff66e8, transparent: true, opacity: 0.75 })
    )
    ring.rotation.x = Math.PI / 2
    ring.position.copy(bomb.position)
    world.add(ring)
  }
}

function createDrone(scene) {
  const drone = new THREE.Group()
  drone.name = 'drone'
  drone.scale.setScalar(1.35)
  drone.position.set(-TILE_SIZE, 0.72, -TILE_SIZE / 2)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.3, 0.65),
    new THREE.MeshStandardMaterial({ color: 0xe8fbff, emissive: 0x2c91ad, emissiveIntensity: 0.45, metalness: 0.7, roughness: 0.25 })
  )
  body.castShadow = true
  drone.add(body)
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 10),
    new THREE.MeshStandardMaterial({ color: 0xff5d8f, emissive: 0xff2364, emissiveIntensity: 2.2 })
  )
  core.name = 'signal'
  core.position.y = 0.05
  drone.add(core)
  const armMaterial = new THREE.MeshStandardMaterial({ color: 0x24424a, metalness: 0.8, roughness: 0.2 })
  rotorRef.current = []
  ;[[-0.62, 0, -0.48], [0.62, 0, -0.48], [-0.62, 0, 0.48], [0.62, 0, 0.48]].forEach(([x, y, z]) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.8), armMaterial)
    arm.rotation.z = Math.PI / 2
    arm.position.set(x / 2, y, z / 2)
    drone.add(arm)
    const rotor = new THREE.Group()
    rotor.position.set(x, 0.12, z)
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 12), armMaterial)
    hub.rotation.x = Math.PI / 2
    rotor.add(hub)
    const bladeMaterial = new THREE.MeshBasicMaterial({ color: 0x7ce8ff, transparent: true, opacity: 0.8 })
    ;[-1, 1].forEach((direction) => {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.025, 0.06), bladeMaterial)
      blade.rotation.y = direction * 0.15
      rotor.add(blade)
    })
    drone.add(rotor)
    rotorRef.current.push(rotor)
  })
  scene.add(drone)
  return drone
}

function createParticles(scene) {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(240 * 3)
  for (let index = 0; index < positions.length; index += 3) {
    positions[index] = (Math.random() - 0.5) * 22
    positions[index + 1] = Math.random() * 9 - 1
    positions[index + 2] = (Math.random() - 0.5) * 18
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({ color: 0x8be6cf, size: 0.035, transparent: true, opacity: 0.7 })
  const particles = new THREE.Points(geometry, material)
  scene.add(particles)
  return particles
}
  return (
    <div className="game-canvas-container">
      <h3>Game Canvas</h3>
      <canvas ref={canvasRef} className="game-canvas" />
    </div>
  )
}
