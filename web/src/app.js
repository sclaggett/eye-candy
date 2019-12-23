const bodyParser = require("koa-bodyparser");
const koaSession = require("koa-generic-session");

const Koa = require("koa");
const router = require("koa-router")();
var assert = require('assert');
const path = require("path")
const co = require("co");
const render = require("koa-ejs");
const convert = require("koa-convert");
const IO = require( "koa-socket" )
const koaSocketSession = require("koa-socket-session")
const redisStore = require("koa-redis")
var uuid = require("uuid");
const logger = require("koa-logger")
const yaml = require("js-yaml")
const sprintf = require("sprintf-js").sprintf
const fs = require('fs')
var cp = require('child_process');

const random = require("./epl/random")
const {compileYAMLProgram, compileJSProgram} = require("./epl/eval")
const {DATADIR} = require('./vars.js')

console.log("DATADIR: " + DATADIR)

GIT_SHA = fs.readFileSync(
	'/www/git-sha',
	"utf-8").replace(/\n$/, '')

const app = new Koa();
app.use(logger())

N_INIT_STIMULUS_QUEUE = 25

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  // application specific logging, throwing an error, or other logic here
});

// VM2 ERROR HANDLING (per https://github.com/patriksimek/vm2/issues/87)
// can remove after pull request is merged
const StackTracey = require ('stacktracey');
const sourceCode = `function f() {
	throw Exception('e');
}
f();`;
const scriptName = "epl.js";

process.on("uncaughtException",  e => {
	if (!e.stack.includes("/node_modules/vm2/")) {
		// This is not a vm2 error, so print it normally
		console.log(e);
		return;
	}
	const oldStack = new StackTracey(e);
	const newStack = [];
	for (const line of oldStack) {
		// Discard internal code
		if (line.file.includes("/cjs"))
			continue;
		if (line.thirdParty && line.file.includes("/node_modules/vm2/"))
			continue;
		if (line.callee == "Script.runInContext")
			continue;
		// Replace the default filename with the user-provided one
		if (line.fileName == "vm.js")
			line.fileRelative = line.fileShort = line.fileName = scriptName;
		newStack.push(line);
	}
	console.log("[vm2] A clean stack trace follows:");
	console.log(new StackTracey(newStack).pretty);
});

// END ERROR HANDLING



const io = new IO()
const store = new redisStore({host: "redis"})

// WARNING. session is mostly broken, using hacks e.g. localstorage
// and the variable `windows`

var session = koaSession({
    store: store,
    secret: "1nkj98sdfa1will",
    resave: true,
    saveUninitialized: true,

    cookie: {
      path: '/',
      httpOnly: false,
      maxAge: 24 * 60 * 60 * 1000, //one day in ms
      rewrite: true,
      signed: true
    }
});


app.keys = ["8r92scsdf6", "jnt356gc"];
app
    .use(session)
    // .use(convert(session))
    .use(bodyParser({jsonLimit: '50mb', formLimit: "50mb"}));

io.use(koaSocketSession(app, session))


function getSIDfromCookie(cookie) {
    return /koa\.sid=([\d\w\W]+)(;|$)/.exec(cookie)[1]
}

router.post("/window", (ctx) => {
    var session = ctx.session;
    const sid = ctx.request.header.sid
    session.windowHeight = ctx.request.header.windowheight
    session.windowWidth = ctx.request.header.windowwidth
    windows[sid] = {windowHeight: session.windowHeight,
                    windowWidth: session.windowWidth}
    ctx.body = session;
});

router.post("/next-stimulus",  (ctx) => {
    // console.log("next-stimulus", ctx.session)
    const sid = ctx.request.header.sid
    const stimulus = program[sid].next()
    console.log("next stimulus:", stimulus)
    ctx.body = stimulus
    ctx.status = 200
});


// initialize cookie
router.get("/get-sid", ctx => {
    const sid = uuid.v4()
    ctx.session.sid = sid
    ctx.body = sid;
    ctx.status = 200
})

router.get("/count", ctx => {
    // console.log("count", ctx.req)
    var session = ctx.session;
    session.count = session.count || 0;
    session.count++;
    ctx.body = session;
})

function makeLabNotebook(labNotebook) {
    labNotebook.windowHeight = windows[labNotebook.sid].windowHeight
    labNotebook.windowWidth = windows[labNotebook.sid].windowWidth
    delete labNotebook.sid
    // TODO generate date cllient side
    const date = new Date()
    labNotebook.date = date
    labNotebook.version = 0.5
    labNotebook.flickerVersion = 0.3
    labNotebook.gitSHA = GIT_SHA

    console.log("labNotebook", labNotebook)
    return "---\n" + yaml.safeDump(labNotebook)
}

function initStimulusQueue(prog) {
    let stimulusQueue = []
    assert(prog!==undefined, "No program found")
    for (var i = 0; i < N_INIT_STIMULUS_QUEUE; i++) {
        stimulusQueue.push(prog.next())
    }
    console.log(stimulusQueue)
    return stimulusQueue
}

