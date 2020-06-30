const metadata = {name: "celltyping", version: "0.2.0"}

// **** CELL TYPE ASSAY ****

// special function for pre-rendering. This is passed as a string
// and run client-side
function* preRenderFunc(binaryNoiseNframes, randomSeed, checkerH, checkerW) {

	function renderFrame(flatPixelArray) {
			// var canvas = document.createElement("canvas");
			var canvas = new OffscreenCanvas(windowWidth, windowHeight);
			var context = canvas.getContext("2d")
			// canvas.width = windowWidth
			// canvas.height = windowHeight
			imageData = new ImageData(flatPixelArray, windowWidth, windowHeight)
			context.putImageData(imageData, 0, 0)
			return canvas
	}

	function pix2checker(pixIdx, H, W, checkerH, checkerW) {
		// from index of a flat pixel array
		// find the index of the corresponding checker
		// pix2checker(1280*80, 800, 1280, 80, 80) => 16
		// pix2checker(1280*79, 800, 1280, 80, 80) => 0
		// pix2checker(1279, 800, 1280, 80, 80) => 15

		// pixIdx is in 1d pixel space
		checkersPerRow = Math.ceil(W / checkerW)
		// 2d pixel space
		J = pixIdx % W
		I = Math.floor(pixIdx / W)
		
		// 2d checker space
		j = Math.floor(J / checkerW)
		i = Math.floor(I / checkerH)
		// console.log(pixIdx, H, W, checkerH, checkerW, "j",j, "i", i)
		
		// 1d checker space
		return i*checkersPerRow + j
	}

	console.assert(binaryNoiseNframes % 2 == 0)
	// client-side
	let r = new DeterministicRandom(randomSeed)

	// render random binary frames that are balanced
	// so average intensity per pixel over time is 0.5
	// nframes must be even!
	let nPixels = windowHeight * windowWidth
	let checkersPerRow = Math.ceil(windowWidth / checkerW)
	let checkersPerCol = Math.ceil(windowHeight / checkerH)
	let nCheckers = checkersPerRow * checkersPerCol
	let pixelArrays = []
	let checkerIdx
	let singlePixel = Uint8ClampedArray.from(Array(binaryNoiseNframes/2).fill(0).concat(Array(binaryNoiseNframes/2).fill(255)))
	// RGBA array https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas


	// chunk N frame increments to avoid memory overflow
	frames = new Uint8ClampedArray(binaryNoiseNframes*nPixels*4)
	// create balanced pixel assignments
	pixelArrays = []
	for (var p = 0; p < nCheckers; p++) {
		// benchmark: 50% of time is from shuffle
		r.shuffle(singlePixel)
		// array copy
		pixelArrays.push(singlePixel.slice(0))
		if (p % 16 == 0) {
			console.log("shuffled pixel ", p)
			loadBarChannel.postMessage({deltaProgress: 16/(2*nCheckers)})
		}
	}

	// assign values of each pixel over time
	for (var p = 0; p < nPixels; p++) {
		checkerIdx = pix2checker(p, windowHeight, windowWidth,
			checkerH, checkerW)
		singlePixel = pixelArrays[checkerIdx]
		for (var n = 0; n < binaryNoiseNframes; n++) {
			// For example, to read the blue component's value from the pixel at column 200, row 50 in the image, you would do the following:
			// blueComponent = imageData.data[(50 * (imageData.width * 4)) + (200 * 4) + 2]
			// if (p >= 1278960 && n==0) {
			// 	console.log(p, windowHeight, windowWidth,
			// 		checkerH, checkerW, checkerIdx)
			// 	singlePixel[n]
			// 	console.log("post")
			// }
			frames[p*4 + n*nPixels*4] = singlePixel[n] // red
			frames[1+p*4 + n*nPixels*4] = singlePixel[n] // green
			frames[2+p*4 + n*nPixels*4] = singlePixel[n] // blue
			frames[3+p*4 + n*nPixels*4] = 255 // alpha
			// if (p > 110000) {
			// 	console.log("post")
			// }
		}
		if (p % 10000 == 0) {
			console.log("pushed pixel ", p)
			loadBarChannel.postMessage({deltaProgress: 10000/(2*nPixels)})
		}
	}
	// yield each frame
	for (var n = 0; n < binaryNoiseNframes; n++) {
		yield renderFrame(frames.slice(n*nPixels*4,(n+1)*nPixels*4))
	}
}

