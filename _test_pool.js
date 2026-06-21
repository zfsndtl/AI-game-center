var PATTERNS = ['🌸','🌳','🍄','🍎','🌱','🐑','🐞','🐛','🌻'];
function shuffleArr(a){ for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;} return a; }
function genPool(count){ var types=PATTERNS.slice(); shuffleArr(types); var activeTypes=types.slice(0,8); var pool=[]; for(var t=0;t<activeTypes.length;t++){ for(var n=0;n<3;n++) pool.push(activeTypes[t]); } var remaining=count-pool.length; while(remaining>=3){ var pt=activeTypes[Math.floor(Math.random()*activeTypes.length)]; for(var m=0;m<3;m++) pool.push(pt); remaining-=3; } for(var e=0;e<remaining;e++) pool.push(activeTypes[0]); while(pool.length>count) pool.pop(); return shuffleArr(pool); }
var fails = 0;
for (var trial = 0; trial < 500; trial++) {
  var count = 40 + Math.floor(Math.random()*150); // 40~189
  var p = genPool(count);
  if (p.length !== count) { fails++; console.log('FAIL trial='+trial+' count='+count+' got='+p.length); }
  for (var i = 0; i < p.length; i++) { if (!p[i] || typeof p[i] !== 'string' || p[i].length === 0) { fails++; console.log('EMPTY trial='+trial+' i='+i); break; } }
}
console.log('TOTAL fails: ' + fails);