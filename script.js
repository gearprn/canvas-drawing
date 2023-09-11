function startup() {
  const el = document.getElementById("canvas");
  el.addEventListener("touchstart", handleStart);
  el.addEventListener("touchend", handleEnd);
  el.addEventListener("touchcancel", handleCancel);
  el.addEventListener("touchmove", handleMove);
  log("Initialized.");
}

document.addEventListener("DOMContentLoaded", startup);

const ongoingTouches = [];

/*
touchesPaths = [
  identifier: {
    pahts: [
      {point}
    ]
  }
]
*/
const touchesPaths = [];
let lastVelocity = 0;
let lastWidth = 0;
const pathsBtn = document.getElementById("paths");
pathsBtn.onclick = () => {
  console.log("🚀 ~ file: script.js:23 ~ pathsBtn:", touchesPaths);
};

function updatePathsOfTouch(event, touch) {
  const idx = touchesPaths.findIndex((v) => v.identifier == touch.identifier);
  const pressure =
    event.pressure !== undefined
      ? event.pressure
      : event.force !== undefined
      ? event.force
      : 0;
  if (idx == -1) {
    touchesPaths.push({
      identifier: touch.identifier,
      paths: [
        {
          x: touch.pageX,
          y: touch.pageY,
          pressure: pressure,
          time: new Date().getTime(),
        },
      ],
    });
  } else {
    touchesPaths[idx].paths.push({
      x: touch.pageX,
      y: touch.pageY,
      pressure: pressure,
      time: new Date().getTime(),
    });
  }
}

function getTouchPaths(identifier) {
  return touchesPaths.find((v) => v.identifier == touch.identifier);
}

function handleStart(evt) {
  evt.preventDefault();
  log("touchstart.");
  const el = document.getElementById("canvas");
  const ctx = el.getContext("2d");
  const touches = evt.changedTouches;

  for (let i = 0; i < touches.length; i++) {
    log(`touchstart: ${i}.`);
    // const copyToucy
    ongoingTouches.push(copyTouch(touches[i]));
    const color = colorForTouch(touches[i]);
    log(`color of touch with id ${touches[i].identifier} = ${color}`);
    ctx.beginPath();
    ctx.arc(touches[i].pageX, touches[i].pageY, 4, 0, 2 * Math.PI, false); // a circle at the start
    ctx.fillStyle = color;
    ctx.fill();
    updatePathsOfTouch(evt, touches[i]);
  }
}

function calculateCurveWidths(startPoint, endPoint, options) {
  const velocity =
    options.velocityFilterWeight * velocityFrom(startPoint, endPoint) +
    (1 - options.velocityFilterWeight) * lastVelocity;

  const newWidth = strokeWidth(velocity, options);

  const widths = {
    end: newWidth,
    start: lastWidth,
  };

  lastVelocity = velocity;
  lastWidth = newWidth;

  return widths;
}

function velocityFrom(startPoint, endPoint) {
  return endPoint.time !== startPoint.time
    ? distanceTo(startPoint, endPoint) / (endPoint.time - startPoint.time)
    : 0;
}

function distanceTo(startPoint, endPoint) {
  return Math.sqrt(
    Math.pow(endPoint.x - startPoint.x, 2) +
      Math.pow(endPoint.y - startPoint.y, 2)
  );
}

function strokeWidth(velocity, options) {
  return Math.max(options.maxWidth / (velocity + 1), options.minWidth);
}

function BezierFromPoints(pahts, widths) {
  const c2 = calculateControlPoints(pahts[0], pahts[1], pahts[2]).c2;
  const c3 = calculateControlPoints(pahts[1], pahts[2], pahts[3]).c1;
  return new Bezier(points[1], c2, c3, points[2], widths.start, widths.end);
}

function calculateControlPointss1(
  s1,
  s2,
  s3,
) {
  const dx1 = s1.x - s2.x;
  const dy1 = s1.y - s2.y;
  const dx2 = s2.x - s3.x;
  const dy2 = s2.y - s3.y;

  const m1 = { x: (s1.x + s2.x) / 2.0, y: (s1.y + s2.y) / 2.0 };
  const m2 = { x: (s2.x + s3.x) / 2.0, y: (s2.y + s3.y) / 2.0 };

  const l1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
  const l2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

  const dxm = m1.x - m2.x;
  const dym = m1.y - m2.y;

  const k = l2 / (l1 + l2);
  const cm = { x: m2.x + dxm * k, y: m2.y + dym * k };

  const tx = s2.x - cm.x;
  const ty = s2.y - cm.y;

  return {
    c1: new Point(m1.x + tx, m1.y + ty),
    c2: new Point(m2.x + tx, m2.y + ty),
  };
}

