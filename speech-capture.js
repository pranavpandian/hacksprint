class BridgeUxCapture extends AudioWorkletProcessor {
  constructor(){super();this.ratio=sampleRate/16000;this.phase=0;this.sum=0;this.count=0;this.output=[];this.chunkSize=8960;}
  process(inputs){const channels=inputs[0];if(!channels?.length)return true;const left=channels[0],right=channels[1];for(let i=0;i<left.length;i++){this.sum+=right?(left[i]+right[i])*0.5:left[i];this.count++;this.phase++;if(this.phase>=this.ratio){this.output.push(this.sum/this.count);this.phase-=this.ratio;this.sum=0;this.count=0;}}while(this.output.length>=this.chunkSize){const chunk=new Float32Array(this.output.splice(0,this.chunkSize));this.port.postMessage(chunk,[chunk.buffer]);}return true;}
}
registerProcessor('bridgeux-capture',BridgeUxCapture);
