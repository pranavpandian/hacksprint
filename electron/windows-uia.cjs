'use strict';

const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const run = promisify(execFile);

const readScript = String.raw`
$ErrorActionPreference='Stop'; Add-Type -AssemblyName UIAutomationClient; Add-Type -AssemblyName UIAutomationTypes
Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; namespace BridgeUX { public static class Native { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); } }'
$handle=[BridgeUX.Native]::GetForegroundWindow(); $root=[System.Windows.Automation.AutomationElement]::FromHandle($handle); $walker=[System.Windows.Automation.TreeWalker]::ControlViewWalker
$queue=[System.Collections.Queue]::new(); $queue.Enqueue([pscustomobject]@{Element=$root;Depth=0}); $items=[System.Collections.ArrayList]::new(); $visited=0; $title=''; try{$title=$root.Current.Name}catch{}
while($queue.Count -gt 0 -and $visited -lt 15000 -and $items.Count -lt 3000){$node=$queue.Dequeue();$visited++;$el=$node.Element;$depth=$node.Depth
 try{$c=$el.Current;$name=[string]$c.Name;$role=([string]$c.ControlType.ProgrammaticName -replace '^ControlType\.','');$aid=[string]$c.AutomationId;$offscreen=[bool]$c.IsOffscreen;$password=[bool]$c.IsPassword}catch{continue}
 if(-not $offscreen -and ($name.Trim() -or $aid.Trim())){$value='';if($password){$value='[password hidden]'}elseif($role -in @('Edit','Hyperlink')){try{$p=$el.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern);$value=[string]$p.Current.Value}catch{try{$p=$el.GetCurrentPattern([System.Windows.Automation.LegacyIAccessiblePattern]::Pattern);$value=[string]$p.Current.Value}catch{}}};$r=$c.BoundingRectangle;$bounds=$null;if(-not $r.IsEmpty){$bounds=@([math]::Round($r.X),[math]::Round($r.Y),[math]::Round($r.Width),[math]::Round($r.Height))};[void]$items.Add([pscustomobject]@{id="e$($items.Count)";name=$name.Substring(0,[math]::Min(240,$name.Length));role=$role;automationId=$aid;value=$value.Substring(0,[math]::Min(500,$value.Length));password=$password;focused=[bool]$c.HasKeyboardFocus;bounds=$bounds})}
 if($depth -lt 30){try{$child=$walker.GetFirstChild($el);while($null -ne $child -and $queue.Count -lt 20000){$queue.Enqueue([pscustomobject]@{Element=$child;Depth=$depth+1});$child=$walker.GetNextSibling($child)}}catch{}}
}
$out=[pscustomobject]@{windowTitle=$title;elements=@($items.ToArray());visited=$visited};$json=ConvertTo-Json -InputObject $out -Depth 5 -Compress;[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false);[Console]::Write($json)
`;

function selectorScript(selector, action) {
  const encoded = Buffer.from(JSON.stringify({ selector, action }), 'utf8').toString('base64');
  return String.raw`
$ErrorActionPreference='Stop'; Add-Type -AssemblyName UIAutomationClient; Add-Type -AssemblyName UIAutomationTypes
Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; namespace BridgeUX { public static class Native { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); } }'
$inputData=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encoded}')) | ConvertFrom-Json;$selector=$inputData.selector;$action=$inputData.action
$handle=[BridgeUX.Native]::GetForegroundWindow();$root=[System.Windows.Automation.AutomationElement]::FromHandle($handle);$walker=[System.Windows.Automation.TreeWalker]::ControlViewWalker;$queue=[System.Collections.Queue]::new();$queue.Enqueue([pscustomobject]@{Element=$root;Depth=0});$visited=0;$matches=[System.Collections.ArrayList]::new()
while($queue.Count -gt 0 -and $visited -lt 15000 -and $matches.Count -lt 2){$node=$queue.Dequeue();$visited++;$el=$node.Element;$depth=$node.Depth;try{$c=$el.Current;$name=[string]$c.Name;$role=([string]$c.ControlType.ProgrammaticName -replace '^ControlType\.','');$aid=[string]$c.AutomationId;$off=[bool]$c.IsOffscreen}catch{continue}
 if(-not $off -and $name -ceq [string]$selector.name -and $role -ceq [string]$selector.role -and $aid -ceq [string]$selector.automationId){$r=$c.BoundingRectangle;if($null -eq $selector.bounds -or $r.IsEmpty -or ([math]::Abs($r.X-[double]$selector.bounds[0]) -lt 4 -and [math]::Abs($r.Y-[double]$selector.bounds[1]) -lt 4)){[void]$matches.Add($el)}}
 if($depth -lt 30){try{$child=$walker.GetFirstChild($el);while($null -ne $child -and $queue.Count -lt 20000){$queue.Enqueue([pscustomobject]@{Element=$child;Depth=$depth+1});$child=$walker.GetNextSibling($child)}}catch{}}
}
if($matches.Count -ne 1){throw 'The screen changed or the target is ambiguous. Read the screen again.'};$el=$matches[0]
if($action.type -eq 'invoke'){if(@('Button','Hyperlink','TabItem','MenuItem','ListItem','TreeItem') -notcontains [string]$selector.role){throw 'This control cannot be safely opened.'};$p=$el.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern);$p.Invoke()}
elseif($action.type -eq 'setValue'){if([string]$selector.role -ne 'Edit' -or $el.Current.IsPassword){throw 'Password and non-text controls cannot be filled.'};$p=$el.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern);$p.SetValue([string]$action.value)}
else{throw 'Unsupported Windows UI action.'};[Console]::Write('{"ok":true}')
`;
}

async function runScript(script, timeout = 12000) {
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  const { stdout } = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-STA', '-EncodedCommand', encoded], { timeout, windowsHide: true, maxBuffer: 3 * 1024 * 1024 });
  return stdout.trim();
}

async function readForegroundUi() {
  const raw = await runScript(readScript);
  const snapshot = JSON.parse(raw);
  return snapshot && Array.isArray(snapshot.elements) ? snapshot : { windowTitle: '', elements: [] };
}

async function act(selector, action) {
  return JSON.parse(await runScript(selectorScript(selector, action)));
}

module.exports = { readForegroundUi, act };
