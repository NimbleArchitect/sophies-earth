
const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

var currPoint = 0
var points = []

points.push([50.039246, -5.675544]); //cornwall
//points.push([51.504739, -0.086558]); //london - the shard
points.push([36.101764, 138.231323]); //japan
points.push([8.322576, 77.569631]); //south india
points.push([-46.332722, 168.954283]); //new zealand
points.push([25.763439, -80.190282]); //florida
points.push([34.521709, -120.481808]); //LA

for (c=0; c<100; c++) {
  long = Math.random() * 180 + 1;
  latt = Math.random() * 180 + 1;
  points.push([long - 90.0, latt - 90.0]);
}


const doSomething = async () => {
    for (const item of points) {
      await sleep(1000)
      workerResult = points[currPoint]
      currPoint += 1
      postMessage(workerResult);
  }
}

doSomething()