const binaryNoiseDuration = 5*60
const frameRate = 60
const hz = 5
const binaryNoiseLifespan = 1 / hz
const binaryNoiseNframes = hz*binaryNoiseDuration
const chunkSize = 50
let checkerH = 40
let checkerW = 40
const nJobs = ceil(binaryNoiseNframes / chunkSize)
const remainder = ceil(binaryNoiseNframes % chunkSize)

// deterministic seed for caching
const renderSeed = 242424
// can update version to invalidate cache
// special object for pre-rendering
// const preRenderArgs = {args: [binaryNoiseNframes, renderSeed, "binary_noise_v1"]}

let preRenderArgs = { nJobs: nJobs, startIdx: [], version: "binary_noise_v1"}
let startIdx = 0
for (let i = 0; i < nJobs; i++) {
  if (i === (nJobs - 1) && remainder !== 0) {
    preRenderArgs[i] = [remainder, renderSeed+i, checkerH, checkerW]
  } else {
    preRenderArgs[i] = [chunkSize, renderSeed+i, checkerH, checkerW]
  }
  preRenderArgs["startIdx"].push(startIdx)
  startIdx = startIdx + chunkSize
}

const celltypeMeta = {group: r.uuid(), label: "celltype"}

celltypeStimuli = []
celltypeStimuli.push(new Wait(3, celltypeMeta))
celltypeStimuli.push(new Solid(3, "white", celltypeMeta))
celltypeStimuli.push(new Wait(3, celltypeMeta))
// gray is #808080 or 0.5*"white"
celltypeStimuli.push(new Solid(3, "gray", celltypeMeta))
// start at 0.5 and increase
// baden params: 8 sec, f1~=0.75Hz, f1~=20Hz (or 40??).
// negative PI/2 to rise first from (127,127,127)
celltypeStimuli.push(new Chirp(8, 0.75, 15, 127.5, 127.5, 8, -PI/2, celltypeMeta))
celltypeStimuli.push(new Wait(3, celltypeMeta))
// baden params: 8 sec, 2Hz, constrast: 1/30, 1/30, 1/15, 1/10, ... linear to full contrast
celltypeStimuli.push(new Chirp(8, 2, 2, 4, 127.5, 8, -PI/2, celltypeMeta))

// moving bars
// baden params: 0.3 × 1 mm bright bar moving at 1 mm s−1
// width (px) = deg/um * (xpix/deg + ypix/deg)/2 * 300 um
// 110 px = (1/34.91*(13.09+12.54)/2 * 300)
// speed = deg/um * (xpix/deg + ypix/deg)/2 * um / s^2
// 0.367 px / um; 367 px / mm
let ctWidth = 110
let ctSpeed = 367
let ctAngles = [...Array(24).keys()].map(x => (x*2+1)*PI/24)
let ctLifespan = calcBarLifespan(ctSpeed,ctWidth,windowHeight,windowWidth)
for (let angle of ctAngles) {
	celltypeStimuli.push(new Wait(2, celltypeMeta))
	celltypeStimuli.push(new Bar(ctLifespan,"black",
		ctSpeed, ctWidth, angle, "white", celltypeMeta))
}

celltypeStimuli.push(new Wait(2, celltypeMeta))
celltypeStimuli.push(new Solid(3, "green", celltypeMeta))
celltypeStimuli.push(new Wait(3, celltypeMeta))
celltypeStimuli.push(new Solid(3, "blue", celltypeMeta))
celltypeStimuli.push(new Wait(3, celltypeMeta))

// perfectly balanced random sequence at 5 Hz yielding a total running time of 5 min
// coarse binary grid
let noiseStimuli = []

// let fixationPoint = {x: 0, y: 0}
let metaWithSeed = Object.create(celltypeMeta)
metaWithSeed.randomSeed = renderSeed
let fixationPoint = {x: windowWidth/2, y: windowHeight/2}
for (var n = 0; n < binaryNoiseNframes; n++) {
	noiseStimuli.push(new Image(binaryNoiseLifespan, 'black', n, fixationPoint, 1, celltypeMeta))
}

// shuffle binary frames that are cached instead of slow
// pre-rendering each time
r.shuffle(noiseStimuli)
celltypeStimuli = celltypeStimuli.concat(noiseStimuli)

// **** END CELL TYPE ASSAY ****

function* stimulusGenerator() {
	for (s of celltypeStimuli) {
		yield s
	}
}
