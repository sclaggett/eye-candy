import { store, canvas, context, WIDTH, HEIGHT} from './store.js'
import { canvasRecorder, registerFrame,
         stopRecorder, startRecorder } from "./captureCanvas.js";
import { tickDispatcher } from './dispatchers.js'
import { getDiagonalLength } from './logic.js'

export function renderBar(context, graphic) {
    // might need to translate first if rotation
    context.translate(graphic.origin.x,
        graphic.origin.y)
    context.fillStyle = graphic.color
    // Rotate rectangle to be perpendicular with Center of Canvas
    context.rotate(graphic.position.theta)
    // Draw a rectangle, adjusting for Bar width
    context.fillRect(Math.round(-graphic.size.width/2), Math.round(-graphic.size.height/2),
        graphic.size.width, graphic.size.height)
}

export function renderTarget(context, graphic) {
    context.strokeStyle = "#ff0000"

    context.beginPath()
    context.arc(HEIGHT/2,HEIGHT/2,HEIGHT/2,0,2*PI)
    context.stroke()

    context.beginPath()
    context.arc(HEIGHT/2,HEIGHT/2,HEIGHT/3,0,2*PI)
    context.stroke()

    context.beginPath()
    context.arc(HEIGHT/2,HEIGHT/2,HEIGHT/5,0,2*PI)
    context.stroke()

    context.beginPath()
    context.arc(HEIGHT/2,HEIGHT/2,HEIGHT/10,0,2*PI)
    context.stroke()

    context.beginPath()
    context.arc(HEIGHT/2,HEIGHT/2,HEIGHT/100,0,2*PI)
    context.stroke()

    context.rect(0,0,HEIGHT,HEIGHT)
    context.stroke()
}

export function renderPattern(context, pattern,angle) {
    context.fillStyle = pattern;
    const diag = getDiagonalLength()
    if (angle===0) {
        context.fillRect(0,0, diag, diag);
    } else  {
        context.translate(WIDTH/2,HEIGHT/2)
        context.rotate(-angle)
        context.translate(-diag/2,-diag/2)
        context.fillRect(0,0, diag, diag);
    }

}

export function renderGrating(context, pattern, width, angle, position) {
    // console.log("render GRATING")
    context.fillStyle = pattern;
    // move to the center of the canvas
    context.translate(WIDTH/2,HEIGHT/2)
    context.rotate(-angle)
    const diag = getDiagonalLength()
    context.translate(-diag/2,-diag/2)
    const x = width*2 - position
    context.translate(x,0)
    context.fillRect(-width*2,0, diag+width*2, diag);

}

export function renderChirp(context, color) {
    context.fillStyle = color
    context.fillRect(0,0,WIDTH,HEIGHT)
}


export function renderLetter(context, letter, size, color, x, y) {
    context.fillStyle = color
    context.font = size+'px Sloan'
    context.fillText(letter, x, y)
}


export function renderImage(context, image, fixationPoint, scale) {
    // TODO: should change so auto fixate at middle of image?
    // would be breaking and require rewriting protocols
    const centerX = WIDTH/2
    const centerY = HEIGHT/2
    // console.log("renderImage image, fixationPoint:", image, fixationPoint)
    const deltaX = centerX - fixationPoint.x
    const deltaY = centerY - fixationPoint.y
    let X,Y
    if (typeof(scale)=="number") {
        X = image.width*scale
        Y = image.height*scale
    } else {
        // 2-dim array
        X = image.width*scale[0]
        Y = image.height*scale[1]
    }
    // console.log("renderImage", image)
    context.drawImage(image, deltaX, deltaY, X, Y)
}

export function renderWhiteNoise(context, image) {
    context.imageSmoothingEnabled = false
    context.drawImage(image, 0, 0, WIDTH, HEIGHT)
}

export function renderVideo(context, video, scale) {
    if(video.paused){
          video.play();
    }
    const centerX = WIDTH/2
    const centerY = HEIGHT/2
    var vidH = video.videoHeight/2;
    var vidW = video.videoWidth/2;
    // console.log("renderImage image, fixationPoint:", image, fixationPoint)
    const left = centerX - vidW * scale
    const top = centerY - vidH * scale
    const width = 2*vidW * scale
    const height = 2*vidH * scale
    context.drawImage(video, left, top, width, height)
}

export function renderBackground(color) {
    context.fillStyle = color
    context.fillRect(0,0,WIDTH,HEIGHT)

}

export function render(context, state) {
    context.clearRect(0, 0, WIDTH, HEIGHT)

    context.save()
    renderBackground(state.stimulus.backgroundColor)
    context.restore()

    state.graphics.forEach(graphic => {
        context.save()
        switch (graphic.graphicType) {
            case GRAPHIC.BAR:
                renderBar(context, graphic)
                break
            case GRAPHIC.TARGET:
                renderTarget(context, graphic)
                break
            case GRAPHIC.PATTERN:
                renderPattern(context, graphic.pattern, graphic.angle)
                break
            case GRAPHIC.WHITE_NOISE:
                renderWhiteNoise(context, graphic.pattern)
                break
            case GRAPHIC.GRATING:
                renderGrating(context, graphic.pattern, graphic.width, graphic.angle, graphic.position)
                break
            case GRAPHIC.SINUSOIDAL_GRATING:
                renderGrating(context, graphic.pattern, graphic.width, graphic.angle, graphic.position)
                break
            case GRAPHIC.CHIRP:
                renderChirp(context, graphic.color)
                break
            case GRAPHIC.LETTER:
                renderLetter(context, graphic.letter, graphic.size,
                             graphic.color, graphic.x, graphic.y)
                break
            case GRAPHIC.IMAGE:
                renderImage(context, graphic.image, graphic.fixationPoint,
                    graphic.scale)
                    break
            case GRAPHIC.VIDEO:
                renderVideo(context, graphic.video, graphic.scale)
                break
        }
        context.restore()
    })
}

var lastTime
export function renderLoop(time) {
    // TODO: do all rendering to OffscreenCanvas
    // then use canvas.getContext("bitmaprenderer") for fast swap
    // https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
    // https://developers.google.com/web/updates/2018/08/offscreen-canvas
    if (!lastTime) lastTime = time;

    // seconds
    const timeDelta = (time - lastTime)/1000
    lastTime = time


    switch (store.getState().status) {
        case STATUS.STOPPED:
            stopRecorder()
            context.clearRect(0, 0, WIDTH, HEIGHT)
            document.body.style.backgroundColor = "black"
            store.dispatch(setSignalLightAC(SIGNAL_LIGHT.STOPPED))
            break
        case STATUS.FINISHED:
            stopRecorder()
            context.clearRect(0, 0, WIDTH, HEIGHT)
            document.body.style.backgroundColor = "black"
            store.dispatch(setSignalLightAC(SIGNAL_LIGHT.STOPPED))
            break
        case STATUS.STARTED:
            tickDispatcher(timeDelta)
            render(context, store.getState())
            break
        case STATUS.VIDEO:
            tickDispatcher(timeDelta)
            let state = store.getState()
            startRecorder()
            render(context, state)
            registerFrame(state.frameNum, time, state.stimulusIndex)
            break
        case STATUS.DEBUG:
            break
    }
    requestAnimationFrame(renderLoop)
}
