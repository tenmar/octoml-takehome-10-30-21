app.component('main-form', {
    props: {
        data: {
            type: Array,
            required: true
        }
    },
    template: /*html*/ `
        <div class='main-form'>
            <h3>Octomize</h3>

            <optimization-selector></optimization-selector>
            <optimization-selector></optimization-selector>
        
            <div id='hardware-targets-header'>
                <h4 style="flex:1">Hardware Targets</h4>
                <button style="height:32px" @click="addTarget">Add</button>
            </div>
            <table>
                <tr class='table-header'>
                    <th style="width:256px">PROVIDER</th> 
                    <th style="width:256px">INSTANCE</th>
                    <th style="width:103px">VCPU</th>
                    <th style="width:103px">MEMORY (GIB)</th>
                    <th style="flex:1"></th>
                </tr>
                <target-row v-for='target in targets' :data='target' :hardware='data'></target-row>
            </table>

        
        </div>
    `,

    data() {
        return {
            targets: [
                { provider: '', instance: '', vcpu: 0, memory: 0 }
            ]
        }
    },

    
    methods: {
        addTarget() {
            this.targets.push(
                { provider: '', instance: '', vcpu: 0, memory: 0 }
            )
        }
    },

    computed: {

    }
})


app.component('optimization-selector', {
    props: {

    },

    template: /*html*/ `
        <div>Optimization Selector</div>
    `,
})


app.component('target-row', {
    props: {
        hardware: {
            type: Array,
            required: true
        },
        data: {
            type: Object,
            required: true
        }
    },

    template: /* html */ `
        <tr class="target-row">
            <td style="width:256px">
                <select v-model="currentProvider">
                    <option value="" disabled selected>Select Provider</option>
                    <option v-for="provider in providers" :value="provider">{{ provider }}</option>
                </select>
            </td>
            <td style="width:256px">
                <select :disabled="!currentProvider" v-model="currentInstance">
                    <option value="" disabled selected>Select Instance</option>
                    <option v-for="instance in instances" :value="instance">{{ instance }}</option>
                </select>
            </td>
            <td style="width:103px" :class="[ !currentProvider || !currentInstance ? 'cell-disabled' : '']">
                {{ this.vcpu }}
            </td>
            <td style="width:103px" :class="[ !currentProvider || !currentInstance ? 'cell-disabled' : '']">
                {{ this.memory }}
            </td>
            <td style="flex:1">
            </td>
        </tr>
    `,

    data() {

        return {
            currentProvider: '',
            currentInstance: '',
        }
    },

    computed: {
        providers() {
            return this.hardware.map(v => v.provider).filter((v, i, s) => s.indexOf(v) === i)
        },
        
        instances() {
            return this.hardware.map(v => v.instance).filter((v, i, s) => s.indexOf(v) === i)
        },

        vcpu() {
            const item = this.hardware.find(v => v.provider == this.currentProvider && v.instance == this.currentInstance)

            return (item && item.cpu) || 0
        },

        memory() {
            const item = this.hardware.find(v => v.provider == this.currentProvider && v.instance == this.currentInstance)

            return (item && item.memory) || 0
        }
    }
})