app.component('summary-form', {
    props: {
        data: {
            type: Array,
            required: true
        }
    },
    template: /*html*/ `
        <div class='sumamry-form-container'>
            <div class='summary-form'>
                <p>Total runs</p>
                <p>{{ data.length    }}</p>
                <div v-for="run in runs">{{ data }}</div>
            
            </div>
        </div>
    `,
    data() {
        return {
        }
    },
    methods: {
    },
    computed: {

    }
})