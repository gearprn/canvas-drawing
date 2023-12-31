function startup() {
  const el = document.getElementById('canvas')
  el.addEventListener('touchstart', handleStart)
  el.addEventListener('touchend', handleEnd)
  el.addEventListener('touchcancel', handleCancel)
  el.addEventListener('touchmove', handleMove)

  el.addEventListener('mousedown', handleMouseDown)
  el.addEventListener('mousemove', handleMouseMove)
  el.addEventListener('mouseup', handleMouseUp)

  el.addEventListener('wheel', (e) => adjustZoom(e.deltaY * SCROLL_SENSITIVITY))

  drawCanvas()
}

var cameraZoom = 1
let cameraOffset = { x: 400 / 2, y: 400 / 2 }
let dragStart = { x: 0, y: 0 }
let isDragging = false

function drawCanvas() {
  const canvas = document.getElementById('canvas')
  const ctx = canvas.getContext('2d')

  canvas.width = 400
  canvas.height = 400

  ctx.scale(cameraZoom, cameraZoom)
  ctx.translate(-400 / 2 + cameraOffset.x, -400 / 2 + cameraOffset.y)

  ctx.fillStyle = '#000000'
  touchesPaths.forEach(
    (t) => {
      t.paths.forEach((p, idx) => {
        // console.log('🚀 ~ file: script.js:37 ~ t.paths.forEach ~ idx:', idx)
        if (idx > 2) {
          options = {
            penColor: 'black',
            dotSize: '0',
            minWidth: '0.5',
            maxWidth: '2.5',
            velocityFilterWeight: '0.7',
            compositeOperation: 'source-over',
          }
          const widths = calculateCurveWidths(
            t.paths[idx - 1],
            t.paths[idx],
            options
          )
          const curve = BezierFromPoints(
            t.paths.slice(idx - 3, idx + 1),
            widths
          )
          if (curve) {
            drawCurve(curve, options)
          }
        }
      })
    }
    // if (t.paths.length > 3) {
    // }
  )
  requestAnimationFrame(drawCanvas)
}

document.addEventListener('DOMContentLoaded', startup)

const ongoingTouches = []
let touchesPaths = []
let lastVelocity = 0
let lastWidth = 0
const pathsBtn = document.getElementById('paths')
pathsBtn.onclick = () => {
  console.log('🚀 ~ file: script.js:23 ~ pathsBtn:', touchesPaths)
}

const scaleUpBtn = document.getElementById('scale-up')
scaleUpBtn.onclick = () => {
  cameraZoom *= 1.25
  console.log('🚀 ~ file: script.js:45 ~ cameraZoom:', cameraZoom)
}

const scaleDownBtn = document.getElementById('scale-down')
scaleDownBtn.onclick = () => {
  if (cameraZoom * 0.75 > 1) {
    cameraZoom *= 0.75
  } else {
    cameraZoom = 1
  }
  console.log('🚀 ~ file: script.js:51 ~ cameraZoom:', cameraZoom)
}

var isDragMode = false
const dragBtn = document.getElementById('drag')
dragBtn.onclick = () => {
  isDragMode = !isDragMode
  document.getElementById('drag-result').innerHTML = `drag: ${isDragMode}`
}

var isEraserMode = false
const eraserBtn = document.getElementById('eraser')
eraserBtn.onclick = () => {
  isEraserMode = !isEraserMode
  document.getElementById('eraser-result').innerHTML = `eraser: ${isEraserMode}`
}

function updatePathsOfTouch(event, identifier, x, y) {
  const idx = touchesPaths.findIndex((v) => v.identifier == identifier)
  const pressure =
    event.pressure !== undefined
      ? event.pressure
      : event.force !== undefined
      ? event.force
      : 0
  if (idx < 0) {
    touchesPaths.push({
      identifier: identifier,
      paths: [
        {
          x: x,
          y: y,
          pressure: pressure,
          time: new Date().getTime(),
        },
      ],
    })
  } else {
    touchesPaths[idx].paths.push({
      x: x,
      y: y,
      pressure: pressure,
      time: new Date().getTime(),
    })
  }
}

function getTouchPaths(identifier) {
  return touchesPaths.find((v) => v.identifier == identifier)
}

