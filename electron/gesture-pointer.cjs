'use strict';

const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');

const script = String.raw`
$ErrorActionPreference='Stop'
Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class BridgeUXPointer { [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y); [DllImport("user32.dll")] public static extern void mouse_event(uint f,uint x,uint y,uint d,UIntPtr e); }'
[Console]::WriteLine('READY')
while($null -ne ($line=[Console]::ReadLine())) { try { $p=$line.Split(','); [BridgeUXPointer]::SetCursorPos([int]$p[0],[int]$p[1]) | Out-Null; if($p[2] -eq '1'){[BridgeUXPointer]::mouse_event(2,0,0,0,[UIntPtr]::Zero);[BridgeUXPointer]::mouse_event(4,0,0,0,[UIntPtr]::Zero)}; if($p[3] -eq '1'){[BridgeUXPointer]::mouse_event(0x0800,0,0,120,[UIntPtr]::Zero)}; if($p[3] -eq '-1'){[BridgeUXPointer]::mouse_event(0x0800,0,0,[uint32]([long]4294967176),[UIntPtr]::Zero)}; [Console]::WriteLine('OK') } catch { [Console]::WriteLine('ERROR') } }
`;

class GesturePointer {
  constructor() { this.child = null; this.pending = []; this.ready = null; }

  start() {
    if (this.child) return this.ready;
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-STA', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true });
    this.child = child;
    this.ready = new Promise((resolve, reject) => {
      let ready = false;
      let timeout;
      const lines = createInterface({ input: child.stdout });
      lines.on('line', line => {
        if (line === 'READY') { ready = true; clearTimeout(timeout); resolve(); return; }
        const next = this.pending.shift();
        if (!next) return;
        if (line === 'OK') next.resolve(); else next.reject(new Error('Windows rejected the gesture input.'));
      });
      child.once('error', error => { if (!ready) reject(error); this.rejectPending(error); this.reset(child); });
      child.once('close', code => {
        const error = new Error(`Windows gesture input stopped${code ? ` (${code})` : ''}.`);
        if (!ready) reject(error);
        this.rejectPending(error);
        this.reset(child);
      });
      timeout = setTimeout(() => { if (!ready) { child.kill(); reject(new Error('Windows gesture input did not start.')); } }, 5000);
    });
    return this.ready;
  }

  reset(child) {
    if (this.child !== child) return;
    this.child = null;
    this.ready = null;
  }

  rejectPending(error) { for (const item of this.pending.splice(0)) item.reject(error); }

  async move(x, y, click, scroll) {
    await this.start();
    const child = this.child;
    if (!child || !child.stdin.writable) throw new Error('Windows gesture input is not available.');
    return new Promise((resolve, reject) => {
      this.pending.push({ resolve, reject });
      child.stdin.write(`${x},${y},${click ? 1 : 0},${scroll === 'up' ? 1 : scroll === 'down' ? -1 : 0}\n`, error => {
        if (error) { this.pending.pop(); reject(error); }
      });
    });
  }

  stop() {
    const child = this.child;
    this.child = null;
    this.ready = null;
    this.rejectPending(new Error('Gesture controls stopped.'));
    if (child && !child.killed) child.kill();
  }
}

module.exports = new GesturePointer();
