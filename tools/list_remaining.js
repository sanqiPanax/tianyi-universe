const fs = require('fs');
const vm = require('vm');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('F:/ownWork/天意宇宙/data/nodes.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('F:/ownWork/天意宇宙/data/clips.js', 'utf8'), ctx);
const clips = ctx.window.DATA_CLIPS || {};
const ns = ctx.window.DATA_NODES.filter(n => !(clips[n.id] && (clips[n.id].mp3 || clips[n.id].mp4)));
ns.forEach(n => console.log(n.id + ' | ' + n.name + ' | pop' + n.pop + ' | ep:' + (n.ep || '')));
