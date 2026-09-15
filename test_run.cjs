const { spawn } = require('child_process');
const p = spawn('d:\\wee\\HexSyncTH_Control.exe', [], { stdio: ['pipe', 'pipe', 'pipe'] });

p.stdout.on('data', d => console.log('STDOUT:', d.toString()));
p.stderr.on('data', d => console.error('STDERR:', d.toString()));

p.on('error', err => console.error('SPAWN ERROR:', err));
p.on('exit', (code, sig) => console.log('EXITED WITH CODE:', code, 'SIGNAL:', sig));