router.post("/start-program", ctx => {

    let labNotebook = Object.assign({},ctx.request.body)
    let {submitButton, sid} = labNotebook
    delete labNotebook.submitButton
    console.log('start program sid:', sid)
    assert(sid!==undefined, "assert sid is not undefined")

    labNotebook.epl = program[sid].epl

    if (submitButton==="start") {
        console.log("start program")
        let stimulusQueue = initStimulusQueue(program[sid])
        io.broadcast("run", stimulusQueue)
        ctx.body = makeLabNotebook(labNotebook)
    } else if (submitButton==="preview") {
        let s = program[sid].next()
        ctx.body = ""
        while (s.done===false) {
            ctx.body=ctx.body+JSON.stringify(s.value)+"\n"
            s = program[sid].next()
        }
    } else if (submitButton==="save-video") {
        console.log("start video")
        let stimulusQueue = initStimulusQueue(program[sid])
        io.broadcast("video", stimulusQueue)
        ctx.body = makeLabNotebook(labNotebook)
		// init folders / logs
		let vidname, stream
		vidname = DATADIR + "renders/" + (new Date().toISOString())
		fs.mkdirSync(vidname, { recursive: true })
		program_vid_name[sid] = vidname
		stream = fs.createWriteStream(vidname+".txt", {flags:'a'})
		program_log[sid] = stream
		stream.write("frame_number,time,stimulus_index,error\n")
    } else if (submitButton==="estimate-duration") {
        let s = program[sid].next()
        let lifespan = 0
        while (s.done===false) {
            lifespan=lifespan+s.value.lifespan
            s = program[sid].next()
        }
        let seconds = lifespan
        let minutes = Math.floor(seconds/60)
        seconds = Math.ceil(seconds%60)
        ctx.body = minutes+" minutes "+seconds+" seconds"
    } else if (submitButton==="view source code") {
        ctx.body = labNotebook.epl
    }
    ctx.status = 200
})

// store all vms here
let program = {}
let program_vid_name = {}
let program_log = {}
let windows = {}
let notebooks = {}


// Return the program id
router.post("/analysis/start-program", ctx => {
    console.log("analysis/start-program (legacy)")
    const sid = uuid.v4()
    const body = ctx.request.body
    if (body.programType==="YAML") {
        ctx.body = "YAML deprecated"
        ctx.status = 501
    } else if (body.programType==="javascript") {
        // legacy
        program[sid] = compileJSProgram(body.program, body.seed, body.windowHeight,
            body.windowWidth)

        ctx.body = sid
        ctx.status = 200
    } else {
        program[sid] = compileJSProgram(body.epl, body.seed, body.windowHeight,
            body.windowWidth)

        ctx.body = sid
        ctx.status = 200
    }
})

router.post("/analysis/run-program", ctx => {
    console.log("analysis/run-program")
    const sid = uuid.v4()
    const body = ctx.request.body
    let p = compileJSProgram(body.epl, body.seed, body.windowHeight,
            body.windowWidth)

    p.initialize({test: undefined})
    let metadata = p.metadata
    let stimulusList = []
    let n = p.next()
    while ( n.done===false) {
        stimulusList.push(n)
        n = p.next()
    }
    delete p
    ctx.body = {metadata: metadata, stimulusList: stimulusList}
    ctx.status = 200
    // no pre-rendering for analysis at the moment..
})

// give metadata for a given program (id)
router.get("/analysis/metadata/:sid", ctx => {
    const sid = ctx.params.sid
    ctx.body = program[sid].metadata
    ctx.status = 200
})


// give the next value for a given program (id)
router.get("/analysis/run/:sid", ctx => {
    const sid = ctx.params.sid
    ctx.body = program[sid].next()
    if (ctx.body.done===true) {
        delete program[sid]
    }
    ctx.status = 200
})

app
    .use(router.routes())
    .use(router.allowedMethods());

render(app, {
    root: path.join(__dirname, "../view"),
    layout: false,
    viewExt: "html",
    cache: false,
    debug: false
});

app.context.render = co.wrap(app.context.render);

// for any other route, serve index.html
app.use(async (ctx, next) => {

    const programChoices = fs.readdirSync("/www/programs/").map(s => s.slice(0, -3))
    let videoChoices = fs.readdirSync(DATADIR+"videos/")
    await ctx.render("index", {
        programChoices,
        videoChoices
    });
});

// IO
io.attach( app )
// var clients = [];
io.on("connection", function (ctx) {
  // console.log( "User connected!!!" )
  // clients.push(socket.id);
});


io.on("disconnect", function(ctx) {
    //https://github.com/LearnBoost/socket.io-client/issues/251
    // console.log( "User disconnected" )
    // io.reconnect();

});

// io.on("window", (ctx, data) => {
//     // console.log("in window")
//     console.log("got windowHeight", data.windowHeight)
//     ctx.session.windowHeight = data.windowHeight
//     ctx.session.windowWidth = data.windowWidth
// })

io.on("test", (ctx) => {
    var session = ctx.session;
    session.count = session.count || 0;
    session.count++;
    // console.log("test", ctx.session)
    // console.log("test get windowHeight", ctx.session.windowHeight)
})