function removeTouchPaths(identifier) {
  const idx = touchesPaths.findIndex((v) => v.identifier == identifier)
  touchesPaths[idx].paths = []
}

function updateTouchPaths(identifier, touch) {
  const idx = touchesPaths.findIndex((v) => v.identifier == identifier)
  touchesPaths[idx] = touch
}

function calculateCurveWidths(startPoint, endPoint, options) {
  const velocity =
    options.velocityFilterWeight * velocityFrom(startPoint, endPoint) +
    (1 - options.velocityFilterWeight) * lastVelocity

  const newWidth = strokeWidth(velocity, options)

  const widths = {
    end: newWidth,
    start: lastWidth,
  }

  lastVelocity = velocity
  lastWidth = newWidth

  return widths
}

function velocityFrom(startPoint, endPoint) {
  return endPoint.time !== startPoint.time
    ? distanceTo(startPoint, endPoint) / (endPoint.time - startPoint.time)
    : 0
}

function distanceTo(startPoint, endPoint) {
  return Math.sqrt(
    Math.pow(endPoint.x - startPoint.x, 2) +
      Math.pow(endPoint.y - startPoint.y, 2)
  )
}

function strokeWidth(velocity, options) {
  return Math.max(options.maxWidth / (velocity + 1), options.minWidth)
}

function BezierFromPoints(pahts, widths) {
  const c2 = calculateControlPoints(pahts[0], pahts[1], pahts[2]).c2
  const c3 = calculateControlPoints(pahts[1], pahts[2], pahts[3]).c1
  return {
    startPoint: pahts[1],
    control2: c2,
    control1: c3,
    endPoint: pahts[2],
    startWidth: widths.start,
    endWidth: widths.end,
  }
}

function calculateControlPoints(s1, s2, s3) {
  const dx1 = s1.x - s2.x
  const dy1 = s1.y - s2.y
  const dx2 = s2.x - s3.x
  const dy2 = s2.y - s3.y

  const m1 = { x: (s1.x + s2.x) / 2.0, y: (s1.y + s2.y) / 2.0 }
  const m2 = { x: (s2.x + s3.x) / 2.0, y: (s2.y + s3.y) / 2.0 }

  const l1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
  const l2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)

  const dxm = m1.x - m2.x
  const dym = m1.y - m2.y

  const k = l2 / (l1 + l2)
  const cm = { x: m2.x + dxm * k, y: m2.y + dym * k }

  const tx = s2.x - cm.x
  const ty = s2.y - cm.y

  return {
    c1: { x: m1.x + tx, y: m1.y + ty },
    c2: { x: m2.x + tx, y: m2.y + ty },
  }
}

// Calculate parametric value of x or y given t and the four point coordinates of a cubic bezier curve.
function point(t, start, c1, c2, end) {
  return (
    start * (1.0 - t) * (1.0 - t) * (1.0 - t) +
    3.0 * c1 * (1.0 - t) * (1.0 - t) * t +
    3.0 * c2 * (1.0 - t) * t * t +
    end * t * t * t
  )
}

function curveLength(curve) {
  const steps = 10
  let length = 0
  let px
  let py

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const cx = point(
      t,
      curve.startPoint.x,
      curve.control1.x,
      curve.control2.x,
      curve.endPoint.x
    )
    const cy = point(
      t,
      curve.startPoint.y,
      curve.control1.y,
      curve.control2.y,
      curve.endPoint.y
    )
    if (i > 0) {
      const xdiff = cx - px
      const ydiff = cy - py

      length += Math.sqrt(xdiff * xdiff + ydiff * ydiff)
    }
    px = cx
    py = cy
  }
  return length
}

function drawCurveSegment(x, y, width) {
  const el = document.getElementById('canvas')
  const ctx = el.getContext('2d')
  ctx.moveTo(x, y)
  ctx.arc(x, y, width, 0, 2 * Math.PI, false)
}

