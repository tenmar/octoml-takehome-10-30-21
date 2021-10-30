const app = Vue.createApp({
    data() {
        return {
            loading: true,
            hardware: [],
            runs: [],
            api_url: 'http://netheria.takehome.octoml.ai/',
        }
    },
    created() {
        this.loading = true
        fetch(this.api_url + 'hardware')
            .then(res => res.json())
            .then(data => {
                this.hardware = data
                this.loading = false
                console.log(data)
            })
            .catch(err => { console.error("Error fetching /hardware", err)})
    },
    methods: {
        async getPostResult(endpoint, payload) {

            const options = { 
                method: "POST", 
                mode: 'no-cors', // to allow us to send post request locally
                body: JSON.stringify(payload.benchmark) 
            }

            return await fetch(this.api_url + endpoint, options)
                    .then(res => { 
                        console.log("got res from post to /benchmark", res)
                        return true
                    })
                    .catch(err => { 
                        console.error("Error posting to /benchmark", err)
                        return false
                    })
        },
        async handleStartRuns(payloads) {
            console.log("Payload", payloads)
            
            if (payloads.benchmark) {
                const result = await this.getPostResult('benchmark', JSON.stringify(payloads.benchmark))
                console.log("Result", result)
            }
           
            if (payloads.accelerate) {
                const result = await this.getPostResult('accelerate', JSON.stringify(payloads.accelerate))
                console.log("Result", result)
            }
        }
    }
  })
  