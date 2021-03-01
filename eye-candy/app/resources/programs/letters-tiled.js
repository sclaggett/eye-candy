const metadata = {name: "letters-tiled", version: "0.2.0", inverted: false}

let repetitions = 100

let sizes = [250,200,160,125]

let durations = [0.5]


function* measureIntegrity(stimuli,every=5*60) {
    // every N seconds, do a flash
    let integrityMeta
    let elapsedTime = every
    for (let s of stimuli) {
        if (elapsedTime>=every && s.metadata.block===undefined) {
            integrityMeta = {group: r.uuid(), label: "integrity"}
            yield new Wait(1, integrityMeta)
            yield new Solid(0.5, "white", integrityMeta)
            yield new Wait(2, integrityMeta)
            elapsedTime = 0
            yield s
        } else {
            yield s
        }
        elapsedTime=elapsedTime+s["lifespan"]
    }
}

let letters = ["C", "D", "H", "K", "N", "O", "R", "S", "V", "Z"]
let x
let y
let stimuli = []
let l
let before
let after
let id
let cohort
let letterMatrix
let nrows
let ncols
let pad
let totalSize

for (let duration of durations) {
    for (let size of sizes) {
        pad = size

        for (let i = 0; i < repetitions; i++) {
            cohort = r.uuid(i)
            for (let letter of letters) {
                id = r.uuid(i)
                // block means "do not insert a integrity check before me"
                l = new TiledLetter(duration, "black", letter, size, pad,
                    "white", 0, {group: id, cohort: cohort, block: true})
                before = new Wait(1, {group: id})
                after = new Wait(r.randi(30,45)/60, {group: id, block: true})

                // before + lit + after = lifespan
                // this pads the white flash
                stimuli.push([before, l, after])
            }
        }
    }
}

r.shuffle(stimuli)

stimuli = measureIntegrity(flatten(stimuli))

function* stimulusGenerator() {
    for (s of stimuli) {
        yield s
    }
}