function drawCurve(curve, options) {
  const el = document.getElementById('canvas')
  const ctx = el.getContext('2d')
  const widthDelta = curve.endWidth - curve.startWidth
  // '2' is just an arbitrary number here. If only length is used, then
  // there are gaps between curve segments :/
  const drawSteps = Math.ceil(curveLength(curve)) * 2

  ctx.beginPath()
  ctx.fillStyle = options.penColor

  for (let i = 0; i < drawSteps; i += 1) {
    // Calculate the Bezier (x, y) coordinate for this step.
    const t = i / drawSteps
    const tt = t * t
    const ttt = tt * t
    const u = 1 - t
    const uu = u * u
    const uuu = uu * u

    let x = uuu * curve.startPoint.x
    x += 3 * uu * t * curve.control1.x
    x += 3 * u * tt * curve.control2.x
    x += ttt * curve.endPoint.x

    let y = uuu * curve.startPoint.y
    y += 3 * uu * t * curve.control1.y
    y += 3 * u * tt * curve.control2.y
    y += ttt * curve.endPoint.y

    const width = Math.min(
      curve.startWidth + ttt * widthDelta,
      options.maxWidth
    )
    drawCurveSegment(x, y, width)
  }
  ctx.closePath()
  ctx.fill()
}

function handleStart(evt) {
  evt.preventDefault()
  const el = document.getElementById('canvas')
  const ctx = el.getContext('2d')
  const touches = evt.changedTouches

  for (let i = 0; i < touches.length; i++) {
    // const copyToucy
    ongoingTouches.push(copyTouch(touches[i]))
    const color = colorForTouch(touches[i])
    ctx.beginPath()
    ctx.arc(touches[i].pageX, touches[i].pageY, 4, 0, 2 * Math.PI, false) // a circle at the start
    ctx.fillStyle = color
    ctx.fill()
    updatePathsOfTouch(
      evt,
      touches[i].identifier,
      touches[i].clientX,
      touches[i].clientY
    )
  }
}

function handleMove(evt) {
  evt.preventDefault()
  const touches = evt.changedTouches
  console.log(touchesPaths)
  for (let i = 0; i < touches.length; i++) {
    const idx = ongoingTouchIndexById(touches[i].identifier)
    if (idx >= 0) {
      updatePathsOfTouch(
        evt,
        touches[i].identifier,
        touches[i].clientX,
        touches[i].clientY
      )
      updateStroke(touches[i].identifier)
      ongoingTouches.splice(idx, 1, copyTouch(touches[i])) // swap in the new touch record
    } else {
      // log("can't figure out which touch to continue")
    }
  }
}

function handleEnd(evt) {
  evt.preventDefault()
  const el = document.getElementById('canvas')
  const ctx = el.getContext('2d')
  const touches = evt.changedTouches

  for (let i = 0; i < touches.length; i++) {
    const color = colorForTouch(touches[i])
    let idx = ongoingTouchIndexById(touches[i].identifier)
    if (idx >= 0) {
      ctx.lineWidth = 4
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(ongoingTouches[idx].pageX, ongoingTouches[idx].pageY)
      ctx.lineTo(touches[i].pageX, touches[i].pageY)
      ctx.fillRect(touches[i].pageX - 4, touches[i].pageY - 4, 8, 8) // and a square at the end
      ongoingTouches.splice(idx, 1) // remove it; we're done
    } else {
      // log("can't figure out which touch to end")
    }
  }
}

function handleCancel(evt) {
  evt.preventDefault()
  const touches = evt.changedTouches

  for (let i = 0; i < touches.length; i++) {
    let idx = ongoingTouchIndexById(touches[i].identifier)
    ongoingTouches.splice(idx, 1) // remove it; we're done
  }
}

let drawningStroke = false
let mouseIdentifier = new Date().getTime()
function handleMouseDown(evt) {
  mouseIdentifier = new Date().getTime()
  // draw line
  if (!isDragMode && !isEraserMode) {
    if (evt.buttons === 1) {
      x = evt.offsetX / cameraZoom - (cameraOffset.x - 200)
      y = evt.offsetY / cameraZoom - (cameraOffset.y - 200)
      updatePathsOfTouch(evt, mouseIdentifier, x, y)
      drawningStroke = true
    }
  } else if (isEraserMode) {
    isDragging = true
  } else if (isDragMode) {
    isDragging = true
    dragStart.x = getEventLocation(evt).x / cameraZoom - cameraOffset.x
    dragStart.y = getEventLocation(evt).y / cameraZoom - cameraOffset.y
  }
}

