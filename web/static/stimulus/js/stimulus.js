import {renderLoop} from "./render.js"

const loggerChannel = new BroadcastChannel('logger');

loggerChannel.onmessage = msg => {
  const payload = msg.data
  console.log("logger:", payload)
}

renderLoop()
