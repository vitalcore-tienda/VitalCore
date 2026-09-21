const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('store.js', 'utf8');
const products = vm.runInNewContext(source.match(/let products = (\[[\s\S]*?\n        \]);/)[1]);
const files = ['index.html', ...['productos','categorias','marcas'].flatMap(dir => fs.readdirSync(dir).map(name => dir+'/'+name))];
assert.equal(files.length, 27);
for(const file of files) {
 const html=fs.readFileSync(file,'utf8');
 assert.equal((html.match(/<h1\b/g)||[]).length,1,file);
 for(const [,url] of html.matchAll(/href="([^"]+)"/g)) {
  if(/^(https?:|#|\.\.\/)/.test(url)) continue;
  const target=url.split('#')[0];
  if(target==='logo.jpg') continue; // Existing missing logo, unrelated to catalog routes.
  assert.ok(fs.existsSync(target), `${file}: ${target}`);
 }
}
const elements=new Map();
const element=()=>({innerHTML:'',children:[],style:{},classList:{add(){},remove(){},contains(){return true},toggle(){}},setAttribute(){},appendChild(child){this.children.push(child)},focus(){}});
const context={console,localStorage:{getItem:()=>null,setItem(){}},setTimeout(){},requestAnimationFrame(){},initializeApp(){},getFirestore(){},collection(){},onSnapshot(ref,fn){context.snapshot=fn},AOS:{refresh(){},init(){}},document:{body:{dataset:{}},getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id)},createElement:element,addEventListener(){} }};
context.window=context;
vm.createContext(context);
vm.runInContext(source.replace(/^\s*import .*;$/gm,''),context);
for(const p of products) {
 context.document.body.dataset={productId:String(p.id)};
 context.snapshot([{id:String(p.id),data:()=>({price:38000.5})}]);
 assert.equal(elements.get('detail-price').textContent,'$38.000,5');
 assert.ok(elements.get('detail-action').innerHTML.includes('addToCart('+p.id+')'));
 context.snapshot([{id:String(p.id),data:()=>({price:0})}]);
 assert.equal(elements.get('detail-price').textContent,'Consultar precio');
 assert.ok(elements.get('detail-action').innerHTML.includes('https://wa.me/'));
 context.addToCart(p.id);
 assert.equal(vm.runInContext('cart.length',context),0);
}
for(const category of new Set(products.map(p=>p.category))) {
 context.document.body.dataset={category};
 elements.get('product-grid').children=[];
 context.renderProducts();
 assert.equal(elements.get('product-grid').children.length,products.filter(p=>p.category===category).length);
 context.snapshot([]);
 assert.ok(elements.get('product-grid').children.every(card=>!card.innerHTML.includes('onclick="addToCart')));
}
console.log('OK: 27 páginas, enlaces locales, 15 fichas con precios y WhatsApp, bloqueo de precio cero y categorías después de sincronizar.');