function handleMouseMove(evt) {
  // draw line
  if (!isDragMode && !isEraserMode) {
    if (drawningStroke) {
      x = evt.offsetX / cameraZoom - (cameraOffset.x - 200)
      y = evt.offsetY / cameraZoom - (cameraOffset.y - 200)
      const touchPaths = getTouchPaths(mouseIdentifier)
      const lastPoint = touchPaths.paths[touchPaths.paths.length - 1]
      const distance = distanceTo(lastPoint, { x: x, y: y })
      if (distance >= 5) {
        updatePathsOfTouch(evt, mouseIdentifier, x, y)
      }
    }
  } else if (isEraserMode) {
    x = evt.offsetX / cameraZoom - (cameraOffset.x - 200)
    y = evt.offsetY / cameraZoom - (cameraOffset.y - 200)
    if (isDragging) {
      touchesPaths = touchesPaths.filter((t) => {
        let isNear = false
        t.paths.forEach((p) => {
          const distance = distanceTo(p, { x: x, y: y })
          if (distance <= 10) {
            isNear = true
          }
        })
        return !isNear
      })
    }
  } else {
    if (isDragging) {
      cameraOffset.x = getEventLocation(evt).x / cameraZoom - dragStart.x
      cameraOffset.y = getEventLocation(evt).y / cameraZoom - dragStart.y
    }
  }
}

function handleMouseUp(evt) {
  if (!isDragMode) {
    if (drawningStroke) {
      drawningStroke = false
    }
  } else if (isEraserMode) {
    isDragging = false
  } else {
    isDragging = false
    initialPinchDistance = null
    lastZoom = cameraZoom
  }
  console.log(
    '🚀 ~ file: script.js:103 ~ updatePathsOfTouch ~ touchesPaths:',
    touchesPaths.length
  )
}

function getEventLocation(e) {
  if (e.touches && e.touches.length == 1) {
    return { x: e.touches[0].offsetX, y: e.touches[0].offsetY }
  } else if (e.offsetX && e.offsetY) {
    return { x: e.offsetX, y: e.offsetY }
  }
}

function colorForTouch(touch) {
  let r = touch.identifier % 16
  let g = Math.floor(touch.identifier / 3) % 16
  let b = Math.floor(touch.identifier / 7) % 16
  r = r.toString(16) // make it a hex digit
  g = g.toString(16) // make it a hex digit
  b = b.toString(16) // make it a hex digit
  const color = `#${r}${g}${b}`
  return color
}

function copyTouch({ identifier, pageX, pageY }) {
  return { identifier, pageX, pageY }
}

function ongoingTouchIndexById(idToFind) {
  for (let i = 0; i < ongoingTouches.length; i++) {
    const id = ongoingTouches[i].identifier

    if (id === idToFind) {
      return i
    }
  }
  return -1 // not found
}

function log(msg) {
  const container = document.getElementById('log')
  container.textContent = `${msg} \n${container.textContent}`
  // console.log(`${msg} \n${container.textContent}`)
}

function updateStroke(identifier) {
  console.log(
    '🚀 ~ file: script.js:486 ~ updateStroke ~ updateStroke:',
    updateStroke
  )
  const prevPaths = getTouchPaths(identifier)
  options = {
    penColor: 'black',
    dotSize: '0',
    minWidth: '0.5',
    maxWidth: '2.5',
    velocityFilterWeight: '0.7',
    compositeOperation: 'source-over',
  }
  if (prevPaths.paths.length > 2) {
    // To reduce the initial lag make it work with 3 points
    // by copying the first point to the beginning.
    if (prevPaths.paths.length === 3) {
      prevPaths.paths.unshift(prevPaths.paths[0])
    }
    // _points array will always have 4 points here.
    const widths = calculateCurveWidths(
      prevPaths.paths[1],
      prevPaths.paths[2],
      options
    )
    const curve = BezierFromPoints(prevPaths.paths, widths)
    // Remove the first element from the list, so that there are no more than 4 points at any time.
    prevPaths.paths.shift()
    updateTouchPaths(identifier, prevPaths)
    if (curve) {
      drawCurve(curve, options)
    }
  }
}