function handleMove(evt) {
  evt.preventDefault();
  const el = document.getElementById("canvas");
  const ctx = el.getContext("2d");
  const touches = evt.changedTouches;

  for (let i = 0; i < touches.length; i++) {
    const color = colorForTouch(touches[i]);
    const idx = ongoingTouchIndexById(touches[i].identifier);

    if (idx >= 0) {
      log(`continuing touch ${idx}`);
      ctx.beginPath();
      log(
        `ctx.moveTo( ${ongoingTouches[idx].pageX}, ${ongoingTouches[idx].pageY} );`
      );
      ctx.moveTo(ongoingTouches[idx].pageX, ongoingTouches[idx].pageY);
      log(`ctx.lineTo( ${touches[i].pageX}, ${touches[i].pageY} );`);

      prevPaths = getTouchPaths(touches[i].identifier);
      options = {
        penColor: "black",
        dotSize: "0",
        minWidth: "0.5",
        maxWidth: "2.5",
        velocityFilterWeight: "0.7",
        compositeOperation: "source-over",
      };

      if (prevPaths.pahts.length > 2) {
        // To reduce the initial lag make it work with 3 points
        // by copying the first point to the beginning.
        if (prevPaths.pahts.length === 3) {
          prevPaths.pahts.unshift(prevPaths.pahts[0]);
        }
        // _points array will always have 4 points here.
        const widths = calculateCurveWidths(
          prevPaths.pahts[1],
          prevPaths.pahts[2],
          options
        );
        const curve = Bezier.BezierFromPoints(prevPaths.pahts, widths);
        // Remove the first element from the list, so that there are no more than 4 points at any time.
        prevPaths.pahts.shift();
        return curve;
      }

      // old draw line
      // ctx.lineTo(touches[i].pageX, touches[i].pageY)
      // ctx.lineWidth = 4
      // ctx.strokeStyle = color
      // ctx.stroke()

      ongoingTouches.splice(idx, 1, copyTouch(touches[i])); // swap in the new touch record
      updatePathsOfTouch(evt, touches[i]);
    } else {
      log("can't figure out which touch to continue");
    }
  }
}

function handleEnd(evt) {
  evt.preventDefault();
  log("touchend");
  const el = document.getElementById("canvas");
  const ctx = el.getContext("2d");
  const touches = evt.changedTouches;

  for (let i = 0; i < touches.length; i++) {
    const color = colorForTouch(touches[i]);
    let idx = ongoingTouchIndexById(touches[i].identifier);

    if (idx >= 0) {
      ctx.lineWidth = 4;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(ongoingTouches[idx].pageX, ongoingTouches[idx].pageY);
      ctx.lineTo(touches[i].pageX, touches[i].pageY);
      ctx.fillRect(touches[i].pageX - 4, touches[i].pageY - 4, 8, 8); // and a square at the end
      ongoingTouches.splice(idx, 1); // remove it; we're done
    } else {
      log("can't figure out which touch to end");
    }
  }
}

function handleCancel(evt) {
  evt.preventDefault();
  log("touchcancel.");
  const touches = evt.changedTouches;

  for (let i = 0; i < touches.length; i++) {
    let idx = ongoingTouchIndexById(touches[i].identifier);
    ongoingTouches.splice(idx, 1); // remove it; we're done
  }
}

function colorForTouch(touch) {
  let r = touch.identifier % 16;
  let g = Math.floor(touch.identifier / 3) % 16;
  let b = Math.floor(touch.identifier / 7) % 16;
  r = r.toString(16); // make it a hex digit
  g = g.toString(16); // make it a hex digit
  b = b.toString(16); // make it a hex digit
  const color = `#${r}${g}${b}`;
  return color;
}

function copyTouch({ identifier, pageX, pageY }) {
  return { identifier, pageX, pageY };
}

function ongoingTouchIndexById(idToFind) {
  for (let i = 0; i < ongoingTouches.length; i++) {
    const id = ongoingTouches[i].identifier;

    if (id === idToFind) {
      return i;
    }
  }
  return -1; // not found
}

function log(msg) {
  const container = document.getElementById("log");
  container.textContent = `${msg} \n${container.textContent}`;
  // console.log(`${msg} \n${container.textContent}`)
}