io.on("reset", (ctx, data) => {
    console.log("socket 'reset'")

    const sid = data.sid
    io.broadcast("reset")
    delete program[sid]
    cleanupRender(sid, deleteDir=false)
})

io.on("load", (ctx, data) => {
    io.broadcast("reset")
    const sid = data.sid
    const eplProgram = data.program
    const seed = data.seed
    let epl = data.epl
    console.log("windows", windows, sid)
    const windowHeight = windows[sid].windowHeight
    const windowWidth = windows[sid].windowWidth
    console.log(windowHeight, windowWidth)
    if (eplProgram==="custom") {
        // program already loaded in epl
    } else if (eplProgram=="video") {
        // TODO create basic EPL program
        const regex = /\$\{VID\_SRC\}/gi;
        const videoSrc = data.video
        epl = fs.readFileSync(
            '/www/programs/templates/single-video.js',
            "utf-8").replace(regex, "videos/" + videoSrc)
    } else {
        // this is likely a security vulnerability but sure is convenient
        // convention over customization
        epl = fs.readFileSync(
            '/www/programs/'+eplProgram+'.js',
            "utf-8")
    }
    console.log("socket 'load': compiling for sid", sid)
    program[sid] = compileJSProgram(epl, seed, windowHeight,
        windowWidth)
    // let f = "() => {console.log(" + program[sid].preRender()+")}"
    // io.broadcast("pre-render", {preRender: f})
    console.log("finished loading, triggering pre-render")
    io.broadcast("pre-render", {func: program[sid].preRenderFunc,
        args: program[sid].preRenderArgs})
})

io.on("renderResults", (ctx, data) => {
    console.log("socket 'renderResults'")
    const sid = data.sid
    program[sid].initialize()
    io.broadcast("enableSubmitButton")
})

io.on("target", ctx => {
    console.log("socket 'target'")
    io.broadcast("target")
})

// ctx.session.on("error", function (err) {
//     console.log("Redis error " + err);
// });

io.on("addFrame", (ctx, data) => {
    const sid = data.sid
    let vidname = program_vid_name[sid]
    let stream = program_log[sid]
    const png = data.png
		// data.png.replace(/^data:image\/png;base64,/, "")
    var filename = sprintf('image-%010d.png', data.frameNum);
    // const filename = "s="+data.stimulusIndex + ",t=" + data.time+'.png'
    fs.writeFile(vidname+"/"+filename, png, 'base64', (error) => {
        if (error) {
            console.error('Error saving frame:', error.message)
            stream.write(data.frameNum+","+data.time+","+data.stimulusIndex+",1\n")
            throw(error)
        } else {
            stream.write(data.frameNum+","+data.time+","+data.stimulusIndex+",0\n")

        }
    })
})

io.broadcast("play-video", {})

var deleteFolderRecursive = function(path) {
    // https://stackoverflow.com/questions/18052762/remove-directory-which-is-not-empty
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function(file, index){
      var curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

function cleanupRender(sid, deleteDir=true) {
    if (sid in program_vid_name) {
        let vidname = program_vid_name[sid]
        delete program_vid_name[sid]
        if (deleteDir) {deleteFolderRecursive(vidname)}
    } else {
        console.log("Warning: asked to delete sid:", sid, "but this is not found in program_vid_name");
    }
    if (sid in program_log) {
        program_log[sid].end()
        delete program_log[sid]
    } else {
        console.log("Warning: asked to delete sid:", sid, "but this is not found in program_log");

    }

}

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

async function saveVideo(sid) {
    let vidname = program_vid_name[sid]
    let stream = program_log[sid]
    console.log("Rendering your video. This might take a long time...")
	let missingFrames = true
	let nFrames = fs.readdirSync(vidname).length;
	let newNFrames
	while (missingFrames) {
		await sleep(10000)
		newNFrames = fs.readdirSync(vidname).length

		if (newNFrames == nFrames) {
			// if no new frames received in last 10 seconds, assume we have all frames
			missingFrames = false
		} else {
			console.log("Received "+(newNFrames-nFrames)+" more frames. Sleeping for 10sec")
		}
		nFrames = newNFrames
	}
	console.log("Using ffmpeg to make "+vidname+'.mp4.')
    var ffmpeg = cp.spawn('ffmpeg', [
        '-framerate', '60',
        '-start_number', '0',
        '-i', vidname+'/image-%010d.png',
        '-refs', '6',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv444p',
        '-preset', 'veryslow',
        '-crf', '18',
        vidname + '.mp4'
    ])
    ffmpeg.on('error', function(error) {
        console.error('Error starting FFmpeg:', error.message);
        cleanupRender(sid, deleteDir=false)
    });
    ffmpeg.on('close', function(code) {
        if (code !== 0) {
            console.log('FFmpeg process closed with code', code);
            cleanupRender(sid, deleteDir=false)
        } else {
            console.log('Finished rendering video. You can find it at ' + vidname + '.mp4')
            cleanupRender(sid)
        }
    })
}

io.on("renderVideo", (ctx, data) => {
    // TODO: THIS IS A RACE CONDITION! stream write could come in slowly
    const sid = data.sid
    saveVideo(sid)
})


app.listen(3000);
