app.component('main-content', {
    props: {
        data: {
            type: Array,
            required: true
        }
    },
    template: /*html*/ `
        <div class='forms'>
            <div class='main-form'>
                <h3>Octomize</h3>

                <optimization-selector type="benchmark" title="Benchmark" subtitle="This is some sub content to explain benchmarking." :options="benchmark_options" @did-select-type="handleTypeChecked"></optimization-selector>
                
                <optimization-selector type="accelerate" title="Accelerate" subtitle="Could even open this accordion for a paragraph of text." :options="acceleration_options" @did-select-type="handleTypeChecked"></optimization-selector>

            
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
                    <tr v-for='(target, index) in targets' class="target-row">
                        <td style="width:256px">
                            <select v-model="target.provider">
                                <option value="" disabled selected>Select Provider</option>
                                <option v-for="provider in providers(index)" :value="provider">{{ provider }}</option>
                            </select>
                        </td>
                        <td style="width:256px">
                            <select :disabled="!target.provider" v-model="target.instance">
                                <option value="" disabled selected>Select Instance</option>
                                <option v-for="instance in instances(index)" :value="instance">{{ instance }}</option>
                            </select>
                        </td>
                        <td style="width:103px" :class="[ !target.provider || !target.instance ? 'cell-disabled' : '']">
                            {{ vcpu(index) }}
                        </td>
                        <td style="width:103px" :class="[ !target.provider || !target.instance ? 'cell-disabled' : '']">
                            {{ memory(index) }}
                        </td>
                        <td class='delete-cell' style="flex:1">
                            <img v-if="target.provider && target.instance" class='delete-button' src='./assets/images/delete.png' @click="handleRemove(index)">
                        </td>
                    </tr>
                </table>
            </div>

            <div class='sumamry-form-container'>
                <div class='summary-form'>
                    <p>Total runs</p>
                    <p>{{ data.length    }}</p>
                    <div v-for="target in targets">
                        <div>
                            <p>{{ target.instance }}</p>
                            <p>{{ target.vcpu }} cores</p>
                        </div>
                        <p>{{ getRuns(target) }}</p>
                    </div>

                    <button class="octomize-button" @click="handleOctomize">Octomize</button>
                </div>
            </div>

        </div>
    `,

    data() {
        return {
            types: [],
            benchmark_options: {
                engine: '',
                num_trials: 1,
                runs_per_trial: 1
            },
            acceleration_options: {
                engine: '',
                kernel_trials: 0,
            },
            targets: [
                { provider: '', instance: '', vcpu: 0, memory: 0 }
            ]
        }
    },

    
    methods: {
        handleTypeChecked({ checked, type }) {

            const ind = this.types.indexOf(type)
            if (!checked && ind >= 0) {
                this.types.splice(ind, 1)
            } else if (checked && ind < 0) {
                this.types.push(type)
            }
        },

        addTarget() {
            if (this.targets.length >= this.data.length) { return }
            this.targets.push(
                { provider: '', instance: '', vcpu: 0, memory: 0 }
            )
        },
        getTarget(targetIndex) {
            return this.targets[targetIndex]
        },
        getHardware(targetIndex) {
            const target = this.getTarget(targetIndex)
            const item = this.data.find(v => v.provider == target.provider &&  v.instance == target.instance)

            return item
        },
        doesTargetExist(hardware, index) {
            return this.targets.find((v, ind) => ind != index && v.provider == hardware.provider && v.instance == hardware.instance) !== undefined
        },
        handleRemove(index) {
            this.targets.splice(index, 1)
        },

        
        instances(index) {
            if (index == undefined) {
                return []
            }
            
            const target = this.getTarget(index)
            return this.data
                .filter(v => v.provider == target.provider && !this.doesTargetExist(v, index))
                .map(v => v.instance)
        },

        vcpu(index) {
            const item = this.getHardware(index)
            return (item && item.cpu) || 0
        },

        memory(index) {
            const item = this.getHardware(index)

            return (item && item.memory) || 0
        },

        providers(index) {
            if (index == undefined) {
                return []
            }

            return this.data.filter(v => !this.doesTargetExist(v, index))
                .map(v => v.provider)
                .filter((v, i, s) => s.indexOf(v) === i)
        },

        getRuns(target) {
            
        },


        /// RUN

        handleOctomize() {

            this.$emit('start-runs', {
                benchmark: this.benchmarkPayloads,
                acceleration: this.accelerationPayloads
            })
        }
    },


    computed: {
        benchmarkPayloads() {
            if (!this.types.includes('benchmark')) {
                return null
            }


            let result = []

            for (let target of this.targets) {
                result.push({
                    engine: this.benchmark_options.engine,
                    hardware: target,
                    num_trials: this.benchmark_options.num_trials,
                    runs_per_trial: this.benchmark_options.num_runs
                })
            }

            return result
        },
        accelerationPayloads() {
            if (!this.types.includes('accelerate')) {
                return null
            }

            let result = []
            
            for (let target of this.targets) {

                const engine = this.acceleration_options.engine == 'TVM' ? 
                    { TVM: { kernel_trials: this.acceleration_options.kernel_trials } } : this.acceleration_options.engine

                result.push({
                    engine: engine,
                    hardware: target
                })
            }

            return result
        }
    }
})


app.component('optimization-selector', {
    props: {
        type: {
            type: String,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        
        subtitle: {
            type: String,
            required: true,
        },

        options: {
            type: Object,
            required: true
        }
    },

    template: /*html*/ `
        <div class="option-pane-container">
            <div class="option-pane" @click="toggleExpand">
                <input type="checkbox" v-model="checked" @click.stop @change="handleCheckbox($event)">
                <div style="flex:1"> 
                    <p>{{ title }}</p>
                    <p>{{ subtitle }}</p>
                </div>
                <img style="width:10px" src='./assets/images/chevron.png' :class="{ expanded: expanded }" />
            </div>
            <div class="option-pane-options" v-if="expanded && type == 'benchmark'">
                <select v-model="engine">
                    <option value="" disabled selected>Select Engine</option>
                    <option>ONNX</option>
                    <option>TVM</option>
                </select>
                <label for='trials' :class="[ !engine ? 'disabled-label' : '']"># of Trials</label>
                <input :disabled="!engine" id="trials" type='number' v-model="num_trials">
                <label for='runs' :class="[ !engine ? 'disabled-label' : '']">Runs Per Trial</label>
                <input :disabled="!engine" id="runs" type='number' v-model="num_runs">

            </div>
            <div class="option-pane-options" v-if="expanded && type == 'accelerate'">
                <select v-model="engine">
                    <option value="" disabled selected>Select Engine</option>
                    <option>ONNX</option>
                    <option>TVM</option>
                </select>
                <label for='kernel_trials' v-if="engine == 'TVM'">Kernel Trials</label>
                <input id="kernel_trials" v-if="engine == 'TVM'" type='number' v-model="num_kernel_trials">

            </div>
        </div>
    `,

    data() {
        return {
            expanded: false,
            checked: false,
            engine: "",
            num_trials: 0,
            num_runs: 0,
            num_kernel_trials: 0
        }
    },
    
    methods: {
        toggleExpand() {
            this.expanded = !this.expanded
        },
        handleCheckbox(evt) {
            this.$emit('did-select-type', { checked: evt.target.checked, type: this.type })
        }
    }
})