const app = Vue.createApp({
    data() {
        return {
            loading: true,
            hardware: [],
            errors: [],
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
        handleTargetsChanged() {
            this.errors = []
        },
        async getPostResult(endpoint, payload) {
            const options = { 
                method: "POST", 
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }
            

            return await fetch(this.api_url + endpoint, options)
                    .then(res => { 
                        console.log("got res from post to /" + endpoint, res)
                        return res.status == 200
                    })
                    .catch(err => { 
                        console.error("Error posting to /" + endpoint, err)
                        return false
                    })
        },
        async handleStartRuns(payloads) {
            this.errors = []
            let b_results = []
            let a_results = []

            console.log(payloads)

            if (payloads.benchmark) {
                for (let payload of payloads.benchmark) {
                    const result = await this.getPostResult('benchmark', payload)
                    b_results.push(result)
                }
            }
           
            if (payloads.accelerate) {
                for (let payload of payloads.accelerate) {
                    const result = await this.getPostResult('accelerate', payload)
                    a_results.push(result)
                }
            }

            console.log(b_results, a_results)

            let results = []

            if (b_results.length > 0 && a_results.length > 0) {
                for (let ind in b_results) {
                    results = b_results[ind] && a_results[ind]
                }
            } else if (b_results.length > 0) {
                results = b_results
            } else {
                results = a_results
            }

            
            this.errors = results
        }
    }
  })
  