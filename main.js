const app = Vue.createApp({
    data() {
        return {
            loading: true,
            hardware: [],
            runs: [],
            api_url: 'http://netheria.takehome.octoml.ai/'
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
    }
  })
  