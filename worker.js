
const sleep = (milliseconds) => {
return new Promise(resolve => setTimeout(resolve, milliseconds))
}

 // coords.push([50.039246, -5.675544]); //cornwall
  // coords.push([51.504739, -0.086558]); //london - the shard
  // coords.push([36.101764, 138.231323]); //japan
  // coords.push([8.322576, 77.569631]); //south india
  // coords.push([-46.332722, 168.954283]); //new zealand
  // coords.push([25.763439, -80.190282]); //florida
  // coords.push([34.521709, -120.481808]); //LA
sleep(4000).then(() => {
    workerResult = [50.039246, -5.675544]
    postMessage(workerResult);
    sleep(5000).then(() => {
        workerResult = [51.504739, -0.086558]
        postMessage(workerResult);
        sleep(5000).then(() => {
            workerResult = [36.101764, 138.231323]
            postMessage(workerResult);
            sleep(5000).then(() => {
                workerResult = [8.322576, 77.569631]
                postMessage(workerResult);
                sleep(5000).then(() => {
                    workerResult = [-46.332722, 168.954283]
                    postMessage(workerResult);
                    sleep(5000).then(() => {
                        workerResult = [25.763439, -80.190282]
                        postMessage(workerResult);
                        sleep(5000).then(() => {
                            workerResult = [34.521709, -120.481808]
                            postMessage(workerResult);
                        })
                    })
                })
            })
        })
    })
})



