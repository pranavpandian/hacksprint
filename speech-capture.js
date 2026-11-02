class BridgeUxCapture extends AudioWorkletProcessor {
  constructor(){super();this.ratio=sampleRate/16000;this.phase=0;this.sum=0;this.count=0;this.output=[];this.chunkSize=8960;}
  process(inputs){const channel=inputs[0]?.[0];if(!channel)return true;for(let i=0;i<channel.length;i++){this.sum+=channel[i];this.count++;this.phase++;if(this.phase>=this.ratio){this.output.push(this.sum/this.count);this.phase-=this.ratio;this.sum=0;this.count=0;}}while(this.output.length>=this.chunkSize){const chunk=new Float32Array(this.output.splice(0,this.chunkSize));this.port.postMessage(chunk,[chunk.buffer]);}return true;}
}
registerProcessor('bridgeux-capture',BridgeUxCapture);
