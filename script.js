function startup() {
  const el = document.getElementById('canvas')
  el.addEventListener('touchstart', handleStart)
  el.addEventListener('touchend', handleEnd)
  el.addEventListener('touchcancel', handleCancel)
  el.addEventListener('touchmove', handleMove)

  el.addEventListener('mousedown', handleMouseDown)
  el.addEventListener('mousemove', handleMouseMove)
  el.addEventListener('mouseup', handleMouseUp)

  log('Initialized.')
}

document.addEventListener('DOMContentLoaded', startup)

const ongoingTouches = []

/*
touchesPaths = [
  identifier: {
    pahts: [
      {point}
    ]
  }
]
*/
const touchesPaths = []
let lastVelocity = 0
let lastWidth = 0
const pathsBtn = document.getElementById('paths')
pathsBtn.onclick = () => {
  console.log('🚀 ~ file: script.js:23 ~ pathsBtn:', touchesPaths)
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
  log('touchstart.')
  const el = document.getElementById('canvas')
  const ctx = el.getContext('2d')
  const touches = evt.changedTouches

  for (let i = 0; i < touches.length; i++) {
    log(`touchstart: ${i}.`)
    // const copyToucy
    ongoingTouches.push(copyTouch(touches[i]))
    const color = colorForTouch(touches[i])
    log(`color of touch with id ${touches[i].identifier} = ${color}`)
    ctx.beginPath()
    ctx.arc(touches[i].pageX, touches[i].pageY, 4, 0, 2 * Math.PI, false) // a circle at the start
    ctx.fillStyle = color
    ctx.fill()
    updatePathsOfTouch(evt, touches[i].offsetX, touches[i].offsetY)
  }
}

function handleMove(evt) {
  evt.preventDefault()
  const touches = evt.changedTouches

  for (let i = 0; i < touches.length; i++) {
    const idx = ongoingTouchIndexById(touches[i].identifier)
    if (idx >= 0) {
      updatePathsOfTouch(evt, touches[i].offsetX, touches[i].offsetY)
      log(`continuing touch ${idx}`)
      log(
        `ctx.moveTo( ${ongoingTouches[idx].pageX}, ${ongoingTouches[idx].pageY} );`
      )
      log(`ctx.lineTo( ${touches[i].pageX}, ${touches[i].pageY} );`)
      updateStroke(touches[i].identifier)
      ongoingTouches.splice(idx, 1, copyTouch(touches[i])) // swap in the new touch record
    } else {
      log("can't figure out which touch to continue")
    }
  }
}

function handleEnd(evt) {
  evt.preventDefault()
  log('touchend')
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
      log("can't figure out which touch to end")
    }
  }
}

function handleCancel(evt) {
  evt.preventDefault()
  log('touchcancel.')
  const touches = evt.changedTouches

  for (let i = 0; i < touches.length; i++) {
    let idx = ongoingTouchIndexById(touches[i].identifier)
    ongoingTouches.splice(idx, 1) // remove it; we're done
  }
}

let drawningStroke = false
function handleMouseDown(evt) {
  if (evt.buttons === 1) {
    drawningStroke = true
    evt.preventDefault()
    const el = document.getElementById('canvas')
    const ctx = el.getContext('2d')
    ctx.beginPath()
    ctx.arc(evt.offsetX, evt.offsetY, 4, 0, 2 * Math.PI, false) // a circle at the start
    ctx.fillStyle = 'black'
    ctx.fill()
    updatePathsOfTouch(evt, 'mouse', evt.offsetX, evt.offsetY)
  }
}

function handleMouseMove(evt) {
  if (drawningStroke) {
    updatePathsOfTouch(evt, 'mouse', evt.offsetX, evt.offsetY)
    const el = document.getElementById('canvas')
    const ctx = el.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(evt.offsetX, evt.offsetY)
    const prevPaths = getTouchPaths('mouse')
    console.log(
      '🚀 ~ file: script.js:347 ~ handleMouseMove ~ prevPaths.paths.length:',
      prevPaths.paths.length
    )
    if (prevPaths.paths.length > 3) {
      updateStroke('mouse')
    }
    // this._strokeMoveUpdate(evt)
  }
}

function handleMouseUp(evt) {
  if (drawningStroke) {
    drawningStroke = false
    const el = document.getElementById('canvas')
    const ctx = el.getContext('2d')
    const prevPaths = getTouchPaths('mouse')
    if (prevPaths) {
      ctx.lineWidth = 4
      ctx.fillStyle = 'black'
      ctx.beginPath()
      ctx.moveTo(
        prevPaths.paths[prevPaths.paths.length - 1].x,
        prevPaths.paths[prevPaths.paths.length - 1].y
      )
      ctx.lineTo(evt.offsetX, evt.offsetY)
      ctx.fillRect(evt.offsetX - 4, evt.offsetY - 4, 8, 8) // and a square at the end
      removeTouchPaths('mouse')
    }
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
